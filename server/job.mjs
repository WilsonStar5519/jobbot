/** 招聘原文要點：JobsDB #93615121／公開職位描述 */

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

export const AGENDA = [
  {
    id: "opening",
    phase: "opening",
    label: "起",
    category: "個人特質與抗壓",
    ask: "禮貌歡迎，請對方介紹自己，同埋點解申請計劃主任。",
  },
  {
    id: "job_understanding",
    phase: "development",
    label: "承",
    category: "職位理解",
    ask: "問關愛基金在校課後託管計劃嘅目標，同計劃主任主要做咩。",
  },
  {
    id: "experience",
    phase: "development",
    label: "承",
    category: "個案與家庭工作",
    ask: "請對方講一件最相關嘅工作經驗。",
  },
  {
    id: "operations",
    phase: "turn",
    label: "轉",
    category: "營運與導師管理",
    ask: "問一條營運題：導師管理、同學校協作，或假期人手不足，揀一個尚未問過嘅。",
  },
  {
    id: "crisis",
    phase: "turn",
    label: "轉",
    category: "危機與保護兒童",
    ask: "問一個課託現場危機，例如學童要衝出課室，或受傷叫你保密。",
  },
  {
    id: "closing",
    phase: "closing",
    label: "合",
    category: "協作與溝通",
    ask: "問週末同假期輪班得唔得；之後問有冇問題，再禮貌結束。",
  },
];
