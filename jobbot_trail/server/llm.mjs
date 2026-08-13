import { spawn } from "child_process";
import path from "path";
import { LLM_HOST, LLM_PORT, LLM_URL, MODEL, findLlamaServer, modelPath } from "./config.mjs";

let child = null;
let ready = false;
let starting = null;
let lastCrash = null;

async function waitForHealth(timeoutMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${LLM_URL}/health`);
      if (res.ok) return true;
    } catch {
      /* still booting */
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error("本機語言模型啟動逾時。請確認 GPU 驅動正常，然後重試。");
}

export function isLlmReady() {
  return ready;
}

export async function startLlm(onLog) {
  // Avoid launching two llama-server processes if a boot is already in flight.
  if (starting) return starting;
  starting = doStartLlm(onLog).finally(() => {
    starting = null;
  });
  return starting;
}

async function doStartLlm(onLog) {
  if (ready) return true;
  try {
    const res = await fetch(`${LLM_URL}/health`);
    if (res.ok) {
      ready = true;
      onLog?.("本機語言模型已就緒（沿用現有服務）");
      return true;
    }
  } catch {
    /* not running yet */
  }
  const exe = findLlamaServer();
  const model = modelPath();
  if (!exe || !model) throw new Error("尚未下載 llama.cpp 或模型");

  if (child && !child.killed) {
    await waitForHealth();
    ready = true;
    return true;
  }

  const args = [
    "-m",
    model,
    "--host",
    LLM_HOST,
    "--port",
    String(LLM_PORT),
    "-ngl",
    "99",
    "-c",
    String(MODEL.contextLength || 8192),
    "-np",
    "1",
  ];

  onLog?.(`啟動本機模型：${path.basename(exe)}（${MODEL.file}）`);
  child = spawn(exe, args, {
    cwd: path.dirname(exe),
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const pipe = (buf) => {
    const text = buf.toString();
    if (onLog) {
      const line = text.trim();
      if (line) onLog(line.slice(0, 240));
    }
  };
  child.stdout.on("data", pipe);
  child.stderr.on("data", pipe);
  child.on("error", (err) => {
    ready = false;
    child = null;
    onLog?.(`llama-server 無法啟動：${err.message}`);
  });
  child.on("exit", (code) => {
    const wasReady = ready;
    ready = false;
    child = null;
    if (wasReady && code !== 0) lastCrash = Date.now();
    onLog?.(`llama-server 已結束（${code}）`);
  });

  await waitForHealth();
  ready = true;
  onLog?.("本機語言模型已就緒（非思考模式，適合即時對答）");
  return true;
}

export function stopLlm() {
  if (child && !child.killed) {
    child.kill();
    child = null;
  }
  ready = false;
}

/** llama-server 意外中斷後，容許在下一次對話時自動嘗試重開一次，唔使使用者手動重啟。 */
export function shouldAutoRecover() {
  return !ready && Boolean(lastCrash) && Date.now() - lastCrash < 10 * 60 * 1000;
}

function stripThinking(text) {
  // Qwen3 為混合思考模型；就算已要求 /no_think，仍保留這層防護，避免 <think> 內容混入 JSON 解析。
  return String(text || "").replace(/<think>[\s\S]*?<\/think>/gi, " ").trim();
}

function extractJSON(text) {
  if (!text) return null;
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

const NO_THINK_TAG = "/no_think";

/** 面試對答要求低延遲、乾淨 JSON，所以強制關閉 Qwen3 嘅思考模式（官方支援嘅 /no_think 開關）。 */
function withNoThink(messages) {
  const list = Array.isArray(messages) ? [...messages] : [];
  const sysIndex = list.findIndex((m) => m.role === "system");
  if (sysIndex >= 0) {
    const sys = list[sysIndex];
    if (!String(sys.content || "").includes(NO_THINK_TAG)) {
      list[sysIndex] = { ...sys, content: `${sys.content}\n\n${NO_THINK_TAG}` };
    }
  } else {
    list.unshift({ role: "system", content: NO_THINK_TAG });
  }
  return list;
}

async function postChat(body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${LLM_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`模型回應失敗：${res.status} ${errText.slice(0, 200)}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function chat({ messages, temperature = 0.7, maxTokens = 700, json = false, timeoutMs = 45000, retries = 1 }) {
  if (!ready && shouldAutoRecover()) {
    try {
      await startLlm();
    } catch {
      /* fall through to explicit error below */
    }
  }
  if (!ready) throw new Error("語言模型尚未就緒");

  const body = {
    model: "qwen",
    messages: withNoThink(messages),
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };
  if (json) body.response_format = { type: "json_object" };

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const data = await postChat(body, timeoutMs);
      const rawContent = data.choices?.[0]?.message?.content || "";
      const content = stripThinking(rawContent);
      return { content, json: extractJSON(content) };
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
}
