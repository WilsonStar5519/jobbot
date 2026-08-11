/* 香港遊樂場協會 · 計劃主任 ASWO 模擬面試（優化版） */

const STORAGE = {
  history: "hkpa_interview_history_v1",
  usedIds: "hkpa_used_question_ids_v1",
  memo: "hkpa_personal_memo_v1",
  weakCats: "hkpa_weak_categories_v1",
};

const JOB = {
  org: "香港遊樂場協會",
  unit: "賽馬會上葵涌青少年綜合服務（KIT）",
  title: "計劃主任 ASWO",
  program: "關愛基金—在校課後託管服務計劃",
  location: "葵青區",
};

const SESSION_SIZE = 8;
const MIN_UNUSED = 6;

const CATEGORY_DEFAULTS = {
  機構背景: {
    keywords: {
      機構認識: ["遊樂場協會", "1933", "以人為本", "追求卓越", "全人發展", "德智體群美", "青少年", "非政府"],
      價值契合: ["使命", "認同", "成長", "弱勢", "關懷", "專業", "兒童", "貢獻"],
      求職動機: ["加入", "選擇", "KIT", "葵涌", "課託", "計劃主任", "匹配", "發展"],
    },
    missing: {
      機構認識: "可補充遊協創會背景與「以人為本、追求卓越／全人發展」。",
      價值契合: "把機構價值連到你的個人信念。",
      求職動機: "具體說明為何選 KIT／課託，而非泛談想做社工。",
    },
    tips: ["先機構→再單位→最後個人動機"],
  },
  職位要求: {
    keywords: {
      計劃理解: ["關愛基金", "課後", "託管", "小學生", "家長", "外出工作", "單親", "學習支援"],
      職責掌握: ["個案", "活動", "導師", "管理", "假期", "行政", "學校", "協調"],
      角色定位: ["計劃主任", "統籌", "質素", "團隊", "專業"],
    },
    missing: {
      計劃理解: "點出計劃支援有需要學童課後託管，並讓家長可外出工作。",
      職責掌握: "對應：個案／活動、導師管理、假期託管、行政。",
      角色定位: "強調統籌質素與學校／團隊協作。",
    },
    tips: ["目標→服務內容→主任角色"],
  },
  危機處理: {
    keywords: {
      安全優先: ["安全", "保護", "隔離", "受傷", "冷靜", "穩定"],
      專業介入: ["安撫", "降溫", "情緒", "評估", "同理", "界限"],
      程序跟進: ["家長", "學校", "報告", "紀錄", "督導", "轉介", "通報"],
      團隊協作: ["導師", "同事", "分工", "指示", "協助"],
    },
    missing: {
      安全優先: "先確保學童與其他人的即時安全。",
      專業介入: "說明如何安撫／評估觸發因素。",
      程序跟進: "補上通知家長／學校、紀錄與督導匯報。",
      團隊協作: "交代導師分工。",
    },
    tips: ["即時安全→介入→跟進預防"],
  },
  個人特質: {
    keywords: {
      抗壓與節奏: ["輪班", "週末", "假期", "時間管理", "抗壓", "彈性"],
      多工整合: ["行政", "個案", "活動", "優先", "計劃", "系統"],
      服務承諾: ["家庭", "家長", "需要", "投入", "自我照顧", "界線"],
    },
    missing: {
      抗壓與節奏: "正面回應輪班／假期工作要求。",
      多工整合: "舉例說明如何同時處理個案、營運與文書。",
      服務承諾: "連結家庭友善課託的服務意義。",
    },
    tips: ["先回應硬性要求→方法→價值"],
  },
};

