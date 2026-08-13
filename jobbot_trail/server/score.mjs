import { HEX_AXES } from "./config.mjs";
import { JOB } from "./job.mjs";

const JOB_TERMS = [
  "關愛基金", "課後", "託管", "課託", "計劃主任", "社工", "註冊",
  "家長", "學童", "小朋友", "兒童", "青少年", "家庭", "低收入", "單親", "雙職",
  "導師", "老師", "管理", "課堂", "活動", "個案", "行政", "假期", "輪班", "週末",
  "學校", "班主任", "協作", "溝通", "轉介", "督導", "上司", "會報", "匯報", "通報",
  "安全", "保護", "保密", "傷痕", "瘀傷", "情緒", "SEN", "功課", "跟進", "紀錄",
  "深水埗", "葵青", "幼稚園", "中學", "小學", "管教", "照顧", "援助", "資源",
];

const STRUCTURE = /首先|跟住|然後|之後|例如|試過|當時|結果|所以|接著|最後|具體/;

export function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[陳姑娘：:，。！？、,.!?\s「」""']/g, "")
    .replace(/可唔可以|請問|咁|呢|啦|嘅|吓|呀/g, "");
}

const ANGLE_CLUSTERS = [
  [/介紹自己|自我介紹|點解.*申請|申請.*主任|點解想/, "intro"],
  [/關愛基金|計劃目標|服務目標|想達到|託管.*目標|目標.*託管/, "goal"],
  [/職責|日常.*做|核心要做|主任.*工作/, "duties"],
  [/經驗|例子|個案|試過|曾經/, "experience"],
  [/低收入|單親|雙職/, "lowincome"],
  [/導師|遲到|沉悶|課堂.*管理/, "tutor"],
  [/人手|調配|假期託管|名額/, "staffing"],
  [/學校.*協作|班主任|同學校/, "school"],
  [/衝出|課室|情緒失控/, "runout"],
  [/瘀傷|傷痕|保密|唔好話/, "bruise"],
  [/欺凌/, "bully"],
  [/自傷/, "selfharm"],
  [/無人接|放學.*接/, "pickup"],
  [/輪班|週末|公眾假期/, "shift"],
  [/想問我|有冇嘢想問/, "askus"],
];

function clustersOf(text) {
  const t = String(text || "");
  return new Set(ANGLE_CLUSTERS.filter(([re]) => re.test(t)).map(([, id]) => id));
}

function ngramScore(a, b, n) {
  const ga = new Set();
  const gb = new Set();
  for (let i = 0; i <= a.length - n; i++) ga.add(a.slice(i, i + n));
  for (let i = 0; i <= b.length - n; i++) gb.add(b.slice(i, i + n));
  if (!ga.size || !gb.size) return 0;
  let hit = 0;
  for (const g of ga) if (gb.has(g)) hit += 1;
  return hit / Math.min(ga.size, gb.size);
}

export function questionOverlap(a, b) {
  const rawA = String(a || "");
  const rawB = String(b || "");
  const na = normalizeText(rawA);
  const nb = normalizeText(rawB);
  if (!na || !nb) return 0;
  if (na.includes(nb) || nb.includes(na)) return 1;

  const gram = Math.max(ngramScore(na, nb, 2), ngramScore(na, nb, 3));
  const shared = [...clustersOf(rawA)].filter((id) => clustersOf(rawB).has(id));
  const cluster = shared.length ? 0.88 : 0;

  const ta = new Set(JOB_TERMS.filter((k) => rawA.includes(k)));
  const tb = new Set(JOB_TERMS.filter((k) => rawB.includes(k)));
  let term = 0;
  if (ta.size && tb.size) {
    let hit = 0;
    for (const k of ta) if (tb.has(k)) hit += 1;
    const union = new Set([...ta, ...tb]).size;
    term = hit / union >= 0.7 && hit >= 3 ? 0.7 : 0;
  }

  return Math.max(gram, cluster, term);
}

export function isNonsense(text) {
  const raw = String(text || "").trim();
  const t = raw.replace(/\s+/g, "");
  if (t.length < 8) return true;
  if (/^(結束|我要結束|結束面試)$/.test(t)) return true;
  const cjk = (t.match(/[\u4e00-\u9fff]/g) || []).length;
  if (cjk / t.length < 0.35) return true;
  const uniq = new Set([...t]).size;
  if (t.length >= 8 && uniq <= 4) return true;
  if (uniq / t.length < 0.18) return true;
  if (/^(.{1,4})\1{2,}$/.test(t)) return true;
  const jobHits = JOB_TERMS.filter((k) => t.includes(k)).length;
  if (t.length < 24 && jobHits === 0) return true;
  return false;
}

