export const JOB = {
  org: "香港遊樂場協會",
  orgEn: "Hong Kong Playground Association",
  unit: "賽馬會上葵涌青少年綜合服務（KIT）",
  title: "計劃主任",
  titleEn: "ASWO",
  program: "關愛基金—在校課後託管服務計劃",
  contract: "1/9/2026 – 31/8/2027",
  location: "葵青區",
  salary: "$36,850 起（按經驗而定）",
  requirements: [
    "持認可社會工作學位或以上之註冊社工",
    "有處理社署課託計劃經驗、小學全方位社工優先考慮",
    "星期六、日及公眾假期或需輪班工作",
  ],
  duties: [
    "處理小學在校課託計劃，包括家長及小學生個案／活動工作",
    "導師現場管理",
    "假期託管活動籌辦",
    "行政工作",
  ],
  serviceGoals: [
    "讓有需要小學生在熟悉安全的校園環境接受課後託管與學習支援",
    "支援家長（尤其單親／雙職家庭）外出工作",
    "平衡功課輔導、社交發展與家庭參與",
  ],
};

export const INTERVIEWER = {
  name: "陳嘉敏",
  address: "陳姑娘",
  role: "模擬面試官",
  unit: JOB.unit,
};

/** 只引導主題範圍；實際問法由模型自由發揮，但同一場唔可以問相似題 */
export const AGENDA = [
  {
    id: "opening",
    phase: "opening",
    label: "起",
    category: "個人特質與抗壓",
    topic: "開場：請對方介紹自己，同埋點解申請計劃主任。",
    angles: ["自我介紹", "申請動機", "點解揀課託而唔係其他社工崗位"],
  },
  {
    id: "job_understanding",
    phase: "development",
    label: "承",
    category: "職位理解",
    topic: "職位理解：關愛基金在校課後託管嘅服務目標，或者計劃主任職責。",
    angles: ["計劃目標", "主任職責", "同學校／家長嘅角色"],
  },
  {
    id: "experience",
    phase: "development",
    label: "承",
    category: "個案與家庭工作",
    topic: "相關經驗：一件可遷移到課託嘅個案、家庭或學校工作。",
    angles: ["個案介入", "家長工作", "活動經驗", "可遷移技能"],
  },
  {
    id: "operations",
    phase: "turn",
    label: "轉",
    category: "營運與導師管理",
    topic: "營運：導師管理、學校協作，或假期人手調配，揀一個未問過嘅角度。",
    angles: ["導師質素", "學校協作", "假期人手", "行政同現場平衡"],
  },
  {
    id: "crisis",
    phase: "turn",
    label: "轉",
    category: "危機與保護兒童",
    topic: "危機：課託現場保護兒童，揀一個未用過嘅情境。",
    angles: ["衝出課室", "可疑傷痕要保密", "欺凌", "放學無人接", "自傷念頭"],
  },
  {
    id: "closing",
    phase: "closing",
    label: "合",
    category: "協作與溝通",
    topic: "收結：輪班安排，或者請對方提問，然後禮貌結束。",
    angles: ["週末假期輪班", "多工節奏", "對方想問單位嘅問題"],
  },
];

export const CLOSING_LINE = "唔該晒你今日嘅時間，面試就到呢度。之後會有一份練習報告畀你參考。";
