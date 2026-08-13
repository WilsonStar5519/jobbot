# 優劣分析與優化紀錄（jobbot_trail）

本檔案記錄對原本「HKPA 計劃主任即時模擬面試」平台嘅分析同優化，配合任務要求：
在唔影響正式運作平台嘅前提下，喺獨立資料夾 `jobbot_trail/` 進行修改同驗證。

## 1. 原有設計嘅優點

- **架構單純、依賴極少**：伺服器只用 Node.js 內建 `http` 模組，前端係原生 HTML／CSS／JS，
  除咗 `node-edge-tts` 之外幾乎冇第三方套件，容易理解、部署同除錯。
- **語言模型完全本機推理**：用 `llama.cpp` + GGUF 量化模型喺使用者自己部 Windows／NVIDIA GPU
  電腦上跑，唔需要將面試對話內容傳去第三方 AI API，對處理求職者個人資料嚟講係好嘅私隱設計。
- **面試流程貼近真實面試官**：用「議程（agenda）＋自由發揮」設計（`job.mjs` + `interview.mjs`），
  只規範每個階段嘅主題／角度，實際問法由模型自由生成，並用 `questionOverlap` 防止問到重複／太相似
  嘅問題，比死板嘅固定劇本自然。
- **貼合單一職位嘅高質素內容**：`score.mjs` 入面嘅專業詞彙表、扣題判斷、保護兒童程序要求等，
  對呢個特定職位（課託計劃主任）嚟講相當到位，睇得出對業務場景有認真研究。
- **離線友善嘅降級設計**：報告產生（`report.mjs`）就算 LLM 唔可用都可以完全用本機規則跑完，
  唔會因為模型未載入而完全用唔到。

## 2. 發現嘅主要問題（優化前）

1. **「評分」其實同 AI 冇關係**：`score.mjs` 嘅 `scoreAnswer()` 係純關鍵字比對／長度／結構詞
   （例如「首先」「跟住」）嘅規則評分，LLM 只負責產生 `comment` 同 `optimizedAnswer` 文字，
   從未參與實際分數計算。結果係：
   - 只要塞夠多預設關鍵字就可以谷高分數，內容是否真正扣題、邏輯是否合理反而唔重要；
   - 用同義詞、少見表達方式作答會被低估，因為規則表無法涵蓋所有講法。
2. **報告每次重啟伺服器都會「退化」**：`rebuildAllSavedReports()` 喺伺服器每次啟動都會執行，
   但原本嘅 `rebuildSavedReport()` 用 `localItems()` 完全重新產生 `items`，
   即係將已經存檔、由 LLM 生成嘅 `comment`／`optimizedAnswer` 全部用純規則版本覆蓋咗，
   已完成嘅報告質素會隨重啟次數下降，用戶完全唔會意識到。
3. **模型選擇同版本可以更好**：原本用 `Qwen2.5-7B-Instruct-Q4_K_M`（2024 年模型）。
   同尺寸、同樣啱 README 電腦配置（Windows＋NVIDIA GPU 如 RTX 3080＋約 16GB 記憶體）
   嘅新一代 `Qwen3-8B`，喺指令遵循、JSON 結構化輸出穩定性同中文／粵語表達上都有提升，
   對呢個高度依賴穩定 JSON 輸出（`{"say":...}`、`{"items":[...]}`）嘅應用嚟講特別重要。
4. **LLM 對話缺乏穩健性**：
   - `chat()` 冇 timeout／重試，llama-server 一時卡住就會令成個請求掛住；
   - llama-server 中途死咗之後，需要用戶手動觸發 `/api/boot` 先會重開，冇自動恢復；
   - Qwen3 屬於混合思考模型，如果冇明確關閉思考模式，回覆可能夾雜 `<think>...</think>`，
     令 JSON 解析（`extractJSON`）失敗或者回應變慢。
5. **記憶體會隨時間增長**：面試 session 存喺 `Map`，完成或者中途放棄都唔會被清理，
   伺服器長期開住（本身係設計成長駐本機服務）會不斷累積。
6. **「本機」嘅表述唔夠準確**：README 強調「本機、即時」，但語音合成（Edge TTS）同瀏覽器語音辨識
   實際上都需要連接雲端服務，只有語言模型推理係真正本機／離線。呢點對用戶嘅私隱／網絡預期有落差，
   應該喺文件講清楚。
7. **開發／執行嘅平台假設寫死**：自動開啟瀏覽器用咗 Windows-only 嘅 `start` 指令、
   引擎解壓用 `powershell.exe`，喺非 Windows 環境會出現難以理解嘅錯誤而唔係清晰提示。
