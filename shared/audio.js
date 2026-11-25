const NAMES = {
    de: 'Deutsch', deu: 'Deutsch', ger: 'Deutsch', german: 'Deutsch', deutsch: 'Deutsch',
    en: 'Englisch', eng: 'Englisch', english: 'Englisch', englisch: 'Englisch',
    fr: 'Französisch', fra: 'Französisch', fre: 'Französisch', french: 'Französisch', französisch: 'Französisch',
    es: 'Spanisch', spa: 'Spanisch', spanish: 'Spanisch', spanisch: 'Spanisch',
    ja: 'Japanisch', jpn: 'Japanisch', jp: 'Japanisch', japanese: 'Japanisch', japanisch: 'Japanisch',
};

export function audioName(value) {
    const code = String(value || '').trim().toLowerCase().replace(/^([a-z]{2,3})[-_][a-z]{2,4}(?:[-_].*)?$/, '$1');
    return Object.prototype.hasOwnProperty.call(NAMES, code) ? NAMES[code] : '';
}

export function audioNames(values) {
    return [...new Set(values.map(audioName).filter(Boolean))].sort((a, b) => (b === 'Deutsch') - (a === 'Deutsch'));
}

export function interleave(first, second) {
    const items = [];
    for (let i = 0; i < Math.max(first.length, second.length); i++) {
        if (i < first.length) items.push(first[i]);
        if (i < second.length) items.push(second[i]);
    }
    return items;
}

export function isHls(stream) {
    return /\.m3u8(?:[?#/]|$)|\/hls[/?]|\/master\.txt(?:[?#]|$)/i.test(stream.url)
        || /(?:^| · )HLS$/i.test(stream.title || '');
}

function attributes(line) {
    const out = {};
    line.replace(/([A-Z0-9-]+)=(?:"([^"]*)"|([^,]*))/g, (_, key, quoted, plain) => {
        out[key] = quoted === undefined ? plain : quoted;
    });
    return out;
}

export function playlistAudio(text) {
    if (!/^#EXTM3U\s/.test(text.trim())) return [];
    const lines = text.split(/\r?\n/);
    const groups = new Set(lines.filter(l => l.startsWith('#EXT-X-STREAM-INF:')).map(l => attributes(l).AUDIO).filter(Boolean));
    return audioNames(lines.filter(l => l.startsWith('#EXT-X-MEDIA:')).map(attributes)
        .filter(a => a.TYPE === 'AUDIO' && (!groups.size || groups.has(a['GROUP-ID']))
            && !/describes-video/i.test(a.CHARACTERISTICS || '')
            && !/audio description|audiodeskription/i.test(a.NAME || ''))
        .map(a => audioName(a.LANGUAGE) || (a.LANGUAGE && a.LANGUAGE !== 'und' ? '' : audioName(a.NAME))));
}
