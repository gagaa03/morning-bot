// 從 Yahoo Finance 抓取股票資料（完全免費，不需要 API key）

interface StockResult {
  name: string;
  price: string;
  change: string;
  changePercent: string;
  isUp: boolean;
}

const SYMBOLS: Record<string, string> = {
  "^TWII": "台灣加權指數",
  "^DJI": "道瓊工業指數",
  "^GSPC": "S&P 500",
  "USDTWD=X": "美元/台幣匯率",
};

async function fetchOne(symbol: string): Promise<StockResult | null> {
  try {
    const encoded = encodeURIComponent(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=2d`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json",
      },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      chart: {
        result: Array<{
          meta: {
            regularMarketPrice: number;
            previousClose: number;
            currency: string;
          };
        }>;
      };
    };

    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice;
    const prev = meta.previousClose;
    const change = price - prev;
    const changePercent = (change / prev) * 100;
    const isUp = change >= 0;

    // 匯率只需要顯示到小數點第 2 位，指數顯示到整數
    const isRate = symbol === "USDTWD=X";
    const formatPrice = isRate ? price.toFixed(3) : price.toLocaleString("en-US", { maximumFractionDigits: 2 });
    const formatChange = `${isUp ? "+" : ""}${change.toFixed(2)}`;
    const formatPct = `${isUp ? "+" : ""}${changePercent.toFixed(2)}%`;

    return {
      name: SYMBOLS[symbol],
      price: formatPrice,
      change: formatChange,
      changePercent: formatPct,
      isUp,
    };
  } catch (err) {
    console.warn(`⚠️ 無法取得 ${symbol} 資料:`, err);
    return null;
  }
}

export async function fetchAllStocks(): Promise<string> {
  console.log("📊 正在抓取股票資料...");

  const results = await Promise.all(
    Object.keys(SYMBOLS).map((sym) => fetchOne(sym))
  );

  // 整理成 Gemini 能讀懂的文字表格
  const rows = Object.keys(SYMBOLS).map((sym, i) => {
    const r = results[i];
    if (!r) return `| ${SYMBOLS[sym]} | 資料取得失敗 | - | - |`;
    const arrow = r.isUp ? "▲" : "▼";
    return `| ${r.name} | ${r.price} | ${arrow} ${r.change} | ${r.changePercent} |`;
  });

  return `
| 名稱 | 最新價格 | 漲跌 | 漲跌幅 |
|------|---------|------|--------|
${rows.join("\n")}
`.trim();
}
