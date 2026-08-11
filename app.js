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

/** 各題完整標準答案（可直接作 2–3 分鐘口述示範） */
const STANDARD_ANSWERS = {
  "org-1": `我認識香港遊樂場協會是一所歷史悠久的青少年服務機構，自1933年成立以來，一直透過多元化服務培育兒童及青少年在德、智、體、群、美方面的全人發展，秉持「以人為本、追求卓越」的精神。我特別認同機構不止提供活動，更重視弱勢青少年的支援與價值建立。\n\n我想加入遊協而不是其他機構，是因為本會同時具備社會工作與文化體藝等多元平台，能讓服務更整全。而這個計劃主任職位設於賽馬會上葵涌青少年綜合服務（KIT），負責關愛基金在校課後託管，正好結合我對小學／家庭支援的興趣，也能在葵青區落地實踐機構使命。`,
  "org-2": `遊協強調德智體群美全人發展，課後託管正正可以在日常服務中體現：在「智」方面透過功課輔導與學習習慣建立；在「群」與「德」方面透過小組、朋輩相處與規範學習；在「體」「美」方面可安排體能、創意或興趣活動；同時透過家長工作強化家庭支援，讓成長環境更穩健。\n\n作為計劃主任，我會避免把課託理解成純看管，而是有目標、有評估的成長支援，並與學校協作，對接有需要學童的持續支援，呼應機構培育下一代的使命。`,
  "org-3": `葵青區有不少雙職、單親及資源相對緊絀的家庭，課後照顧與學習支援需求明顯。KIT 作為區內綜合服務單位，可連結中心資源，為課託個案提供延續支援。\n\n若加入團隊，我會先謙虛了解單位文化、學校協作慣例與現有流程，主動向同事及督導學習；同時走進社區與家長建立信任，以務實、可合作的態度融入，而不是一開始就大幅改動現有做法。`,
  "org-4": `學校社工與課託計劃主任都很重要，但角色重心不同。學校社工較聚焦校園整體個案、危機與系統工作；課託計劃主任則同時要處理在校營運、導師管理、假期服務、行政，以及家長因就業需要而產生的託管支援。\n\n我申請此職位，是希望在個案專業之上，加強計劃營運與家庭充權的實踐，特別是關愛基金在校課託這種直接回應弱勢家庭需要的服務。我相信兩者可協作，而我更希望在課託場景把專業落地。`,
  "role-1": `關愛基金在校課後託管服務計劃的目標，是讓有需要的小學生在熟悉安全的校園環境接受課後託管與學習支援，並讓家長（尤其單親或雙職家庭）可以外出工作改善生活。服務通常涵蓋功課支援、社交發展活動，以及按需要的家長指導與轉介。\n\n計劃主任的核心職責包括：處理家長及學童個案與活動、導師現場管理、假期託管籌辦，以及行政工作；並與學校保持緊密協調，確保服務質素、安全與可持續運作。我理解自己不單是前線執行者，更要有統籌與質素監察的角色。`,
  "role-2": `以 STAR 說明：情境上，我曾在小學／課託相關場景接觸有情緒或學習需要的學童及家長；任務是要在有限時間內穩定場面、支援學習，並與學校保持溝通。行動上，我會先評估需要、訂個別支援、與導師／老師分工，並記錄跟進。結果方面，學童出席及課堂參與有改善，家長亦更願意合作。\n\n這些經驗可遷移到本職位：我能同時處理個案判斷、現場管理與行政溝通，並理解課託要平衡兒童福祉與家長就業需要。`,
  "role-3": `我會先做需要評估：了解學校校曆、學童年齡層、SEN 比例、家長期望與現有資源。接著設計「常規＋主題」結構：每日保留功課輔導核心時段，每週加入社交／情緒或興趣小組，每學期安排親子／家長活動。\n\n同時訂簡單指標，例如出席率、導師課堂觀察、家長回饋，每個月檢討一次並調整。這樣可以平衡學習支援、全人發展與家庭參與，而不是只做功課或只做活動。`,
  "role-4": `我會先與學校釐清角色：課託負責時段內的照顧、學習支援與即場處理；學校社工／班主任則掌握校園整體個案與系統資源。實務上可建立固定溝通機制，例如每兩周短會、緊急事故即時通報，以及個案轉介表格。\n\n遇到重疊時，我會以兒童最佳利益為先，主動協調誰主導、誰支援，並做書面紀錄，避免家長收到不一致訊息，也確保跟進不斷層。`,
  "role-5": `我會先核實事實，包括遲到次數、課堂觀察及學生意見，再與導師作對事不對人的面談，重申準時、課堂管理與活動質素的期望。同時提供支援，例如活動設計示範、課堂管理技巧、影子跟班或共同備課。\n\n之後會訂改善目標與期限並持續觀察；若仍無改善，則按機構人事程序處理，必要時調整人手，因為最終要保障學生的服務體驗與安全。`,
  "role-6": `面對需求急增但人手不足，我會先以安全及法定／機構導師比例為底線，評估可增加的名額上限。然後按需要優先（例如單親、缺乏支援網絡、特殊需要）分配，並研究調動中心人手、兼職支援或合併班組等方案。\n\n對家長會清晰、及早說明準則、名額與替代安排，避免過度承諾；同時向督導匯報風險與決策，確保透明度與可問責。`,
  "crisis-1": `首先，我會以安全為先：阻止衝出課室的風險，保護該生及其他同學，必要時安排短暫分隔，並保持冷靜語氣。接著安撫降溫，用簡短清晰的話協助他表達情緒，同時評估觸發因素。期間會指揮導師分工：一人協助其他同學安定，一人支援紀錄或聯絡。\n\n事後會通知家長及學校、撰寫事件報告、向督導匯報，並訂預防措施，例如個別支援計劃、座位或活動調適，避免同樣情況再发生。`,
  "crisis-2": `我不會承諾「絕對保密」，因為兒童安全高於保密。我會以關懷、非誘導的方式了解傷勢與情況，仔細觀察並客觀記錄，同時評估即時安全風險。\n\n然後會即時向督導匯報，按機構及社署保護兒童相關程序處理，並與學校協作跟進。整個過程會保持專業界線，不自行斷定施虐者，但也不會因兒童要求而延誤必要通報。`,
  "crisis-3": `我會先查閱機構應變指引，評估天氣風險、場地與人手是否足以在當區服務單位提供替代託管。安全不可行時，不會硬開服務。若可開，會按優先需要安排有限名額，並清楚通知家長開放時間、地點與限制。\n\n同時與學校／同事同步訊息，做好點名與紀錄，事後向督導匯報決策理據，確保既回應家庭需要，也不把團隊與兒童置於不合理風險。`,
  "crisis-4": `我會先確保現場安全，分開兩名學童，制止繼續傷害。不會在未查證前按一方家長要求即時重罰。接著會分別了解經過、詢問證人、檢視是否屬持續欺凌，並以中立態度向家長說明處理原則：先查證、再按情節採取修復及／或紀律後果。\n\n之後會做修復關係或後果安排、通知學校、記錄存檔，並視需要提供社交技巧或情緒支援，確保公平又能保護被欺凌一方。`,
  "crisis-5": `收到懷疑自傷報告後，我會即時作風險評估：是否有計劃、工具、即時危險。若風險高，先確保安全及不離目，必要时按危機程序處理。同時保持關懷、不批判的態度，避免承諾絕對保密。\n\n接著會通知督導，並按情況聯絡家長與學校，轉介合適專業支援，訂安全計劃與跟進時間表，整段過程詳細記錄，確保兒童得到持續保護。`,
  "crisis-6": `我會先讓學童在安全環境留待，給予安撫與基本照顧，並持續嘗試聯絡家長及緊急聯絡人，必要時按機構指引通知學校或升級處理。不會讓學童獨自離開，也不會把孩子交予未經核實的人士。\n\n交接完成後會詳細記錄時間線、聯絡過程與結果，事後檢討是否需要更新家長聯絡資料或接送流程，減低再發機會。`,
  "trait-1": `我理解並接受本職可能需要週末及公眾假期輪班，因為課託要回應家長工作時間與假期照顧需要。實務上我會用優先排序、每日清單與時間區塊，同時管理個案、導師與行政，避免東拼西湊。\n\n我亦會安排休息與自我照顧，維持服務質素。對我而言，輪班不是額外負擔的口號，而是這項家庭友善服務必要的一部分，我有心理準備亦有方法應付。`,
  "trait-2": `例如曾有家長希望以較寬鬆方式處理孩子行為，但我評估繼續放任會影響其他學童安全。我先同理家長的壓力與擔心，再清楚解釋兒童需要與服務界線，提出可執行的替代方案，例如分階段行為約定與家校一致做法。\n\n若雙方仍有分歧，我會引入督導或與學校共同會議，而不是硬碰或回避。最終以兒童最佳利益作決定，同時盡力維持可合作的專業關係。`,
  "trait-3": `我會先覺察自己的壓力訊號，例如易怒或過度投入。方法包括個案後短暫停頓、準時督導、同事支援，以及工餘界線，例如不把所有情緒工作帶回家。若發現開始耗竭，會主動尋求督導，而不是硬撐。\n\n對我來說，自我照顧不是自私，而是維持同理與專業判斷的條件；只有自己穩，才能持續對兒童與家長保持耐性與質素。`,
  "trait-4": `首月我會熟悉學校環境、服務流程、安全與行政要求，並向督導／同事請教；同時認識班主任與主要家長，建立可聯繫、可信賴的形象。第二個月會逐步優化課堂節奏、導師分工與假期籌備。\n\n第三個月會用簡單數據與回饋（出席、課堂觀察、家長意見）做檢討，提出可執行的改善。整體是「先站穩、再建關係、再優化」，而不是一開始大改。`,
  "trait-5": `情境上，我發現某流程令家長或導師經常混亂，例如點名／交接資訊不清。任務是要在不增加太多前線負擔下改善。我行動上先收集意見、設計更清晰清單或溝通方式，試行後再定稿。\n\n結果是出錯減少、同事更易執行，家長投訴或誤會下降。這反映我主動觀察系統問題，不只處理即場火頭，也能用小改進提升整體服務質素。`,
};

