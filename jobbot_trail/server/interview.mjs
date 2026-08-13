import crypto from "crypto";
import { AGENDA, INTERVIEWER, JOB, CLOSING_LINE } from "./job.mjs";
import { chat } from "./llm.mjs";
import { synthesize } from "./tts.mjs";
import { isThinAnswer, questionOverlap } from "./score.mjs";

const sessions = new Map();
const OVERLAP_LIMIT = 0.52;
// 面試 session 只存在記憶體；伺服器長時間運行時若唔清理會不斷累積。
// 未完成面試通常唔會再重用（前端無重新連接舊 session 嘅入口），所以逾時後可以安全回收。
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 小時
const SESSION_SWEEP_INTERVAL_MS = 15 * 60 * 1000;

function sweepStaleSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    const lastActivity = session.turns[session.turns.length - 1]?.at || session.startedAt;
    if (now - lastActivity > SESSION_TTL_MS) sessions.delete(id);
  }
}

const sweepTimer = setInterval(sweepStaleSessions, SESSION_SWEEP_INTERVAL_MS);
sweepTimer.unref?.();

function uid() {
  return crypto.randomBytes(8).toString("hex");
}

export function getSession(id) {
  return sessions.get(id);
}

function previousQuestions(session) {
  return session.turns.filter((t) => t.role === "interviewer").map((t) => t.text);
}

function tooSimilar(say, used) {
  return used.some((prev) => questionOverlap(say, prev) >= OVERLAP_LIMIT);
}

function cleanSay(raw) {
  let s = String(raw || "");
  s = s.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/\{[\s\S]*\}/g, (block) => {
    try {
      const obj = JSON.parse(block);
      return obj.say || " ";
    } catch {
      return " ";
    }
  });
  s = s.replace(/(["']?(?:say|emotion|move|category|done)["']?\s*[:=]\s*[^,\n}]+)/gi, " ");
  s = s.replace(/\b(followup|next|close|done|true|false)\b/gi, " ");
  s = s.replace(/【[^】]*】/g, " ");
  s = s.replace(/^(陳姑娘[：:])+/, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function decideMove(session, answer) {
  const last = AGENDA.length - 1;
  if (session.agendaIndex >= last) {
    if (session.followUpsThisItem < 1 && isThinAnswer(answer)) return "followup";
    return "close";
  }
  if (session.followUpsThisItem < 1 && isThinAnswer(answer)) return "followup";
  return "next";
}

function applyMove(session, move) {
  if (move === "followup") {
    session.followUpsThisItem += 1;
    return;
  }
  if (move === "close") {
    session.done = true;
    return;
  }
  if (session.agendaIndex < AGENDA.length - 1) {
    session.agendaIndex += 1;
    session.followUpsThisItem = 0;
  } else {
    session.done = true;
  }
}

function targetItem(session, move) {
  if (move === "followup" || move === "close") return AGENDA[session.agendaIndex];
  return AGENDA[Math.min(session.agendaIndex + 1, AGENDA.length - 1)];
}

function systemPrompt() {
  return `你係「${INTERVIEWER.address}」，香港遊樂場協會面試官，見計劃主任（ASWO）。
對面係專業社工，語氣禮貌、平靜。

【開口】
- 香港粵語口語，每次最多兩句：一句短承接（可省略），一句問題。
- 問題要短、只問核心，唔好提示、教路、評分，亦唔好先講答案。
- 同一句入面唔好用兩個意思一樣嘅問法。
- say 只可以係你親口會講嘅說話，唔好出現 JSON 欄位名。

職位：${JOB.program}；職責包括個案／活動、導師管理、假期託管、行政。`;
}

function directorPrompt({ item, move, userAnswer, used, attempt }) {
  const banned = used.length
    ? used.map((q, i) => `${i + 1}. ${q}`).join("\n")
    : "（未有）";
  const retry = attempt
    ? `\n上一稿同已問過嘅題太相似，必須換一個全新角度，唔好改幾個字就算。`
    : "";

  if (move === "close") {
    return `面試結束。用兩句禮貌多謝對方時間，話之後有練習報告。唔好評分、唔好再問新題。`;
  }

  if (move === "followup") {
    return `對方剛答：「${userAnswer}」
而家主題仍係：${item.topic}
請就住佢嘅答案追問一個全新角度（例如細節、結果、另一場景）。
仍然留喺而家呢個主題，唔好跳去下一個大範疇。
絕對唔可以重述、改寫或再問已出現過嘅題。
可參考但唔好照抄嘅角度：${item.angles.join("、")}
${retry}

已問過（全部禁止再問或問到好似）：
${banned}

只輸出 JSON：{"say":"粵語口語","emotion":"probing"}`;
  }

  return `進入新主題：${item.topic}
用你自己嘅說法出一條短問題，保持自然隨機，唔好用固定講稿。
可參考角度：${item.angles.join("、")}
${userAnswer ? `對方上一題答過：「${userAnswer}」先用一句承接。` : "呢題係開場。"}
${retry}

已問過（全部禁止再問或問到好似）：
${banned}

只輸出 JSON：{"say":"粵語口語","emotion":"warm|neutral|serious|probing"}`;
}

async function generateSay({ item, move, userAnswer, used }) {
  if (move === "close") {
    try {
      const { json, content } = await chat({
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: directorPrompt({ item, move, userAnswer, used, attempt: 0 }) },
        ],
        temperature: 0.7,
        maxTokens: 160,
        json: true,
      });
      const say = cleanSay(json?.say || content);
      if (say.length >= 8) return { say, emotion: "warm" };
    } catch {
      /* fallback */
    }
    return { say: CLOSING_LINE, emotion: "warm" };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { json, content } = await chat({
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: directorPrompt({ item, move, userAnswer, used, attempt }) },
        ],
        temperature: 0.85 + attempt * 0.05,
        maxTokens: 220,
        json: true,
      });
      const say = cleanSay(json?.say || content);
      const emotion = ["warm", "neutral", "serious", "probing", "encouraging"].includes(json?.emotion)
        ? json.emotion
        : move === "followup"
          ? "probing"
          : item.phase === "turn"
            ? "serious"
            : "neutral";
      if (say.length >= 8 && !tooSimilar(say, used)) {
        return { say, emotion };
      }
    } catch {
      /* retry */
    }
  }

  const unused = (item.angles || []).find((angle) => !tooSimilar(angle, used));
  const ack = userAnswer ? "唔該晒。" : "你好，我姓陳。";
  const fallback = unused
    ? `${ack}可唔可以就「${unused}」講吓你嘅睇法或者做法？`
    : `${ack}可唔可以換另一個角度再講具體啲？`;
  return { say: fallback, emotion: move === "followup" ? "probing" : "neutral" };
}

