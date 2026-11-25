var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// shared/audio.js
var NAMES = {
  de: "Deutsch",
  deu: "Deutsch",
  ger: "Deutsch",
  german: "Deutsch",
  deutsch: "Deutsch",
  en: "Englisch",
  eng: "Englisch",
  english: "Englisch",
  englisch: "Englisch",
  fr: "Franz\xF6sisch",
  fra: "Franz\xF6sisch",
  fre: "Franz\xF6sisch",
  french: "Franz\xF6sisch",
  franz\u00F6sisch: "Franz\xF6sisch",
  es: "Spanisch",
  spa: "Spanisch",
  spanish: "Spanisch",
  spanisch: "Spanisch",
  ja: "Japanisch",
  jpn: "Japanisch",
  jp: "Japanisch",
  japanese: "Japanisch",
  japanisch: "Japanisch"
};
function audioName(value) {
  const code = String(value || "").trim().toLowerCase().replace(/^([a-z]{2,3})[-_][a-z]{2,4}(?:[-_].*)?$/, "$1");
  return Object.prototype.hasOwnProperty.call(NAMES, code) ? NAMES[code] : "";
}
function audioNames(values) {
  return [...new Set(values.map(audioName).filter(Boolean))].sort((a, b) => (b === "Deutsch") - (a === "Deutsch"));
}
function isHls(stream) {
  return /\.m3u8(?:[?#/]|$)|\/hls[/?]|\/master\.txt(?:[?#]|$)/i.test(stream.url) || /(?:^| · )HLS$/i.test(stream.title || "");
}
function attributes(line) {
  const out = {};
  line.replace(/([A-Z0-9-]+)=(?:"([^"]*)"|([^,]*))/g, (_, key, quoted, plain) => {
    out[key] = quoted === void 0 ? plain : quoted;
  });
  return out;
}
function playlistAudio(text) {
  if (!/^#EXTM3U\s/.test(text.trim())) return [];
  const lines = text.split(/\r?\n/);
  const groups = new Set(lines.filter((l) => l.startsWith("#EXT-X-STREAM-INF:")).map((l) => attributes(l).AUDIO).filter(Boolean));
  return audioNames(lines.filter((l) => l.startsWith("#EXT-X-MEDIA:")).map(attributes).filter((a) => a.TYPE === "AUDIO" && (!groups.size || groups.has(a["GROUP-ID"])) && !/describes-video/i.test(a.CHARACTERISTICS || "") && !/audio description|audiodeskription/i.test(a.NAME || "")).map((a) => audioName(a.LANGUAGE) || (a.LANGUAGE && a.LANGUAGE !== "und" ? "" : audioName(a.NAME))));
}

// shared/http.js
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
var DEADLINE_MS = 25e3;
var running = 0;
var idle = [];
var deadline = Infinity;
function send(url, opts) {
  if (Date.now() > deadline) return Promise.reject(new Error(`deadline reached, skipped ${url}`));
  running++;
  const done = () => {
    if (--running === 0) idle.splice(0).forEach((resolve) => resolve());
  };
  return fetch(url, opts).then((res) => {
    done();
    return res;
  }, (err) => {
    done();
    throw err;
  });
}
var SUBBED = [
  [/ger(man)?[\s._-]*sub|(?:untertitel|\bUT) deutsch|original, dt\. ut/i, "Original, dt. UT"],
  [/(?:eng(?:lish)?|\ben)[\s._-]*sub|(?:untertitel|\bUT) englisch|original, engl\. ut/i, "Original, engl. UT"]
];
var LANGS = [[/japanisch, dt\. ut/i, "Japanisch, dt. UT"], [/japanisch, engl\. ut/i, "Japanisch, engl. UT"]].concat(SUBBED, [
  [/\bomu\b/i, "OmU"],
  [/\bov\b|\boriginalversion\b/i, "OV"],
  [/\b(?:englisch|english|eng|en)\b/i, "Englisch"],
  [/franz|\bfr\b/i, "Franz\xF6sisch"],
  [/spanisch/i, "Spanisch"],
  [/japanisch/i, "Japanisch"],
  [/deutsch|\bde\b/i, "Deutsch"]
]);
var fileNames = {};
function titleLanguage(title) {
  const [first, ...rest] = (title || "").split(" \xB7 ");
  const labels = (audioName(first) ? [first, ...rest] : rest).join(" \xB7 ");
  const hit = LANGS.find(([re]) => re.test(labels));
  if (hit) return hit;
  return LANGS.find(([re, lang]) => lang !== "Englisch" && re.test(first));
}
function decorate(_a, detected) {
  var _b = _a, { audioLanguages } = _b, s = __objRest(_b, ["audioLanguages"]);
  const hit = titleLanguage(s.title);
  const audio = detected.length ? detected : audioNames(audioLanguages || []);
  let lang = hit ? hit[1] : "Deutsch", title = s.title;
  const sub = SUBBED.find(([re]) => re.test(fileNames[s.url] || ""));
  let subtitle = /UT|OmU/.test(lang) ? lang : "";
  if (sub && !/UT|OmU/.test(lang)) {
    subtitle = sub[1];
    lang = subtitle;
    title = hit ? title.replace(hit[0], lang) : [title, lang].filter(Boolean).join(" \xB7 ");
  }
  if (audio.length && (!subtitle || audio.includes("Englisch"))) {
    lang = [audio.join(" / "), subtitle && subtitle.replace(/^Original, /, "")].filter(Boolean).join(", ");
    if (detected.length) {
      const parts = (title || "").split(" \xB7 ");
      const index = parts.findIndex((part) => audioName(part));
      if (index >= 0) parts[index] = audio.join(" / ");
      else parts.push(audio.join(" / "));
      title = parts.filter(Boolean).join(" \xB7 ");
    }
  }
  const quality = s.quality && s.quality !== "auto" ? s.quality : isHls(s) || /\/hls|master/i.test(s.url) ? "HLS" : "MP4";
  const host = ((s.title || "").split(" \xB7 ")[0].match(/^[\w-]+\.[a-z]{2,}$/) || [])[0];
  return { lang, stream: Object.assign({}, s, { name: [s.name, lang, host].filter(Boolean).join(" \xB7 "), title, quality }) };
}
function detectEnglishAudio(streams) {
  return __async(this, null, function* () {
    const playlists = /* @__PURE__ */ new Map();
    return Promise.all(streams.map((s) => __async(null, null, function* () {
      if (!isHls(s) || audioNames(s.audioLanguages || []).includes("Englisch") || (titleLanguage(s.title) || [])[1] === "Englisch") return [];
      const key = JSON.stringify([s.url, s.headers]);
      if (!playlists.has(key)) {
        playlists.set(key, getText(s.url, { headers: s.headers }).then(playlistAudio).catch(() => []));
      }
      const audio = yield playlists.get(key);
      return audio.includes("Englisch") ? audio : [];
    })));
  });
}
function provider(getStreams2) {
  return {
    getStreams(tmdbId, mediaType, season, episode) {
      return __async(this, null, function* () {
        deadline = Date.now() + DEADLINE_MS;
        if (mediaType !== "movie") mediaType = "tv";
        let streams = [];
        try {
          streams = (yield getStreams2(tmdbId, mediaType, season, episode)) || [];
        } catch (e) {
          console.error(e.message);
        }
        const audio = yield detectEnglishAudio(streams);
        if (running) yield new Promise((resolve) => idle.push(resolve));
        const rank = (lang) => /^Deutsch(?:$| \/)/.test(lang) ? 0 : /dt\. UT|OmU/.test(lang) ? 1 : 2;
        return streams.map((s, i) => decorate(s, audio[i])).map((d, i) => [rank(d.lang), i, d.stream]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((d) => d[2]);
      });
    }
  };
}
function request(_0) {
  return __async(this, arguments, function* (url, opts = {}) {
    const res = yield send(url, Object.assign({}, opts, { headers: Object.assign({ "User-Agent": UA }, opts.headers) }));
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res;
  });
}
var getText = (url, opts) => __async(null, null, function* () {
  return (yield request(url, opts)).text();
});
var getJson = (url, opts) => __async(null, null, function* () {
  return JSON.parse(yield getText(url, opts));
});

// shared/tmdb.js
function getMeta(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "tv" ? "tv" : "movie";
    const d = yield getJson(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${globalThis.TMDB_API_KEY}&language=de-DE&append_to_response=external_ids,translations,alternative_titles`);
    const tr = (d.translations || {}).translations || [];
    const en = tr.find((t) => t.iso_639_1 === "en" && t.iso_3166_1 === "US") || tr.find((t) => t.iso_639_1 === "en");
    const alts = ((d.alternative_titles || {}).titles || (d.alternative_titles || {}).results || []).filter((a) => a.iso_3166_1 === "DE" || a.iso_3166_1 === "AT").map((a) => a.title);
    const title = d.title || d.name;
    const originalTitle = d.original_title || d.original_name;
    const englishTitle = en && (en.data.title || en.data.name);
    const date = d.release_date || d.first_air_date || "";
    return {
      tmdbId: String(tmdbId),
      type,
      title,
      originalTitle,
      englishTitle,
      year: date ? Number(date.slice(0, 4)) : null,
      imdbId: (d.external_ids || {}).imdb_id || d.imdb_id || null,
      titles: [title, originalTitle, englishTitle].concat(alts).filter((t, i, a) => t && a.indexOf(t) === i)
    };
  });
}

// shared/match.js
function norm(s) {
  s = String(s || "").toLowerCase();
  if (s.normalize) s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return s.replace(/ß/g, "ss").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}
function score(title, year, meta) {
  const t = norm(title);
  if (!t) return 0;
  let s = 0;
  for (const m of meta.titles.map(norm)) {
    if (t === m) s = Math.max(s, 3);
    else if (m.length > 3 && (t.includes(m) || m.includes(t))) s = Math.max(s, 1);
  }
  if (year && meta.year) {
    const d = Math.abs(Number(year) - meta.year);
    s += d === 0 ? 2 : d === 1 ? 1 : -2;
  }
  return s;
}
function pickBest(items, meta) {
  let best = null, bestScore = 2;
  for (const it of items) {
    const s = score(it.title, it.year, meta);
    if (s > bestScore) {
      best = it;
      bestScore = s;
    }
  }
  return best;
}

// src/arte/index.js
var API = "https://api.arte.tv/api/emac/v4/de/web";
var getPage = (url) => __async(null, null, function* () {
  return JSON.parse((yield getText(url)).replace(/\n\d{3} - [^\n]*\n/g, "null"));
});
function zoneItems(zone, query, maxPages) {
  return __async(this, null, function* () {
    const c = zone.content;
    if (c && (!c.pagination || c.pagination.pages <= 1 || maxPages === 1)) return c.data;
    let items = [];
    for (let page = 1, pages = 1; page <= pages && page <= maxPages; page++) {
      const r = yield getJson(`${API}/zones/${zone.id.split("_")[0]}/content?${query}&page=${page}`);
      items = items.concat(r.data || []);
      pages = (r.pagination || {}).pages || 1;
    }
    return items;
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      let meta = yield getMeta(tmdbId, mediaType);
      const parts = [].concat(...meta.titles.map((t) => t.split(/ ?\/ ?| [-–:] |: /))).map((p) => p.trim()).filter((p) => p.length > 3);
      meta = Object.assign({}, meta, { titles: meta.titles.concat(parts).filter((t, i, a) => a.indexOf(t) === i) });
      const isTv = mediaType === "tv";
      let hit;
      for (const q of meta.titles) {
        const query = `query=${encodeURIComponent(q)}`;
        const zones = (yield getPage(`${API}/pages/SEARCH/?page=1&${query}`)).zones || [];
        const listing = zones.find((z) => z.code === "listing_SEARCH") || zones[0];
        const items = listing ? (yield zoneItems(listing, `authorizedCountry=DE&${query}`, 1)).filter((i) => i.programId && i.programId.startsWith("RC-") === isTv && !["TOPIC", "TRAILER"].includes(i.kind.code)) : [];
        hit = pickBest(items, meta);
        if (hit) break;
      }
      if (!hit) return [];
      let programId = hit.programId;
      if (isTv) {
        const seasons = ((yield getPage(`${API}/collections/${programId}`)).zones || []).filter((z) => z.id.split("_").length === 3);
        const zone = seasons.find((z) => Number((z.slug || "").split("-").pop()) === season) || seasons.length === 1 && season === 1 && seasons[0];
        if (!zone) return [];
        const [, collectionId, subCollectionId] = zone.id.split("_");
        const eps = yield zoneItems(zone, `collectionId=${collectionId}&subCollectionId=${subCollectionId}`, 20);
        const ep = eps.find((e) => (e.episodeInfo || {}).episode === episode) || eps.find((e) => Number((e.title.match(/\((\d+)\/\d+\)$/) || [])[1]) === episode);
        if (!ep) return [];
        programId = ep.programId;
      }
      const attrs = (yield getJson(`https://api.arte.tv/api/player/v2/config/de/${programId}`)).data.attributes;
      return (attrs.streams || []).filter((s) => s.url).map((s) => {
        const versions = s.versions || [];
        const v = versions[0] || {};
        const audioLanguages = versions.filter((v2) => !v2.audioDescription).map((v2) => v2.audioLanguage);
        const audio = audioNames(audioLanguages);
        const english = audio.includes("Englisch");
        const language = english ? audio.join(" / ") : v.audioLanguage === "de" ? "Deutsch" : v.shortLabel || v.label;
        const title = [attrs.metadata.title, attrs.metadata.subtitle].filter(Boolean).join(" - ");
        return {
          name: "Arte",
          title: [title, language, "HLS"].filter(Boolean).join(" \xB7 "),
          url: s.url,
          audioLanguages: english ? audioLanguages : [],
          quality: "auto"
          // multi-bitrate master, mainQuality understates it
        };
      });
    } catch (e) {
      console.error(`[Arte] ${e.message}`);
    }
    return [];
  });
}
module.exports = provider(getStreams);
