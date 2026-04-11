// 從台灣證券交易所（TWSE）抓取免費公開資料
// 不需要 API key，完全免費

const WATCHLIST = ["0050", "2330", "2308", "3293"];
const WATCHLIST_NAMES: Record<string, string> = {
  "0050": "元大台灣50",
  "2330": "台積電",
  "2308": "台達電",
  "3293": "鈊象電子",
};

const TWSE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  Accept: "application/json",
  Referer: "https://www.twse.com.tw/",
};

// ── 大盤三大法人買賣超 ──────────────────────────────────────────
export interface InstitutionalData {
  foreign: string;   // 外資買賣超（億元）
  trust: string;     // 投信買賣超（億元）
  dealer: string;    // 自營商買賣超（億元）
  total: string;     // 合計（億元）
}

export async function fetchInstitutional(): Promise<InstitutionalData | null> {
  try {
    const res = await fetch(
      "https://www.twse.com.tw/rwd/zh/fund/BFI82U?response=json",
      { headers: TWSE_HEADERS }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      stat: string;
      data: string[][];
    };

    if (data.stat !== "OK" || !data.data) return null;

    // 找到「合計」那行，以及外資、投信、自營商各自的數字
    const toYi = (str: string) =>
      (parseInt(str.replace(/,/g, ""), 10) / 1e8).toFixed(1);

    let foreign = "–", trust = "–", dealer = "–", total = "–";

    for (const row of data.data) {
      const name = row[0];
      const diff = row[3]; // 買賣差額
      if (name.includes("外資及陸資(不含自營商)") || name === "外資及陸資") {
        foreign = toYi(diff);
      } else if (name === "投信") {
        trust = toYi(diff);
      } else if (name.includes("自營商(自行買賣)")) {
        dealer = toYi(diff);
      } else if (name === "合計") {
        total = toYi(diff);
      }
    }

    return { foreign, trust, dealer, total };
  } catch {
    return null;
  }
}

// ── 大盤成交量 + 漲跌家數 ────────────────────────────────────────
export interface MarketVolumeData {
  totalAmount: string;  // 總成交金額（億元）
  upCount: string;      // 上漲家數
  downCount: string;    // 下跌家數
  upLimit: string;      // 漲停家數
  downLimit: string;    // 跌停家數
}

export async function fetchMarketVolume(): Promise<MarketVolumeData | null> {
  try {
    const res = await fetch(
      "https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?response=json",
      { headers: TWSE_HEADERS }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      stat: string;
      tables: Array<{
        title: string;
        data: string[][];
        fields: string[];
      }>;
    };

    if (data.stat !== "OK" || !data.tables) return null;

    let totalAmount = "–", upCount = "–", downCount = "–", upLimit = "–", downLimit = "–";

    for (const table of data.tables) {
      // 成交金額統計
      if (table.title?.includes("成交") && table.data) {
        for (const row of table.data) {
          if (row[0]?.includes("總") || row[0]?.includes("合計")) {
            const amt = parseInt((row[1] ?? row[2] ?? "").replace(/,/g, ""), 10);
            if (!isNaN(amt)) totalAmount = (amt / 1e8).toFixed(0) + " 億";
          }
        }
      }
      // 漲跌家數
      if (table.title?.includes("漲跌") && table.data) {
        for (const row of table.data) {
          if (row[0]?.includes("上漲")) {
            upCount = row[1] ?? "–";
            upLimit = row[2] ?? "–";
          } else if (row[0]?.includes("下跌")) {
            downCount = row[1] ?? "–";
            downLimit = row[2] ?? "–";
          }
        }
      }
    }

    return { totalAmount, upCount, downCount, upLimit, downLimit };
  } catch {
    return null;
  }
}

// ── 自選股外資買賣超 ──────────────────────────────────────────────
export interface WatchlistStock {
  code: string;
  name: string;
  foreignBuySell: string; // 外資買賣超（張）
  isNetBuy: boolean;
}

export async function fetchWatchlistForeign(): Promise<WatchlistStock[]> {
  try {
    const res = await fetch(
      "https://www.twse.com.tw/rwd/zh/fund/TWT38U?response=json",
      { headers: TWSE_HEADERS }
    );
    if (!res.ok) return [];

    const data = (await res.json()) as {
      stat: string;
      data: string[][];
    };

    if (data.stat !== "OK" || !data.data) return [];

    const results: WatchlistStock[] = [];

    for (const row of data.data) {
      const code = row[1]?.trim();  // row[0] 是空格，代號在 row[1]
      if (WATCHLIST.includes(code)) {
        // 欄位：[空格, 代號, 名稱, 外資買進, 外資賣出, 外資買賣超, 陸資買進, 陸資賣出, 陸資買賣超, 合計買進, 合計賣出, 合計買賣超]
        const buySellShares = parseInt((row[5] ?? "0").replace(/,/g, ""), 10);
        const buySellLots = Math.round(buySellShares / 1000); // 轉換為張
        const isNetBuy = buySellLots >= 0;
        results.push({
          code,
          name: WATCHLIST_NAMES[code] ?? row[1]?.trim(),
          foreignBuySell: `${isNetBuy ? "+" : ""}${buySellLots.toLocaleString()} 張`,
          isNetBuy,
        });
      }
    }

    // 按自選股順序排序
    return WATCHLIST
      .map((code) => results.find((r) => r.code === code))
      .filter((r): r is WatchlistStock => !!r);
  } catch {
    return [];
  }
}

// ── 組合成文字供 Groq 解讀 ────────────────────────────────────────
export async function fetchTwseData(): Promise<{
  institutionalText: string;
  marketVolumeText: string;
  watchlistText: string;
}> {
  console.log("🏦 正在抓取 TWSE 三大法人與量能資料...");

  const [institutional, volume, watchlist] = await Promise.all([
    fetchInstitutional(),
    fetchMarketVolume(),
    fetchWatchlistForeign(),
  ]);

  const institutionalText = institutional
    ? `外資：${institutional.foreign} 億　投信：${institutional.trust} 億　自營商：${institutional.dealer} 億　合計：${institutional.total} 億`
    : "三大法人資料暫時無法取得";

  const marketVolumeText = volume
    ? `總成交金額：${volume.totalAmount}　上漲：${volume.upCount} 檔（漲停 ${volume.upLimit} 檔）　下跌：${volume.downCount} 檔（跌停 ${volume.downLimit} 檔）`
    : "大盤量能資料暫時無法取得";

  const watchlistText = watchlist.length > 0
    ? watchlist.map((s) => `${s.code} ${s.name}：外資 ${s.foreignBuySell}`).join("　")
    : "自選股外資資料暫時無法取得";

  return { institutionalText, marketVolumeText, watchlistText };
}
