import "dotenv/config";
// Node 16 沒有內建 fetch，用 node-fetch polyfill
import fetch from "node-fetch";
(globalThis as unknown as Record<string, unknown>).fetch = fetch;
import { fetchAllStocks } from "./fetchers/stocks.js";
import { generateMorningReport } from "./ai/gemini.js";
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

  const stockTable = await fetchAllStocks();
  const content = await generateMorningReport(dateStr, stockTable);
  await sendMorningReport(dateStr, content);

  console.log("🎉 完成！");
}

main().catch((err) => {
  console.error("❌ 執行失敗:", err);
  process.exit(1);
});