export function isThinAnswer(text) {
  const t = String(text || "").trim();
  if (isNonsense(t)) return true;
  if (t.length < 48) return true;
  const jobHits = JOB_TERMS.filter((k) => t.includes(k)).length;
  return jobHits < 2 && t.length < 90;
}

export function termHits(text) {
  const t = String(text || "");
  return JOB_TERMS.filter((k) => t.includes(k));
}

function addressesQuestion(question, answer) {
  const q = question || "";
  const a = answer || "";
  const checks = [
    [/輪班|週末|公眾假期/, /輪班|週末|假期|接受|可以|得|冇/],
    [/衝出|課室|情緒失控/, /安全|冷靜|導師|跟進|家長|上司|會報|匯報|看管/],
    [/欺凌|自傷|無人接|放學/, /安全|家長|學校|督導|跟進|紀錄|會報|匯報|保護/],
    [/瘀傷|保密|唔好話/, /保密|督導|通報|紀錄|安全|例外|會報|匯報/],
    [/導師|遲到|沉悶/, /導師|老師|期望|支援|檢討|跟進|supervise|協作/i],
    [/人手|調配|假期託管/, /人手|調配|優先|安全|名額|招募/],
    [/目標|關愛基金/, /家長|小朋友|學童|家庭|功課|工作|安全|託管|課託|低收入|單親|雙職/],
    [/職責|核心要做|日常最核心/, /個案|導師|假期|行政|活動|學校/],
    [/介紹吓你自己|點解想申請|申請呢個/, /社工|經驗|申請|希望|職位|計劃|小朋友|家庭/],
    [/最相關嘅經驗|具體嘅例子|發揮你邊方面/, /試過|曾經|個案|活動|學校|家長|小朋友|支援/],
    [/想問我哋/, /想|請問|學校|督導|分工|支援/],
  ];
  for (const [qRe, aRe] of checks) {
    if (qRe.test(q)) return aRe.test(a);
  }
  return termHits(a).length >= 3;
}

export function inferCategory(pair) {
  const q = pair.question || "";
  if (/輪班|週末|公眾假期/.test(q)) return "個人特質與抗壓";
  if (/衝出|課室|瘀傷|保密|危機|欺凌|自傷|無人接|保護兒童/.test(q)) return "危機與保護兒童";
  if (/導師|遲到|人手|調配|行政|假期/.test(q)) return "營運與導師管理";
  if (/目標|關愛基金|職責|核心/.test(q)) return "職位理解";
  if (/經驗|例子|家庭|小朋友/.test(q) && !/介紹吓你自己|點解想申請/.test(q)) return "個案與家庭工作";
  if (/介紹|申請/.test(q)) return "個人特質與抗壓";
  if (/想問/.test(q) || /學校.*協作|溝通/.test(q)) return "協作與溝通";
  const first = String(pair.category || "").split("|")[0].trim();
  return first || "職位理解";
}

