/* Yowza Bowl, part 4 of 4: the game window. The lobby (waiting and playing lists, who's here, chat), the dressing room
   and pro shop, the Hall of Fame, and the match itself: local games against the computer or friends on one device,
   and online games where each player's throws are replayed on everyone else's screen. */
(function (root) {
  "use strict";
  if (typeof document === "undefined") return;
  const YB = root.YB, A = YB.art;

  const CSS = `
.yb { --ink: #1b2338; --navy: #17324d; --cream: #fbf6e6; --sand: #efe6cc; --gold: #ffc93c; --hot: #ff3d5a; --teal: #1f9e9a;
  font: 500 15px/1.35 Fredoka, "Trebuchet MS", Verdana, sans-serif; color: var(--ink); background: var(--navy);
  background-image: repeating-linear-gradient(135deg, rgba(255,255,255,0.045) 0 14px, transparent 14px 28px);
  border: 3px solid var(--ink); border-radius: 16px; padding: 12px; display: grid; gap: 12px; image-rendering: auto; }
.yb * { box-sizing: border-box; }
.yb [hidden] { display: none !important; }
.yb h3, .yb h4, .yb p { margin: 0; }
.yb-title { font: 400 30px/1 "Luckiest Guy", Impact, sans-serif; color: var(--gold); letter-spacing: 0.03em; text-shadow: 3px 3px 0 var(--ink), -1px -1px 0 var(--ink), 1px -1px 0 var(--ink), -1px 1px 0 var(--ink); }
.yb-title small { display: block; font: 600 12px Fredoka, sans-serif; color: #cfe3f5; text-shadow: none; letter-spacing: 0.02em; margin-top: 4px; }
.yb-top { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; justify-content: space-between; }
.yb-nav { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.yb-b { font: 600 14px Fredoka, sans-serif; color: var(--ink); background: var(--gold); border: 3px solid var(--ink); border-radius: 12px; padding: 7px 14px; min-height: 40px;
  box-shadow: 0 4px 0 var(--ink); cursor: pointer; touch-action: manipulation; -webkit-user-select: none; user-select: none; }
.yb-b:active:not(:disabled), .yb-b[aria-pressed="true"] { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
.yb-b[aria-pressed="true"] { background: #fff; }
.yb-b:disabled { background: #b9bdc7; color: #5c6272; cursor: default; }
.yb-b.alt { background: #fff; } .yb-b.hot { background: var(--hot); color: #fff; } .yb-b.teal { background: var(--teal); color: #fff; }
.yb-b.sm { min-height: 32px; padding: 3px 10px; font-size: 13px; border-radius: 10px; box-shadow: 0 3px 0 var(--ink); }
.yb-b:focus-visible, .yb input:focus-visible, .yb select:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.yb-card { background: var(--cream); border: 3px solid var(--ink); border-radius: 14px; box-shadow: 5px 5px 0 rgba(0,0,0,0.35); padding: 12px; display: grid; gap: 10px; align-content: start; min-width: 0; }
.yb-card h3 { font: 400 20px/1 "Luckiest Guy", Impact, sans-serif; letter-spacing: 0.03em; color: var(--navy); }
.yb-card h4 { font: 700 13px Fredoka, sans-serif; text-transform: uppercase; letter-spacing: 0.06em; color: #5a6274; }
.yb-note { font-size: 13px; color: #4b5366; }
.yb input[type=text], .yb select { font: 500 14px Fredoka, sans-serif; color: var(--ink); background: #fff; border: 3px solid var(--ink); border-radius: 10px; padding: 5px 9px; min-height: 38px; min-width: 0; width: 100%; }
.yb label { display: grid; gap: 3px; font-size: 13px; font-weight: 600; }
.yb-me { display: flex; align-items: center; gap: 8px; background: var(--cream); border: 3px solid var(--ink); border-radius: 999px; padding: 3px 14px 3px 3px; font-weight: 600; }
.yb-me canvas { border-radius: 50%; background: #9fd3e6; border: 2px solid var(--ink); }
.yb-cash { color: #1f7a3a; font-weight: 700; }
.yb-face { width: 40px; height: 40px; border-radius: 50%; background: #9fd3e6; border: 2px solid var(--ink); flex: none; }
.yb-star { width: 18px; height: 18px; flex: none; }
.yb-lobby { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.2fr) minmax(0, 1fr); gap: 12px; align-items: start; }
.yb-col { display: grid; gap: 12px; min-width: 0; }
.yb-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.yb-list li { display: flex; align-items: center; gap: 8px; background: #fff; border: 2px solid var(--ink); border-radius: 10px; padding: 5px 8px; min-width: 0; }
.yb-list li > span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.yb-list small { display: block; color: #5a6274; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.yb-empty { font-size: 13px; color: #5a6274; background: var(--sand); border: 2px dashed #a79f86; border-radius: 10px; padding: 9px; }
.yb-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.yb-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.yb-chat { background: #fff; border: 3px solid var(--ink); border-radius: 10px; height: 170px; overflow-y: auto; padding: 6px 9px; font-size: 13px; line-height: 1.45; overflow-wrap: anywhere; }
.yb-chat p b { color: var(--navy); } .yb-chat .sys { color: #7a5b00; } .yb-chat .gl b { color: #2f7d48; }
.yb-say { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; }
.yb-seats { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 8px; }
.yb-seat { background: #fff; border: 2px solid var(--ink); border-radius: 12px; padding: 6px; text-align: center; font-size: 13px; font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.yb-seat canvas { width: 72px; height: 88px; display: block; margin: 0 auto; }
.yb-seat.open { border-style: dashed; color: #7b8296; background: var(--sand); display: grid; place-items: center; min-height: 112px; }
.yb-dress { display: grid; grid-template-columns: minmax(0, 300px) minmax(0, 1fr); gap: 12px; align-items: start; }
.yb-mirror { background: linear-gradient(#9fd3e6, #d8f0f7 62%, #c9a35c 62%, #b98c45); border: 3px solid var(--ink); border-radius: 12px; width: 100%; height: auto; display: block; }
.yb-parts { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 8px; }
.yb-part { display: grid; grid-template-columns: 78px 36px minmax(0, 1fr) 36px; gap: 5px; align-items: center; font-size: 13px; font-weight: 600; }
.yb-part b { text-align: center; background: #fff; border: 2px solid var(--ink); border-radius: 9px; padding: 6px 4px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.yb-part b.locked { background: #ffe9a8; }
.yb-part .yb-b { padding: 0; min-height: 34px; }
.yb-buy { background: #fff3c4; border: 3px dashed var(--ink); border-radius: 12px; padding: 9px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; font-weight: 600; }
.yb-table { width: 100%; border-collapse: collapse; font-size: 13px; font-variant-numeric: tabular-nums; background: #fff; }
.yb-table th, .yb-table td { border: 2px solid var(--ink); padding: 4px 6px; text-align: center; }
.yb-table thead th { background: var(--navy); color: #fff; font-weight: 600; }
.yb-table td.n, .yb-table th.n { text-align: left; }
.yb-table .who { display: flex; align-items: center; gap: 6px; font-weight: 600; min-width: 0; }
.yb-table tr.me td { background: #fff3c4; }
.yb-scroll { overflow-x: auto; border-radius: 10px; }
.yb-game { display: grid; grid-template-columns: minmax(0, 640px) minmax(220px, 1fr); gap: 12px; align-items: start; }
.yb-stage { display: grid; gap: 8px; min-width: 0; }
.yb-banner { background: var(--gold); border: 3px solid var(--ink); border-radius: 12px; padding: 6px 12px; font-weight: 700; display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.yb-banner span:last-child { font-weight: 500; }
.yb-screen { border: 4px solid var(--ink); border-radius: 14px; overflow: hidden; background: #000; line-height: 0; box-shadow: 5px 5px 0 rgba(0,0,0,0.35); }
.yb-screen canvas { width: 100%; height: auto; display: block; touch-action: none; }
.yb-pad { display: grid; grid-template-columns: 64px minmax(0, 1fr) 64px; gap: 8px; }
.yb-pad .yb-b { min-height: 52px; font-size: 18px; }
.yb-pad .yb-b.go { font: 400 22px "Luckiest Guy", Impact, sans-serif; letter-spacing: 0.04em; background: var(--hot); color: #fff; }
.yb-pad .yb-b.go:disabled { background: #b9bdc7; color: #5c6272; }
.yb-side { display: grid; gap: 10px; min-width: 0; }
.yb-sheets { grid-column: 1 / -1; }
.yb-sheets table { min-width: 560px; }
.yb-sheets td .m { display: block; letter-spacing: 1px; min-height: 1.3em; } .yb-sheets td .c { display: block; font-weight: 700; min-height: 1.3em; }
.yb-sheets tr.up th.n { background: var(--gold); } .yb-sheets td.now { background: #fff3c4; }
.yb-sheets td.tot { font-weight: 700; font-size: 16px; }
.yb-sheets tbody th.n { background: #fff; min-width: 120px; font-weight: 600; }
.yb-over { grid-column: 1 / -1; background: #fff3c4; }
.yb-over ol { margin: 0; padding-left: 22px; }
html.yb-playing #glorbo { display: none !important; }
@media (max-width: 900px) { .yb-lobby { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } .yb-lobby > .yb-col:last-child { grid-column: 1 / -1; } }
@media (max-width: 720px) {
  .yb { padding: 8px; border-radius: 12px; }
  .yb-lobby, .yb-dress, .yb-game { grid-template-columns: minmax(0, 1fr); }
  .yb-lobby > .yb-col:last-child { grid-column: auto; }
  .yb-title { font-size: 24px; }
  .yb-chat { height: 130px; }
}`;

  const HOUSE = [
    { id: -1, name: "Gutter Gary", blurb: "easy", skill: 0.22, nerves: 1.3, look: [0, 0, 0, 4, 2, 2, 0, 2, 1, 1, 0] },
    { id: -2, name: "Spare-Me Sam", blurb: "medium", skill: 0.6, nerves: 1.1, look: [1, 2, 3, 2, 1, 1, 5, 1, 0, 2, 2] },
    { id: -3, name: "Glorbo", blurb: "hard", skill: 0.9, nerves: 0.8, look: [0, 5, 0, 0, 1, 1, 7, 0, 7, 0, 5] }
  ];
  const WEEK = () => Math.floor((Date.now() / 86400000 + 4) / 7);      // weeks start on Sunday, like the old tables
  const full = () => Array(10).fill(true);

  function mount(el, ctx) {
    ctx = ctx || {};
    const teams = ctx.teams || [];
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const money = n => "$" + Math.round(n).toLocaleString("en-US");
    if (!document.getElementById("yb-css")) {
      const st = document.createElement("style"); st.id = "yb-css"; st.textContent = CSS; document.head.appendChild(st);
      const f = document.createElement("link"); f.rel = "stylesheet"; f.href = "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Luckiest+Guy&display=swap"; document.head.appendChild(f);
    }

    // ----- what this device remembers -----
    const mem = { name: "", team: 0, look: A.DEFAULT_LOOK.slice(), cash: 250, owned: { shirt: [], hat: [], specs: [], ball: [] },
      st: { g: 0, sum: 0, pins: 0, x: 0, gut: 0, perf: 0, best: 0, earn: 0 }, wk: { id: 0, g: 0, sum: 0, x: 0, earn: 0 }, sound: true };
    try {
      const saved = JSON.parse(localStorage.getItem("yowza-bowl2") || "{}");
      ["name", "team", "cash", "sound"].forEach(k => { if (saved[k] !== undefined) mem[k] = saved[k]; });
      if (saved.look) mem.look = A.fixLook(saved.look);
      ["st", "wk", "owned"].forEach(k => { if (saved[k] && typeof saved[k] === "object") Object.assign(mem[k], saved[k]); });
    } catch (e) { /* private mode */ }
    const save = () => { try { localStorage.setItem("yowza-bowl2", JSON.stringify(mem)); } catch (e) { /* private mode */ } };
    const owns = (part, i) => !A.PRICES[part] || !A.PRICES[part][i] || (mem.owned[part] || []).includes(i);
    const myTeam = () => teams.find(t => t.id === Number(mem.team)) || null;
    const myName = () => (mem.name || "Rookie").slice(0, 12);
    const myTag = () => { const t = myTeam(); return (t && t.abbrev) || myName().slice(0, 3); };
    const starOf = (g, s) => YB.rank(g, s);
    const cpuList = teams.map(t => ({ id: t.id, name: (t.manager || t.name).slice(0, 12), team: t, skill: t.skill == null ? 0.62 : t.skill, nerves: t.nerves || 1,
      look: (() => { const l = A.randomLook(YB.rng(t.id * 7919 + 11), true); l[10] %= 4; return l; })() }));

    el.innerHTML =
      '<div class="yb">' +
        '<div class="yb-top"><div class="yb-title">YOWZA BOWL<small>Oddball ten-pin for the Yowza League</small></div>' +
          '<div class="yb-nav"><span class="yb-me"><canvas width="72" height="72" style="width:36px;height:36px"></canvas><span class="yb-me-name"></span><canvas class="yb-star yb-me-star" width="36" height="36"></canvas><span class="yb-cash"></span></span>' +
          '<button class="yb-b alt" type="button" data-act="nav" data-to="lobby">Lobby</button><button class="yb-b alt" type="button" data-act="nav" data-to="dress">Dressing room</button><button class="yb-b alt" type="button" data-act="nav" data-to="hall">Hall of Fame</button></div></div>' +
        '<div class="yb-lobby" data-screen="lobby"></div>' +
        '<div class="yb-dress" data-screen="dress" hidden></div>' +
        '<div class="yb-card" data-screen="hall" hidden></div>' +
        '<div class="yb-game" data-screen="game" hidden></div>' +
      '</div>';
    const rootEl = el.firstChild;
    const q = (s, within) => (within || rootEl).querySelector(s), qa = (s, within) => Array.from((within || rootEl).querySelectorAll(s));
    const screens = { lobby: q('[data-screen="lobby"]'), dress: q('[data-screen="dress"]'), hall: q('[data-screen="hall"]'), game: q('[data-screen="game"]') };
    let screen = "lobby";

    function paintStar(c, color) { const g = c.getContext("2d"); g.clearRect(0, 0, c.width, c.height); A.drawStar(g, c.width / 2, c.height / 2 + 1, c.width * 0.42, color); }
    function paint(within) {
      qa("canvas[data-look]", within).forEach(c => A.portrait(c, c.dataset.look.split(",").map(Number), { bust: c.dataset.bust !== "0", tag: c.dataset.tag || "", ball: c.dataset.ball === "1" }));
      qa("canvas[data-star]", within).forEach(c => paintStar(c, c.dataset.star));
    }
    const face = (look, cls) => '<canvas class="' + (cls || "yb-face") + '" width="80" height="80" data-look="' + A.fixLook(look).join(",") + '"></canvas>';
    const star = (g, s) => { const r = starOf(g, s); return '<canvas class="yb-star" width="36" height="36" data-star="' + r.color + '" title="' + esc(r.name + ": " + r.tag + (r.avg == null ? "" : ", average " + Math.round(r.avg))) + '"></canvas>'; };
    function showMe() {
      A.portrait(q(".yb-me canvas"), mem.look, { bust: true });
      q(".yb-me-name").textContent = myName();
      const r = starOf(mem.st.g, mem.st.sum);
      paintStar(q(".yb-me-star"), r.color); q(".yb-me-star").title = r.name + ": " + r.tag;
      q(".yb-cash").textContent = money(mem.cash);
    }
    function show(name) {
      screen = name;
      Object.keys(screens).forEach(k => { screens[k].hidden = k !== name; });
      qa('[data-act="nav"]').forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.to === name)); b.disabled = name === "game"; });
      document.documentElement.classList.toggle("yb-playing", name === "game");
      if (name === "dress") renderDress();
      if (name === "hall") renderHall();
      if (name === "lobby") { renderLobby(); pushPresence(); }
    }

    // ----- sound: all synthesized, nothing to download -----
    let ac = null, rumble = null;
    function audio() {
      if (!mem.sound) return null;
      try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch (e) { ac = null; }
      return ac;
    }
    function noise(dur, freq, vol, type) {
      const a = audio();
      if (!a) return null;
      const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = a.createBufferSource(), f = a.createBiquadFilter(), v = a.createGain();
      src.buffer = buf; f.type = type || "lowpass"; f.frequency.value = freq; v.gain.value = vol;
      src.connect(f); f.connect(v); v.connect(a.destination);
      return { src, v, a };
    }
    function crash(n) { const k = noise(0.3, 1800, Math.min(0.5, 0.12 + n * 0.05), "bandpass"); if (!k) return; k.v.gain.exponentialRampToValueAtTime(0.001, k.a.currentTime + 0.3); k.src.start(); }
    function stopRumble() { if (rumble) { try { rumble.src.stop(); } catch (e) { /* already stopped */ } rumble = null; } }
    function startRumble() { stopRumble(); const k = noise(3, 140, 0.16); if (!k) return; k.src.loop = true; k.src.start(); rumble = k; }
    function tune(notes, wave) {
      const a = audio();
      if (!a) return;
      notes.forEach(([freq, at, len]) => {
        const o = a.createOscillator(), v = a.createGain();
        o.type = wave || "square"; o.frequency.value = freq;
        v.gain.setValueAtTime(0.07, a.currentTime + at); v.gain.exponentialRampToValueAtTime(0.001, a.currentTime + at + len);
        o.connect(v); v.connect(a.destination); o.start(a.currentTime + at); o.stop(a.currentTime + at + len + 0.02);
      });
    }
    const blip = () => tune([[660, 0, 0.06]]);
    const fanfare = () => tune([[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.3]]);
    const ding = () => tune([[784, 0, 0.1], [988, 0.1, 0.22]]);
    const womp = () => tune([[220, 0, 0.18], [196, 0.18, 0.18], [165, 0.36, 0.4]], "sawtooth");

    // ----- online -----
    let net = null, netState = ctx.firebase ? "idle" : "off", rooms = {}, here = {}, myRoom = null, lobbyUnsubs = [], chatUnsub = null;
    const card = () => ({ u: net ? net.uid : "", n: myName(), l: mem.look, g: mem.st.g, s: mem.st.sum, tag: myTag() });
    function pushPresence() {
      if (!net) return;
      net.set("online/" + net.uid, { n: myName(), l: mem.look, g: mem.st.g, s: mem.st.sum, room: myRoom ? myRoom.id : (G && G.online ? G.online.id : null), t: net.now() });
    }
    function pushProfile() {
      if (!net) return;
      const s = mem.st;
      net.update("players/" + net.uid, { name: myName(), look: mem.look, g: s.g, sum: s.sum, pins: s.pins, x: s.x, gut: s.gut, perf: s.perf, best: s.best, earn: s.earn, t: net.now() });
      if (mem.wk.id === WEEK() && mem.wk.g) net.set("weekly/" + mem.wk.id + "/" + net.uid, { name: myName(), look: mem.look, g: mem.wk.g, sum: mem.wk.sum, x: mem.wk.x, earn: mem.wk.earn });
    }
    function goOnline() {
      if (netState !== "idle") return;
      netState = "connecting"; renderOnline();
      YB.net.connect(ctx.firebase, ctx.space || "open").then(n => {
        net = n; netState = "on";
        net.onDrop("online/" + net.uid, null);
        pushPresence(); pushProfile();
        lobbyUnsubs.push(net.watch("rooms", v => { rooms = v || {}; roomsChanged(); }));
        lobbyUnsubs.push(net.watch("online", v => { here = v || {}; renderOnline(); }));
        watchChat("chat/lobby", q(".yb-lobby-chat"));
        renderOnline();
        if (ctx.invite) { const id = ctx.invite; ctx.invite = null; setTimeout(() => { if (rooms[id] && !myRoom && !G) (rooms[id].state === "waiting" ? joinRoom(id) : watchRoom(id)); }, 900); }
      }).catch(() => { netState = "failed"; renderOnline(); });
    }
    function chatLine(box, who, text, cls) {
      if (!box) return;
      const p = document.createElement("p");
      if (cls) p.className = cls;
      p.innerHTML = (who ? "<b>&lt;" + esc(who) + "&gt;</b> " : "") + esc(text);
      box.appendChild(p);
      while (box.children.length > 80) box.removeChild(box.firstChild);
      box.scrollTop = box.scrollHeight;
    }
    function watchChat(path, box) {
      if (chatUnsub) chatUnsub();
      chatUnsub = null;
      if (!net || !box) return;
      chatUnsub = net.added(path, m => { if (m && typeof m.m === "string") chatLine(box, String(m.n || "?").slice(0, 16), m.m.slice(0, 200)); }, 40);
    }
    let lastSaid = 0;
    function say(path, input) {
      const text = input.value.trim().slice(0, 140);
      if (!text || !net || Date.now() - lastSaid < 800) return;
      lastSaid = Date.now();
      net.push(path, { n: myName(), m: text, t: net.now(), u: net.uid });
      input.value = "";
    }

    // ----- lobby -----
    const roomKind = r => (r.mode === "team" ? "Team game, alternate " + (r.alt === "ball" ? "ball" : "frame") : "Standard game") + ", " + A.ALLEYS[r.alley || 0].name;
    const seatsOf = r => Object.keys(r.seats || {}).map(Number).sort((a, b) => a - b).map(i => Object.assign({ i }, r.seats[i]));
    function renderLobby() {
      const opp = n => '<label>Lane ' + n + '<select class="yb-opp" data-n="' + n + '"><option value="">Nobody</option><option value="human">Another person (pass and play)</option>' +
        '<optgroup label="House bowlers">' + HOUSE.map(h => '<option value="cpu:' + h.id + '">' + esc(h.name) + " (" + h.blurb + ")</option>").join("") + "</optgroup>" +
        (cpuList.length ? '<optgroup label="League managers">' + cpuList.map(c => '<option value="cpu:' + c.id + '">' + esc(c.name) + (c.team.manager ? " (" + esc(c.team.name) + ")" : "") + "</option>").join("") + "</optgroup>" : "") + "</select></label>";
      const alleys = A.ALLEYS.map((a, i) => '<option value="' + i + '">' + esc(a.name) + "</option>").join("");
      const types = '<option value="std">Standard game</option><option value="frame">Team game: partners swap each frame</option><option value="ball">Team game: partners swap each ball</option>';
      screens.lobby.innerHTML =
        '<div class="yb-col">' +
          '<div class="yb-card"><h3>Bowl right now</h3><p class="yb-note">Against the computer, or pass the phone around. Lane 1 is you. Bowling alone is practice and doesn\'t touch your average.</p>' +
            opp(2) + opp(3) + opp(4) +
            '<div class="yb-grid2"><label>Game<select class="yb-ltype">' + types + '</select></label><label>Alley<select class="yb-lalley">' + alleys + '</select></label></div>' +
            '<button class="yb-b hot" type="button" data-act="local">Bowl!</button></div>' +
        '</div>' +
        '<div class="yb-col">' +
          '<div class="yb-card yb-room" hidden></div>' +
          '<div class="yb-card"><h3>Online lanes</h3><div class="yb-net"></div>' +
            '<h4>Waiting for players</h4><ul class="yb-list yb-waiting"></ul><h4>Playing now</h4><ul class="yb-list yb-playing-list"></ul></div>' +
          '<div class="yb-card yb-open"><h3>Open a lane</h3><div class="yb-grid2"><label>Game<select class="yb-otype">' + types + '</select></label><label>Alley<select class="yb-oalley">' + alleys + '</select></label></div>' +
            '<label>Bowlers<select class="yb-osize"><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>' +
            '<button class="yb-b teal" type="button" data-act="open">Open the lane</button></div>' +
        '</div>' +
        '<div class="yb-col">' +
          '<div class="yb-card"><h3>Who\'s here</h3><ul class="yb-list yb-here"></ul></div>' +
          '<div class="yb-card"><h3>Lobby chat</h3><div class="yb-chat yb-lobby-chat" role="log" aria-label="Lobby chat"></div>' +
            '<form class="yb-say" data-chat="chat/lobby"><input type="text" maxlength="140" placeholder="Say something" aria-label="Chat message" autocomplete="off"><button class="yb-b sm" type="submit">Send</button></form></div>' +
        '</div>';
      q('.yb-opp[data-n="2"]').value = cpuList.length ? "cpu:" + pick(cpuList).id : "cpu:-2";
      const sync = () => {
        const n = qa(".yb-opp").filter(s => s.value).length, lt = q(".yb-ltype");
        qa("option", lt).forEach(o => { o.disabled = o.value !== "std" && n !== 3; });
        if (n !== 3) lt.value = "std";
        const os = q(".yb-osize"), team = q(".yb-otype").value !== "std";
        if (team) os.value = "4";
        os.disabled = team;
      };
      qa(".yb-opp, .yb-otype").forEach(s => s.addEventListener("change", sync));
      sync();
      if (net) watchChat("chat/lobby", q(".yb-lobby-chat"));
      renderOnline();
    }
    function renderOnline() {
      if (screen !== "lobby" || !q(".yb-net")) return;
      const box = q(".yb-net");
      const msg = { off: "Online lanes aren't set up on this copy of the site. You can still bowl the computer.", idle: "Connecting when you get here...", connecting: "Finding the other lanes...", failed: "Couldn't reach the lanes. Check your connection and reload the page.", on: "" }[netState];
      box.innerHTML = msg ? '<p class="yb-empty">' + msg + "</p>" : "";
      q(".yb-open").hidden = netState !== "on" || !!myRoom;
      qa(".yb-say button, .yb-say input").forEach(b => { b.disabled = netState !== "on"; });
      const list = Object.keys(rooms).map(id => Object.assign({ id }, rooms[id])).filter(r => r && r.seats && net && net.now() - (r.t || 0) < 6 * 3600e3);
      const row = (r, btn) => { const ss = seatsOf(r).filter(s => !s.left); return "<li>" + (ss[0] ? face(ss[0].l) : "") + "<span>" + esc(ss.map(s => s.n).join(", ")) + "<small>" + esc(roomKind(r)) + (r.state === "waiting" ? " · " + ss.length + " of " + r.max : "") + "</small></span>" + btn + "</li>"; };
      const waiting = list.filter(r => r.state === "waiting"), playing = list.filter(r => r.state === "playing");
      q(".yb-waiting").innerHTML = waiting.length ? waiting.map(r => row(r, myRoom && myRoom.id === r.id ? "<small>your lane</small>" : '<button class="yb-b sm" type="button" data-act="join" data-id="' + esc(r.id) + '"' + (myRoom || seatsOf(r).length >= r.max ? " disabled" : "") + ">Join</button>")).join("") : '<li class="yb-empty">' + (netState === "on" ? "Nobody's waiting. Open a lane and drop the link in the group chat." : "&nbsp;") + "</li>";
      q(".yb-playing-list").innerHTML = playing.length ? playing.map(r => row(r, '<button class="yb-b sm alt" type="button" data-act="watch" data-id="' + esc(r.id) + '">Watch</button>')).join("") : '<li class="yb-empty">' + (netState === "on" ? "No games in progress." : "&nbsp;") + "</li>";
      const people = Object.keys(here).map(u => here[u]).filter(p => p && p.n);
      q(".yb-here").innerHTML = people.length ? people.map(p => "<li>" + face(p.l) + "<span>" + esc(String(p.n).slice(0, 16)) + "<small>" + (p.room ? "on a lane" : "in the lobby") + "</small></span>" + star(p.g, p.s) + "</li>").join("") : '<li class="yb-empty">' + (netState === "on" ? "Just you." : "&nbsp;") + "</li>";
      renderRoom();
      paint(screens.lobby);
    }
    function renderRoom() {
      const box = q(".yb-room");
      if (!box) return;
      const r = myRoom && rooms[myRoom.id];
      box.hidden = !r;
      if (!r) return;
      const ss = seatsOf(r), host = r.host === net.uid, need = r.mode === "team" ? 4 : 2;
      let seats = "";
      for (let i = 0; i < r.max; i++) { const s = r.seats[i]; seats += s ? '<div class="yb-seat"><canvas width="144" height="176" data-bust="0" data-look="' + A.fixLook(s.l).join(",") + '"></canvas>' + esc(s.n) + (r.mode === "team" ? " [" + (i % 2 ? "B" : "A") + "]" : "") + "</div>" : '<div class="yb-seat open">Open</div>'; }
      box.innerHTML = "<h3>Your lane</h3><p class=\"yb-note\">" + esc(roomKind(r)) + ". " + (ss.length < need ? "Waiting for " + (need - ss.length) + " more." : host ? "Ready when you are." : "Waiting for the host to start.") + '</p><div class="yb-seats">' + seats + "</div>" +
        '<div class="yb-row">' + (host ? '<button class="yb-b hot" type="button" data-act="begin"' + (ss.length < need ? " disabled" : "") + ">Start the game</button>" : "") +
        '<button class="yb-b alt" type="button" data-act="invite">Copy invite link</button><button class="yb-b alt" type="button" data-act="leave-room">Leave</button></div>';
    }
    function roomsChanged() {
      if (myRoom) {
        const r = rooms[myRoom.id];
        if (!r) { myRoom = null; pushPresence(); }
        else if (r.state === "playing" && !G) {
          const ss = seatsOf(r), mine = ss.findIndex(s => s.u === net.uid);
          const id = myRoom.id; myRoom = null;
          if (mine >= 0) enterOnline(id, r, ss[mine].i, false);
        }
      }
      // tidy up lanes nobody closed
      Object.keys(rooms).forEach(id => { const r = rooms[id]; if (r && net && net.now() - (r.t || 0) > 6 * 3600e3) { net.remove("rooms/" + id); net.remove("games/" + id); } });
      renderOnline();
    }
    function openRoom() {
      if (!net || myRoom) return;
      const type = q(".yb-otype").value, team = type !== "std";
      const room = { t: net.now(), alley: Number(q(".yb-oalley").value), mode: team ? "team" : "std", alt: type === "ball" ? "ball" : "frame", max: team ? 4 : Number(q(".yb-osize").value), host: net.uid, state: "waiting", seats: { 0: card() } };
      const id = net.push("rooms", room);
      myRoom = { id, seat: 0 };
      net.onDrop("rooms/" + id, null);
      rooms[id] = room;
      pushPresence(); renderOnline();
    }
    function joinRoom(id) {
      const r = rooms[id];
      if (!net || myRoom || !r || r.state !== "waiting") return;
      let i = 0;
      while (i < r.max && r.seats && r.seats[i]) i++;
      if (i >= r.max) return;
      net.claim("rooms/" + id + "/seats/" + i, card()).then(ok => {
        if (!ok) return;
        myRoom = { id, seat: i };
        net.onDrop("rooms/" + id + "/seats/" + i, null);
        pushPresence(); renderOnline();
      });
    }
    function leaveRoom() {
      if (!myRoom || !net) return;
      const r = rooms[myRoom.id], id = myRoom.id, seat = myRoom.seat;
      myRoom = null;
      if (r && r.host === net.uid) { net.cancelDrop("rooms/" + id); net.remove("rooms/" + id); }
      else { net.cancelDrop("rooms/" + id + "/seats/" + seat); net.remove("rooms/" + id + "/seats/" + seat); }
      pushPresence(); renderOnline();
    }
    function beginRoom() {
      const r = myRoom && rooms[myRoom.id];
      if (!r || r.host !== net.uid) return;
      const ss = seatsOf(r), seats = {};
      if (ss.length < (r.mode === "team" ? 4 : 2)) return;
      ss.forEach((s, n) => { const c = Object.assign({}, s); delete c.i; seats[n] = c; });
      net.cancelDrop("rooms/" + myRoom.id);
      net.update("rooms/" + myRoom.id, { state: "playing", seed: Math.floor(Math.random() * 65536), seats, started: net.now() });
    }
    function enterOnline(id, r, seat, spectator) {
      const ss = seatsOf(r);
      if (!spectator) { net.cancelDrop("rooms/" + id + "/seats/" + seat); net.onDrop("rooms/" + id + "/seats/" + seat + "/left", true); }
      startGame({
        alley: r.alley || 0, mode: r.mode, alt: r.alt, seed: r.seed || 1, counts: r.mode !== "team",
        seats: ss.map(s => ({ kind: !spectator && s.i === seat ? "me" : "net", name: String(s.n).slice(0, 12), look: A.fixLook(s.l), tag: String(s.tag || s.n).slice(0, 4), g: s.g, s: s.s })),
        online: { id, seat, spectator, host: r.host === net.uid }
      });
    }
    const watchRoom = id => { const r = rooms[id]; if (r && r.state === "playing" && !G && !myRoom) enterOnline(id, r, -1, true); };
    function copy(text, btn) {
      const done = () => { const old = btn.textContent; btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = old; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => {});
      else { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) { /* nothing */ } ta.remove(); }
    }

    // ----- dressing room and pro shop -----
    let draft = null, backView = false;
    function renderDress() {
      if (!draft) draft = mem.look.slice();
      const locked = A.PARTS.map((p, i) => (owns(p, draft[i]) ? null : { p, i, price: A.PRICES[p][draft[i]], name: A.NAMES[p][draft[i]] })).filter(Boolean);
      const label = { build: "Build", skin: "Skin", hair: "Hair", hairColor: "Hair color", eyes: "Eyes", mouth: "Mouth", shirt: "Shirt", pants: "Pants", hat: "Hat", specs: "Glasses", ball: "Ball" };
      screens.dress.innerHTML =
        '<div class="yb-card"><h3>The mirror</h3><canvas class="yb-mirror" width="560" height="620"></canvas>' +
          '<div class="yb-row"><button class="yb-b alt sm" type="button" data-act="flip">' + (backView ? "Front" : "Back") + ' view</button><button class="yb-b alt sm" type="button" data-act="dice">Surprise me</button></div>' +
          '<label>Name on the scoreboard<input type="text" class="yb-name" maxlength="12" autocomplete="off" placeholder="Your name" value="' + esc(mem.name) + '"></label>' +
          '<label>Your team<select class="yb-team"><option value="0">Free agent</option>' + teams.map(t => '<option value="' + t.id + '"' + (t.id === Number(mem.team) ? " selected" : "") + ">" + esc(t.name) + "</option>").join("") + "</select></label></div>" +
        '<div class="yb-card"><h3>Dressing room &amp; pro shop</h3><p class="yb-note">Everyone starts as the league grey bowler. Bowling pays: a dollar a pin, $20 a strike, $500 for a 200 game and $2,000 for a perfect one. Spend it here. You have <b class="yb-cash">' + money(mem.cash) + "</b>.</p>" +
          '<div class="yb-parts">' + A.PARTS.map((p, i) => { const price = A.PRICES[p] && A.PRICES[p][draft[i]], lock = !owns(p, draft[i]); return '<div class="yb-part"><span>' + label[p] + '</span><button class="yb-b alt" type="button" data-act="part" data-i="' + i + '" data-d="-1" aria-label="Previous ' + label[p] + '">&#9664;</button><b class="' + (lock ? "locked" : "") + '">' + esc(A.NAMES[p][draft[i]]) + (lock ? " · " + money(price) : "") + '</b><button class="yb-b alt" type="button" data-act="part" data-i="' + i + '" data-d="1" aria-label="Next ' + label[p] + '">&#9654;</button></div>'; }).join("") + "</div>" +
          '<p class="yb-note">' + esc(YB.BALLS[draft[10]].name + ": " + YB.BALLS[draft[10]].blurb) + "</p>" +
          locked.map(l => '<div class="yb-buy"><span>' + esc(l.name) + " is " + money(l.price) + (mem.cash < l.price ? ". You're " + money(l.price - mem.cash) + " short." : ".") + '</span><button class="yb-b hot sm" type="button" data-act="buy" data-i="' + l.i + '"' + (mem.cash < l.price ? " disabled" : "") + ">Buy it</button></div>").join("") +
          (locked.length ? '<p class="yb-note">Things you haven\'t bought are only tried on. They come off when you leave the dressing room.</p>' : "") + "</div>";
      A.portrait(q(".yb-mirror"), draft, { tag: myTag(), ball: !backView, back: backView });
      q(".yb-name").addEventListener("input", e => { mem.name = e.target.value.trim().slice(0, 12); save(); showMe(); });
      q(".yb-team").addEventListener("change", e => { mem.team = Number(e.target.value); save(); A.portrait(q(".yb-mirror"), draft, { tag: myTag(), ball: !backView, back: backView }); });
    }
    function commitLook() {
      if (!draft) return;
      mem.look = draft.map((v, i) => (owns(A.PARTS[i], v) ? v : mem.look[i]));
      draft = null; save(); showMe(); pushProfile();
    }

    // ----- Hall of Fame -----
    let hallTab = "all", hallSort = "avg";
    function renderHall() {
      const me = net ? net.uid : "me";
      const draw = rows => {
        rows = rows.filter(r => r.g > 0).map(r => Object.assign({ avg: r.sum / r.g }, r));
        rows.sort((a, b) => (hallSort === "avg" ? b.avg - a.avg : hallSort === "x" ? b.x - a.x : b.earn - a.earn) || b.g - a.g);
        const tab = (id, label) => '<button class="yb-b sm alt" type="button" data-act="hall-tab" data-v="' + id + '" aria-pressed="' + (hallTab === id) + '">' + label + "</button>";
        const srt = (id, label) => '<button class="yb-b sm alt" type="button" data-act="hall-sort" data-v="' + id + '" aria-pressed="' + (hallSort === id) + '">' + label + "</button>";
        screens.hall.innerHTML = "<h3>Hall of Fame</h3>" +
          '<div class="yb-row">' + tab("all", "All-time") + tab("wk", "This week") + '<span style="flex:1"></span>' + srt("avg", "Average") + srt("x", "Strikes") + srt("earn", "Earnings") + "</div>" +
          '<p class="yb-note">' + (net ? (hallTab === "wk" ? "This week's table resets every Sunday. " : "") + "Your star is your average: green under 100, yellow 100 to 149, blue 150 to 199, red 200 to 249, black 250 and up. You're unrated (grey) until you've bowled " + YB.RATED_AFTER + " counting games. Practice and team games don't count." : "The league table needs the online lanes. Until they connect, this is just your own record on this device.") + "</p>" +
          (rows.length ? '<div class="yb-scroll"><table class="yb-table"><thead><tr><th>#</th><th class="n">Bowler</th><th>Games</th><th>Average</th>' + (hallTab === "all" ? "<th>Best</th>" : "") + "<th>Strikes</th>" + (hallTab === "all" ? "<th>Gutters</th><th>300s</th>" : "") + "<th>Earnings</th></tr></thead><tbody>" +
            rows.map((r, n) => '<tr class="' + (r.id === me ? "me" : "") + '"><td>' + (n + 1) + '</td><td class="n"><span class="who">' + face(r.look) + star(r.g, r.sum) + esc(String(r.name).slice(0, 16)) + "</span></td><td>" + r.g + "</td><td><b>" + r.avg.toFixed(1) + "</b></td>" + (hallTab === "all" ? "<td>" + (r.best || 0) + "</td>" : "") + "<td>" + (r.x || 0) + "</td>" + (hallTab === "all" ? "<td>" + (r.gut || 0) + "</td><td>" + (r.perf || 0) + "</td>" : "") + "<td>" + money(r.earn || 0) + "</td></tr>").join("") + "</tbody></table></div>"
            : '<p class="yb-empty">Nobody has a counting game ' + (hallTab === "wk" ? "this week" : "yet") + ". Be the first.</p>");
        paint(screens.hall);
      };
      const mine = hallTab === "wk" ? (mem.wk.id === WEEK() ? [Object.assign({ id: me, name: myName(), look: mem.look }, mem.wk)] : []) : [Object.assign({ id: me, name: myName(), look: mem.look }, mem.st)];
      draw(mine);
      if (net) net.get(hallTab === "wk" ? "weekly/" + WEEK() : "players").then(v => { if (screen === "hall" && v) draw(Object.keys(v).map(id => Object.assign({ id }, v[id])).filter(r => r && r.name)); });
    }

    // ===================================================================================================================
    // The match
    // ===================================================================================================================
    let G = null, raf = 0, lastT = 0, held = 0;
    function startGame(o) {
      const portrait = (el.clientWidth || 800) < 560;
      G = Object.assign({ match: YB.makeMatch(o.seats.length, o.mode, o.alt), view: A.makeView(portrait), phase: "idle", t: 0, clock: 0, sim: null, pos: 0, dir: 0, power: 0,
        word: null, confetti: [], queue: [], streak: {}, myGutters: 0, over: false, unsubs: [] }, o);
      if (!G.seed) G.seed = Math.floor(Math.random() * 65536);
      G.seats.forEach(s => { if (s.kind === "cpu") s.r = YB.rng(Math.floor(Math.random() * 1e9)); });
      const dpr = Math.min(2, window.devicePixelRatio || 1), v = G.view;
      screens.game.innerHTML =
        '<div class="yb-stage"><div class="yb-banner" role="status"><span class="yb-turn"></span><span class="yb-tip"></span></div>' +
          '<div class="yb-screen"><canvas width="' + v.W * dpr + '" height="' + v.H * dpr + '" aria-label="The lane, seen from behind the bowler"></canvas></div>' +
          '<div class="yb-pad"><button class="yb-b alt" type="button" data-hold="-1" aria-label="Left">&#9664;</button><button class="yb-b go" type="button" data-act="act">BOWL</button><button class="yb-b alt" type="button" data-hold="1" aria-label="Right">&#9654;</button></div></div>' +
        '<div class="yb-side"><div class="yb-card"><h3>' + esc(A.ALLEYS[G.alley].name) + '</h3><p class="yb-note">' + esc(A.ALLEYS[G.alley].blurb) + '</p>' +
            '<div class="yb-chat yb-game-chat" role="log" aria-label="Lane chat"></div>' +
            (G.online ? '<form class="yb-say" data-chat="games/' + esc(G.online.id) + '/chat"><input type="text" maxlength="140" placeholder="Talk some trash" aria-label="Chat message" autocomplete="off"><button class="yb-b sm" type="submit">Send</button></form>' : "") +
            '<div class="yb-row"><button class="yb-b alt sm" type="button" data-act="sound"></button><button class="yb-b alt sm" type="button" data-act="quit">Leave the lane</button></div></div></div>' +
        '<div class="yb-card yb-over" hidden></div>' +
        '<div class="yb-scroll yb-sheets"><table class="yb-table"></table></div>';
      G.canvas = q(".yb-screen canvas"); G.g = G.canvas.getContext("2d"); G.dpr = dpr; G.chat = q(".yb-game-chat");
      q('[data-act="sound"]').textContent = mem.sound ? "Sound: on" : "Sound: off";
      show("game");
      audio();
      const names = G.seats.map(s => s.name);
      chatLine(G.chat, "", names.join(", ") + (names.length > 1 ? " are" : " is") + " on the lane.", "sys");
      glorbo(G.online && G.online.spectator ? "You're watching from the bar. Keep the heckling classy." : names.length > 1 ? "Welcome to " + A.ALLEYS[G.alley].name + ". Ten frames. Keep it clean. Or don't." : "Practice lane. Nothing counts. I'm still judging.");
      if (G.online) {
        watchChat("games/" + G.online.id + "/chat", G.chat);
        G.unsubs.push(net.added("games/" + G.online.id + "/throws", ev => { if (G && ev) { G.queue.push(ev); pump(); } }));
        G.unsubs.push(net.watch("rooms/" + G.online.id, r => {
          if (!G || G.over) return;
          if (!r) { glorbo("The lane was closed."); finishGame(true); return; }
          seatsOf(r).forEach(s => { if (s.left && !G.match.left.includes(s.i)) { G.match.left.push(s.i); chatLine(G.chat, "", G.seats[s.i].name + " left the lane.", "sys"); } });
          if (G.phase === "wait" && (!YB.nextTurn(G.match) || G.match.left.includes(G.turn.seat))) next();
        }));
        pushPresence();
      }
      next();
      lastT = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
      rootEl.scrollIntoView({ block: "nearest" });
    }
    const glorbo = text => chatLine(G && G.chat, "Glorbo", text, "gl");
    const sheetName = sh => sh.seats.map(i => G.seats[i].name).join(" & ");
    const isMine = seat => !(G.online && G.online.spectator) && (seat.kind === "me" || seat.kind === "local");

    function talk(kind, speaker, target) {
      const t = speaker.team, tt = target && target.team, lines = [];
      if (kind === "brag") { lines.push("Somebody screenshot that for the group chat.", "Easier than setting a lineup.", "Rack 'em again."); if (t && t.rec) lines.push("That's what a " + t.rec + " team looks like."); }
      else if (kind === "oops") { lines.push("Lane's crooked. Commissioner, do something.", "I was checking the waiver wire.", "That one doesn't count. New ball."); if (t && t.bench >= 20) lines.push("Left that one on the bench, like the other " + Math.round(t.bench) + " points."); }
      else if (kind === "jeer") { lines.push("Yowza of the Week material, " + target.name + ".", "Bold strategy, " + target.name + ".", "The gutters aren't worth points, " + target.name + "."); if (tt && tt.bench >= 20) lines.push(Math.round(tt.bench) + " points left on the bench this season and now this, " + target.name + "?"); }
      else if (kind === "grumble") lines.push("Lucky. Just like your schedule.", "Do that in the playoffs and we'll talk.", "Okay, " + target.name + ". Okay.");
      else if (kind === "win") lines.push("Scoreboard.", "Good game. For me.", "Put it in the record book.");
      else lines.push("Rematch. Right now.", "I demand a recount.", "My arm was cold.");
      chatLine(G.chat, speaker.name, pick(lines));
    }

    function banner(a, b) { q(".yb-turn").textContent = a; q(".yb-tip").textContent = b || ""; }
    function pad(on, label) {
      const go = q('[data-act="act"]');
      go.disabled = !on; go.textContent = label;
    }
    function next() {
      const tn = YB.nextTurn(G.match);
      if (!tn) { finishGame(); return; }
      const seat = G.seats[tn.seat];
      G.turn = tn; G.cur = seat;
      G.standing = tn.fresh ? full() : G.match.sheets[tn.sheet].standing.slice();
      G.sim = null; G.pos = 0; G.dir = 0; G.power = 0; G.clock = 0; G.word = null; G.mask = null; G.steer = []; G.shot = null;
      const where = "Frame " + (tn.frame + 1) + ", ball " + (tn.ball + 1) + ": " + seat.name;
      drawSheets();
      if (isMine(seat)) {
        G.phase = "place"; G.live = true; G.deadline = G.online ? Date.now() + 45000 : 0;
        banner(where + (G.seats.filter(s => s.kind === "me" || s.kind === "local").length > 1 || G.online ? ", you're up" : ""), "Pick your spot with the arrows, then press Bowl.");
        pad(true, "BOWL");
        if (document.activeElement && rootEl.contains(document.activeElement) && document.activeElement.tagName !== "INPUT") q('[data-act="act"]').focus({ preventScroll: true });
      } else if (seat.kind === "cpu") {
        G.phase = "think"; G.live = false;
        G.shot = YB.cpuThrow(G.standing, seat.look[10], seat.skill, seat.r, tn.frame === 9 ? seat.nerves * 1.15 : 1);
        banner(where + " (computer)", seat.name + " is lining it up.");
        pad(false, "...");
      } else {
        G.phase = "wait"; G.live = false;
        banner(where, "Waiting for " + seat.name + " to bowl.");
        pad(false, "...");
        pump();
      }
    }
    // online: other players' throws arrive here and are replayed. If we're behind (we just joined to watch), catch up fast.
    function pump() {
      if (!G || G.over) return;
      G.queue = G.queue.filter(ev => ev.n >= G.match.throws).sort((a, b) => a.n - b.n);
      while (G.phase === "wait" && G.queue.length && G.queue[0].n === G.match.throws) {
        const ev = G.queue.shift();
        if (!Array.isArray(ev.b) || ev.b.length !== 3) continue;
        if (G.queue.length) {
          YB.applyThrow(G.match, G.turn.sheet, YB.fromMask(ev.m));
          const tn = YB.nextTurn(G.match);
          if (!tn) { finishGame(); return; }
          G.turn = tn; G.cur = G.seats[tn.seat];
          G.standing = tn.fresh ? full() : G.match.sheets[tn.sheet].standing.slice();
          if (isMine(G.cur)) { next(); return; }
        } else {
          G.steer = YB.steerList(ev.k); G.mask = ev.m;
          release(ev.b.map(Number));
          drawSheets();
        }
      }
    }
    function act() {
      if (!G || !G.cur || !isMine(G.cur)) return;
      if (G.phase === "place") { G.phase = "dir"; G.clock = 0; blip(); banner(q(".yb-turn").textContent, "Stop the arrow where you want the ball to go."); pad(true, "AIM"); }
      else if (G.phase === "dir") { G.phase = "power"; G.clock = 0; blip(); banner(q(".yb-turn").textContent, "Stop the power bar. More power, more pin action, less spin."); pad(true, "POWER"); }
      else if (G.phase === "power") { blip(); release(YB.toBytes(G.pos, G.dir, G.power)); }
    }
    function release(bytes) {
      const v = YB.fromBytes(bytes);
      G.bytes = bytes; G.pos = v.pos; G.dir = v.dir; G.power = v.power;
      G.phase = "approach"; G.clock = 0;
      pad(false, "...");
      if (G.live) banner(q(".yb-turn").textContent, "Hold left or right while it rolls to spin the ball.");
    }
    function settle() {
      stopRumble();
      const res = YB.result(G.sim), tn = G.turn, sh = G.match.sheets[tn.sheet], seat = G.cur;
      const after = G.mask != null ? YB.fromMask(G.mask) : res.standing;
      const firstBall = G.standing.every(Boolean);
      if (G.online && G.live) net.push("games/" + G.online.id + "/throws", { n: G.match.throws, s: tn.seat, b: G.bytes, k: YB.steerText(G.sim.steer), m: YB.toMask(after) });
      const fell = YB.applyThrow(G.match, tn.sheet, after), left = after.filter(Boolean).length;
      let word, kind = null, st = G.streak[tn.sheet] || 0;
      if (firstBall && left === 0) {
        st++;
        word = st === 2 ? "DOUBLE!" : st === 3 ? "TURKEY!" : st > 3 ? st + " IN A ROW!" : "STRIKE!";
        glorbo(st === 3 ? "TURKEY for " + seat.name + "! Gobble gobble." : st > 3 ? seat.name + " has " + st + " in a row. Somebody check that ball." : pick(["STRIKE! " + seat.name + " clears the deck.", "Strike. All ten. Yowza.", "X marks the spot for " + seat.name + "."]));
        fanfare(); kind = "good";
        for (let i = 0; i < 60; i++) G.confetti.push({ x: G.view.W / 2 + (Math.random() - 0.5) * 120, y: G.view.H * 0.36, vx: (Math.random() - 0.5) * 520, vy: -Math.random() * 420 - 60, r: Math.random() * 6, vr: (Math.random() - 0.5) * 12, c: pick(["#ff3d5a", "#ffc93c", "#35e0d0", "#ffffff", "#b388ff"]) });
      } else {
        st = 0;
        if (left === 0) { word = "SPARE!"; kind = "ok"; glorbo(pick(["Spare for " + seat.name + ". Clean living.", seat.name + " picks it up.", "Spare. Tidy."])); ding(); }
        else if (fell === 0) {
          word = res.gutter ? "GUTTER!" : "MISS!"; kind = "bad";
          if (res.gutter && seat.kind === "me") G.myGutters++;
          glorbo(res.gutter ? pick(["Gutterball. Yowza.", seat.name + " finds the gutter. It was right there the whole time.", "Straight into the gutter."]) : seat.name + " hits nothing but air.");
          womp();
        } else if (firstBall && YB.isSplit(after)) { word = "SPLIT!"; kind = "bad"; glorbo("Split! " + seat.name + " needs a miracle or a very bouncy pin."); }
        else {
          word = String(fell);
          if (firstBall && fell === 9) glorbo("Nine for " + seat.name + ". One pin had other plans.");
          else if (!firstBall && tn.frame < 9) glorbo(seat.name + " leaves " + left + ". Open frame.");
        }
      }
      G.streak[tn.sheet] = st;
      G.word = { text: word, t: 0, kind: kind === "ok" ? null : kind };
      G.mood = kind === "good" || kind === "ok" ? 1 : kind === "bad" ? -1 : 0;
      if ((kind === "good" || kind === "bad") && !G.online && Math.random() < 0.5) {
        const others = G.seats.filter(s => s.kind === "cpu" && s !== seat);
        if (seat.kind === "cpu" && Math.random() < 0.6) talk(kind === "good" ? "brag" : "oops", seat);
        else if (others.length) talk(kind === "good" ? "grumble" : "jeer", pick(others), seat);
      }
      drawSheets();
      G.phase = "settle"; G.clock = 0;
    }
    function finishGame(aborted) {
      if (!G || G.over) return;
      G.over = true; G.phase = "over"; G.cur = null; G.sim = null; G.word = null; stopRumble();
      pad(false, "GAME OVER");
      banner("Final", "");
      drawSheets();
      const sheets = G.match.sheets, totals = sheets.map(sh => YB.score(sh.rolls).total);
      const mySeat = G.seats.findIndex(s => s.kind === "me"), mySheet = sheets.findIndex(sh => sh.seats.includes(mySeat));
      const top = Math.max(...totals), winners = sheets.filter((sh, i) => totals[i] === top);
      const headline = aborted ? "The game ended early." : sheets.length === 1 ? sheetName(sheets[0]) + " bowls a " + totals[0] + "." : winners.length > 1 ? "A tie at " + top + "." : sheetName(winners[0]) + (winners[0].seats.length > 1 ? " win, " : " wins with a ") + top + ".";
      if (!aborted) glorbo(mySheet >= 0 && totals[mySheet] === 300 ? "A PERFECT GAME. Twelve strikes. Frame it." : headline);
      if (!aborted && !G.online && sheets.length > 1) {
        const cw = winners.length === 1 && G.seats[winners[0].seats[0]].kind === "cpu" ? G.seats[winners[0].seats[0]] : null;
        const cl = G.seats.find((s, i) => s.kind === "cpu" && !winners.some(w => w.seats.includes(i)));
        if (cw) talk("win", cw); else if (cl) talk("lose", cl);
      }
      let mine = "";
      if (mySheet >= 0 && !aborted) {
        const rolls = sheets[mySheet].rolls, total = totals[mySheet], done = YB.score(rolls).done, team = sheets[mySheet].seats.length > 1, solo = G.seats.length === 1;
        const strikes = YB.strikesIn(rolls), won = sheets.length > 1 && winners.length === 1 && winners[0] === sheets[mySheet];
        let pay = Math.round(YB.payout(rolls) / (team ? 2 : 1) * (solo ? 0.25 : 1)) + (won && G.online ? 100 : 0);
        if (!done) pay = Math.round(pay / 2);
        mem.cash += pay;
        if (total >= 200) fanfare();
        if (G.counts && !team && !solo && done) {
          const s = mem.st, best = total > s.best;
          s.g++; s.sum += total; s.pins += rolls.reduce((a, b) => a + b, 0); s.x += strikes; s.gut += G.myGutters; s.earn += pay; if (total === 300) s.perf++; if (best) s.best = total;
          if (mem.wk.id !== WEEK()) mem.wk = { id: WEEK(), g: 0, sum: 0, x: 0, earn: 0 };
          mem.wk.g++; mem.wk.sum += total; mem.wk.x += strikes; mem.wk.earn += pay;
          const r = starOf(s.g, s.sum);
          mine = "You bowled a " + total + (best ? ", your best yet" : "") + " and earned " + money(pay) + ". " + (r.avg == null ? (YB.RATED_AFTER - s.g) + " more counting " + (YB.RATED_AFTER - s.g === 1 ? "game" : "games") + " until you get a star." : "Your average is " + r.avg.toFixed(1) + ": " + r.name.toLowerCase() + ", \"" + r.tag + "\".");
        } else {
          mine = "You earned " + money(pay) + ". " + (solo ? "Practice pays a quarter rate and doesn't touch your average." : team ? "Team games pay half each and don't touch your average." : "Unfinished games don't touch your average.");
        }
        save(); showMe(); pushProfile();
      }
      if (G.online && G.online.host && !aborted) net.update("rooms/" + G.online.id, { state: "over" });
      const order = sheets.map((sh, i) => ({ sh, t: totals[i] })).sort((a, b) => b.t - a.t);
      const over = q(".yb-over");
      over.hidden = false;
      over.innerHTML = "<h3>" + esc(headline) + "</h3>" + (sheets.length > 1 ? "<ol>" + order.map(o => "<li>" + esc(sheetName(o.sh)) + ": <b>" + o.t + "</b></li>").join("") + "</ol>" : "") +
        (mine ? "<p>" + esc(mine) + "</p>" : "") +
        '<div class="yb-row">' + (G.online ? "" : '<button class="yb-b hot" type="button" data-act="again">Rematch</button>') + '<button class="yb-b alt" type="button" data-act="quit">Back to the lobby</button><button class="yb-b alt" type="button" data-act="nav-shop">Spend it in the pro shop</button></div>';
      over.scrollIntoView({ block: "nearest" });
    }
    function leaveGame(to) {
      if (!G) return;
      cancelAnimationFrame(raf); stopRumble();
      G.unsubs.forEach(u => u());
      if (G.online) {
        const id = G.online.id, r = rooms[id];
        if (!G.online.spectator) {
          net.cancelDrop("rooms/" + id + "/seats/" + G.online.seat + "/left");
          const others = r ? seatsOf(r).filter(s => s.i !== G.online.seat && !s.left) : [];
          if (!others.length || (G.over && G.online.host)) { net.remove("rooms/" + id); net.remove("games/" + id); }
          else net.set("rooms/" + id + "/seats/" + G.online.seat + "/left", true);
        }
      }
      G = null; held = 0;
      show(to || "lobby");
    }

    function drawSheets() {
      const turn = G.turn, head = '<thead><tr><th class="n">Bowler</th>' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => "<th>" + n + "</th>").join("") + "<th>Total</th></tr></thead>";
      const body = G.match.sheets.map((sh, i) => {
        const sc = YB.score(sh.rolls), mk = YB.marks(sc.frames), pr = YB.progress(sh.rolls), up = !G.over && turn && turn.sheet === i;
        let run = 0;
        sc.frames.forEach(f => { if (f.cum != null) run = f.cum; });
        return '<tr class="' + (up ? "up" : "") + '"><th class="n" scope="row"><span class="who">' + sh.seats.map(s => face(G.seats[s].look)).join("") + esc(sheetName(sh)) + "</span></th>" +
          sc.frames.map((f, n) => '<td class="' + (up && !pr.done && n === pr.frame ? "now" : "") + '"><span class="m">' + mk[n].join(" ") + '</span><span class="c">' + (f.cum == null ? "" : f.cum) + "</span></td>").join("") + '<td class="tot">' + run + "</td></tr>";
      }).join("");
      const table = q(".yb-sheets table");
      table.innerHTML = head + "<tbody>" + body + "</tbody>";
      paint(table);
    }

    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (!G) return;
      const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0;
      lastT = now;
      G.t += dt; G.clock += dt;
      const v = G.view, seat = G.cur, fast = G.live || !seat ? 1 : 1.35;
      let target = v.y0;
      if (G.word) G.word.t += dt;
      G.confetti = G.confetti.filter(c => { c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt; return c.y < v.H + 20; });
      if (seat) {
        if (G.phase === "place") { if (held) G.pos = Math.max(-17, Math.min(17, G.pos + held * dt * 15)); }
        else if (G.phase === "dir") { const u = (G.clock * 1.1 + 0.5) % 2; G.dir = (u < 1 ? u : 2 - u) * 2 - 1; }
        else if (G.phase === "power") { const u = (G.clock * 1.2) % 2; G.power = u < 1 ? u : 2 - u; }
        else if (G.phase === "think") {
          const sh = YB.fromBytes(G.shot.bytes), a = Math.min(1, G.clock / 0.9);
          G.pos = sh.pos * a; G.dir = sh.dir * a; G.power = sh.power * a;
          if (G.clock > 1.1) { G.steer = G.shot.steer; release(G.shot.bytes); }
        }
        if (G.live && G.deadline && (G.phase === "place" || G.phase === "dir" || G.phase === "power") && Date.now() > G.deadline) release(YB.toBytes(G.pos, G.dir, Math.max(0.5, G.power)));
        if (G.phase === "approach" && G.clock > 0.7 / fast) {
          G.sim = YB.createThrow(G.standing, G.bytes, seat.look[10], YB.throwSeed(G.seed, G.match.throws), G.live ? [] : G.steer);
          G.phase = "roll"; G.acc = 0; G.hits = 0; startRumble();
        } else if (G.phase === "roll") {
          const s = G.sim;
          G.acc += dt * fast;
          while (G.acc >= YB.DT && !s.done) {
            if (G.live && s.n % YB.TICK === 0) s.steer[s.n / YB.TICK] = held;
            YB.step(s); G.acc -= YB.DT;
          }
          if (s.hits > G.hits) { crash(s.hits - G.hits); G.hits = s.hits; }
          if (s.ball.gone || (s.ball.gutter && s.ball.y > YB.HEAD)) stopRumble();
          target = v.y0 + Math.max(0, Math.min(v.dolly, ((s.ball.gone ? YB.PIT : s.ball.y) - 30) * 0.75));
          if (s.done) settle();
        } else if (G.phase === "settle") {
          target = v.y0 + v.dolly;
          if (G.clock > 1.7 / fast) { next(); if (!G) return; }
        }
      }
      v.cy += (target - v.cy) * Math.min(1, dt * (target < v.cy ? 5 : 7));
      draw(dt);
    }
    function draw(dt) {
      const g = G.g, v = G.view, seat = G.cur, ph = G.phase;
      g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
      const sc = { alley: G.alley, t: G.t, dt, word: G.word, confetti: G.confetti };
      if (seat) {
        const rolling = ph === "roll" || ph === "settle";
        const a = ph === "approach" ? Math.min(1, G.clock / 0.7) : rolling ? 1 : 0;
        const by = (v.portrait ? -24 : -26) + a * 15;
        const swing = ph === "approach" ? (a < 0.6 ? -a / 0.6 : -1 + (a - 0.6) / 0.4 * 2) : rolling ? 1 : -0.15;
        sc.ballIdx = seat.look[10];
        sc.bowler = { x: G.pos - 8, y: by, look: seat.look, pose: { swing, step: a * 2, hold: !G.sim, tag: seat.tag, bob: ph === "settle" && G.mood > 0 ? Math.abs(Math.sin(G.clock * 9)) * 1.6 : Math.sin(G.t * 2.4) * 0.12, mood: ph === "settle" ? G.mood : 0 } };
        if (G.sim) { sc.pins = G.sim.pins; sc.ball = G.sim.ball; sc.up = G.sim.pins.map(p => p.st === 0); if (ph === "roll") sc.spin = G.live ? held : (G.sim.steer[Math.floor(G.sim.n / YB.TICK)] || 0); }
        else { sc.standing = G.standing; sc.up = G.standing; }
        if (ph === "place" || ph === "dir" || ph === "power" || ph === "think") sc.aim = { pos: G.pos, dir: ph === "place" ? 0 : G.dir, live: ph === "dir" };
        if (ph === "dir" || ph === "power" || ph === "think" || ph === "approach") sc.power = { v: G.power, live: ph === "power" };
      } else { sc.standing = full(); sc.up = full(); }
      A.drawScene(g, v, sc);
    }

    // ----- buttons and keys -----
    function localStart() {
      const seats = [{ kind: "me", name: myName(), look: mem.look.slice(), tag: myTag(), team: myTeam() }];
      qa(".yb-opp").forEach(sel => {
        const val = sel.value, n = Number(sel.dataset.n);
        if (val === "human") seats.push({ kind: "local", name: "Player " + n, look: A.randomLook(Math.random, false), tag: "P" + n });
        else if (val.indexOf("cpu:") === 0) {
          const id = Number(val.slice(4)), c = HOUSE.find(h => h.id === id) || cpuList.find(x => x.id === id);
          if (c) seats.push({ kind: "cpu", name: c.name, look: c.look.slice(), tag: (c.team && c.team.abbrev) || c.name.slice(0, 3), team: c.team || null, skill: c.skill, nerves: c.nerves });
        }
      });
      const type = q(".yb-ltype").value, team = type !== "std" && seats.length === 4;
      lastLocal = { alley: Number(q(".yb-lalley").value), mode: team ? "team" : "std", alt: type === "ball" ? "ball" : "frame", counts: true, seats };
      startGame(Object.assign({}, lastLocal, { seats: seats.map(s => Object.assign({}, s)) }));
    }
    let lastLocal = null;
    const acts = {
      nav: b => { if (screen === "dress") commitLook(); if (!G) show(b.dataset.to); },
      "nav-shop": () => leaveGame("dress"),
      local: localStart,
      open: openRoom, join: b => joinRoom(b.dataset.id), watch: b => watchRoom(b.dataset.id), "leave-room": leaveRoom, begin: beginRoom,
      invite: b => copy("🎳 Yowza Bowl: " + myName() + " opened a lane. Come bowl: " + (ctx.url || "") + "#bowl-room-" + myRoom.id, b),
      part: b => { const i = Number(b.dataset.i); draft[i] = (draft[i] + Number(b.dataset.d) + A.SIZES[i]) % A.SIZES[i]; renderDress(); },
      buy: b => { const i = Number(b.dataset.i), p = A.PARTS[i], price = A.PRICES[p][draft[i]]; if (mem.cash >= price) { mem.cash -= price; (mem.owned[p] = mem.owned[p] || []).push(draft[i]); mem.look[i] = draft[i]; save(); showMe(); tune([[988, 0, 0.08], [1319, 0.08, 0.2]]); renderDress(); } },
      dice: () => { const r = A.randomLook(Math.random, false); draft = draft.map((v, i) => (A.PRICES[A.PARTS[i]] ? v : r[i])); draft[6] = r[6]; renderDress(); },
      flip: () => { backView = !backView; renderDress(); },
      "hall-tab": b => { hallTab = b.dataset.v; renderHall(); }, "hall-sort": b => { hallSort = b.dataset.v; renderHall(); },
      act, sound: b => { mem.sound = !mem.sound; if (!mem.sound) stopRumble(); save(); b.textContent = mem.sound ? "Sound: on" : "Sound: off"; },
      quit: () => leaveGame(), again: () => { const o = lastLocal; leaveGame(); if (o) startGame(Object.assign({}, o, { seats: o.seats.map(s => Object.assign({}, s)) })); }
    };
    rootEl.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if (b && !b.disabled && acts[b.dataset.act]) acts[b.dataset.act](b); });
    rootEl.addEventListener("submit", e => { const f = e.target.closest("form[data-chat]"); if (f) { e.preventDefault(); say(f.dataset.chat, f.querySelector("input")); } });
    rootEl.addEventListener("pointerdown", e => { const b = e.target.closest("[data-hold]"); if (b) { e.preventDefault(); held = Number(b.dataset.hold); } });
    ["pointerup", "pointercancel"].forEach(ev => window.addEventListener(ev, () => { if (!keys.size) held = 0; }));
    const keys = new Set();
    document.addEventListener("keydown", e => {
      if (!G || G.over || e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
      const r = rootEl.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") { keys.add(e.key); held = e.key === "ArrowLeft" ? -1 : 1; e.preventDefault(); }
      else if ((e.key === " " || e.key === "Enter" || e.key === "Control") && !e.repeat) { if (e.target.tagName !== "BUTTON" || e.key === "Control") { act(); e.preventDefault(); } }
    });
    document.addEventListener("keyup", e => { if (keys.delete(e.key)) held = keys.has("ArrowLeft") ? -1 : keys.has("ArrowRight") ? 1 : 0; });
    window.addEventListener("blur", () => { keys.clear(); held = 0; });

    showMe();
    renderLobby();
    document.fonts && document.fonts.load("20px 'Luckiest Guy'").then(showMe, () => {});
    if (ctx.firebase) {
      if ("IntersectionObserver" in window && !ctx.invite) { const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); goOnline(); } }); io.observe(rootEl); }
      else goOnline();
    }
    return {
      invite(id) { if (!net) { ctx.invite = id; goOnline(); } else if (rooms[id] && !myRoom && !G) (rooms[id].state === "waiting" ? joinRoom(id) : watchRoom(id)); return true; },
      hasInvite: () => !!ctx.invite
    };
  }

  YB.mount = mount;
  root.YowzaBowl = YB;
})(typeof window !== "undefined" ? window : globalThis);
