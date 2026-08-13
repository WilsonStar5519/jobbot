import fs from "fs";
import path from "path";
import crypto from "crypto";
import { EdgeTTS } from "node-edge-tts";
import { TTS_CACHE_DIR, VOICE, ensureDirs } from "./config.mjs";

const EMOTION_PROSODY = {
  warm: { pitch: "+3%", rate: "+22%" },
  neutral: { pitch: "+2%", rate: "+24%" },
  serious: { pitch: "-3%", rate: "+16%" },
  probing: { pitch: "+2%", rate: "+20%" },
  encouraging: { pitch: "+6%", rate: "+26%" },
};

function cacheKey(text, emotion) {
  const prosody = EMOTION_PROSODY[emotion] || EMOTION_PROSODY.neutral;
  return crypto.createHash("sha1").update(`v2:${emotion}:${prosody.rate}::${text}`).digest("hex");
}

export async function synthesize(text, emotion = "neutral") {
  ensureDirs();
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) throw new Error("沒有可朗讀的文字");
  const key = cacheKey(clean, emotion);
  const dest = path.join(TTS_CACHE_DIR, `${key}.mp3`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 512) {
    return dest;
  }

  const prosody = EMOTION_PROSODY[emotion] || EMOTION_PROSODY.neutral;
  const tts = new EdgeTTS({
    voice: VOICE.name,
    lang: VOICE.lang,
    outputFormat: "audio-24khz-48kbitrate-mono-mp3",
    pitch: prosody.pitch,
    rate: prosody.rate,
    timeout: 30000,
  });
  await tts.ttsPromise(clean, dest);
  return dest;
}