export function scoreAnswer(question, answer) {
  const raw = String(answer || "").trim();
  if (!raw) return 1;
  if (isNonsense(raw)) return 1.2;

  let score = 3.0;
  if (raw.length >= 80) score += 0.5;
  if (raw.length >= 160) score += 0.5;
  if (raw.length >= 280) score += 0.4;

  const hits = termHits(raw);
  score += Math.min(1.8, hits.length * 0.16);

  if (STRUCTURE.test(raw)) score += 0.5;
  const onTopic = addressesQuestion(question, raw);
  if (onTopic) score += 1.2;
  else score -= 1.6;

  if (/(絕對保密|一定唔講|唔會話畀任何人)/.test(raw)) score -= 1.6;
  if (/我冇/.test(raw) && raw.length < 80) {
    score = onTopic ? Math.min(Math.max(score, 3.5), 4.8) : Math.min(score, 2.5);
  }

  if (!onTopic && hits.length <= 1) score = Math.min(score, 2.4);

  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

/**
 * 混合評分：以關鍵字／結構化 heuristic 分數做穩定錨點，容許 LLM 語意評分喺 ±band 分內
 * 修正（例如：內容扣題但無用到預設關鍵字、或者用同義詞表達）。
 * 呢個設計避免單靠關鍵字比對造成「靠堆砌字眼呃分」，亦避免 LLM 偶然評分離譜時大幅失真。
 */
export function clampToBand(llmScore, heuristicScore, band = 3) {
  const llm = Number(llmScore);
  const base = Number(heuristicScore);
  if (!Number.isFinite(llm) || !Number.isFinite(base)) return null;
  const lo = Math.max(1, base - band);
  const hi = Math.min(10, base + band);
  return Math.max(lo, Math.min(hi, llm));
}

export function blendScore(heuristicScore, llmScore, llmWeight = 0.7) {
  const clamped = clampToBand(llmScore, heuristicScore);
  if (clamped == null) return { score: heuristicScore, source: "heuristic" };
  const blended = clamped * llmWeight + Number(heuristicScore) * (1 - llmWeight);
  return { score: Math.max(1, Math.min(10, Math.round(blended * 10) / 10)), source: "llm+heuristic" };
}

export function hexagonFromItems(items, pairs) {
  const hex = {};
  const avg = items.length
    ? items.reduce((s, it) => s + Number(it.score), 0) / items.length
    : 1.5;
  const corpus = (pairs || []).map((p) => p.answer).join("\n");
  const broken = isNonsense(corpus) || !String(corpus).trim();
  for (const axis of HEX_AXES) {
    const related = items.filter((it) => it.category === axis);
    if (related.length) {
      hex[axis] = Math.round((related.reduce((s, it) => s + Number(it.score), 0) / related.length) * 10) / 10;
    } else {
      hex[axis] = broken ? 1.5 : Math.round(avg * 0.85 * 10) / 10;
    }
  }
  return hex;
}

export function buildComment(pair, score) {
  const q = pair.question || "";
  const a = pair.answer || "";
  if (isNonsense(a)) return "呢條未能回應題目，內容無法評估專業能力。";
  if (a.length < 40) return "答案太短，未有講到具體做法。";
  if (score >= 8) return "有回應題目，亦有實際經驗。再補一個可觀察結果會更完整。";
  if (!addressesQuestion(q, a)) return "內容同呢條題目關聯不足，建議直接答問題核心。";
  if (/衝出|危機|瘀傷|保密/.test(q) && !/(安全|通報|督導|紀錄|會報|匯報)/.test(a)) {
    return "有處理意識，但專業程序（安全、紀錄、向上司／家長交代）仲可以再清楚。";
  }
  if (/導師/.test(q) && !/(期望|支援|檢討|跟進)/.test(a)) {
    return "有提到管理，建議補：核實情況、講清期望、支援同問責。";
  }
  if (/目標/.test(q) && !/(家長|外出|功課|學童|小朋友)/.test(a)) {
    return "可以再扣連計劃目標：學童課後支援，同埋家長可以外出工作。";
  }
  if (score >= 6) return "大致扣題，再加一個具體步驟或者結果會更有說服力。";
  return "有作答，但例子、步驟或者同職位職責嘅連結仍不足。";
}

export function buildOptimized(pair) {
  const q = pair.question || "";
  const keep = String(pair.answer || "").replace(/\s+/g, " ").trim().slice(0, 70);
  const kept = keep ? `我會保留自己嘅經驗：${keep}${/[。！？]$/.test(keep) ? "" : "。"}` : "";
  let core;
  if (/衝出|課室|情緒失控/.test(q)) {
    core = "我會先確保安全，安排導師看管其他小朋友，自己跟進情緒波動嗰位。等佢冷靜後了解觸發因素，事後會報上司、通知學校同家長，並做紀錄同預防。";
  } else if (/瘀傷|保密/.test(q)) {
    core = "我唔會承諾絕對保密。會關懷咁了解、客觀紀錄，即時向督導匯報，按保護兒童程序處理，並同學校協作。";
  } else if (/導師|遲到/.test(q)) {
    core = "我會先核實遲到同課堂情況，再同導師面談講清期望，提供課堂支援，訂改善期限；仍無改善就按程序處理，因為要保障服務質素。";
  } else if (/人手|調配/.test(q)) {
    core = "我會以安全同人手比例做底線，按家庭需要訂優先，調動人手或者合併小組，及早同家長講清楚名額準則，並向督導匯報。";
  } else if (/目標/.test(q)) {
    core = `${JOB.program}係讓有需要小學生喺熟悉校園接受課後託管同功課支援，並讓家長（尤其單親或雙職）可以外出工作。`;
  } else if (/職責|核心要做/.test(q)) {
    core = "計劃主任要同時處理學童同家長個案／活動、導師現場管理、假期託管，同埋行政，並同學校協調。";
  } else if (/輪班|週末/.test(q)) {
    core = "我理解課託要配合家長工時，接受週末同假期輪班。實務上會用優先排序同時處理個案、導師同行政，亦會自我照顧。";
  } else if (/想問/.test(q)) {
    core = "我想了解單位點樣同學校分工，以及新同事首階段嘅督導同入職支援。";
  } else if (/經驗|例子|相關/.test(q)) {
    core = "我會用一件具體經驗說明：當時情況、我做過咩、結果點，再講點樣遷移到課託嘅個案、家長工作或者現場管理。";
  } else {
    core = "我會簡短介紹社工背景，說明點解申請呢個課託計劃主任，並扣連兒童、家庭同學校工作經驗。";
  }
  return [kept, core, `成段會扣連${JOB.program}，以兒童最佳利益為先。`].filter(Boolean).join("\n\n");
}
