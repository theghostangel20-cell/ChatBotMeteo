"use strict";

const path = require("path");
const express = require("express");

require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, "test.env"), override: true });

const PORT = Number(process.env.PORT) || 3000;
const OW_KEY = process.env.OPENWEATHER_API_KEY;

const app = express();
app.use(express.json());

function msToKmh(ms) {
  return Math.round(ms * 3.6 * 10) / 10;
}

function buildAdvice(payload) {
  const main = (payload.weather?.[0]?.main || "").toLowerCase();
  const desc = (payload.weather?.[0]?.description || "").toLowerCase();
  const id = payload.weather?.[0]?.id || 0;
  const temp = payload.main?.temp ?? 0;
  const windMs = payload.wind?.speed ?? 0;
  const windKmh = msToKmh(windMs);

  const tips = [];

  const rainLike =
    main.includes('rain') ||
    main.includes('drizzle') ||
    main.includes('thunderstorm') ||
    (id >= 200 && id < 600);
  if (rainLike) {
    tips.push('Prends ton parapluie, il va pleuvoir — ou au minimum un coupe-vent.');
  }

  if (temp > 35) {
    tips.push('Forte chaleur — hydrate-toi et évite le soleil entre 12h et 15h.');
  } else if (temp < 15) {
    tips.push('Il fait frais — prévois une veste ou une couche en plus.');
  }

  if (windKmh > 50) {
    tips.push('Vent fort — fais attention en extérieur et évite les zones très dégagées.');
  }

  if (
    main === "clear" ||
    id === 800 ||
    desc.includes('dégagé') ||
    desc.includes('clear')
  ) {
    tips.push('Belle journée, profites-en !');
  }

  const fogLike =
    main.includes('mist') ||
    main.includes('fog') ||
    main.includes('haze') ||
    (id >= 701 && id <= 762);
  if (fogLike) {
    tips.push('Visibilité réduite — sois prudent sur la route.');
  }

  if (tips.length === 0) {
    tips.push('Conditions changeantes — garde une couche légère à portée de main.');
  }

  return [...new Set(tips)];
}

function normalizeWeatherResponse(payload) {
  const w = payload.weather?.[0];
  const windKmh = msToKmh(payload.wind?.speed ?? 0);
  const advice = buildAdvice(payload);
  return {
    city: payload.name,
    country: payload.sys?.country || '',
    temp: payload.main?.temp,
    feels_like: payload.main?.feels_like,
    humidity: payload.main?.humidity,
    pressure: payload.main?.pressure,
    wind_ms: payload.wind?.speed,
    wind_kmh: windKmh,
    description: w?.description || '',
    main: w?.main || '',
    weather_id: w?.id,
    icon: w?.icon || '02d',
    coord: payload.coord,
    advice,
    raw_main: w?.main,
  };
}

