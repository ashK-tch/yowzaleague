/* Yowza Bowl: the sound desk. Real recordings (see games/sounds/CREDITS.md), loaded the first time a button in the game
   is pressed and played through Web Audio so they can be pitched, layered and looped. If a file is missing or the
   browser can't play it, that sound is simply skipped. */
(function (root) {
  "use strict";
  if (typeof document === "undefined") return;
  const YB = root.YB;
  const NAMES = ("roll release crash strike machine ambience cheer applause gasp trombone whistle ding meow beeps knock1 knock2 knock3 knock4 knock5 knock6 " +
    "v_ready v_begin v_final v_flawless v_combo v_breaker v_winner v_loser v_youwin v_youlose v_tie v_gameover v_time v_choose v_sudden v_prepare v_highscore v_congrats v_hurry v_levelup " +
    "j_sax_strike j_sax_spare j_sax_double j_sax_gutter j_sax_split j_brass_strike j_brass_spare j_brass_double j_brass_gutter j_brass_split j_nes_strike j_nes_spare j_nes_double j_nes_gutter j_nes_split " +
    "j_win j_win2 j_lose j_shop j_buy j_turn click select confirm error open close pluck drop bong switch tick question maximize coins chips step1 step2 step3 thud plank zap tone powerup phaser laser").split(" ");
  let ac = null, master = null, on = true, base = "sounds/", started = false, lastVoice = 0;
  const buf = {}, waiting = [];

  function wake() {
    if (!on) return null;
    try {
      if (!ac) {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = 0.9;
        const squash = ac.createDynamicsCompressor();      // keeps a strike plus a crowd plus a jingle from clipping
        master.connect(squash); squash.connect(ac.destination);
      }
      if (ac.state === "suspended") ac.resume();
    } catch (e) { ac = null; }
    if (ac && !started) {
      started = true;
      NAMES.forEach(n => {
        fetch(base + n + (n === "roll" ? ".wav" : ".mp3")).then(r => (r.ok ? r.arrayBuffer() : Promise.reject())).then(data => new Promise((ok, no) => ac.decodeAudioData(data, ok, no)))
          .then(b => { buf[n] = b; for (let i = waiting.length - 1; i >= 0; i--) if (waiting[i].n === n) waiting.splice(i, 1)[0].go(); }).catch(() => {});
      });
    }
    return ac;
  }
  // o: vol (0..1), rate, vary (random pitch spread), delay (seconds), wobble (alien voice)
  function play(name, o) {
    o = o || {};
    const a = wake();
    if (!a || !buf[name]) return null;
    const src = a.createBufferSource(), g = a.createGain(), at = a.currentTime + (o.delay || 0);
    src.buffer = buf[name];
    const rate = (o.rate || 1) * (1 + (Math.random() - 0.5) * (o.vary || 0));
    src.playbackRate.value = rate;
    if (o.wobble) { const d = buf[name].duration / rate; for (let t = 0; t < d; t += 0.06) src.playbackRate.setValueAtTime(rate * (1 + Math.sin(t * 38) * o.wobble), at + t); }
    g.gain.value = o.vol == null ? 1 : o.vol;
    src.connect(g); g.connect(master);
    src.start(at);
    return src;
  }
  function loop(name, o) {
    o = o || {};
    const a = wake();
    let src = null, g = null, dead = false;
    const go = () => {
      if (dead || !ac || !buf[name]) return;
      src = ac.createBufferSource(); g = ac.createGain();
      src.buffer = buf[name]; src.loop = true;
      if (name !== "roll") { src.loopStart = 0.08; src.loopEnd = buf[name].duration - 0.08; }      // skip the mp3 padding
      src.playbackRate.value = o.rate || 1;
      g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol == null ? 1 : o.vol), ac.currentTime + (o.fade || 0.08));
      src.connect(g); g.connect(master); src.start();
    };
    if (a && buf[name]) go(); else if (a) waiting.push({ n: name, go });
    return {
      set(vol, rate) { if (!src) return; if (vol != null) g.gain.setTargetAtTime(Math.max(0.0001, vol), ac.currentTime, 0.05); if (rate != null) src.playbackRate.setTargetAtTime(rate, ac.currentTime, 0.05); },
      stop(fade) { dead = true; if (!src) return; const s = src, t = ac.currentTime; src = null; try { g.gain.setTargetAtTime(0.0001, t, (fade || 0.12) / 3); s.stop(t + (fade || 0.12) + 0.05); } catch (e) { /* already stopped */ } }
    };
  }
  // Glorbo calls the game: a stock announcer pitched up and wobbled into an excitable alien.
  function voice(name, o) {
    const now = Date.now();
    if (now - lastVoice < 900 && !(o && o.force)) return null;
    lastVoice = now;
    return play("v_" + name, Object.assign({ rate: 1.32, wobble: 0.035, vol: 0.9 }, o));
  }
  // a pile of pins: real single-pin knocks, each a little different in pitch, loudness and timing
  function pins(count, hard) {
    for (let i = 0; i < Math.min(count, 6); i++) play("knock" + (1 + Math.floor(Math.random() * 6)), { vol: 0.35 + Math.random() * 0.4 + (hard ? 0.15 : 0), rate: 0.8 + Math.random() * 0.5, delay: i * (0.02 + Math.random() * 0.05) });
  }
  YB.sound = {
    play, loop, voice, pins, wake,
    setBase(b) { base = b; },
    setOn(v) { on = !!v; if (master) master.gain.value = on ? 0.9 : 0; },
    isOn: () => on
  };
})(typeof window !== "undefined" ? window : globalThis);
