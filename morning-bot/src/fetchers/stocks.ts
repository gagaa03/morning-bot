// 從 Yahoo Finance 抓取股票資料（完全免費，不需要 API key）

const SYMBOLS: Record<string, string> = {
  "^TWII": "台灣加權指數",
  "^DJI": "道瓊工業指數",
  "^GSPC": "S&P 500",
  "USDTWD=X": "美元/台幣匯率",
};

interface StockMeta {
  regularMarketPrice: number;
  previousClose: number;
  chartPreviousClose: number;
  currency: string;
}

async function fetchOne(symbol: string): Promise<string> {
  try {
    const encoded = encodeURIComponent(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=2d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { chart: { result: Array<{ meta: StockMeta }> } };
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) throw new Error("no meta");
    const price = meta.regularMarketPrice;
    const prev = meta.previousClose ?? meta.chartPreviousClose ?? price;
    const change = price - prev;
    const pct = prev !== 0 ? (change / prev) * 100 : 0;
    const isUp = change >= 0;
    const arrow = isUp ? "▲" : "▼";
    const sign = isUp ? "+" : "";
    const priceStr = symbol === "USDTWD=X"
      ? price.toFixed(3)
      : price.toLocaleString("en-US", { maximumFractionDigits: 2 });
    return `| ${SYMBOLS[symbol]} | ${priceStr} | ${arrow} ${sign}${change.toFixed(2)} | ${sign}${pct.toFixed(2)}% |`;
  } catch (err) {
    console.warn(`⚠️ 無法取得 ${symbol}:`, err);
    return `| ${SYMBOLS[symbol]} | 資料取得失敗 | - | - |`;
  }
}

export async function fetchAllStocks(): Promise<string> {
  console.log("📊 正在抓取股票資料...");
  const rows = await Promise.all(Object.keys(SYMBOLS).map(fetchOne));
  return `| 名稱 | 最新價格 | 漲跌 | 漲跌幅 |\n|------|---------|------|--------|\n${rows.join("\n")}`;
}
