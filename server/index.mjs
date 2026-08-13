import http from "http";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import {
  APP_PORT,
  ROOT,
  HEX_AXES,
  VOICE,
  ensureDirs,
  isReady,
  findLlamaServer,
  modelPath,
} from "./config.mjs";
import { JOB, INTERVIEWER } from "./job.mjs";
import { runSetup } from "./setup.mjs";
import { startLlm, isLlmReady, stopLlm } from "./llm.mjs";
import { synthesize } from "./tts.mjs";
import { startInterview, userTurn, getSession } from "./interview.mjs";
import { buildReport, listReports, loadReport, deleteReport, rebuildAllSavedReports } from "./report.mjs";

const PUBLIC = ROOT;
let setupRunning = false;
const logs = [];

function log(message) {
  const line = `[${new Date().toLocaleTimeString("zh-HK")}] ${message}`;
  logs.push(line);
  if (logs.length > 80) logs.shift();
  console.log(line);
}

function send(res, status, data, headers = {}) {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  const type = typeof data === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8";
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store", ...headers });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("JSON 格式不正確"));
      }
    });
    req.on("error", reject);
  });
}

function mime(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".mp3")) return "audio/mpeg";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.source.html";
  if (urlPath.includes("..")) {
    send(res, 403, { error: "Forbidden" });
    return true;
  }
  const file = path.join(PUBLIC, urlPath.replace(/^\//, ""));
  if (!file.startsWith(PUBLIC)) {
    send(res, 403, { error: "Forbidden" });
    return true;
  }
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, { "Content-Type": mime(file) });
    fs.createReadStream(file).pipe(res);
    return true;
  }
  return false;
}

async function statusPayload() {
  return {
    readyFiles: isReady(),
    llmReady: isLlmReady(),
    setupRunning,
    llama: Boolean(findLlamaServer()),
    model: fs.existsSync(modelPath()),
    interviewer: INTERVIEWER,
    voice: VOICE.name,
    job: JOB,
    hexAxes: HEX_AXES,
    logs: logs.slice(-12),
  };
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${APP_PORT}`);
  const route = url.pathname;
  const method = req.method;

  if (route === "/api/status" && method === "GET") {
    send(res, 200, await statusPayload());
    return;
  }

  if (route === "/api/setup" && method === "POST") {
    if (setupRunning) {
      send(res, 200, { ok: true, message: "正在準備本機引擎…" });
      return;
    }
    setupRunning = true;
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const emit = (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };
    try {
      await runSetup((p) => {
        const pct = p.total ? Math.round((p.received / p.total) * 100) : null;
        log(`${p.stage}: ${p.message || ""}${pct != null ? ` ${pct}%` : ""}`);
        emit({ ...p, percent: pct });
      });
      emit({ stage: "llm", message: "正在載入模型到 GPU…" });
      await startLlm((m) => {
        log(m);
        emit({ stage: "llm", message: m });
      });
      emit({ stage: "done", message: "可以開始面試" });
    } catch (err) {
      log(err.message);
      emit({ stage: "error", message: err.message });
    } finally {
      setupRunning = false;
      res.end();
    }
    return;
  }

  if (route === "/api/boot" && method === "POST") {
    try {
      if (!isReady()) {
        send(res, 409, { error: "請先下載本機模型" });
        return;
      }
      await startLlm((m) => log(m));
      send(res, 200, { ok: true });
    } catch (err) {
      send(res, 500, { error: err.message });
    }
    return;
  }

  if (route === "/api/interview/start" && method === "POST") {
    try {
      if (!isLlmReady()) await startLlm((m) => log(m));
      const result = await startInterview();
      send(res, 200, result);
    } catch (err) {
      send(res, 500, { error: err.message });
    }
    return;
  }

  if (route === "/api/interview/turn" && method === "POST") {
    try {
      const body = await readBody(req);
      const result = await userTurn(body.sessionId, body.answer);
      send(res, 200, result);
    } catch (err) {
      send(res, 400, { error: err.message });
    }
    return;
  }

  if (route === "/api/interview/report" && method === "POST") {
    try {
      const body = await readBody(req);
      const session = getSession(body.sessionId);
      if (!session) {
        send(res, 404, { error: "找不到面試紀錄" });
        return;
      }
      const report = await buildReport(session);
      send(res, 200, report);
    } catch (err) {
      send(res, 500, { error: err.message });
    }
    return;
  }

  if (route === "/api/tts" && method === "POST") {
    try {
      const body = await readBody(req);
      const file = await synthesize(body.text, body.emotion || "neutral");
      res.writeHead(200, { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" });
      fs.createReadStream(file).pipe(res);
    } catch (err) {
      send(res, 500, { error: err.message });
    }
    return;
  }

  if (route === "/api/reports" && method === "GET") {
    send(res, 200, listReports());
    return;
  }

  if (route.startsWith("/api/reports/") && method === "GET") {
    const id = route.split("/").pop();
    const report = loadReport(id);
    if (!report) send(res, 404, { error: "找不到報告" });
    else send(res, 200, report);
    return;
  }

  if (route.startsWith("/api/reports/") && method === "DELETE") {
    const id = route.split("/").pop();
    deleteReport(id);
    send(res, 200, { ok: true });
    return;
  }

  send(res, 404, { error: "Not found" });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }
    if (serveStatic(req, res)) return;
    send(res, 404, "Not found");
  } catch (err) {
    log(err.stack || err.message);
    if (!res.headersSent) send(res, 500, { error: err.message });
  }
});

ensureDirs();
rebuildAllSavedReports();
server.listen(APP_PORT, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${APP_PORT}`;
  log(`面試平台已啟動：${url}`);
  exec(`start "" "${url}"`);
  if (isReady()) {
    startLlm((m) => log(m)).catch((err) => log(`模型稍後再載入：${err.message}`));
  } else {
    log("首次使用請在網頁按「下載本機引擎」（llama.cpp + Qwen 模型）。");
  }
});

process.on("SIGINT", () => {
  stopLlm();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stopLlm();
  process.exit(0);
});
