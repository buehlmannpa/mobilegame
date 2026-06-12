/* ============================================================
   Datenbank-Konnektor für die Online-Bestenliste
   ------------------------------------------------------------
   Erkennt die Datenbank automatisch über Umgebungsvariablen:

   - POSTGRES_URL / DATABASE_URL  → PostgreSQL (z. B. Vercel/Neon)
   - FRUTTI_MEMORY_DB=1           → In-Memory-Speicher (nur Tests/Demo)
   - nichts gesetzt               → Konnektor inaktiv, die App nutzt
                                    automatisch die lokale Bestenliste

   Weitere Datenbanken lassen sich anbinden, indem hier ein
   zusätzlicher Adapter mit  top(limit)  und  submit(name, score)
   ergänzt wird.
   ============================================================ */

'use strict';

const MAX_NAME_LENGTH = 16;

function connectionString() {
  return (
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    ''
  );
}

/* ---------- Adapter: PostgreSQL ---------- */

function createPgStore(cs) {
  const { Pool } = require('pg');
  const isLocal = /localhost|127\.0\.0\.1/.test(cs);
  const pool = new Pool({
    connectionString: cs,
    max: 1, // Serverless: eine Verbindung pro Instanz genügt
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  let ready = null;
  function init() {
    if (!ready) {
      ready = pool.query(`
        CREATE TABLE IF NOT EXISTS highscores (
          name       VARCHAR(${MAX_NAME_LENGTH}) PRIMARY KEY,
          score      INTEGER NOT NULL CHECK (score > 0),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`);
    }
    return ready;
  }

  return {
    async top(limit) {
      await init();
      const { rows } = await pool.query(
        'SELECT name, score FROM highscores ORDER BY score DESC, updated_at ASC LIMIT $1',
        [limit]
      );
      return rows;
    },
    async submit(name, score) {
      await init();
      await pool.query(
        `INSERT INTO highscores (name, score) VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE
           SET score = GREATEST(highscores.score, EXCLUDED.score),
               updated_at = now()`,
        [name, score]
      );
    },
  };
}

/* ---------- Adapter: In-Memory (Tests/Demo, nicht dauerhaft) ---------- */

function createMemoryStore() {
  const scores = new Map();
  return {
    async top(limit) {
      return [...scores.entries()]
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },
    async submit(name, score) {
      scores.set(name, Math.max(scores.get(name) || 0, score));
    },
  };
}

/* ---------- Auswahl ---------- */

let cachedStore;
let resolved = false;

function getStore() {
  if (!resolved) {
    resolved = true;
    const cs = connectionString();
    if (cs) cachedStore = createPgStore(cs);
    else if (process.env.FRUTTI_MEMORY_DB === '1') cachedStore = createMemoryStore();
    else cachedStore = null;
  }
  return cachedStore;
}

module.exports = { getStore, MAX_NAME_LENGTH };
