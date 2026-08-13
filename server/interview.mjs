import crypto from "crypto";
import { AGENDA, INTERVIEWER, JOB } from "./job.mjs";
import { HEX_AXES } from "./config.mjs";
import { chat } from "./llm.mjs";
import { synthesize } from "./tts.mjs";

const sessions = new Map();

function uid() {
  return crypto.randomBytes(8).toString("hex");
}

function jobBrief() {
  return `職位：${JOB.org} ${JOB.unit} ${JOB.title}（${JOB.titleEn}）
計劃：${JOB.program}
要求：${JOB.requirements.join("；")}
職責：${JOB.duties.join("；")}`;
}

function systemPrompt() {
  return `你係「${INTERVIEWER.address}」，香港遊樂場協會社福單位嘅面試官，而家見計劃主任（ASWO）。
對面係專業社工，請用禮貌、平靜、尊重嘅語氣，好似真實機構面試。

【開口規則】
- 只用香港粵語口語。例如用「可唔可以」「點解」「講吓」「同埋」，唔用「請說明」「為何」「以及」「進行」。
- 每次最多兩句：一句短承接（可省略開場），一句問題。
- 問題只問核心，唔好加提示、框架、評語、教路。
- 唔好講「唔好只講…」「要扣連…」「用 STAR」「標準答案」。
- 唔好一次過問兩條以上。
- 可中英夾雜專業詞（ASWO、SEN），但句子仍要口語。
- say 裡面只可以係你親口會講嘅說話，絕對唔可以出現 JSON、next、followup、close、move、done、導演指示。

正確例子：
「你好，我姓陳。可唔可以先介紹吓你自己，同埋點解想申請呢個職位？」
「唔該晒。你點睇關愛基金呢個課後託管計劃嘅目標？」
「明白。如果有學童手臂有可疑瘀傷，同你講唔好話畀人知，你會點處理？」

錯誤例子（禁止）：
「請你用兩至三分鐘自我介紹，並說明申請原因。要扣連到課託，唔好只講喜歡小朋友。next」

只輸出一個 JSON 物件：
{"say":"粵語口語","emotion":"warm|neutral|serious|probing|encouraging","move":"followup|next|close","category":"${HEX_AXES.join("|")}","done":false}`;
}

function directorPrompt(session, userAnswer) {
  const item = AGENDA[session.agendaIndex];
  const followUps = session.followUpsThisItem;
  const history = session.turns
    .map((t) => `${t.role === "interviewer" ? "官" : "應"}：${t.text}`)
    .join("\n");

  let instruction;
  if (!userAnswer && session.turns.length === 0) {
    instruction = `開場。任務：${item.ask}\n請用兩句內歡迎並提問。`;
  } else if (session.agendaIndex >= AGENDA.length - 1 && followUps >= 1) {
    instruction = `最後一題已問過。禮貌多謝對方時間並結束。done 為 true。say 兩句內，唔好評分。`;
  } else {
    const canFollow = followUps < 1;
    instruction = `而家主題：${item.ask}
應徵者剛答：「${userAnswer}」
若答案太短或空泛，${canFollow ? "可追問一個具體例子。" : "唔好再追問，改問下一主題。"}
最後一題則禮貌結束。承接最多一句，然後只問一條短問題。`;
  }

  return `${jobBrief()}

對話：
${history || "（開始）"}

本輪：
${instruction}`;
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
  s = s.replace(/要扣連[^。！？!?，,]*/g, " ");
  s = s.replace(/唔好只講[^。！？!?，,]*/g, " ");
  s = s.replace(/用\s*STAR[^。！？!?]*/gi, " ");
  s = s.replace(/導演指示[^。！？!?]*/g, " ");
  s = s.replace(/[“”"']/g, "");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/^[,.。、；;]+/, "").trim();
  return s;
}

function applyMove(session, move, hasUserAnswer) {
  if (!hasUserAnswer) return;
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

export function getSession(id) {
  return sessions.get(id);
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
  const first = await interviewerTurn(session, null);
  return { sessionId: id, ...first };
}

export async function userTurn(sessionId, answer) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("找不到呢場面試，請重新開始。");
  if (session.done) throw new Error("呢場面試已經結束。");
  const text = String(answer || "").trim();
  if (!text) throw new Error("請先作答。");

  session.turns.push({
    role: "user",
    text,
    at: Date.now(),
    category: AGENDA[session.agendaIndex].category,
    phase: AGENDA[session.agendaIndex].phase,
  });

  return interviewerTurn(session, text);
}

async function interviewerTurn(session, userAnswer) {
  const item = AGENDA[session.agendaIndex];
  const { content, json } = await chat({
    messages: [
      { role: "system", content: systemPrompt() },
      { role: "user", content: directorPrompt(session, userAnswer) },
    ],
    temperature: 0.55,
    maxTokens: 280,
    json: true,
  });

  const parsed = json || {
    say: content,
    emotion: item.phase === "turn" ? "serious" : "warm",
    move: "next",
    category: item.category,
    done: false,
  };

  let move = parsed.move;
  if (!["followup", "next", "close"].includes(move)) move = "next";
  if (move === "followup" && session.followUpsThisItem >= 1) move = "next";
  if (!userAnswer) {
    move = "next";
    parsed.done = false;
  }
  if (parsed.done === true) move = "close";

  let say = cleanSay(parsed.say || content);
  if (!say || say.length < 6) {
    say = userAnswer ? "唔該晒。可唔可以再講具體啲？" : "你好，我姓陳。可唔可以先介紹吓你自己，同埋點解想申請呢個職位？";
  }

  const emotion = ["warm", "neutral", "serious", "probing", "encouraging"].includes(parsed.emotion)
    ? parsed.emotion
    : "neutral";

  applyMove(session, move, Boolean(userAnswer));
  const nowItem = AGENDA[Math.min(session.agendaIndex, AGENDA.length - 1)];
  const done = Boolean(userAnswer) && (move === "close" || session.done || parsed.done === true);
  session.done = done;

  const turn = {
    role: "interviewer",
    text: say,
    at: Date.now(),
    emotion,
    category: parsed.category || nowItem.category,
    phase: nowItem.phase,
    move,
    isFollowUp: move === "followup",
  };
  session.turns.push(turn);

  try {
    await synthesize(say, emotion);
  } catch {
    /* 語音稍後由前端再試 */
  }

  return {
    say,
    emotion,
    phase: nowItem.phase,
    phaseLabel: nowItem.label,
    category: turn.category,
    progress: {
      index: Math.min(session.agendaIndex + (done ? 0 : 1), AGENDA.length),
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
        category: turn.category || pendingQ.category,
        phase: pendingQ.phase,
        emotion: pendingQ.emotion,
      });
    }
  }
  return pairs;
}
