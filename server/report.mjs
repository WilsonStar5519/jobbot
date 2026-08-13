import fs from "fs";
import path from "path";
import { HEX_AXES, REPORTS_DIR, ensureDirs } from "./config.mjs";
import { JOB } from "./job.mjs";
import { chat } from "./llm.mjs";
import { listQaPairs } from "./interview.mjs";

const GRADE_TABLE = [
  { grade: "SS", min: 9.3, label: "極高成功機率", chance: "約 90% 以上", hint: "表達完整、專業判斷穩、例子有結果，接近可錄取水平。" },
  { grade: "S", min: 8.5, label: "高成功機率", chance: "約 75–90%", hint: "整體到位，只需再打磨一兩個弱項。" },
  { grade: "A", min: 7.5, label: "中高成功機率", chance: "約 55–75%", hint: "框架正確，例子同程序再具體就會更穩。" },
  { grade: "B", min: 6.5, label: "中等成功機率", chance: "約 35–55%", hint: "有基本方向，但職責對位或危機程序仍不足。" },
  { grade: "C", min: 5.0, label: "偏低成功機率", chance: "約 15–35%", hint: "內容偏泛，需要用課託場景同步驟重練。" },
  { grade: "D", min: 0, label: "低成功機率", chance: "約 15% 以下", hint: "尚未對準本職位要求，建議先對照職責再完整模擬。" },
];

export function gradeFromScore(score) {
  const s = Number(score) || 0;
  return GRADE_TABLE.find((g) => s >= g.min) || GRADE_TABLE[GRADE_TABLE.length - 1];
}

const KEYWORDS = {
  職位理解: ["關愛基金", "課後", "託管", "家長", "外出工作", "單親", "學習支援", "計劃主任", "職責", "個案", "導師", "假期", "行政"],
  個案與家庭工作: ["個案", "家長", "學童", "家庭", "SEN", "情緒", "輔導", "需要評估", "跟進", "STAR", "例子"],
  營運與導師管理: ["導師", "管理", "質素", "遲到", "課堂", "人手", "安全比例", "假期", "行政", "點名", "培訓"],
  危機與保護兒童: ["安全", "保護", "通報", "督導", "紀錄", "保密", "虐兒", "自傷", "安撫", "分隔", "程序"],
  協作與溝通: ["學校", "班主任", "社工", "協調", "轉介", "會議", "溝通", "界線", "團隊"],
  個人特質與抗壓: ["輪班", "週末", "假期", "抗壓", "時間管理", "優先", "自我照顧", "界線", "投入"],
};

