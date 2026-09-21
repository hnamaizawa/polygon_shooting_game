(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PolygonStrikeCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '0.1.0';
  const CONFIG = Object.freeze({
    worldHalfWidth: 9.2,
    worldHalfHeight: 6.0,
    playerZ: 4.0,
    enemySpawnZ: 82,
    enemyDespawnZ: 1.5,
    enemySpeedMin: 8,
    enemySpeedMax: 13,
    laserSpeed: 62,
    fireCooldown: 0.16,
    collisionXY: 1.35,
    collisionZ: 2.8
  });

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function rand(min, max, rng = Math.random) { return min + (max - min) * rng(); }
  function project3D(point, viewport, focal = 520) {
    const z = Math.max(0.2, point.z);
    return {
      x: viewport.cx + point.x * focal / z,
      y: viewport.cy + point.y * focal / z,
      scale: focal / z
    };
  }
  function spheresHit(a, b, xy = CONFIG.collisionXY, zRange = CONFIG.collisionZ) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.hypot(dx, dy) <= xy && Math.abs(a.z - b.z) <= zRange;
  }
  function scoreForEnemy(enemy) { return enemy.kind === 'dart' ? 150 : 100; }
  function nextEnemySpawn(baseDelay, rng = Math.random) { return baseDelay * rand(0.65, 1.25, rng); }
  function makeEnemy(id, rng = Math.random) {
    return {
      id,
      kind: rng() > 0.72 ? 'dart' : 'fighter',
      x: rand(-7.8, 7.8, rng),
      y: rand(-4.3, 3.0, rng),
      z: CONFIG.enemySpawnZ,
      speed: rand(CONFIG.enemySpeedMin, CONFIG.enemySpeedMax, rng),
      phase: rand(0, Math.PI * 2, rng),
      alive: true
    };
  }
  return { VERSION, CONFIG, clamp, rand, project3D, spheresHit, scoreForEnemy, nextEnemySpawn, makeEnemy };
});