export async function startInterview() {
  const id = uid();
  const session = {
    id,
    startedAt: Date.now(),
    agendaIndex: 0,
    followUpsThisItem: 0,
    done: false,
    turns: [],
  };
  sessions.set(id, session);
  const item = AGENDA[0];
  const { say, emotion } = await generateSay({
    item,
    move: "next",
    userAnswer: null,
    used: [],
  });
  const turn = {
    role: "interviewer",
    text: say,
    at: Date.now(),
    emotion,
    category: item.category,
    phase: item.phase,
    agendaId: item.id,
    move: "next",
    isFollowUp: false,
  };
  session.turns.push(turn);
  try {
    await synthesize(say, emotion);
  } catch {
    /* ignore */
  }
  return {
    sessionId: id,
    say,
    emotion,
    phase: item.phase,
    phaseLabel: item.label,
    category: item.category,
    progress: { index: 1, total: AGENDA.length },
    done: false,
    transcript: session.turns,
  };
}

export async function userTurn(sessionId, answer) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("找不到呢場面試，請重新開始。");
  if (session.done) throw new Error("呢場面試已經結束。");
  const text = String(answer || "").trim();
  if (!text) throw new Error("請先作答。");

  const current = AGENDA[session.agendaIndex];
  session.turns.push({
    role: "user",
    text,
    at: Date.now(),
    category: current.category,
    phase: current.phase,
    agendaId: current.id,
  });

  const move = decideMove(session, text);
  const item = targetItem(session, move);
  const used = previousQuestions(session);
  const { say, emotion } = await generateSay({ item, move, userAnswer: text, used });
  applyMove(session, move);

  const done = move === "close" || session.done;
  session.done = done;

  const turn = {
    role: "interviewer",
    text: say,
    at: Date.now(),
    emotion,
    category: item.category,
    phase: item.phase,
    agendaId: item.id,
    move,
    isFollowUp: move === "followup",
  };
  session.turns.push(turn);

  try {
    await synthesize(say, emotion);
  } catch {
    /* ignore */
  }

  return {
    say,
    emotion,
    phase: item.phase,
    phaseLabel: item.label,
    category: item.category,
    progress: {
      index: Math.min(session.agendaIndex + 1, AGENDA.length),
      total: AGENDA.length,
    },
    done,
    transcript: session.turns,
  };
}

export function listQaPairs(session) {
  const pairs = [];
  let pendingQ = null;
  for (const turn of session.turns) {
    if (turn.role === "interviewer") pendingQ = turn;
    else if (turn.role === "user" && pendingQ) {
      pairs.push({
        question: pendingQ.text,
        answer: turn.text,
        category: pendingQ.category || turn.category,
        phase: pendingQ.phase,
        agendaId: pendingQ.agendaId,
        emotion: pendingQ.emotion,
      });
      pendingQ = null;
    }
  }
  return pairs;
}
