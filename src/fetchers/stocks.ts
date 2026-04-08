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
            previousClose?: number;
            chartPreviousClose?: number;
            regularMarketPreviousClose?: number;
            currency: string;
          };
        }>;
      };
    };

    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPreviousClose;
    if (!prev) return null;
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

async function fetchAll(): Promise<(StockResult | null)[]> {
  return Promise.all(Object.keys(SYMBOLS).map((sym) => fetchOne(sym)));
}

export async function fetchAllStocks(): Promise<string> {
  console.log("📊 正在抓取股票資料...");
  const results = await fetchAll();

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

export async function fetchStocksSection(): Promise<string> {
  const results = await fetchAll();

  const rows = Object.keys(SYMBOLS).map((sym, i) => {
    const r = results[i];
    if (!r) {
      return `<tr><td style="padding:8px 12px;color:#1e293b;">${SYMBOLS[sym]}</td><td colspan="3" style="padding:8px 12px;color:#94a3b8;">資料取得失敗</td></tr>`;
    }
    const color = r.isUp ? "#16a34a" : "#dc2626";
    const arrow = r.isUp ? "▲" : "▼";
    return `
<tr>
  <td style="padding:8px 12px;color:#1e293b;font-weight:500;">${r.name}</td>
  <td style="padding:8px 12px;font-weight:700;color:#1e293b;">${r.price}</td>
  <td style="padding:8px 12px;color:${color};">${arrow} ${r.change}</td>
  <td style="padding:8px 12px;color:${color};">${r.changePercent}</td>
</tr>`.trim();
  });

  return `
<div style="margin-bottom:32px;">
  <h2 style="font-size:17px;font-weight:700;color:#1e293b;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f1f5f9;">
    📊 每日市場快訊
  </h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <thead>
      <tr style="background:#f8fafc;">
        <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;">名稱</th>
        <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;">最新價格</th>
        <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;">漲跌</th>
        <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;">漲跌幅</th>
      </tr>
    </thead>
    <tbody>
      ${rows.join("\n      ")}
    </tbody>
  </table>
</div>
<hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 32px;">
`.trim();
}
