/**
 * index.ts — 主程式
 *
 * 執行流程：
 * 1. 並行抓取：Yahoo Finance / OpenWeatherMap / newsdata.io / TWSE
 * 2. 一次呼叫 Groq（九合一）生成所有 AI 區塊
 * 3. 組裝 HTML，透過 Gmail 寄出
 */

import "dotenv/config";
import { fetchAllStocks, fetchStocksSection } from "./fetchers/stocks.js";
import { fetchWeatherSection } from "./fetchers/weather.js";
import {
  fetchFinanceNewsRaw,
  fetchGlobalNewsRaw,
  fetchTechNewsRaw,
  fetchWatchlistNewsRaw,
  fetchThemeNewsRaw,
} from "./fetchers/news.js";
import { fetchTwseData } from "./fetchers/twse.js";
import { generateDailyEmailContent } from "./ai/groq.js";
import { sendMorningReport } from "./email/send.js";

function getTaiwanDateStr(): string {
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekday = weekdays[now.getUTCDay()];
  return `${y}年${m}月${d}日（星期${weekday}）`;
}

async function main() {
  console.log("🌅 晨間機器人啟動...");
  const dateStr = getTaiwanDateStr();
  console.log(`📅 今天是 ${dateStr}`);

  // Step 1：先抓股票以得知 isMarketDay
  const stocksData = await fetchAllStocks();
  const { markdown: stockMarkdown, isMarketDay, tradingDateLabel } = stocksData;

  // Step 2：並行抓取其餘資料（TWSE 依交易日決定是否實際呼叫）
  const [
    stocksSection,
    weatherSection,
    financeArticles,
    globalArticles,
    techArticles,
    watchlistNewsArticles,
    themeNewsArticles,
    { institutionalText, marketVolumeText, watchlistText, topGainersText },
  ] = await Promise.all([
    fetchStocksSection(isMarketDay, tradingDateLabel),
    fetchWeatherSection(),
    fetchFinanceNewsRaw(),
    fetchGlobalNewsRaw(),
    fetchTechNewsRaw(),
    fetchWatchlistNewsRaw(),
    fetchThemeNewsRaw(),
    fetchTwseData(isMarketDay),
  ]);

  // Step 3：一次呼叫 Groq（九合一）
  const {
    financeNews,
    globalNews,
    stockAnalysis,
    watchlistAnalysis,
    watchlistNews,
    techNews,
    jsQuiz,
    inspiration,
    themeBuzz,
  } = await generateDailyEmailContent(
    dateStr,
    stockMarkdown,
    financeArticles,
    globalArticles,
    techArticles,
    institutionalText,
    marketVolumeText,
    watchlistText,
    watchlistNewsArticles,
    topGainersText,
    themeNewsArticles,
  );

  // Step 4：依序組裝 email 內容
  const content = [
    financeNews,        // 📰 今日財經頭條
    globalNews,         // 🌍 全球重要新聞
    stocksSection,      // 📊 昨日市場快訊（表格）
    stockAnalysis,      // 📈 台股大盤解讀（含三大法人+量能）
    watchlistAnalysis,  // ⭐ 自選股動態（外資買賣超）
    watchlistNews,      // 📋 自選股近期新聞
    themeBuzz,          // 🔥 市場發燒議題
    techNews,           // 💻 前端生態系新聞
    weatherSection,     // 🌤 台北今日天氣
    jsQuiz,             // 🧠 JS / React 概念複習
    inspiration,        // 📖 今日名言佳句
  ].join("\n");

  // Step 5：寄出
  await sendMorningReport(dateStr, content);

  console.log("🎉 完成！");
}

main().catch((err) => {
  console.error("❌ 執行失敗:", err);
  process.exit(1);
});
