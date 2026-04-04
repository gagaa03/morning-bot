/**
 * Gemini 2.0 Flash + Google Search Grounding
 * Search Grounding = Gemini 可以即時搜尋 Google，抓今日新聞、天氣、前端動態
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateMorningReport(dateStr: string, stockTable: string): Promise<string> {
  console.log("🤖 正在呼叫 Gemini，產生晨報內容...");

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: [{ googleSearch: {} }],
  });

  const prompt = `
你是 Ruby 的每日晨報助理。今天是 ${dateStr}，台灣時間早上 07:30。
Ruby 是一位正在轉職的前端工程師，喜歡旅遊和投資，希望快速掌握每天的重點資訊。

以下是今日即時市場數據（已從 Yahoo Finance 取得，請直接使用這些數字）：

${stockTable}

---

請使用 Google Search 搜尋最新資訊，完成以下晨報內容，全程使用繁體中文。
回傳格式：純 HTML（使用 inline CSS），可直接放入 email body，不需要 \`\`\`html 包裹，不需要 <html>/<body> 標籤。

每個區塊格式：
<div style="margin-bottom:28px;">
  <h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f1f5f9;">圖示 標題</h2>
  內容
</div>
<hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 28px;">

---

【區塊一】📰 今日財經頭條
搜尋今日台股、美股、ETF 相關新聞，挑選 3–5 則最重要的。
每則：<p style="margin:0 0 10px;line-height:1.7;"><strong style="color:#1e293b;">• 標題</strong><br><span style="color:#475569;font-size:14px;">1–2 句摘要</span></p>

【區塊二】📊 每日市場快訊
直接使用上方提供的股票數據，整理成 HTML 表格：
<table style="width:100%;border-collapse:collapse;font-size:14px;">
  <thead><tr style="background:#f8fafc;">
    <th style="padding:8px 12px;text-align:left;color:#64748b;border-bottom:2px solid #e2e8f0;">指數／標的</th>
    <th style="padding:8px 12px;text-align:right;color:#64748b;border-bottom:2px solid #e2e8f0;">價格</th>
    <th style="padding:8px 12px;text-align:right;color:#64748b;border-bottom:2px solid #e2e8f0;">漲跌</th>
    <th style="padding:8px 12px;text-align:right;color:#64748b;border-bottom:2px solid #e2e8f0;">漲跌幅</th>
  </tr></thead>
  <tbody><!-- 每列用綠色(#16a34a)或紅色(#dc2626)標示漲跌 --></tbody>
</table>

【區塊三】📈 台股大盤解讀
根據台灣加權指數數據，說明昨日大盤表現。從「長期投資人」角度解讀意義。若有明顯異動說明原因。2–3 段，每段 2–3 句。漲跌數字用對應顏色 <strong style="color:#16a34a/或#dc2626"> 標示。

【區塊四】💻 前端生態系新聞
搜尋本週 React、Vite、Next.js、TypeScript 最新動態，整理 1–2 則，格式同區塊一。

【區塊五】🧠 今日 JS / React 概念複習
出一個中等難度題目：
<p style="margin:0 0 8px;"><strong>題目：</strong>描述</p>
<pre style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;font-size:13px;overflow-x:auto;white-space:pre-wrap;">程式碼</pre>
<p style="margin:8px 0;"><strong>解答：</strong>答案</p>
<p style="margin:8px 0;color:#475569;font-size:14px;"><strong>說明：</strong>2–3 句解釋</p>

【區塊六】🌤 台北今日天氣
搜尋台北今日天氣：概況、氣溫、是否帶傘、一句穿搭建議。

【區塊七】🎯 今日一個小目標
根據今天星期幾，推薦一件 15 分鐘內可完成的成長小事，要具體可執行。
`.trim();

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return text.replace(/^```html\s*/i, "").replace(/\s*```\s*$/, "").trim();
}