function getCountryTone(country = '', lang = 'fr') {
  if (lang === 'en') {
    return {
      opener: "Here's what I found",
      tipsLabel: 'Tips',
    };
  }

  const tones = {
    CM: { opener: "Mon frère, voilà la météo", tipsLabel: 'Conseils' },
    CI: { opener: "Mon gars, voilà la météo", tipsLabel: 'Conseils' },
    SN: { opener: "D'accord, voilà la météo", tipsLabel: 'Conseils' },
    FR: { opener: "Ok, voilà la météo", tipsLabel: 'Conseils' },
    BE: { opener: "Une fois, voilà la météo", tipsLabel: 'Conseils' },
    CH: { opener: "Alors, voilà la météo", tipsLabel: 'Conseils' },
    CA: { opener: "Salut, voici la météo", tipsLabel: 'Conseils' },
    MA: { opener: "Safi, voilà la météo", tipsLabel: 'Conseils' },
    DZ: { opener: "Voilà la météo", tipsLabel: 'Conseils' },
    TN: { opener: "Voilà la météo", tipsLabel: 'Conseils' },
  };

  return tones[country] || { opener: "Voici ce que je peux te dire", tipsLabel: 'Conseils' };
}

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffled(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildChatReply(n, lang) {
  const tone = getCountryTone(n.country, lang);
  const localFr = {
    CM: {
      intros: [
        `Mon frère, côté ${n.city}, voilà ce qui se passe :`,
        `On part sur ${n.city}, calme-toi je te donne le vrai point :`,
        `À ${n.city}, voilà la sauce météo du moment :`,
      ],
      links: ["Donc hein,", "En vrai,", "Concrètement,", "Du coup,"],
      outros: [
        "Tu veux que je te fasse la version sortie, boulot ou déplacement ?",
        "Si tu veux, on bascule sur une autre ville direct.",
        "Je peux aussi te faire le plan de la soirée selon la météo.",
      ],
    },
    SN: {
      intros: [
        `Waaw, pour ${n.city}, voilà le point météo :`,
        `D'accord, à ${n.city} on est sur ça :`,
        `Bon, sur ${n.city}, je te fais le résumé propre :`,
      ],
      links: ["Bref,", "En gros,", "Donc,", "Finalement,"],
      outros: [
        "Tu veux aussi un plan tenue + transport ?",
        "On peut checker une autre ville si tu veux.",
        "Je peux te faire une version express pour aujourd’hui.",
      ],
    },
    CI: {
      intros: [
        `Mon gars, sur ${n.city}, voilà la météo :`,
        `À ${n.city}, c'est ça qui est là :`,
        `Pour ${n.city}, je te donne le point sans palabre :`,
      ],
      links: ["Donc,", "En gbairai,", "En clair,", "Du coup,"],
      outros: [
        "Tu veux que je te prépare aussi le mode soirée ?",
        "On peut switch sur une autre ville maintenant.",
        "Je peux te faire une version transport rapide aussi.",
      ],
    },
    FR: {
      intros: [
        `Ok, pour ${n.city}, voilà le point météo :`,
        `Petit brief sur ${n.city} :`,
        `Bon, à ${n.city}, on a ça :`,
      ],
      links: ["Donc,", "En clair,", "Globalement,", "Bref,"],
      outros: [
        "Tu veux la version tenue recommandée ?",
        "On peut comparer avec une autre ville juste après.",
        "Je peux aussi te faire un résumé ultra court.",
      ],
    },
  };

  const genericFr = {
    intros: [
      `${tone.opener} :`,
      `Bon, on regarde ${n.city} :`,
      `Petit point météo sur ${n.city} :`,
      `On fait le check de ${n.city} :`,
    ],
    links: ["En clair,", "Donc,", "Du coup,", "Bref,"],
    outros: [
      "Tu veux aussi la tendance des prochaines heures ?",
      "Je peux aussi te proposer une tenue adaptée si tu veux.",
      "Si tu veux, je te fais une version ultra courte juste après.",
      "Dis-moi si tu veux la version trajet/activité extérieure.",
    ],
  };

  const introEn = [
    `${tone.opener}:`,
    `Quick update for ${n.city}:`,
    `Weather check for ${n.city}:`,
  ];
  const linkEn = ["So,", "In short,", "Bottom line,", "Overall,"];
  const outroEn = [
    "Want a short outfit suggestion too?",
    "I can also summarize the next hours if you want.",
    "Tell me if you want a commute-focused version.",
  ];

  const style = localFr[n.country] || genericFr;
  const adviceMix = shuffled(n.advice).join(' ');
  if (lang === 'en') {
    return `${pickOne(introEn)} ${n.city}: ${n.temp}°C, ${n.description}. Wind ${n.wind_kmh} km/h, humidity ${n.humidity}%. ${pickOne(linkEn)} ${tone.tipsLabel}: ${adviceMix} ${pickOne(outroEn)}`;
  }

  return `${pickOne(style.intros)} ${n.city} : ${n.temp} °C, ${n.description}. Vent ${n.wind_kmh} km/h, humidité ${n.humidity} %. ${pickOne(style.links)} ${tone.tipsLabel} : ${adviceMix} ${pickOne(style.outros)}`;
}

function buildFollowUps(n, lang) {
  if (lang === 'en') {
    return [
      `What should I wear in ${n.city}?`,
      `Will it rain later in ${n.city}?`,
      'Choose another city',
    ];
  }
  return [
    `Quelle tenue me conseilles-tu pour ${n.city} ?`,
    `Je prévois une sortie à ${n.city}, des conseils ?`,
    'Choisir une autre ville',
  ];
}

async function fetchOpenWeather(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.cod || `HTTP ${res.status}`;
    const err = new Error(typeof msg === 'string' ? msg : 'Erreur API météo');
    err.status = res.status === 404 ? 404 : 502;
    throw err;
  }
  return data;
}

function requireApiKey(res) {
  if (!OW_KEY || OW_KEY === 'votre_cle_api_ici') {
    res.status(503).json({
      error:
        'Clé OpenWeatherMap manquante. Copiez .env.example vers .env et renseignez OPENWEATHER_API_KEY.',
    });
    return false;
  }
  return true;
}

app.get('/api/weather', async (req, res) => {
  if (!requireApiKey(res)) return;
  const q = (req.query.q || '').trim();
  if (!q) {
    res.status(400).json({ error: 'Paramètre q (ville) requis.' });
    return;
  }
  const lang = req.query.lang === 'en' ? 'en' : 'fr';
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}&appid=${OW_KEY}&units=metric&lang=${lang}`;
  try {
    const data = await fetchOpenWeather(url);
    res.json(normalizeWeatherResponse(data));
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message || 'Impossible de récupérer la météo.' });
  }
});

app.get('/api/weather/geo', async (req, res) => {
  if (!requireApiKey(res)) return;
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    res.status(400).json({ error: 'lat et lon valides requis.' });
    return;
  }
  const lang = req.query.lang === 'en' ? 'en' : 'fr';
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OW_KEY}&units=metric&lang=${lang}`;
  try {
    const data = await fetchOpenWeather(url);
    res.json(normalizeWeatherResponse(data));
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message || 'Impossible de récupérer la météo.' });
  }
});

function extractCityFromMessage(text) {
  const t = (text || '').trim();
  const patterns = [
    /(?:météo|meteo|weather)\s+(?:à|a|pour|de|in|at)\s+(.+)/i,
    /(?:à|a|pour|in|at)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\-]{1,80})/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return '';
}

app.post('/api/chat', async (req, res) => {
  if (!requireApiKey(res)) return;
  const cityDirect = (req.body?.city || '').trim();
  const message = (req.body?.message || '').trim();
  const city = cityDirect || extractCityFromMessage(message);
  if (!city) {
    res.status(400).json({
      error:
        'Indique une ville (champ ville) ou une phrase du type « météo à Yaoundé ».',
    });
    return;
  }
  const lang = req.body?.lang === 'en' ? 'en' : 'fr';
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OW_KEY}&units=metric&lang=${lang}`;
  try {
    const data = await fetchOpenWeather(url);
    const n = normalizeWeatherResponse(data);
    const reply = buildChatReply(n, lang);
    const imageUrl = `https://openweathermap.org/img/wn/${n.icon}@4x.png`;
    res.json({
      ...n,
      reply,
      followUps: buildFollowUps(n, lang),
      imageUrl,
    });
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message || 'Impossible de récupérer la météo.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`WeatherBot → http://localhost:${PORT}`);
});
