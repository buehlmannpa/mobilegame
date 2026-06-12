/* ============================================================
   Frutti – Früchte-Merge-Spiel
   Reine Spiellogik (testbar) + Browser-UI
   ============================================================ */

'use strict';

const SIZE = 4;
const WIN_LEVEL = 11; // Kokosnuss
const MAX_LEVEL = 12; // Königsfrucht

const FRUITS = [
  { emoji: '🍒', name: 'Kirsche' },
  { emoji: '🍓', name: 'Erdbeere' },
  { emoji: '🍇', name: 'Traube' },
  { emoji: '🍊', name: 'Orange' },
  { emoji: '🍋', name: 'Zitrone' },
  { emoji: '🍎', name: 'Apfel' },
  { emoji: '🍑', name: 'Pfirsich' },
  { emoji: '🍉', name: 'Wassermelone' },
  { emoji: '🍍', name: 'Ananas' },
  { emoji: '🥝', name: 'Kiwi' },
  { emoji: '🥥', name: 'Kokosnuss' },
  { emoji: '👑', name: 'Königsfrucht' },
];

const VECTORS = {
  left:  { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
  up:    { dr: -1, dc: 0 },
  down:  { dr: 1, dc: 0 },
};

let idCounter = 1;
function nextId() { return idCounter++; }

function emptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

function gridToLevels(grid) {
  return grid.map(row => row.map(t => (t ? t.level : 0)));
}

function levelsToGrid(levels) {
  return levels.map(row =>
    row.map(l => (l ? { id: nextId(), level: l } : null))
  );
}

function emptyCells(grid) {
  const cells = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (!grid[r][c]) cells.push({ r, c });
  return cells;
}

/**
 * Führt einen Zug aus. Verändert `grid` nicht, sondern liefert:
 * { grid, moved, gained, slides: [{id, to}], merges: [{tile, r, c}] }
 */
function applyMove(grid, dir) {
  const v = VECTORS[dir];
  const rows = [0, 1, 2, 3];
  const cols = [0, 1, 2, 3];
  if (v.dr === 1) rows.reverse();
  if (v.dc === 1) cols.reverse();

  const out = emptyGrid();
  const slides = [];
  const merges = [];
  let moved = false;
  let gained = 0;

  for (const r of rows) {
    for (const c of cols) {
      const tile = grid[r][c];
      if (!tile) continue;

      // So weit wie möglich in Zugrichtung rutschen
      let nr = r, nc = c;
      while (true) {
        const tr = nr + v.dr, tc = nc + v.dc;
        if (tr < 0 || tr >= SIZE || tc < 0 || tc >= SIZE) break;
        if (out[tr][tc]) break;
        nr = tr; nc = tc;
      }

      const tr = nr + v.dr, tc = nc + v.dc;
      const neighbor = (tr >= 0 && tr < SIZE && tc >= 0 && tc < SIZE) ? out[tr][tc] : null;

      if (neighbor && neighbor.level === tile.level && !neighbor.justMerged) {
        // Verschmelzen: beide Kacheln gleiten zur Zielzelle, neue Frucht entsteht
        const merged = { id: nextId(), level: tile.level + 1, justMerged: true };
        out[tr][tc] = merged;
        slides.push({ id: tile.id, to: { r: tr, c: tc } });
        merges.push({ tile: merged, r: tr, c: tc });
        gained += Math.pow(2, merged.level);
        moved = true;
      } else {
        out[nr][nc] = tile;
        slides.push({ id: tile.id, to: { r: nr, c: nc } });
        if (nr !== r || nc !== c) moved = true;
      }
    }
  }

  for (const row of out) for (const t of row) if (t) delete t.justMerged;

  return { grid: out, moved, gained, slides, merges };
}

function spawnTile(grid, rng = Math.random) {
  const cells = emptyCells(grid);
  if (!cells.length) return null;
  const { r, c } = cells[Math.floor(rng() * cells.length)];
  const tile = { id: nextId(), level: rng() < 0.9 ? 1 : 2 };
  grid[r][c] = tile;
  return { tile, r, c };
}

function canMove(grid) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const t = grid[r][c];
      if (!t) return true;
      if (r + 1 < SIZE && grid[r + 1][c] && grid[r + 1][c].level === t.level) return true;
      if (c + 1 < SIZE && grid[r][c + 1] && grid[r][c + 1].level === t.level) return true;
    }
  }
  return false;
}

function highestLevel(grid) {
  let max = 0;
  for (const row of grid) for (const t of row) if (t && t.level > max) max = t.level;
  return max;
}

