/* Schnelltest der reinen Spiellogik: node tests/logic.test.js */

const assert = require('assert');
const { applyMove, canMove, highestLevel, levelsToGrid, gridToLevels } = require('../game.js');

function grid(levels) { return levelsToGrid(levels); }

// 1) Gleiten nach links
{
  const g = grid([
    [0, 0, 1, 0],
    [0, 2, 0, 0],
    [0, 0, 0, 3],
    [0, 0, 0, 0],
  ]);
  const r = applyMove(g, 'left');
  assert.deepStrictEqual(gridToLevels(r.grid), [
    [1, 0, 0, 0],
    [2, 0, 0, 0],
    [3, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  assert.strictEqual(r.moved, true);
  assert.strictEqual(r.gained, 0);
}

// 2) Einfaches Verschmelzen
{
  const g = grid([
    [1, 1, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const r = applyMove(g, 'left');
  assert.deepStrictEqual(gridToLevels(r.grid), [
    [2, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  assert.strictEqual(r.gained, 4); // 2^2
  assert.strictEqual(r.merges.length, 1);
}

// 3) Kein Doppel-Verschmelzen in einem Zug: 1,1,1,1 -> 2,2 (nicht 3)
{
  const g = grid([[1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const r = applyMove(g, 'left');
  assert.deepStrictEqual(gridToLevels(r.grid)[0], [2, 2, 0, 0]);
}

// 4) Verschmelz-Reihenfolge in Zugrichtung: 0,1,1,1 -> links: 2,1
{
  const g = grid([[0, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const r = applyMove(g, 'left');
  assert.deepStrictEqual(gridToLevels(r.grid)[0], [2, 1, 0, 0]);
}

// 5) Rechts-Zug spiegelverkehrt: 1,1,1,0 -> rechts: 0,0,1,2
{
  const g = grid([[1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const r = applyMove(g, 'right');
  assert.deepStrictEqual(gridToLevels(r.grid)[0], [0, 0, 1, 2]);
}

// 6) Ungleiche Früchte verschmelzen nicht
{
  const g = grid([[1, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const r = applyMove(g, 'left');
  assert.deepStrictEqual(gridToLevels(r.grid)[0], [1, 2, 0, 0]);
  assert.strictEqual(r.moved, false);
}

// 7) Hoch/Runter
{
  const g = grid([
    [1, 0, 0, 0],
    [1, 0, 0, 0],
    [2, 0, 0, 0],
    [2, 0, 0, 0],
  ]);
  const down = applyMove(g, 'down');
  assert.deepStrictEqual(gridToLevels(down.grid).map(row => row[0]), [0, 0, 2, 3]);
  const up = applyMove(g, 'up');
  assert.deepStrictEqual(gridToLevels(up.grid).map(row => row[0]), [2, 3, 0, 0]);
}

// 8) canMove: volles Brett ohne Paare = Spielende
{
  const g = grid([
    [1, 2, 1, 2],
    [2, 1, 2, 1],
    [1, 2, 1, 2],
    [2, 1, 2, 1],
  ]);
  assert.strictEqual(canMove(g), false);
  const g2 = grid([
    [1, 2, 1, 2],
    [2, 1, 2, 1],
    [1, 2, 1, 2],
    [2, 1, 2, 2],
  ]);
  assert.strictEqual(canMove(g2), true);
}

// 9) highestLevel
{
  const g = grid([[1, 0, 0, 0], [0, 7, 0, 0], [0, 0, 3, 0], [0, 0, 0, 0]]);
  assert.strictEqual(highestLevel(g), 7);
}

console.log('✅ Alle Logik-Tests bestanden.');
