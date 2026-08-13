import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const VENDOR_DIR = path.join(ROOT, "vendor", "llama");
export const MODELS_DIR = path.join(ROOT, "models");
export const DATA_DIR = path.join(ROOT, "data");
export const REPORTS_DIR = path.join(DATA_DIR, "reports");
export const TTS_CACHE_DIR = path.join(DATA_DIR, "tts-cache");
export const RUNTIME_FILE = path.join(DATA_DIR, "runtime.json");

export const APP_PORT = Number(process.env.APP_PORT || 3000);
export const LLM_PORT = Number(process.env.LLM_PORT || 8090);
export const LLM_HOST = "127.0.0.1";
export const LLM_URL = `http://${LLM_HOST}:${LLM_PORT}`;

export const MODEL = {
  repo: "bartowski/Qwen2.5-7B-Instruct-GGUF",
  file: "Qwen2.5-7B-Instruct-Q4_K_M.gguf",
  url: "https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf",
  bytesHint: 4.68 * 1024 * 1024 * 1024,
};

export const VOICE = {
  name: "zh-HK-HiuMaanNeural",
  lang: "zh-HK",
  interviewer: "陳嘉敏姑娘",
};

export const PHASES = ["opening", "development", "turn", "closing"];

export const HEX_AXES = [
  "職位理解",
  "個案與家庭工作",
  "營運與導師管理",
  "危機與保護兒童",
  "協作與溝通",
  "個人特質與抗壓",
];

export function ensureDirs() {
  for (const dir of [VENDOR_DIR, MODELS_DIR, DATA_DIR, REPORTS_DIR, TTS_CACHE_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function modelPath() {
  return path.join(MODELS_DIR, MODEL.file);
}

export function findLlamaServer() {
  if (!fs.existsSync(VENDOR_DIR)) return null;
  const stack = [VENDOR_DIR];
  while (stack.length) {
    const dir = stack.pop();
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      let stat;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) stack.push(full);
      else if (name.toLowerCase() === "llama-server.exe" || name.toLowerCase() === "llama-server") {
        return full;
      }
    }
  }
  return null;
}

export function isReady() {
  return Boolean(findLlamaServer() && fs.existsSync(modelPath()));
}