8. **產品耦合單一職位**：整個 `job.mjs`／`score.mjs` 關鍵字表都寫死咗一個職位（合約到 2027-08-31），
   若要重用去面試第二個職位，需要改動多個檔案，缺乏設定層。（此項因為超出「模型配置優化」嘅
   核心範圍，本次未有大幅重構，但記錄低以供日後參考。）

## 3. 本次優化內容（`jobbot_trail/` 內）

| 檔案 | 優化內容 |
| --- | --- |
| `server/config.mjs` | 模型由 `Qwen2.5-7B-Instruct-Q4_K_M` 升級為官方 `Qwen/Qwen3-8B-GGUF`（`Qwen3-8B-Q4_K_M.gguf`），檔案大小相若（約 4.7GB），繼續符合 README 電腦配置（Windows＋NVIDIA GPU＋約 16GB 記憶體）。 |
| `server/llm.mjs` | 1) 自動喺 system prompt 加入 `/no_think`，強制 Qwen3 用非思考模式，確保低延遲同乾淨 JSON；2) 保留 `<think>…</think>` 清理作雙重保險；3) `chat()` 加入逾時（AbortController）同重試；4) llama-server 意外中斷後，下一次對話會自動嘗試重新啟動，減少需要用戶手動重啟嘅情況；5) 避免同時啟動多個 llama-server 進程。 |
| `server/score.mjs` | 新增 `blendScore()` / `clampToBand()`：容許 LLM 語意評分喺規則評分 ±3 分範圍內浮動並以 7:3 混合，取代「規則評分講晒事」嘅做法，同時避免 LLM 評分偶爾離譜時大幅失真。 |
| `server/report.mjs` | 1) `enrichWithLlm()` 而家會要求模型連分數（`score`）一齊回傳，並用 `blendScore` 混合成最終分數，標記 `scoreSource`；2) 修正 `buildReport()` 入面「LLM 評語生成完之後又用純規則分數覆蓋返」嘅漏洞；3) 修正 `rebuildSavedReport()`：伺服器重啟時只重新計算分類／六角圖／評級，唔再暴力覆蓋已經存檔嘅 LLM 評語、優化答案同混合分數。 |
| `server/interview.mjs` | 新增背景定時清理逾時（2 小時無活動）嘅面試 session，避免長時間運行嘅記憶體增長。 |
| `server/index.mjs` | 自動開啟瀏覽器改為跨平台判斷（Windows／macOS／Linux），並加入錯誤處理，避免非 Windows 環境出現未捕捉例外。 |
| `server/setup.mjs` | 喺非 Windows 平台解壓步驟提早拋出清晰嘅錯誤訊息，而唔係因為搵唔到 `powershell.exe` 而失敗得莫名其妙。 |
| `app.js` / `styles.css` | 報告卡加入「AI＋規則評分」／「離線規則評分」標籤，令使用者清楚知道呢一題係咪有經過語言模型語意評分，提升透明度。 |
| `README.md` | 更新模型資訊；加入語音合成／辨識需要網絡連線嘅明確說明；加入分數來源標籤嘅解釋。 |

## 4. 未在本次處理、但值得留意嘅事項

- `build.mjs` 內用嚟合併 `index.source.html`／`styles.css`／`app.js` 做單一檔案 `index.html`
  嘅 `<!-- BUILD:STYLE -->`／`<!-- BUILD:SCRIPT -->` 標記已經喺 `index.source.html` 中消失，
  現存 `index.html` 實際上只係一個提示用戶用本機伺服器開啟嘅靜態頁面。`build.mjs`／`publish.mjs`
  屬於較舊架構遺留嘅腳本，現時已經冇實際作用，建議日後清理。
- 若要將平台由「單一職位」推廣為可重用嘅面試教練產品，建議將 `job.mjs` 同 `score.mjs` 嘅
  職位／關鍵字資料抽出做獨立設定檔（JSON／YAML），並且透過設定驅動評分規則。
- 如需要真正完全離線（包括語音），可考慮引入本機 STT（如 whisper.cpp）同本機 TTS（如 Piper），
  取代目前依賴雲端嘅 Edge TTS 同瀏覽器語音辨識。

## 5. 如何測試（唔影響原版）

試驗版預設網頁埠 **3001**、模型埠 **8091**，報告同模型檔都喺 `jobbot_trail/` 底下，同根目錄原版隔離。
詳細步驟見 [`TESTING.md`](./TESTING.md)。同一張 GPU 唔好同時載入原版同試驗版兩個語言模型。
