// Regression for Nuvio's jsoup-backed Cheerio shim.
// Deliberately omits jQuery-only methods such as .is().
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/serienstream/index.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '');

function wrap(node = {}) {
    return {
        node,
        attr(key) { return node.attrs && node.attrs[key]; },
        text() { return node.text || ''; },
        first() { return this; },
    };
}
function load(page) {
    const $ = (selector, context) => {
        if (selector && selector.node) return selector;
        const n = context && context.node;
        if (selector === 'a[href]') return wrap(n && n.anchor);
        if (selector === 'img[alt]') return wrap(n && n.img);
        if (selector === '.card-title, h2, h3') return wrap(n && n.heading);
        return wrap();
    };
    $.page = page;
    return $;
}
function all($, selector) {
    if (selector.includes('.results-group')) {
        if ($.page === 'SEARCH_CARD') return [wrap({
            anchor: { attrs: { href: '/serie/columbo' } },
            img: { attrs: { alt: 'Columbo' } },
        })];
        if ($.page === 'SEARCH_ANCHOR') return [wrap({
            attrs: { href: 'https://serienstream.to/serie/columbo' },
            img: { attrs: { alt: 'Columbo' } },
        })];
        return [];
    }
    if (selector === '.link-wrapper button') {
        if ($.page === 'EPISODE') return [wrap({ attrs: {
            'data-play-url': 'https://redirect.example/test',
            'data-provider-name': 'VOE',
            'data-language-label': 'Deutsch',
            'data-language-id': '1',
        } })];
        if ($.page === 'EPISODE_OTHER') return [wrap({ attrs: {
            'data-play-url': '/redirect/test',
            'data-provider-name': 'VOE',
            'data-language-label': 'Original',
            'data-language-id': '7',
        } })];
        return [];
    }
    throw new Error('Unexpected selector: ' + selector);
}
async function test(searchPage, episodePage, redirectExpected) {
    const redirects = [];
    const episodeRequests = [];
    const ctx = {
        module: { exports: {} }, console, load, all,
        getMeta: async () => ({ titles: ['Columbo'], imdbId: 'tt1466074' }),
        getText: async () => searchPage,
        request: async url => { episodeRequests.push(url); return { headers: { get: key => key === 'set-cookie' ? 'session=abc; Path=/' : '' }, text: async () => episodePage }; },
        cookieHeader: value => value.split(';')[0],
        pickSeries: async items => items.find(x => x.title === 'Columbo') || null,
        bySlug: async () => null,
        splitSeasonPath: async () => null,
        followRedirect: async (url, referer, cookie) => { redirects.push({ url, referer, cookie }); return 'https://video.example/embed'; },
        resolveEmbed: async () => [{ host: 'video.example', url: 'https://video.example/video.m3u8', quality: 'HLS' }],
        provider: fn => ({ getStreams: fn }),
    };
    vm.runInNewContext(source, ctx);
    const streams = await ctx.module.exports.getStreams('873', 'tv', 1, 2);
    assert.equal(streams.length, 1, 'Expected a returned stream from the shim-only fixture');
    assert.equal(redirects[0].url, redirectExpected);
    assert.equal(redirects[0].cookie, 'session=abc');
    assert.equal(redirects[0].referer, episodeRequests[0]);
    assert.equal(episodeRequests[0], 'https://serienstream.to/serie/columbo/staffel-1/episode-4', 'TMDB Columbo S01E02 should open s.to S01E04');
}
(async () => {
    await test('SEARCH_CARD', 'EPISODE', 'https://redirect.example/test');
    await test('SEARCH_ANCHOR', 'EPISODE', 'https://redirect.example/test');
    await test('SEARCH_CARD', 'EPISODE_OTHER', 'https://serienstream.to/redirect/test');
    const bundled = fs.readFileSync(path.join(__dirname, '../providers/serienstream.js'), 'utf8');
    assert.ok(bundled.includes('card.attr("href")'), 'Bundled plugin must contain the compatible fix');
    assert.ok(!bundled.includes('card.is('), 'Unsupported .is() must not appear in the Nuvio plugin');
    assert.ok(bundled.includes('function siteEpisode('), 'Bundle should include Columbo episode mapping');
    assert.ok(bundled.includes('var cookieHeader'), 'Bundle should include optional cookie forwarding');
    console.log('PASS: Nuvio jsoup shim, both layouts, both link forms, fallback language, bundle');
})().catch(e => { console.error(e); process.exitCode = 1; });
