(() => {
  'use strict';

  const C = window.PolygonStrikeCore;
  const A = window.PolygonStrikeAudio || {
    start(){}, playLaser(){}, playEnemyLaser(){}, playExplosion(){}, playHit(){}, playArmorPing(){}, playBoss(){}, playStageClear(){}, playGameOver(){},
    toggleMute(){return false;}, toggleBgm(){return true;}, isMuted(){return false;}, isBgmEnabled(){return true;}, supported(){return false;}
  };

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const startPanel = document.getElementById('startPanel');
  const startButton = document.getElementById('startButton');
  const W = canvas.width, H = canvas.height, PLAY_W = 742, HUD_X = 760;
  const viewport = { cx: PLAY_W / 2, cy: H * 0.75 };
  const CAMERA_PITCH = C.CONFIG.cameraPitchDeg * Math.PI / 180;
  const keys = new Set();
  let textureEnabled = true;
  let invincibleMode = false;
  ctx.imageSmoothingEnabled = true;

  function makeGlossMetalTexture(base, accent, dark, cool='#edf7ff') {
    const tex = document.createElement('canvas'); tex.width = tex.height = 96; tex.flatColor = base;
    const g = tex.getContext('2d');
    const bg = g.createLinearGradient(0,0,96,96);
    bg.addColorStop(0,'#0b1016'); bg.addColorStop(.12,dark); bg.addColorStop(.31,base); bg.addColorStop(.44,'#fbfdff'); bg.addColorStop(.50,cool); bg.addColorStop(.58,'#c8d0d8'); bg.addColorStop(.67,base); bg.addColorStop(.84,'#53606d'); bg.addColorStop(1,dark);
    g.fillStyle=bg; g.fillRect(0,0,96,96);
    const shine=g.createLinearGradient(0,0,96,0); shine.addColorStop(0,'rgba(255,255,255,0)'); shine.addColorStop(.47,'rgba(255,255,255,.72)'); shine.addColorStop(.52,'rgba(255,255,255,.98)'); shine.addColorStop(.59,'rgba(255,255,255,.14)'); shine.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=shine; g.fillRect(0,0,96,96);
    g.strokeStyle='rgba(6,9,13,.76)'; g.lineWidth=2;
    for(let y=0;y<=96;y+=24){g.beginPath();g.moveTo(0,y);g.lineTo(96,y);g.stroke();}
    for(let x=0;x<=96;x+=24){g.beginPath();g.moveTo(x,0);g.lineTo(x,96);g.stroke();}
    g.fillStyle=accent; g.fillRect(8,10,33,5); g.fillRect(50,31,35,4); g.fillRect(14,61,68,4); g.fillRect(42,73,12,16);
    return tex;
  }

  const textures={
    player:makeGlossMetalTexture('#768796','#c92b35','#202a34','#f5fbff'),
    fighter:makeGlossMetalTexture('#727b84','#e06a4f','#22272d','#fff2e8'),
    dart:makeGlossMetalTexture('#656d79','#bd68cf','#20242c','#f8efff'),
    bomber:makeGlossMetalTexture('#697b69','#e2b84e','#1b251d','#f3ffe9'),
    raider:makeGlossMetalTexture('#705f7f','#48c9ff','#21182b','#f5eeff'),
    beam:makeGlossMetalTexture('#476c83','#44e5ff','#102631','#efffff'),
    turret:makeGlossMetalTexture('#596775','#e7a74b','#171e26','#f2fbff'),
    laserTurret:makeGlossMetalTexture('#506b73','#38e3ff','#132128','#f0ffff'),
    boss:makeGlossMetalTexture('#687987','#ff3547','#121820','#ffffff'),
    carrier:makeGlossMetalTexture('#566473','#7aa7c4','#171e26','#ecf8ff'),
    interior:makeGlossMetalTexture('#485563','#d84f54','#11161c','#edf8ff'),
    armor:makeGlossMetalTexture('#8d98a3','#f3fbff','#202830','#ffffff')
  };
  const UV=[[.50,.02],[.02,.98],[.98,.98]], QUV=[[0,0],[1,0],[1,1],[0,1]];

  const playerModel={vertices:[[0,-.22,3.65],[0,-.78,1.20],[0,.24,.85],[-.72,-.08,1.55],[-1.55,.02,.75],[-3,.16,-.55],[-1.45,.20,-1.60],[.72,-.08,1.55],[1.55,.02,.75],[3,.16,-.55],[1.45,.20,-1.60],[0,-.08,-2.15],[-.66,.17,-1.78],[.66,.17,-1.78],[-1.15,-.03,-1],[1.15,-.03,-1]],faces:[{v:[0,1,3],s:.01},{v:[0,7,1],s:.05},{v:[0,3,2],s:.08},{v:[0,2,7],s:.13},{v:[1,2,3],s:.03},{v:[1,7,2],s:.08},{v:[3,4,5],s:.11},{v:[3,5,6],s:.16},{v:[3,6,2],s:.19},{v:[7,2,10],s:.20},{v:[7,10,9],s:.13},{v:[7,9,8],s:.08},{v:[2,6,11],s:.21},{v:[2,11,10],s:.18},{v:[6,12,11],s:.24},{v:[11,13,10],s:.22},{v:[4,14,6],s:.17},{v:[8,10,15],s:.16}]};
  const fighterModel={vertices:[[0,-.12,2.05],[0,-.5,.28],[0,.22,.15],[-.85,.02,.62],[-1.85,.18,-.45],[-.68,.18,-1.15],[.85,.02,.62],[1.85,.18,-.45],[.68,.18,-1.15],[0,-.06,-1.35]],faces:[{v:[0,1,3],s:.04},{v:[0,6,1],s:.10},{v:[0,3,2],s:.13},{v:[0,2,6],s:.18},{v:[3,4,5],s:.20},{v:[3,5,2],s:.26},{v:[6,2,8],s:.27},{v:[6,8,7],s:.19},{v:[2,5,9],s:.31},{v:[2,9,8],s:.28}]};
  const dartModel={vertices:[[0,-.10,2.35],[0,-.44,.10],[0,.22,0],[-.75,.03,.38],[-1.20,.15,-.72],[-.42,.14,-1.40],[.75,.03,.38],[1.20,.15,-.72],[.42,.14,-1.40],[0,-.08,-1.65]],faces:[{v:[0,1,3],s:.03},{v:[0,6,1],s:.09},{v:[0,3,2],s:.13},{v:[0,2,6],s:.18},{v:[3,4,5],s:.23},{v:[3,5,2],s:.29},{v:[6,2,8],s:.27},{v:[6,8,7],s:.20},{v:[2,5,9],s:.33},{v:[2,9,8],s:.30}]};
  const bomberModel={vertices:[[0,-.22,2.3],[0,-.72,.4],[0,.3,.2],[-1.6,.02,.85],[-3.0,.12,-.1],[-2.2,.22,-1.35],[1.6,.02,.85],[3.0,.12,-.1],[2.2,.22,-1.35],[0,-.02,-1.9],[-.9,-.35,-.6],[.9,-.35,-.6]],faces:[{v:[0,1,3],s:.05},{v:[0,6,1],s:.08},{v:[0,3,2],s:.12},{v:[0,2,6],s:.15},{v:[3,4,5],s:.18},{v:[3,5,2],s:.24},{v:[6,2,8],s:.24},{v:[6,8,7],s:.18},{v:[2,5,9],s:.28},{v:[2,9,8],s:.26},{v:[1,10,3],s:.08},{v:[1,6,11],s:.08}]};
  const turretModel={vertices:[[-1.25,.15,-1.0],[1.25,.15,-1.0],[1.15,.15,1.0],[-1.15,.15,1.0],[-.75,-.55,-.55],[.75,-.55,-.55],[.65,-.55,.65],[-.65,-.55,.65],[0,-.95,.1],[0,-1.15,2.25]],faces:[{v:[0,1,2],s:.12},{v:[0,2,3],s:.16},{v:[4,5,6],s:.06},{v:[4,6,7],s:.09},{v:[0,4,7],s:.22},{v:[0,7,3],s:.18},{v:[1,2,6],s:.20},{v:[1,6,5],s:.16},{v:[4,5,8],s:.04},{v:[5,8,9],s:.08},{v:[8,7,9],s:.11}]};
  const bossModel={vertices:[[0,-.8,5.2],[0,-1.6,1.2],[0,.6,.8],[-2.2,-.2,2.2],[-5.0,.4,.5],[-6.5,.7,-2.0],[-2.4,.5,-2.8],[2.2,-.2,2.2],[5.0,.4,.5],[6.5,.7,-2.0],[2.4,.5,-2.8],[0,.1,-4.5],[-3.2,-.4,-1.0],[3.2,-.4,-1.0]],faces:[{v:[0,1,3],s:.02},{v:[0,7,1],s:.04},{v:[0,3,2],s:.08},{v:[0,2,7],s:.10},{v:[3,4,5],s:.14},{v:[3,5,6],s:.19},{v:[7,10,9],s:.17},{v:[7,9,8],s:.13},{v:[2,6,11],s:.22},{v:[2,11,10],s:.20},{v:[3,12,6],s:.08},{v:[7,10,13],s:.08},{v:[1,2,3],s:.06},{v:[1,7,2],s:.06}]};

  let state;
  function currentStage(){return C.stageConfig(state?.stage||1);}
  function makeState(options={}){
    return {
      running:true,gameOver:false,victory:false,score:options.score||0,lives:C.CONFIG.defaultLives,
      elapsed:options.elapsed||0,stage:options.stage||1,stageElapsed:0,worldScroll:options.worldScroll||0,continueCount:options.continueCount||0,
      transitionFromBackdrop:null,transitionTimer:0,spawnTimer:.35,enemyId:1,fireTimer:0,beamTimer:0,beamSoundLatch:false,hitCooldown:0,shake:0,
      boss:null,bossSpawned:false,stageCleared:false,bannerTimer:3,playerBeamActive:false,playerBeamEndZ:C.CONFIG.playerBeamRange,
      player:{x:0,y:C.CONFIG.flightPlaneY,z:C.CONFIG.playerZ},
      enemies:[],groundEnemies:[],armorPlates:[],lasers:[],enemyBullets:[],particles:[],stars:Array.from({length:110},()=>makeStar(true))
    };
  }
  function reset(){state=makeState();}
  function makeStar(randomZ=false){return{x:C.rand(-25,25),y:C.rand(-18,18),z:randomZ?C.rand(7,118):118,speed:C.rand(14,30),b:C.rand(.26,.9)};}
  function start(){reset();startPanel.classList.add('hidden');A.start();}
  startButton.addEventListener('click',start);
  function continueGame(){if(!state?.gameOver)return;state=makeState(C.continueCampaign(state));startPanel.classList.add('hidden');A.start();}

  addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
    if(e.code==='KeyM'&&!e.repeat){A.toggleMute();return;}
    if(e.code==='KeyB'&&!e.repeat){A.toggleBgm();return;}
    if(e.code==='KeyT'&&!e.repeat){textureEnabled=!textureEnabled;return;}
    if(e.code==='KeyI'&&!e.repeat){invincibleMode=!invincibleMode;return;}
    if(e.code==='KeyC'&&!e.repeat&&state?.gameOver){continueGame();return;}
    keys.add(e.code);
    if(e.code==='Enter'&&(!state||!state.running))start();
    if(e.code==='KeyR'&&(state?.gameOver||state?.victory))start();
  });
  addEventListener('keyup',e=>keys.delete(e.code));

  function spawnWave(){
    const stage=currentStage();if(C.stagePhase(state.stageElapsed)==='boss')return;
    const roll=Math.random();
    if(roll<stage.armorChance)state.armorPlates.push(C.makeArmorPlate(state.enemyId++,state.stage));
    else if(roll<stage.armorChance+stage.groundChance)state.groundEnemies.push(C.makeGroundEnemy(state.enemyId++,state.stage));
    else state.enemies.push(C.makeEnemy(state.enemyId++,state.stage));
    state.spawnTimer=C.nextEnemySpawn(stage.spawnBase);
  }
  function spawnBoss(){if(state.bossSpawned)return;state.bossSpawned=true;state.boss=C.makeBoss(state.stage);state.bannerTimer=2.2;A.playBoss();}
  function advanceStage(){
    if(state.stage>=C.CONFIG.stageCount){finishGame();return;}
    const oldBackdrop=currentStage().backdrop;state.stage++;state.transitionFromBackdrop=oldBackdrop;state.transitionTimer=C.CONFIG.backdropTransitionSec;
    state.stageElapsed=0;state.spawnTimer=.55;state.boss=null;state.bossSpawned=false;state.stageCleared=false;state.bannerTimer=3;
    state.enemies=[];state.groundEnemies=[];state.armorPlates=[];state.lasers=[];state.enemyBullets=[];A.playStageClear();
  }
  function finishGame(){state.running=false;state.victory=true;A.playStageClear();startPanel.innerHTML=`<h1>ALL STAGES CLEARED</h1><p>SCORE ${String(state.score).padStart(7,'0')}</p><p>CONTINUE ${state.continueCount}</p><p>R / Enter で再出撃</p><button id="restartButton">RESTART</button>`;startPanel.classList.remove('hidden');document.getElementById('restartButton').addEventListener('click',start);}
  function endGame(){state.running=false;state.gameOver=true;A.playGameOver();startPanel.innerHTML=`<h1>GAME OVER</h1><p>STAGE ${state.stage}</p><p>SCORE ${String(state.score).padStart(7,'0')}</p><p>C で同じステージからコンティニュー</p><button id="continueButton">CONTINUE</button><button id="restartButton">RESTART</button>`;startPanel.classList.remove('hidden');document.getElementById('continueButton').addEventListener('click',continueGame);document.getElementById('restartButton').addEventListener('click',start);}

  function spawnEnemyBullet(source,speedScale=1){if(state.enemyBullets.length>=64)return;state.enemyBullets.push(C.makeEnemyBullet(source,state.player,state.stage,speedScale));A.playEnemyLaser();}
  function damagePlayer(cooldown=.85){
    if(state.hitCooldown>0)return;
    if(invincibleMode){state.hitCooldown=.18;burst(state.player.x,state.player.y,state.player.z+1,5);A.playArmorPing();return;}
    state.lives=C.nextLives(state.lives,false);state.hitCooldown=cooldown;state.shake=1.05;A.playHit();burst(state.player.x,state.player.y,state.player.z+1,14);if(state.lives<=0)endGame();
  }
  function destroyEnemy(e){e.alive=false;state.score+=C.scoreForEnemy(e);burst(e.x,e.y,e.z,e.kind==='bomber'?22:12);A.playExplosion();}
  function hitEnemy(e,damage=1){e.hp=Math.max(0,(e.hp||1)-damage);if(e.hp<=0)destroyEnemy(e);else burst(e.x,e.y,e.z,5);}
  function hitGround(g,damage=1){g.hp=Math.max(0,g.hp-damage);if(g.hp<=0){g.alive=false;state.score+=C.scoreForEnemy(g);burst(g.x,g.y,g.z,18);A.playExplosion();}else burst(g.x,g.y,g.z,5);}
  function hitBoss(damage=1){if(!state.boss?.alive)return;state.boss.hp=Math.max(0,state.boss.hp-damage);if(state.boss.hp<=0){state.boss.alive=false;state.score+=C.scoreForEnemy(state.boss);burst(state.boss.x,state.boss.y,state.boss.z,55);A.playExplosion();state.stageCleared=true;state.bannerTimer=2.6;}}

  function nearestPlayerBeamHit(){
    const sourceZ=state.player.z+2.2,beamX=state.player.x,maxZ=Math.min(124,sourceZ+C.CONFIG.playerBeamRange);
    let endZ=maxZ,kind=null,target=null;
    for(const p of state.armorPlates){if(p.alive&&C.beamTargetAhead(sourceZ,p.z)&&C.beamHitsX(beamX,p.x,1.85)&&p.z<endZ){endZ=p.z;kind='armor';target=p;}}
    for(const e of state.enemies){if(e.alive&&C.beamTargetAhead(sourceZ,e.z)&&C.beamHitsX(beamX,e.x,C.CONFIG.playerBeamWidth+(e.kind==='bomber'?.55:.2))&&e.z<endZ){endZ=e.z;kind='air';target=e;}}
    if(state.boss?.alive&&C.beamTargetAhead(sourceZ,state.boss.z)&&C.beamHitsX(beamX,state.boss.x,2.5)&&state.boss.z<endZ){endZ=state.boss.z;kind='boss';target=state.boss;}
    return{sourceZ,endZ,kind,target};
  }

  function updatePlayerBeam(dt){
    state.beamTimer-=dt;state.playerBeamActive=keys.has('KeyL');
    if(!state.playerBeamActive){state.beamSoundLatch=false;state.playerBeamEndZ=state.player.z+C.CONFIG.playerBeamRange;return;}
    if(!state.beamSoundLatch){A.playLaser();state.beamSoundLatch=true;}
    const hit=nearestPlayerBeamHit();state.playerBeamEndZ=hit.endZ;
    if(state.beamTimer<=0){
      if(hit.kind==='armor'){hit.target.flash=.13;burst(hit.target.x,hit.target.y,hit.target.z,4);A.playArmorPing();}
      else if(hit.kind==='air')hitEnemy(hit.target,1);
      else if(hit.kind==='boss')hitBoss(1);
      state.beamTimer=C.CONFIG.playerBeamDamageInterval;
    }
  }

  function updateBeamEntity(entity,dt){
    const prevCharge=entity.beamCharge||0;
    let next=C.updateBeamWeapon(entity,state.player.x,dt);
    next=C.activateChargedBeam(next,prevCharge);
    if(next.beamActive>0&&C.beamHitsX(next.beamX,state.player.x,C.CONFIG.enemyBeamWidth))damagePlayer(.65);
    return next;
  }

  function update(dt){
    if(!state?.running)return;
    const stage=currentStage();
    state.elapsed+=dt;state.stageElapsed+=dt;state.worldScroll+=C.CONFIG.backgroundScrollSpeed*dt;state.transitionTimer=Math.max(0,state.transitionTimer-dt);
    state.fireTimer-=dt;state.spawnTimer-=dt;state.hitCooldown=Math.max(0,state.hitCooldown-dt);state.shake=Math.max(0,state.shake-dt*10);state.bannerTimer=Math.max(0,state.bannerTimer-dt);
    state.player=C.movePlayer(state.player,{left:keys.has('ArrowLeft')||keys.has('KeyA'),right:keys.has('ArrowRight')||keys.has('KeyD'),forward:keys.has('ArrowUp')||keys.has('KeyW'),backward:keys.has('ArrowDown')||keys.has('KeyS')},dt);

    if((keys.has('Space')||keys.has('KeyJ'))&&state.fireTimer<=0){state.lasers.push({x:state.player.x-.50,y:C.CONFIG.flightPlaneY-.15,z:state.player.z+2.15},{x:state.player.x+.50,y:C.CONFIG.flightPlaneY-.15,z:state.player.z+2.15});state.fireTimer=C.CONFIG.fireCooldown;A.playLaser();}
    updatePlayerBeam(dt);
    if(state.stageElapsed>=C.CONFIG.bossIntroSec)spawnBoss();
    if(state.spawnTimer<=0)spawnWave();
    for(const s of state.stars){s.z-=s.speed*dt;if(s.z<3)Object.assign(s,makeStar(false));}
    for(const l of state.lasers)l.z+=C.CONFIG.laserSpeed*dt;
    state.lasers=state.lasers.filter(l=>l.z<125);

    state.enemies=state.enemies.map(e=>{
      let m=C.moveEnemy(e,state.elapsed,dt,state.player.x);
      if(m.weapon==='beam'&&m.z<84&&m.z>state.player.z+8)m=updateBeamEntity(m,dt);
      return m;
    });
    for(const e of state.enemies){
      if(e.alive&&e.weapon!=='beam'&&e.z<88&&e.z>state.player.z+8&&C.shouldFire(stage.airFireRate,dt))spawnEnemyBullet({x:e.x,y:e.y,z:e.z-1},e.kind==='bomber'?.85:1);
      for(const l of state.lasers){if(e.alive&&l.z<900&&C.spheresHit(e,l,e.kind==='bomber'?1.6:1.15,2.8)){l.z=999;hitEnemy(e,1);}}
      if(e.alive&&C.spheresHit(e,state.player,e.kind==='bomber'?2.0:1.7,3.8)){e.alive=false;damagePlayer(1.0);}
      if(e.alive&&e.z<C.CONFIG.enemyDespawnZ)e.alive=false;
    }
    state.enemies=state.enemies.filter(e=>e.alive);

    state.groundEnemies=state.groundEnemies.map(g=>{
      let m=C.moveGroundEnemy(g,dt);
      if(m.weapon==='beam'&&m.z<80&&m.z>state.player.z+9)m=updateBeamEntity(m,dt);
      return m;
    });
    for(const g of state.groundEnemies){
      if(g.alive&&g.weapon!=='beam'&&g.z<82&&g.z>state.player.z+10&&C.shouldFire(stage.groundFireRate,dt))spawnEnemyBullet({x:g.x,y:g.y-.9,z:g.z},.92);
      for(const l of state.lasers){if(g.alive&&l.z<900&&C.planarHit(g,l,1.45,3.0)){l.z=999;hitGround(g,1);}}
      if(g.alive&&g.z<C.CONFIG.enemyDespawnZ)g.alive=false;
    }
    state.groundEnemies=state.groundEnemies.filter(g=>g.alive);

    state.armorPlates=state.armorPlates.map(p=>C.moveArmorPlate(p,dt));
    for(const plate of state.armorPlates){plate.flash=Math.max(0,(plate.flash||0)-dt);for(const l of state.lasers){if(plate.alive&&l.z<900&&C.spheresHit(plate,l,2.1,2.6)){l.z=999;plate.flash=.12;burst(l.x,plate.y,plate.z,5);A.playArmorPing();}}if(plate.alive&&C.spheresHit(plate,state.player,2.35,3.8))damagePlayer(1.1);if(plate.z<C.CONFIG.enemyDespawnZ)plate.alive=false;}
    state.armorPlates=state.armorPlates.filter(p=>p.alive);

    if(state.boss?.alive){
      state.boss=C.moveBoss(state.boss,state.stageElapsed-C.CONFIG.bossIntroSec);
      state.boss=updateBeamEntity(state.boss,dt);
      if(C.shouldFire(stage.bossFireRate*.55,dt))spawnEnemyBullet({x:state.boss.x,y:state.boss.y,z:state.boss.z-2.5},1.08);
      for(const l of state.lasers){if(l.z<900&&C.planarHit(state.boss,l,2.8,4.4)){l.z=999;hitBoss(1);}}
      if(state.boss.alive&&C.spheresHit(state.boss,state.player,3.5,5.2)){damagePlayer(1.5);state.player.z=C.CONFIG.playerMinZ;}
    }
    if(state.running&&C.shouldAdvanceStage(state.stageElapsed)){advanceStage();return;}

    state.enemyBullets=state.enemyBullets.map(b=>C.moveEnemyBullet(b,dt));
    for(const b of state.enemyBullets){if(b.alive&&C.spheresHit(b,state.player,1.05,1.8)){b.alive=false;damagePlayer(.8);}if(b.z<1||b.z>126||Math.abs(b.x)>14||b.y<-4||b.y>12)b.alive=false;}
    state.enemyBullets=state.enemyBullets.filter(b=>b.alive);
    state.lasers=state.lasers.filter(l=>l.z<900);
    for(const p of state.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.life-=dt;}
    state.particles=state.particles.filter(p=>p.life>0&&p.z>1);if(state.particles.length>220)state.particles.splice(0,state.particles.length-220);
  }

  function burst(x,y,z,n=12){for(let i=0;i<n;i++)state.particles.push({x,y,z,vx:C.rand(-5,5),vy:C.rand(-2.4,2.4),vz:C.rand(-8,8),life:C.rand(.25,.72)});}
  function projectWorld(x,y,z){return C.projectChase3D({x,y,z},viewport,C.CONFIG.cameraFocal,CAMERA_PITCH,C.CONFIG.cameraBackOffset);}
  function drawLine3D(a,b,stroke='#fff',width=1){const p1=projectWorld(...a),p2=projectWorld(...b);if(p1.depth<=.2||p2.depth<=.2)return;ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();}
  function drawWorldPolygon(points,fill,stroke=null,width=1){const p=points.map(v=>projectWorld(...v));if(p.some(q=>q.depth<=.2))return;ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}

  function drawTexturedTriangle(texture,p0,p1,p2,uv0=UV[0],uv1=UV[1],uv2=UV[2],shade=0,gloss=.35){
    ctx.save();ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.closePath();ctx.clip();
    if(textureEnabled){
      const sw=texture.width,sh=texture.height,u0=uv0[0]*sw,v0=uv0[1]*sh,u1=uv1[0]*sw,v1=uv1[1]*sh,u2=uv2[0]*sw,v2=uv2[1]*sh,den=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1);
      if(Math.abs(den)>.0001){const a=(p0.x*(v1-v2)+p1.x*(v2-v0)+p2.x*(v0-v1))/den,c=(p0.x*(u2-u1)+p1.x*(u0-u2)+p2.x*(u1-u0))/den,e=(p0.x*(u1*v2-u2*v1)+p1.x*(u2*v0-u0*v2)+p2.x*(u0*v1-u1*v0))/den,b=(p0.y*(v1-v2)+p1.y*(v2-v0)+p2.y*(v0-v1))/den,d=(p0.y*(u2-u1)+p1.y*(u0-u2)+p2.y*(u1-u0))/den,f=(p0.y*(u1*v2-u2*v1)+p1.y*(u2*v0-u0*v2)+p2.y*(u0*v1-u1*v0))/den;ctx.transform(a,b,c,d,e,f);ctx.drawImage(texture,0,0);}
    }else{ctx.fillStyle=texture?.flatColor||'#74818c';ctx.fill();}
    ctx.restore();
    if(shade>0){ctx.fillStyle=`rgba(0,0,0,${shade})`;ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.closePath();ctx.fill();}
    if(textureEnabled&&gloss>0){const sweep=((state?.elapsed||0)*120)%PLAY_W,grad=ctx.createLinearGradient(sweep-90,0,sweep+90,0);grad.addColorStop(0,'rgba(255,255,255,0)');grad.addColorStop(.5,`rgba(255,255,255,${gloss})`);grad.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.closePath();ctx.fill();}
    ctx.strokeStyle=textureEnabled?'rgba(245,250,255,.24)':'rgba(235,242,248,.38)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.closePath();ctx.stroke();
  }
  function drawMesh(model,obj,scale,texture,gloss=.42){const pts=model.vertices.map(v=>projectWorld(obj.x+v[0]*scale,obj.y+v[1]*scale,obj.z+v[2]*scale)),faces=model.faces.map(face=>({face,depth:face.v.reduce((sum,i)=>sum+pts[i].depth,0)/3})).filter(item=>item.face.v.every(i=>pts[i].depth>.25)).sort((a,b)=>b.depth-a.depth);for(const item of faces){const[a,b,c]=item.face.v;drawTexturedTriangle(texture,pts[a],pts[b],pts[c],UV[0],UV[1],UV[2],item.face.s||0,gloss);}}
  function drawWorldTexturedQuad(points,texture,shade=.08,gloss=.26){const p=points.map(v=>projectWorld(...v));if(p.some(q=>q.depth<=.2))return;drawTexturedTriangle(texture,p[0],p[1],p[2],QUV[0],QUV[1],QUV[2],shade,gloss);drawTexturedTriangle(texture,p[0],p[2],p[3],QUV[0],QUV[2],QUV[3],shade,gloss);}

  function segmentWindow(stageNumber){
    const len=C.CONFIG.mapSegmentLength,base=Math.floor(state.worldScroll/len),offset=state.worldScroll%len,items=[];
    for(let n=-1;n<10;n++){const z0=8+n*len-offset,z1=z0+len;if(z1<7||z0>126)continue;items.push({z0,z1,seg:C.mapSegment(base+n,stageNumber),next:C.mapSegment(base+n+1,stageNumber)});}
    return items;
  }

  function drawEarthSurface(){
    const sky=ctx.createLinearGradient(0,0,0,H*.68);sky.addColorStop(0,'#3f7fbd');sky.addColorStop(.55,'#9bcde7');sky.addColorStop(1,'#d8eef1');ctx.fillStyle=sky;ctx.fillRect(0,0,PLAY_W,H*.68);
    ctx.fillStyle='rgba(55,82,72,.55)';ctx.beginPath();ctx.moveTo(0,276);for(let x=0;x<=PLAY_W;x+=45){const y=248+Math.sin(x*.021+state.worldScroll*.006)*17+Math.sin(x*.063+1.1)*7;ctx.lineTo(x,y);}ctx.lineTo(PLAY_W,350);ctx.lineTo(0,350);ctx.closePath();ctx.fill();
    const y=C.CONFIG.groundPlaneY+.32;
    for(const item of segmentWindow(1)){
      const {z0,z1,seg,next}=item;
      const colors={plain:'#5d8747',forest:'#416b39',farmland:'#78964c',water:'#587f62',urban:'#687365',ridge:'#6f7652'};
      drawWorldPolygon([[-12,y,z0],[12,y,z0],[11,y,z1],[-11,y,z1]],colors[seg.biome]||'#5d8747');
      const rc0=seg.roadCenter,rc1=next.roadCenter,rw=1.15;
      drawWorldPolygon([[rc0-rw,y-.08,z0],[rc0+rw,y-.08,z0],[rc1+rw*.92,y-.08,z1],[rc1-rw*.92,y-.08,z1]],'#777b76','#9fa39c',.8);
      const riverOn=seg.biome==='water'||seg.biome==='forest'||seg.biome==='farmland'||seg.accent>.65;
      if(riverOn){const c0=seg.riverCenter,c1=next.riverCenter,w=.65+seg.accent*.55;drawWorldPolygon([[c0-w,y-.10,z0],[c0+w,y-.10,z0],[c1+w*.9,y-.10,z1],[c1-w*.9,y-.10,z1]],'#3e86a8');}
      if(seg.biome==='farmland'){for(const side of[-1,1]){const x=side*6+seg.offset*.15;drawWorldPolygon([[x-1.7,y-.12,z0+2],[x+1.7,y-.12,z0+2],[x+1.4,y-.12,z1-2],[x-1.4,y-.12,z1-2]],side>0?'#879b4f':'#9b8d4f');}}
      if(seg.biome==='forest'){for(let k=0;k<5;k++){const x=-8+k*3.5+(seg.offset*.12);drawWorldPolygon([[x-.35,y-.3,z0+2+k],[x+.35,y-.3,z0+2+k],[x+.25,y-.3,z0+3.2+k],[x-.25,y-.3,z0+3.2+k]],'#2c5b2c');}}
      if(seg.biome==='urban'){for(let k=0;k<4;k++){const side=k%2?1:-1,x=side*(4.8+(k%2)*1.2)+seg.offset*.1;drawWorldPolygon([[x-.7,y-.22,z0+2+k*2],[x+.7,y-.22,z0+2+k*2],[x+.6,y-.22,z0+4+k*2],[x-.6,y-.22,z0+4+k*2]],k%2?'#7d817b':'#656e70');}}
      if(seg.biome==='ridge'){drawWorldPolygon([[-9,y-.18,z0+3],[-4,y-.18,z0+2],[-3,y-.18,z1-2],[-8,y-.18,z1-1]],'#687050');drawWorldPolygon([[4,y-.18,z0+1],[9,y-.18,z0+3],[8,y-.18,z1-1],[3,y-.18,z1-3]],'#737852');}
      if(seg.landmark){const x=seg.offset;drawWorldPolygon([[x-.8,y-.2,(z0+z1)/2-1],[x+.8,y-.2,(z0+z1)/2-1],[x+.7,y-.2,(z0+z1)/2+1],[x-.7,y-.2,(z0+z1)/2+1]],'#a89c72','#d7ca9d',1);}
    }
    ctx.fillStyle='rgba(255,255,255,.50)';for(let i=0;i<5;i++){const x=((i*173-state.worldScroll*2.6)%820+820)%820-40,y=72+(i%3)*38;ctx.beginPath();ctx.ellipse(x,y,38,12,0,0,Math.PI*2);ctx.ellipse(x+28,y+2,28,10,0,0,Math.PI*2);ctx.fill();}
  }

  function drawSpaceBackdrop(){
    const baseIndex=Math.floor(state.worldScroll/C.CONFIG.mapSegmentLength),seg=C.mapSegment(baseIndex,2);
    const g=ctx.createRadialGradient(PLAY_W*(.25+.55*seg.accent),H*.2,15,PLAY_W*.55,H*.25,360);g.addColorStop(0,seg.biome==='nebula'?'rgba(120,55,160,.34)':'rgba(55,95,145,.16)');g.addColorStop(.5,'rgba(35,40,90,.12)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,PLAY_W,H);
    const y=C.CONFIG.groundPlaneY+.3;
    for(const item of segmentWindow(2)){
      const {z0,z1,seg:s}=item,mid=(z0+z1)/2;
      if(s.biome==='debris'||s.biome==='asteroids'){for(let k=0;k<3+(s.biome==='asteroids'?2:0);k++){const x=s.offset+(k-1.5)*3.1,y2=C.CONFIG.flightPlaneY+1.7+(k%2)*1.1;drawWorldPolygon([[x-.35,y2,mid+k],[x+.35,y2,mid+k],[x+.22,y2,mid+k+.8],[x-.22,y2,mid+k+.8]],s.biome==='asteroids'?'#625e58':'#6c7c86');}}
      if(s.biome==='outpost')drawWorldTexturedQuad([[s.offset-2,y,mid-2],[s.offset+2,y,mid-2],[s.offset+1.6,y,mid+3],[s.offset-1.6,y,mid+3]],textures.carrier,.12,.32);
    }
  }

  function drawCapitalShip(){
    const y=7.42;drawWorldTexturedQuad([[-12,y,8],[12,y,8],[10.2,y-.1,124],[-10.2,y-.1,124]],textures.carrier,.12,.28);
    for(const item of segmentWindow(3)){
      const {z0,z1,seg}=item,mid=(z0+z1)/2;
      if(seg.biome==='hangar')drawWorldPolygon([[-6,y-.12,z0+2],[6,y-.12,z0+2],[5.4,y-.12,z1-2],[-5.4,y-.12,z1-2]],'#071018','#8aa1b3',1);
      else if(seg.biome==='vents'){for(const x of[-7,-3,3,7])drawWorldPolygon([[x-.45,y-.13,z0+2],[x+.45,y-.13,z0+2],[x+.35,y-.13,z1-2],[x-.35,y-.13,z1-2]],'#1c2a33','#91afc3',.7);}
      else if(seg.biome==='trench')drawWorldPolygon([[-1.1,y-.15,z0],[1.1,y-.15,z0],[.9,y-.15,z1],[-.9,y-.15,z1]],'#05090e','#5d809a',1);
      else if(seg.biome==='turretDeck'){for(const x of[-5,5])drawWorldTexturedQuad([[x-1,y-.14,mid-2],[x+1,y-.14,mid-2],[x+.8,y-.14,mid+2],[x-.8,y-.14,mid+2]],textures.turret,.08,.34);}
      else{for(const x of[-7,7])drawWorldTexturedQuad([[x-1.5,y-.12,z0+1],[x+1.5,y-.12,z0+1],[x+1.2,y-.12,z1-1],[x-1.2,y-.12,z1-1]],textures.carrier,.12,.3);}
    }
  }

  function drawInterior(){
    const y=7.2;drawWorldTexturedQuad([[-10.5,y,8],[10.5,y,8],[8.5,y-.2,124],[-8.5,y-.2,124]],textures.interior,.13,.30);
    drawWorldTexturedQuad([[-10.5,y,8],[-8.5,y-.2,124],[-7.5,-2.5,124],[-11.5,-2.5,8]],textures.interior,.26,.18);
    drawWorldTexturedQuad([[10.5,y,8],[11.5,-2.5,8],[7.5,-2.5,124],[8.5,y-.2,124]],textures.interior,.23,.18);
    for(const item of segmentWindow(4)){
      const {z0,z1,seg}=item,mid=(z0+z1)/2;
      if(seg.biome==='reactor'){ctx.save();ctx.shadowColor='#ff6666';ctx.shadowBlur=14;drawLine3D([-6,2.0,mid],[6,2.0,mid],'#ff5d62',4);ctx.restore();}
      else if(seg.biome==='conduit'){for(const x of[-7.2,-5.8,5.8,7.2])drawLine3D([x,6.3,z0],[x,6.3,z1],'rgba(90,200,255,.55)',2);}
      else if(seg.biome==='gate'){drawLine3D([-8.5,6.8,mid],[8.5,6.8,mid],'rgba(240,245,255,.65)',3);drawLine3D([-7,-1.7,mid],[7,-1.7,mid],'rgba(240,245,255,.35)',2);}
      else if(seg.biome==='bay'){for(const x of[-6.8,6.8])drawWorldPolygon([[x-1.2,6.1,z0+2],[x+1.2,6.1,z0+2],[x+1.0,6.1,z1-2],[x-1.0,6.1,z1-2]],'#13191f','#8d9eaa',1);}
      else drawLine3D([-9.5,6.7,mid],[9.5,6.7,mid],'rgba(255,90,90,.20)',1.5);
    }
  }

  function drawBackdropKind(kind){if(kind==='earthSurface')drawEarthSurface();else if(kind==='space')drawSpaceBackdrop();else if(kind==='carrier')drawCapitalShip();else drawInterior();}
  function drawStageBackdrop(){const current=currentStage().backdrop;if(state.transitionTimer>0&&state.transitionFromBackdrop){const oldAlpha=Math.min(1,state.transitionTimer/C.CONFIG.backdropTransitionSec);ctx.save();ctx.globalAlpha=oldAlpha;drawBackdropKind(state.transitionFromBackdrop);ctx.restore();ctx.save();ctx.globalAlpha=1-oldAlpha;drawBackdropKind(current);ctx.restore();}else drawBackdropKind(current);}

  function drawArmorPlate(plate){const w=2.15,h=1.35,t=.18,c=Math.cos(plate.angle),sn=Math.sin(plate.angle),pt=(x,y,z=0)=>[plate.x+x*c+z*sn,plate.y+y,plate.z-x*sn+z*c],front=[pt(-w,-h,-t),pt(w,-h,-t),pt(w,h,-t),pt(-w,h,-t)],back=[pt(w,-h,t),pt(-w,-h,t),pt(-w,h,t),pt(w,h,t)];drawWorldTexturedQuad(front,textures.armor,plate.flash>0?0:.04,plate.flash>0?.82:.58);drawWorldTexturedQuad(back,textures.armor,.18,.32);drawLine3D(pt(-w,0,-t-.02),pt(w,0,-t-.02),plate.flash>0?'#fff':'rgba(240,250,255,.78)',1.4);}

  function drawEnemyBeam(e){
    if((e.beamCharge||0)<=0&&(e.beamActive||0)<=0)return;
    const active=(e.beamActive||0)>0,source=[e.x,e.y,e.z-1],end=[e.beamX,C.CONFIG.flightPlaneY,2];
    drawLine3D(source,end,active?'rgba(70,235,255,.92)':'rgba(255,90,90,.42)',active?4:1.2);
    if(active)drawLine3D([e.x+.16,e.y,e.z-1],[e.beamX+.16,C.CONFIG.flightPlaneY,2],'rgba(255,255,255,.72)',1.2);
  }
  function drawPlayerBeam(){
    if(!state.playerBeamActive)return;
    const a=projectWorld(state.player.x,C.CONFIG.flightPlaneY-.18,state.player.z+2.2),b=projectWorld(state.player.x,C.CONFIG.flightPlaneY-.18,state.playerBeamEndZ);
    ctx.save();ctx.shadowColor='#55eaff';ctx.shadowBlur=12;ctx.strokeStyle='rgba(70,235,255,.96)';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();
  }
  function enemyVisual(e){
    if(e.kind==='dart')return{model:dartModel,scale:1.25,texture:textures.dart};
    if(e.kind==='bomber')return{model:bomberModel,scale:1.15,texture:textures.bomber};
    if(e.kind==='raider')return{model:dartModel,scale:1.45,texture:textures.raider};
    if(e.kind==='beamfighter')return{model:fighterModel,scale:1.32,texture:textures.beam};
    return{model:fighterModel,scale:e.kind==='interceptor'?1.28:1.4,texture:textures.fighter};
  }

  function render(){ctx.save();const shakeX=state?.shake?C.rand(-4,4)*state.shake:0,shakeY=state?.shake?C.rand(-4,4)*state.shake:0;ctx.translate(shakeX,shakeY);ctx.fillStyle='#000';ctx.fillRect(-8,-8,W+16,H+16);drawPlayfield();drawHUD();ctx.restore();}
  function drawPlayfield(){
    ctx.save();ctx.beginPath();ctx.rect(0,0,PLAY_W,H);ctx.clip();if(!state){drawIdleStars();ctx.restore();return;}
    if(currentStage().backdrop!=='earthSurface'){for(const s of state.stars){const p=projectWorld(s.x,s.y,s.z);if(p.depth<=.2)continue;const r=Math.max(.5,Math.min(2.2,14/p.depth));ctx.globalAlpha=s.b;ctx.fillStyle='#fff';ctx.fillRect(p.x,p.y,r,r);}ctx.globalAlpha=1;}
    drawStageBackdrop();drawRetroGrid();
    for(const g of [...state.groundEnemies].sort((a,b)=>b.z-a.z)){drawEnemyBeam(g);drawMesh(turretModel,g,1.05,g.kind==='laserTurret'?textures.laserTurret:textures.turret,.38);}
    for(const plate of [...state.armorPlates].sort((a,b)=>b.z-a.z))drawArmorPlate(plate);
    for(const l of state.lasers){const a=projectWorld(l.x,l.y,l.z),b=projectWorld(l.x,l.y,l.z+6);ctx.strokeStyle='#ff665d';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    drawPlayerBeam();
    for(const b of state.enemyBullets){const p=projectWorld(b.x,b.y,b.z);if(p.depth>.2){ctx.fillStyle='#ffd35a';ctx.shadowColor='#ff7d34';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(p.x,p.y,3.1,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}}
    for(const e of [...state.enemies].sort((a,b)=>b.z-a.z)){drawEnemyBeam(e);const v=enemyVisual(e);drawMesh(v.model,e,v.scale,v.texture,e.kind==='beamfighter'?.55:.42);}
    if(state.boss?.alive){drawEnemyBeam(state.boss);drawMesh(bossModel,state.boss,1.55,textures.boss,.48);}
    for(const p of state.particles){const q=projectWorld(p.x,p.y,p.z);ctx.fillStyle=p.life>.3?'#fff':'#ff9a60';ctx.fillRect(q.x,q.y,3,3);}
    drawPlayer();drawBossBar();drawBanner();ctx.restore();
  }
  function drawIdleStars(){ctx.fillStyle='#fff';for(let i=0;i<80;i++)ctx.fillRect((i*83)%PLAY_W,(i*47)%H,1,1);}
  function drawRetroGrid(){if(currentStage().backdrop==='earthSurface')return;const y=C.CONFIG.flightPlaneY+2.55;for(let z=12;z<=110;z+=8)drawLine3D([-11,y,z],[11,y,z],'rgba(115,160,200,.07)',1);for(let x=-10;x<=10;x+=2)drawLine3D([x,y,10],[x,y,112],'rgba(115,160,200,.045)',1);}
  function drawPlayer(){drawMesh(playerModel,state.player,1.18,textures.player);const la=projectWorld(state.player.x-.68,state.player.y+.12,state.player.z-1.65),lb=projectWorld(state.player.x-.68,state.player.y+.22,state.player.z-3.7),ra=projectWorld(state.player.x+.68,state.player.y+.12,state.player.z-1.65),rb=projectWorld(state.player.x+.68,state.player.y+.22,state.player.z-3.7);ctx.strokeStyle='#ff9c55';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(la.x,la.y);ctx.lineTo(lb.x,lb.y);ctx.moveTo(ra.x,ra.y);ctx.lineTo(rb.x,rb.y);ctx.stroke();if(invincibleMode){const p=projectWorld(state.player.x,state.player.y,state.player.z),r=Math.max(22,34*p.scale);ctx.strokeStyle='rgba(80,235,255,.75)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,r*1.25,r*.55,0,0,Math.PI*2);ctx.stroke();}}
  function drawBossBar(){if(!state.boss?.alive)return;const x=165,y=18,w=410,h=16,ratio=Math.max(0,state.boss.hp/state.boss.maxHp);ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(x-4,y-4,w+8,h+8);ctx.strokeStyle='#fff';ctx.strokeRect(x,y,w,h);ctx.fillStyle='#d42e38';ctx.fillRect(x+2,y+2,(w-4)*ratio,h-4);ctx.fillStyle='#fff';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText(`BOSS ${state.boss.hp}/${state.boss.maxHp}`,x+w/2,y+13);}
  function drawBanner(){if(state.bannerTimer<=0)return;const stage=currentStage();ctx.textAlign='center';ctx.fillStyle='rgba(0,0,0,.64)';ctx.fillRect(115,260,510,76);ctx.fillStyle='#fff';ctx.font='bold 25px monospace';let text=`STAGE ${state.stage}  ${stage.name}`;if(state.bossSpawned&&state.boss?.alive)text='WARNING  BOSS APPROACH';else if(state.stageCleared)text='BOSS DESTROYED';ctx.fillText(text,370,305);}
  function formatTime(sec){const s=Math.max(0,Math.floor(sec)),m=Math.floor(s/60),r=s%60;return`${m}:${String(r).padStart(2,'0')}`;}
  function drawHUD(){
    ctx.fillStyle='#05070a';ctx.fillRect(HUD_X,0,W-HUD_X,H);ctx.strokeStyle='#c4c9d0';ctx.lineWidth=2;ctx.strokeRect(HUD_X+10,10,W-HUD_X-20,H-20);
    ctx.fillStyle='#e9edf3';ctx.textAlign='center';ctx.font='bold 18px monospace';ctx.fillText('SCORE',860,42);ctx.font='bold 26px monospace';ctx.fillStyle='#ff5555';ctx.fillText(String(state?.score||0).padStart(7,'0'),860,70);
    box(785,94,150,88);ctx.fillStyle='#fff';ctx.font='bold 16px monospace';ctx.fillText('WEAPONS',860,118);ctx.font='bold 15px monospace';ctx.fillStyle='#ff7b70';ctx.fillText('PULSE  Space/J',860,143);ctx.fillStyle='#6eefff';ctx.fillText('LASER  L',860,166);
    box(785,194,150,142);ctx.fillStyle='#fff';ctx.font='bold 16px monospace';ctx.fillText('SHIP STATUS',860,219);drawHudShip(860,269);ctx.fillStyle='#ff5555';ctx.fillText(`LIFE ${state?.lives??3}`,860,319);
    box(785,352,150,118);ctx.fillStyle='#fff';ctx.font='bold 15px monospace';ctx.fillText(`STAGE ${state?.stage||1}/4`,860,379);ctx.font='bold 12px monospace';ctx.fillStyle='#9fd7ff';ctx.fillText(currentStage().name,860,401);ctx.fillStyle='#fff';ctx.fillText(formatTime(C.stageRemaining(state?.stageElapsed||0)),860,430);ctx.fillStyle='#ffb05f';ctx.fillText(`AIR ${state?.enemies?.length||0} GND ${state?.groundEnemies?.length||0}`,860,451);ctx.fillText(`BULLET ${state?.enemyBullets?.length||0}`,860,465);
    box(785,486,150,70);ctx.fillStyle='#fff';ctx.font='12px monospace';ctx.fillText(`INV ${invincibleMode?'ON':'OFF'} [I]`,860,507);ctx.fillText(`BGM ${A.isBgmEnabled?.()?'ON':'OFF'} [B]`,860,525);ctx.fillText(`TEXTURE ${textureEnabled?'ON':'OFF'} [T]`,860,543);
    ctx.fillStyle='#8f99a8';ctx.font='11px monospace';ctx.fillText(A.supported()?`SOUND ${A.isMuted()?'OFF':'ON'} [M]`:'SOUND N/A',860,585);ctx.fillText(`CONTINUE ${state?.continueCount||0}`,860,603);ctx.fillText(`POLYGON STRIKE ${C.VERSION}`,860,621);
  }
  function box(x,y,w,h){ctx.strokeStyle='#6a7483';ctx.strokeRect(x,y,w,h);ctx.strokeStyle='#28303b';ctx.strokeRect(x+4,y+4,w-8,h-8);}
  function drawHudShip(cx,cy){const grad=ctx.createLinearGradient(cx-45,cy-35,cx+45,cy+35);grad.addColorStop(0,'#5e6d7d');grad.addColorStop(.48,'#fff');grad.addColorStop(.60,'#9cabb9');grad.addColorStop(1,'#455361');ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(cx,cy-40);ctx.lineTo(cx-12,cy-2);ctx.lineTo(cx-50,cy+29);ctx.lineTo(cx-18,cy+22);ctx.lineTo(cx,cy+34);ctx.lineTo(cx+18,cy+22);ctx.lineTo(cx+50,cy+29);ctx.lineTo(cx+12,cy-2);ctx.closePath();ctx.fill();ctx.fillStyle='#65758b';ctx.fillRect(cx-5,cy-8,10,28);ctx.fillStyle='#b42d34';ctx.fillRect(cx-3,cy-20,6,10);}

  const FIXED_STEP=1/60,MAX_FRAME_DT=.14,MAX_STEPS=8;let last=performance.now(),accumulator=0;
  function frame(now){const frameDt=Math.min(MAX_FRAME_DT,Math.max(0,(now-last)/1000));last=now;accumulator+=frameDt;let steps=0;while(accumulator>=FIXED_STEP&&steps<MAX_STEPS){update(FIXED_STEP);accumulator-=FIXED_STEP;steps++;}if(steps===MAX_STEPS&&accumulator>FIXED_STEP*2)accumulator=0;render();requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
})();
