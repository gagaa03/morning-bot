/**
 * index.ts — 主程式
 *
 * 執行流程：
 * 1. 從 Yahoo Finance 抓即時股票數據（不需要 API key）
 * 2. 把股票數據 + 你的晨報需求傳給 Gemini（啟用 Google Search）
 * 3. Gemini 搜尋今日新聞、天氣、前端動態，生成 HTML 內容
 * 4. 用 nodemailer 包成完整 email，透過 Gmail 寄出
 */

import "dotenv/config";
import { fetchAllStocks } from "./fetchers/stocks.js";
import { generateMorningReport } from "./ai/gemini.js";
import { sendMorningReport } from "./email/send.js";

function getTaiwanDateStr(): string {
  // 台灣時間（UTC+8）
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

  // Step 1：抓股票數據
  const stocks = await fetchAllStocks();

  // Step 2：呼叫 Gemini 生成晨報內容
  const reportContent = await generateMorningReport(dateStr, stocks);

  // Step 3：寄出 email
  await sendMorningReport(dateStr, reportContent);

  console.log("🎉 完成！");
}

main().catch((err) => {
  console.error("❌ 執行失敗:", err);
  process.exit(1);
});
