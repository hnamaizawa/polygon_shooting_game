(() => {
  'use strict';
  const C = window.PolygonStrikeCore;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const startPanel = document.getElementById('startPanel');
  const startButton = document.getElementById('startButton');
  const W = canvas.width, H = canvas.height;
  const PLAY_W = 742, HUD_X = 760;
  const viewport = { cx: PLAY_W / 2, cy: H * 0.47 };
  const keys = new Set();

  let state;
  const fighter = {
    vertices: [[0,-1.2,0],[-1.2,1,0],[0,0.55,1.2],[1.2,1,0],[0,0.8,-1.0]],
    edges: [[0,1],[1,2],[2,3],[3,0],[1,4],[4,3],[0,4]]
  };
  const dart = {
    vertices: [[0,-1.4,0],[-0.8,0.8,0],[0,0.2,1.4],[0.8,0.8,0],[0,0.7,-0.8]],
    edges: [[0,1],[1,2],[2,3],[3,0],[1,4],[4,3]]
  };
  const playerModel = {
    vertices: [[0,-1.7,0],[-1.8,1.4,0],[-0.65,0.8,1],[0,0.2,1.6],[0.65,0.8,1],[1.8,1.4,0],[0,1.0,-1.0]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[1,6],[6,5],[2,6],[4,6]]
  };

  function reset() {
    state = {
      running: true, gameOver: false, score: 0, area: 1, lives: 3,
      elapsed: 0, spawnTimer: 0.4, spawnBase: 1.05, enemyId: 1,
      fireTimer: 0, shake: 0,
      player: { x: 0, y: 3.25, z: C.CONFIG.playerZ },
      enemies: [], lasers: [], particles: [],
      stars: Array.from({length: 120}, () => makeStar(true))
    };
  }

  function makeStar(randomZ = false) {
    return { x: C.rand(-23,23), y: C.rand(-16,16), z: randomZ ? C.rand(5,95) : 95, speed: C.rand(13,28), b: C.rand(.35,1) };
  }

  function start() { reset(); startPanel.classList.add('hidden'); }
  startButton.addEventListener('click', start);
  addEventListener('keydown', e => {
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code === 'Enter' && (!state || !state.running)) start();
    if (e.code === 'KeyR' && state?.gameOver) start();
  });
  addEventListener('keyup', e => keys.delete(e.code));

  function update(dt) {
    if (!state?.running) return;
    state.elapsed += dt;
    state.fireTimer -= dt;
    state.spawnTimer -= dt;
    state.shake = Math.max(0, state.shake - dt * 10);

    const move = 8.8 * dt;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) state.player.x -= move;
    if (keys.has('ArrowRight') || keys.has('KeyD')) state.player.x += move;
    if (keys.has('ArrowUp') || keys.has('KeyW')) state.player.y -= move;
    if (keys.has('ArrowDown') || keys.has('KeyS')) state.player.y += move;
    state.player.x = C.clamp(state.player.x, -C.CONFIG.worldHalfWidth, C.CONFIG.worldHalfWidth);
    state.player.y = C.clamp(state.player.y, -C.CONFIG.worldHalfHeight + 1.0, C.CONFIG.worldHalfHeight - .6);

    if ((keys.has('Space') || keys.has('KeyJ')) && state.fireTimer <= 0) {
      state.lasers.push({x: state.player.x - .42, y: state.player.y - .5, z: 5}, {x: state.player.x + .42, y: state.player.y - .5, z: 5});
      state.fireTimer = C.CONFIG.fireCooldown;
    }

    if (state.spawnTimer <= 0) {
      state.enemies.push(C.makeEnemy(state.enemyId++));
      state.spawnBase = Math.max(.48, 1.05 - state.elapsed / 110);
      state.spawnTimer = C.nextEnemySpawn(state.spawnBase);
    }

    for (const s of state.stars) {
      s.z -= s.speed * dt;
      if (s.z < 2) Object.assign(s, makeStar(false));
    }

    for (const l of state.lasers) l.z += C.CONFIG.laserSpeed * dt;
    state.lasers = state.lasers.filter(l => l.z < 92);

    for (const e of state.enemies) {
      e.z -= e.speed * dt;
      e.x += Math.sin(state.elapsed * 1.9 + e.phase) * dt * (e.kind === 'dart' ? 1.5 : .65);
      e.y += Math.cos(state.elapsed * 1.3 + e.phase) * dt * .22;
      for (const l of state.lasers) {
        if (e.alive && C.spheresHit(e, l, 1.15, 2.8)) {
          e.alive = false; l.z = 999;
          state.score += C.scoreForEnemy(e);
          burst(e.x,e.y,e.z);
        }
      }
      if (e.alive && e.z < 7 && Math.hypot(e.x-state.player.x,e.y-state.player.y) < 1.7) {
        e.alive = false; state.lives--; state.shake = 1;
        burst(state.player.x,state.player.y,6,22);
        if (state.lives <= 0) endGame();
      }
      if (e.alive && e.z < C.CONFIG.enemyDespawnZ) e.alive = false;
    }
    state.enemies = state.enemies.filter(e => e.alive);
    state.lasers = state.lasers.filter(l => l.z < 100);

    for (const p of state.particles) {
      p.x += p.vx*dt; p.y += p.vy*dt; p.z += p.vz*dt; p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0 && p.z > 1);
    state.area = 1 + Math.floor(state.elapsed / 35);
  }

  function burst(x,y,z,n=12) {
    for (let i=0;i<n;i++) state.particles.push({x,y,z,vx:C.rand(-5,5),vy:C.rand(-5,5),vz:C.rand(-8,8),life:C.rand(.25,.65)});
  }
  function endGame() {
    state.running = false; state.gameOver = true;
    startPanel.innerHTML = `<h1>GAME OVER</h1><p>SCORE ${String(state.score).padStart(7,'0')}</p><p>R / Enter で再出撃</p><button id="restartButton">RETRY</button>`;
    startPanel.classList.remove('hidden');
    document.getElementById('restartButton').addEventListener('click', start);
  }

  function projectWorld(x,y,z) { return C.project3D({x,y,z}, viewport, 520); }
  function drawLine3D(a,b,stroke='#fff',width=1) {
    const p1=projectWorld(...a), p2=projectWorld(...b);
    ctx.strokeStyle=stroke; ctx.lineWidth=width; ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
  }
  function drawModel(model, obj, scale=1, stroke='#f7f7f7') {
    const pts = model.vertices.map(v => projectWorld(obj.x+v[0]*scale, obj.y+v[1]*scale, obj.z+v[2]*scale));
    ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, Math.min(3, 10/obj.z));
    ctx.beginPath();
    for (const [a,b] of model.edges) { ctx.moveTo(pts[a].x,pts[a].y); ctx.lineTo(pts[b].x,pts[b].y); }
    ctx.stroke();
  }

  function render() {
    ctx.save();
    const shakeX = state?.shake ? C.rand(-4,4)*state.shake : 0;
    const shakeY = state?.shake ? C.rand(-4,4)*state.shake : 0;
    ctx.translate(shakeX,shakeY);
    ctx.fillStyle='#000'; ctx.fillRect(-8,-8,W+16,H+16);
    drawPlayfield(); drawHUD();
    ctx.restore();
  }

  function drawPlayfield() {
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,PLAY_W,H); ctx.clip();
    if (!state) { drawIdleStars(); ctx.restore(); return; }

    for (const s of state.stars) {
      const p = projectWorld(s.x,s.y,s.z); const r = Math.max(.5, Math.min(2.4, 15/s.z));
      ctx.globalAlpha=s.b; ctx.fillStyle='#fff'; ctx.fillRect(p.x,p.y,r,r);
    }
    ctx.globalAlpha=1;
    drawRetroGrid();

    for (const l of state.lasers) {
      const a=projectWorld(l.x,l.y,l.z), b=projectWorld(l.x,l.y,l.z+5);
      ctx.strokeStyle='#ff5b5b'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }
    [...state.enemies].sort((a,b)=>b.z-a.z).forEach(e => drawModel(e.kind==='dart'?dart:fighter,e,e.kind==='dart'?1.15:1.35,e.kind==='dart'?'#ff5555':'#f4f4f4'));
    for (const p of state.particles) {
      const q=projectWorld(p.x,p.y,p.z); ctx.fillStyle=p.life>.3?'#fff':'#ff5555'; ctx.fillRect(q.x,q.y,2,2);
    }
    drawPlayer();
    ctx.restore();
  }

  function drawIdleStars() {
    ctx.fillStyle='#fff';
    for (let i=0;i<80;i++) { const x=(i*83)%PLAY_W, y=(i*47)%H; ctx.fillRect(x,y,1,1); }
  }

  function drawRetroGrid() {
    ctx.strokeStyle='rgba(100,120,150,.18)'; ctx.lineWidth=1;
    for (let z=12; z<=84; z+=8) drawLine3D([-10,5.8,z],[10,5.8,z],'rgba(100,120,150,.16)',1);
    for (let x=-10;x<=10;x+=2) drawLine3D([x,5.8,10],[x,5.8,86],'rgba(100,120,150,.12)',1);
  }

  function drawPlayer() {
    const p={x:state.player.x,y:state.player.y,z:9};
    drawModel(playerModel,p,1.28,'#ffffff');
    const flameA=projectWorld(p.x-.55,p.y+1.55,p.z), flameB=projectWorld(p.x-.55,p.y+2.2,p.z+1.2);
    const flameC=projectWorld(p.x+.55,p.y+1.55,p.z), flameD=projectWorld(p.x+.55,p.y+2.2,p.z+1.2);
    ctx.strokeStyle='#ff4c4c'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(flameA.x,flameA.y);ctx.lineTo(flameB.x,flameB.y);ctx.moveTo(flameC.x,flameC.y);ctx.lineTo(flameD.x,flameD.y);ctx.stroke();
  }

  function drawHUD() {
    ctx.fillStyle='#05070a'; ctx.fillRect(HUD_X,0,W-HUD_X,H);
    ctx.strokeStyle='#c4c9d0'; ctx.lineWidth=2; ctx.strokeRect(HUD_X+10,10,W-HUD_X-20,H-20);
    ctx.fillStyle='#e9edf3'; ctx.textAlign='center';
    ctx.font='bold 18px monospace'; ctx.fillText('SCORE',860,42);
    ctx.font='bold 26px monospace'; ctx.fillStyle='#ff5555'; ctx.fillText(String(state?.score||0).padStart(7,'0'),860,70);
    box(785,94,150,72); ctx.fillStyle='#fff'; ctx.font='bold 18px monospace'; ctx.fillText('WEAPON',860,120); ctx.font='bold 30px monospace'; ctx.fillText('L',860,153);
    box(785,182,150,170); ctx.font='bold 16px monospace'; ctx.fillText('SHIP STATUS',860,208); drawHudShip(860,270); ctx.fillStyle='#ff5555'; ctx.fillText(`LIFE ${state?.lives ?? 3}`,860,330);
    box(785,370,150,96); ctx.fillStyle='#fff'; ctx.font='bold 17px monospace'; ctx.fillText('AREA',860,398); ctx.font='bold 34px monospace'; ctx.fillStyle='#ff5555'; ctx.fillText(String(state?.area||1).padStart(2,'0'),860,440);
    ctx.fillStyle='#8f99a8'; ctx.font='12px monospace'; ctx.fillText(`POLYGON STRIKE ${C.VERSION}`,860,604);
  }
  function box(x,y,w,h){ctx.strokeStyle='#6a7483';ctx.strokeRect(x,y,w,h);ctx.strokeStyle='#28303b';ctx.strokeRect(x+4,y+4,w-8,h-8)}
  function drawHudShip(cx,cy){ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx,cy-34);ctx.lineTo(cx-44,cy+28);ctx.lineTo(cx-13,cy+15);ctx.lineTo(cx,cy+32);ctx.lineTo(cx+13,cy+15);ctx.lineTo(cx+44,cy+28);ctx.closePath();ctx.stroke();}

  let last=performance.now();
  function frame(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);render();requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
})();
