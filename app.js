// Default location: Boca Raton, FL
const DEFAULT = { name: "Boca Raton", lat: 26.3683, lon: -80.1289 };

// WMO weather codes -> [description, icon]
const CODES = {
  0: ["Clear", "☀️"], 1: ["Mostly Clear", "🌤️"], 2: ["Partly Cloudy", "⛅"], 3: ["Cloudy", "☁️"],
  45: ["Fog", "🌫️"], 48: ["Fog", "🌫️"],
  51: ["Light Drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy Drizzle", "🌧️"],
  56: ["Freezing Drizzle", "🌧️"], 57: ["Freezing Drizzle", "🌧️"],
  61: ["Light Rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy Rain", "🌧️"],
  66: ["Freezing Rain", "🌧️"], 67: ["Freezing Rain", "🌧️"],
  71: ["Light Snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy Snow", "❄️"], 77: ["Snow Grains", "🌨️"],
  80: ["Showers", "🌦️"], 81: ["Showers", "🌧️"], 82: ["Heavy Showers", "⛈️"],
  85: ["Snow Showers", "🌨️"], 86: ["Snow Showers", "❄️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm", "⛈️"], 99: ["Thunderstorm", "⛈️"],
};
const wx = (code) => CODES[code] || ["—", "🌡️"];
const $ = (id) => document.getElementById(id);
const round = (n) => Math.round(n);

async function loadWeather({ name, lat, lon }) {
  $("city").textContent = name;
  $("desc").textContent = "Loading…";

  const url = "https://api.open-meteo.com/v1/forecast?" + new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,uv_index",
    hourly: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: 7,
  });

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    render(await res.json());
  } catch (err) {
    $("desc").textContent = "Couldn't load weather";
    console.error(err);
  }
}

function render(data) {
  const c = data.current;
  const d = data.daily;
  const [desc] = wx(c.weather_code);

  $("temp").textContent = `${round(c.temperature_2m)}°`;
  $("desc").textContent = desc;
  $("hilo").textContent = `H:${round(d.temperature_2m_max[0])}°  L:${round(d.temperature_2m_min[0])}°`;
  $("feels").textContent = `${round(c.apparent_temperature)}°`;
  $("humidity").textContent = `${c.relative_humidity_2m}%`;
  $("wind").textContent = `${round(c.wind_speed_10m)} mph`;
  $("uv").textContent = round(c.uv_index ?? 0);

  // Next 24 hours, starting from the current hour
  const h = data.hourly;
  const start = Math.max(0, h.time.findIndex((t) => t >= c.time.slice(0, 13)));
  $("hourly").innerHTML = h.time.slice(start, start + 24).map((t, i) => {
    const idx = start + i;
    const hour = new Date(t).getHours();
    const label = i === 0 ? "Now" : `${hour % 12 || 12}${hour < 12 ? "a" : "p"}`;
    return `<div class="hour"><span>${label}</span><span class="icon">${wx(h.weather_code[idx])[1]}</span><span>${round(h.temperature_2m[idx])}°</span></div>`;
  }).join("");

  $("daily").innerHTML = d.time.map((t, i) => {
    const day = i === 0 ? "Today" : new Date(t + "T12:00").toLocaleDateString("en-US", { weekday: "short" });
    return `<li><span>${day}</span><span class="icon">${wx(d.weather_code[i])[1]}</span>
      <span class="range"><span class="lo">${round(d.temperature_2m_min[i])}°</span>${round(d.temperature_2m_max[i])}°</span></li>`;
  }).join("");
}

// City search via Open-Meteo geocoding
$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("query").value.trim();
  if (!q) return;
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(q)}`);
    const { results } = await res.json();
    if (!results?.length) {
      $("desc").textContent = "City not found";
      return;
    }
    const r = results[0];
    loadWeather({ name: r.name, lat: r.latitude, lon: r.longitude });
    $("query").value = "";
    $("query").blur();
  } catch (err) {
    $("desc").textContent = "Search failed";
    console.error(err);
  }
});

loadWeather(DEFAULT);
