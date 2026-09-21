const assert = require('assert');
const C = require('../src/game-core.js');

assert.strictEqual(C.VERSION, '0.4.0');
assert.strictEqual(C.CONFIG.stageCount, 4);
assert.strictEqual(C.CONFIG.stageDurationSec, 300);
assert.strictEqual(C.CONFIG.bossIntroSec, 270);
assert.strictEqual(C.STAGES.length, 4);
assert.deepStrictEqual(C.STAGES.map(s=>s.backdrop), ['earth','space','carrier','interior']);
assert.ok(C.STAGES[3].speedMultiplier > C.STAGES[0].speedMultiplier);
assert.ok(C.STAGES[3].bossHp > C.STAGES[0].bossHp);
assert.strictEqual(C.stagePhase(269.9), 'normal');
assert.strictEqual(C.stagePhase(270), 'boss');
assert.strictEqual(C.stageRemaining(0), 300);
assert.strictEqual(C.stageRemaining(301), 0);

const start = {x:0,y:C.CONFIG.flightPlaneY,z:9};
const forward=C.movePlayer(start,{forward:true},.5), backward=C.movePlayer(start,{backward:true},.5);
assert.ok(forward.z>start.z);assert.ok(backward.z<start.z);assert.strictEqual(forward.y,C.CONFIG.flightPlaneY);

const enemy=C.makeEnemy(1,4,()=>0.6);
assert.strictEqual(enemy.y,C.CONFIG.flightPlaneY);
assert.ok(enemy.speed>=C.CONFIG.enemySpeedMin*C.STAGES[3].speedMultiplier);
const moved=C.moveEnemy({...enemy,pattern:'hunter',x:5},1,.5,-5);
assert.ok(moved.x<5,'hunter pattern should steer toward player');
assert.ok(moved.z<enemy.z,'air enemy should advance toward player');

const ground=C.makeGroundEnemy(2,3,()=>0.5);
assert.strictEqual(ground.kind,'turret');
assert.strictEqual(ground.y,C.CONFIG.groundPlaneY);
assert.ok(C.planarHit({x:0,z:10},{x:.8,z:12},1,3));
assert.ok(!C.planarHit({x:0,z:10},{x:4,z:12},1,3));
const groundMoved=C.moveGroundEnemy(ground,.5);assert.ok(groundMoved.z<ground.z);

const boss1=C.makeBoss(1),boss4=C.makeBoss(4);
assert.ok(boss4.hp>boss1.hp);assert.strictEqual(boss1.kind,'boss');
const bossMoved=C.moveBoss(boss4,3.5);assert.strictEqual(bossMoved.y,C.CONFIG.flightPlaneY);assert.ok(Number.isFinite(bossMoved.x));
assert.ok(C.scoreForEnemy({kind:'turret'})>C.scoreForEnemy({kind:'fighter'}));
assert.ok(C.scoreForEnemy({kind:'boss',stage:4})>1000);

const near=C.project3D({x:2,y:0,z:10},{cx:100,cy:100},500),far=C.project3D({x:2,y:0,z:40},{cx:100,cy:100},500);
assert.ok(Math.abs(near.x-100)>Math.abs(far.x-100));
console.log('PASS: core.test.js');
