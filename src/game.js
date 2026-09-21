(() => {
  'use strict';

  const C = window.PolygonStrikeCore;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const startPanel = document.getElementById('startPanel');
  const startButton = document.getElementById('startButton');
  const W = canvas.width, H = canvas.height;
  const PLAY_W = 742, HUD_X = 760;
  const viewport = { cx: PLAY_W / 2, cy: H * 0.66 };
  const CAMERA_PITCH = C.CONFIG.cameraPitchDeg * Math.PI / 180;
  const keys = new Set();

  ctx.imageSmoothingEnabled = false;

  function makeMetalTexture(base, accent, dark) {
    const tex = document.createElement('canvas');
    tex.width = tex.height = 64;
    const g = tex.getContext('2d');
    g.imageSmoothingEnabled = false;

    const grad = g.createLinearGradient(0, 0, 64, 64);
    grad.addColorStop(0, dark);
    grad.addColorStop(.18, base);
    grad.addColorStop(.42, '#d7dde4');
    grad.addColorStop(.55, base);
    grad.addColorStop(.82, '#657180');
    grad.addColorStop(1, dark);
    g.fillStyle = grad;
    g.fillRect(0,0,64,64);

    g.strokeStyle = 'rgba(20,25,32,.78)';
    g.lineWidth = 2;
    for (let y=0; y<=64; y+=16) { g.beginPath(); g.moveTo(0,y); g.lineTo(64,y); g.stroke(); }
    for (let x=0; x<=64; x+=16) { g.beginPath(); g.moveTo(x,0); g.lineTo(x,64); g.stroke(); }

    g.fillStyle = accent;
    g.fillRect(5,7,23,4);
    g.fillRect(35,21,22,4);
    g.fillRect(9,39,46,3);
    g.fillRect(28,47,8,11);

    g.fillStyle = 'rgba(255,255,255,.55)';
    g.fillRect(2,2,60,2);
    g.fillRect(3,18,26,1);
    g.fillRect(34,34,26,1);

    g.fillStyle = 'rgba(255,255,255,.22)';
    for (let i=0; i<30; i++) {
      const x=(i*17+5)%62, y=(i*29+9)%62;
      g.fillRect(x,y,1+(i%2),1);
    }
    g.fillStyle = 'rgba(0,0,0,.28)';
    for (let i=0; i<16; i++) {
      const x=(i*23+11)%61, y=(i*13+7)%61;
      g.fillRect(x,y,3,1);
    }
    return tex;
  }

  const textures = {
    player: makeMetalTexture('#778694', '#d92c32', '#26303a'),
    fighter: makeMetalTexture('#6b737b', '#e07058', '#25282c'),
    dart: makeMetalTexture('#5f6570', '#b767c8', '#20232b')
  };

  const UV = [[0.50,0.02],[0.02,0.98],[0.98,0.98]];

  // Original craft design: long central fuselage, swept delta wings and twin engine nacelles.
  // The silhouette is intentionally reminiscent of 1980s Japanese polygon shooters without copying a specific proprietary model.
  const playerModel = {
    vertices: [
      [0,-0.22,3.65], [0,-0.78,1.20], [0,0.24,0.85],
      [-0.72,-0.08,1.55], [-1.55,0.02,0.75], [-3.00,0.16,-0.55], [-1.45,0.20,-1.60],
      [0.72,-0.08,1.55], [1.55,0.02,0.75], [3.00,0.16,-0.55], [1.45,0.20,-1.60],
      [0,-0.08,-2.15], [-0.66,0.17,-1.78], [0.66,0.17,-1.78],
      [-1.15,-0.03,-1.00], [1.15,-0.03,-1.00]
    ],
    faces: [
      {v:[0,1,3],s:.01},{v:[0,7,1],s:.05},{v:[0,3,2],s:.08},{v:[0,2,7],s:.13},
      {v:[1,2,3],s:.03},{v:[1,7,2],s:.08},
      {v:[3,4,5],s:.11},{v:[3,5,6],s:.16},{v:[3,6,2],s:.19},
      {v:[7,2,10],s:.20},{v:[7,10,9],s:.13},{v:[7,9,8],s:.08},
      {v:[2,6,11],s:.21},{v:[2,11,10],s:.18},
      {v:[6,12,11],s:.24},{v:[11,13,10],s:.22},
      {v:[4,14,6],s:.17},{v:[8,10,15],s:.16}
    ]
  };

  const fighterModel = {
    vertices: [
      [0,-0.12,2.05],[0,-0.5,0.28],[0,0.22,0.15],
      [-0.85,0.02,0.62],[-1.85,0.18,-0.45],[-0.68,0.18,-1.15],
      [0.85,0.02,0.62],[1.85,0.18,-0.45],[0.68,0.18,-1.15],[0,-0.06,-1.35]
    ],
    faces: [
      {v:[0,1,3],s:.04},{v:[0,6,1],s:.10},{v:[0,3,2],s:.13},{v:[0,2,6],s:.18},
      {v:[3,4,5],s:.20},{v:[3,5,2],s:.26},{v:[6,2,8],s:.27},{v:[6,8,7],s:.19},
      {v:[2,5,9],s:.31},{v:[2,9,8],s:.28}
    ]
  };

  const dartModel = {
    vertices: [
      [0,-0.10,2.35],[0,-0.44,0.10],[0,0.22,0.00],
      [-0.75,0.03,0.38],[-1.20,0.15,-0.72],[-0.42,0.14,-1.40],
      [0.75,0.03,0.38],[1.20,0.15,-0.72],[0.42,0.14,-1.40],[0,-0.08,-1.65]
    ],
    faces: [
      {v:[0,1,3],s:.03},{v:[0,6,1],s:.09},{v:[0,3,2],s:.13},{v:[0,2,6],s:.18},
      {v:[3,4,5],s:.23},{v:[3,5,2],s:.29},{v:[6,2,8],s:.27},{v:[6,8,7],s:.20},
      {v:[2,5,9],s:.33},{v:[2,9,8],s:.30}
    ]
  };

  let state;

  function reset() {
    state = {
      running:true, gameOver:false, score:0, area:1, lives:3,
      elapsed:0, spawnTimer:.4, spawnBase:1.05, enemyId:1,
      fireTimer:0, shake:0,
      player:{x:0,y:3.25,z:C.CONFIG.playerZ},
      enemies:[], lasers:[], particles:[],
      stars:Array.from({length:105},()=>makeStar(true))
    };
  }

  function makeStar(randomZ=false) {
    return {x:C.rand(-23,23),y:C.rand(-16,16),z:randomZ?C.rand(7,95):95,speed:C.rand(13,28),b:C.rand(.28,.85)};
  }

  function start() { reset(); startPanel.classList.add('hidden'); }
  startButton.addEventListener('click', start);
  addEventListener('keydown', e => {
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code==='Enter' && (!state || !state.running)) start();
    if (e.code==='KeyR' && state?.gameOver) start();
  });
  addEventListener('keyup', e => keys.delete(e.code));

  function update(dt) {
    if (!state?.running) return;
    state.elapsed += dt;
    state.fireTimer -= dt;
    state.spawnTimer -= dt;
    state.shake = Math.max(0,state.shake-dt*10);

    const move=8.8*dt;
    if (keys.has('ArrowLeft')||keys.has('KeyA')) state.player.x-=move;
    if (keys.has('ArrowRight')||keys.has('KeyD')) state.player.x+=move;
    if (keys.has('ArrowUp')||keys.has('KeyW')) state.player.y-=move;
    if (keys.has('ArrowDown')||keys.has('KeyS')) state.player.y+=move;
    state.player.x=C.clamp(state.player.x,-C.CONFIG.worldHalfWidth,C.CONFIG.worldHalfWidth);
    state.player.y=C.clamp(state.player.y,-C.CONFIG.worldHalfHeight+1,C.CONFIG.worldHalfHeight-.6);

    if ((keys.has('Space')||keys.has('KeyJ')) && state.fireTimer<=0) {
      state.lasers.push(
        {x:state.player.x-.50,y:state.player.y-.15,z:state.player.z+2.15},
        {x:state.player.x+.50,y:state.player.y-.15,z:state.player.z+2.15}
      );
      state.fireTimer=C.CONFIG.fireCooldown;
    }

    if (state.spawnTimer<=0) {
      state.enemies.push(C.makeEnemy(state.enemyId++));
      state.spawnBase=Math.max(.48,1.05-state.elapsed/110);
      state.spawnTimer=C.nextEnemySpawn(state.spawnBase);
    }

    for (const s of state.stars) {
      s.z -= s.speed*dt;
      if (s.z<3) Object.assign(s,makeStar(false));
    }

    for (const l of state.lasers) l.z += C.CONFIG.laserSpeed*dt;
    state.lasers=state.lasers.filter(l=>l.z<96);

    for (const e of state.enemies) {
      e.z-=e.speed*dt;
      e.x+=Math.sin(state.elapsed*1.9+e.phase)*dt*(e.kind==='dart'?1.5:.65);
      e.y+=Math.cos(state.elapsed*1.3+e.phase)*dt*.22;
      for (const l of state.lasers) {
        if (e.alive && C.spheresHit(e,l,1.15,2.8)) {
          e.alive=false; l.z=999; state.score+=C.scoreForEnemy(e); burst(e.x,e.y,e.z);
        }
      }
      if (e.alive && C.spheresHit(e,state.player,1.7,3.8)) {
        e.alive=false; state.lives--; state.shake=1;
        burst(state.player.x,state.player.y,state.player.z+1,22);
        if (state.lives<=0) endGame();
      }
      if (e.alive && e.z<C.CONFIG.enemyDespawnZ) e.alive=false;
    }
    state.enemies=state.enemies.filter(e=>e.alive);
    state.lasers=state.lasers.filter(l=>l.z<100);

    for (const p of state.particles) {
      p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt; p.life-=dt;
    }
    state.particles=state.particles.filter(p=>p.life>0&&p.z>1);
    state.area=1+Math.floor(state.elapsed/35);
  }

  function burst(x,y,z,n=12) {
    for (let i=0;i<n;i++) state.particles.push({x,y,z,vx:C.rand(-5,5),vy:C.rand(-5,5),vz:C.rand(-8,8),life:C.rand(.25,.65)});
  }

  function endGame() {
    state.running=false; state.gameOver=true;
    startPanel.innerHTML=`<h1>GAME OVER</h1><p>SCORE ${String(state.score).padStart(7,'0')}</p><p>R / Enter で再出撃</p><button id="restartButton">RETRY</button>`;
    startPanel.classList.remove('hidden');
    document.getElementById('restartButton').addEventListener('click',start);
  }

  function projectWorld(x,y,z) {
    return C.projectChase3D({x,y,z},viewport,C.CONFIG.cameraFocal,CAMERA_PITCH);
  }

  function drawLine3D(a,b,stroke='#fff',width=1) {
    const p1=projectWorld(...a), p2=projectWorld(...b);
    if (p1.depth<=.2||p2.depth<=.2) return;
    ctx.strokeStyle=stroke; ctx.lineWidth=width;
    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
  }

  function drawWorldPolygon(points, fill, stroke=null, width=1) {
    const p=points.map(v=>projectWorld(...v));
    if (p.some(q=>q.depth<=.2)) return;
    ctx.beginPath(); ctx.moveTo(p[0].x,p[0].y);
    for (let i=1;i<p.length;i++) ctx.lineTo(p[i].x,p[i].y);
    ctx.closePath();
    ctx.fillStyle=fill; ctx.fill();
    if (stroke) { ctx.strokeStyle=stroke; ctx.lineWidth=width; ctx.stroke(); }
  }

  function drawTexturedTriangle(texture,p0,p1,p2,uv0=UV[0],uv1=UV[1],uv2=UV[2],shade=0) {
    const sw=texture.width, sh=texture.height;
    const u0=uv0[0]*sw,v0=uv0[1]*sh,u1=uv1[0]*sw,v1=uv1[1]*sh,u2=uv2[0]*sw,v2=uv2[1]*sh;
    const den=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1);
    if (Math.abs(den)<.0001) return;
    const a=(p0.x*(v1-v2)+p1.x*(v2-v0)+p2.x*(v0-v1))/den;
    const c=(p0.x*(u2-u1)+p1.x*(u0-u2)+p2.x*(u1-u0))/den;
    const e=(p0.x*(u1*v2-u2*v1)+p1.x*(u2*v0-u0*v2)+p2.x*(u0*v1-u1*v0))/den;
    const b=(p0.y*(v1-v2)+p1.y*(v2-v0)+p2.y*(v0-v1))/den;
    const d=(p0.y*(u2-u1)+p1.y*(u0-u2)+p2.y*(u1-u0))/den;
    const f=(p0.y*(u1*v2-u2*v1)+p1.y*(u2*v0-u0*v2)+p2.y*(u0*v1-u1*v0))/den;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.closePath();ctx.clip();
    ctx.transform(a,b,c,d,e,f); ctx.drawImage(texture,0,0); ctx.restore();
    if (shade>0) {
      ctx.fillStyle=`rgba(0,0,0,${shade})`;
      ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.closePath();ctx.fill();
    }
    ctx.strokeStyle='rgba(235,245,255,.12)'; ctx.lineWidth=.7;
    ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.closePath();ctx.stroke();
  }

  function drawMesh(model,obj,scale,texture) {
    const pts=model.vertices.map(v=>projectWorld(obj.x+v[0]*scale,obj.y+v[1]*scale,obj.z+v[2]*scale));
    const faces=model.faces
      .map(face=>({face,depth:face.v.reduce((sum,i)=>sum+pts[i].depth,0)/3}))
      .filter(item=>item.face.v.every(i=>pts[i].depth>.25))
      .sort((a,b)=>b.depth-a.depth);
    for (const item of faces) {
      const [a,b,c]=item.face.v;
      drawTexturedTriangle(texture,pts[a],pts[b],pts[c],UV[0],UV[1],UV[2],item.face.s||0);
    }
  }

  function drawCapitalShip() {
    const scroll=(state?.elapsed||0)*5.2%24;
    const z0=13-scroll;

    // Main armored deck: huge carrier hull extending far into the horizon.
    drawWorldPolygon([[-12,7.45,z0], [12,7.45,z0], [10.2,7.35,98], [-10.2,7.35,98]], '#202833', '#4e5d6e', 1);
    drawWorldPolygon([[-12,7.45,z0],[-10.2,7.35,98],[-8.6,5.95,94],[-10.5,6.15,z0+2]], '#111820', '#3d4c5e', 1);
    drawWorldPolygon([[12,7.45,z0],[10.5,6.15,z0+2],[8.6,5.95,94],[10.2,7.35,98]], '#151d26', '#3d4c5e', 1);

    // Central illuminated trench / runway.
    drawWorldPolygon([[-1.05,7.28,z0+1],[1.05,7.28,z0+1],[.55,7.20,98],[-.55,7.20,98]], '#0b1118', '#607184', 1);
    for (let z=z0+5;z<100;z+=9) {
      drawWorldPolygon([[-.72,7.17,z],[-.32,7.17,z],[ -.24,7.15,z+2.8],[-.58,7.15,z+2.8]], '#8bd7ff');
      drawWorldPolygon([[.32,7.17,z],[.72,7.17,z],[ .58,7.15,z+2.8],[.24,7.15,z+2.8]], '#8bd7ff');
    }

    // Repeating armored deck panels create the scale of a capital ship.
    for (let z=z0;z<100;z+=12) {
      drawWorldPolygon([[-9.6,7.25,z+1],[-5.3,7.25,z+1],[-5.0,7.20,z+8],[-9.0,7.20,z+8]], '#2c3541', '#576474', .8);
      drawWorldPolygon([[5.3,7.25,z+1],[9.6,7.25,z+1],[9.0,7.20,z+8],[5.0,7.20,z+8]], '#29333e', '#576474', .8);
    }

    // Towers, gun housings and machinery along the shoulders of the hull.
    const towers=[
      [-6.6,6.2,29-scroll], [6.2,6.05,40-scroll], [-7.0,5.95,61-scroll], [6.8,6.10,76-scroll]
    ];
    for (const [x,y,z] of towers) {
      const zz=((z-10+96)%96)+10;
      drawWorldPolygon([[x-1.4,7.1,zz-1.5],[x+1.4,7.1,zz-1.5],[x+1.1,7.0,zz+3],[x-1.1,7.0,zz+3]], '#46515d','#738091',1);
      drawWorldPolygon([[x-1.0,y,zz],[x+1.0,y,zz],[x+.7,y,zz+2.6],[x-.7,y,zz+2.6]], '#596675','#8894a2',1);
      drawLine3D([x,y-.25,zz+1.0],[x,y-1.0,zz+4.5],'#9aa8b7',2);
    }

    // Long hull seams.
    for (const x of [-8,-4,4,8]) drawLine3D([x,7.23,z0],[x*.84,7.18,98],'rgba(115,135,155,.32)',1);
  }

  function render() {
    ctx.save();
    const shakeX=state?.shake?C.rand(-4,4)*state.shake:0;
    const shakeY=state?.shake?C.rand(-4,4)*state.shake:0;
    ctx.translate(shakeX,shakeY);
    ctx.fillStyle='#000'; ctx.fillRect(-8,-8,W+16,H+16);
    drawPlayfield(); drawHUD(); ctx.restore();
  }

  function drawPlayfield() {
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,PLAY_W,H); ctx.clip();
    if (!state) { drawIdleStars(); ctx.restore(); return; }

    for (const s of state.stars) {
      const p=projectWorld(s.x,s.y,s.z); if (p.depth<=.2) continue;
      const r=Math.max(.5,Math.min(2.2,14/p.depth));
      ctx.globalAlpha=s.b; ctx.fillStyle='#fff'; ctx.fillRect(p.x,p.y,r,r);
    }
    ctx.globalAlpha=1;

    drawCapitalShip();
    drawRetroGrid();

    for (const l of state.lasers) {
      const a=projectWorld(l.x,l.y,l.z),b=projectWorld(l.x,l.y,l.z+6);
      ctx.strokeStyle='#ff584f';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }

    [...state.enemies].sort((a,b)=>b.z-a.z).forEach(e=>drawMesh(
      e.kind==='dart'?dartModel:fighterModel,e,e.kind==='dart'?1.25:1.4,e.kind==='dart'?textures.dart:textures.fighter
    ));

    for (const p of state.particles) {
      const q=projectWorld(p.x,p.y,p.z);ctx.fillStyle=p.life>.3?'#fff':'#ff8a4c';ctx.fillRect(q.x,q.y,3,3);
    }
    drawPlayer();
    ctx.restore();
  }

  function drawIdleStars() {
    ctx.fillStyle='#fff';
    for (let i=0;i<80;i++) ctx.fillRect((i*83)%PLAY_W,(i*47)%H,1,1);
  }

  function drawRetroGrid() {
    for (let z=12;z<=88;z+=8) drawLine3D([-11,5.8,z],[11,5.8,z],'rgba(83,126,168,.12)',1);
    for (let x=-10;x<=10;x+=2) drawLine3D([x,5.8,10],[x,5.8,90],'rgba(83,126,168,.08)',1);
  }

  function drawPlayer() {
    drawMesh(playerModel,state.player,1.18,textures.player);
    const leftA=projectWorld(state.player.x-.68,state.player.y+.12,state.player.z-1.65);
    const leftB=projectWorld(state.player.x-.68,state.player.y+.22,state.player.z-3.7);
    const rightA=projectWorld(state.player.x+.68,state.player.y+.12,state.player.z-1.65);
    const rightB=projectWorld(state.player.x+.68,state.player.y+.22,state.player.z-3.7);
    ctx.strokeStyle='#ff884d';ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(leftA.x,leftA.y);ctx.lineTo(leftB.x,leftB.y);ctx.moveTo(rightA.x,rightA.y);ctx.lineTo(rightB.x,rightB.y);ctx.stroke();
  }

  function drawHUD() {
    ctx.fillStyle='#05070a';ctx.fillRect(HUD_X,0,W-HUD_X,H);
    ctx.strokeStyle='#c4c9d0';ctx.lineWidth=2;ctx.strokeRect(HUD_X+10,10,W-HUD_X-20,H-20);
    ctx.fillStyle='#e9edf3';ctx.textAlign='center';ctx.font='bold 18px monospace';ctx.fillText('SCORE',860,42);
    ctx.font='bold 26px monospace';ctx.fillStyle='#ff5555';ctx.fillText(String(state?.score||0).padStart(7,'0'),860,70);
    box(785,94,150,72);ctx.fillStyle='#fff';ctx.font='bold 18px monospace';ctx.fillText('WEAPON',860,120);ctx.font='bold 30px monospace';ctx.fillText('L',860,153);
    box(785,182,150,170);ctx.font='bold 16px monospace';ctx.fillText('SHIP STATUS',860,208);drawHudShip(860,270);ctx.fillStyle='#ff5555';ctx.fillText(`LIFE ${state?.lives??3}`,860,330);
    box(785,370,150,96);ctx.fillStyle='#fff';ctx.font='bold 17px monospace';ctx.fillText('AREA',860,398);ctx.font='bold 34px monospace';ctx.fillStyle='#ff5555';ctx.fillText(String(state?.area||1).padStart(2,'0'),860,440);
    ctx.fillStyle='#8f99a8';ctx.font='12px monospace';ctx.fillText(`POLYGON STRIKE ${C.VERSION}`,860,604);ctx.fillText('METALLIC POLYGON',860,622);
  }

  function box(x,y,w,h) { ctx.strokeStyle='#6a7483';ctx.strokeRect(x,y,w,h);ctx.strokeStyle='#28303b';ctx.strokeRect(x+4,y+4,w-8,h-8); }

  function drawHudShip(cx,cy) {
    ctx.fillStyle='#dfe6ef';ctx.beginPath();ctx.moveTo(cx,cy-40);ctx.lineTo(cx-12,cy-2);ctx.lineTo(cx-50,cy+29);ctx.lineTo(cx-18,cy+22);ctx.lineTo(cx,cy+34);ctx.lineTo(cx+18,cy+22);ctx.lineTo(cx+50,cy+29);ctx.lineTo(cx+12,cy-2);ctx.closePath();ctx.fill();
    ctx.fillStyle='#65758b';ctx.fillRect(cx-5,cy-8,10,28);ctx.fillStyle='#b42d34';ctx.fillRect(cx-3,cy-20,6,10);
  }

  let last=performance.now();
  function frame(now) { const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);render();requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
})();
