// 從 OpenWeatherMap 抓取台北即時天氣

function getWeatherEmoji(weatherId: number): string {
  if (weatherId >= 200 && weatherId < 300) return "⛈";
  if (weatherId >= 300 && weatherId < 400) return "🌦";
  if (weatherId >= 500 && weatherId < 600) return "🌧";
  if (weatherId >= 600 && weatherId < 700) return "❄️";
  if (weatherId >= 700 && weatherId < 800) return "🌫";
  if (weatherId === 800) return "☀️";
  if (weatherId > 800) return "☁️";
  return "🌤";
}

function getOutfitTip(temp: number): string {
  if (temp >= 30) return "短袖即可，外出記得防曬";
  if (temp >= 25) return "輕薄短袖舒適";
  if (temp >= 20) return "薄外套備著以防萬一";
  if (temp >= 15) return "長袖或薄外套";
  return "外套必備，注意保暖";
}

export async function fetchWeatherSection(): Promise<string> {
  console.log("🌤 正在抓取台北天氣...");

  const fallback = `<div style="margin-bottom:32px;">
  <h2 style="font-size:17px;font-weight:700;color:#1e293b;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f1f5f9;">🌤 台北今日天氣</h2>
  <p style="color:#94a3b8;font-size:14px;">天氣資料暫時無法取得，請稍後再試。</p>
</div>
<hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 32px;">`;

  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=Taipei,TW&appid=${apiKey}&units=metric&lang=zh_tw`;

    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`⚠️ OpenWeatherMap 回傳 ${res.status}，略過天氣區塊`);
      return fallback;
    }

    const data = (await res.json()) as {
      weather: Array<{ id: number; description: string }>;
      main: { temp: number; temp_min: number; temp_max: number; humidity: number };
      wind: { speed: number };
    };

    const weatherId = data.weather[0].id;
    const description = data.weather[0].description;
    const temp = Math.round(data.main.temp);
    const tempMin = Math.round(data.main.temp_min);
    const tempMax = Math.round(data.main.temp_max);
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed;
    const emoji = getWeatherEmoji(weatherId);
    const needUmbrella = weatherId >= 200 && weatherId < 700 ? "☂️ 建議攜帶雨傘" : "不需要帶傘";
    const outfitTip = getOutfitTip(temp);

    return `
<div style="margin-bottom:32px;">
  <h2 style="font-size:17px;font-weight:700;color:#1e293b;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f1f5f9;">
    🌤 台北今日天氣
  </h2>
  <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;">
    <span style="font-size:40px;">${emoji}</span>
    <div>
      <p style="margin:0;font-size:22px;font-weight:700;color:#1e293b;">${temp}°C</p>
      <p style="margin:2px 0 0;color:#64748b;font-size:14px;">${description}　${tempMin}°C – ${tempMax}°C</p>
    </div>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:14px;color:#475569;">
    <tr>
      <td style="padding:4px 0;">💧 濕度</td>
      <td style="padding:4px 0;font-weight:600;color:#1e293b;">${humidity}%</td>
      <td style="padding:4px 0;">💨 風速</td>
      <td style="padding:4px 0;font-weight:600;color:#1e293b;">${windSpeed} m/s</td>
    </tr>
    <tr>
      <td style="padding:4px 0;">☂️ 帶傘</td>
      <td style="padding:4px 0;font-weight:600;color:#1e293b;" colspan="3">${needUmbrella}</td>
    </tr>
    <tr>
      <td style="padding:4px 0;">👗 穿搭</td>
      <td style="padding:4px 0;font-weight:600;color:#1e293b;" colspan="3">${outfitTip}</td>
    </tr>
  </table>
</div>
<hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 32px;">
`.trim();
  } catch (err) {
    console.warn("⚠️ OpenWeatherMap 連線失敗，略過天氣區塊:", err);
    return fallback;
  }
}
