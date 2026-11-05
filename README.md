# German Providers für Nuvio

> [!WARNING]
> Dieses Projekt ist noch in Entwicklung. Einzelne Provider können ausfallen, weil sich die Seiten oder Hoster ändern.
> Wenn etwas nicht funktioniert, [öffne gerne ein Issue](https://github.com/InvalidPandaa/nuvio-german-providers/issues/new/choose).

Deutsche Quellen für [Nuvio](https://github.com/NuvioMedia), portiert aus dem CloudStream-Repo
[Bnyro/GermanProviders](https://github.com/Bnyro/GermanProviders). Anders als die CloudStream-`.cs3`-Erweiterungen
(Android-Bytecode, in Nuvio nur auf Android nutzbar) sind das reine JavaScript-Plugins im Nuvio-Format und laufen
auf allen Plattformen: Android, Android TV, iOS, macOS, Windows.

## Installation

In Nuvio in den Plugin-Einstellungen ein Repository mit der **rohen** URL der `manifest.json` hinzufügen:

```
https://raw.githubusercontent.com/crudoyo/nuvio-german-providers/refs/heads/main/manifest.json
```


## Provider

| Provider | Inhalte | Hinweise |
|---|---|---|
| ARD Mediathek | Filme, Serien | FSK16+ nur 22–6 Uhr (ARD-Regel) |
| Arte | Filme, Serien | Jugendschutz-Titel nur 22–6 Uhr |
| DMAX, TELE 5, TLC | Filme, Serien | Stream-URLs laufen nach ca. 6 Minuten ab |
| PlutoTV | Filme, Serien | Pluto zeigt nur wechselnde Teile einer Staffel |
| South Park | Serie | nur frei verfügbare Folgen |
| Netzkino | Filme | Suche der Netzkino-API ist lückenhaft |
| FilmFrei24, Filmo, FlixiTV, KellerKino, Megakino, FilmPalast, HDFilme, Moflix, Huhu | Filme (teils Serien) | über Hoster wie VOE, Vidara, VidSonic, FireStream, MixDrop … |
| KinoKing | Serien | Filme sind abgeschaltet: die Filmseite braucht 12–20 s pro Abruf |
| Serienstream, Aniworld | Serien / Anime | s.to zeigt nach ~10 Links pro IP ein Captcha, dann fehlen weitere Links |



## Lizenz

GPL-3.0-or-later. Seiten-Logik nach [Bnyro/GermanProviders](https://github.com/Bnyro/GermanProviders) (GPL-3.0),
Hoster-Decoder nach [recloudstream/cloudstream](https://github.com/recloudstream/cloudstream) (GPL-3.0).
Die Plugins hosten keine Inhalte, sie verhalten sich wie ein Browser, der öffentlich erreichbare Seiten aufruft.

## Gezielte Änderungen dieses Forks (1.0.11)

Der SerienStream-Scraper wurde nach Klärung des DNS-Problems vollständig auf den Originalstand
von [InvalidPandaa/nuvio-german-providers](https://github.com/InvalidPandaa/nuvio-german-providers)
zurückgesetzt. Es gibt **keine** Columbo-Episodenverschiebung, experimentelle Such-Selektoren
oder veränderte Hoster-Weiterleitungen mehr.

Aus [MudWorlds Fork](https://github.com/MudWorld/nuvio-german-providers) sind nur
folgende gezielten Verbesserungen übernommen:

- **Huhu:** aktuelle mHub-VOD-Schnittstelle statt der veralteten MediaURL-API.
- **FilmFrei24:** aktualisierte Katalog- und Wiedergabe-API.
- **ARTE:** bessere Suche nach mehrteiligen oder alternativen Titeln (z. B. „Bron/Broen“).
- **Diagnose:** `health.js`, `health.json`, bekannte Testfälle in `manifest.json`.
  Mit `npm run health` lassen sich die Anbieter prüfen; für Live-Anfragen ist
  `TMDB_API_KEY` nötig.

Bewusst **nicht übernommen** wurden globale Timeout-/Fetch-Änderungen und pauschale
Sperrlisten für zusätzliche Videohoster. Diese würden auch funktionierende Provider
beeinflussen können. Die übernommenen Schnittstellenänderungen sind nicht auf einem
realen Nuvio-/Fire-TV-Gerät live verifiziert.

Die Testbranch-Sicherung des vorherigen experimentellen Stands liegt unter
`backup/experimental-serienstream-before-dns-cleanup`.
