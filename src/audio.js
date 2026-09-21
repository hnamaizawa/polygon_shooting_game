(() => {
  'use strict';

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, bgmBus = null, sfxBus = null, bgmTimer = null, step = 0;
  let muted = false, bgmEnabled = true;
  const MASTER_GAIN = 0.68, BGM_GAIN = 0.34, SFX_GAIN = 0.50;

  const melody = [69,72,76,81,79,76,72,74,76,79,83,79,76,74,72,69,69,72,76,81,84,81,79,76,74,76,79,83,81,79,76,72];
  const harmony = [64,64,67,67,65,65,67,67,64,64,67,67,65,65,64,64,64,64,67,67,69,69,67,67,65,65,67,67,64,64,62,64];
  const bass = [45,45,45,45,41,41,43,43,45,45,45,45,41,41,40,40,45,45,45,45,48,48,43,43,41,41,43,43,40,40,45,45];

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function ensure() {
    if (!AudioCtx) return false;
    if (!ctx) {
      ctx = new AudioCtx();
      master = ctx.createGain(); bgmBus = ctx.createGain(); sfxBus = ctx.createGain();
      master.gain.value = MASTER_GAIN; bgmBus.gain.value = bgmEnabled ? BGM_GAIN : 0; sfxBus.gain.value = SFX_GAIN;
      bgmBus.connect(master); sfxBus.connect(master); master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }
  function tone(freq,duration,type='square',gain=.08,when=0,bus=sfxBus,endFreq=null){
    if(!ensure())return;const t=ctx.currentTime+when,osc=ctx.createOscillator(),amp=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(Math.max(20,freq),t);if(endFreq)osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+duration);amp.gain.setValueAtTime(.0001,t);amp.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+.008);amp.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(amp);amp.connect(bus||sfxBus);osc.start(t);osc.stop(t+duration+.02);
  }
  function noise(duration=.18,gain=.12,cutoff=900){
    if(!ensure())return;const length=Math.max(1,Math.floor(ctx.sampleRate*duration)),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++)data[i]=Math.random()*2-1;const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),amp=ctx.createGain();filter.type='lowpass';filter.frequency.value=cutoff;amp.gain.setValueAtTime(gain,ctx.currentTime);amp.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);src.buffer=buffer;src.connect(filter);filter.connect(amp);amp.connect(sfxBus);src.start();src.stop(ctx.currentTime+duration+.02);
  }
  function scheduleBgmStep(){if(!ctx)return;const i=step%melody.length,m=melody[i],h=harmony[i],b=bass[i];tone(midi(m),.14,'square',.060,.005,bgmBus);if(i%2===0)tone(midi(h),.16,'triangle',.030,.018,bgmBus);if(i%2===0)tone(midi(b),.27,'triangle',.065,.005,bgmBus);if(i%4===3)tone(midi(m+12),.07,'square',.024,.075,bgmBus);step=(step+1)%melody.length;}
  function startBgm(){if(!ensure()||bgmTimer)return;scheduleBgmStep();bgmTimer=setInterval(scheduleBgmStep,145);}
  function start(){if(!ensure())return false;startBgm();playStart();return true;}
  function playStart(){if(!ensure())return;tone(440,.08,'square',.05,0,sfxBus);tone(660,.08,'square',.05,.09,sfxBus);tone(880,.14,'square',.055,.18,sfxBus);}
  function playLaser(){if(ensure())tone(1250,.07,'square',.065,0,sfxBus,420);}
  function playEnemyLaser(){if(ensure())tone(620,.08,'sawtooth',.036,0,sfxBus,310);}
  function playExplosion(){if(ensure()){noise(.20,.15,750);tone(190,.20,'sawtooth',.065,0,sfxBus,55);}}
  function playHit(){if(ensure()){tone(120,.16,'square',.11,0,sfxBus,65);noise(.12,.09,520);}}
  function playArmorPing(){if(ensure()){tone(1760,.055,'square',.045,0,sfxBus,1180);tone(2380,.045,'sine',.025,.025,sfxBus,1650);}}
  function playBoss(){if(!ensure())return;[220,277,330,415].forEach((f,i)=>tone(f,.18,'sawtooth',.045,i*.11,sfxBus));}
  function playStageClear(){if(!ensure())return;[523,659,784,1047].forEach((f,i)=>tone(f,.16,'square',.05,i*.11,sfxBus));}
  function playGameOver(){if(ensure())[330,247,196,147].forEach((f,i)=>tone(f,.22,'square',.07,i*.16,sfxBus,f*.82));}

  function toggleMute(){if(!ensure())return false;muted=!muted;master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setValueAtTime(muted?0:MASTER_GAIN,ctx.currentTime);return muted;}
  function toggleBgm(){
    bgmEnabled=!bgmEnabled;
    if(ensure()){bgmBus.gain.cancelScheduledValues(ctx.currentTime);bgmBus.gain.setValueAtTime(bgmEnabled?BGM_GAIN:0,ctx.currentTime);}
    return bgmEnabled;
  }
  function setBgmEnabled(enabled){bgmEnabled=!!enabled;if(ensure())bgmBus.gain.setValueAtTime(bgmEnabled?BGM_GAIN:0,ctx.currentTime);return bgmEnabled;}
  function isMuted(){return muted;} function isBgmEnabled(){return bgmEnabled;} function supported(){return !!AudioCtx;}

  window.PolygonStrikeAudio={start,playLaser,playEnemyLaser,playExplosion,playHit,playArmorPing,playBoss,playStageClear,playGameOver,toggleMute,toggleBgm,setBgmEnabled,isMuted,isBgmEnabled,supported};
})();
