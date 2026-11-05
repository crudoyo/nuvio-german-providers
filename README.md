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

## Fork: SerienStream-Suche (1.0.6)

Der SerienStream-Scraper unterstützt Suchtreffer als Cards sowie das bisherige Cover-Layout, probiert bei einem Suchfehler weitere Titel und den bestehenden Slug-Fallback und korrigiert absolute Weiterleitungs-URLs und unbekannte Sprach-IDs. Der Fix ist anhand lokaler Tests geprüft, aber noch nicht als Live-Wiedergabe auf einem Nuvio-Gerät bestätigt. Captchas werden nicht umgangen; die Hoster-Auflösung kann weiterhin fehlschlagen.

## Fork-Updates 1.0.9

- **SerienStream 1.0.9:** Nuvio-kompatibler Suchparser ohne `.is()`, serielle Hoster-Abfragen und bessere Diagnose. Regressionstest: `node tests/serienstream-jsoup.test.cjs`.
- **FilmFrei24 1.0.8:** Wechsel zur API `/beta/api.php` (basierend auf MudWorld).
- **Huhu 1.0.8:** Wechsel zur neuen mHub-Quellenschnittstelle (basierend auf MudWorld).
- **Anbieter-Diagnose:** Testfälle für 19 Provider im Manifest, `health.json` und `npm run health` (Live-Tests benötigen `TMDB_API_KEY`).

Die Quellenschnittstellen und die Wiedergabe wurden hier nicht auf einem echten Nuvio-Endgerät überprüft. Captcha-/Browser-Prüfungen und Hoster-Ausfälle werden nicht umgangen.

## Columbo 1.0.10: Zuordnung und Hoster-Diagnose

- Columbo hat die TMDB-ID `873`. TMDB zählt in Staffel 1 sieben reguläre Folgen und führt die beiden Pilotfilme separat; SerienStream zählt beide Pilotfilme als S01E01 und S01E02. Deshalb wird bei Columbo S01E01–S01E07 im SerienStream-Scraper die Episodennummer um 2 verschoben.
- Die SerienStream-Episodenseite wird einschließlich eines optionalen Sitzungscookies eingelesen. Dieses Cookie wird bei der Hoster-Weiterleitung mitgegeben; fehlt es, funktioniert das bisherige Verhalten weiterhin.
- Bleibt die Hoster-Weiterleitung bei der SerienStream-Adresse stehen, protokolliert der Scraper einen möglichen Browser-Check beziehungsweise einen nicht verfügbaren Hoster, anstatt einen spielbaren Stream vorzutäuschen.
- **Einschränkung:** Die korrekte Zuordnung und Cookie-Weitergabe sind mit simulierten Antworten getestet; echte Columbo-Wiedergabe konnte nicht verifiziert werden. CAPTCHAs werden nicht umgangen.
