const assert = require('assert');
const C = require('../src/game-core.js');
const V052 = require('../src/v052-enhancements.js');
const Release = require('../src/release-version.js');
V052.install(C, {});
Release.install(C, {});

assert.strictEqual(C.VERSION, '0.6.0');
assert.strictEqual(Release.VERSION, '0.6.0');
assert.strictEqual(C.CONFIG.stageCount, 8);
assert.strictEqual(C.CONFIG.stagesPerLoop, 4);
assert.strictEqual(C.CONFIG.campaignLoops, 2);
assert.strictEqual(C.CONFIG.loop2EnemyMultiplier, 1.2);
assert.strictEqual(C.CONFIG.loop2BossHpMultiplier, 1.2);
assert.strictEqual(C.CONFIG.stageDurationSec, 60);
assert.strictEqual(C.CONFIG.bossIntroSec, 50);
assert.strictEqual(C.CONFIG.defaultLives, 3);
assert.ok(C.CONFIG.playerBeamRange > 80);
assert.ok(C.CONFIG.playerBeamDamageInterval > 0);
assert.ok(C.CONFIG.playerBeamChargeSec > 1);
assert.ok(C.CONFIG.playerBeamActiveSec > .5);
assert.deepStrictEqual(C.STAGES.map(s=>s.backdrop), ['earthSurface','space','carrier','interior']);
assert.strictEqual(C.STAGES[0].name, 'EARTH SURFACE');
assert.ok(C.STAGES[3].speedMultiplier > C.STAGES[0].speedMultiplier);
assert.ok(C.STAGES[3].beamChance > C.STAGES[0].beamChance);
assert.ok(!C.shouldAdvanceStage(59.99));
assert.ok(C.shouldAdvanceStage(60));

assert.strictEqual(V052.campaignLoop(4),1);
assert.strictEqual(V052.campaignLoop(5),2);
assert.strictEqual(V052.baseStageNumber(5),1);
assert.strictEqual(V052.baseStageNumber(8),4);
assert.strictEqual(C.stageConfig(5).name,C.stageConfig(1).name);
assert.ok(Math.abs(C.stageConfig(5).spawnBase - C.stageConfig(1).spawnBase / 1.2) < 1e-9,'loop 2 must spawn about 1.2x as many enemies');
const loop1Boss=C.makeBoss(1),loop2Boss=C.makeBoss(5);
assert.strictEqual(loop2Boss.hp,Math.ceil(loop1Boss.hp*1.2),'loop 2 boss HP must be 1.2x');
assert.strictEqual(C.makeBoss(8).hp,Math.ceil(C.makeBoss(4).hp*1.2));

const continued=C.continueCampaign({stage:3,score:12345,worldScroll:987.5,continueCount:2});
assert.deepStrictEqual(continued,{stage:3,score:12345,worldScroll:987.5,continueCount:3,lives:3,stageElapsed:0});
const continuedLoop2=C.continueCampaign({stage:7,score:20000,worldScroll:1200,continueCount:0});
assert.strictEqual(continuedLoop2.stage,7,'continue must preserve loop 2 campaign stage');
assert.strictEqual(C.nextLives(3,true),3);
assert.strictEqual(C.nextLives(3,false),2);

const start={x:0,y:C.CONFIG.flightPlaneY,z:9};
const forward=C.movePlayer(start,{forward:true},.5),backward=C.movePlayer(start,{backward:true},.5);
assert.ok(forward.z>start.z);assert.ok(backward.z<start.z);assert.strictEqual(forward.y,C.CONFIG.flightPlaneY);

const kinds=C.enemyKindsForStage(4);
for(const kind of ['interceptor','fighter','dart','raider','bomber','beamfighter']) assert.ok(kinds.includes(kind),`missing ${kind}`);
assert.deepStrictEqual(C.enemyKindsForStage(8),kinds,'loop 2 stage 4 must preserve the same enemy roster');
function seq(values){let i=0;return()=>values[Math.min(i++,values.length-1)];}
const bomber=C.makeEnemy(1,4,seq([.70,.5,.5,.5,.5,.5]));
assert.strictEqual(bomber.kind,'bomber');assert.strictEqual(bomber.hp,3);assert.strictEqual(bomber.pattern,'orbit');
const beamfighter=C.makeEnemy(2,4,seq([.99,.5,.5,.5,.5,.5]));
assert.strictEqual(beamfighter.kind,'beamfighter');assert.strictEqual(beamfighter.weapon,'beam');assert.strictEqual(beamfighter.pattern,'stalk');
const raider=C.makeEnemy(3,4,seq([.55,.9,.5,.5,.5,.5]));
assert.strictEqual(raider.kind,'raider');assert.strictEqual(raider.pattern,'cross');
const bomberMoved=C.moveEnemy({...bomber,x:0,z:80},2,.5,5);
const raiderMoved=C.moveEnemy({...raider,x:-8,z:80,phase:0},2,.5,0);
assert.ok(bomberMoved.z<80);assert.ok(raiderMoved.x>-8,'raider must cross laterally');