function hitScore(text, keys) {
  const n = text.toLowerCase().replace(/\s+/g, "");
  const hits = keys.filter((k) => n.includes(k.toLowerCase().replace(/\s+/g, "")));
  const ratio = hits.length / keys.length;
  const lenBonus = Math.min(2.2, text.length / 140);
  let score = ratio * 12 + lenBonus;
  if (hits.length === 0) score = Math.min(score, 3.2);
  if (/(首先|接著|然後|之後|例如|當時|結果)/.test(text)) score += 0.4;
  if (/(絕對保密|一定唔講|不會告訴任何人)/.test(text)) score -= 1.4;
  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

function fallbackHex(pairs) {
  const hex = {};
  for (const axis of HEX_AXES) {
    const related = pairs.filter((p) => p.category === axis || (KEYWORDS[axis] && KEYWORDS[axis].some((k) => (p.answer || "").includes(k))));
    const corpus = (related.length ? related : pairs).map((p) => p.answer).join("\n");
    hex[axis] = hitScore(corpus, KEYWORDS[axis] || []);
  }
  return hex;
}

function fallbackItems(pairs) {
  return pairs.map((p) => ({
    question: p.question,
    answer: p.answer,
    category: p.category,
    score: hitScore(p.answer, KEYWORDS[p.category] || KEYWORDS["職位理解"]),
    comment: p.answer.length < 80 ? "答案偏短，建議補上具體步驟同結果。" : "已有作答基礎，請對照優化版把程序同例子講完整。",
    optimizedAnswer: buildFallbackOptimized(p),
  }));
}

function buildFallbackOptimized(pair) {
  const cat = pair.category || "";
  const keep = pair.answer.replace(/\s+/g, " ").trim().slice(0, 80);
  const core =
    cat.includes("危機")
      ? "我會按「即時安全 → 專業介入同分工 → 通報、紀錄、督導同預防」處理，唔會承諾絕對保密。"
      : cat.includes("營運")
        ? "我會先核實事實，再澄清期望、提供支援，並訂改善期限；同時守住安全比例同向家長、督導交代。"
        : cat.includes("職位")
          ? "關愛基金在校課後託管係為有需要小學生提供安全課後支援，並讓家長可外出工作。計劃主任要同時處理個案／活動、導師現場管理、假期託管同行政，並同學校協調。"
          : cat.includes("個案")
            ? "我會用一個具體STAR例子，說明評估需要、行動、同可觀察結果，並講點樣遷移到課託嘅家長同學童工作。"
            : "我理解並接受週末同公眾假期輪班。實務上會用優先排序同時間區塊同時處理個案、導師同行政，並做好自我照顧。";
  return `先整理我原本提到嘅重點：${keep}${keep.endsWith("。") ? "" : "。"}\n\n${core}\n\n整個答法會扣連${JOB.program}，以兒童最佳利益為先，並確保同${JOB.unit}、學校及家長協作一致。`;
}

function reportPrompt(session) {
  const pairs = listQaPairs(session);
  const transcript = session.turns
    .map((t) => `${t.role === "interviewer" ? "面試官" : "應徵者"}：${t.text}`)
    .join("\n");
  return `你係嚴謹嘅社工面試評審，評核「${JOB.org} ${JOB.title}（${JOB.titleEn}）」模擬面試。
評分要針對職位：${JOB.program}；職責包括個案／活動、導師現場管理、假期託管、行政；要求註冊社工、課託／小學全方位經驗優先、週末及假期或需輪班。

【評分尺度 0–10】
9.3+ 接近可錄取；8.5+ 明顯優勢；7.5+ 達標偏上；6.5 邊緣；5 未達標；低於5 明顯離題。
空泛熱誠、無例子、危機無程序、承諾絕對保密、迴避輪班，必須扣分。

【六角圖維度】必須全部給分：${HEX_AXES.join("、")}

【逐題】為每一對「面試官問題／應徵者回答」提供：
- score（0–10）
- comment（2–3句，粵語或繁中皆可，具體指出缺咗咩）
- optimizedAnswer：保留應徵者原意同真實經驗，改寫成可直接口述2–3分鐘嘅完整優化答案（粵語口語，專業場合），補齊缺口。

只輸出 JSON：
{
  "overallScore": 7.4,
  "verdict": "總評（4–6句）",
  "hexagon": { ${HEX_AXES.map((k) => `"${k}": 7`).join(", ")} },
  "items": [
    { "question": "", "answer": "", "category": "", "score": 7.0, "comment": "", "optimizedAnswer": "" }
  ]
}

對話：
${transcript}

結構化問答（請逐項對應）：
${JSON.stringify(pairs, null, 2)}`;
}

export async function buildReport(session) {
  const pairs = listQaPairs(session);
  let parsed = null;
  try {
    const { json } = await chat({
      messages: [
        { role: "system", content: "你只輸出合法 JSON，唔好加解說。" },
        { role: "user", content: reportPrompt(session) },
      ],
      temperature: 0.25,
      maxTokens: 2200,
      json: true,
    });
    parsed = json;
  } catch {
    parsed = null;
  }

  const hexFallback = fallbackHex(pairs);
  const itemFallback = fallbackItems(pairs);
  const hex = { ...hexFallback, ...(parsed?.hexagon || {}) };
  for (const axis of HEX_AXES) {
    const n = Number(hex[axis]);
    hex[axis] = Number.isFinite(n) ? Math.max(1, Math.min(10, Math.round(n * 10) / 10)) : hexFallback[axis];
  }

  let items = Array.isArray(parsed?.items) && parsed.items.length ? parsed.items : itemFallback;
  items = items.map((it, i) => {
    const pair = pairs[i] || {};
    return {
      question: it.question || pair.question || "",
      answer: it.answer || pair.answer || "",
      category: it.category || pair.category || "",
      score: Math.max(1, Math.min(10, Number(it.score) || pair.score || 5)),
      comment: it.comment || itemFallback[i]?.comment || "",
      optimizedAnswer: it.optimizedAnswer || itemFallback[i]?.optimizedAnswer || "",
    };
  });

  const avgFromItems = items.length
    ? items.reduce((s, it) => s + Number(it.score), 0) / items.length
    : 5;
  const avgFromHex = HEX_AXES.reduce((s, k) => s + hex[k], 0) / HEX_AXES.length;
  let overall = Number(parsed?.overallScore);
  if (!Number.isFinite(overall)) overall = (avgFromItems + avgFromHex) / 2;
  overall = Math.max(1, Math.min(10, Math.round(overall * 10) / 10));
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
    verdict: parsed?.verdict || `整體${g.label}。強項同缺口請見六角圖同逐題回饋。`,
    hexagon: hex,
    items,
    transcript: session.turns,
  };

  ensureDirs();
  const file = path.join(REPORTS_DIR, `${report.id}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2), "utf8");
  return report;
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