/** 固定題庫（核心＋擴充） */
const BASE_QUESTIONS = [
  q("org-1", "機構背景", "請簡介你對香港遊樂場協會的認識。為什麼想加入本會，而不是其他青少年服務機構？",
    "可談創會歷史、服務使命、全人發展，以及與本職位的連結。",
    "提到遊協歷史與使命，再連結 KIT／課託與個人志向。"),
  q("org-2", "機構背景", "遊協強調青少年「德、智、體、群、美」全人發展。你認為課後託管計劃如何體現這個使命？",
    "把全人發展拆解到功課、社交、情緒、家庭支援等具體服務。",
    "說明課託不止看管，更透過學習支援、小組活動與家長工作促進全人成長。"),
  q("org-3", "機構背景", "KIT 位於葵青區，服務對象多為區內兒童及家庭。你對區內需要有什麼觀察？如何融入單位文化？",
    "可談地區特性、弱勢家庭、學校網絡，以及入職後如何學習單位做法。",
    "先談地區需要，再談謙虛學習、與同事／學校建立合作。"),
  q("org-4", "機構背景", "如果面試官問：你為何不是申請學校社工，而是課託計劃主任？你會怎樣答？",
    "比較兩者角色，突出課託的營運、導師管理與家庭友善目標。",
    "肯定兩者都重要，但說明你更想結合個案與在校營運／家庭充權。"),

  q("role-1", "職位要求", "你如何理解「關愛基金—在校課後託管服務計劃」的服務目標？計劃主任的核心職責是什麼？",
    "從服務對象、家庭需要、學校合作、個案與營運管理回答。",
    "說明支援學童課後需要與家長就業；主任負責個案、導師、假期與行政。"),
  q("role-2", "職位要求", "招聘優先考慮課託或小學全方位社工經驗。請分享最相關經驗，並說明如何遷移到本職位。",
    "用 STAR，不要只列職銜。",
    "一個完整例子＋可遷移到課託營運／個案／導師管理的技能。"),
  q("role-3", "職位要求", "你會如何設計一個學期的課託活動計劃，平衡功課輔導、社交發展與親子元素？",
    "談需要評估、時間表、資源與評估指標。",
    "先評估需要→編排常規與主題活動→加入家長工作→用回饋檢討。"),
  q("role-4", "職位要求", "如何與小學班主任／學校社工建立有效協作，避免角色重疊又確保個案得以跟進？",
    "談溝通機制、個案會議、界線與轉介。",
    "訂定期聯繫、釐清職責、共同訂目標，並有書面紀錄。"),
  q("role-5", "職位要求", "若你發現兼職導師經常遲到、課堂沉悶，你會如何管理與支援？",
    "兼顧觀察回饋、培訓與問責。",
    "核實→期望→支援→改善期限→必要時按程序調整人手。"),
  q("role-6", "職位要求", "假期託管名額需求突然增加，但人手不足。你會如何調配資源並向家長交代？",
    "優先次序、安全比例、溝通與替代方案。",
    "按需要分流、調動／招募人手、清晰告知名額與準則，確保安全比例。"),

  q("crisis-1", "危機處理", "課託時段有小三學生情緒失控、推撞同學並試圖衝出課室。你會即時如何處理？之後如何跟進？",
    "安全優先、團隊分工、事後檢討。",
    "安全→安撫→分工→家長／學校→紀錄→預防。"),
  q("crisis-2", "危機處理", "你發現學童手臂有可疑瘀傷，他說「唔好同人講」。你會怎樣處理？",
    "保護兒童、保密例外、通報程序。",
    "不承諾絕對保密→評估紀錄→督導／機構程序→與學校協作。"),
  q("crisis-3", "危機處理", "黑色暴雨導致停課，多名家長要求即日託管。你會如何協調？",
    "應變、場地人手、期望管理。",
    "查機構指引→安全評估→按優先需要安排→清晰通知。"),
  q("crisis-4", "危機處理", "兩名學童在課託互相欺凌，其中一方家長要求你立刻處分對方。你會怎樣回應？",
    "公平查證、修復關係、兒童利益。",
    "先穩定安全→分開了解→中立溝通→修復／後果→記錄並知會學校。"),
  q("crisis-5", "危機處理", "導師向你報告懷疑有學童有自傷念頭。你的即時評估與跟進步驟是什麼？",
    "風險評估、安全計劃、轉介與家長／學校協作。",
    "即時評估風險→確保安全→通知督導／家長／學校→轉介專業支援並跟進。"),
  q("crisis-6", "危機處理", "放學後仍有學童無人接，家長電話不通。你會如何處理至交妥為止？",
    "安全留守、聯絡網絡、紀錄與界線。",
    "留守安撫→多方聯絡→按機構指引升級→詳細紀錄。"),

  q("trait-1", "個人特質", "本職或需週末及公眾假期輪班，並同時處理個案、導師管理與行政。你如何證明適合這節奏？",
    "時間管理、抗壓、自我照顧與服務認同。",
    "正面回應輪班→方法例子→自我照顧→服務價值。"),
  q("trait-2", "個人特質", "請描述一次與家長意見不合的經驗。你如何維持專業關係並守住兒童最佳利益？",
    "同理、界線、以兒童為中心。",
    "同理→重申兒童需要→協商→必要時引入督導。"),
  q("trait-3", "個人特質", "你在高壓工作中如何照顧自己的情緒，避免耗竭並保持對服務對象的同理？",
    "自我覺察、督導、朋輩支援、界線。",
    "談具體策略與何時求助督導，而非只說「抗壓力高」。"),
  q("trait-4", "個人特質", "如果錄取你，首三個月你會如何熟悉學校、建立家長信任並掌握課託營運？",
    "30/60/90 日思維。",
    "熟悉流程→建立關係→優化營運與檢討。"),
  q("trait-5", "個人特質", "分享一次你主動改善服務或流程的經驗，結果如何？",
    "主動性、觀察需要、推動改變與評估。",
    "用 STAR 展示你看見問題、推動改善與可量度結果。"),
];

