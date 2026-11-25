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
function titleLanguage(title2) {
  const [first, ...rest] = (title2 || "").split(" \xB7 ");
  const labels = (audioName(first) ? [first, ...rest] : rest).join(" \xB7 ");
  const hit = LANGS.find(([re]) => re.test(labels));
  if (hit) return hit;
  return LANGS.find(([re, lang]) => lang !== "Englisch" && re.test(first));
}
function decorate(_a, detected) {
  var _b = _a, { audioLanguages } = _b, s = __objRest(_b, ["audioLanguages"]);
  const hit = titleLanguage(s.title);
  const audio = detected.length ? detected : audioNames(audioLanguages || []);
  let lang = hit ? hit[1] : "Deutsch", title2 = s.title;
  const sub = SUBBED.find(([re]) => re.test(fileNames[s.url] || ""));
  let subtitle = /UT|OmU/.test(lang) ? lang : "";
  if (sub && !/UT|OmU/.test(lang)) {
    subtitle = sub[1];
    lang = subtitle;
    title2 = hit ? title2.replace(hit[0], lang) : [title2, lang].filter(Boolean).join(" \xB7 ");
  }
  if (audio.length && (!subtitle || audio.includes("Englisch"))) {
    lang = [audio.join(" / "), subtitle && subtitle.replace(/^Original, /, "")].filter(Boolean).join(", ");
    if (detected.length) {
      const parts = (title2 || "").split(" \xB7 ");
      const index = parts.findIndex((part) => audioName(part));
      if (index >= 0) parts[index] = audio.join(" / ");
      else parts.push(audio.join(" / "));
      title2 = parts.filter(Boolean).join(" \xB7 ");
    }
  }
  const quality = s.quality && s.quality !== "auto" ? s.quality : isHls(s) || /\/hls|master/i.test(s.url) ? "HLS" : "MP4";
  const host = ((s.title || "").split(" \xB7 ")[0].match(/^[\w-]+\.[a-z]{2,}$/) || [])[0];
  return { lang, stream: Object.assign({}, s, { name: [s.name, lang, host].filter(Boolean).join(" \xB7 "), title: title2, quality }) };
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
    const title2 = d.title || d.name;
    const originalTitle = d.original_title || d.original_name;
    const englishTitle = en && (en.data.title || en.data.name);
    const date = d.release_date || d.first_air_date || "";
    return {
      tmdbId: String(tmdbId),
      type,
      title: title2,
      originalTitle,
      englishTitle,
      year: date ? Number(date.slice(0, 4)) : null,
      imdbId: (d.external_ids || {}).imdb_id || d.imdb_id || null,
      titles: [title2, originalTitle, englishTitle].concat(alts).filter((t, i, a) => t && a.indexOf(t) === i)
    };
  });
}

// shared/match.js
function norm(s) {
  s = String(s || "").toLowerCase();
  if (s.normalize) s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return s.replace(/ß/g, "ss").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}
