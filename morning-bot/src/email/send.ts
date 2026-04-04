import nodemailer from "nodemailer";

function buildEmailHtml(dateStr: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:20px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans TC',Arial,sans-serif;">
  <div style="max-width:680px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);border-radius:12px 12px 0 0;padding:32px 40px;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 6px;letter-spacing:1px;text-transform:uppercase;">Morning Brief</p>
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">🌅 每日晨報</h1>
      <p style="color:#7dd3fc;margin:8px 0 0;font-size:14px;">${dateStr} · Ruby 早安，新的一天開始了</p>
    </div>
    <div style="background:#fff;padding:36px 40px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      ${content}
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:16px 40px;">
      <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.6;">
        由晨間機器人自動生成 · 資料來源：Yahoo Finance、Google Search、Gemini 2.0 Flash<br>
        市場數據僅供參考，不構成投資建議。
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendMorningReport(dateStr: string, content: string): Promise<void> {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, TO_EMAIL } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !TO_EMAIL) {
    throw new Error("缺少環境變數：請確認 GMAIL_USER、GMAIL_APP_PASSWORD、TO_EMAIL 都已設定");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from: `"每日晨報機器人 🌅" <${GMAIL_USER}>`,
    to: TO_EMAIL,
    subject: `🌅 每日晨報 - ${dateStr}`,
    html: buildEmailHtml(dateStr, content),
  });

  console.log(`✅ 晨報已寄送至 ${TO_EMAIL}`);
}
