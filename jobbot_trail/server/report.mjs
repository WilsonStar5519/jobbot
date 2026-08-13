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
  blendScore,
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
      heuristicScore: score,
      scoreSource: "heuristic",
      comment: buildComment(item, score),
      optimizedAnswer: buildOptimized(item),
    };
  });
}

/**
 * 用本機語言模型對每一題做語意評分同回饋，取代純關鍵字比對。
 * 為防止模型評分唔穩定或者離題，最終分數會用 score.mjs 嘅 blendScore 同
 * heuristic 分數混合（LLM 判斷為主、heuristic 做穩定錨點），而唔係直接照單全收。
 * 若模型未就緒／逾時／回覆格式錯誤，會自動 fallback 返純 heuristic 評分，
 * 確保離線或者 GPU 未載入時都可以出報告。
 */
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
          content:
            "你係資深社工面試評審。只輸出 JSON。必須逐題對應輸入嘅 question/answer，唔可以改寫、調亂或發明題目。" +
            "評分規則（0-10，可有一位小數）：完全離題或者未能理解問題＝1-2；答非所問或內容空泛＝3-4；" +
            "有回應但缺乏具體例子／專業程序＝5-6；扣題、有具體做法或者例子＝7-8；" +
            "扣題、有具體例子、程序清晰同有可觀察結果＝9-10。評分只反映呢一題本身嘅內容質素。",
        },
        {
          role: "user",
          content: `為以下每一題評分（score）、寫 comment（兩句，針對呢條題嘅具體回饋）同 optimizedAnswer（粵語口語，保留應徵者原意，直接答呢條題）。
輸入：
${JSON.stringify(payload)}
輸出：
{"items":[{"i":0,"score":0,"comment":"","optimizedAnswer":""}]}`,
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
      const { score, source } = blendScore(it.heuristicScore, hit.score);
      return {
        ...it,
        score,
        scoreSource: source,
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
      score: it.score,
      scoreSource: it.scoreSource || "heuristic",
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

/**
 * 舊版本喺呢度會用 localItems() 完全重新產生 items，結果每次重啟伺服器都會用
 * 純 heuristic 覆蓋返已經存檔嘅 LLM 評語／優化答案／混合分數，令已完成嘅報告
 * 內容隨時間「退化」。而家改為：分類／六角圖／評級呢啲會隨演算法更新重新計算，
 * 但保留返原本已經生成嘅 comment、optimizedAnswer 同（若有）LLM 混合分數。
 */
export function rebuildSavedReport(data) {
  const session = {
    id: data.id,
    startedAt: data.startedAt,
    turns: data.transcript || [],
  };
  const pairs = listQaPairs(session);
  const previous = Array.isArray(data.items) ? data.items : [];
  const items = pairs.map((p, i) => {
    const category = inferCategory(p);
    const heuristicScore = scoreAnswer(p.question, p.answer);
    const prev = previous[i];
    const keepLlmScore = prev?.scoreSource === "llm+heuristic" && Number.isFinite(Number(prev.score));
    const item = { ...p, category };
    return {
      question: p.question,
      answer: p.answer,
      category,
      score: keepLlmScore ? Number(prev.score) : heuristicScore,
      scoreSource: keepLlmScore ? "llm+heuristic" : "heuristic",
      comment: prev?.comment || buildComment(item, heuristicScore),
      optimizedAnswer: prev?.optimizedAnswer || buildOptimized(item),
    };
  });
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
