(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PolygonStrikeCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '0.5.1';
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
    backgroundScrollSpeed: 10.2,
    mapSegmentLength: 14,
    laserSpeed: 66,
    fireCooldown: 0.22,
    playerBeamRange: 112,
    playerBeamWidth: 0.78,
    playerBeamDamageInterval: 0.13,
    playerBeamChargeSec: 1.35,
    playerBeamActiveSec: 1.0,
    enemyBeamWidth: 0.72,
    enemyBeamChargeSec: 0.65,
    enemyBeamActiveSec: 0.48,
    enemyBulletSpeed: 28,
    collisionXY: 1.35,
    collisionZ: 3.2,
    cameraPitchDeg: 30,
    cameraFocal: 500,
    cameraBackOffset: 4.0,
    stageDurationSec: 60,
    bossIntroSec: 50,
    stageCount: 4,
    defaultLives: 3,
    backdropTransitionSec: 4
  });

  const STAGES = Object.freeze([
    Object.freeze({ number:1, name:'EARTH SURFACE', backdrop:'earthSurface', speedMultiplier:1.00, spawnBase:0.90, groundChance:0.28, armorChance:0.05, airFireRate:0.16, groundFireRate:0.09, bossFireRate:0.62, beamChance:0.05, bossHp:42 }),
    Object.freeze({ number:2, name:'DEEP SPACE', backdrop:'space', speedMultiplier:1.10, spawnBase:0.80, groundChance:0.24, armorChance:0.07, airFireRate:0.18, groundFireRate:0.10, bossFireRate:0.68, beamChance:0.09, bossHp:58 }),
    Object.freeze({ number:3, name:'ENEMY FLAGSHIP', backdrop:'carrier', speedMultiplier:1.20, spawnBase:0.70, groundChance:0.32, armorChance:0.09, airFireRate:0.20, groundFireRate:0.12, bossFireRate:0.74, beamChance:0.14, bossHp:74 }),
    Object.freeze({ number:4, name:'FLAGSHIP CORE', backdrop:'interior', speedMultiplier:1.32, spawnBase:0.60, groundChance:0.38, armorChance:0.12, airFireRate:0.22, groundFireRate:0.14, bossFireRate:0.82, beamChance:0.20, bossHp:96 })
  ]);

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function rand(min, max, rng = Math.random) { return min + (max - min) * rng(); }
  function stageConfig(stageNumber) { return STAGES[clamp(Math.floor(stageNumber || 1), 1, STAGES.length) - 1]; }
  function stagePhase(stageElapsed) { return stageElapsed >= CONFIG.bossIntroSec ? 'boss' : 'normal'; }
  function stageRemaining(stageElapsed) { return Math.max(0, CONFIG.stageDurationSec - stageElapsed); }
  function shouldAdvanceStage(stageElapsed) { return stageElapsed >= CONFIG.stageDurationSec; }

  function continueCampaign(snapshot = {}) {
    return {
      stage: clamp(Math.floor(snapshot.stage || 1), 1, CONFIG.stageCount),
      score: Math.max(0, Math.floor(snapshot.score || 0)),
      worldScroll: Math.max(0, Number(snapshot.worldScroll) || 0),
      continueCount: Math.max(0, Math.floor(snapshot.continueCount || 0)) + 1,
      lives: CONFIG.defaultLives,
      stageElapsed: 0
    };
  }

  function nextLives(lives, invincible = false) {
    return invincible ? Math.max(0, lives) : Math.max(0, lives - 1);
  }

  function project3D(point, viewport, focal = 520) {
    const z = Math.max(0.2, point.z);
    return { x: viewport.cx + point.x * focal / z, y: viewport.cy + point.y * focal / z, scale: focal / z, depth: z };
  }

  function projectChase3D(point, viewport, focal = CONFIG.cameraFocal, pitch = CONFIG.cameraPitchDeg * Math.PI / 180, backOffset = CONFIG.cameraBackOffset) {
    const cos = Math.cos(pitch), sin = Math.sin(pitch);
    const yCam = point.y * cos - point.z * sin;
    const zCam = point.y * sin + point.z * cos + backOffset;
    const z = Math.max(0.2, zCam);
    return { x: viewport.cx + point.x * focal / z, y: viewport.cy + yCam * focal / z, scale: focal / z, depth: zCam };
  }

  function movePlayer(player, input, dt) {
    let x = player.x, z = player.z;
    if (input.left) x -= CONFIG.playerMoveSpeedX * dt;
    if (input.right) x += CONFIG.playerMoveSpeedX * dt;
    if (input.forward) z += CONFIG.playerMoveSpeedZ * dt;
    if (input.backward) z -= CONFIG.playerMoveSpeedZ * dt;
    return { ...player, x: clamp(x, -CONFIG.worldHalfWidth, CONFIG.worldHalfWidth), y: CONFIG.flightPlaneY, z: clamp(z, CONFIG.playerMinZ, CONFIG.playerMaxZ) };
  }

  function spheresHit(a, b, xy = CONFIG.collisionXY, zRange = CONFIG.collisionZ) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.hypot(dx, dy) <= xy && Math.abs(a.z - b.z) <= zRange;
  }

  function planarHit(a, b, xRange = 1.35, zRange = 3.0) {
    return Math.abs(a.x - b.x) <= xRange && Math.abs(a.z - b.z) <= zRange;
  }

  function scoreForEnemy(enemy) {
    if (enemy.kind === 'boss') return 5000 + (enemy.stage || 1) * 1000;
    if (enemy.kind === 'laserTurret') return 360;
    if (enemy.kind === 'turret') return 250;
    if (enemy.kind === 'beamfighter') return 420;
    if (enemy.kind === 'bomber') return 350;
    if (enemy.kind === 'raider') return 280;
    if (enemy.kind === 'interceptor') return 220;
    if (enemy.kind === 'dart') return 170;
    return 120;
  }

  function nextEnemySpawn(baseDelay, rng = Math.random) { return baseDelay * rand(0.62, 1.18, rng); }

  function enemyKindsForStage(stageNumber) {
    const stage = clamp(Math.floor(stageNumber || 1), 1, CONFIG.stageCount);
    if (stage === 1) return ['interceptor','fighter','dart','raider'];
    if (stage === 2) return ['interceptor','fighter','dart','raider','bomber','beamfighter'];
    return ['interceptor','fighter','dart','raider','bomber','beamfighter'];
  }

  function makeEnemy(id, stageNumber = 1, rng = Math.random) {
    if (typeof stageNumber === 'function') { rng = stageNumber; stageNumber = 1; }
    const stage = stageConfig(stageNumber);
    const kinds = enemyKindsForStage(stage.number);
    const kindRoll = rng();
    const kind = kinds[Math.min(kinds.length - 1, Math.floor(kindRoll * kinds.length))];
    const patternByKind = {
      interceptor:'hunter', fighter:'weave', dart:'dash', raider:'cross', bomber:'orbit', beamfighter:'stalk'
    };
    const hpByKind = { interceptor:1, fighter:1, dart:1, raider:1, bomber:3, beamfighter:2 };
    const speedScale = { interceptor:1.02, fighter:1.0, dart:1.28, raider:1.18, bomber:.76, beamfighter:.88 }[kind] || 1;
    let x = rand(-7.8, 7.8, rng);
    if (kind === 'raider') x = rng() > .5 ? -8.5 : 8.5;
    const hp = hpByKind[kind] || 1;
    return {
      id, kind, pattern:patternByKind[kind],
      weapon:kind === 'beamfighter' ? 'beam' : 'bullet',
      x, y:CONFIG.flightPlaneY, z:CONFIG.enemySpawnZ,
      speed:rand(CONFIG.enemySpeedMin, CONFIG.enemySpeedMax, rng) * stage.speedMultiplier * speedScale,
      phase:rand(0, Math.PI * 2, rng), hp, maxHp:hp, alive:true, stage:stage.number,
      beamCooldown:rand(1.4, 2.8, rng), beamCharge:0, beamActive:0, beamX:x
    };
  }

  function moveEnemy(enemy, elapsed, dt, playerX = 0) {
    let x = enemy.x;
    let z = enemy.z - enemy.speed * dt;
    const p = enemy.phase || 0;
    switch (enemy.pattern) {
      case 'dash': {
        const burst = (Math.sin(elapsed * 2.0 + p) > .68) ? 1.9 : .82;
        z = enemy.z - enemy.speed * burst * dt;
        x += Math.sin(elapsed * 4.2 + p) * 1.5 * dt;
        break;
      }
      case 'cross': {
        const direction = Math.cos(p) >= 0 ? 1 : -1;
        x += direction * 5.4 * dt + Math.sin(elapsed * 2.7 + p) * .8 * dt;
        z = enemy.z - enemy.speed * .88 * dt;
        break;
      }
      case 'orbit':
        x += Math.sin(elapsed * 1.05 + p) * 4.5 * dt + Math.sin(elapsed * 2.4 + p) * 1.1 * dt;
        z = enemy.z - enemy.speed * (.72 + .14 * Math.cos(elapsed * 1.4 + p)) * dt;
        break;
      case 'stalk':
        x += clamp(playerX - x, -1.4, 1.4) * 1.45 * dt + Math.sin(elapsed * 1.6 + p) * .45 * dt;
        z = enemy.z - enemy.speed * (enemy.z < 48 ? .38 : .92) * dt;
        break;
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
    return { ...enemy, x:clamp(x, -CONFIG.worldHalfWidth, CONFIG.worldHalfWidth), y:CONFIG.flightPlaneY, z };
  }

  function makeGroundEnemy(id, stageNumber = 1, rng = Math.random) {
    if (typeof stageNumber === 'function') { rng = stageNumber; stageNumber = 1; }
    const stage = stageConfig(stageNumber);
    const laserTurret = stage.number >= 3 && rng() < .26;
    const hp = (laserTurret ? 3 : 1) + Math.floor(stage.number / 2);
    return {
      id, kind:laserTurret ? 'laserTurret' : 'turret', weapon:laserTurret ? 'beam' : 'bullet',
      x:rand(-7.2,7.2,rng), y:CONFIG.groundPlaneY, z:CONFIG.enemySpawnZ,
      speed:CONFIG.groundScrollSpeed * stage.speedMultiplier, hp, maxHp:hp,
      phase:rand(0,Math.PI*2,rng), alive:true, stage:stage.number,
      beamCooldown:rand(1.6,3.0,rng), beamCharge:0, beamActive:0, beamX:0
    };
  }

  function moveGroundEnemy(enemy, dt) { return { ...enemy, y:CONFIG.groundPlaneY, z:enemy.z - enemy.speed * dt }; }

  function makeArmorPlate(id, stageNumber = 1, rng = Math.random) {
    if (typeof stageNumber === 'function') { rng = stageNumber; stageNumber = 1; }
    const stage = stageConfig(stageNumber);
    return { id, kind:'armorPlate', x:rand(-7.4,7.4,rng), y:CONFIG.flightPlaneY, z:CONFIG.enemySpawnZ, speed:rand(9,12,rng)*stage.speedMultiplier, angle:rand(0,Math.PI*2,rng), spin:rand(2.2,4.1,rng)*(rng()>.5?1:-1), indestructible:true, alive:true, stage:stage.number };
  }

  function moveArmorPlate(plate, dt) { return { ...plate, y:CONFIG.flightPlaneY, z:plate.z - plate.speed*dt, angle:plate.angle + plate.spin*dt }; }

  function makeBoss(stageNumber = 1) {
    const stage = stageConfig(stageNumber);
    return { id:`boss-${stage.number}`, kind:'boss', weapon:'beam', x:0, y:CONFIG.flightPlaneY, z:66, hp:stage.bossHp, maxHp:stage.bossHp, alive:true, stage:stage.number, beamCooldown:2.2, beamCharge:0, beamActive:0, beamX:0 };
  }

  function moveBoss(boss, elapsed) {
    const stage = stageConfig(boss.stage || 1);
    const intensity = 1 + (stage.number - 1) * .12;
    return { ...boss, x:Math.sin(elapsed*.68)*5.4*intensity + Math.sin(elapsed*1.93)*1.15, y:CONFIG.flightPlaneY, z:60 + Math.sin(elapsed*.47)*(5.5 + stage.number*.8) };
  }

  function shouldFire(ratePerSec, dt, rng = Math.random) { return rng() < Math.max(0, ratePerSec) * Math.max(0, dt); }

  function makeEnemyBullet(source, target, stageNumber = 1, speedScale = 1) {
    const stage = stageConfig(stageNumber);
    const dx=target.x-source.x, dy=target.y-source.y, dz=target.z-source.z;
    const len=Math.max(.001,Math.hypot(dx,dy,dz));
    const speed=CONFIG.enemyBulletSpeed*stage.speedMultiplier*speedScale;
    return { x:source.x,y:source.y,z:source.z,vx:dx/len*speed,vy:dy/len*speed,vz:dz/len*speed,alive:true };
  }

  function moveEnemyBullet(bullet, dt) { return { ...bullet, x:bullet.x+bullet.vx*dt, y:bullet.y+bullet.vy*dt, z:bullet.z+bullet.vz*dt }; }

  function beamHitsX(beamX, targetX, width = CONFIG.playerBeamWidth) { return Math.abs(beamX - targetX) <= width; }
  function beamTargetAhead(sourceZ, targetZ, maxRange = CONFIG.playerBeamRange) { return targetZ > sourceZ && targetZ - sourceZ <= maxRange; }

  function updateBeamWeapon(entity, targetX, dt, rng = Math.random) {
    const next = { ...entity };
    next.beamCooldown = Math.max(0, Number(next.beamCooldown || 0) - dt);
    next.beamCharge = Math.max(0, Number(next.beamCharge || 0) - dt);
    next.beamActive = Math.max(0, Number(next.beamActive || 0) - dt);
    if (next.weapon !== 'beam') return next;
    if (next.beamActive > 0 || next.beamCharge > 0) return next;
    if (next.beamCooldown <= 0) {
      next.beamX = targetX;
      next.beamCharge = CONFIG.enemyBeamChargeSec;
      next.beamCooldown = 2.2 + rng() * 1.8;
    }
    return next;
  }

  function activateChargedBeam(entity, previousCharge) {
    if (entity.weapon !== 'beam') return entity;
    if (previousCharge > 0 && entity.beamCharge <= 0 && entity.beamActive <= 0) return { ...entity, beamActive:CONFIG.enemyBeamActiveSec };
    return entity;
  }

  function updatePlayerBeamCharge(state, held, dt) {
    const next = {
      charge: Math.max(0, Number(state?.charge || 0)),
      active: Math.max(0, Number(state?.active || 0)),
      justFired: false
    };
    if (next.active > 0) {
      next.active = Math.max(0, next.active - dt);
      next.charge = 0;
      return next;
    }
    if (held) {
      next.charge = Math.min(CONFIG.playerBeamChargeSec, next.charge + dt);
      if (next.charge >= CONFIG.playerBeamChargeSec) {
        next.charge = 0;
        next.active = CONFIG.playerBeamActiveSec;
        next.justFired = true;
      }
    } else {
      next.charge = Math.max(0, next.charge - dt * .35);
    }
    return next;
  }

  function secretEncounter(stageNumber, stageElapsed) {
    const stage = clamp(Math.floor(stageNumber || 1), 1, CONFIG.stageCount);
    const start = 20 + stage * 3.5;
    return stageElapsed >= start && stageElapsed < start + 7.5;
  }

  function makeSecretCharacter(stageNumber = 1) {
    const stage = stageConfig(stageNumber);
    const side = stage.number % 2 === 0 ? -1 : 1;
    return {
      id:`secret-${stage.number}`, kind:'goldenScout', x:side * 8.6, y:CONFIG.flightPlaneY - .2, z:72,
      hp:1, maxHp:1, alive:true, stage:stage.number, age:0, ttl:7.2, side, hidden:true
    };
  }

  function moveSecretCharacter(secret, dt) {
    const age = Number(secret.age || 0) + dt;
    const side = secret.side || 1;
    return {
      ...secret,
      age,
      x:side * (7.9 - Math.min(2.4, age * .42)) + Math.sin(age * 3.2) * .42,
      y:CONFIG.flightPlaneY - .25 + Math.sin(age * 2.4) * .28,
      z:secret.z - 4.2 * dt,
      hidden: age < .7 || age > secret.ttl - .8,
      alive:secret.alive && age < secret.ttl
    };
  }

  function hash01(n, salt = 0) {
    const x = Math.sin((n + 1) * 12.9898 + (salt + 1) * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function mapSegment(index, stageNumber = 1) {
    const stage = stageConfig(stageNumber);
    const i = Math.floor(index);
    const r = hash01(i, stage.number * 3);
    const r2 = hash01(i, stage.number * 7 + 2);
    const r3 = hash01(i, stage.number * 11 + 5);
    const roadCenter = 2.8 * Math.sin(i * .43 + stage.number) + 1.25 * Math.sin(i * .17 + .4);
    const riverCenter = -4.1 + 2.1 * Math.sin(i * .29 + 1.7) + .9 * Math.sin(i * .11);
    let biome = 'plain';
    if (stage.number === 1) biome = r < .20 ? 'forest' : r < .37 ? 'farmland' : r < .50 ? 'water' : r < .68 ? 'urban' : r < .82 ? 'ridge' : 'plain';
    else if (stage.number === 2) biome = r < .22 ? 'nebula' : r < .44 ? 'debris' : r < .63 ? 'asteroids' : r < .78 ? 'outpost' : 'void';
    else if (stage.number === 3) biome = r < .22 ? 'hangar' : r < .44 ? 'vents' : r < .66 ? 'trench' : r < .82 ? 'turretDeck' : 'armor';
    else biome = r < .22 ? 'reactor' : r < .44 ? 'conduit' : r < .64 ? 'bay' : r < .82 ? 'gate' : 'corridor';
    return { index:i, biome, roadCenter, riverCenter, width:2.2 + r2 * 2.0, offset:(r3-.5)*6, accent:r2, landmark:r3 > .72 };
  }

  return {
    VERSION, CONFIG, STAGES, clamp, rand, stageConfig, stagePhase, stageRemaining, shouldAdvanceStage, continueCampaign, nextLives,
    project3D, projectChase3D, movePlayer, spheresHit, planarHit,
    scoreForEnemy, nextEnemySpawn, enemyKindsForStage, makeEnemy, moveEnemy,
    makeGroundEnemy, moveGroundEnemy, makeArmorPlate, moveArmorPlate,
    makeBoss, moveBoss, shouldFire, makeEnemyBullet, moveEnemyBullet,
    beamHitsX, beamTargetAhead, updateBeamWeapon, activateChargedBeam, updatePlayerBeamCharge,
    secretEncounter, makeSecretCharacter, moveSecretCharacter, hash01, mapSegment
  };
});