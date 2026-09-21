(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PolygonStrikeCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '0.4.0';
  const CONFIG = Object.freeze({
    worldHalfWidth: 9.2,
    worldHalfHeight: 6.0,
    flightPlaneY: 3.25,
    groundPlaneY: 7.15,
    playerZ: 9.0,
    playerMinZ: 7.0,
    playerMaxZ: 26.0,
    playerMoveSpeedX: 8.8,
    playerMoveSpeedZ: 14.0,
    enemySpawnZ: 94,
    enemyDespawnZ: 2.0,
    enemySpeedMin: 10.5,
    enemySpeedMax: 15.5,
    groundScrollSpeed: 10.2,
    laserSpeed: 66,
    fireCooldown: 0.16,
    collisionXY: 1.35,
    collisionZ: 3.2,
    cameraPitchDeg: 30,
    cameraFocal: 500,
    cameraBackOffset: 4.0,
    stageDurationSec: 300,
    bossIntroSec: 270,
    stageCount: 4
  });

  const STAGES = Object.freeze([
    Object.freeze({ number:1, name:'EARTH ORBIT', backdrop:'earth', speedMultiplier:1.00, spawnBase:0.92, groundChance:0.22, bossHp:40 }),
    Object.freeze({ number:2, name:'DEEP SPACE', backdrop:'space', speedMultiplier:1.10, spawnBase:0.82, groundChance:0.26, bossHp:55 }),
    Object.freeze({ number:3, name:'ENEMY FLAGSHIP', backdrop:'carrier', speedMultiplier:1.20, spawnBase:0.72, groundChance:0.34, bossHp:70 }),
    Object.freeze({ number:4, name:'FLAGSHIP CORE', backdrop:'interior', speedMultiplier:1.32, spawnBase:0.62, groundChance:0.40, bossHp:90 })
  ]);

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function rand(min, max, rng = Math.random) { return min + (max - min) * rng(); }
  function stageConfig(stageNumber) { return STAGES[clamp(Math.floor(stageNumber || 1), 1, STAGES.length) - 1]; }
  function stagePhase(stageElapsed) { return stageElapsed >= CONFIG.bossIntroSec ? 'boss' : 'normal'; }
  function stageRemaining(stageElapsed) { return Math.max(0, CONFIG.stageDurationSec - stageElapsed); }

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

  // Ground targets are intentionally hit in the X/Z plane so forward lasers can destroy surface installations.
  function planarHit(a, b, xRange = 1.35, zRange = 3.0) {
    return Math.abs(a.x - b.x) <= xRange && Math.abs(a.z - b.z) <= zRange;
  }

  function scoreForEnemy(enemy) {
    if (enemy.kind === 'boss') return 5000 + (enemy.stage || 1) * 1000;
    if (enemy.kind === 'turret') return 250;
    if (enemy.kind === 'interceptor') return 220;
    if (enemy.kind === 'dart') return 170;
    return 120;
  }

  function nextEnemySpawn(baseDelay, rng = Math.random) { return baseDelay * rand(0.62, 1.18, rng); }

  function makeEnemy(id, stageNumber = 1, rng = Math.random) {
    if (typeof stageNumber === 'function') { rng = stageNumber; stageNumber = 1; }
    const stage = stageConfig(stageNumber);
    const kindRoll = rng();
    const patternRoll = rng();
    const kind = kindRoll > 0.78 ? 'dart' : kindRoll > 0.47 ? 'fighter' : 'interceptor';
    const patterns = ['weave', 'zigzag', 'sweep', 'hunter'];
    const pattern = patterns[Math.min(patterns.length - 1, Math.floor(patternRoll * patterns.length))];
    return {
      id,
      kind,
      pattern,
      x: rand(-7.8, 7.8, rng),
      y: CONFIG.flightPlaneY,
      z: CONFIG.enemySpawnZ,
      speed: rand(CONFIG.enemySpeedMin, CONFIG.enemySpeedMax, rng) * stage.speedMultiplier,
      phase: rand(0, Math.PI * 2, rng),
      alive: true,
      stage: stage.number
    };
  }

  function moveEnemy(enemy, elapsed, dt, playerX = 0) {
    let x = enemy.x;
    const p = enemy.phase || 0;
    switch (enemy.pattern) {
      case 'zigzag':
        x += (Math.sin(elapsed * 3.4 + p) >= 0 ? 1 : -1) * 2.7 * dt;
        break;
      case 'sweep':
        x += Math.sin(elapsed * 1.45 + p) * 4.0 * dt;
        break;
      case 'hunter':
        x += clamp(playerX - x, -1.8, 1.8) * 1.25 * dt + Math.sin(elapsed * 2.1 + p) * 0.9 * dt;
        break;
      default:
        x += Math.sin(elapsed * 2.7 + p) * 2.25 * dt;
        break;
    }
    return {
      ...enemy,
      x: clamp(x, -CONFIG.worldHalfWidth, CONFIG.worldHalfWidth),
      y: CONFIG.flightPlaneY,
      z: enemy.z - enemy.speed * dt
    };
  }

  function makeGroundEnemy(id, stageNumber = 1, rng = Math.random) {
    if (typeof stageNumber === 'function') { rng = stageNumber; stageNumber = 1; }
    const stage = stageConfig(stageNumber);
    const hp = 1 + Math.floor(stage.number / 2);
    return {
      id,
      kind: 'turret',
      x: rand(-7.2, 7.2, rng),
      y: CONFIG.groundPlaneY,
      z: CONFIG.enemySpawnZ,
      speed: CONFIG.groundScrollSpeed * stage.speedMultiplier,
      hp,
      maxHp: hp,
      phase: rand(0, Math.PI * 2, rng),
      alive: true,
      stage: stage.number
    };
  }

  function moveGroundEnemy(enemy, dt) {
    return { ...enemy, y: CONFIG.groundPlaneY, z: enemy.z - enemy.speed * dt };
  }

  function makeBoss(stageNumber = 1) {
    const stage = stageConfig(stageNumber);
    return {
      id: `boss-${stage.number}`,
      kind: 'boss',
      x: 0,
      y: CONFIG.flightPlaneY,
      z: 66,
      hp: stage.bossHp,
      maxHp: stage.bossHp,
      alive: true,
      stage: stage.number
    };
  }

  function moveBoss(boss, elapsed) {
    const stage = stageConfig(boss.stage || 1);
    const intensity = 1 + (stage.number - 1) * 0.12;
    return {
      ...boss,
      x: Math.sin(elapsed * 0.68) * 5.4 * intensity + Math.sin(elapsed * 1.93) * 1.15,
      y: CONFIG.flightPlaneY,
      z: 60 + Math.sin(elapsed * 0.47) * (5.5 + stage.number * 0.8)
    };
  }

  return {
    VERSION, CONFIG, STAGES, clamp, rand, stageConfig, stagePhase, stageRemaining,
    project3D, projectChase3D, movePlayer, spheresHit, planarHit,
    scoreForEnemy, nextEnemySpawn, makeEnemy, moveEnemy,
    makeGroundEnemy, moveGroundEnemy, makeBoss, moveBoss
  };
});
