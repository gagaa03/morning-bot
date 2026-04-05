// 呼叫 Gemini 2.0 Flash API
// 三個區塊合併成一次呼叫，使用 JSON structured output 防止格式錯誤：
//   1. 台股大盤解讀（根據 Yahoo Finance 數據）
//   2. JS / React 概念複習題
//   3. 今日一個小目標

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const sectionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    stockAnalysis: { type: SchemaType.STRING, description: "台股大盤解讀的 HTML 內容（div 內部，不含外層 div）" },
    jsQuiz:        { type: SchemaType.STRING, description: "JS/React 概念複習的 HTML 內容（div 內部，不含外層 div）" },
    dailyGoal:     { type: SchemaType.STRING, description: "今日一個小目標的 HTML 內容（div 內部，不含外層 div）" },
  },
  required: ["stockAnalysis", "jsQuiz", "dailyGoal"],
};

function wrapSection(icon: string, title: string, content: string): string {
  return `<div style="margin-bottom:32px;">
  <h2 style="font-size:17px;font-weight:700;color:#1e293b;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f1f5f9;">${icon} ${title}</h2>
  ${content}
</div>
<hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 32px;">`;
}

export async function generateDailyEmailContent(
  dateStr: string,
  stockTable: string
): Promise<{ stockAnalysis: string; jsQuiz: string; dailyGoal: string }> {
  console.log("🤖 Gemini 正在產生今日內容（三合一）...");

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: sectionSchema,
    },
  });

  const prompt = `
今天是 ${dateStr}。請完成以下三個任務，將各區塊的 HTML 內容填入對應 JSON 欄位。
所有內容使用繁體中文，純 HTML + inline CSS，不要用 markdown 或 \`\`\` 包裹。

【任務一：stockAnalysis】
根據以下 Yahoo Finance 數據解讀台股大盤：
${stockTable}
- 從長期投資人角度說明昨日漲跌意義
- 若數據為空或遇週末/假日，直接回傳「<p style="color:#475569;">今日非台股交易日，暫無大盤數據。</p>」
- 重要數字用 <strong style="color:#16a34a;">綠色</strong>（漲）或 <strong style="color:#dc2626;">紅色</strong>（跌）標示
- 2–3 段，每段 2–3 句

【任務二：jsQuiz】
出一道中等難度的 JavaScript 或 React 概念題，格式：
<p style="margin:0 0 8px;"><strong>題目：</strong>[描述]</p>
<pre style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;font-size:13px;overflow-x:auto;">[程式碼（如有）]</pre>
<p style="margin:8px 0;"><strong>解答：</strong>[答案]</p>
<p style="margin:8px 0;color:#475569;font-size:14px;"><strong>說明：</strong>[2–3 句]</p>

【任務三：dailyGoal】
推薦一件 15 分鐘內可完成的具體小事，適合正在轉職的前端工程師。
`.trim();

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text()) as {
    stockAnalysis: string;
    jsQuiz: string;
    dailyGoal: string;
  };

  return {
    stockAnalysis: wrapSection("📈", "台股大盤解讀", parsed.stockAnalysis),
    jsQuiz:        wrapSection("🧠", "今日 JS / React 概念複習", parsed.jsQuiz),
    dailyGoal:     wrapSection("🎯", "今日一個小目標", parsed.dailyGoal),
  };
}