/** 自動補題模板：當題庫不足或針對弱項時產生新題 */
const GENERATOR_TEMPLATES = {
  機構背景: [
    {
      stem: "遊協服務涵蓋綜合青少年服務、外展、學校社工等。你認為課託計劃主任的工作，如何與機構整體青少年服務銜接？",
      hint: "談轉介、延續支援、單位協作。",
      model: "說明課託是入門支援點，可與中心服務、家庭支援銜接，體現機構一條龍關懷。",
    },
    {
      stem: "如果同事問你「遊協同其他NGO有什麼分別」，你會用什麼重點介紹本會？",
      hint: "歷史、使命、服務多元，避免貶低其他機構。",
      model: "強調悠久歷史、全人發展與以人為本，並連結你對課託職位的匹配。",
    },
    {
      stem: "請用一分鐘「電梯簡報」說明：你為什麼適合在遊協做計劃主任。",
      hint: "濃縮動機、經驗、可帶來的貢獻。",
      model: "三句話：認同使命→相關經驗→可為 KIT 課託帶來的具體價值。",
    },
  ],
  職位要求: [
    {
      stem: "如何確保課託服務質素？請提出你會監察的 3 個指標，以及如何收集數據。",
      hint: "出席、安全、學習／滿意度、課堂觀察等。",
      model: "提出可操作指標＋收集方法＋如何用於改善。",
    },
    {
      stem: "有 SEN 學童需要額外支援，但家長擔心標籤而不願透露詳情。你會如何處理？",
      hint: "信任、保密、個別化支援、學校協作。",
      model: "先建信任→解釋支援目的→與學校／家長共同訂個別計劃。",
    },
    {
      stem: "請說明你會如何安排新導師入職導向，使他／她能快速掌握課託日常與危機通報。",
      hint: "手冊、影子跟班、情景演練、考核。",
      model: "標準流程教學＋現場示範＋情景演練＋觀察期回饋。",
    },
    {
      stem: "行政上你需要處理點名、收費／資助資格相關文件與報告。你會如何避免出錯又唔犧牲前線時間？",
      hint: "系統、清單、時間區塊、雙重核對。",
      model: "固定行政時段＋清單／範本＋重要文件雙重核對。",
    },
  ],
  危機處理: [
    {
      stem: "課室發生輕微受傷事故，家長到場情緒激動指責導師。你會如何當場處理？",
      hint: "先照顧傷者、穩定場面、客觀溝通、事後檢討。",
      model: "優先處理傷勢→安撫→客觀說明→承諾跟進調查→紀錄與改善。",
    },
    {
      stem: "你懷疑學童家中有家庭暴力風險，但證據仍不完整。你的評估與行動界線是什麼？",
      hint: "風險評估、督導、保護程序、不擅自承諾。",
      model: "持續評估→詳細紀錄→即時向督導匯報→按保護兒童程序處理。",
    },
    {
      stem: "疫情或傳染病高峰期間，有家長堅持帶發燒學童回課託。你會如何執行健康指引又維持關係？",
      hint: "清晰政策、同理、替代安排。",
      model: "重申健康指引→同理家長困難→提供替代／補課資訊→一致執行。",
    },
  ],
  個人特質: [
    {
      stem: "你如何處理「想幫盡所有家庭」與「資源有限」之間的張力？",
      hint: "優先次序、充權、轉介、自我界線。",
      model: "以需要與風險訂優先→善用轉介網絡→接受界線並自我照顧。",
    },
    {
      stem: "請分享一次你收到負面回饋後的改進。這反映你什麼特質？",
      hint: "開放、反思、具體改變。",
      model: "具體回饋→你的調整→之後的成效，展現可教性。",
    },
    {
      stem: "如果督導暫時不在，你要獨力決定一個涉及家長投訴的處理，你會如何確保判斷穩妥？",
      hint: "機構指引、同儕諮詢、紀錄、事後匯報。",
      model: "依指引→必要時諮詢同事／上級→決定並紀錄→盡快向督導匯報。",
    },
  ],
};

function q(id, category, question, hint, modelAnswer) {
  const def = CATEGORY_DEFAULTS[category];
  const dimensions = Object.entries(def.keywords).map(([name, keywords], i, arr) => ({
    name,
    weight: Math.round((1 / arr.length) * 100) / 100,
    keywords,
  }));
  // normalize weights to 1
  const sum = dimensions.reduce((s, d) => s + d.weight, 0);
  dimensions.forEach((d) => {
    d.weight = d.weight / sum;
  });
  return {
    id,
    category,
    timeHint: category === "危機處理" ? "建議作答 3 分鐘" : "建議作答 2–3 分鐘",
    question,
    hint,
    dimensions,
    missingHints: { ...def.missing },
    modelAnswer,
    structureTips: [...def.tips],
  };
}

function generateQuestion(category, index) {
  const templates = GENERATOR_TEMPLATES[category] || GENERATOR_TEMPLATES["職位要求"];
  const t = templates[index % templates.length];
  const stamp = Date.now().toString(36).slice(-4);
  return q(`gen-${category.slice(0, 2)}-${index}-${stamp}`, category, t.stem, t.hint, t.model);
}

/* ---------- Storage helpers ---------- */
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ---------- Question bank engine ---------- */
function getUsedIds() {
  return new Set(loadJSON(STORAGE.usedIds, []));
}

function markUsed(ids) {
  const used = getUsedIds();
  ids.forEach((id) => used.add(id));
  // keep last 80 to allow eventual recycle
  const arr = [...used];
  saveJSON(STORAGE.usedIds, arr.slice(-80));
}

function getWeakCategories() {
  return loadJSON(STORAGE.weakCats, []);
}

function updateWeakCategories(sessionAnswers) {
  const byCat = {};
  sessionAnswers.forEach((a) => {
    if (!byCat[a.category]) byCat[a.category] = [];
    byCat[a.category].push(a.analysis.score);
  });
  const averages = Object.entries(byCat).map(([cat, scores]) => ({
    cat,
    avg: scores.reduce((s, n) => s + n, 0) / scores.length,
  }));
  averages.sort((a, b) => a.avg - b.avg);
  const weak = averages.filter((x) => x.avg < 7).map((x) => x.cat);
  saveJSON(STORAGE.weakCats, weak.length ? weak : averages.slice(0, 1).map((x) => x.cat));
  return weak;
}

