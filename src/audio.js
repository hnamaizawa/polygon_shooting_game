(() => {
  'use strict';

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let master = null;
  let bgmBus = null;
  let sfxBus = null;
  let bgmTimer = null;
  let step = 0;
  let muted = false;

  const melody = [69,72,76,72,67,71,74,71,65,69,72,69,67,71,76,74];
  const bass = [45,45,43,43,41,41,43,43,38,38,41,41,43,43,40,40];

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  function ensure() {
    if (!AudioCtx) return false;
    if (!ctx) {
      ctx = new AudioCtx();
      master = ctx.createGain();
      bgmBus = ctx.createGain();
      sfxBus = ctx.createGain();
      master.gain.value = 0.58;
      bgmBus.gain.value = 0.22;
      sfxBus.gain.value = 0.52;
      bgmBus.connect(master);
      sfxBus.connect(master);
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function tone(freq, duration, type='square', gain=.08, when=0, bus=sfxBus, endFreq=null) {
    if (!ensure()) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + duration);
    amp.gain.setValueAtTime(.0001, t);
    amp.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), t + .008);
    amp.gain.exponentialRampToValueAtTime(.0001, t + duration);
    osc.connect(amp);
    amp.connect(bus || sfxBus);
    osc.start(t);
    osc.stop(t + duration + .02);
  }

  function noise(duration=.18, gain=.12, cutoff=900) {
    if (!ensure()) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i=0;i<length;i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + duration);
    src.buffer = buffer;
    src.connect(filter); filter.connect(amp); amp.connect(sfxBus);
    src.start(); src.stop(ctx.currentTime + duration + .02);
  }

  function scheduleBgmStep() {
    if (!ctx) return;
    const m = melody[step % melody.length];
    const b = bass[step % bass.length];
    tone(midi(m), .13, 'square', .045, .01, bgmBus);
    if (step % 2 === 0) tone(midi(b), .24, 'triangle', .055, .01, bgmBus);
    if (step % 4 === 2) tone(midi(m - 12), .08, 'square', .022, .07, bgmBus);
    step = (step + 1) % melody.length;
  }

  function startBgm() {
    if (!ensure() || bgmTimer) return;
    scheduleBgmStep();
    bgmTimer = setInterval(scheduleBgmStep, 150);
  }

  function start() {
    if (!ensure()) return false;
    startBgm();
    playStart();
    return true;
  }

  function playStart() {
    if (!ensure()) return;
    tone(440,.08,'square',.05,0,sfxBus);
    tone(660,.08,'square',.05,.09,sfxBus);
    tone(880,.14,'square',.055,.18,sfxBus);
  }

  function playLaser() {
    if (!ensure()) return;
    tone(1250,.07,'square',.065,0,sfxBus,420);
  }

  function playExplosion() {
    if (!ensure()) return;
    noise(.20,.15,750);
    tone(190,.20,'sawtooth',.065,0,sfxBus,55);
  }

  function playHit() {
    if (!ensure()) return;
    tone(120,.16,'square',.11,0,sfxBus,65);
    noise(.12,.09,520);
  }

  function playGameOver() {
    if (!ensure()) return;
    [330,247,196,147].forEach((f,i)=>tone(f,.22,'square',.07,i*.16,sfxBus,f*.82));
  }

  function toggleMute() {
    if (!ensure()) return false;
    muted = !muted;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(muted ? 0 : .58, ctx.currentTime);
    return muted;
  }

  function isMuted() { return muted; }
  function supported() { return !!AudioCtx; }

  window.PolygonStrikeAudio = {
    start, playLaser, playExplosion, playHit, playGameOver,
    toggleMute, isMuted, supported
  };
})();
