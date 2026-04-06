# 📬 Morning Bot — 每日晨報機器人

> 每日晨報機器人 - 自動抓取新聞、股票，透過 Gmail 寄送晨報

每天早上 07:30（台灣時間）自動執行，整合財經、天氣、全球新聞、技術資訊，由 AI 生成摘要後寄到你的信箱。

---

## 功能

| 區塊 | 內容 |
|------|------|
| 📰 今日財經頭條 | 台灣財經新聞摘要，自選股關鍵字標記 |
| 🌍 全球重要新聞 | 英文新聞翻譯 + 摘要 |
| 📊 市場快訊 | Yahoo Finance 台股 / 美股報價表格 |
| 📈 台股大盤解讀 | AI 從長線投資角度解讀盤勢 |
| 💻 前端生態系新聞 | 最新技術新聞翻譯 + 摘要 |
| 🌤 台北天氣 | OpenWeatherMap 即時天氣 |
| 🧠 JS / React 概念複習 | 每日一道中等難度題目附解答 |
| 📖 今日名言佳句 | 附作者與出處的經典語錄 |

---

## 技術架構

```
src/
├── index.ts              # 主程式（並行抓取 → AI 生成 → 寄信）
├── fetchers/
│   ├── stocks.ts         # Yahoo Finance 股票資料
│   ├── weather.ts        # OpenWeatherMap 天氣
│   └── news.ts           # newsdata.io 財經 / 全球 / 前端新聞
├── ai/
│   ├── groq.ts           # Groq (Llama 3.3 70B) 六合一 Prompt
│   └── gemini.ts         # Gemini API（備用）
└── email/
    └── send.ts           # Nodemailer + Gmail SMTP
```

**執行流程：**
1. 並行抓取股票、天氣、三類新聞
2. 一次呼叫 Groq API，六個區塊同批生成
3. 組裝 HTML Email，透過 Gmail 寄出

---

## 快速開始

### 1. 安裝相依套件

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env`，填入各項金鑰：

```bash
cp .env.example .env
```

| 變數 | 說明 | 申請連結 |
|------|------|----------|
| `GROQ_API_KEY` | Groq API（免費，Llama 3.3 70B） | https://console.groq.com/keys |
| `OPENWEATHER_API_KEY` | 天氣資料（免費，1000次/天） | https://openweathermap.org/api |
| `NEWSDATA_API_KEY` | 新聞資料（免費，200次/天） | https://newsdata.io/ |
| `GMAIL_USER` | 寄件 Gmail 帳號 | — |
| `GMAIL_APP_PASSWORD` | Gmail 應用程式密碼（16碼） | Google 帳號 > 安全性 > 應用程式密碼 |
| `TO_EMAIL` | 收件人 Email | — |

### 3. 本地測試

```bash
npm start
```

---

## 自動排程（GitHub Actions）

將上述環境變數設為 **GitHub Secrets**，推送到 main 後即可啟用自動排程。

每天 **07:30 台灣時間**（UTC 23:30）自動執行，也可在 Actions 頁面手動觸發。

設定路徑：`Settings > Secrets and variables > Actions`