const beamStart=C.updateBeamWeapon({...beamfighter,beamCooldown:0,beamCharge:0,beamActive:0},2,.1,()=>0);
assert.ok(beamStart.beamCharge>0,'beam weapon must enter charge phase');
const beamAlmost={...beamStart,beamCharge:.01,beamActive:0};
const beamCharged=C.updateBeamWeapon(beamAlmost,2,.02,()=>0);
const beamActive=C.activateChargedBeam(beamCharged,.01);
assert.ok(beamActive.beamActive>0,'charged enemy beam must become active');
assert.ok(C.beamHitsX(1,1.4,.5));assert.ok(!C.beamHitsX(1,2,.5));
assert.ok(C.beamTargetAhead(10,60));assert.ok(!C.beamTargetAhead(60,10));

const ground=C.makeGroundEnemy(4,4,seq([.1,.4,.4,.4]));
assert.ok(['turret','laserTurret'].includes(ground.kind));assert.strictEqual(ground.y,C.CONFIG.groundPlaneY);
const laserGround=C.makeGroundEnemy(5,4,seq([.05,.4,.4,.4]));
assert.strictEqual(laserGround.kind,'laserTurret');assert.strictEqual(laserGround.weapon,'beam');
assert.ok(C.planarHit({x:0,z:10},{x:.8,z:12},1,3));

const armor=C.makeArmorPlate(6,4,()=>.6);
assert.strictEqual(armor.indestructible,true);assert.strictEqual(armor.kind,'armorPlate');
const armorMoved=C.moveArmorPlate(armor,.25);assert.ok(armorMoved.z<armor.z);assert.notStrictEqual(armorMoved.angle,armor.angle);

const boss=C.makeBoss(4);assert.strictEqual(boss.weapon,'beam');assert.ok(boss.hp>C.makeBoss(1).hp);
const bullet=C.makeEnemyBullet({x:5,y:C.CONFIG.flightPlaneY,z:60},{x:0,y:C.CONFIG.flightPlaneY,z:10},2);
assert.ok(bullet.vz<0);assert.ok(C.moveEnemyBullet(bullet,.5).z<bullet.z);

let playerBeam={charge:0,active:0};
playerBeam=C.updatePlayerBeamCharge(playerBeam,true,C.CONFIG.playerBeamChargeSec-.05);
assert.strictEqual(playerBeam.active,0,'player beam must not fire before full charge');
playerBeam=C.updatePlayerBeamCharge(playerBeam,true,.06);
assert.ok(playerBeam.active>0&&playerBeam.justFired,'full charge must start a timed beam');
const activeBefore=playerBeam.active;
playerBeam=C.updatePlayerBeamCharge(playerBeam,false,.2);
assert.ok(playerBeam.active<activeBefore,'active beam duration must count down');
let partial=C.updatePlayerBeamCharge({charge:.8,active:0},false,.5);
assert.ok(partial.charge<.8&&partial.charge>0,'released partial charge must decay gradually');

assert.ok(C.secretEncounter(1,24),'stage 1 must have a secret encounter window');
assert.ok(C.secretEncounter(5,24),'loop 2 stage 1 must keep the secret encounter');
assert.ok(!C.secretEncounter(1,10),'secret must stay hidden outside its window');
const secret=C.makeSecretCharacter(2);
assert.strictEqual(secret.kind,'goldenScout');assert.ok(secret.hidden);
const secretMoved=C.moveSecretCharacter(secret,1);assert.ok(secretMoved.age>secret.age);assert.ok(!secretMoved.hidden);

const m0=C.mapSegment(7,1),m0Again=C.mapSegment(7,1),m1=C.mapSegment(8,1);
assert.deepStrictEqual(m0,m0Again,'map segments must be deterministic');
assert.notStrictEqual(m0.roadCenter,m1.roadCenter,'road must curve between segments');
const biomes=new Set(Array.from({length:28},(_,i)=>C.mapSegment(i,1).biome));
assert.ok(biomes.size>=4,'earth map must contain varied biomes');
for(const stage of [2,3,4]) assert.ok(new Set(Array.from({length:24},(_,i)=>C.mapSegment(i,stage).biome)).size>=4);

const near=C.project3D({x:2,y:0,z:10},{cx:100,cy:100},500),far=C.project3D({x:2,y:0,z:40},{cx:100,cy:100},500);
assert.ok(Math.abs(near.x-100)>Math.abs(far.x-100));
console.log('PASS: core.test.js');