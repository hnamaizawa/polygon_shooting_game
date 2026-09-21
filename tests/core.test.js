const assert = require('assert');
const C = require('../src/game-core.js');

assert.strictEqual(C.VERSION, '0.3.0');
assert.strictEqual(C.clamp(12, -2, 5), 5);
assert.strictEqual(C.clamp(-8, -2, 5), -2);
assert.strictEqual(C.clamp(3, -2, 5), 3);

const near = C.project3D({x:2,y:0,z:10},{cx:100,cy:100},500);
const far = C.project3D({x:2,y:0,z:40},{cx:100,cy:100},500);
assert.ok(Math.abs(near.x-100) > Math.abs(far.x-100), 'Perspective should shrink distant points');

const pitch = C.CONFIG.cameraPitchDeg * Math.PI / 180;
const chaseNear = C.projectChase3D({x:2,y:5,z:14},{cx:100,cy:140},500,pitch);
const chaseFar = C.projectChase3D({x:2,y:5,z:60},{cx:100,cy:140},500,pitch);
assert.ok(chaseFar.scale < chaseNear.scale, 'Elevated chase projection should shrink distant points');
assert.ok(chaseFar.y < chaseNear.y, 'Distant points should approach the upper horizon');

const start = {x:0,y:3.25,z:9};
const forward = C.movePlayer(start,{forward:true},.5);
const backward = C.movePlayer(start,{backward:true},.5);
assert.ok(forward.z > start.z, 'Up/forward must move deeper into the scene');
assert.ok(backward.z < start.z, 'Down/backward must move toward the camera');
assert.strictEqual(forward.y, start.y, 'Forward movement must not move the craft vertically');
assert.strictEqual(backward.y, start.y, 'Backward movement must not move the craft vertically');
assert.strictEqual(C.movePlayer({...start,z:C.CONFIG.playerMaxZ},{forward:true},1).z,C.CONFIG.playerMaxZ);
assert.strictEqual(C.movePlayer({...start,z:C.CONFIG.playerMinZ},{backward:true},1).z,C.CONFIG.playerMinZ);

assert.ok(C.spheresHit({x:0,y:0,z:10},{x:1,y:0,z:11}));
assert.ok(!C.spheresHit({x:0,y:0,z:10},{x:8,y:0,z:11}));
assert.strictEqual(C.scoreForEnemy({kind:'fighter'}),100);
assert.strictEqual(C.scoreForEnemy({kind:'dart'}),150);

const seq=[0.75,0.5,0.25,0.5,0.5];let i=0;
const enemy=C.makeEnemy(7,()=>seq[i++%seq.length]);
assert.strictEqual(enemy.id,7);
assert.strictEqual(enemy.z,C.CONFIG.enemySpawnZ);
assert.ok(enemy.speed>=C.CONFIG.enemySpeedMin&&enemy.speed<=C.CONFIG.enemySpeedMax);

console.log('PASS: core.test.js');
