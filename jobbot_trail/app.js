const MEMO_KEY = "hkpa_personal_memo_v1";
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const state = {
  sessionId: null,
  listening: false,
  recognition: null,
  voicePrefix: "",
  voiceSuffix: "",
  busy: false,
  audio: null,
  hexAxes: ["職位理解", "個案與家庭工作", "營運與導師管理", "危機與保護兒童", "協作與溝通", "個人特質與抗壓"],
};

const $ = (id) => document.getElementById(id);

const STAGE = { welcome: "home", interview: "room", results: "report" };

function show(panel) {
  document.body.dataset.stage = STAGE[panel] || "home";
  ["welcome", "interview", "results"].forEach((name) => {
    $(`${name}Panel`).classList.toggle("is-active", name === panel);
  });
  $("topbarMeta").hidden = panel !== "interview";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  if (!res.ok) throw new Error(data.error || `請求失敗（${res.status}）`);
  return data;
}

function setupSheets() {
  const tabs = document.querySelectorAll(".sheet-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.toggle("is-active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });
      document.querySelectorAll(".sheet-panel").forEach((p) => {
        const match = p.id === `sheet-${tab.dataset.sheet}`;
        p.hidden = !match;
        p.classList.toggle("is-active", match);
      });
    });
  });
}

function setupMemo() {
  const memo = $("personalMemo");
  memo.value = localStorage.getItem(MEMO_KEY) || "";
  memo.addEventListener("input", () => localStorage.setItem(MEMO_KEY, memo.value));
}

function setupVoice() {
  const btn = $("voiceBtn");
  const status = $("voiceStatus");
  const label = $("voiceLabel");
  if (!SpeechRecognition) {
    btn.disabled = true;
    status.textContent = "此瀏覽器不支援語音輸入，請改用文字";
    return;
  }
  const rec = new SpeechRecognition();
  rec.lang = "zh-HK";
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let finalBuffer = "";

  rec.onstart = () => {
    state.listening = true;
    btn.classList.add("is-listening");
    btn.setAttribute("aria-pressed", "true");
    label.textContent = "聆聽中";
    status.textContent = "";
    finalBuffer = "";
  };
  rec.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalBuffer += t;
      else interim += t;
    }
    const el = $("answerInput");
    const insert = `${finalBuffer}${interim}`;
    el.value = `${state.voicePrefix || ""}${insert}${state.voiceSuffix || ""}`;
    const caret = (state.voicePrefix || "").length + insert.length;
    el.setSelectionRange(caret, caret);
    $("charCount").textContent = `${el.value.trim().length} 字`;
  };
  rec.onerror = (event) => {
    status.textContent = event.error === "not-allowed" ? "請允許麥克風" : "語音未能辨識";
    stopVoice();
  };
  rec.onend = () => {
    if (state.listening) stopVoice(true);
  };
  state.recognition = rec;
  btn.addEventListener("click", () => {
    if (state.listening) stopVoice();
    else startVoice();
  });
}

function startVoice() {
  if (!state.recognition || state.listening || state.busy) return;
  const el = $("answerInput");
  const start = Number.isInteger(el.selectionStart) ? el.selectionStart : el.value.length;
  const end = Number.isInteger(el.selectionEnd) ? el.selectionEnd : el.value.length;
  state.voicePrefix = el.value.slice(0, start);
  state.voiceSuffix = el.value.slice(end);
  try {
    state.recognition.start();
  } catch {
    $("voiceStatus").textContent = "無法啟動麥克風，請重試";
  }
}

function stopVoice(fromEnd) {
  state.listening = false;
  const btn = $("voiceBtn");
  btn.classList.remove("is-listening");
  btn.setAttribute("aria-pressed", "false");
  $("voiceLabel").textContent = "說話";
  if (!fromEnd) {
    try {
      state.recognition?.stop();
    } catch {
      /* ignore */
    }
  }
  $("voiceStatus").textContent = $("answerInput").value.trim() ? "可改字後送出" : "";
}

function setTalking(on) {
  $("avatarWrap").classList.toggle("is-talking", on);
  $("wave").hidden = !on;
}

function setPhase(progress) {
  const total = progress?.total || 6;
  const index = Math.min(progress?.index || 1, total);
  $("progressLabel").textContent = `${index} / ${total}`;
  $("progressFill").style.width = `${(index / total) * 100}%`;
}

