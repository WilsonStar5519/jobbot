# 如何在不影響原版的情況下測試 jobbot_trail

試驗版同原版係**同一個 repo 入面兩套獨立檔案**。只要你喺正確嘅資料夾啟動，原版嘅程式碼、報告、模型同正在運行嘅服務都唔會被改寫。

| | 原版（根目錄） | 試驗版（`jobbot_trail/`） |
| --- | --- | --- |
| 啟動位置 | repo 根目錄 | `jobbot_trail/` |
| 網頁 | http://127.0.0.1:3000 | http://127.0.0.1:3001 |
| 語言模型服務 | 埠 8090 | 埠 8091 |
| 模型檔 | `models/Qwen2.5-7B-Instruct-Q4_K_M.gguf` | `jobbot_trail/models/Qwen3-8B-Q4_K_M.gguf` |
| 面試報告 | `data/reports/` | `jobbot_trail/data/reports/` |
| 畫面標題 | HKPA 面試教練 | HKPA 面試教練／試驗版 · 埠 3001 |

## 建議做法：一次只開一個版本（最穩）

同一張 NVIDIA GPU（例如 RTX 3080）**唔適合同時載入兩個 7B／8B 模型**。VRAM 會爆，兩邊都會變慢甚至啟動失敗。所以日常測試請：

1. 如果原版視窗（`npm start`／`start.bat`）開住，喺嗰個視窗按 `Ctrl+C` 結束。
2. 開一個新嘅命令提示字元，進入試驗版資料夾：

```bat
cd 你嘅路徑\jobbot\jobbot_trail
npm install
npm start
```

或者直接雙擊 `jobbot_trail\start.bat`。

3. 瀏覽器開 **http://127.0.0.1:3001**（唔好開 3000，嗰個係原版）。
4. 第一次會下載 Qwen3-8B（約 4.7 GB）到 `jobbot_trail\models\`。llama.cpp 如果原版已經下載過，試驗版會**只讀沿用**，唔會改原版 `vendor\`。
5. 畫面左上角會顯示「試驗版 · 埠 3001」，確認你入咗新版本再開始面試。

測完要返原版：同樣 `Ctrl+C` 停試驗版，然後喺 **repo 根目錄** 再 `npm start`，開 http://127.0.0.1:3000 。

## 可以同時開兩個網頁，但唔好同時載入兩個模型

如果你想對照兩邊畫面：

1. 先開原版（根目錄 `npm start`）→ http://127.0.0.1:3000
2. **唔好**喺原版首頁按「開始面試」（避免 GPU 已被佔用之後試驗版載唔入）
3. 停原版模型後，再開試驗版 → http://127.0.0.1:3001

兩邊報告資料夾分開，面試紀錄唔會寫亂。但兩邊嘅 llama-server **唔好一齊跑**。

## 唔會發生嘅事（隔離保證）

- 唔會改到根目錄嘅 `app.js`、`server/`、`README.md` 等正式檔案
- 唔會覆蓋原版已經下載嘅 Qwen2.5 模型
- 唔會把試驗版報告寫入原版 `data/reports/`
- 唔會搶原版嘅 3000／8090 埠（試驗版預設 3001／8091）
- 沿用原版 llama.cpp 時只係讀取執行檔，唔會解壓覆蓋原版 `vendor/`

## 如果埠被佔用

```bat
set APP_PORT=3011
set LLM_PORT=8101
npm start
```

然後改開 http://127.0.0.1:3011 。
