import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import {
  VENDOR_DIR,
  MODELS_DIR,
  MODEL,
  PARENT_VENDOR_DIR,
  modelPath,
  findLlamaServer,
  ensureDirs,
} from "./config.mjs";

const LLAMA_REPO = "ggml-org/llama.cpp";

export async function fetchLatestLlamaAssets() {
  const res = await fetch(`https://api.github.com/repos/${LLAMA_REPO}/releases/latest`, {
    headers: { "User-Agent": "hkpa-interview-coach", Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`無法讀取 llama.cpp 版本：${res.status}`);
  const json = await res.json();
  const assets = json.assets || [];
  const vulkan = assets.find((a) => /llama-.*-bin-win-vulkan-x64\.zip$/i.test(a.name));
  if (!vulkan) throw new Error("最新 llama.cpp 版本找不到 Windows Vulkan 壓縮檔");
  return {
    tag: json.tag_name,
    zipName: vulkan.name,
    zipUrl: vulkan.browser_download_url,
    size: vulkan.size,
  };
}

export async function downloadFile(url, dest, onProgress) {
  const res = await fetch(url, {
    headers: { "User-Agent": "hkpa-interview-coach" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`下載失敗 ${res.status}：${url}`);
  const total = Number(res.headers.get("content-length") || 0);
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  const file = fs.createWriteStream(dest);
  const reader = res.body.getReader();
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    file.write(Buffer.from(value));
    received += value.byteLength;
    if (onProgress) onProgress({ received, total, dest: path.basename(dest) });
  }
  await new Promise((resolve, reject) => {
    file.end(() => resolve());
    file.on("error", reject);
  });
  return dest;
}

function unzip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  if (process.platform !== "win32") {
    // README 電腦配置明確係 Windows；喺其他平台提早畀清晰訊息，
    // 好過解壓步驟直接因為搵唔到 powershell.exe 而丟出難以理解嘅錯誤。
    return Promise.reject(
      new Error("自動下載嘅 llama.cpp（Windows Vulkan 版）只支援 Windows。請參考 README 手動安裝適合你系統嘅 llama.cpp 版本。")
    );
  }
  return new Promise((resolve, reject) => {
    const ps = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`,
      ],
      { windowsHide: true }
    );
    let err = "";
    ps.stderr.on("data", (d) => {
      err += d.toString();
    });
    ps.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err || `解壓失敗（${code}）`));
    });
  });
}

export async function ensureLlama(onProgress) {
  ensureDirs();
  const existing = findLlamaServer();
  if (existing) {
    const reusedParent = existing.startsWith(PARENT_VENDOR_DIR);
    onProgress?.({
      stage: "llama",
      message: reusedParent
        ? "已沿用原版 llama.cpp（只讀，唔會改動原版檔案），略過下載"
        : "已找到 llama-server，略過下載",
    });
    return existing;
  }
  onProgress?.({ stage: "llama", message: "正在查詢 GitHub llama.cpp 最新版本…" });
  const asset = await fetchLatestLlamaAssets();
  const zipPath = path.join(VENDOR_DIR, asset.zipName);
  onProgress?.({
    stage: "llama",
    message: `下載 ${asset.zipName}（${asset.tag}）`,
    received: 0,
    total: asset.size,
  });
  await downloadFile(asset.zipUrl, zipPath, (p) =>
    onProgress?.({ stage: "llama", message: `下載 llama.cpp ${asset.tag}`, ...p })
  );
  onProgress?.({ stage: "llama", message: "正在解壓 llama.cpp…" });
  await unzip(zipPath, VENDOR_DIR);
  try {
    fs.unlinkSync(zipPath);
  } catch {
    /* keep zip if locked */
  }
  const exe = findLlamaServer();
  if (!exe) throw new Error("解壓後找不到 llama-server.exe");
  onProgress?.({ stage: "llama", message: "llama.cpp 準備完成（Vulkan GPU）" });
  return exe;
}

export async function ensureModel(onProgress) {
  ensureDirs();
  const dest = modelPath();
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1_000_000_000) {
    onProgress?.({ stage: "model", message: "已找到本機 Qwen 模型，略過下載" });
    return dest;
  }
  const tmp = `${dest}.part`;
  onProgress?.({
    stage: "model",
    message: `下載 ${MODEL.file}（約 4.7 GB，只需一次）`,
    received: 0,
    total: MODEL.bytesHint,
  });
  await downloadFile(MODEL.url, tmp, (p) =>
    onProgress?.({
      stage: "model",
      message: `下載中文模型 ${MODEL.file}`,
      ...p,
    })
  );
  fs.renameSync(tmp, dest);
  onProgress?.({ stage: "model", message: "模型下載完成" });
  return dest;
}

export async function runSetup(onProgress) {
  ensureDirs();
  await ensureLlama(onProgress);
  await ensureModel(onProgress);
  onProgress?.({ stage: "done", message: "本機引擎已就緒" });
  return { llama: findLlamaServer(), model: modelPath() };
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]).includes("setup.mjs");
if (isDirect) {
  runSetup((p) => {
    const pct = p.total ? ` ${Math.round((p.received / p.total) * 100)}%` : "";
    console.log(`[${p.stage}] ${p.message || ""}${pct}`);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
