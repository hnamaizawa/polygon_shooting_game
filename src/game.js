(() => {
  'use strict';

  const C = window.PolygonStrikeCore;
  const A = window.PolygonStrikeAudio || {
    start(){}, playLaser(){}, playExplosion(){}, playHit(){}, playGameOver(){},
    toggleMute(){ return false; }, isMuted(){ return false; }, supported(){ return false; }
  };
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const startPanel = document.getElementById('startPanel');
  const startButton = document.getElementById('startButton');
  const W = canvas.width, H = canvas.height;
  const PLAY_W = 742, HUD_X = 760;
  const viewport = { cx: PLAY_W / 2, cy: H * 0.75 };
  const CAMERA_PITCH = C.CONFIG.cameraPitchDeg * Math.PI / 180;
  const keys = new Set();
  ctx.imageSmoothingEnabled = true;

  function makeGlossMetalTexture(base, accent, dark, cool='#edf7ff') {
    const tex = document.createElement('canvas');
    tex.width = tex.height = 96;
    const g = tex.getContext('2d');
    g.imageSmoothingEnabled = true;

    const baseGrad = g.createLinearGradient(0, 0, 96, 96);
    baseGrad.addColorStop(0, '#111820');
    baseGrad.addColorStop(.14, dark);
    baseGrad.addColorStop(.33, base);
    baseGrad.addColorStop(.46, '#f7fbff');
    baseGrad.addColorStop(.53, cool);
    baseGrad.addColorStop(.60, base);
    baseGrad.addColorStop(.78, '#5c6977');
    baseGrad.addColorStop(1, dark);
    g.fillStyle = baseGrad;
    g.fillRect(0,0,96,96);

    const shine = g.createLinearGradient(0,0,96,0);
    shine.addColorStop(0,'rgba(255,255,255,0)');
    shine.addColorStop(.33,'rgba(255,255,255,.08)');
    shine.addColorStop(.47,'rgba(255,255,255,.68)');
    shine.addColorStop(.53,'rgba(255,255,255,.92)');
    shine.addColorStop(.62,'rgba(255,255,255,.10)');
    shine.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle = shine;
    g.fillRect(0,0,96,96);

    g.strokeStyle='rgba(8,12,17,.72)';
    g.lineWidth=2;
    for(let y=0;y<=96;y+=24){g.beginPath();g.moveTo(0,y);g.lineTo(96,y);g.stroke();}
    for(let x=0;x<=96;x+=24){g.beginPath();g.moveTo(x,0);g.lineTo(x,96);g.stroke();}

    g.strokeStyle='rgba(255,255,255,.28)';
    g.lineWidth=1;
    for(let y=2;y<96;y+=24){g.beginPath();g.moveTo(2,y);g.lineTo(94,y);g.stroke();}

    g.fillStyle=accent;
    g.fillRect(8,10,33,5);
    g.fillRect(50,31,35,4);
    g.fillRect(14,61,68,4);
    g.fillRect(42,73,12,16);

    g.fillStyle='rgba(255,255,255,.65)';
    for(let i=0;i<34;i++){
      const x=(i*29+7)%92, y=(i*17+13)%92;
      g.fillRect(x,y,1+(i%3===0?2:1),1);
    }
    g.fillStyle='rgba(0,0,0,.22)';
    for(let i=0;i<18;i++){
      const x=(i*19+11)%90, y=(i*37+5)%90;
      g.fillRect(x,y,5,1);
    }
    return tex;
  }

  const textures={
    player:makeGlossMetalTexture('#768796','#c92b35','#202a34','#f5fbff'),
    fighter:makeGlossMetalTexture('#727b84','#e06a4f','#22272d','#fff2e8'),
    dart:makeGlossMetalTexture('#656d79','#bd68cf','#20242c','#f8efff'),
    carrier:makeGlossMetalTexture('#566473','#7aa7c4','#171e26','#ecf8ff')
  };
  const UV=[[.50,.02],[.02,.98],[.98,.98]];
  const QUV=[[0,0],[1,0],[1,1],[0,1]];

  const playerModel={
    vertices:[[0,-.22,3.65],[0,-.78,1.20],[0,.24,.85],[-.72,-.08,1.55],[-1.55,.02,.75],[-3,.16,-.55],[-1.45,.20,-1.60],[.72,-.08,1.55],[1.55,.02,.75],[3,.16,-.55],[1.45,.20,-1.60],[0,-.08,-2.15],[-.66,.17,-1.78],[.66,.17,-1.78],[-1.15,-.03,-1],[1.15,-.03,-1]],
    faces:[{v:[0,1,3],s:.01},{v:[0,7,1],s:.05},{v:[0,3,2],s:.08},{v:[0,2,7],s:.13},{v:[1,2,3],s:.03},{v:[1,7,2],s:.08},{v:[3,4,5],s:.11},{v:[3,5,6],s:.16},{v:[3,6,2],s:.19},{v:[7,2,10],s:.20},{v:[7,10,9],s:.13},{v:[7,9,8],s:.08},{v:[2,6,11],s:.21},{v:[2,11,10],s:.18},{v:[6,12,11],s:.24},{v:[11,13,10],s:.22},{v:[4,14,6],s:.17},{v:[8,10,15],s:.16}]
  };
  const fighterModel={
    vertices:[[0,-.12,2.05],[0,-.5,.28],[0,.22,.15],[-.85,.02,.62],[-1.85,.18,-.45],[-.68,.18,-1.15],[.85,.02,.62],[1.85,.18,-.45],[.68,.18,-1.15],[0,-.06,-1.35]],
    faces:[{v:[0,1,3],s:.04},{v:[0,6,1],s:.10},{v:[0,3,2],s:.13},{v:[0,2,6],s:.18},{v:[3,4,5],s:.20},{v:[3,5,2],s:.26},{v:[6,2,8],s:.27},{v:[6,8,7],s:.19},{v:[2,5,9],s:.31},{v:[2,9,8],s:.28}]
  };
  const dartModel={
    vertices:[[0,-.10,2.35],[0,-.44,.10],[0,.22,0],[-.75,.03,.38],[-1.20,.15,-.72],[-.42,.14,-1.40],[.75,.03,.38],[1.20,.15,-.72],[.42,.14,-1.40],[0,-.08,-1.65]],
    faces:[{v:[0,1,3],s:.03},{v:[0,6,1],s:.09},{v:[0,3,2],s:.13},{v:[0,2,6],s:.18},{v:[3,4,5],s:.23},{v:[3,5,2],s:.29},{v:[6,2,8],s:.27},{v:[6,8,7],s:.20},{v:[2,5,9],s:.33},{v:[2,9,8],s:.30}]
  };

  let state;

  function reset(){
    state={
      running:true,gameOver:false,score:0,area:1,lives:3,elapsed:0,spawnTimer:.4,spawnBase:1.05,enemyId:1,fireTimer:0,shake:0,
      player:{x:0,y:C.CONFIG.flightPlaneY,z:C.CONFIG.playerZ},
      enemies:[],lasers:[],particles:[],stars:Array.from({length:105},()=>makeStar(true))
    };
  }
  function makeStar(randomZ=false){return{x:C.rand(-23,23),y:C.rand(-16,16),z:randomZ?C.rand(7,110):110,speed:C.rand(13,28),b:C.rand(.28,.85)};}

  function start(){ reset(); startPanel.classList.add('hidden'); A.start(); }
  startButton.addEventListener('click',start);
  addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) e.preventDefault();
    if(e.code==='KeyM'&&!e.repeat){A.toggleMute();return;}
    keys.add(e.code);
    if(e.code==='Enter'&&(!state||!state.running)) start();
    if(e.code==='KeyR'&&state?.gameOver) start();
  });
  addEventListener('keyup',e=>keys.delete(e.code));

  function update(dt){
    if(!state?.running)return;
    state.elapsed+=dt;state.fireTimer-=dt;state.spawnTimer-=dt;state.shake=Math.max(0,state.shake-dt*10);

    state.player=C.movePlayer(state.player,{
      left:keys.has('ArrowLeft')||keys.has('KeyA'),
      right:keys.has('ArrowRight')||keys.has('KeyD'),
      forward:keys.has('ArrowUp')||keys.has('KeyW'),
      backward:keys.has('ArrowDown')||keys.has('KeyS')
    },dt);

    if((keys.has('Space')||keys.has('KeyJ'))&&state.fireTimer<=0){
      state.lasers.push(
        {x:state.player.x-.50,y:C.CONFIG.flightPlaneY-.15,z:state.player.z+2.15},
        {x:state.player.x+.50,y:C.CONFIG.flightPlaneY-.15,z:state.player.z+2.15}
      );
      state.fireTimer=C.CONFIG.fireCooldown;A.playLaser();
    }

    if(state.spawnTimer<=0){
      state.enemies.push(C.makeEnemy(state.enemyId++));
      state.spawnBase=Math.max(.48,1.05-state.elapsed/110);
      state.spawnTimer=C.nextEnemySpawn(state.spawnBase);
    }
    for(const s of state.stars){s.z-=s.speed*dt;if(s.z<3)Object.assign(s,makeStar(false));}
    for(const l of state.lasers)l.z+=C.CONFIG.laserSpeed*dt;
    state.lasers=state.lasers.filter(l=>l.z<110);

    for(const e of state.enemies){
      e.z-=e.speed*dt;
      e.x+=Math.sin(state.elapsed*1.9+e.phase)*dt*(e.kind==='dart'?1.5:.65);
      e.y=C.CONFIG.flightPlaneY;
      for(const l of state.lasers){
        if(e.alive&&C.spheresHit(e,l,1.15,2.8)){
          e.alive=false;l.z=999;state.score+=C.scoreForEnemy(e);burst(e.x,e.y,e.z);A.playExplosion();
        }
      }
      if(e.alive&&C.spheresHit(e,state.player,1.7,3.8)){
        e.alive=false;state.lives--;state.shake=1;burst(state.player.x,state.player.y,state.player.z+1,22);A.playHit();
        if(state.lives<=0)endGame();
      }
      if(e.alive&&e.z<C.CONFIG.enemyDespawnZ)e.alive=false;
    }
    state.enemies=state.enemies.filter(e=>e.alive);
    state.lasers=state.lasers.filter(l=>l.z<120);
    for(const p of state.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.life-=dt;}
    state.particles=state.particles.filter(p=>p.life>0&&p.z>1);
    state.area=1+Math.floor(state.elapsed/35);
  }

  function burst(x,y,z,n=12){for(let i=0;i<n;i++)state.particles.push({x,y,z,vx:C.rand(-5,5),vy:C.rand(-2.4,2.4),vz:C.rand(-8,8),life:C.rand(.25,.65)});}
  function endGame(){
    state.running=false;state.gameOver=true;A.playGameOver();
    startPanel.innerHTML=`<h1>GAME OVER</h1><p>SCORE ${String(state.score).padStart(7,'0')}</p><p>R / Enter で再出撃</p><button id="restartButton">RETRY</button>`;
    startPanel.classList.remove('hidden');
    document.getElementById('restartButton').addEventListener('click',start);
  }

  function projectWorld(x,y,z){return C.projectChase3D({x,y,z},viewport,C.CONFIG.cameraFocal,CAMERA_PITCH,C.CONFIG.cameraBackOffset);}
  function drawLine3D(a,b,stroke='#fff',width=1){
    const p1=projectWorld(...a),p2=projectWorld(...b);if(p1.depth<=.2||p2.depth<=.2)return;
    ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();
  }
  function drawWorldPolygon(points,fill,stroke=null,width=1){
    const p=points.map(v=>projectWorld(...v));if(p.some(q=>q.depth<=.2))return;
    ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
  }

  function drawTexturedTriangle(texture,p0,p1,p2,uv0=UV[0],uv1=UV[1],uv2=UV[2],shade=0,gloss=.35){
    const sw=texture.width,sh=texture.height,u0=uv0[0]*sw,v0=uv0[1]*sh,u1=uv1[0]*sw,v1=uv1[1]*sh,u2=uv2[0]*sw,v2=uv2[1]*sh;
    const den=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1);if(Math.abs(den)<.0001)return;
    const a=(p0.x*(v1-v2)+p1.x*(v2-v0)+p2.x*(v0-v1))/den,c=(p0.x*(u2-u1)+p1.x*(u0-u2)+p2.x*(u1-u0))/den,e=(p0.x*(u1*v2-u2*v1)+p1.x*(u2*v0-u0*v2)+p2.x*(u0*v1-u1*v0))/den;
    const b=(p0.y*(v1-v2)+p1.y*(v2-v0)+p2.y*(v0-v1))/den,d=(p0.y*(u2-u1)+p1.y*(u0-u2)+p2.y*(u1-u0))/den,f=(p0.y*(u1*v2-u2*v1)+p1.y*(u2*v0-u0*v2)+p2.y*(u0*v1-u1*v0))/den;

    ctx.save();
    ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.closePath();ctx.clip();
    ctx.transform(a,b,c,d,e,f);ctx.drawImage(texture,0,0);ctx.restore();

    if(shade>0){ctx.fillStyle=`rgba(0,0,0,${shade})`;ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.closePath();ctx.fill();}

    if(gloss>0){
      const sweep=((state?.elapsed||0)*120)%PLAY_W;
      const grad=ctx.createLinearGradient(sweep-90,0,sweep+90,0);
      grad.addColorStop(0,'rgba(255,255,255,0)');
      grad.addColorStop(.46,'rgba(255,255,255,0)');
      grad.addColorStop(.50,`rgba(255,255,255,${gloss})`);
      grad.addColorStop(.56,'rgba(255,255,255,.05)');
      grad.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=grad;
      ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.closePath();ctx.fill();
    }

    ctx.strokeStyle='rgba(245,250,255,.24)';ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.closePath();ctx.stroke();
  }

  function drawMesh(model,obj,scale,texture){
    const pts=model.vertices.map(v=>projectWorld(obj.x+v[0]*scale,obj.y+v[1]*scale,obj.z+v[2]*scale));
    const faces=model.faces.map(face=>({face,depth:face.v.reduce((sum,i)=>sum+pts[i].depth,0)/3}))
      .filter(item=>item.face.v.every(i=>pts[i].depth>.25)).sort((a,b)=>b.depth-a.depth);
    for(const item of faces){const[a,b,c]=item.face.v;drawTexturedTriangle(texture,pts[a],pts[b],pts[c],UV[0],UV[1],UV[2],item.face.s||0,.42);}
  }

  function drawWorldTexturedQuad(points,texture,shade=.08,gloss=.26){
    const p=points.map(v=>projectWorld(...v));
    if(p.some(q=>q.depth<=.2))return;
    drawTexturedTriangle(texture,p[0],p[1],p[2],QUV[0],QUV[1],QUV[2],shade,gloss);
    drawTexturedTriangle(texture,p[0],p[2],p[3],QUV[0],QUV[2],QUV[3],shade,gloss);
  }

  function drawCapitalShip(){
    const scroll=(state?.elapsed||0)*5.2%24,z0=13-scroll;

    drawWorldTexturedQuad([[-12,7.45,z0],[12,7.45,z0],[10.2,7.35,110],[-10.2,7.35,110]],textures.carrier,.12,.28);
    drawWorldTexturedQuad([[-12,7.45,z0],[-10.2,7.35,110],[-8.6,5.95,106],[-10.5,6.15,z0+2]],textures.carrier,.26,.18);
    drawWorldTexturedQuad([[12,7.45,z0],[10.5,6.15,z0+2],[8.6,5.95,106],[10.2,7.35,110]],textures.carrier,.22,.18);

    drawWorldPolygon([[-1.05,7.28,z0+1],[1.05,7.28,z0+1],[.55,7.20,110],[-.55,7.20,110]],'#071018','#7a95aa',1);
    for(let z=z0+5;z<112;z+=9){
      drawWorldPolygon([[-.72,7.17,z],[-.32,7.17,z],[-.24,7.15,z+2.8],[-.58,7.15,z+2.8]],'#b6e8ff');
      drawWorldPolygon([[.32,7.17,z],[.72,7.17,z],[.58,7.15,z+2.8],[.24,7.15,z+2.8]],'#b6e8ff');
    }

    for(let z=z0;z<112;z+=12){
      drawWorldTexturedQuad([[-9.6,7.25,z+1],[-5.3,7.25,z+1],[-5.0,7.20,z+8],[-9.0,7.20,z+8]],textures.carrier,.10,.34);
      drawWorldTexturedQuad([[5.3,7.25,z+1],[9.6,7.25,z+1],[9.0,7.20,z+8],[5.0,7.20,z+8]],textures.carrier,.13,.34);
    }

    const towers=[[-6.6,6.2,29-scroll],[6.2,6.05,40-scroll],[-7.0,5.95,61-scroll],[6.8,6.10,76-scroll]];
    for(const[x,y,z]of towers){
      const zz=((z-10+108)%108)+10;
      drawWorldTexturedQuad([[x-1.4,7.1,zz-1.5],[x+1.4,7.1,zz-1.5],[x+1.1,7.0,zz+3],[x-1.1,7.0,zz+3]],textures.carrier,.07,.38);
      drawWorldTexturedQuad([[x-1,y,zz],[x+1,y,zz],[x+.7,y,zz+2.6],[x-.7,y,zz+2.6]],textures.carrier,.04,.44);
      drawLine3D([x,y-.25,zz+1],[x,y-1,zz+4.5],'#d7e9f7',2);
    }
    for(const x of[-8,-4,4,8])drawLine3D([x,7.23,z0],[x*.84,7.18,110],'rgba(195,220,240,.36)',1);
  }

  function render(){
    ctx.save();
    const shakeX=state?.shake?C.rand(-4,4)*state.shake:0,shakeY=state?.shake?C.rand(-4,4)*state.shake:0;
    ctx.translate(shakeX,shakeY);ctx.fillStyle='#000';ctx.fillRect(-8,-8,W+16,H+16);drawPlayfield();drawHUD();ctx.restore();
  }

  function drawPlayfield(){
    ctx.save();ctx.beginPath();ctx.rect(0,0,PLAY_W,H);ctx.clip();
    if(!state){drawIdleStars();ctx.restore();return;}

    for(const s of state.stars){
      const p=projectWorld(s.x,s.y,s.z);if(p.depth<=.2)continue;
      const r=Math.max(.5,Math.min(2.2,14/p.depth));ctx.globalAlpha=s.b;ctx.fillStyle='#fff';ctx.fillRect(p.x,p.y,r,r);
    }
    ctx.globalAlpha=1;

    drawCapitalShip();
    drawRetroGrid();

    for(const l of state.lasers){
      const a=projectWorld(l.x,l.y,l.z),b=projectWorld(l.x,l.y,l.z+6);
      ctx.strokeStyle='#ff665d';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }

    [...state.enemies].sort((a,b)=>b.z-a.z).forEach(e=>
      drawMesh(e.kind==='dart'?dartModel:fighterModel,e,e.kind==='dart'?1.25:1.4,e.kind==='dart'?textures.dart:textures.fighter)
    );

    for(const p of state.particles){const q=projectWorld(p.x,p.y,p.z);ctx.fillStyle=p.life>.3?'#fff':'#ff9a60';ctx.fillRect(q.x,q.y,3,3);}
    drawPlayer();
    ctx.restore();
  }

  function drawIdleStars(){ctx.fillStyle='#fff';for(let i=0;i<80;i++)ctx.fillRect((i*83)%PLAY_W,(i*47)%H,1,1);}
  function drawRetroGrid(){
    const y=C.CONFIG.flightPlaneY+2.55;
    for(let z=12;z<=104;z+=8)drawLine3D([-11,y,z],[11,y,z],'rgba(115,160,200,.11)',1);
    for(let x=-10;x<=10;x+=2)drawLine3D([x,y,10],[x,y,106],'rgba(115,160,200,.07)',1);
  }

  function drawPlayer(){
    drawMesh(playerModel,state.player,1.18,textures.player);
    const la=projectWorld(state.player.x-.68,state.player.y+.12,state.player.z-1.65),
      lb=projectWorld(state.player.x-.68,state.player.y+.22,state.player.z-3.7),
      ra=projectWorld(state.player.x+.68,state.player.y+.12,state.player.z-1.65),
      rb=projectWorld(state.player.x+.68,state.player.y+.22,state.player.z-3.7);
    ctx.strokeStyle='#ff9c55';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(la.x,la.y);ctx.lineTo(lb.x,lb.y);ctx.moveTo(ra.x,ra.y);ctx.lineTo(rb.x,rb.y);ctx.stroke();
  }

  function drawHUD(){
    ctx.fillStyle='#05070a';ctx.fillRect(HUD_X,0,W-HUD_X,H);
    ctx.strokeStyle='#c4c9d0';ctx.lineWidth=2;ctx.strokeRect(HUD_X+10,10,W-HUD_X-20,H-20);
    ctx.fillStyle='#e9edf3';ctx.textAlign='center';ctx.font='bold 18px monospace';ctx.fillText('SCORE',860,42);
    ctx.font='bold 26px monospace';ctx.fillStyle='#ff5555';ctx.fillText(String(state?.score||0).padStart(7,'0'),860,70);
    box(785,94,150,72);ctx.fillStyle='#fff';ctx.font='bold 18px monospace';ctx.fillText('WEAPON',860,120);ctx.font='bold 30px monospace';ctx.fillText('L',860,153);
    box(785,182,150,170);ctx.font='bold 16px monospace';ctx.fillText('SHIP STATUS',860,208);drawHudShip(860,270);ctx.fillStyle='#ff5555';ctx.fillText(`LIFE ${state?.lives??3}`,860,330);
    box(785,370,150,96);ctx.fillStyle='#fff';ctx.font='bold 17px monospace';ctx.fillText('AREA',860,398);ctx.font='bold 34px monospace';ctx.fillStyle='#ff5555';ctx.fillText(String(state?.area||1).padStart(2,'0'),860,440);
    box(785,484,150,64);ctx.fillStyle='#fff';ctx.font='bold 14px monospace';ctx.fillText('THRUST',860,508);ctx.font='bold 18px monospace';ctx.fillStyle='#8bd7ff';ctx.fillText(`Z ${Math.round(state?.player?.z??C.CONFIG.playerZ).toString().padStart(2,'0')}`,860,535);
    ctx.fillStyle='#8f99a8';ctx.font='12px monospace';ctx.fillText(`POLYGON STRIKE ${C.VERSION}`,860,586);ctx.fillText(A.supported()?`SOUND ${A.isMuted()?'OFF':'ON'} [M]`:'SOUND N/A',860,604);ctx.fillText('GLOSS METAL',860,622);
  }

  function box(x,y,w,h){ctx.strokeStyle='#6a7483';ctx.strokeRect(x,y,w,h);ctx.strokeStyle='#28303b';ctx.strokeRect(x+4,y+4,w-8,h-8);}
  function drawHudShip(cx,cy){
    const grad=ctx.createLinearGradient(cx-45,cy-35,cx+45,cy+35);
    grad.addColorStop(0,'#5e6d7d');grad.addColorStop(.48,'#ffffff');grad.addColorStop(.60,'#9cabb9');grad.addColorStop(1,'#455361');
    ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(cx,cy-40);ctx.lineTo(cx-12,cy-2);ctx.lineTo(cx-50,cy+29);ctx.lineTo(cx-18,cy+22);ctx.lineTo(cx,cy+34);ctx.lineTo(cx+18,cy+22);ctx.lineTo(cx+50,cy+29);ctx.lineTo(cx+12,cy-2);ctx.closePath();ctx.fill();
    ctx.fillStyle='#65758b';ctx.fillRect(cx-5,cy-8,10,28);ctx.fillStyle='#b42d34';ctx.fillRect(cx-3,cy-20,6,10);
  }

  let last=performance.now();
  function frame(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);render();requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
})();
