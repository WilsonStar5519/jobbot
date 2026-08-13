import { spawn } from "child_process";
import path from "path";
import { LLM_HOST, LLM_PORT, LLM_URL, findLlamaServer, modelPath } from "./config.mjs";

let child = null;
let ready = false;

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
    "8192",
    "-np",
    "1",
  ];

  onLog?.(`啟動本機模型：${path.basename(exe)}`);
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
  child.on("exit", (code) => {
    ready = false;
    child = null;
    onLog?.(`llama-server 已結束（${code}）`);
  });

  await waitForHealth();
  ready = true;
  onLog?.("本機語言模型已就緒");
  return true;
}

export function stopLlm() {
  if (child && !child.killed) {
    child.kill();
    child = null;
  }
  ready = false;
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

export async function chat({ messages, temperature = 0.7, maxTokens = 700, json = false }) {
  if (!ready) throw new Error("語言模型尚未就緒");
  const body = {
    model: "qwen",
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };
  if (json) body.response_format = { type: "json_object" };

  const res = await fetch(`${LLM_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`模型回應失敗：${res.status} ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  return { content, json: extractJSON(content) };
}