function appendBubble(role, text) {
  const el = document.createElement("div");
  el.className = `bubble ${role}`;
  el.innerHTML = `<small>${role === "interviewer" ? "面試官" : "你"}</small>${escapeHtml(text)}`;
  $("transcript").appendChild(el);
  $("transcript").scrollTop = $("transcript").scrollHeight;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderTranscript(turns) {
  $("transcript").innerHTML = "";
  (turns || []).forEach((t) => appendBubble(t.role === "interviewer" ? "interviewer" : "user", t.text));
}

async function loadSpeech(text, emotion) {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, emotion }),
  });
  if (!res.ok) throw new Error("語音合成失敗");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.preload = "auto";
  await Promise.race([
    new Promise((resolve, reject) => {
      const done = () => resolve();
      audio.addEventListener("canplaythrough", done, { once: true });
      audio.addEventListener("error", () => reject(new Error("語音載入失敗")), { once: true });
      audio.load();
    }),
    new Promise((resolve) => setTimeout(resolve, 500)),
  ]);
  return { audio, url };
}

async function playSpeech(pack) {
  if (state.audio) {
    state.audio.pause();
    state.audio.src = "";
  }
  state.audio = pack.audio;
  setTalking(true);
  try {
    await pack.audio.play();
    await new Promise((resolve) => {
      pack.audio.onended = resolve;
      pack.audio.onerror = resolve;
    });
  } finally {
    setTalking(false);
    URL.revokeObjectURL(pack.url);
  }
}

async function applyTurn(data) {
  setPhase(data.progress);
  $("nowSpeaking").classList.add("is-waiting");
  $("questionText").textContent = "";
  $("answerInput").value = "";
  $("charCount").textContent = "0 字";
  $("liveStatus").textContent = "";

  let pack = null;
  try {
    pack = await loadSpeech(data.say, data.emotion || "neutral");
  } catch {
    $("voiceStatus").textContent = "未能播放語音";
  }

  $("nowSpeaking").classList.remove("is-waiting");
  $("questionText").textContent = data.say;
  renderTranscript(data.transcript);

  if (pack) await playSpeech(pack);
  $("liveStatus").textContent = data.done ? "" : "請作答";

  if (data.done) {
    $("submitBtn").disabled = true;
    await generateReport();
    return;
  }
  $("submitBtn").disabled = false;
  $("answerInput").focus();
}

async function startInterview() {
  if (state.busy) return;
  state.busy = true;
  $("startBtn").disabled = true;
  try {
    show("interview");
    $("nowSpeaking").classList.add("is-waiting");
    $("questionText").textContent = "";
    $("transcript").innerHTML = "";
    $("submitBtn").disabled = true;
    const data = await api("/api/interview/start", { method: "POST", body: "{}" });
    state.sessionId = data.sessionId;
    await applyTurn(data);
  } catch (err) {
    alert(err.message);
    show("welcome");
  } finally {
    state.busy = false;
    $("startBtn").disabled = false;
  }
}

async function submitAnswer() {
  const answer = $("answerInput").value.trim();
  if (!answer || state.busy || !state.sessionId) {
    $("answerInput").focus();
    return;
  }
  stopVoice();
  state.busy = true;
  $("submitBtn").disabled = true;
  $("nowSpeaking").classList.add("is-waiting");
  $("questionText").textContent = "";
  $("liveStatus").textContent = "";
  try {
    const data = await api("/api/interview/turn", {
      method: "POST",
      body: JSON.stringify({ sessionId: state.sessionId, answer }),
    });
    await applyTurn(data);
  } catch (err) {
    alert(err.message);
    $("submitBtn").disabled = false;
  } finally {
    state.busy = false;
  }
}

async function generateReport() {
  $("nowSpeaking").classList.add("is-waiting");
  $("questionText").textContent = "";
  try {
    const report = await api("/api/interview/report", {
      method: "POST",
      body: JSON.stringify({ sessionId: state.sessionId }),
    });
    renderReport(report);
    show("results");
  } catch (err) {
    alert(`報告生成失敗：${err.message}`);
    show("welcome");
  }
}

