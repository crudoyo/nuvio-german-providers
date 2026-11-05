import { getText, request, provider } from '../../shared/http.js';
import { getMeta } from '../../shared/tmdb.js';
import { load, all } from '../../shared/dom.js';
import { resolveEmbed } from '../../shared/extractors/index.js';
import { bySlug, cookieHeader, followRedirect, pickSeries, splitSeasonPath } from './common.js';

const BASE = 'https://serienstream.to';

// TMDB puts Columbo's two pilot films in Specials (S00). SerienStream
// places them at S01E01 and S01E02, shifting the regular first season.
function siteEpisode(tmdbId, season, episode) {
    if (String(tmdbId) === '873' && Number(season) === 1 && episode >= 1 && episode <= 7) {
        return { season: 1, episode: Number(episode) + 2 };
    }
    return { season, episode };
}

// Support both the current card-based search page and the older cover layout.
function parseSearchResults($) {
    return all($, '.results-group .card, a.show-cover, a.show-card').map(card => {
        const anchor = card.attr('href') ? card : $('a[href]', card).first();
        const rawLink = anchor.attr('href') || '';
        const link = rawLink.startsWith(`${BASE}/`) ? rawLink.slice(BASE.length) : rawLink;
        const title = $('img[alt]', card).first().attr('alt') ||
            $('.card-title, h2, h3', card).first().text().trim();
        return { link, title };
    }).filter(item => item.link.startsWith('/serie/') && item.title);
}

function fullUrl(path) {
    return /^https?:\/\//i.test(path) ? path : `${BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

async function getStreams(tmdbId, mediaType, season, episode) {
    if (mediaType !== 'tv' || season == null || episode == null) return [];
    try {
        const meta = await getMeta(tmdbId, mediaType);
        let series = null;
        for (const q of meta.titles) {
            try {
                const $ = load(await getText(`${BASE}/suche?term=${encodeURIComponent(q)}&tab=shows`, { headers: { Referer: `${BASE}/suche` } }));
                if ((series = await pickSeries(parseSearchResults($), meta, BASE))) break;
            } catch (e) {
                // An unavailable search endpoint should not prevent the next title or slug fallback.
                console.error(`[Serienstream] Search for ${q}: ${e.message}`);
            }
        }
        series = series || await bySlug(BASE, '/serie/', meta);
        if (!series) {
            console.error(`[Serienstream] No matching series for ${meta.titles.join(' / ')}`);
            return [];
        }
        const mapped = siteEpisode(tmdbId, season, episode);
        if (mapped.episode !== Number(episode)) console.error(`[Serienstream] Columbo S${season}E${episode} maps to S${mapped.season}E${mapped.episode}`);
        const episodePage = async path => {
            const epUrl = BASE + path;
            const res = await request(epUrl).catch(e => {
                console.error(`[Serienstream] Episode request ${epUrl}: ${e.message}`);
                return null;
            });
            const cookie = res && res.headers && res.headers.get ? cookieHeader(res.headers.get('set-cookie')) : '';
            const $ = load(res ? await res.text() : '');
            // "Provider" links always answer 410
            const links = all($, '.link-wrapper button').filter(b => b.attr('data-provider-name') !== 'Provider').map(b => ({
                url: b.attr('data-play-url'), lang: b.attr('data-language-label'), langId: b.attr('data-language-id'),
            })).filter(l => l.url);
            return { epUrl, links, cookie };
        };
        let page = await episodePage(`${series.link}/staffel-${mapped.season}/episode-${mapped.episode}`);
        if (!page.links.length) {
            const split = await splitSeasonPath(BASE, series.link, mapped.season, mapped.episode);
            if (split) page = await episodePage(split);
        }
        const { epUrl, links, cookie } = page;
        if (!links.length) console.error(`[Serienstream] No provider links on ${epUrl}`);
        // s.to shows a captcha instead of redirecting after ~10 links per IP, so spend links on German first
        // (1 = Deutsch, 3 = Ger-Sub, 2 = Englisch) and only fall back to the next language if nothing played
        // Ask hosters one at a time: s.to rate-limits or gates repeated redirects.
        const knownLanguageIds = ['1', '3', '2'];
        let redirects = 0;
        for (const langId of [...knownLanguageIds, 'other']) {
            const eligible = links.filter(l => langId === 'other' ? !knownLanguageIds.includes(l.langId) : l.langId === langId);
            const streams = [];
            for (const l of eligible) {
                const embed = await followRedirect(fullUrl(l.url), epUrl, cookie).catch(e => {
                    console.error(`[Serienstream] Redirect ${l.url}: ${e.message}`);
                    return null;
                });
                if (!embed) continue;
                redirects++;
                const found = await resolveEmbed(embed, epUrl);
                streams.push(...found.map(s => ({
                    name: 'Serienstream', title: `${s.host} · ${l.lang}`, url: s.url,
                    quality: s.quality, headers: s.headers,
                })));
                if (streams.length >= 2) break;
            }
            if (streams.length) return streams;
        }
        if (links.length) console.error(`[Serienstream] ${links.length} hoster links, ${redirects} redirects, no streams`);
    } catch (e) {
        console.error(`[Serienstream] ${e.message}`);
    }
    return [];
}

module.exports = provider(getStreams);