function buildStandardAnswer(question) {
  if (question.standardAnswer) return question.standardAnswer;
  if (STANDARD_ANSWERS[question.id]) return STANDARD_ANSWERS[question.id];
  const cat = question.category;
  const opener =
    cat === "機構背景"
      ? `針對「${question.question}」，我會這樣回答：香港遊樂場協會致力青少年全人發展，秉持以人為本、追求卓越。`
      : cat === "職位要求"
        ? `針對本題，我會先對齊關愛基金在校課後託管的目標，再說明計劃主任如何以個案、導師管理、假期服務與行政落實服務。`
        : cat === "危機處理"
          ? `我會按「安全—介入—跟進」作答。`
          : `我會用具體例子證明自己適合此節奏與價值。`;
  return `${opener}\n\n${question.modelAnswer}\n\n最後，我會把答案扣連到${JOB.unit}的${JOB.program}，強調兒童最佳利益、學校協作與可執行的跟進。`;
}

function q(id, category, question, hint, modelAnswer, standardAnswer) {
  const def = CATEGORY_DEFAULTS[category];
  const dimensions = Object.entries(def.keywords).map(([name, keywords], i, arr) => ({
    name,
    weight: Math.round((1 / arr.length) * 100) / 100,
    keywords,
  }));
  const sum = dimensions.reduce((s, d) => s + d.weight, 0);
  dimensions.forEach((d) => {
    d.weight = d.weight / sum;
  });
  const item = {
    id,
    category,
    timeHint: category === "危機處理" ? "建議作答 3 分鐘" : "建議作答 2–3 分鐘",
    question,
    hint,
    dimensions,
    missingHints: { ...def.missing },
    modelAnswer,
    structureTips: [...def.tips],
    standardAnswer: standardAnswer || "",
  };
  return item;
}

