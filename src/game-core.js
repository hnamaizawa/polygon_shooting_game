(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PolygonStrikeCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '0.3.1';
  const CONFIG = Object.freeze({
    worldHalfWidth: 9.2,
    worldHalfHeight: 6.0,
    flightPlaneY: 3.25,
    playerZ: 9.0,
    playerMinZ: 7.0,
    playerMaxZ: 26.0,
    playerMoveSpeedX: 8.8,
    playerMoveSpeedZ: 14.0,
    enemySpawnZ: 82,
    enemyDespawnZ: 2.0,
    enemySpeedMin: 8,
    enemySpeedMax: 13,
    laserSpeed: 62,
    fireCooldown: 0.16,
    collisionXY: 1.35,
    collisionZ: 3.2,
    cameraPitchDeg: 30,
    cameraFocal: 500,
    cameraBackOffset: 4.0
  });

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function rand(min, max, rng = Math.random) { return min + (max - min) * rng(); }

  function project3D(point, viewport, focal = 520) {
    const z = Math.max(0.2, point.z);
    return { x: viewport.cx + point.x * focal / z, y: viewport.cy + point.y * focal / z, scale: focal / z, depth: z };
  }

  function projectChase3D(
    point,
    viewport,
    focal = CONFIG.cameraFocal,
    pitch = CONFIG.cameraPitchDeg * Math.PI / 180,
    backOffset = CONFIG.cameraBackOffset
  ) {
    const cos = Math.cos(pitch), sin = Math.sin(pitch);
    const yCam = point.y * cos - point.z * sin;
    const zCam = point.y * sin + point.z * cos + backOffset;
    const z = Math.max(0.2, zCam);
    return { x: viewport.cx + point.x * focal / z, y: viewport.cy + yCam * focal / z, scale: focal / z, depth: zCam };
  }

  function movePlayer(player, input, dt) {
    let x = player.x;
    let z = player.z;
    if (input.left) x -= CONFIG.playerMoveSpeedX * dt;
    if (input.right) x += CONFIG.playerMoveSpeedX * dt;
    if (input.forward) z += CONFIG.playerMoveSpeedZ * dt;
    if (input.backward) z -= CONFIG.playerMoveSpeedZ * dt;
    return {
      ...player,
      x: clamp(x, -CONFIG.worldHalfWidth, CONFIG.worldHalfWidth),
      y: CONFIG.flightPlaneY,
      z: clamp(z, CONFIG.playerMinZ, CONFIG.playerMaxZ)
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
      y: CONFIG.flightPlaneY,
      z: CONFIG.enemySpawnZ,
      speed: rand(CONFIG.enemySpeedMin, CONFIG.enemySpeedMax, rng),
      phase: rand(0, Math.PI * 2, rng),
      alive: true
    };
  }

  return {
    VERSION, CONFIG, clamp, rand, project3D, projectChase3D, movePlayer,
    spheresHit, scoreForEnemy, nextEnemySpawn, makeEnemy
  };
});