function buildSession({ focusWeak = false } = {}) {
  const used = getUsedIds();
  const weak = getWeakCategories();
  const pool = [...BASE_QUESTIONS];
  let generated = 0;
  const notes = [];

  // Auto-expand if unused core questions are low
  const unusedCore = pool.filter((x) => !used.has(x.id));
  if (unusedCore.length < MIN_UNUSED) {
    const cats = Object.keys(GENERATOR_TEMPLATES);
    cats.forEach((cat, i) => {
      for (let n = 0; n < 2; n++) {
        pool.push(generateQuestion(cat, i * 10 + n + unusedCore.length));
        generated += 1;
      }
    });
    notes.push(`題庫可用題目不足，已自動新增 ${generated} 題變奏題。`);
  }

  // Extra focus questions for weak categories
  if (focusWeak && weak.length) {
    weak.forEach((cat, i) => {
      pool.push(generateQuestion(cat, 100 + i));
      pool.push(generateQuestion(cat, 200 + i));
      generated += 2;
    });
    notes.push(`已按你的弱項（${weak.join("、")}）自動補題。`);
  } else if (weak.length) {
    weak.forEach((cat, i) => {
      pool.push(generateQuestion(cat, 50 + i));
      generated += 1;
    });
  }

  // Prefer unused; if still short, reset usage for recycling
  let candidates = pool.filter((x) => !used.has(x.id));
  if (candidates.length < SESSION_SIZE) {
    notes.push("多數題目已練習過，已自動重開題庫並加入新變奏。");
    saveJSON(STORAGE.usedIds, []);
    // add fresh generated set
    Object.keys(GENERATOR_TEMPLATES).forEach((cat, i) => {
      pool.push(generateQuestion(cat, 300 + i));
      generated += 1;
    });
    candidates = [...pool];
  }

  // Weight weak categories higher when focusWeak
  const categories = ["機構背景", "職位要求", "危機處理", "個人特質"];
  const selected = [];
  const picked = new Set();

  function pickFrom(cat) {
    const list = candidates.filter((x) => x.category === cat && !picked.has(x.id));
    if (!list.length) return null;
    // shuffle-ish
    const item = list[Math.floor(Math.random() * list.length)];
    picked.add(item.id);
    selected.push(item);
    return item;
  }

  if (focusWeak && weak.length) {
    while (selected.length < SESSION_SIZE) {
      const cat = weak[selected.length % weak.length];
      if (!pickFrom(cat)) {
        const fallback = candidates.find((x) => !picked.has(x.id));
        if (!fallback) break;
        picked.add(fallback.id);
        selected.push(fallback);
      }
    }
  } else {
    // balanced: at least 1–2 per category
    categories.forEach((cat) => pickFrom(cat));
    categories.forEach((cat) => {
      if (selected.length < SESSION_SIZE) pickFrom(cat);
    });
    while (selected.length < SESSION_SIZE) {
      const rest = candidates.filter((x) => !picked.has(x.id));
      if (!rest.length) break;
      const item = rest[Math.floor(Math.random() * rest.length)];
      picked.add(item.id);
      selected.push(item);
    }
  }

  return {
    questions: selected.slice(0, SESSION_SIZE),
    generated,
    notes,
    focusWeak,
    poolSize: pool.length,
  };
}

/* ---------- Analysis + personalized rewrite ---------- */
function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, "");
}

function countHits(text, keywords) {
  const n = normalize(text);
  const found = [];
  for (const kw of keywords) {
    if (n.includes(normalize(kw))) found.push(kw);
  }
  return { hits: found.length, found, ratio: keywords.length ? found.length / keywords.length : 0 };
}