function score(title2, year, meta) {
  const t = norm(title2);
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

// src/ard/index.js
var API = "https://api.ardmediathek.de";
var ACCESSIBLE = /Audiodeskription|Gebärdensprache|Klare Sprache/i;
var VERSION_SUFFIX = /\s*[-–:]?\s*(?:\((?:OV|OmU|Originalversion|Englisch)\)|\bOriginalversion)\s*$/i;
var standardAudio = (a) => a.kind !== "audio-description" && a.kind !== "speech-optimized";
var title = (t) => (t.shortTitle || t.longTitle || t.title || "").trim();
var targetId = (t) => ((t.links || {}).target || {}).id || t.id;
var search = (kind, q) => getJson(`${API}/search-system/search/${kind}/ard?query=${encodeURIComponent(q)}&pageSize=30&platform=MEDIA_THEK&sortingCriteria=SCORE_DESC`).then((r) => r.teasers || []);
function findShow(meta, types) {
  return __async(this, null, function* () {
    for (const q of meta.titles) {
      const shows = (yield search("shows", q)).filter((t) => types.test(t.coreAssetType || ""));
      const hit = pickBest(shows.map((t) => ({ title: title(t), id: targetId(t) })), meta);
      if (hit) return hit;
    }
    return null;
  });
}
function groupingTeasers(showId, compilation) {
  return __async(this, null, function* () {
    const page = yield getJson(`${API}/page-gateway/pages/ard/grouping/${showId}?seasoned=true&embedded=true`);
    let widgets = (page.widgets || []).filter((w) => w.compilationType === compilation);
    if (!widgets.length) widgets = (page.widgets || []).filter((w) => /^itemsOf/.test(w.compilationType || ""));
    const out = [];
    for (const w of widgets) {
      let teasers = w.teasers || [];
      const self = ((w.links || {}).self || {}).href;
      if (self && w.pagination && teasers.length < w.pagination.totalElements) {
        teasers = [];
        for (let p = 0; teasers.length < Math.min(w.pagination.totalElements, 1e3); p++) {
          const next = (yield getJson(self.replace(/pageNumber=\d+/, `pageNumber=${p}`).replace(/pageSize=\d+/, "pageSize=200"))).teasers || [];
          if (!next.length) break;
          teasers = teasers.concat(next);
        }
      }
      for (const t of teasers) {
        if ((t.coreAssetType === "EPISODE" || /Originalversion|\(OV\)/.test(title(t))) && !ACCESSIBLE.test(title(t))) out.push(t);
      }
    }
    return out;
  });
}
function tmdbEpisodeName(tmdbId, season, episode) {
  return __async(this, null, function* () {
    try {
      return (yield getJson(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${globalThis.TMDB_API_KEY}&language=de-DE`)).name;
    } catch (e) {
      return null;
    }
  });
}
function findEpisodes(meta, season, episode) {
  return __async(this, null, function* () {
    const show = yield findShow(meta, /SERIES$/);
    if (!show) return [];
    const teasers = yield groupingTeasers(show.id, "itemsOfSeason");
    const tag = new RegExp(`\\(S0*${season}/E0*${episode}\\)`);
    let hits = teasers.filter((t) => tag.test(title(t)));
    if (!hits.length) {
      const name = norm(yield tmdbEpisodeName(meta.tmdbId, season, episode));
      if (name.length > 3) hits = teasers.filter((t) => norm(title(t)).split(norm(show.title))[0].trim() === name || norm(title(t)) === name);
    }
    return hits;
  });
}
function findMovie(meta) {
  return __async(this, null, function* () {
    const show = yield findShow(meta, /^SINGLE$/);
    if (show) return groupingTeasers(show.id, "itemsOfShow");
    for (const q of meta.titles) {
      const vods = (yield search("vods", q)).filter((t) => t.coreAssetType === "EPISODE" && t.duration >= 3e3 && !ACCESSIBLE.test(title(t)));
      const items = vods.map((t) => ({ title: title(t).replace(VERSION_SUFFIX, ""), t }));
      const hit = pickBest(items, meta);
      if (hit) return items.filter((i) => norm(i.title) === norm(hit.title)).map((i) => i.t);
    }
    return [];
  });
}
function streamsOf(teaser) {
  return __async(this, null, function* () {
    const item = yield getJson(`${API}/page-gateway/pages/ard/item/${targetId(teaser)}?embedded=true&mcV6=true`);
    const player = (item.widgets || []).find((w) => /^player/.test(w.type || ""));
    const embedded = player && player.mediaCollection && player.mediaCollection.embedded;
    if (!embedded) return [];
    let media = [].concat.apply([], (embedded.streams || []).map((s) => s.media || []));
    const standard = media.filter((m) => !m.audios || !m.audios.length || m.audios.some(standardAudio));
    if (standard.length) media = standard;
    return media.filter((m) => m.url).map((m) => {
      const hls = /mpegurl/i.test(m.mimeType || "") || /\.m3u8/.test(m.url);
      const audios = m.audios || [];
      const normalAudios = audios.filter(standardAudio);
      const audioLanguages = (normalAudios.length ? normalAudios : audios).map((a) => a.languageCode);
      return {
        name: "ARD",
        videoTitle: title(teaser),
        forcedLabel: m.forcedLabel,
        format: hls ? "HLS" : "MP4",
        audioLanguages,
        url: m.url.startsWith("//") ? "https:" + m.url : m.url,
        quality: hls ? "auto" : m.maxVResolutionPx ? `${m.maxVResolutionPx}p` : "auto",
        res: hls ? 1e5 : m.maxVResolutionPx || 0
      };
    });
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const meta = yield getMeta(tmdbId, mediaType);
      const teasers = mediaType === "tv" ? yield findEpisodes(meta, season || 1, episode || 1) : yield findMovie(meta);
      const byUrl = /* @__PURE__ */ new Map();
      for (const stream of [].concat(...yield Promise.all(teasers.map((t) => streamsOf(t).catch(() => []))))) {
        const existing = byUrl.get(stream.url);
        if (existing) existing.audioLanguages.push(...stream.audioLanguages);
        else byUrl.set(stream.url, stream);
      }
      return [...byUrl.values()].sort((a, b) => b.res - a.res).map((_a) => {
        var _b = _a, { res, videoTitle, forcedLabel, format } = _b, s = __objRest(_b, ["res", "videoTitle", "forcedLabel", "format"]);
        const lang = audioNames(s.audioLanguages).join(" / ") || s.audioLanguages[0];
        return Object.assign(s, { title: [videoTitle, lang, forcedLabel, format].filter(Boolean).join(" \xB7 ") });
      });
    } catch (e) {
      console.error(`[ARD] ${e.message}`);
    }
    return [];
  });
}
module.exports = provider(getStreams);