// Export für Tests unter Node
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { applyMove, spawnTile, canMove, highestLevel, levelsToGrid, gridToLevels, emptyGrid, SIZE, WIN_LEVEL, MAX_LEVEL };
}

/* ============================================================
   Browser-UI
   ============================================================ */

if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);

  const STORE_KEY = 'frutti-state-v1';
  const SLIDE_MS = 120;

  let grid = emptyGrid();
  let score = 0;
  let best = 0;
  let keepPlaying = false;
  let gameOver = false;
  let discovered = new Set([1]);
  let streak = { last: '', count: 1 };
  let undoStack = [];
  let soundOn = true;
  let animating = false;
  let playerName = '';
  let highscores = []; // [{ name, score }] – bester Punktestand je Spieler

  const tileEls = new Map(); // Kachel-ID -> DOM-Element

  /* ---------- Speichern & Laden ---------- */

  function save() {
    const data = {
      levels: gridToLevels(grid),
      score, best, keepPlaying, gameOver,
      discovered: [...discovered],
      streak, soundOn,
      playerName, highscores,
    };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* privater Modus */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      grid = levelsToGrid(data.levels);
      score = data.score || 0;
      best = data.best || 0;
      keepPlaying = !!data.keepPlaying;
      gameOver = !!data.gameOver;
      discovered = new Set(data.discovered || [1]);
      streak = data.streak || { last: '', count: 1 };
      soundOn = data.soundOn !== false;
      playerName = data.playerName || '';
      highscores = Array.isArray(data.highscores) ? data.highscores : [];
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- Tages-Serie ---------- */

  function dayKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function updateStreak() {
    const today = dayKey(new Date());
    if (streak.last === today) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (streak.last === dayKey(yesterday)) {
      streak.count += 1;
      showToast(`🔥 ${streak.count} Tage in Folge – schön, dass du da bist!`);
    } else if (streak.last) {
      streak.count = 1;
    }
    streak.last = today;
    save();
  }

  /* ---------- Töne (dezent, abschaltbar) ---------- */

  let audioCtx = null;

  function blip(level) {
    if (!soundOn) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 280 + level * 45;
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) { /* Ton ist optional */ }
  }

  /* ---------- Konfetti ---------- */

  const confettiCanvas = $('confetti');
  const ctx = confettiCanvas.getContext('2d');
  let particles = [];
  let confettiRunning = false;

  function burstConfetti(amount = 90) {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    const colors = ['#ffd166', '#ffb4a2', '#b8e0d2', '#f3a0c0', '#a0c4ff', '#caffbf'];
    for (let i = 0; i < amount; i++) {
      particles.push({
        x: confettiCanvas.width / 2 + (Math.random() - 0.5) * 120,
        y: confettiCanvas.height * 0.4,
        vx: (Math.random() - 0.5) * 9,
        vy: -Math.random() * 9 - 3,
        size: Math.random() * 7 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 130,
      });
    }
    if (!confettiRunning) { confettiRunning = true; requestAnimationFrame(tickConfetti); }
  }

  function tickConfetti() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    particles = particles.filter(p => p.life > 0 && p.y < confettiCanvas.height + 20);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.rot += p.vr; p.life--;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.min(1, p.life / 40);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (particles.length) {
      requestAnimationFrame(tickConfetti);
    } else {
      confettiRunning = false;
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  /* ---------- Darstellung ---------- */

  function tilePos(el, r, c) {
    el.style.top = `calc(${r} * (var(--tile) + var(--gap)))`;
    el.style.left = `calc(${c} * (var(--tile) + var(--gap)))`;
  }

  function makeTileEl(tile, r, c, animClass) {
    const el = document.createElement('div');
    el.className = `tile l${tile.level}${animClass ? ' ' + animClass : ''}`;
    el.textContent = FRUITS[tile.level - 1].emoji;
    tilePos(el, r, c);
    $('tiles').appendChild(el);
    tileEls.set(tile.id, el);
    return el;
  }

  function renderAll() {
    $('tiles').innerHTML = '';
    tileEls.clear();
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (grid[r][c]) makeTileEl(grid[r][c], r, c);
    updateHud();
  }

  function updateHud(bumpScore) {
    $('score').textContent = score;
    $('best').textContent = best;
    $('streak').textContent = streak.count;
    $('btn-undo').disabled = undoStack.length === 0;
    if (bumpScore) {
      const el = $('score');
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  }

  function showToast(msg, ms = 2600) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.add('hidden'), ms);
  }

  /* ---------- Spielablauf ---------- */

  function newGame() {
    grid = emptyGrid();
    score = 0;
    keepPlaying = false;
    gameOver = false;
    undoStack = [];
    spawnTile(grid);
    spawnTile(grid);
    $('overlay-win').classList.add('hidden');
    $('overlay-over').classList.add('hidden');
    renderAll();
    save();
  }

  function pushUndo() {
    undoStack.push({ levels: gridToLevels(grid), score, keepPlaying });
    if (undoStack.length > 50) undoStack.shift();
  }

  function undo() {
    const prev = undoStack.pop();
    if (!prev) return;
    grid = levelsToGrid(prev.levels);
    score = prev.score;
    keepPlaying = prev.keepPlaying;
    gameOver = false;
    $('overlay-over').classList.add('hidden');
    $('overlay-win').classList.add('hidden');
    renderAll();
    save();
  }

  function handleMove(dir) {
    if (animating || gameOver) return;
    if (!$('overlay-win').classList.contains('hidden')) return;
    const result = applyMove(grid, dir);
    if (!result.moved) return;

    animating = true;
    pushUndo();
    updateStreak();

    // 1) Gleiten: bestehende Elemente an neue Positionen schieben
    for (const s of result.slides) {
      const el = tileEls.get(s.id);
      if (el) tilePos(el, s.to.r, s.to.c);
    }

    grid = result.grid;
    score += result.gained;
    if (score > best) best = score;

    // 2) Nach dem Gleiten: verschmolzene Früchte zeigen + neue Frucht setzen
    setTimeout(() => {
      for (const m of result.merges) {
        for (const s of result.slides) {
          if (s.to.r === m.r && s.to.c === m.c) {
            const el = tileEls.get(s.id);
            if (el) { el.remove(); tileEls.delete(s.id); }
          }
        }
        makeTileEl(m.tile, m.r, m.c, 'pop');
      }

      if (result.merges.length) {
        const topMerge = Math.max(...result.merges.map(m => m.tile.level));
        blip(topMerge);
        checkDiscoveries(result.merges);
      }

      const spawned = spawnTile(grid);
      if (spawned) makeTileEl(spawned.tile, spawned.r, spawned.c, 'appear');

      upsertHighscore();
      updateHud(result.gained > 0);
      animating = false;

      checkEnd();
      save();
    }, SLIDE_MS);
  }

  function checkDiscoveries(merges) {
    for (const m of merges) {
      const lvl = m.tile.level;
      if (!discovered.has(lvl)) {
        discovered.add(lvl);
        const fruit = FRUITS[lvl - 1];
        showToast(`✨ Neue Frucht entdeckt: ${fruit.name} ${fruit.emoji}`);
        burstConfetti(50);
      }
    }
  }

  function checkEnd() {
    if (!keepPlaying && highestLevel(grid) >= WIN_LEVEL) {
      burstConfetti(160);
      $('overlay-win').classList.remove('hidden');
      return;
    }
    if (!canMove(grid)) {
      gameOver = true;
      $('final-score').textContent = score;
      $('overlay-over').classList.remove('hidden');
    }
  }

  /* ---------- Bestenliste ---------- */

  function upsertHighscore() {
    if (!playerName || score <= 0) return;
    const entry = highscores.find(h => h.name === playerName);
    if (!entry) {
      highscores.push({ name: playerName, score });
    } else if (score > entry.score) {
      entry.score = score;
    }
    highscores.sort((a, b) => b.score - a.score);
    highscores = highscores.slice(0, 20);
  }

  function renderHighscores() {
    const list = $('highscores-list');
    list.innerHTML = '';
    $('highscores-empty').classList.toggle('hidden', highscores.length > 0);
    const medals = ['🥇', '🥈', '🥉'];
    highscores.forEach((h, i) => {
      const li = document.createElement('li');
      if (h.name === playerName) li.classList.add('me');
      const rank = document.createElement('span');
      rank.className = 'hs-rank';
      rank.textContent = medals[i] || `${i + 1}.`;
      const name = document.createElement('span');
      name.className = 'hs-name';
      name.textContent = h.name;
      const pts = document.createElement('span');
      pts.className = 'hs-score';
      pts.textContent = `${h.score} Punkte`;
      li.append(rank, name, pts);
      list.appendChild(li);
    });
  }

  function setPlayerName(name) {
    playerName = name.trim().slice(0, 16) || 'Spieler';
    $('player-name').textContent = playerName;
    save();
  }

  function openNameModal() {
    $('input-name').value = playerName;
    $('modal-name').classList.remove('hidden');
    $('input-name').focus();
  }

  /* ---------- Sammlung ---------- */

  function renderCollection() {
    const wrap = $('collection-grid');
    wrap.innerHTML = '';
    FRUITS.forEach((fruit, i) => {
      const lvl = i + 1;
      const card = document.createElement('div');
      const found = discovered.has(lvl);
      card.className = 'fruit-card' + (found ? '' : ' locked');
      card.innerHTML = `
        <span class="fruit-emoji">${fruit.emoji}</span>
        <span class="fruit-name">${found ? fruit.name : '???'}</span>`;
      wrap.appendChild(card);
    });
  }

  /* ---------- Eingaben ---------- */

  function setupInput() {
    document.addEventListener('keydown', e => {
      const map = {
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        a: 'left', d: 'right', w: 'up', s: 'down',
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); handleMove(dir); }
    });

    const board = $('board');
    let startX = 0, startY = 0, touching = false;

    board.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) return;
      touching = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    board.addEventListener('touchend', e => {
      if (!touching) return;
      touching = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const absX = Math.abs(dx), absY = Math.abs(dy);
      if (Math.max(absX, absY) < 24) return;
      handleMove(absX > absY ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    }, { passive: true });

    // Maus-Wischen für Desktop-Tests
    let mouseDown = false;
    board.addEventListener('mousedown', e => { mouseDown = true; startX = e.clientX; startY = e.clientY; });
    document.addEventListener('mouseup', e => {
      if (!mouseDown) return;
      mouseDown = false;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      const absX = Math.abs(dx), absY = Math.abs(dy);
      if (Math.max(absX, absY) < 24) return;
      handleMove(absX > absY ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });
  }

  function setupButtons() {
    $('btn-new').addEventListener('click', () => {
      if (score > 0 && !gameOver) {
        if (!confirm('Wirklich ein neues Spiel beginnen?')) return;
      }
      newGame();
    });
    $('btn-undo').addEventListener('click', undo);
    $('btn-over-undo').addEventListener('click', undo);
    $('btn-over-new').addEventListener('click', newGame);
    $('btn-win-new').addEventListener('click', newGame);
    $('btn-continue').addEventListener('click', () => {
      keepPlaying = true;
      $('overlay-win').classList.add('hidden');
      save();
    });

    $('btn-help').addEventListener('click', () => $('modal-help').classList.remove('hidden'));
    $('btn-player').addEventListener('click', openNameModal);
    $('btn-change-name').addEventListener('click', () => {
      $('modal-highscores').classList.add('hidden');
      openNameModal();
    });
    $('btn-highscores').addEventListener('click', () => {
      renderHighscores();
      $('modal-highscores').classList.remove('hidden');
    });
    $('form-name').addEventListener('submit', e => {
      e.preventDefault();
      const newName = $('input-name').value.trim().slice(0, 16) || 'Spieler';
      const midGameSwitch = playerName && playerName !== newName && score > 0 && !gameOver;
      setPlayerName(newName);
      $('modal-name').classList.add('hidden');
      showToast(midGameSwitch
        ? `Hallo ${playerName}! Tipp: Mit 🌱 Neu startest du dein eigenes Spiel.`
        : `Viel Spaß, ${playerName}! 🍀`, midGameSwitch ? 4000 : 2600);
    });
    $('btn-collection').addEventListener('click', () => {
      renderCollection();
      $('modal-collection').classList.remove('hidden');
    });

    $('modal-name').addEventListener('click', e => {
      if (e.target === $('modal-name') || e.target.hasAttribute('data-close')) {
        if (!playerName) setPlayerName('Spieler');
      }
    });

    document.querySelectorAll('[data-close]').forEach(btn =>
      btn.addEventListener('click', () => btn.closest('.modal').classList.add('hidden')));
    document.querySelectorAll('.modal').forEach(modal =>
      modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); }));

    const soundBtn = $('btn-sound');
    const renderSound = () => { soundBtn.textContent = soundOn ? '🔊' : '🔇'; };
    soundBtn.addEventListener('click', () => { soundOn = !soundOn; renderSound(); save(); });
    renderSound();
  }

  /* ---------- Start ---------- */

  function init() {
    const cells = $('cells');
    for (let i = 0; i < SIZE * SIZE; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cells.appendChild(cell);
    }

    const hadSave = load();
    setupButtons();
    setupInput();

    if (!hadSave || emptyCells(grid).length === SIZE * SIZE) {
      newGame();
    } else {
      renderAll();
      if (gameOver) {
        $('final-score').textContent = score;
        $('overlay-over').classList.remove('hidden');
      }
    }
    updateStreak();
    updateHud();

    if (playerName) {
      $('player-name').textContent = playerName;
    } else {
      $('player-name').textContent = 'Spieler';
      openNameModal();
    }

    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  init();
}
