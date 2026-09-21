const assert = require('assert');
const C = require('../src/game-core.js');

assert.strictEqual(C.VERSION, '0.4.2');
assert.strictEqual(C.CONFIG.stageCount, 4);
assert.strictEqual(C.CONFIG.stageDurationSec, 60);
assert.strictEqual(C.CONFIG.bossIntroSec, 50);
assert.strictEqual(C.CONFIG.defaultLives, 3);
assert.ok(C.CONFIG.fireCooldown > 0.16, 'player fire rate should remain reduced');
assert.strictEqual(C.STAGES.length, 4);
assert.deepStrictEqual(C.STAGES.map(s=>s.backdrop), ['earthSurface','space','carrier','interior']);
assert.strictEqual(C.STAGES[0].name, 'EARTH SURFACE');
assert.ok(C.STAGES[3].speedMultiplier > C.STAGES[0].speedMultiplier);
assert.ok(C.STAGES[3].bossHp > C.STAGES[0].bossHp);
assert.ok(C.STAGES[3].airFireRate > C.STAGES[0].airFireRate);
assert.strictEqual(C.stagePhase(49.9), 'normal');
assert.strictEqual(C.stagePhase(50), 'boss');
assert.strictEqual(C.stageRemaining(0), 60);
assert.strictEqual(C.stageRemaining(61), 0);

const continued=C.continueCampaign({stage:3,score:12345,worldScroll:987.5,continueCount:2});
assert.deepStrictEqual(continued,{stage:3,score:12345,worldScroll:987.5,continueCount:3,lives:3,stageElapsed:0});
assert.strictEqual(C.nextLives(3,true),3,'invincible mode must not reduce lives');
assert.strictEqual(C.nextLives(3,false),2,'normal damage must reduce lives');

const start={x:0,y:C.CONFIG.flightPlaneY,z:9};
const forward=C.movePlayer(start,{forward:true},.5),backward=C.movePlayer(start,{backward:true},.5);
assert.ok(forward.z>start.z);assert.ok(backward.z<start.z);assert.strictEqual(forward.y,C.CONFIG.flightPlaneY);

const enemy=C.makeEnemy(1,4,()=>0.6);
assert.strictEqual(enemy.y,C.CONFIG.flightPlaneY);
assert.ok(enemy.speed>=C.CONFIG.enemySpeedMin*C.STAGES[3].speedMultiplier);
const moved=C.moveEnemy({...enemy,pattern:'hunter',x:5},1,.5,-5);
assert.ok(moved.x<5);assert.ok(moved.z<enemy.z);

const ground=C.makeGroundEnemy(2,3,()=>0.5);
assert.strictEqual(ground.kind,'turret');assert.strictEqual(ground.y,C.CONFIG.groundPlaneY);
assert.ok(C.planarHit({x:0,z:10},{x:.8,z:12},1,3));assert.ok(!C.planarHit({x:0,z:10},{x:4,z:12},1,3));

const armor=C.makeArmorPlate(3,4,()=>0.6);
assert.strictEqual(armor.indestructible,true);assert.strictEqual(armor.kind,'armorPlate');
const armorMoved=C.moveArmorPlate(armor,.25);assert.ok(armorMoved.z<armor.z);assert.notStrictEqual(armorMoved.angle,armor.angle);

const boss1=C.makeBoss(1),boss4=C.makeBoss(4);assert.ok(boss4.hp>boss1.hp);
assert.ok(C.shouldFire(1,1,()=>0));assert.ok(!C.shouldFire(0,1,()=>0));
const bullet=C.makeEnemyBullet({x:5,y:C.CONFIG.flightPlaneY,z:60},{x:0,y:C.CONFIG.flightPlaneY,z:10},2);
assert.ok(bullet.vz<0,'enemy bullet must travel toward the player');
const bulletMoved=C.moveEnemyBullet(bullet,.5);assert.ok(bulletMoved.z<bullet.z);

const near=C.project3D({x:2,y:0,z:10},{cx:100,cy:100},500),far=C.project3D({x:2,y:0,z:40},{cx:100,cy:100},500);
assert.ok(Math.abs(near.x-100)>Math.abs(far.x-100));
console.log('PASS: core.test.js');
