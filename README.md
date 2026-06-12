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

- Frontend: reines HTML, CSS und JavaScript – **kein Build-Schritt**.
- PWA mit Service Worker (offline spielbar) und Manifest.
- Spielstand, Rekord, Serie und Sammlung in `localStorage`.
- Optionales Backend: Vercel Serverless Function `api/highscores.js` mit
  austauschbarem Datenbank-Konnektor `api/_lib/db.js` (PostgreSQL).

## Online-Bestenliste: Datenbank anbinden (optional)

Ohne Datenbank zeigt die App automatisch die lokale Bestenliste des Geräts.
Sobald eine PostgreSQL-Datenbank verbunden ist, wird die Liste online und
gilt über alle Geräte hinweg („🌐 Online – alle Geräte").

**So verbindest du Vercel Postgres (Neon):**

1. Im Vercel-Dashboard das Projekt öffnen → Reiter **Storage**.
2. **Create Database** → **Postgres (Neon)** auswählen und mit dem Projekt
   verknüpfen. Vercel setzt die Umgebungsvariable `POSTGRES_URL` automatisch.
3. Neu deployen (oder einfach den nächsten Push abwarten) – fertig.
   Die Tabelle `highscores` legt der Konnektor beim ersten Aufruf selbst an.

**Andere PostgreSQL-Anbieter** (Supabase, Railway, eigene Instanz):
Einfach in Vercel unter *Settings → Environment Variables* die Variable
`DATABASE_URL` mit der Verbindungs-URL setzen.

**Andere Datenbanktypen:** In `api/_lib/db.js` einen weiteren Adapter mit
den zwei Methoden `top(limit)` und `submit(name, score)` ergänzen.

Die API selbst:

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/highscores` | Top 20, absteigend sortiert |
| `POST` | `/api/highscores` | `{ "name": "Patrick", "score": 140 }` – es zählt der beste Wert pro Name |

Hinweis: Die Liste ist bewusst einfach gehalten (Name = Eintrag, keine
Anmeldung). Gleiche Namen auf verschiedenen Geräten teilen sich einen
Eintrag.

## Lokal ausprobieren

Einfach einen statischen Server starten, z. B.:

```bash
npx serve .
# oder
python3 -m http.server 8000
```

## Tests

```bash
npm test   # Spiellogik + Bestenlisten-API (ohne echte Datenbank)
```

## Deployment mit Vercel

1. Auf [vercel.com](https://vercel.com) anmelden (mit dem GitHub-Konto).
2. **Add New → Project** und dieses Repository `mobilegame` importieren.
3. Framework-Preset: **Other** (statische Seite) – keine Build-Einstellungen nötig.
4. **Deploy** klicken – fertig. Jeder Push auf den verbundenen Branch
   veröffentlicht automatisch eine neue Version.
