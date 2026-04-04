/**
 * gemini.ts
 *
 * 呼叫 Gemini 2.0 Flash API，並啟用 Google Search Grounding。
 * Search Grounding = Gemini 可以即時搜尋 Google，不會只靠訓練資料回答。
 * 這讓它可以抓到今天的新聞、天氣、前端社群動態。
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateMorningReport(
  dateStr: string,
  stockTable: string
): Promise<string> {
  console.log("🤖 正在呼叫 Gemini，產生晨報內容...");

  // 啟用 Google Search Grounding，讓 Gemini 可以搜尋即時資訊
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    tools: [{ googleSearch: {} }],
  });

  const prompt = `
你是 Ruby 的每日晨報助理。今天是 ${dateStr}，台灣時間早上 07:30。
Ruby 是一位正在轉職的前端工程師，喜歡旅遊和投資，希望快速掌握每天的重點資訊。

以下是今日即時市場數據（已從 Yahoo Finance 取得，請直接使用這些數字）：

${stockTable}

---

請使用 Google Search 搜尋最新資訊，完成以下晨報各區塊，全程使用繁體中文。
回傳格式：純 HTML（使用 inline CSS），可直接放入 email，不需要 \`\`\`html 包裹。

---

請依序輸出以下六個區塊，每個區塊用此格式：

<div style="margin-bottom:32px;">
  <h2 style="font-size:17px;font-weight:700;color:#1e293b;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f1f5f9;">
    [圖示] 區塊標題
  </h2>
  [內容]
</div>
<hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 32px;">

---

【區塊一】📰 今日財經頭條
搜尋今日台股、美股、ETF 相關新聞，挑選 3–5 則最重要的。
每則格式：
<p style="margin:0 0 12px;line-height:1.7;">
  <strong style="color:#1e293b;">• 新聞標題</strong><br>
  <span style="color:#475569;font-size:14px;">1–2 句重點摘要</span>
</p>

【區塊二】📈 台股大盤解讀
根據上方提供的台灣加權指數數據，說明昨日大盤表現。
從「長期投資人」角度解讀這個漲跌的意義。若有明顯異動，說明可能原因。
用 2–3 段，每段 2–3 句話。
重要數字用 <strong style="color:#16a34a;">綠色</strong>（漲）或 <strong style="color:#dc2626;">紅色</strong>（跌）標示。

【區塊三】💻 前端生態系新聞
搜尋本週 React、Vite、Next.js、TypeScript 最新動態或社群熱議，整理 1–2 則。
格式同區塊一。

【區塊四】🧠 今日 JS / React 概念複習
出一個中等難度的 JavaScript 或 React 概念題。格式：
<p style="margin:0 0 8px;"><strong>題目：</strong>[題目描述]</p>
<pre style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;font-size:13px;overflow-x:auto;">[程式碼範例（如有）]</pre>
<p style="margin:8px 0;"><strong>解答：</strong>[答案]</p>
<p style="margin:8px 0;color:#475569;font-size:14px;"><strong>說明：</strong>[簡短解釋，2–3 句]</p>

【區塊五】🌤 台北今日天氣
搜尋台北今日天氣預報，提供：
- 天氣概況與氣溫區間
- 是否需要帶傘
- 一句穿搭建議

【區塊六】🎯 今日一個小目標
根據今天是星期幾（${dateStr}），推薦一件 15 分鐘內可完成的成長小事（學習或生活皆可）。
要具體、可執行，不要太泛泛。
`.trim();

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // 移除可能存在的 markdown code fence
  return text.replace(/^```html\s*/i, "").replace(/\s*```\s*$/, "").trim();
}
