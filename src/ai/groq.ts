// 使用 Groq API（Llama 3.3 70B）— 六合一 prompt
// 負責六個區塊：
//   1. 財經頭條（摘要 + 自選股警示）
//   2. 全球重要新聞（翻譯 + 摘要）
//   3. 台股大盤解讀
//   4. 前端生態系新聞（翻譯 + 摘要）
//   5. JS / React 概念複習
//   6. 名言佳句

import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 自選股清單
const WATCHLIST = [
  { code: "0050", name: "元大台灣50" },
  { code: "2330", name: "台積電" },
  { code: "2308", name: "台達電" },
  { code: "3293", name: "鈊象電子" },
];

function wrapSection(icon: string, title: string, content: string): string {
  return `<div style="margin-bottom:32px;">
  <h2 style="font-size:17px;font-weight:700;color:#1e293b;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f1f5f9;">${icon} ${title}</h2>
  ${content}
</div>
<hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 32px;">`;
}

function articlesToText(articles: { title: string; description: string | null }[]): string {
  return articles
    .map((a, i) => `${i + 1}. 標題：${a.title}\n   摘要：${a.description ?? "（無）"}`)
    .join("\n");
}

type RawArticle = { title: string; description: string | null };

export async function generateDailyEmailContent(
  dateStr: string,
  stockTable: string,
  financeArticles: RawArticle[],
  globalArticles: RawArticle[],
  techArticles: RawArticle[]
): Promise<{
  financeNews: string;
  globalNews: string;
  stockAnalysis: string;
  techNews: string;
  jsQuiz: string;
  inspiration: string;
}> {
  console.log("🤖 Groq 正在產生今日內容（六合一）...");

  const watchlistStr = WATCHLIST.map((s) => `${s.code} ${s.name}`).join("、");

  const prompt = `今天是 ${dateStr}。請完成以下六個任務，回傳純 JSON，欄位為 financeNews、globalNews、stockAnalysis、techNews、jsQuiz、inspiration。
所有內容使用繁體中文，值為純 HTML + inline CSS，不要用 markdown 或 \`\`\` 包裹。

【任務一：financeNews】
整理以下台灣財經新聞為 3-5 則重點摘要，每則 1-2 句：
${articlesToText(financeArticles)}
另外，若有任何新聞涉及自選股（${watchlistStr}），請在該則新聞前加上：
<span style="background:#fef3c7;color:#92400e;font-size:12px;padding:2px 6px;border-radius:4px;margin-right:6px;">⭐ 自選股</span>
格式：<p style="margin:0 0 12px;line-height:1.7;"><strong style="color:#1e293b;">• [新聞標題]</strong><br><span style="color:#475569;font-size:14px;">[1-2句重點]</span></p>

【任務二：globalNews】
將以下英文全球新聞翻譯成繁體中文並整理為 3-5 則重點摘要：
${articlesToText(globalArticles)}
格式同任務一。

【任務三：stockAnalysis】
根據以下 Yahoo Finance 數據解讀台股大盤（長期投資人角度，2-3段）：
${stockTable}
若數據為空或遇週末/假日，回傳：<p style="color:#475569;">今日非台股交易日，暫無大盤數據。</p>
重要數字用 <strong style="color:#16a34a;">綠色</strong>（漲）或 <strong style="color:#dc2626;">紅色</strong>（跌）標示。

【任務四：techNews】
將以下英文前端技術新聞翻譯成繁體中文並整理為 2-3 則摘要：
${articlesToText(techArticles)}
格式同任務一。

【任務五：jsQuiz】
出一道中等難度的 JavaScript 或 React 概念題，格式：
<p style="margin:0 0 8px;"><strong>題目：</strong>描述</p>
<pre style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;font-size:13px;overflow-x:auto;">程式碼</pre>
<p style="margin:8px 0;"><strong>解答：</strong>答案</p>
<p style="margin:8px 0;color:#475569;font-size:14px;"><strong>說明：</strong>2-3句</p>

【任務六：inspiration】
提供一句經典名言佳句（書籍或名人語錄），必須附上作者姓名和出處書名，格式：
<blockquote style="border-left:4px solid #e2e8f0;margin:0;padding:12px 20px;color:#475569;font-style:italic;font-size:15px;line-height:1.8;">「名言內容」</blockquote>
<p style="margin:8px 0 0;font-size:13px;color:#94a3b8;">— 作者姓名，《書名》</p>`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "你是一個每日晨報助理，只回傳純 JSON，不加任何說明文字。",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const parsed = JSON.parse(completion.choices[0].message.content!) as {
    financeNews: string;
    globalNews: string;
    stockAnalysis: string;
    techNews: string;
    jsQuiz: string;
    inspiration: string;
  };

  return {
    financeNews:   wrapSection("📰", "今日財經頭條", parsed.financeNews),
    globalNews:    wrapSection("🌍", "全球重要新聞", parsed.globalNews),
    stockAnalysis: wrapSection("📈", "台股大盤解讀", parsed.stockAnalysis),
    techNews:      wrapSection("💻", "前端生態系新聞", parsed.techNews),
    jsQuiz:        wrapSection("🧠", "今日 JS / React 概念複習", parsed.jsQuiz),
    inspiration:   wrapSection("📖", "今日名言佳句", parsed.inspiration),
  };
}