function generateQuestion(category, index) {
  const templates = GENERATOR_TEMPLATES[category] || GENERATOR_TEMPLATES["職位要求"];
  const t = templates[index % templates.length];
  const stamp = Date.now().toString(36).slice(-4);
  const id = `gen-${category.slice(0, 2)}-${index}-${stamp}`;
  const standard =
    t.standard ||
    `完整示範答法：${t.model}\n\n我會先直接回應題目核心，再用具體步驟說明會如何執行，最後連結${JOB.program}的服務目標、兒童安全與學校／家長協作，確保答案既有價值觀，亦有可執行細節。`;
  return q(id, category, t.stem, t.hint, t.model, standard);
}

// 待 STANDARD_ANSWERS 定義後補上完整標準答案
function attachStandardAnswers(list) {
  list.forEach((item) => {
    if (!item.standardAnswer && STANDARD_ANSWERS[item.id]) {
      item.standardAnswer = STANDARD_ANSWERS[item.id];
    }
    if (!item.standardAnswer) {
      item.standardAnswer = buildStandardAnswer(item);
    }
  });
}
attachStandardAnswers(BASE_QUESTIONS);

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

function splitSentences(answer) {
  return answer
    .split(/[。！？!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6);
}

function findStrengthQuotes(answer, foundKeywords) {
  const sentences = splitSentences(answer);
  const quotes = [];
  for (const s of sentences) {
    if (foundKeywords.some((kw) => normalize(s).includes(normalize(kw)))) {
      quotes.push(s.length > 48 ? `${s.slice(0, 48)}…` : s);
    }
    if (quotes.length >= 2) break;
  }
  return quotes;
}

function pickUserSentences(answer, limit = 2) {
  const sentences = splitSentences(answer)
    .filter((s) => !/我有熱誠|我喜歡小朋友|抗壓力高|善於溝通/.test(s))
    .sort((a, b) => b.length - a.length);
  return sentences.slice(0, limit);
}

/** 把求職者原意織入完整標準答，產出可直接口述的完整優化答案 */
function buildOptimizedAnswer(question, answer, analysis) {
  const standard = buildStandardAnswer(question);
  const userSentences = pickUserSentences(answer, 3);
  const missingDims = analysis.dimensions.filter((d) => d.score < 6.5);
  const strongDims = analysis.dimensions.filter((d) => d.score >= 7);

  const kept =
    userSentences.length > 0
      ? userSentences.map((s) => (/[。！？]$/.test(s) ? s : `${s}。`)).join("")
      : "";

  const bridge =
    kept.length > 0
      ? `先就我剛才提到的重點作整理：${kept}我會在此基礎上，把答案說得更完整、更貼合本職位。\n\n`
      : `我會以更完整的結構回答這題。\n\n`;

  const gapFill = missingDims
    .map((d) => {
      const hint = question.missingHints[d.name] || "";
      if (d.name.includes("安全") || question.category === "危機處理" && d.name === "安全優先") {
        return `在「${d.name}」方面，我會先確保兒童及其他人的即時安全，必要時分隔場面並保持冷靜。`;
      }
      if (d.name.includes("程序") || d.name.includes("通報")) {
        return `在「${d.name}」方面，我會按機構程序通知家長／學校、做好紀錄，並向督導匯報。`;
      }
      if (d.name.includes("機構") || d.name.includes("認識")) {
        return `在機構認識上，我會明確提到遊協自1933年服務青少年，推動德智體群美全人發展，並秉持以人為本、追求卓越。`;
      }
      if (d.name.includes("職責") || d.name.includes("計劃")) {
        return `在職責上，我會交代計劃主任需處理個案／活動、導師現場管理、假期託管與行政，並與學校協作。`;
      }
      return hint ? `針對「${d.name}」：${hint}` : "";
    })
    .filter(Boolean)
    .slice(0, 3);

  const strengthNote =
    strongDims.length > 0
      ? `\n\n我亦會保留原本已做得好的部分（${strongDims.map((d) => d.name).join("、")}），並補上可觀察結果，例如家長合作改善、秩序穩定或跟進完成。`
      : "";

  // 完整優化答 = 求職者原意橋接 + 標準答案主體 + 缺口補強
  const body = standard;
  const closing = `\n\n總結而言，我的處理會緊扣${JOB.program}，以兒童最佳利益為先，並確保與${JOB.unit}團隊、學校及家長協作一致。`;

  if (gapFill.length) {
    return `${bridge}${body}\n\n此外，我想特別補強：${gapFill.join("")}${strengthNote}${closing}`;
  }
  return `${bridge}${body}${strengthNote}${closing}`;
}

function buildCoachNarrative(question, answer, analysis) {
  const lines = [];
  lines.push(`【面試官總評】${analysis.label}（${analysis.score}/10）。${analysis.summary}`);

  const weak = analysis.dimensions.filter((d) => d.score < 6);
  const strong = analysis.dimensions.filter((d) => d.score >= 7);
  if (strong.length) {
    lines.push(
      `【已達標維度】${strong.map((d) => `${d.name} ${d.score}`).join("；")}。可繼續用具體例子證明。`
    );
  }
  if (weak.length) {
    lines.push(
      `【未達標維度】${weak
        .map((d) => `${d.name}（${d.score}/10）${question.missingHints[d.name] ? "：" + question.missingHints[d.name] : ""}`)
        .join(" ")}`
    );
  }

  const userBits = pickUserSentences(answer, 1);
  if (userBits[0]) {
    lines.push(
      `【就你原文改寫建議】你提到「${extractSnippet(userBits[0], 40)}」——方向可用；建議立刻補上：行動步驟＋結果＋與課託職責的連結。`
    );
  }

  lines.push(
    `【口述策略】建議按「${(question.structureTips || ["重點→例子→總結"]).join(" → ")}」練習 2–3 分鐘；先記骨架，再填你的真實經驗。`
  );
  return lines.join("\n\n");
}

function analyzeAnswer(question, answer, historyContext) {
  const trimmed = answer.trim();
  const len = trimmed.length;
  const suggestions = [];
  const strengths = [];
  const dimScores = [];
  let allFound = [];

  if (len < 40) {
    suggestions.push("答案偏短，面試官較難評估能力。請擴成約 180–350 字，包含情境、行動與結果。");
  } else if (len < 100) {
    suggestions.push("內容略簡。可再補一個具體細節（你做了什麼、對方反應、之後如何跟進）。");
  }

  let weighted = 0;
  for (const dim of question.dimensions) {
    const { hits, found, ratio } = countHits(trimmed, dim.keywords);
    allFound = allFound.concat(found);
    let score = Math.min(10, ratio * 18 + Math.min(2.5, len / 120));
    if (hits === 0) score = Math.min(score, 2.5);
    if (hits === 1) score = Math.min(score, 4.5);
    if (hits >= 3) score = Math.min(10, score + 0.6);
    if (len < 30) score *= 0.55;
    // reward concrete markers
    if (/(例如|一次|當時|結果|之後|首先|接著)/.test(trimmed)) {
      score = Math.min(10, score + 0.3);
    }
    score = Math.round(score * 10) / 10;
    weighted += score * dim.weight;
    dimScores.push({ name: dim.name, score, hits, found, weight: dim.weight });

    if (score >= 7 && found.length) {
      strengths.push(`「${dim.name}」達標（關鍵：${found.slice(0, 3).join("、")}）`);
    }
    if (score < 5.5 && question.missingHints[dim.name]) {
      const quote = extractSnippet(trimmed, 28);
      suggestions.push(
        quote
          ? `你寫到「${quote}」，但「${dim.name}」不足：${question.missingHints[dim.name]}`
          : `「${dim.name}」不足：${question.missingHints[dim.name]}`
      );
    }
  }

  findStrengthQuotes(trimmed, allFound).forEach((qt) => {
    strengths.push(`原文亮點：「${qt}」——可再補結果或程序。`);
  });

  const structureSignals = ["首先", "接著", "然後", "之後", "最後", "第一", "第二"];
  const structureHits = structureSignals.filter((s) => trimmed.includes(s)).length;
  if (structureHits >= 2) {
    weighted = Math.min(10, weighted + 0.5);
    strengths.push("結構分明，有步驟感，適合危機／行為題。");
  } else if (question.category === "危機處理") {
    suggestions.push("危機題請用「首先／接著／之後」覆蓋：安全 → 專業介入 → 通報跟進。");
  }

  if (historyContext?.recurringWeak?.includes(question.category)) {
    suggestions.push(
      `你過去「${question.category}」偏弱，今題請強制覆蓋：${(question.structureTips || []).join("；")}`
    );
  }

  const generic = ["我有熱誠", "我喜歡小朋友", "我抗壓力高", "我善於溝通", "盡心盡力"];
  if (generic.some((g) => trimmed.includes(g)) && len < 160) {
    suggestions.push("少用空泛自我評價；改以一個課託／學校實例證明該特質。");
  }

  if (/(絕對保密|一定唔講|不會告訴任何人|唔會話畀人知)/.test(trimmed)) {
    suggestions.push("保護兒童題不可承諾絕對保密；需說明保密例外、督導匯報與通報程序。");
    weighted = Math.max(1, weighted - 1.2);
  }

  if (question.category === "機構背景" && !/(1933|遊樂場|全人|以人為本|KIT|葵涌)/.test(trimmed)) {
    suggestions.push("機構題宜點名遊協關鍵訊息（歷史／使命／KIT／課託），避免空泛「想服務社會」。");
  }

  const uniqSuggest = [...new Set(suggestions)].slice(0, 6);
  if (!uniqSuggest.length) {
    uniqSuggest.push("整體貼題。再加一個可量度結果（出席、秩序、家長回饋），說服力會更高。");
  }
  const uniqStrength = [...new Set(strengths)].slice(0, 4);
  if (!uniqStrength.length) {
    uniqStrength.push("已有作答基礎；下一步是把內容對齊評分維度與完整標準答案結構。");
  }

  const total = Math.max(1, Math.min(10, Math.round(weighted * 10) / 10));
  const label =
    total >= 8.5 ? "表現出色" :
    total >= 7 ? "良好，可再聚焦" :
    total >= 5 ? "尚可，關鍵點不足" : "需加強針對性";

  const summary =
    total >= 8
      ? `你已掌握多數要點；把「${extractSnippet(trimmed, 20)}」補上結果會更穩。`
      : total >= 6
        ? "有基本框架，但與課託職責／專業程序直接相關的要點仍需補強。"
        : "目前較泛。請對照下方「完整標準答案」，用同等完整度重答。";

  const analysis = {
    score: total,
    label,
    summary,
    dimensions: dimScores,
    suggestions: uniqSuggest,
    strengths: uniqStrength,
    modelAnswer: buildStandardAnswer(question),
    standardAnswer: buildStandardAnswer(question),
  };
  analysis.optimizedAnswer = buildOptimizedAnswer(question, trimmed, analysis);
  analysis.coachNarrative = buildCoachNarrative(question, trimmed, analysis);
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
    coachNarrative: $("coachNarrative"),
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
  if (els.coachNarrative) {
    els.coachNarrative.textContent = analysis.coachNarrative || analysis.summary;
  }
  els.optimizedAnswer.textContent = analysis.optimizedAnswer;
  els.modelAnswer.textContent = analysis.standardAnswer || analysis.modelAnswer;
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