function drawRadar(values) {
  const canvas = $("radarCanvas");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2 + 8;
  const r = Math.min(w, h) * 0.34;
  const axes = state.hexAxes;
  const n = axes.length;
  ctx.clearRect(0, 0, w, h);

  const pt = (i, scale) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * r * scale, cy + Math.sin(a) * r * scale];
  };

  for (let ring = 1; ring <= 5; ring++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const [x, y] = pt(i, ring / 5);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(15,107,92,0.18)";
    ctx.stroke();
  }

  ctx.beginPath();
  axes.forEach((_, i) => {
    const [x, y] = pt(i, 1);
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "rgba(15,107,92,0.18)";
  ctx.stroke();

  ctx.beginPath();
  axes.forEach((axis, i) => {
    const v = Math.max(0, Math.min(10, Number(values[axis]) || 0)) / 10;
    const [x, y] = pt(i, v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(200,232,106,0.45)";
  ctx.strokeStyle = "#08483e";
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#14201c";
  ctx.font = "13px Noto Sans TC, Microsoft JhengHei, sans-serif";
  ctx.textAlign = "center";
  axes.forEach((axis, i) => {
    const [x, y] = pt(i, 1.28);
    ctx.fillText(axis.replace("與", "與\n").split("\n")[0], x, y);
  });
}

function renderReport(report) {
  $("gradeBadge").textContent = report.grade;
  $("gradeBadge").dataset.grade = report.grade;
  $("gradeLabel").textContent = report.gradeLabel;
  $("chanceLine").textContent = report.chance || "";
  $("overallScore").textContent = report.overallScore;
  $("overallVerdict").textContent = report.verdict;
  drawRadar(report.hexagon || {});
  $("radarLegend").innerHTML = state.hexAxes
    .map((k) => `<li>${k}<strong>${Number(report.hexagon?.[k] || 0).toFixed(1)}</strong></li>`)
    .join("");
  const mins = Math.round((report.durationSec || 0) / 60);
  $("reportMeta").innerHTML = `
    <p><strong>職位</strong><br>${report.job?.org || ""}｜${report.job?.title || ""}</p>
    <p><strong>計劃</strong><br>${report.job?.program || ""}</p>
    <p><strong>時長</strong><br>約 ${mins} 分鐘 · ${new Date(report.at).toLocaleString("zh-HK")}</p>
    <p><strong>評級說明</strong><br>SS 最高、D 最低；評級愈高代表錄取成功機率愈高。</p>`;
  $("resultsGrid").innerHTML = (report.items || [])
    .map((item, i) => {
      const aiScored = item.scoreSource === "llm+heuristic";
      const scoreTag = aiScored ? "AI＋規則評分" : "離線規則評分";
      return `
      <article class="result-card">
        <span class="result-score">${Number(item.score).toFixed(1)}／10</span>
        <div class="cat">${item.category || ""}<span class="score-tag" title="${aiScored ? "本機語言模型語意評分，並以規則評分作穩定校正" : "語言模型未能評分，暫用離線規則評分"}">${scoreTag}</span></div>
        <h3>第 ${i + 1} 題</h3>
        <div class="qa-block"><b>面試官</b>${escapeHtml(item.question)}</div>
        <div class="qa-block"><b>你的回答</b>${escapeHtml(item.answer)}</div>
        <p>${escapeHtml(item.comment || "")}</p>
        <div class="qa-block opt"><b>優化完整答案（可直接練習口述）</b>${escapeHtml(item.optimizedAnswer || "")}</div>
      </article>`;
    })
    .join("");
}

async function loadHistory() {
  try {
    const rows = await api("/api/reports");
    $("statSessions").textContent = String(rows.length);
    if (!rows.length) {
      $("statGrade").textContent = "—";
      $("statBest").textContent = "—";
      $("statWeak").textContent = "—";
      $("historyList").innerHTML = '<p class="empty-hint">完成面試後，報告會出現在這裡。</p>';
      return;
    }
    const order = ["SS", "S", "A", "B", "C", "D"];
    $("statGrade").textContent = rows[0].grade;
    $("statBest").textContent = rows.slice().sort((a, b) => order.indexOf(a.grade) - order.indexOf(b.grade))[0].grade;
    $("statWeak").textContent = "見各場報告";
    $("historyList").innerHTML = rows
      .map((h) => {
        const date = new Date(h.at).toLocaleString("zh-HK", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        return `<button type="button" class="history-item" data-id="${h.id}">
          <span class="score">${h.grade}</span>
          <div>
            <div>模擬面試 · ${h.overallScore}</div>
            <div class="meta">${date}</div>
          </div>
        </button>`;
      })
      .join("");
    $("historyList").querySelectorAll(".history-item").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const report = await api(`/api/reports/${btn.dataset.id}`);
        renderReport(report);
        show("results");
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  } catch {
    $("historyList").innerHTML = '<p class="empty-hint">未能讀取存檔。</p>';
  }
}

async function refreshStatus() {
  try {
    const s = await api("/api/status");
    if (s.hexAxes?.length) state.hexAxes = s.hexAxes;
    const pill = $("enginePill");
    const copy = $("engineCopy");
    const setupBtn = $("setupBtn");
    $("startBtn").disabled = !s.llmReady;
    $("engineCard").hidden = Boolean(s.llmReady);
    if (s.llmReady) {
      pill.textContent = "已就緒";
      pill.className = "engine-pill is-ready";
      copy.textContent = s.trail ? `試驗版已載入 ${s.modelFile || "Qwen3"}（埠 ${s.appPort || 3001}）` : "";
      setupBtn.hidden = true;
    } else if (s.readyFiles) {
      pill.textContent = "載入中";
      pill.className = "engine-pill is-busy";
      copy.textContent = "正在載入模型…";
      setupBtn.hidden = true;
      try {
        await api("/api/boot", { method: "POST", body: "{}" });
        await refreshStatus();
      } catch (err) {
        copy.textContent = err.message;
      }
    } else {
      pill.textContent = "未安裝";
      pill.className = "engine-pill is-down";
      copy.textContent = "首次使用請下載本機引擎。";
      setupBtn.hidden = false;
    }
  } catch {
    $("enginePill").textContent = "未連線";
    $("enginePill").className = "engine-pill is-down";
    $("engineCopy").textContent = "請先執行 npm start。";
    $("startBtn").disabled = true;
    $("setupBtn").hidden = true;
  }
}

async function runSetup() {
  $("setupBtn").disabled = true;
  $("setupTrack").hidden = false;
  $("enginePill").textContent = "下載中";
  $("enginePill").className = "engine-pill is-busy";
  try {
    const res = await fetch("/api/setup", { method: "POST" });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() || "";
      for (const part of parts) {
        const line = part.replace(/^data:\s*/, "");
        if (!line) continue;
        try {
          const p = JSON.parse(line);
          if (p.percent != null) $("setupFill").style.width = `${p.percent}%`;
          if (p.message) $("engineCopy").textContent = p.message;
          if (p.stage === "error") throw new Error(p.message);
        } catch (err) {
          if (err instanceof SyntaxError) continue;
          throw err;
        }
      }
    }
    $("setupFill").style.width = "100%";
    await refreshStatus();
  } catch (err) {
    $("engineCopy").textContent = err.message;
    $("enginePill").textContent = "失敗";
    $("enginePill").className = "engine-pill is-down";
    $("setupBtn").disabled = false;
  }
}

function goHome() {
  stopVoice();
  if (state.audio) {
    state.audio.pause();
    state.audio = null;
  }
  show("welcome");
  loadHistory();
  refreshStatus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function init() {
  setupSheets();
  setupMemo();
  setupVoice();
  $("startBtn").addEventListener("click", startInterview);
  $("setupBtn").addEventListener("click", runSetup);
  $("submitBtn").addEventListener("click", submitAnswer);
  $("retryBtn").addEventListener("click", startInterview);
  $("reviewBtn").addEventListener("click", goHome);
  $("homeBtn").addEventListener("click", () => {
    if ($("interviewPanel").classList.contains("is-active")) {
      if (!confirm("確定離開？進行中的面試不會計入報告。")) return;
    }
    goHome();
  });
  $("homeFromInterviewBtn").addEventListener("click", () => {
    if (confirm("確定結束並返回？未完成的面試不會生成報告。")) goHome();
  });
  $("printBtn").addEventListener("click", () => window.print());
  $("clearHistoryBtn").addEventListener("click", async () => {
    if (!confirm("確定清除全部已存檔報告？")) return;
    const rows = await api("/api/reports");
    await Promise.all(rows.map((r) => fetch(`/api/reports/${r.id}`, { method: "DELETE" })));
    loadHistory();
  });
  $("answerInput").addEventListener("input", () => {
    $("charCount").textContent = `${$("answerInput").value.trim().length} 字`;
  });
  $("answerInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitAnswer();
    }
  });
  refreshStatus();
  loadHistory();
}

document.addEventListener("DOMContentLoaded", init);
