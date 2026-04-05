/**
 * index.ts — 主程式
 *
 * 執行流程：
 * 1. 並行抓取：Yahoo Finance 股票、OpenWeatherMap 天氣、newsdata.io 新聞（台灣+全球+前端）
 * 2. 一次呼叫 Groq（六合一）生成：財經摘要、全球新聞、大盤解讀、前端新聞、JS題、名言
 * 3. 組裝所有 HTML 區塊，透過 Gmail 寄出
 */

import "dotenv/config";
import { fetchAllStocks, fetchStocksSection } from "./fetchers/stocks.js";
import { fetchWeatherSection } from "./fetchers/weather.js";
import { fetchFinanceNewsRaw, fetchGlobalNewsRaw, fetchTechNewsRaw } from "./fetchers/news.js";
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

  // Step 1：並行抓取所有即時資料
  const [stockMarkdown, stocksSection, weatherSection, financeArticles, globalArticles, techArticles] =
    await Promise.all([
      fetchAllStocks(),
      fetchStocksSection(),
      fetchWeatherSection(),
      fetchFinanceNewsRaw(),
      fetchGlobalNewsRaw(),
      fetchTechNewsRaw(),
    ]);

  // Step 2：一次呼叫 Groq（六合一）
  const { financeNews, globalNews, stockAnalysis, techNews, jsQuiz, inspiration } =
    await generateDailyEmailContent(dateStr, stockMarkdown, financeArticles, globalArticles, techArticles);

  // Step 3：依序組裝 email 內容
  const content = [
    financeNews,      // 📰 今日財經頭條（AI 摘要 + 自選股警示）
    globalNews,       // 🌍 全球重要新聞
    stocksSection,    // 📊 市場快訊（表格）
    stockAnalysis,    // 📈 台股大盤解讀
    techNews,         // 💻 前端生態系新聞（翻譯 + 摘要）
    weatherSection,   // 🌤 台北今日天氣
    jsQuiz,           // 🧠 JS / React 概念複習
    inspiration,      // 📖 今日名言佳句
  ].join("\n");

  // Step 4：寄出
  await sendMorningReport(dateStr, content);

  console.log("🎉 完成！");
}

main().catch((err) => {
  console.error("❌ 執行失敗:", err);
  process.exit(1);
});
