import fs from "fs";
import path from "path";
import { REPORTS_DIR, ensureDirs } from "./config.mjs";
import { JOB } from "./job.mjs";
import { chat } from "./llm.mjs";
import { listQaPairs } from "./interview.mjs";
import {
  scoreAnswer,
  hexagonFromItems,
  buildComment,
  buildOptimized,
  isNonsense,
  inferCategory,
} from "./score.mjs";

const GRADE_TABLE = [
  { grade: "SS", min: 9.3, label: "極高成功機率", chance: "約 90% 以上", hint: "表達完整、專業判斷穩、例子有結果。" },
  { grade: "S", min: 8.5, label: "高成功機率", chance: "約 75–90%", hint: "整體到位，只需再打磨一兩個弱項。" },
  { grade: "A", min: 7.5, label: "中高成功機率", chance: "約 55–75%", hint: "框架正確，例子同程序再具體會更穩。" },
  { grade: "B", min: 6.5, label: "中等成功機率", chance: "約 35–55%", hint: "有基本方向，職責對位或危機程序仍不足。" },
  { grade: "C", min: 5.0, label: "偏低成功機率", chance: "約 15–35%", hint: "內容偏泛或扣題不足。" },
  { grade: "D", min: 0, label: "低成功機率", chance: "約 15% 以下", hint: "未能回應題目或明顯離題。" },
];

export function gradeFromScore(score) {
  const s = Number(score) || 0;
  return GRADE_TABLE.find((g) => s >= g.min) || GRADE_TABLE[GRADE_TABLE.length - 1];
}

function localItems(pairs) {
  return pairs.map((p) => {
    const category = inferCategory(p);
    const score = scoreAnswer(p.question, p.answer);
    const item = { ...p, category };
    return {
      question: p.question,
      answer: p.answer,
      category,
      score,
      comment: buildComment(item, score),
      optimizedAnswer: buildOptimized(item),
    };
  });
}

async function enrichWithLlm(items) {
  if (!items.length || items.every((it) => isNonsense(it.answer))) return items;
  const payload = items.map((it, i) => ({
    i,
    question: it.question,
    answer: it.answer,
  }));
  try {
    const { json } = await chat({
      messages: [
        {
          role: "system",
          content: "你係社工面試評審。只輸出 JSON。必須逐題對應輸入嘅 question/answer，唔可以改寫、調亂或發明題目。",
        },
        {
          role: "user",
          content: `為以下每一題寫 comment（兩句，針對呢條題）同 optimizedAnswer（粵語口語，保留應徵者原意，直接答呢條題）。
輸入：
${JSON.stringify(payload)}
輸出：
{"items":[{"i":0,"comment":"","optimizedAnswer":""}]}`,
        },
      ],
      temperature: 0.2,
      maxTokens: 1800,
      json: true,
    });
    const extra = Array.isArray(json?.items) ? json.items : [];
    return items.map((it, i) => {
      const hit = extra.find((x) => Number(x.i) === i) || extra[i];
      if (!hit) return it;
      return {
        ...it,
        comment: String(hit.comment || it.comment).slice(0, 180) || it.comment,
        optimizedAnswer: String(hit.optimizedAnswer || "").trim() || it.optimizedAnswer,
      };
    });
  } catch {
    return items;
  }
}

function buildVerdict(items, grade) {
  const n = items.length || 1;
  const nonsenseN = items.filter((it) => isNonsense(it.answer)).length;
  if (nonsenseN >= Math.ceil(n * 0.6)) {
    return "多數答案未能回應題目，目前難以評估專業能力。建議用完整句子、針對問題作答後再試。";
  }
  const weak = items.filter((it) => it.score < 6).map((it) => it.category);
  const strong = items.filter((it) => it.score >= 7.5).map((it) => it.category);
  const uniq = (arr) => [...new Set(arr)];
  const bits = [`整體評級${grade.grade}（${grade.label}）。`];
  if (strong.length) bits.push(`相對穩陣：${uniq(strong).join("、")}。`);
  if (weak.length) bits.push(`需要加強：${uniq(weak).join("、")}。`);
  return bits.join("");
}

export async function buildReport(session) {
  const pairs = listQaPairs(session);
  let items = localItems(pairs);
  items = await enrichWithLlm(items);
  items = items.map((it, i) => {
    const question = pairs[i]?.question || it.question;
    const answer = pairs[i]?.answer || it.answer;
    const category = inferCategory({ question, answer, category: it.category });
    return {
      question,
      answer,
      category,
      score: scoreAnswer(question, answer),
      comment: it.comment,
      optimizedAnswer: it.optimizedAnswer,
    };
  });

  const overall = items.length
    ? Math.round((items.reduce((s, it) => s + it.score, 0) / items.length) * 10) / 10
    : 1;
  const hex = hexagonFromItems(items, pairs);
  const g = gradeFromScore(overall);

  const report = {
    id: session.id,
    at: Date.now(),
    startedAt: session.startedAt,
    durationSec: Math.round((Date.now() - session.startedAt) / 1000),
    job: {
      org: JOB.org,
      unit: JOB.unit,
      title: `${JOB.title} ${JOB.titleEn}`,
      program: JOB.program,
    },
    overallScore: overall,
    grade: g.grade,
    gradeLabel: g.label,
    chance: g.chance,
    gradeHint: g.hint,
    verdict: buildVerdict(items, g),
    hexagon: hex,
    items,
    transcript: session.turns,
  };

  ensureDirs();
  fs.writeFileSync(path.join(REPORTS_DIR, `${report.id}.json`), JSON.stringify(report, null, 2), "utf8");
  return report;
}

export function rebuildSavedReport(data) {
  const session = {
    id: data.id,
    startedAt: data.startedAt,
    turns: data.transcript || [],
  };
  const pairs = listQaPairs(session);
  const items = localItems(pairs);
  const overall = items.length
    ? Math.round((items.reduce((s, it) => s + it.score, 0) / items.length) * 10) / 10
    : 1;
  const hex = hexagonFromItems(items, pairs);
  const g = gradeFromScore(overall);
  return {
    ...data,
    overallScore: overall,
    grade: g.grade,
    gradeLabel: g.label,
    chance: g.chance,
    gradeHint: g.hint,
    verdict: buildVerdict(items, g),
    hexagon: hex,
    items,
  };
}

export function listReports() {
  ensureDirs();
  const files = fs.readdirSync(REPORTS_DIR).filter((f) => f.endsWith(".json"));
  const rows = files.map((f) => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, f), "utf8"));
      return {
        id: data.id,
        at: data.at,
        grade: data.grade,
        overallScore: data.overallScore,
        gradeLabel: data.gradeLabel,
        durationSec: data.durationSec,
        title: data.job?.title || "模擬面試",
      };
    } catch {
      return null;
    }
  });
  return rows.filter(Boolean).sort((a, b) => b.at - a.at);
}

export function loadReport(id) {
  const file = path.join(REPORTS_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function deleteReport(id) {
  const file = path.join(REPORTS_DIR, `${id}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

export function rebuildAllSavedReports() {
  ensureDirs();
  const files = fs.readdirSync(REPORTS_DIR).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    const full = path.join(REPORTS_DIR, f);
    try {
      const data = JSON.parse(fs.readFileSync(full, "utf8"));
      if (!Array.isArray(data.transcript)) continue;
      const next = rebuildSavedReport(data);
      fs.writeFileSync(full, JSON.stringify(next, null, 2), "utf8");
    } catch {
      /* skip */
    }
  }
}
