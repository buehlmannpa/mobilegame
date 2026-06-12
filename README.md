# 🍉 Frutti – Das Früchte-Merge-Spiel

Ein fröhliches, webbasiertes Smartphone-Spiel für Jung und Alt – ganz ohne
Zeitdruck und ohne Wettkampf. Wische über das Spielfeld, lasse gleiche Früchte
verschmelzen und entdecke nach und nach alle 12 Sorten – bis zur Königsfrucht 👑.

## Warum macht es Spaß? (Analyse viraler Spiele)

Frutti kombiniert die Erfolgszutaten der bekanntesten viralen Spiele:

| Zutat | Vorbild | Umsetzung in Frutti |
|---|---|---|
| Merge-Mechanik („nur noch ein Zug…") | 2048, Suika Game | Wischen → gleiche Früchte verschmelzen |
| Tägliche Serie ohne Zwang | Wordle | 🔥-Serie zählt Tage, an denen man vorbeischaut |
| Sammel-Effekt | Pokémon-Prinzip | Früchte-Sammlung mit Entdeckungs-Momenten |
| Saftiges Feedback | Candy Crush | Konfetti, Pop-Animationen, sanfte Töne |
| Null Druck | – | Kein Timer, automatisches Speichern, Undo-Knopf |

## Bedienung

- **Wischen** (oder Pfeiltasten / WASD am Computer) bewegt alle Früchte.
- Zwei gleiche Früchte verschmelzen zur nächstgrößeren: 🍒+🍒=🍓
- ↩️ nimmt jeden Zug zurück – auch nach „Spielende".
- 👤 Beim ersten Start gibst du deinen Namen ein (jederzeit änderbar).
- 🏆 Die Bestenliste zeigt den besten Punktestand pro Spieler auf diesem
  Gerät – ideal, wenn sich Familie oder Freunde ein Handy teilen.
- Der Spielstand wird automatisch im Browser gespeichert.
- Als PWA installierbar („Zum Startbildschirm hinzufügen") und offline spielbar.

## Technik

- Reines HTML, CSS und JavaScript – **kein Build-Schritt, keine Abhängigkeiten**.
- PWA mit Service Worker (offline spielbar) und Manifest.
- Spielstand, Rekord, Serie und Sammlung in `localStorage`.

## Lokal ausprobieren

Einfach einen statischen Server starten, z. B.:

```bash
npx serve .
# oder
python3 -m http.server 8000
```

## Tests

```bash
node tests/logic.test.js
```

## Deployment mit Vercel

1. Auf [vercel.com](https://vercel.com) anmelden (mit dem GitHub-Konto).
2. **Add New → Project** und dieses Repository `mobilegame` importieren.
3. Framework-Preset: **Other** (statische Seite) – keine Build-Einstellungen nötig.
4. **Deploy** klicken – fertig. Jeder Push auf den verbundenen Branch
   veröffentlicht automatisch eine neue Version.
