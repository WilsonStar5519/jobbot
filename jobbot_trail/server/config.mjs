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

// 試驗版預設用 3001／8091，避免同原版（3000／8090）搶埠或誤連原版已啟動嘅 Qwen2.5。
export const APP_PORT = Number(process.env.APP_PORT || 3001);
export const LLM_PORT = Number(process.env.LLM_PORT || 8091);
export const LLM_HOST = "127.0.0.1";
export const LLM_URL = `http://${LLM_HOST}:${LLM_PORT}`;
export const IS_TRAIL = true;
export const PARENT_VENDOR_DIR = path.resolve(ROOT, "..", "vendor", "llama");

// Qwen3-8B（官方 GGUF）：同 README 電腦配置（Windows + NVIDIA GPU 如 RTX 3080、約 16GB 記憶體）相容，
// 檔案大小同上一代 Qwen2.5-7B 相若（約 4.7GB／Q4_K_M），但指令遵循、JSON 結構化輸出同中文／粵語表達更穩。
// Qwen3 為混合思考模型，面試對答需要低延遲、乾淨嘅 JSON 輸出，所以在 llm.mjs 會強制關閉思考模式（/no_think）。
export const MODEL = {
  repo: "Qwen/Qwen3-8B-GGUF",
  file: "Qwen3-8B-Q4_K_M.gguf",
  url: "https://huggingface.co/Qwen/Qwen3-8B-GGUF/resolve/main/Qwen3-8B-Q4_K_M.gguf",
  bytesHint: 4.68 * 1024 * 1024 * 1024,
  contextLength: 8192,
  family: "qwen3",
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

function findLlamaIn(root) {
  if (!root || !fs.existsSync(root)) return null;
  const stack = [root];
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

export function findLlamaServer() {
  // 優先用試驗版自己嘅引擎；若未下載，只讀取沿用原版 vendor（唔會改寫原版檔案）。
  return findLlamaIn(VENDOR_DIR) || findLlamaIn(PARENT_VENDOR_DIR);
}

export function isReady() {
  return Boolean(findLlamaServer() && fs.existsSync(modelPath()));
}
