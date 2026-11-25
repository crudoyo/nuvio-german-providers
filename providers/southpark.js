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

// src/southpark/index.js
var BASE = "https://www.southpark.de";
var TOPAZ = "https://topaz.paramount.tech/topaz/api";
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    if (String(tmdbId) !== "2190" || mediaType !== "tv" || !season) return [];
    try {
      let path = "/seasons/south-park";
      if (season !== 1) {
        const m = (yield getText(BASE + path)).match(new RegExp(`/seasons/south-park/[a-z0-9]+/staffel-${season}"`));
        if (!m) return [];
        path = m[0].slice(0, -1);
      }
      const mgid = (yield getText(BASE + path)).match(/mgid:arc:season:southpark\.intl:[0-9a-f-]+/);
      if (!mgid) return [];
      const items = (yield getJson(`${BASE}/api/context/${encodeURIComponent(mgid[0])}/episode/1/100`)).items || [];
      const ep = items.find((i) => {
        const h = i.meta.header.title;
        const m = String(h && h.text || h).match(/S(\d+)\D+(\d+)/);
        return m && Number(m[1]) === season && Number(m[2]) === episode;
      });
      if (!ep) return [];
      const streams = [];
      for (const [ns, lang] of [["de", "Deutsch"], ["en", "Englisch"]]) {
        const res = yield getJson(`${TOPAZ}/mgid:arc:episode:shared.southpark.gsa.${ns}:${ep.id}/mica.json?clientPlatform=mobile`).catch(() => null);
        const src = res && res.stitchedstream && res.stitchedstream.source;
        if (src) streams.push({ name: "South Park", title: `S${season}E${episode} ${ep.meta.subHeader || ""} \xB7 ${lang} \xB7 HLS`, url: src, quality: "auto" });
      }
      return streams;
    } catch (e) {
      console.error(`[South Park] ${e.message}`);
    }
    return [];
  });
}
module.exports = provider(getStreams);
