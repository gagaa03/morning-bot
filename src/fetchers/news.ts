// 從 newsdata.io 抓取新聞（財經 & 前端科技）

interface NewsArticle {
  title: string;
  description: string | null;
  link: string;
  source_id: string;
}

interface NewsdataResponse {
  status: string;
  results: NewsArticle[];
}

async function fetchNews(params: Record<string, string>): Promise<NewsArticle[]> {
  try {
    const apiKey = process.env.NEWSDATA_API_KEY;
    const query = new URLSearchParams({ apikey: apiKey!, ...params }).toString();
    const url = `https://newsdata.io/api/1/news?${query}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`⚠️ newsdata.io 回傳 ${res.status}，略過此區塊`);
      return [];
    }

    const data = (await res.json()) as NewsdataResponse;
    if (data.status !== "success") {
      console.warn("⚠️ newsdata.io 回傳非 success，略過此區塊");
      return [];
    }

    return data.results ?? [];
  } catch (err) {
    console.warn("⚠️ newsdata.io 連線失敗，略過此區塊:", err);
    return [];
  }
}

function renderArticles(articles: NewsArticle[]): string {
  if (articles.length === 0) {
    return `<p style="color:#94a3b8;font-size:14px;">目前暫無最新資訊</p>`;
  }
  return articles
    .slice(0, 5)
    .map(
      (a) => `
<p style="margin:0 0 12px;line-height:1.7;">
  <strong style="color:#1e293b;">• ${a.title}</strong><br>
  <span style="color:#475569;font-size:14px;">${a.description ? a.description.slice(0, 120) + (a.description.length > 120 ? "…" : "") : "（無摘要）"}</span>
</p>`
    )
    .join("");
}

export async function fetchFinanceNewsRaw(): Promise<{ title: string; description: string | null }[]> {
  console.log("📰 正在抓取財經新聞...");
  const articles = await fetchNews({
    country: "tw",
    language: "zh",
    category: "business",
    size: "5",
  });
  return articles.slice(0, 5).map((a) => ({ title: a.title, description: a.description }));
}

export async function fetchFinanceNewsSection(): Promise<string> {
  const articles = await fetchFinanceNewsRaw();
  return `
<div style="margin-bottom:32px;">
  <h2 style="font-size:17px;font-weight:700;color:#1e293b;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f1f5f9;">
    📰 今日財經頭條
  </h2>
  ${renderArticles(articles.map((a) => ({ ...a, link: "", source_id: "" })))}
</div>
<hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 32px;">
`.trim();
}

export async function fetchTechNewsRaw(): Promise<{ title: string; description: string | null }[]> {
  console.log("💻 正在抓取前端科技新聞...");
  const articles = await fetchNews({
    language: "en",
    category: "technology",
    q: '"React" OR "Next.js" OR "TypeScript" OR "Vite" OR "Vue.js" OR "Tailwind CSS" OR "web developer"',
    size: "5",
  });
  return articles.slice(0, 3).map((a) => ({ title: a.title, description: a.description }));
}

export async function fetchGlobalNewsRaw(): Promise<{ title: string; description: string | null }[]> {
  console.log("🌍 正在抓取全球新聞...");
  const articles = await fetchNews({
    language: "en",
    category: "world,business,politics",
    size: "5",
  });
  return articles.slice(0, 5).map((a) => ({ title: a.title, description: a.description }));
}

export async function fetchWatchlistNewsRaw(): Promise<{ title: string; description: string | null }[]> {
  console.log("⭐ 正在抓取自選股新聞...");
  const articles = await fetchNews({
    country: "tw",
    language: "zh",
    q: "台積電 OR 台達電 OR 鈊象 OR 元大台灣50 OR 2330 OR 2308 OR 3293 OR 0050",
    size: "5",
  });
  return articles.slice(0, 5).map((a) => ({ title: a.title, description: a.description }));
}

export async function fetchThemeNewsRaw(): Promise<{ title: string; description: string | null }[]> {
  console.log("🔥 正在抓取產業主題新聞...");
  const articles = await fetchNews({
    country: "tw",
    language: "zh",
    q: "AI OR 半導體 OR 電動車 OR 伺服器 OR 散熱 OR 輝達 OR CoWoS OR HBM OR 機器人",
    size: "5",
  });
  return articles.slice(0, 5).map((a) => ({ title: a.title, description: a.description }));
}
