import { getJson, provider } from '../../shared/http.js';
import { getMeta } from '../../shared/tmdb.js';
import { norm, pickBest, score } from '../../shared/match.js';
import { audioNames } from '../../shared/audio.js';

const BASE = 'https://filmfrei24.com';
const API = BASE + '/beta/api.php';

// the inlined `const ALL_FILMS` catalog is gone; the page now loads it from api.php (no TMDB ids any more, only
// slugs such as "Inception"), and the video URL comes from ?q=play per film or episode
async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        const tv = mediaType === 'tv';
        if (tv && (!season || !episode)) return [];
        const [catalog, meta] = await Promise.all([getJson(`${API}?q=catalog&part=core`), getMeta(tmdbId, mediaType)]);
        const items = (tv ? catalog.series : catalog.films) || [];
        const hit = pickBest(items, meta);
        if (!hit) return [];
        const languages = item => String(item.lang || '').split(/\s*[/,+]\s*/);
        const hasEnglish = item => audioNames(languages(item)).includes('Englisch');
        const englishHit = hasEnglish(hit);
        const variants = items.filter(item => item.id !== hit.id && (englishHit || hasEnglish(item))
            && (!item.year || !hit.year || Number(item.year) === Number(hit.year))
            && (norm(item.title) === norm(hit.title) || score(item.title, item.year, meta) >= 3));
        const streams = await Promise.all([hit, ...variants].map(async item => {
            const play = await getJson(`${API}?q=play&type=${tv ? 's' : 'f'}&id=${encodeURIComponent(item.id)}${tv ? `&season=${season}&ep=${episode}` : ''}`).catch(() => null);
            const url = play && play.ok && play.src;
            if (!url || !/^https?:/.test(url)) return null;
            return {
                name: 'FilmFrei24',
                title: `${item.lang || 'Deutsch'} · ${/\.m3u8/.test(url) ? 'HLS' : 'MP4'}`,
                audioLanguages: languages(item),
                url,
                quality: item.quality === 'HD' ? '1080p' : 'auto',
                headers: { Referer: BASE + '/' },
            };
        }));
        return streams.filter(Boolean);
    } catch (e) {
        console.error(`[FilmFrei24] ${e.message}`);
    }
    return [];
}

module.exports = provider(getStreams);
