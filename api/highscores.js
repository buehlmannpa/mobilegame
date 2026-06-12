/* ============================================================
   API-Endpunkt: /api/highscores
   GET  → Top 20 der Online-Bestenliste
   POST → { name, score } eintragen (es zählt der beste Wert)

   Ohne konfigurierte Datenbank antwortet der Endpunkt mit 503
   und { online: false } – die App nutzt dann automatisch die
   lokale Bestenliste auf dem Gerät.
   ============================================================ */

'use strict';

const { getStore, MAX_NAME_LENGTH } = require('./_lib/db');

const MAX_SCORE = 9999999;
const TOP_LIMIT = 20;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const store = getStore();
  if (!store) {
    return res.status(503).json({ online: false, error: 'Keine Datenbank konfiguriert' });
  }

  try {
    if (req.method === 'GET') {
      const scores = await store.top(TOP_LIMIT);
      return res.status(200).json({ online: true, scores });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const name = String(body.name || '').trim().slice(0, MAX_NAME_LENGTH);
      const score = Math.floor(Number(body.score));

      if (!name || !Number.isFinite(score) || score <= 0 || score > MAX_SCORE) {
        return res.status(400).json({ online: true, error: 'Ungültige Daten' });
      }

      await store.submit(name, score);
      return res.status(200).json({ online: true, ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ online: true, error: 'Methode nicht erlaubt' });
  } catch (err) {
    console.error('Bestenlisten-Fehler:', err);
    return res.status(500).json({ online: true, error: 'Datenbankfehler' });
  }
};
