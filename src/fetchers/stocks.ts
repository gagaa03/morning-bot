// 從 Yahoo Finance 抓取股票資料（完全免費，不需要 API key）

interface StockResult {
  name: string;
  price: string;
  change: string;
  changePercent: string;
  isUp: boolean;
}

interface FetchOneRaw {
  result: StockResult | null;
  regularMarketTime?: number; // Unix timestamp（用於偵測交易日）
}

const SYMBOLS: Record<string, string> = {
  "^TWII": "台灣加權指數",
  "^DJI": "道瓊工業指數",
  "^GSPC": "S&P 500",
  "USDTWD=X": "美元/台幣匯率",
};

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  Accept: "application/json",
};

async function fetchOne(symbol: string): Promise<FetchOneRaw> {
  try {
    const encoded = encodeURIComponent(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=2d`;
    const res = await fetch(url, { headers: FETCH_HEADERS });
    if (!res.ok) return { result: null };

    const data = (await res.json()) as {
      chart: {
        result: Array<{
          meta: {
            regularMarketPrice: number;
            regularMarketTime?: number;
            chartPreviousClose?: number;
            regularMarketPreviousClose?: number;
            previousClose?: number;
            currency: string;
          };
        }>;
      };
    };

    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) return { result: null };

    const regularMarketTime = meta.regularMarketTime;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose ?? meta.regularMarketPreviousClose ?? meta.previousClose;
    const isRate = symbol === "USDTWD=X";
    const formatPrice = isRate
      ? price.toFixed(3)
      : price.toLocaleString("en-US", { maximumFractionDigits: 2 });

    if (!prev || prev === 0) {
      return {
        result: { name: SYMBOLS[symbol], price: formatPrice, change: "–", changePercent: "–", isUp: true },
        regularMarketTime,
      };
    }

    const change = price - prev;
    const changePercent = (change / prev) * 100;
    const isUp = change >= 0;

    return {
      result: {
        name: SYMBOLS[symbol],
        price: formatPrice,
        change: `${isUp ? "+" : ""}${change.toFixed(2)}`,
        changePercent: `${isUp ? "+" : ""}${changePercent.toFixed(2)}%`,
        isUp,
      },
      regularMarketTime,
    };
  } catch (err) {
    console.warn(`⚠️ 無法取得 ${symbol} 資料:`, err);
    return { result: null };
  }
}

// 判斷最後一筆 Yahoo Finance 資料是否為「昨天」的台灣市場收盤
function detectTradingDay(regularMarketTime?: number): {
  isMarketDay: boolean;
  tradingDateLabel: string;
} {
  if (!regularMarketTime) return { isMarketDay: false, tradingDateLabel: "–" };

  // 台灣時間 = UTC+8
  const TW_OFFSET = 8 * 3600 * 1000;
  const marketDate = new Date(regularMarketTime * 1000 + TW_OFFSET);

  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const m = String(marketDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(marketDate.getUTCDate()).padStart(2, "0");
  const label = `${m}/${d}（週${weekdays[marketDate.getUTCDay()]}）`;

  // 昨天的台灣日期
  const now = new Date(Date.now() + TW_OFFSET);
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);

  const isMarketDay =
    marketDate.getUTCFullYear() === yesterday.getUTCFullYear() &&
    marketDate.getUTCMonth() === yesterday.getUTCMonth() &&
    marketDate.getUTCDate() === yesterday.getUTCDate();

  return { isMarketDay, tradingDateLabel: label };
}

export interface StocksData {
  markdown: string;      // 給 Groq 用的文字表格
  isMarketDay: boolean;  // 昨天是否為交易日
  tradingDateLabel: string; // 例如 "04/11（週五）"
}

export async function fetchAllStocks(): Promise<StocksData> {
  console.log("📊 正在抓取股票資料...");

  const symbols = Object.keys(SYMBOLS);
  const raws = await Promise.all(symbols.map((sym) => fetchOne(sym)));

  // 用台灣加權指數的時間戳判斷交易日
  const twiiRaw = raws[symbols.indexOf("^TWII")];
  const { isMarketDay, tradingDateLabel } = detectTradingDay(twiiRaw.regularMarketTime);

  const rows = symbols.map((sym, i) => {
    const r = raws[i].result;
    if (!r) return `| ${SYMBOLS[sym]} | 資料取得失敗 | - | - |`;
    const arrow = r.isUp ? "▲" : "▼";
    return `| ${r.name} | ${r.price} | ${arrow} ${r.change} | ${r.changePercent} |`;
  });

  const markdown = `
| 名稱 | 最新價格 | 漲跌 | 漲跌幅 |
|------|---------|------|--------|
${rows.join("\n")}
`.trim();

  return { markdown, isMarketDay, tradingDateLabel };
}

export async function fetchStocksSection(
  isMarketDay: boolean,
  tradingDateLabel: string
): Promise<string> {
  const symbols = Object.keys(SYMBOLS);
  const raws = await Promise.all(symbols.map((sym) => fetchOne(sym)));

  const statusNote = isMarketDay
    ? `<span style="color:#94a3b8;font-size:12px;font-weight:400;margin-left:8px;">${tradingDateLabel} 收盤</span>`
    : `<span style="color:#f59e0b;font-size:12px;font-weight:400;margin-left:8px;">⚠️ ${tradingDateLabel} 收盤（昨日休市）</span>`;

  const rows = symbols.map((sym, i) => {
    const r = raws[i].result;
    if (!r) {
      return `<tr><td style="padding:8px 12px;color:#1e293b;">${SYMBOLS[sym]}</td><td colspan="3" style="padding:8px 12px;color:#94a3b8;">資料取得失敗</td></tr>`;
    }
    const color = r.isUp ? "#16a34a" : "#dc2626";
    const arrow = r.isUp ? "▲" : "▼";
    return `<tr>
  <td style="padding:8px 12px;color:#1e293b;font-weight:500;">${r.name}</td>
  <td style="padding:8px 12px;font-weight:700;color:#1e293b;">${r.price}</td>
  <td style="padding:8px 12px;color:${color};">${arrow} ${r.change}</td>
  <td style="padding:8px 12px;color:${color};">${r.changePercent}</td>
</tr>`.trim();
  });

  return `
<div style="margin-bottom:32px;">
  <h2 style="font-size:17px;font-weight:700;color:#1e293b;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f1f5f9;">
    📊 市場快訊 ${statusNote}
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