function extractSnippet(answer, max = 36) {
  const clean = answer.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max)}…`;
}

function findStrengthQuotes(answer, foundKeywords) {
  const sentences = answer.split(/[。！？!?\n]+/).map((s) => s.trim()).filter(Boolean);
  const quotes = [];
  for (const s of sentences) {
    if (foundKeywords.some((kw) => normalize(s).includes(normalize(kw)))) {
      quotes.push(s.length > 48 ? `${s.slice(0, 48)}…` : s);
    }
    if (quotes.length >= 2) break;
  }
  return quotes;
}

function buildOptimizedAnswer(question, answer, analysis) {
  const strengths = analysis.strengths;
  const missingDims = analysis.dimensions.filter((d) => d.score < 6);
  const userCore = extractSnippet(answer.replace(/\s+/g, " "), 80);

  const parts = [];
  parts.push(`【保留你的核心表達】${userCore || "（請先寫入你的真實經驗）"}`);

  if (question.category === "機構背景") {
    parts.push("【補強】香港遊樂場協會自1933年服務兒童及青少年，秉持以人為本、追求卓越，推動德智體群美全人發展。");
    parts.push(`【連結你】因此我希望加入${JOB.unit}，把上述理念落實在${JOB.program}。`);
  } else if (question.category === "職位要求") {
    parts.push("【補強】計劃目標是讓有需要小學生在校獲得安全託管與學習支援，並支援家長外出工作。");
    parts.push("【職責】我理解計劃主任需兼顧個案／活動、導師現場管理、假期託管籌辦與行政，並與學校緊密協作。");
  } else if (question.category === "危機處理") {
    parts.push("【步驟化】首先確保安全並穩定場面；接著專業評估／安撫並安排導師分工；之後按機構程序通知家長／學校、寫報告並向督導匯報，最後訂預防措施。");
  } else {
    parts.push("【特質】我會正面回應輪班與多工要求，以優先排序、清單與自我照顧維持服務質素，並守住兒童最佳利益。");
  }

  missingDims.forEach((d) => {
    const hint = question.missingHints[d.name];
    if (hint) parts.push(`【補上「${d.name}」】${hint}`);
  });

  if (strengths.length) {
    parts.push(`【延續你的強項】你已提到：${strengths.slice(0, 2).join("；")}。可再補一個可觀察結果（例如家長回饋、秩序改善、安全事件減少）。`);
  }

  if (question.structureTips?.length) {
    parts.push(`【建議骨架】${question.structureTips.join(" → ")}`);
  }

  return parts.join("\n");
}

function analyzeAnswer(question, answer, historyContext) {
  const trimmed = answer.trim();
  const len = trimmed.length;
  const suggestions = [];
  const strengths = [];
  const dimScores = [];
  let allFound = [];

  if (len < 40) {
    suggestions.push("你的答案偏短。試把現有句子擴成「情境＋你做過什麼＋結果」。");
  }

  let weighted = 0;
  for (const dim of question.dimensions) {
    const { hits, found, ratio } = countHits(trimmed, dim.keywords);
    allFound = allFound.concat(found);
    let score = Math.min(10, ratio * 18 + Math.min(2.5, len / 120));
    if (hits === 0) score = Math.min(score, 2.5);
    if (hits === 1) score = Math.min(score, 4.5);
    if (len < 30) score *= 0.55;
    score = Math.round(score * 10) / 10;
    weighted += score * dim.weight;
    dimScores.push({ name: dim.name, score, hits, found, weight: dim.weight });

    if (score >= 7 && found.length) {
      strengths.push(`「${dim.name}」有觸及（如：${found.slice(0, 3).join("、")}）`);
    }
    if (score < 5.5 && question.missingHints[dim.name]) {
      const quote = extractSnippet(trimmed, 28);
      suggestions.push(
        quote
          ? `你寫到「${quote}」，方向可以，但「${dim.name}」仍不足：${question.missingHints[dim.name]}`
          : question.missingHints[dim.name]
      );
    }
  }

  const quotes = findStrengthQuotes(trimmed, allFound);
  quotes.forEach((qt) => {
    strengths.push(`原文亮點：「${qt}」——可再補結果或與課託職責的連結。`);
  });

  const structureSignals = ["首先", "接著", "然後", "之後", "最後", "第一", "第二"];
  const structureHits = structureSignals.filter((s) => trimmed.includes(s)).length;
  if (structureHits >= 2) {
    weighted = Math.min(10, weighted + 0.4);
    strengths.push("答題有步驟感，條理清晰。");
  } else if (question.category === "危機處理") {
    suggestions.push("危機題建議用「首先／接著／之後」列出安全→介入→跟進。");
  }

  // Personalization from history weaknesses
  if (historyContext?.recurringWeak?.length) {
    const overlap = historyContext.recurringWeak.filter((c) => c === question.category);
    if (overlap.length) {
      suggestions.push(
        `你過去在「${question.category}」分數較低，今次請特別補上：${(question.structureTips || []).join("；")}`
      );
    }
  }

  // If answer is generic
  const generic = ["我有熱誠", "我喜歡小朋友", "我抗壓力高", "我善於溝通"];
  if (generic.some((g) => trimmed.includes(g)) && len < 120) {
    suggestions.push("避免空泛自我評價；改為用一個具體課託／學校例子證明該特質。");
  }

  if (trimmed.includes("絕對保密") || trimmed.includes("一定唔講") || trimmed.includes("不會告訴任何人")) {
    suggestions.push("注意：涉及保護兒童時，不應承諾絕對保密，應說明保密例外與通報責任。");
  }

  const uniqSuggest = [...new Set(suggestions)].slice(0, 6);
  if (!uniqSuggest.length) {
    uniqSuggest.push("整體貼題。可再加一個可量度結果，讓面試官記住你的貢獻。");
  }
  const uniqStrength = [...new Set(strengths)].slice(0, 4);
  if (!uniqStrength.length) {
    uniqStrength.push("已開始作答——先肯定你的意願；下一步是把內容扣連職位關鍵詞與具體行動。");
  }

  const total = Math.max(1, Math.min(10, Math.round(weighted * 10) / 10));
  const label =
    total >= 8.5 ? "表現出色" :
    total >= 7 ? "良好，可再聚焦" :
    total >= 5 ? "尚可，關鍵點不足" : "需加強針對性";

  const summary =
    total >= 8
      ? `你已掌握本題多數要點；把「${extractSnippet(trimmed, 20)}」再補上結果會更穩。`
      : total >= 6
        ? "有基本框架，但與課託職責／程序直接相關的要點仍可補強。"
        : "目前較泛。請更緊扣遊協使命、課託場景與專業程序。";

  const analysis = {
    score: total,
    label,
    summary,
    dimensions: dimScores,
    suggestions: uniqSuggest,
    strengths: uniqStrength,
    modelAnswer: question.modelAnswer,
  };
  analysis.optimizedAnswer = buildOptimizedAnswer(question, trimmed, analysis);
  return analysis;
}

/* ---------- Voice input ---------- */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let listening = false;

function setupVoice() {
  const btn = document.getElementById("voiceBtn");
  const status = document.getElementById("voiceStatus");
  const label = document.getElementById("voiceLabel");
  if (!SpeechRecognition) {
    btn.disabled = true;
    status.textContent = "此瀏覽器不支援語音輸入";
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = "zh-HK";
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalBuffer = "";

  recognition.onstart = () => {
    listening = true;
    btn.classList.add("is-listening");
    btn.setAttribute("aria-pressed", "true");
    label.textContent = "聆聽中…";
    status.textContent = "請開始說話，再按一次結束";
    finalBuffer = "";
  };

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalBuffer += transcript;
      else interim += transcript;
    }
    const base = state.voiceBase || "";
    const merged = `${base}${finalBuffer}${interim}`.trim();
    els.answerInput.value = merged;
    els.charCount.textContent = `${els.answerInput.value.trim().length} 字`;
  };

  recognition.onerror = (event) => {
    status.textContent =
      event.error === "not-allowed" ? "請允許麥克風權限" : `語音錯誤：${event.error}`;
    stopVoice();
  };

  recognition.onend = () => {
    if (listening) {
      // some browsers end unexpectedly; keep UI consistent
      stopVoice(true);
    }
  };

  btn.addEventListener("click", () => {
    if (listening) stopVoice();
    else startVoice();
  });
}

function startVoice() {
  if (!recognition || listening) return;
  state.voiceBase = els.answerInput.value.trim()
    ? `${els.answerInput.value.trim()} `
    : "";
  try {
    recognition.start();
  } catch {
    document.getElementById("voiceStatus").textContent = "無法啟動麥克風，請重試";
  }
}

function stopVoice(fromEnd) {
  listening = false;
  const btn = document.getElementById("voiceBtn");
  const label = document.getElementById("voiceLabel");
  const status = document.getElementById("voiceStatus");
  btn.classList.remove("is-listening");
  btn.setAttribute("aria-pressed", "false");
  label.textContent = "語音輸入";
  if (!fromEnd) {
    try {
      recognition.stop();
    } catch {
      /* ignore */
    }
  }
  status.textContent = els.answerInput.value.trim() ? "已寫入文字，可再編輯" : "";
}

/* ---------- App state & UI ---------- */
const state = {
  index: 0,
  session: null,
  answers: [],
  awaitingNext: false,
  voiceBase: "",
};

const els = {};

function $(id) {
  return document.getElementById(id);
}

function init() {
  Object.assign(els, {
    welcomePanel: $("welcomePanel"),
    interviewPanel: $("interviewPanel"),
    resultsPanel: $("resultsPanel"),
    topbarMeta: $("topbarMeta"),
    progressFill: $("progressFill"),
    progressLabel: $("progressLabel"),
    categoryPill: $("categoryPill"),
    timerHint: $("timerHint"),
    questionText: $("questionText"),
    questionHint: $("questionHint"),
    answerInput: $("answerInput"),
    charCount: $("charCount"),
    submitBtn: $("submitBtn"),
    nextBtn: $("nextBtn"),
    feedbackEmpty: $("feedbackEmpty"),
    feedbackBody: $("feedbackBody"),
    scoreRing: $("scoreRing"),
    scoreValue: $("scoreValue"),
    scoreLabel: $("scoreLabel"),
    scoreSummary: $("scoreSummary"),
    dimensionList: $("dimensionList"),
    suggestList: $("suggestList"),
    strengthList: $("strengthList"),
    optimizedAnswer: $("optimizedAnswer"),
    modelAnswer: $("modelAnswer"),
    resultsGrid: $("resultsGrid"),
    overallScore: $("overallScore"),
    overallVerdict: $("overallVerdict"),
    sessionBanner: $("sessionBanner"),
    bankStatus: $("bankStatus"),
    bankRefreshNote: $("bankRefreshNote"),
  });

  $("startBtn").addEventListener("click", () => startInterview(false));
  $("weakStartBtn").addEventListener("click", () => startInterview(true));
  $("submitBtn").addEventListener("click", submitAnswer);
  $("nextBtn").addEventListener("click", goNext);
  $("retryBtn").addEventListener("click", () => startInterview(false));
  $("weakRetryBtn").addEventListener("click", () => startInterview(true));
  $("reviewBtn").addEventListener("click", goHome);
  $("homeBtn").addEventListener("click", goHome);
  $("homeFromInterviewBtn").addEventListener("click", () => {
    if (confirm("確定返回首頁？目前這輪未完成的進度不會計入歷程。")) goHome();
  });
  $("clearHistoryBtn").addEventListener("click", clearHistory);
  $("useOptimizedBtn").addEventListener("click", () => {
    const text = els.optimizedAnswer.textContent;
    els.answerInput.disabled = false;
    els.answerInput.value = text;
    els.charCount.textContent = `${text.trim().length} 字`;
    els.submitBtn.disabled = false;
    els.answerInput.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  els.answerInput.addEventListener("input", () => {
    els.charCount.textContent = `${els.answerInput.value.trim().length} 字`;
  });

  setupSheets();
  setupMemo();
  setupVoice();
  renderHomeProgress();
  updateBankStatus();
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
  memo.value = localStorage.getItem(STORAGE.memo) || "";
  memo.addEventListener("input", () => {
    localStorage.setItem(STORAGE.memo, memo.value);
  });
}

function updateBankStatus() {
  const used = getUsedIds().size;
  const weak = getWeakCategories();
  const unused = Math.max(0, BASE_QUESTIONS.length - used);
  els.bankStatus.textContent = weak.length
    ? `題庫：核心 ${BASE_QUESTIONS.length} 題 · 未練約 ${unused} 題 · 弱項聚焦：${weak.join("、")}`
    : `題庫：核心 ${BASE_QUESTIONS.length} 題 · 未練約 ${unused} 題 · 不足時會自動補題`;
}

function renderHomeProgress() {
  const history = loadJSON(STORAGE.history, []);
  $("statSessions").textContent = String(history.length);

  if (!history.length) {
    $("statAvg").textContent = "—";
    $("statBest").textContent = "—";
    $("statWeak").textContent = "—";
    $("catBars").innerHTML = "";
    $("historyList").innerHTML =
      '<p class="empty-hint">尚未有練習紀錄。完成一輪面試後會顯示在這裡。</p>';
    return;
  }

  const avgs = history.map((h) => h.avg);
  const avg = avgs.reduce((s, n) => s + n, 0) / avgs.length;
  const best = Math.max(...avgs);
  $("statAvg").textContent = avg.toFixed(1);
  $("statBest").textContent = best.toFixed(1);

  const catMap = {};
  history.forEach((h) => {
    Object.entries(h.categoryScores || {}).forEach(([cat, score]) => {
      if (!catMap[cat]) catMap[cat] = [];
      catMap[cat].push(score);
    });
  });
  const catAvgs = Object.entries(catMap).map(([cat, arr]) => ({
    cat,
    avg: arr.reduce((s, n) => s + n, 0) / arr.length,
  }));
  catAvgs.sort((a, b) => a.avg - b.avg);
  $("statWeak").textContent = catAvgs[0]?.cat || "—";

  $("catBars").innerHTML = catAvgs
    .map(
      (c) => `
      <div class="cat-bar-row">
        <span>${c.cat}</span>
        <div class="cat-bar-track"><span style="width:${c.avg * 10}%"></span></div>
        <strong>${c.avg.toFixed(1)}</strong>
      </div>`
    )
    .join("");

  $("historyList").innerHTML = history
    .slice()
    .reverse()
    .slice(0, 8)
    .map((h) => {
      const date = new Date(h.at).toLocaleString("zh-HK", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `
        <div class="history-item">
          <span class="score">${h.avg.toFixed(1)}</span>
          <div>
            <div>${h.focusWeak ? "弱項練習" : "完整模擬"} · ${h.count} 題</div>
            <div class="meta">${date}${h.note ? ` · ${h.note}` : ""}</div>
          </div>
        </div>`;
    })
    .join("");
}

function clearHistory() {
  if (!confirm("確定清除所有答題歷程？個人備忘不會刪除。")) return;
  localStorage.removeItem(STORAGE.history);
  localStorage.removeItem(STORAGE.usedIds);
  localStorage.removeItem(STORAGE.weakCats);
  renderHomeProgress();
  updateBankStatus();
}

function goHome() {
  stopVoice();
  els.welcomePanel.hidden = false;
  els.interviewPanel.hidden = true;
  els.resultsPanel.hidden = true;
  els.topbarMeta.hidden = true;
  renderHomeProgress();
  updateBankStatus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startInterview(focusWeak) {
  stopVoice();
  const session = buildSession({ focusWeak });
  state.session = session;
  state.index = 0;
  state.answers = [];
  state.awaitingNext = false;

  els.welcomePanel.hidden = true;
  els.resultsPanel.hidden = true;
  els.interviewPanel.hidden = false;
  els.topbarMeta.hidden = false;

  if (session.notes.length) {
    els.sessionBanner.hidden = false;
    els.sessionBanner.textContent = session.notes.join(" ");
  } else {
    els.sessionBanner.hidden = true;
  }

  renderQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function currentQuestion() {
  return state.session.questions[state.index];
}

function renderQuestion() {
  const qn = currentQuestion();
  els.categoryPill.textContent = qn.category;
  els.timerHint.textContent = qn.timeHint;
  els.questionText.textContent = qn.question;
  els.questionHint.textContent = qn.hint;
  els.answerInput.value = "";
  els.charCount.textContent = "0 字";
  els.answerInput.disabled = false;
  els.submitBtn.disabled = false;
  els.feedbackEmpty.hidden = false;
  els.feedbackBody.hidden = true;
  state.awaitingNext = false;
  updateProgress();
}

function updateProgress() {
  const total = state.session.questions.length;
  const pct = (state.index / total) * 100;
  els.progressFill.style.width = `${pct}%`;
  els.progressLabel.textContent = `第 ${state.index + 1} / ${total} 題`;
}

function historyContext() {
  return { recurringWeak: getWeakCategories() };
}

function submitAnswer() {
  const answer = els.answerInput.value.trim();
  if (!answer) {
    els.answerInput.focus();
    return;
  }
  stopVoice();
  const qn = currentQuestion();
  const analysis = analyzeAnswer(qn, answer, historyContext());
  const entry = {
    questionId: qn.id,
    category: qn.category,
    question: qn.question,
    answer,
    analysis,
  };
  // 若用「優化版再練」重交，取代本題上一次分數，避免重複計入
  const existing = state.answers.findIndex((a) => a.questionId === qn.id);
  if (existing >= 0) state.answers[existing] = entry;
  else state.answers.push(entry);

  renderFeedback(analysis);
  els.answerInput.disabled = true;
  els.submitBtn.disabled = true;
  state.awaitingNext = true;
  const total = state.session.questions.length;
  els.progressFill.style.width = `${((state.index + 1) / total) * 100}%`;
}

function renderFeedback(analysis) {
  els.feedbackEmpty.hidden = true;
  els.feedbackBody.hidden = false;
  els.scoreValue.textContent = analysis.score;
  els.scoreLabel.textContent = analysis.label;
  els.scoreSummary.textContent = analysis.summary;
  els.scoreRing.style.setProperty("--p", analysis.score * 10);

  els.dimensionList.innerHTML = analysis.dimensions
    .map(
      (d) => `
      <div class="dim-row">
        <span>${d.name}</span>
        <strong>${d.score}/10</strong>
        <div class="dim-bar"><span data-w="${d.score * 10}"></span></div>
      </div>`
    )
    .join("");
  requestAnimationFrame(() => {
    els.dimensionList.querySelectorAll(".dim-bar > span").forEach((bar) => {
      bar.style.width = `${bar.dataset.w}%`;
    });
  });

  els.strengthList.innerHTML = analysis.strengths.map((s) => `<li>${s}</li>`).join("");
  els.suggestList.innerHTML = analysis.suggestions.map((s) => `<li>${s}</li>`).join("");
  els.optimizedAnswer.textContent = analysis.optimizedAnswer;
  els.modelAnswer.textContent = analysis.modelAnswer;
  els.nextBtn.textContent =
    state.index >= state.session.questions.length - 1 ? "查看總結報告" : "下一題";

  if (window.matchMedia("(max-width: 900px)").matches) {
    els.feedbackBody.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function goNext() {
  if (!state.awaitingNext) return;
  if (state.index >= state.session.questions.length - 1) {
    showResults();
    return;
  }
  state.index += 1;
  renderQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showResults() {
  stopVoice();
  els.interviewPanel.hidden = true;
  els.resultsPanel.hidden = false;

  const scores = state.answers.map((a) => a.analysis.score);
  const avg = Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 10) / 10;
  els.overallScore.textContent = avg;

  const categoryScores = {};
  state.answers.forEach((a) => {
    if (!categoryScores[a.category]) categoryScores[a.category] = [];
    categoryScores[a.category].push(a.analysis.score);
  });
  const catAvg = {};
  Object.entries(categoryScores).forEach(([cat, arr]) => {
    catAvg[cat] = Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 10) / 10;
  });

  const weak = updateWeakCategories(state.answers);
  markUsed(state.answers.map((a) => a.questionId));

  const history = loadJSON(STORAGE.history, []);
  history.push({
    at: Date.now(),
    avg,
    count: state.answers.length,
    categoryScores: catAvg,
    focusWeak: !!state.session.focusWeak,
    note: state.session.generated ? `自動補題 ${state.session.generated}` : "",
    answers: state.answers.map((a) => ({
      id: a.questionId,
      category: a.category,
      score: a.analysis.score,
      question: a.question,
    })),
  });
  saveJSON(STORAGE.history, history.slice(-30));

  const strongCat = Object.entries(catAvg).sort((a, b) => b[1] - a[1])[0];
  const weakCat = Object.entries(catAvg).sort((a, b) => a[1] - b[1])[0];

  els.overallVerdict.textContent =
    avg >= 8
      ? `表現穩健。強項是「${strongCat[0]}」，可繼續打磨「${weakCat[0]}」的程序與例子。`
      : avg >= 6
        ? `已有框架。建議用「針對弱項練習」重點補強「${weakCat[0]}」，並多用個人化優化版本改寫后再練。`
        : `建議先看首頁「答題框架／常犯錯誤」，再針對「${weakCat[0]}」重練。`;

  els.bankRefreshNote.textContent = weak.length
    ? `系統已更新弱項標籤：${weak.join("、")}。下次開始會自動優先補相關題目。`
    : state.session.generated
      ? `本輪已自動更新題庫（新增／變奏 ${state.session.generated} 題）。`
      : "題庫狀態已更新；再練一輪會自動避開剛做過的題。";

  els.resultsGrid.innerHTML = state.answers
    .map(
      (a, i) => `
      <article class="result-card">
        <span class="result-score">${a.analysis.score}/10</span>
        <div class="cat">${a.category}</div>
        <h3>第 ${i + 1} 題</h3>
        <p>${a.analysis.suggestions[0] || a.analysis.summary}</p>
      </article>`
    )
    .join("");

  els.progressFill.style.width = "100%";
  els.progressLabel.textContent = "已完成";
  updateBankStatus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", init);
