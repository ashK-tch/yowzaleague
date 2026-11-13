/* Yowza Bowl, part 2 of 4: the art. Everything is drawn in code on a canvas, in a flat, bold-outline cartoon style
   (the look of early-2000s browser games): the lane seen from behind the bowler, three alleys, the pins, the balls and
   the bowlers ("oddballs": round little people you dress up). */
(function (root) {
  "use strict";
  if (typeof document === "undefined") return;
  const YB = root.YB, TAU = Math.PI * 2;
  const INK = "#1b2338";

  // ----- what a bowler can look like. A look is a list of numbers in this order (new parts only ever go on the end). -----
  const PARTS = ["build", "skin", "hair", "hairColor", "eyes", "mouth", "shirt", "pants", "hat", "specs", "ball", "beard", "pattern", "shoes", "extra"];
  const NAMES = {
    build: ["Barrel", "Pear", "Beanpole", "Fridge"],
    skin: ["Peach", "Tan", "Brown", "Deep", "Olive", "Alien green", "Rosy", "Lavender"],
    hair: ["Bald", "Short", "Spiky", "Ponytail", "Afro", "Mohawk", "Pompadour", "Long", "Space buns", "Mullet", "Curly", "Bowl cut"],
    hairColor: ["Black", "Brown", "Blonde", "Red", "Grey", "Blue", "Pink", "White"],
    eyes: ["Friendly", "Googly", "Sleepy", "Game face", "Starry", "Cyclops"],
    mouth: ["Smile", "Grin", "Flat", "Tongue out", "Buck teeth", "Smirk"],
    shirt: ["League grey", "Navy", "Cherry", "Forest", "Mustard", "Teal", "Hot pink", "Purple", "Orange", "Tuxedo black", "Sky blue", "Lime"],
    pants: ["Charcoal", "Denim", "Khaki", "Maroon", "Olive", "White", "Plaid", "Shorts", "Bell-bottoms", "Gold lamé"],
    hat: ["No hat", "Ball cap", "Beanie", "Cowboy hat", "Football helmet", "Crown", "Traffic cone", "Antennae", "Top hat", "Fedora", "Propeller beanie", "Viking helmet", "Chef hat", "Wizard hat", "Sweatband", "Party hat"],
    specs: ["No glasses", "Round glasses", "Shades", "Monocle", "3D glasses", "Star shades", "Eyepatch", "Disguise"],
    ball: YB.BALLS.map(b => b.name),
    beard: ["Clean shaven", "Mustache", "Handlebar", "Goatee", "Full beard", "Stubble"],
    pattern: ["Classic panel", "Plain", "Pinstripes", "Flames", "Hawaiian", "Argyle", "Polka dots", "Team jersey", "Tuxedo print", "Lightning bolt"],
    shoes: ["Rentals", "Classic red", "Blue suede", "Midnight gold", "Neon", "Bubblegum"],
    extra: ["Nothing", "Bow tie", "Necktie", "Gold chain", "Scarf", "Cape", "Medal", "Lei"]
  };
  // What costs money in the pro shop (everything else is free).
  const PRICES = {
    shirt: [0, 0, 0, 0, 100, 100, 150, 150, 150, 400, 100, 100],
    pants: [0, 0, 0, 0, 0, 0, 200, 150, 300, 800],
    hat: [0, 150, 200, 400, 600, 1500, 300, 800, 700, 350, 450, 900, 300, 1200, 100, 150],
    specs: [0, 100, 250, 500, 200, 350, 300, 400],
    ball: [0, 500, 500, 900, 300, 700, 400, 600, 800, 500, 300, 450],
    pattern: [0, 0, 150, 400, 350, 300, 200, 250, 600, 450],
    shoes: [0, 100, 200, 400, 300, 200],
    extra: [0, 150, 150, 500, 200, 1000, 300, 250]
  };
  const SKIN = ["#ffd3b0", "#e9b384", "#b97a4f", "#7a4a2b", "#c9a36b", "#8fc45a", "#ffb9a8", "#b9a2e8"];
  const SKIN_D = ["#e8a983", "#c98f5f", "#93583a", "#55301a", "#a37f4c", "#6a9c3c", "#e88f80", "#8d76c4"];
  const HAIR = ["#23232c", "#6b3f1f", "#f1c84b", "#c8452c", "#a9abb3", "#3b7ae0", "#ff7ab8", "#f4f1e8"];
  const HAIR_D = ["#0e0e14", "#472712", "#c79a22", "#932b18", "#7d7f88", "#2455a8", "#d44f91", "#c9c5b8"];
  const SHIRT = ["#9ea4ad", "#22407a", "#d1383f", "#2f7d48", "#e9b320", "#1f9e9a", "#ff5fa2", "#7b4bc4", "#f07a1f", "#22232b", "#6fb8ee", "#8fd13f"];
  const TRIM = ["#5f6672", "#f2c230", "#ffffff", "#f2e9c8", "#22232b", "#ffffff", "#22232b", "#f2c230", "#22407a", "#d1383f", "#ffffff", "#22407a"];
  const PANTS = ["#3a3d47", "#3b5c94", "#c9b183", "#7a2630", "#5f6b3a", "#f1f1ee", "#8a2f3a", "#c9b183", "#3b5c94", "#e6b422"];
  const SHOES = [["#e9dcbd", "#c8352f", "#2f5fae"], ["#f7f2e4", "#c8352f", "#c8352f"], ["#3f6fd0", "#f4f4f4", "#254a94"], ["#1c1d26", "#e6b422", "#e6b422"], ["#b7ff3c", "#8a3df0", "#ff3da6"], ["#ff9ccd", "#ffffff", "#ff5fa2"]];
  const BUILD = [
    { sw: 6.0, ww: 6.7, th: 10.2, leg: 5.6, hr: 5.0, arm: 4.1 },
    { sw: 4.7, ww: 6.7, th: 10.2, leg: 5.6, hr: 4.9, arm: 4.0 },
    { sw: 4.5, ww: 4.3, th: 12.6, leg: 8.0, hr: 4.6, arm: 4.8 },
    { sw: 7.6, ww: 5.9, th: 11.2, leg: 5.4, hr: 4.7, arm: 4.3 }
  ];
  const SIZES = PARTS.map(p => NAMES[p].length);
  const DEFAULT_LOOK = [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];      // the famous default grey bowler, in rental shoes
  const fixLook = look => SIZES.map((n, i) => ((Number(look && look[i]) || 0) % n + n) % n);
  function randomLook(r, fancy) {
    return PARTS.map((p, i) => {
      const free = [];
      for (let k = 0; k < SIZES[i]; k++) if (fancy || !PRICES[p] || !PRICES[p][k]) free.push(k);
      if (p === "hat" || p === "specs" || p === "extra" || p === "beard") { if (r() < (fancy ? 0.45 : 0.6)) return 0; }
      return free[Math.floor(r() * free.length)];
    });
  }

  const ALLEYS = [
    { name: "Glorbo's Lounge", blurb: "Shag carpet, neon, and a house band that only knows one song.",
      wood: ["#f0c47a", "#d9a655"], approach: "#c58f48", gutter: "#3a2d52", cap: "#5b2a86", floor: "#241a36",
      wall: ["#1c1235", "#4a2478"], accent: "#ff5fa2", glow: "#35e0d0", sign: "#ffd23c" },
    { name: "The Gridiron", blurb: "Fifty-yard-line lanes. The pins are in the end zone.",
      wood: ["#f1dca0", "#dcbc74"], approach: "#c9a45e", gutter: "#1f4a2b", cap: "#ffffff", floor: "#256b38",
      wall: ["#0f2a4a", "#2b6cb0"], accent: "#ffd200", glow: "#ffffff", sign: "#ffffff" },
    { name: "Moonbase 12", blurb: "Low gravity is a myth. The gutters are real.",
      wood: ["#55679c", "#33406e"], approach: "#2a3358", gutter: "#0d1024", cap: "#7df9ff", floor: "#141a36",
      wall: ["#05060f", "#1a1f4a"], accent: "#7df9ff", glow: "#b388ff", sign: "#7df9ff" }
  ];

  // ----- the camera: behind the bowler, looking down the lane -----
  function makeView(portrait) {
    return portrait
      ? { W: 480, H: 600, f: 600, h: 46.7, hz: 92, cx: 240, y0: -70, cy: -70, dolly: 80, portrait: true }
      : { W: 640, H: 480, f: 1174, h: 33.3, hz: 70, cx: 320, y0: -120, cy: -120, dolly: 105, portrait: false };
  }
  function P(v, x, y, z) {
    const d = Math.max(12, y - v.cy), k = v.f / d;
    return [v.cx + x * k, v.hz + (v.h - (z || 0)) * k, k];
  }
  function quad(g, v, pts, fill, stroke) {
    g.beginPath();
    pts.forEach((p, i) => { const s = P(v, p[0], p[1], p[2]); if (i) g.lineTo(s[0], s[1]); else g.moveTo(s[0], s[1]); });
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.stroke(); }
  }

  // ----- pins: every pin has a face, and opinions about what's rolling toward it -----
  const PIN = new Path2D("M1 0 C2 -0.3 2.6 -3.2 2.36 -5.3 C2.1 -7.6 0.95 -8.7 0.9 -10.3 C0.86 -11.4 1.3 -12 1.3 -13.2 C1.3 -14.4 0.7 -15 0 -15 C-0.7 -15 -1.3 -14.4 -1.3 -13.2 C-1.3 -12 -0.86 -11.4 -0.9 -10.3 C-0.95 -8.7 -2.1 -7.6 -2.36 -5.3 C-2.6 -3.2 -2 -0.3 -1 0 Z");
  // o: { tilt, squash, alpha, plain, mood: calm | worry | panic | ko | smug, lx, ly (where it's looking, -1..1), blink }
  function drawPin(g, sx, sy, k, o) {
    o = o || {};
    g.save();
    g.translate(sx, sy);
    g.scale(k, k * (o.squash || 1));
    if (o.tilt) { g.translate(0, -5.5); g.rotate(o.tilt); g.translate(0, 5.5); }
    if (o.alpha != null) g.globalAlpha = o.alpha;
    const body = g.createLinearGradient(-2.4, 0, 2.4, 0);
    body.addColorStop(0, "#ffffff"); body.addColorStop(0.55, "#fdf8ea"); body.addColorStop(1, "#cfd3e6");
    g.fillStyle = o.plain ? "#f4f1e6" : body; g.fill(PIN);
    if (!o.plain) {
      g.save(); g.clip(PIN);
      g.fillStyle = "rgba(255,255,255,0.95)"; g.beginPath(); g.ellipse(-1.25, -5.4, 0.35, 2.3, 0.08, 0, TAU); g.fill();
      g.fillStyle = "#e0262d"; g.fillRect(-2, -10.6, 4, 0.8); g.fillRect(-2, -12, 4, 0.8);
      g.fillStyle = "rgba(30,40,90,0.16)"; g.beginPath(); g.ellipse(0, 0.4, 2.6, 1.3, 0, 0, TAU); g.fill();
      g.restore();
    }
    g.lineWidth = 0.38; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(PIN);
    if (!o.plain && k > 2.2) {
      const mood = o.mood || "calm", lx = (o.lx || 0) * 0.24, ly = (o.ly || 0) * 0.2, ey = -6.1;
      g.lineWidth = 0.22; g.lineCap = "round";
      if (mood === "ko") {
        [-0.85, 0.85].forEach(ex => { g.beginPath(); g.moveTo(ex - 0.42, ey - 0.42); g.lineTo(ex + 0.42, ey + 0.42); g.moveTo(ex + 0.42, ey - 0.42); g.lineTo(ex - 0.42, ey + 0.42); g.stroke(); });
        g.beginPath(); g.moveTo(-0.8, -4); g.quadraticCurveTo(-0.4, -4.5, 0, -4); g.quadraticCurveTo(0.4, -3.5, 0.8, -4); g.stroke();
      } else {
        const big = mood === "panic" ? 1.3 : 1, shut = o.blink || mood === "smug";
        [-0.85, 0.85].forEach(ex => {
          if (shut) { g.beginPath(); g.moveTo(ex - 0.5, ey); g.quadraticCurveTo(ex, ey + (mood === "smug" ? -0.35 : 0.35), ex + 0.5, ey); g.stroke(); return; }
          g.fillStyle = "#fff"; g.beginPath(); g.ellipse(ex, ey, 0.6 * big, 0.76 * big, 0, 0, TAU); g.fill(); g.stroke();
          g.fillStyle = INK; g.beginPath(); g.arc(ex + lx, ey + ly, mood === "panic" ? 0.2 : 0.3, 0, TAU); g.fill();
        });
        if (mood === "worry" || mood === "panic") { g.beginPath(); g.moveTo(-1.5, ey - 1.5); g.lineTo(-0.5, ey - 1.15); g.moveTo(1.5, ey - 1.5); g.lineTo(0.5, ey - 1.15); g.stroke(); }
        g.fillStyle = INK;
        if (mood === "panic") { g.beginPath(); g.ellipse(0, -3.9, 0.5, 0.72, 0, 0, TAU); g.fill(); g.fillStyle = "#7fd0ff"; g.beginPath(); g.moveTo(1.75, -8.2); g.quadraticCurveTo(2.25, -7.2, 1.75, -7); g.quadraticCurveTo(1.3, -7.2, 1.75, -8.2); g.fill(); }
        else if (mood === "worry") { g.beginPath(); g.moveTo(-0.7, -3.8); g.quadraticCurveTo(-0.35, -4.2, 0, -3.8); g.quadraticCurveTo(0.35, -3.4, 0.7, -3.8); g.stroke(); }
        else if (mood === "smug") { g.beginPath(); g.arc(0, -4.4, 0.8, 0.25, Math.PI - 0.25); g.stroke(); g.fillStyle = "#f0556a"; g.beginPath(); g.ellipse(0.25, -3.5, 0.34, 0.5, 0, 0, TAU); g.fill(); g.stroke(); }
        else { g.beginPath(); g.arc(0, -4.5, 0.7, 0.3, Math.PI - 0.3); g.stroke(); }
      }
    }
    g.restore();
  }

  // ----- bowling balls. The finger holes are a face, because of course they are. -----
  function drawBall(g, sx, sy, r, idx, phase) {
    g.save();
    g.translate(sx, sy);
    g.lineWidth = Math.max(1.2, r * 0.09); g.strokeStyle = INK; g.lineJoin = "round"; g.lineCap = "round";
    const a = (phase || 0) % TAU, front = Math.cos(a), oy = -Math.sin(a) * r * 0.62;
    const round = (c1, c2) => {
      const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
      gr.addColorStop(0, c1); gr.addColorStop(1, c2);
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    };
    const inside = fn => { g.save(); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip(); fn(); g.restore(); };
    // the face rides around the ball as it rolls: over the top, down the front, and round the back out of sight
    const face = kind => {
      if (front < -0.1) return;
      g.save(); g.translate(0, oy); g.scale(1, Math.max(0.18, Math.abs(front)));
      g.fillStyle = "#0b0d16";
      [-0.27, 0.27].forEach(ex => {
        g.beginPath(); g.arc(ex * r, -0.12 * r, r * 0.13, 0, TAU); g.fill();
        g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.arc(ex * r - r * 0.04, -0.16 * r, r * 0.04, 0, TAU); g.fill(); g.fillStyle = "#0b0d16";
      });
      if (kind === "angry") { g.lineWidth = r * 0.07; g.strokeStyle = "#0b0d16"; g.beginPath(); g.moveTo(-0.46 * r, -0.36 * r); g.lineTo(-0.14 * r, -0.26 * r); g.moveTo(0.46 * r, -0.36 * r); g.lineTo(0.14 * r, -0.26 * r); g.stroke(); g.fillRect(-0.2 * r, 0.2 * r, 0.4 * r, 0.09 * r); }
      else if (kind === "silly") { g.beginPath(); g.ellipse(0, 0.22 * r, r * 0.16, r * 0.1, 0, 0, TAU); g.fill(); g.fillStyle = "#ff6b81"; g.beginPath(); g.ellipse(0.05 * r, 0.33 * r, r * 0.09, r * 0.13, 0, 0, TAU); g.fill(); }
      else { g.beginPath(); g.ellipse(0, 0.24 * r, r * 0.11, r * 0.15, 0, 0, TAU); g.fill(); }
      g.restore();
    };
    const rim = () => { g.strokeStyle = INK; g.lineWidth = Math.max(1.2, r * 0.09); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); g.fillStyle = "rgba(255,255,255,0.8)"; g.beginPath(); g.ellipse(-r * 0.4, -r * 0.52, r * 0.2, r * 0.1, -0.6, 0, TAU); g.fill(); };
    if (idx === 3) {                       // the football
      g.rotate(Math.sin(a * 0.8) * 0.5 + 0.3);
      const gr = g.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, "#c2743f"); gr.addColorStop(1, "#6b3615");
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r * 1.25, r * 0.8, 0, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = "#fff"; g.lineWidth = Math.max(1, r * 0.09);
      g.beginPath(); g.moveTo(-r * 0.45, r * 0.18); g.lineTo(r * 0.45, r * 0.18);
      for (let i = -2; i <= 2; i++) { g.moveTo(i * r * 0.18, r * 0.05); g.lineTo(i * r * 0.18, r * 0.31); }
      g.stroke();
      g.fillStyle = "#fff"; [-0.3, 0.3].forEach(ex => { g.beginPath(); g.ellipse(ex * r, -r * 0.2, r * 0.15, r * 0.19, 0, 0, TAU); g.fill(); });
      g.fillStyle = "#0b0d16"; [-0.26, 0.34].forEach(ex => { g.beginPath(); g.arc(ex * r, -r * 0.17, r * 0.07, 0, TAU); g.fill(); });
      g.restore();
      return;
    }
    if (idx === 1) { round("#8a90a3", "#16181f"); face("angry"); }
    else if (idx === 2) {
      round("#ff8a8f", "#b3141d");
      inside(() => { g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = r * 0.16; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(-r, i * r * 0.5 + Math.sin(a) * r * 0.5 - r * 0.3); g.lineTo(r, i * r * 0.5 + Math.sin(a) * r * 0.5 + r * 0.3); g.stroke(); } });
      face("silly");
    } else if (idx === 4) {
      round("#5a5d6b", "#0c0d12");
      if (front > -0.1) { g.save(); g.translate(0, oy * 0.9); g.scale(1, Math.max(0.2, Math.abs(front))); g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, r * 0.42, 0, TAU); g.fill(); g.fillStyle = "#0c0d12"; g.font = "900 " + Math.round(r * 0.62) + "px Fredoka, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("8", 0, r * 0.03); g.restore(); }
    } else if (idx === 5) {
      round("#ffffff", "#8b93ab");
      inside(() => {
        g.strokeStyle = "rgba(60,70,110,0.5)"; g.lineWidth = Math.max(0.6, r * 0.04);
        for (let i = -3; i <= 3; i++) { g.beginPath(); g.ellipse(0, 0, Math.abs(i) * r * 0.3 + 0.01, r, 0, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(-r, i * r * 0.3); g.lineTo(r, i * r * 0.3); g.stroke(); }
        ["#ff5fa2", "#35e0d0", "#ffd23c", "#b388ff"].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(Math.cos(a * 2 + i * 1.6) * r * 0.55, Math.sin(a * 2.6 + i * 1.6) * r * 0.55, r * 0.13, 0, TAU); g.fill(); });
      });
    } else if (idx === 6) {                 // watermelon
      round("#63c95a", "#1f6b2a");
      inside(() => { g.strokeStyle = "#17502a"; g.lineWidth = r * 0.13; for (let i = -3; i <= 3; i++) { g.beginPath(); const ox = i * r * 0.36 + Math.sin(a) * r * 0.18; g.moveTo(ox, -r); g.quadraticCurveTo(ox + r * 0.22 * (i < 0 ? -1 : 1), 0, ox, r); g.stroke(); } });
      face("oh");
    } else if (idx === 7) {                 // eyeball
      round("#ffffff", "#d9dbe8");
      inside(() => {
        g.strokeStyle = "rgba(220,60,70,0.7)"; g.lineWidth = Math.max(0.6, r * 0.04);
        for (let i = 0; i < 7; i++) { const an = i * 0.9 + 0.4; g.beginPath(); g.moveTo(Math.cos(an) * r, Math.sin(an) * r); g.quadraticCurveTo(Math.cos(an + 0.3) * r * 0.75, Math.sin(an + 0.3) * r * 0.75, Math.cos(an - 0.1) * r * 0.55, Math.sin(an - 0.1) * r * 0.55); g.stroke(); }
        if (front > -0.25) { g.save(); g.translate(0, oy); g.scale(1, Math.max(0.2, Math.abs(front))); g.fillStyle = "#2f8fd8"; g.beginPath(); g.arc(0, 0, r * 0.48, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = r * 0.05; g.stroke(); g.fillStyle = "#0b0d16"; g.beginPath(); g.arc(0, 0, r * 0.24, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(-r * 0.14, -r * 0.14, r * 0.09, 0, TAU); g.fill(); g.restore(); }
      });
    } else if (idx === 8) {                 // ringed planet
      g.strokeStyle = "#ffe9a8"; g.lineWidth = r * 0.16; g.beginPath(); g.ellipse(0, 0, r * 1.5, r * 0.36, -0.3, Math.PI, TAU); g.stroke();
      round("#ffc27a", "#c0562b");
      inside(() => { g.fillStyle = "rgba(140,50,20,0.35)"; [-0.55, -0.1, 0.4].forEach((b, i) => g.fillRect(-r, b * r + Math.sin(a + i) * r * 0.06, r * 2, r * 0.16)); g.fillStyle = "rgba(255,255,255,0.3)"; g.beginPath(); g.ellipse(r * 0.3 * Math.cos(a), r * 0.2, r * 0.22, r * 0.1, 0, 0, TAU); g.fill(); });
      rim();
      g.strokeStyle = INK; g.lineWidth = r * 0.24; g.beginPath(); g.ellipse(0, 0, r * 1.5, r * 0.36, -0.3, 0, Math.PI); g.stroke();
      g.strokeStyle = "#ffe9a8"; g.lineWidth = r * 0.14; g.stroke();
      g.restore();
      return;
    } else if (idx === 9) {                 // bomb
      g.strokeStyle = INK; g.lineWidth = r * 0.2; g.beginPath(); g.moveTo(r * 0.3, -r * 0.9); g.quadraticCurveTo(r * 0.75, -r * 1.5, r * 1.05, -r * 1.15); g.stroke();
      g.strokeStyle = "#c9a36b"; g.lineWidth = r * 0.1; g.stroke();
      const fl = 0.7 + Math.abs(Math.sin(a * 5)) * 0.5;
      g.fillStyle = "#ffd23c"; g.beginPath(); for (let i = 0; i < 10; i++) { const an = i * TAU / 10, rr = (i % 2 ? 0.14 : 0.3) * r * fl; g.lineTo(r * 1.05 + Math.cos(an) * rr, -r * 1.15 + Math.sin(an) * rr); } g.closePath(); g.fill();
      g.fillStyle = "#3a3f52"; g.strokeStyle = INK; g.lineWidth = Math.max(1.2, r * 0.09); g.beginPath(); g.roundRect(r * 0.05, -r * 1.12, r * 0.5, r * 0.3, r * 0.06); g.fill(); g.stroke();
      round("#5b6078", "#0d0e15"); face("angry");
    } else if (idx === 10) {                // beach ball
      round("#ffffff", "#e6e6f0");
      inside(() => { ["#ff3d5a", "#ffc93c", "#2f8fd8", "#3fd35a", "#ff8a3c", "#b388ff"].forEach((c, i) => { const a1 = i * TAU / 6 + a * 0.7; g.fillStyle = i % 2 ? "#ffffff" : c; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r * 1.1, a1, a1 + TAU / 6); g.closePath(); g.fill(); }); g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, r * 0.2, 0, TAU); g.fill(); });
    } else if (idx === 11) {                // meatball
      round("#b06a3a", "#5a2c12");
      inside(() => {
        g.fillStyle = "rgba(60,25,8,0.45)"; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(Math.cos(i * 2.4 + a * 0.5) * r * (0.25 + (i % 3) * 0.24), Math.sin(i * 1.7 + a * 0.5) * r * (0.25 + (i % 4) * 0.18), r * 0.11, 0, TAU); g.fill(); }
        g.fillStyle = "#d8322c"; g.beginPath(); g.moveTo(-r, -r); g.lineTo(r, -r); g.lineTo(r, -r * 0.42); g.quadraticCurveTo(r * 0.6, -r * 0.05, r * 0.38, -r * 0.42); g.quadraticCurveTo(r * 0.1, -r * 0.7, -r * 0.15, -r * 0.3); g.quadraticCurveTo(-r * 0.42, 0.1 * r, -r * 0.62, -r * 0.38); g.quadraticCurveTo(-r * 0.85, -r * 0.6, -r, -r * 0.3); g.closePath(); g.fill();
      });
      face("silly");
    } else { round("#9cc0ff", "#1c3faa"); face("oh"); }
    rim();
    g.restore();
  }

  // ----- bowlers -----
  // Built from the ground up each frame: two-tone bowling shoes, jointed legs, a shaped torso in a short-sleeved bowling
  // shirt, jointed arms with hands, a head with a proper face, then hair, glasses, hat and neckwear on top.
  // (x, y) is the middle of the feet; s is pixels per unit (a bowler is 25 to 30 units tall before the hat).
  // pose: { act: idle | address | walk | release | cheer | slump | facepalm | shock | clap | laugh | wave, t, a (0..1 through
  //         a walk), hold (ball in hand), tag (text on the back of the shirt), mood: 1 happy, -1 sad, 2 shocked }
  const COVERS = { 1: 1, 2: 1, 3: 1, 4: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1 };      // hats that sit over the hair
  function headY(look) { const B = BUILD[fixLook(look)[0]]; return -(B.leg + B.th) - 0.9 - B.hr * 0.86; }
  function drawBowler(g, x, y, s, look, pose, back) {
    pose = pose || {};
    const L = fixLook(look), B = BUILD[L[0]], skin = SKIN[L[1]], skinD = SKIN_D[L[1]], hairC = HAIR[L[3]], hairD = HAIR_D[L[3]];
    const shirt = SHIRT[L[6]], trim = TRIM[L[6]], pants = PANTS[L[7]], pst = L[7], sho = SHOES[L[13]], hat = L[8], hstyle = L[2];
    const act = pose.act || "idle", t = pose.t || 0, a = pose.a || 0, side = back ? 1 : -1, hr = B.hr, face0 = -(0.9 + hr * 0.86);
    let mood = pose.mood || 0, bob = Math.sin(t * 2.4) * 0.14, lean = 0, headDrop = 0, crouch = 0;
    let footL = [-2.9, 0], footR = [2.9, 0], handB = [B.sw + 1.5, 6.6], handO = [-(B.sw + 1.5), 6.6], bendB = 1, bendO = -1;
    if (act === "address") { handB = [3.4, 2.2]; handO = [-3.4, 2.2]; crouch = 0.25; }
    else if (act === "walk") {
      const st = a * TAU;
      footL = [-2.9, -Math.max(0, Math.sin(st)) * 1.5]; footR = [2.9, -Math.max(0, -Math.sin(st)) * 1.5];
      bob = Math.abs(Math.sin(st)) * 0.5; lean = a * 0.05; crouch = a * 0.5;
      const sw = a < 0.62 ? -a / 0.62 : -1 + (a - 0.62) / 0.38 * 2;
      handB = sw < 0 ? [B.sw + 1.6 + sw * 0.6, 7 - sw * 3.4] : [B.sw + 1.6 - sw * 1.8, 7 - sw * 11.5];
      handO = [-(B.sw + 2.6) - a * 1.5, 4.4 - a * 3];
    } else if (act === "release") { footL = [-0.6, 0]; footR = [-7.2, -1.3]; handB = [B.sw - 0.4, -6.2]; handO = [-(B.sw + 4.6), 0.6]; lean = -0.1; crouch = 0.7; bob = 0; }
    else if (act === "cheer") { bob = Math.abs(Math.sin(t * 9)) * 2; handB = [B.sw + 1.4 + Math.sin(t * 13) * 0.8, -11]; handO = [-(B.sw + 1.4) - Math.sin(t * 13 + 1) * 0.8, -11]; bendB = -1; bendO = 1; mood = 1; }
    else if (act === "laugh") { bob = Math.abs(Math.sin(t * 9)) * 0.6; handB = [3.2, 5.6]; handO = [-3.2, 5.6]; lean = Math.sin(t * 11) * 0.05; mood = 1; }
    else if (act === "slump") { headDrop = 1.7; crouch = 0.8; handB = [B.sw + 0.2, 8.8]; handO = [-(B.sw + 0.2), 8.8]; mood = -1; bob = 0; }
    else if (act === "facepalm") { headDrop = 0.9; handB = [0.9, face0 + 0.9 + 0.6]; handO = [-(B.sw + 0.4), 4.9]; mood = -1; bob = 0; }
    else if (act === "shock") { handB = [hr - 0.2, face0 + 1.6]; handO = [-(hr - 0.2), face0 + 1.6]; mood = 2; bob = 0; }
    else if (act === "clap") { const c = Math.abs(Math.sin(t * 10)) * 1.3; handB = [0.6 + c, 2.8]; handO = [-0.6 - c, 2.8]; mood = 1; }
    else if (act === "wave") { handB = [B.sw + 2.2 + Math.sin(t * 7) * 1.6, -8.6]; bendB = -1; mood = 1; }
    const dy = crouch * 0.9 - bob, S0 = -(B.leg + B.th) + dy, hem = -B.leg + 0.9 + dy, hy = S0 + face0 + headDrop, top = hy - hr;
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.rotate(lean);
    g.strokeStyle = INK; g.lineJoin = "round"; g.lineCap = "round"; g.lineWidth = 0.42;
    const fs = fill => { g.fillStyle = fill; g.fill(); g.stroke(); };
    const ell = (cx, cy, rx, ry, fill, rot) => { g.beginPath(); g.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU); fs(fill); };
    const dot = (cx, cy, r, fill) => { g.fillStyle = fill; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); };
    const rr = (x0, y0, w, h, r, fill) => { g.beginPath(); g.roundRect(x0, y0, w, h, r); fs(fill); };
    const poly = (pts, fill) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); fs(fill); };
    const line = (pts, w, col) => { g.lineWidth = w; g.strokeStyle = col || INK; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.lineWidth = 0.42; g.strokeStyle = INK; };
    const star = (cx, cy, r, fill) => { g.beginPath(); for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; g.lineTo(cx + Math.cos(an) * q, cy + Math.sin(an) * q); } g.closePath(); fs(fill); };
    // a two-bone limb from (ax, ay) to (bx, by): returns [end x, end y, joint x, joint y]
    const limb = (ax, ay, bx, by, len, bend, w1, w2, c1, c2) => {
      let dx = bx - ax, ddy = by - ay, d = Math.hypot(dx, ddy) || 0.01;
      const max = len * 2 - 0.02;
      if (d > max) { bx = ax + dx / d * max; by = ay + ddy / d * max; dx = bx - ax; ddy = by - ay; d = max; }
      const h = Math.sqrt(Math.max(0, len * len - d * d / 4));
      const jx = ax + dx / 2 - ddy / d * h * bend, jy = ay + ddy / 2 + dx / d * h * bend;
      g.strokeStyle = INK; g.lineWidth = w2 + 0.84; g.beginPath(); g.moveTo(jx, jy); g.lineTo(bx, by); g.stroke();
      g.lineWidth = w1 + 0.84; g.beginPath(); g.moveTo(ax, ay); g.lineTo(jx, jy); g.stroke();
      g.strokeStyle = c2; g.lineWidth = w2; g.beginPath(); g.moveTo(jx, jy); g.lineTo(bx, by); g.stroke();
      g.strokeStyle = c1; g.lineWidth = w1; g.beginPath(); g.moveTo(ax, ay); g.lineTo(jx, jy); g.stroke();
      g.lineWidth = 0.42; g.strokeStyle = INK;
      return [bx, by, jx, jy];
    };
    const torso = () => {
      const tp = S0 - 0.3;
      g.beginPath();
      g.moveTo(-B.sw * 0.55, tp - 0.9);
      g.quadraticCurveTo(-B.sw - 0.6, tp - 0.7, -B.sw - 0.5, tp + 2);
      g.bezierCurveTo(-B.ww - 0.9, tp + B.th * 0.45, -B.ww - 0.7, hem - 1.5, -B.ww * 0.86, hem);
      g.lineTo(B.ww * 0.86, hem);
      g.bezierCurveTo(B.ww + 0.7, hem - 1.5, B.ww + 0.9, tp + B.th * 0.45, B.sw + 0.5, tp + 2);
      g.quadraticCurveTo(B.sw + 0.6, tp - 0.7, B.sw * 0.55, tp - 0.9);
      g.closePath();
    };
    const W = Math.max(B.sw, B.ww) + 1.2, mid = (S0 + hem) / 2;

    // shadow
    g.fillStyle = "rgba(0,0,0,0.22)"; g.beginPath(); g.ellipse(-1, 0.35, B.ww + 2, 1.7, 0, 0, TAU); g.fill();
    // a cape goes on first from the front (it hangs behind you)
    if (L[14] === 5 && !back) poly([[-B.sw - 1.2, S0 + 0.2], [B.sw + 1.2, S0 + 0.2], [B.ww + 3 + Math.sin(t * 3) * 0.5, hem + 3.4], [-B.ww - 3 + Math.sin(t * 3 + 1) * 0.5, hem + 3.4]], "#b3141d");
    // hair that hangs behind the head
    if (!back && hat !== 4) {
      if (hstyle === 4) ell(0, hy - 0.9, hr * 1.4, hr * 1.3, hairC);
      if (hstyle === 7) { g.beginPath(); g.moveTo(-hr - 1, hy - 1); g.quadraticCurveTo(-hr - 2.2, hy + hr + 2, -hr - 0.6, hy + hr + 5); g.lineTo(hr + 0.6, hy + hr + 5); g.quadraticCurveTo(hr + 2.2, hy + hr + 2, hr + 1, hy - 1); g.closePath(); fs(hairC); }
      if (hstyle === 9) { g.beginPath(); g.moveTo(-hr - 0.2, hy + 1); g.quadraticCurveTo(-hr - 1.6, hy + hr + 2, -hr + 0.4, hy + hr + 3.6); g.lineTo(hr - 0.4, hy + hr + 3.6); g.quadraticCurveTo(hr + 1.6, hy + hr + 2, hr + 0.2, hy + 1); g.closePath(); fs(hairC); }
      if (hstyle === 3) { g.beginPath(); g.moveTo(hr * 0.5, hy - hr * 0.7); g.quadraticCurveTo(hr + 4.4, hy - 2.4, hr + 2.6, hy + 4.6); g.quadraticCurveTo(hr + 2.2, hy + 0.5, hr * 0.7, hy - 0.4); g.closePath(); fs(hairC); }
      if (hstyle === 8) { ell(-hr * 0.8, top + 0.2, 2.3, 2.3, hairC); ell(hr * 0.8, top + 0.2, 2.3, 2.3, hairC); }
    }
    // legs and shoes
    const hipY = -B.leg - 0.3 + dy, hx = Math.min(2.5, B.ww * 0.38), seg = (B.leg + 0.9) / 2 + 0.2;
    const leg = (hxx, foot, bend) => {
      const shorts = pst === 7, e = limb(hxx, hipY, foot[0], foot[1] - 1.5, seg, bend, 2.8, shorts ? 2 : pst === 8 ? 3.3 : 2.6, pants, shorts ? skin : pants);
      if (shorts) line([[e[0] - 0.9, e[1] - 0.5], [e[0] + 0.9, e[1] - 0.5]], 0.9, "#fff");
      if (pst === 6) { g.save(); g.globalAlpha = 0.55; [0.3, 0.7].forEach(f => { line([[hxx + (e[2] - hxx) * f - 1.2, hipY + (e[3] - hipY) * f], [hxx + (e[2] - hxx) * f + 1.2, hipY + (e[3] - hipY) * f]], 0.35, "#ffd23c"); line([[e[2] + (e[0] - e[2]) * f - 1.1, e[3] + (e[1] - e[3]) * f], [e[2] + (e[0] - e[2]) * f + 1.1, e[3] + (e[1] - e[3]) * f]], 0.35, "#ffd23c"); }); line([[hxx, hipY], [e[2], e[3]], [e[0], e[1]]], 0.3, "#1b2338"); g.restore(); }
      if (pst === 9) { dot(e[2] - 0.5, e[3] - 0.6, 0.3, "#fff8c8"); dot((hxx + e[2]) / 2 + 0.5, (hipY + e[3]) / 2, 0.25, "#fff8c8"); }
    };
    leg(-hx, footL, 0.3); leg(hx, footR, -0.3);
    const shoe = f => {
      const out = f[0] < 0 ? -1 : 1, fy = f[1];
      g.beginPath(); g.roundRect(f[0] - 2.5 + (back ? 0 : out * 0.5), fy - 0.5, 5, 0.85, 0.3); fs("#3a2a1e");
      if (back) {
        ell(f[0], fy - 1.05, 2.3, 1.35, sho[0]);
        rr(f[0] - 0.75, fy - 2.3, 1.5, 1.7, 0.3, sho[1]);
        if (L[13] === 0) { g.fillStyle = "#fff"; g.font = "700 1.2px Fredoka, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("9", f[0], fy - 1.4); }
      } else {
        ell(f[0] + out * 0.5, fy - 1.05, 2.6, 1.35, sho[0]);
        g.save(); g.beginPath(); g.ellipse(f[0] + out * 0.5, fy - 1.05, 2.6, 1.35, 0, 0, TAU); g.clip();
        g.fillStyle = sho[1]; g.fillRect(f[0] + out * 1.3 - (out < 0 ? 2.4 : 0), fy - 2.6, 2.4, 3);
        g.fillStyle = sho[2]; g.fillRect(f[0] - out * 2.2 - (out < 0 ? 0 : 1.3), fy - 2.6, 1.3, 3);
        g.restore();
        g.beginPath(); g.ellipse(f[0] + out * 0.5, fy - 1.05, 2.6, 1.35, 0, 0, TAU); g.stroke();
        line([[f[0] - 0.5, fy - 1.9], [f[0] + 0.5, fy - 1.6]], 0.28, "#fff"); line([[f[0] - 0.5, fy - 1.5], [f[0] + 0.5, fy - 1.2]], 0.28, "#fff");
      }
    };
    shoe(footL); shoe(footR);
    rr(-B.ww * 0.8, hipY - 1.4, B.ww * 1.6, 3, 1.2, pants);
    // arms: a short sleeve to the elbow, then forearm and hand
    const arm = (sgn, hand, bend) => {
      const e = limb(sgn * (B.sw - 0.5), S0 + 1.1, sgn * hand[0] * (sgn === side ? 1 : -1), S0 + hand[1], B.arm, -sgn * bend, 3, 2.1, shirt, skin);
      const cx = e[2], cy = e[3], ux = cx - sgn * (B.sw - 0.5), uy = cy - (S0 + 1.1), ul = Math.hypot(ux, uy) || 1;
      line([[cx - ux / ul * 0.9 - uy / ul * 1.5, cy - uy / ul * 0.9 + ux / ul * 1.5], [cx - ux / ul * 0.9 + uy / ul * 1.5, cy - uy / ul * 0.9 - ux / ul * 1.5]], 0.75, trim);
      const fx = e[0] - cx, fy = e[1] - cy, fl = Math.hypot(fx, fy) || 1;
      ell(e[0] + fx / fl * 0.5, e[1] + fy / fl * 0.5, 1.5, 1.35, skin, Math.atan2(fy, fx));
      ell(e[0] + fx / fl * 0.2 - fy / fl * 1.1 * sgn, e[1] + fy / fl * 0.2 + fx / fl * 1.1 * sgn, 0.62, 0.5, skin);
      return e;
    };
    const armO = () => arm(-side, handO, -bendO);
    const armB = () => arm(side, handB, bendB);
    if (act === "address") { armO(); armB(); }
    // neck, then the shirt
    rr(-1.5, S0 - 2.6, 3, 3.2, 0.8, skin);
    torso(); fs(shirt);
    g.save(); torso(); g.clip();
    const pat = L[12], tp = S0 - 1.4;
    if (pat === 0) { g.fillStyle = trim; if (back) { g.fillRect(-W, tp, W * 2, 3.1); g.fillRect(-W, hem - 1.5, W * 2, 0.8); } else { g.fillRect(-W, tp, W - B.sw * 0.3, B.th + 4); g.fillRect(-W, hem - 1.5, W * 2, 0.8); } }
    else if (pat === 2) { g.fillStyle = trim; for (let px = -W; px < W; px += 1.5) g.fillRect(px, tp, 0.32, B.th + 4); }
    else if (pat === 3) { [["#ff7a1a", 1], ["#ffd23c", 0.6]].forEach(([c, k]) => { g.fillStyle = c; g.beginPath(); g.moveTo(-W, hem + 1); for (let i = 0; i <= 8; i++) { const px = -W + i * W / 4; g.lineTo(px - W / 16, hem - (2.2 + ((i * 7) % 4) * 1.2) * k); g.lineTo(px + W / 16, hem - 0.8 * k); } g.lineTo(W, hem + 1); g.closePath(); g.fill(); }); }
    else if (pat === 4) { for (let i = 0; i < 9; i++) { const fx = -B.ww + ((i * 4.7) % (B.ww * 2)), fy = tp + 2.4 + ((i * 3.1) % (B.th - 1.5)); for (let k = 0; k < 5; k++) dot(fx + Math.cos(k * TAU / 5) * 0.75, fy + Math.sin(k * TAU / 5) * 0.75, 0.55, i % 2 ? trim : "#fff"); dot(fx, fy, 0.4, "#ffd23c"); } }
    else if (pat === 5) { for (let i = -3; i <= 3; i++) { g.fillStyle = i % 2 ? trim : "rgba(255,255,255,0.75)"; g.beginPath(); g.moveTo(i * 2.6, mid - 2.2); g.lineTo(i * 2.6 + 1.3, mid); g.lineTo(i * 2.6, mid + 2.2); g.lineTo(i * 2.6 - 1.3, mid); g.closePath(); g.fill(); } g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 0.18; g.beginPath(); for (let i = -4; i <= 4; i++) { g.moveTo(i * 2.6 - 1.3, mid - 2.2); g.lineTo(i * 2.6 + 1.3, mid + 2.2); g.moveTo(i * 2.6 + 1.3, mid - 2.2); g.lineTo(i * 2.6 - 1.3, mid + 2.2); } g.stroke(); g.strokeStyle = INK; g.lineWidth = 0.42; }
    else if (pat === 6) { for (let r0 = 0; r0 < 6; r0++) for (let c0 = -4; c0 <= 4; c0++) dot(c0 * 2.1 + (r0 % 2) * 1.05, tp + 1.4 + r0 * 2, 0.5, trim); }
    else if (pat === 7) { g.fillStyle = trim; g.fillRect(-W, tp + 1.2, W * 2, 0.7); g.fillRect(-W, tp + 2.4, W * 2, 0.35); g.fillRect(-W, hem - 1.4, W * 2, 0.7); }
    else if (pat === 8 && !back) { g.fillStyle = "#fffdf6"; g.beginPath(); g.moveTo(-2.6, tp); g.lineTo(2.6, tp); g.lineTo(0.9, hem); g.lineTo(-0.9, hem); g.closePath(); g.fill(); }
    else if (pat === 8) { line([[0, mid], [0, hem]], 0.3); }
    const shade = g.createLinearGradient(-W, 0, W, 0); shade.addColorStop(0, "rgba(255,255,255,0.16)"); shade.addColorStop(0.5, "rgba(0,0,0,0)"); shade.addColorStop(1, "rgba(0,0,0,0.22)");
    g.fillStyle = shade; g.fillRect(-W, tp, W * 2, B.th + 4);
    g.fillStyle = "rgba(0,0,0,0.12)"; g.beginPath(); g.ellipse(0, hem + 0.6, B.ww, 1.6, 0, 0, TAU); g.fill();
    g.restore();
    torso(); g.stroke();
    const num = String(pose.num || (L.reduce((p, c) => p + c, 0) % 89) + 10);
    if (back) {
      g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = pat === 0 ? shirt : trim;
      g.font = "700 " + (pat === 7 ? 2.6 : 3.2) + "px Fredoka, Arial";
      if (pat !== 8) g.fillText(String(pose.tag || "").slice(0, 4).toUpperCase(), 0, pat === 0 ? tp + 1.75 : tp + 3.6);
      g.fillStyle = trim;
      if (pat === 7) { g.font = "700 5.2px Fredoka, Arial"; g.fillText(num, 0, mid + 1.4); }
      else if (pat === 9) { poly([[0.9, mid - 2.6], [-1.6, mid + 0.9], [-0.1, mid + 0.9], [-0.9, mid + 3.8], [1.7, mid + 0.1], [0.2, mid + 0.1]], "#ffd23c"); }
      else if (pat === 0 || pat === 1) { g.save(); g.translate(0, mid + 1.6); g.scale(0.34, 0.34); g.fillStyle = "#fffdf6"; g.fill(PIN); g.lineWidth = 0.9; g.stroke(PIN); g.restore(); g.lineWidth = 0.42; dot(2.4, mid + 0.6, 1.25, trim); g.beginPath(); g.arc(2.4, mid + 0.6, 1.25, 0, TAU); g.stroke(); }
    } else {
      if (pat === 7) { g.strokeStyle = trim; g.lineWidth = 0.9; g.beginPath(); g.arc(0, S0 - 1.1, 2.4, 0.15, Math.PI - 0.15); g.stroke(); g.strokeStyle = INK; g.lineWidth = 0.42; g.fillStyle = trim; g.font = "700 5px Fredoka, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(num, 0, mid + 0.6); }
      else if (pat === 8) { [mid - 1.6, mid + 0.4, mid + 2.4].forEach(by => dot(0, by, 0.34, INK)); poly([[0, S0 + 0.9], [-2, S0 - 0.1], [-2, S0 + 1.9]], "#15161c"); poly([[0, S0 + 0.9], [2, S0 - 0.1], [2, S0 + 1.9]], "#15161c"); }
      else {
        const col = pat === 0 ? shirt : "#fffdf6";
        poly([[-3.1, S0 - 1.4], [-0.2, S0 + 1.9], [-0.1, S0 - 0.9]], col); poly([[3.1, S0 - 1.4], [0.2, S0 + 1.9], [0.1, S0 - 0.9]], col);
        if (pat !== 9) { line([[0.15, S0 + 1.9], [0.15, hem - 0.4]], 0.22); [mid - 1.2, mid + 0.8, mid + 2.8].forEach(by => dot(0.95, by, 0.3, INK)); }
        if (pat === 9) poly([[0.9, mid - 2.2], [-1.6, mid + 1.3], [-0.1, mid + 1.3], [-0.9, mid + 4.2], [1.7, mid + 0.5], [0.2, mid + 0.5]], "#ffd23c");
        else if (pat === 0 || pat === 1) { ell(B.sw * 0.5, S0 + 3.4, 1.5, 0.95, "#fffdf6"); g.fillStyle = INK; g.font = "700 1.1px Fredoka, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(pose.tag || "YB").slice(0, 3).toUpperCase(), B.sw * 0.5, S0 + 3.45); }
      }
    }
    // neckwear
    const nk = L[14];
    if (!back) {
      if (nk === 1) { poly([[0, S0 + 0.6], [-2.2, S0 - 0.6], [-2.2, S0 + 1.8]], "#d1383f"); poly([[0, S0 + 0.6], [2.2, S0 - 0.6], [2.2, S0 + 1.8]], "#d1383f"); dot(0, S0 + 0.6, 0.6, "#a3262c"); }
      if (nk === 2) { poly([[-0.8, S0 + 0.2], [0.8, S0 + 0.2], [1.3, mid + 2.2], [0, mid + 3.6], [-1.3, mid + 2.2]], trim === shirt ? "#d1383f" : "#d1383f"); line([[-0.9, S0 + 2.2], [0.9, S0 + 3.4]], 0.3, "#ffd23c"); line([[-1, S0 + 4.6], [1, S0 + 5.8]], 0.3, "#ffd23c"); }
      if (nk === 3) { g.strokeStyle = "#e6b422"; g.lineWidth = 0.6; g.beginPath(); g.arc(0, S0 - 0.6, 3.4, 0.25, Math.PI - 0.25); g.stroke(); g.strokeStyle = INK; g.lineWidth = 0.42; ell(0, S0 + 3.4, 1.15, 1.15, "#ffd23c"); g.fillStyle = INK; g.font = "700 1.5px Fredoka, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$", 0, S0 + 3.5); }
      if (nk === 4) { rr(-3.4, S0 - 1.6, 6.8, 2, 0.9, "#2f8fd8"); poly([[1, S0 + 0.2], [3.2, S0 + 0.2], [3.6, S0 + 6], [1.4, S0 + 6]], "#2f8fd8"); line([[1.5, S0 + 2.2], [3.3, S0 + 2.2]], 0.5, "#fff"); line([[1.6, S0 + 4.2], [3.4, S0 + 4.2]], 0.5, "#fff"); }
      if (nk === 5) { dot(-2.6, S0 + 0.3, 0.75, "#ffd23c"); dot(2.6, S0 + 0.3, 0.75, "#ffd23c"); line([[-2.6, S0 + 0.3], [2.6, S0 + 0.3]], 0.4, "#ffd23c"); }
      if (nk === 6) { poly([[-2.4, S0 - 1], [-1.1, S0 - 1], [0.4, S0 + 3.6], [-0.4, S0 + 3.6]], "#2f8fd8"); poly([[2.4, S0 - 1], [1.1, S0 - 1], [-0.4, S0 + 3.6], [0.4, S0 + 3.6]], "#d1383f"); ell(0, S0 + 4.6, 1.4, 1.4, "#ffd23c"); star(0, S0 + 4.6, 0.8, "#fff8c8"); }
      if (nk === 7) { for (let i = 0; i <= 8; i++) { const an = 0.2 + i * (Math.PI - 0.4) / 8; dot(Math.cos(an) * 3.9, S0 - 0.8 + Math.sin(an) * 3.6, 0.85, ["#ff5fa2", "#ffd23c", "#fff", "#ff8a3c"][i % 4]); g.beginPath(); g.arc(Math.cos(an) * 3.9, S0 - 0.8 + Math.sin(an) * 3.6, 0.85, 0, TAU); g.stroke(); } }
    } else if (nk === 4) { rr(-3.4, S0 - 1.8, 6.8, 2, 0.9, "#2f8fd8"); }
    else if (nk === 3) { g.strokeStyle = "#e6b422"; g.lineWidth = 0.5; g.beginPath(); g.arc(0, S0 - 1.6, 2.6, 0.3, Math.PI - 0.3); g.stroke(); g.strokeStyle = INK; g.lineWidth = 0.42; }
    else if (nk === 7) { for (let i = 0; i <= 5; i++) { const an = 0.4 + i * (Math.PI - 0.8) / 5; dot(Math.cos(an) * 3.4, S0 - 1.6 + Math.sin(an) * 1.6, 0.8, ["#ff5fa2", "#ffd23c", "#fff"][i % 3]); } }

    // head
    const full = hat === 4, under = COVERS[hat], hs = under && (hstyle === 2 || hstyle === 5 || hstyle === 6 || hstyle === 8 || hstyle === 10) ? 1 : hstyle;
    ell(-hr * 1.02, hy + 0.5, 1.05, 1.45, skin); ell(hr * 1.02, hy + 0.5, 1.05, 1.45, skin);
    if (!back) { g.lineWidth = 0.25; g.beginPath(); g.arc(-hr * 1.02, hy + 0.5, 0.55, 1.2, 4.2); g.stroke(); g.beginPath(); g.arc(hr * 1.02, hy + 0.5, 0.55, -1.1, 1.9); g.stroke(); g.lineWidth = 0.42; }
    ell(0, hy, hr * 1.04, hr, skin);
    g.save(); g.beginPath(); g.ellipse(0, hy, hr * 1.04, hr, 0, 0, TAU); g.clip();
    g.fillStyle = "rgba(255,255,255,0.22)"; g.beginPath(); g.ellipse(-hr * 0.35, hy - hr * 0.45, hr * 0.5, hr * 0.32, -0.5, 0, TAU); g.fill();
    g.fillStyle = skinD; g.globalAlpha = 0.45; g.beginPath(); g.ellipse(hr * 0.95, hy + hr * 0.2, hr * 0.5, hr, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
    if (!back && L[11] === 5) { g.fillStyle = "rgba(20,20,30,0.2)"; g.fillRect(-hr * 1.1, hy + hr * 0.3, hr * 2.2, hr); }
    if (!back && L[11] === 4) { g.fillStyle = hairC; g.beginPath(); g.moveTo(-hr * 1.1, hy - 0.4); g.quadraticCurveTo(-hr * 0.7, hy + hr * 0.35, 0, hy + hr * 0.3); g.quadraticCurveTo(hr * 0.7, hy + hr * 0.35, hr * 1.1, hy - 0.4); g.lineTo(hr * 1.1, hy + hr + 1); g.lineTo(-hr * 1.1, hy + hr + 1); g.closePath(); g.fill(); g.stroke(); }
    if (!full && hs) {
      g.fillStyle = hairC;
      if (back) {
        if (hs === 5) g.fillRect(-1.3, top, 2.6, hr * 2);
        else if (hs === 11) g.fillRect(-hr * 1.1, top, hr * 2.2, hr * 1.25);
        else g.fillRect(-hr * 1.1, top, hr * 2.2, hr * (hs === 2 ? 1.35 : 1.62));
      } else if (hs === 11) { g.fillRect(-hr * 1.1, top, hr * 2.2, hr * 0.86); }
      else if (hs === 1 || hs === 3 || hs === 9) { g.beginPath(); g.moveTo(-hr * 1.1, top); g.lineTo(hr * 1.1, top); g.lineTo(hr * 1.1, hy - hr * 0.2); g.quadraticCurveTo(hr * 0.5, hy - hr * 0.75, -hr * 0.2, hy - hr * 0.5); g.quadraticCurveTo(-hr * 0.7, hy - hr * 0.35, -hr * 1.1, hy - hr * 0.05); g.closePath(); g.fill(); g.stroke(); }
      else if (hs === 7) { g.beginPath(); g.moveTo(-hr * 1.1, top); g.lineTo(hr * 1.1, top); g.lineTo(hr * 1.1, hy + hr * 0.5); g.quadraticCurveTo(hr * 0.72, hy - hr * 0.3, 0.3, hy - hr * 0.72); g.quadraticCurveTo(-hr * 0.72, hy - hr * 0.3, -hr * 1.1, hy + hr * 0.5); g.closePath(); g.fill(); g.stroke(); }
      else if (hs === 4 || hs === 2 || hs === 8 || hs === 6 || hs === 10) { g.beginPath(); g.moveTo(-hr * 1.1, top); g.lineTo(hr * 1.1, top); g.lineTo(hr * 1.1, hy - hr * 0.3); g.quadraticCurveTo(0, hy - hr * 0.78, -hr * 1.1, hy - hr * 0.3); g.closePath(); g.fill(); g.stroke(); }
    }
    g.restore();
    g.beginPath(); g.ellipse(0, hy, hr * 1.04, hr, 0, 0, TAU); g.stroke();
    // hair that stands up off the head, or hangs down the back
    if (!full) {
      if (hstyle === 0) { g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 0.5; g.beginPath(); g.arc(-hr * 0.3, hy - hr * 0.3, hr * 0.5, 3.6, 4.6); g.stroke(); g.strokeStyle = INK; g.lineWidth = 0.42; }
      if (hs === 2) poly([[-hr * 0.95, hy - hr * 0.5], [-hr * 0.8, top - 2.6], [-hr * 0.4, top - 0.4], [-hr * 0.1, top - 3.4], [hr * 0.25, top - 0.5], [hr * 0.6, top - 2.9], [hr * 0.95, hy - hr * 0.5], [hr * 0.6, top + 0.7], [0, top + 0.2], [-hr * 0.6, top + 0.7]], hairC);
      if (hs === 5) { g.beginPath(); g.moveTo(-1.3, top + (back ? hr * 1.7 : 1.4)); g.lineTo(-1.5, top - 2); [[-1, -3.6], [-0.5, -2.6], [0, -4.2], [0.5, -2.6], [1, -3.6], [1.5, -2]].forEach(([px, py]) => g.lineTo(px, top + py)); g.lineTo(1.3, top + (back ? hr * 1.7 : 1.4)); g.closePath(); fs(hairC); }
      if (hs === 6) { g.beginPath(); g.moveTo(-hr * 0.95, hy - hr * 0.45); g.bezierCurveTo(-hr * 1.3, top - 4.6, hr * 0.5, top - 5.2, hr * 1.0, top - 1.6); g.quadraticCurveTo(hr * 1.2, hy - hr * 0.6, hr * 0.9, hy - hr * 0.4); g.quadraticCurveTo(0, hy - hr * 0.95, -hr * 0.95, hy - hr * 0.45); g.closePath(); fs(hairC); g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = 0.45; g.beginPath(); g.moveTo(-hr * 0.5, top - 1.4); g.quadraticCurveTo(0, top - 3.6, hr * 0.5, top - 2.2); g.stroke(); g.strokeStyle = INK; g.lineWidth = 0.42; }
      if (hs === 10) [[-0.82, -0.52], [-0.5, -0.92], [0, -1.08], [0.5, -0.92], [0.82, -0.52], [-0.25, -0.72], [0.25, -0.72]].forEach(([px, py]) => ell(px * hr, hy + py * hr, 1.75, 1.75, hairC));
      if (hs === 8 && back) { ell(-hr * 0.8, top + 0.2, 2.3, 2.3, hairC); ell(hr * 0.8, top + 0.2, 2.3, 2.3, hairC); }
      if (hs === 4 && back) ell(0, hy - 0.9, hr * 1.4, hr * 1.3, hairC);
      if (hs === 11 && !back) { line([[-hr * 1.02, hy - hr * 0.14], [hr * 1.02, hy - hr * 0.14]], 0.42); g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = 0.5; g.beginPath(); g.arc(0, hy - hr * 0.2, hr * 0.7, 3.7, 5.2); g.stroke(); g.strokeStyle = INK; g.lineWidth = 0.42; }
    }
    if (back) {
      if (hstyle === 7) { g.beginPath(); g.moveTo(-hr - 0.6, hy - 1.5); g.quadraticCurveTo(-hr - 2, hy + hr + 2, -hr - 0.4, hy + hr + 5.4); g.quadraticCurveTo(0, hy + hr + 6.6, hr + 0.4, hy + hr + 5.4); g.quadraticCurveTo(hr + 2, hy + hr + 2, hr + 0.6, hy - 1.5); g.quadraticCurveTo(0, hy - hr * 0.2, -hr - 0.6, hy - 1.5); g.closePath(); fs(hairC); line([[-1.5, hy + 1], [-1.8, hy + hr + 4.6]], 0.3, hairD); line([[1.5, hy + 1], [1.8, hy + hr + 4.6]], 0.3, hairD); }
      if (hstyle === 9) { g.beginPath(); g.moveTo(-hr * 0.8, hy + hr * 0.3); g.quadraticCurveTo(-hr - 0.8, hy + hr + 2.4, -2.2, hy + hr + 4.6); g.quadraticCurveTo(0, hy + hr + 5.6, 2.2, hy + hr + 4.6); g.quadraticCurveTo(hr + 0.8, hy + hr + 2.4, hr * 0.8, hy + hr * 0.3); g.closePath(); fs(hairC); }
      if (hstyle === 3) { g.beginPath(); g.moveTo(-1.2, hy - 0.6); g.quadraticCurveTo(-2.8, hy + 4, -0.9, hy + hr + 5); g.quadraticCurveTo(0, hy + hr + 6, 0.9, hy + hr + 5); g.quadraticCurveTo(2.8, hy + 4, 1.2, hy - 0.6); g.closePath(); fs(hairC); rr(-1.4, hy - 1.3, 2.8, 1.1, 0.4, "#ff5fa2"); }
    }
    // the face
    if (!back) {
      const ey = hy - hr * 0.04, ex = hr * 0.38, blink = Math.sin(t * 0.9 + L[1] * 2 + L[4]) > 0.985, cyc = L[4] === 5;
      g.fillStyle = "rgba(255,110,110,0.32)"; g.beginPath(); g.ellipse(-hr * 0.62, hy + hr * 0.34, 1.05, 0.62, 0, 0, TAU); g.ellipse(hr * 0.62, hy + hr * 0.34, 1.05, 0.62, 0, 0, TAU); g.fill();
      const eyeAt = (cx, big) => {
        if (mood === 1 || blink) { g.lineWidth = 0.5; g.beginPath(); g.arc(cx, ey + 0.4, 1 * big, Math.PI + 0.2, TAU - 0.2); g.stroke(); g.lineWidth = 0.42; return; }
        if (mood === 2) { ell(cx, ey, 1.3 * big, 1.55 * big, "#fff"); dot(cx, ey, 0.4, INK); return; }
        const st = L[4];
        if (st === 1) { const b2 = cx < 0 ? 1.5 : 1.15; ell(cx, ey, b2, b2 * 1.1, "#fff"); dot(cx + (cx < 0 ? 0.45 : -0.3), ey + (cx < 0 ? 0.35 : -0.3), 0.5, INK); return; }
        ell(cx, ey, 1.08 * big, 1.3 * big, "#fff");
        dot(cx + 0.12, ey + 0.12, 0.72 * big, st === 4 ? "#7b4bc4" : cyc ? "#2f8fd8" : "#3a2a1e"); dot(cx + 0.12, ey + 0.12, 0.36 * big, INK); dot(cx - 0.2, ey - 0.28, 0.24 * big, "#fff");
        if (st === 4) dot(cx + 0.4, ey + 0.42, 0.14 * big, "#fff");
        if (st === 2) { g.save(); g.beginPath(); g.ellipse(cx, ey, 1.08 * big, 1.3 * big, 0, 0, TAU); g.clip(); g.fillStyle = skinD; g.fillRect(cx - 2, ey - 2, 4, 1.9); g.restore(); line([[cx - 1.1, ey - 0.1], [cx + 1.1, ey - 0.1]], 0.42); }
      };
      if (cyc) eyeAt(0, 1.75); else { eyeAt(-ex, 1); eyeAt(ex, 1); }
      // brows
      g.lineWidth = 0.6; g.strokeStyle = hstyle === 0 ? skinD : hairD; g.beginPath();
      const bw = cyc ? 1.9 : 1.1, by0 = ey - (cyc ? 2.9 : 2), tilt = mood === -1 ? 0.5 : L[4] === 3 && mood !== 1 ? -0.5 : mood === 2 ? 0 : 0.08;
      if (cyc) { g.moveTo(-bw, by0 + (tilt < 0 ? 0 : 0.2)); g.quadraticCurveTo(0, by0 - 0.7 + tilt, bw, by0 + (tilt < 0 ? 0 : 0.2)); }
      else { g.moveTo(-ex - bw, by0 + tilt * 1); g.lineTo(-ex + bw, by0 - tilt); g.moveTo(ex + bw, by0 + tilt); g.lineTo(ex - bw, by0 - tilt); }
      if (mood === 2) { g.translate(0, -0.5); }
      g.stroke(); if (mood === 2) g.translate(0, 0.5);
      g.strokeStyle = INK; g.lineWidth = 0.42;
      // nose
      g.beginPath(); g.moveTo(-0.2, hy + hr * 0.12); g.quadraticCurveTo(1, hy + hr * 0.3, -0.1, hy + hr * 0.36); g.stroke();
      // facial hair that goes under the mouth
      const my = hy + hr * 0.56, bd = L[11];
      if (bd === 3) { g.beginPath(); g.moveTo(-1.3, my + 0.6); g.quadraticCurveTo(0, my + 3.4, 1.3, my + 0.6); g.quadraticCurveTo(0, my + 1.4, -1.3, my + 0.6); g.closePath(); fs(hairC); }
      // mouth
      if (mood === -1) { g.beginPath(); g.arc(0, my + 1.3, 1.5, Math.PI + 0.4, TAU - 0.4); g.stroke(); }
      else if (mood === 2) ell(0, my + 0.2, 0.95, 1.25, "#5a1220");
      else if (mood === 1 || L[5] === 1) { g.beginPath(); g.moveTo(-2.2, my - 0.5); g.quadraticCurveTo(0, my + 2.7, 2.2, my - 0.5); g.closePath(); fs(mood === 1 ? "#5a1220" : "#fff"); if (mood === 1) { g.fillStyle = "#fff"; g.fillRect(-1.35, my - 0.45, 2.7, 0.55); dot(0, my + 0.9, 0.6, "#f0556a"); } else line([[-1.6, my + 0.2], [1.6, my + 0.2]], 0.2); }
      else if (L[5] === 2) line([[-1.4, my], [1.4, my]], 0.42);
      else if (L[5] === 5) { g.beginPath(); g.moveTo(-1.4, my + 0.2); g.quadraticCurveTo(0.4, my + 0.7, 1.8, my - 0.7); g.stroke(); }
      else { g.beginPath(); g.arc(0, my - 0.8, 1.7, 0.35, Math.PI - 0.35); g.stroke(); if (L[5] === 3) ell(0.3, my + 1.05, 0.8, 0.95, "#f0556a"); if (L[5] === 4) { rr(-0.9, my + 0.75, 0.85, 1.05, 0.15, "#fff"); rr(0.05, my + 0.75, 0.85, 1.05, 0.15, "#fff"); } }
      // facial hair over the lip
      if (bd === 1 || bd === 3 || L[9] === 7) { g.beginPath(); g.moveTo(0, my - 1.5); g.quadraticCurveTo(-1.3, my - 2, -2.3, my - 0.9); g.quadraticCurveTo(-1.1, my - 0.5, 0, my - 1); g.quadraticCurveTo(1.1, my - 0.5, 2.3, my - 0.9); g.quadraticCurveTo(1.3, my - 2, 0, my - 1.5); g.closePath(); fs(L[9] === 7 && !bd ? "#23232c" : hairC); }
      if (bd === 2) { g.lineWidth = 0.9; g.strokeStyle = INK; g.beginPath(); g.moveTo(0, my - 1.2); g.quadraticCurveTo(-2.2, my - 0.4, -3.2, my - 2); g.moveTo(0, my - 1.2); g.quadraticCurveTo(2.2, my - 0.4, 3.2, my - 2); g.stroke(); g.lineWidth = 0.5; g.strokeStyle = hairC; g.stroke(); g.strokeStyle = INK; g.lineWidth = 0.42; }
      // glasses
      const sp = L[9];
      if (sp === 1) { g.lineWidth = 0.45; g.fillStyle = "rgba(200,230,255,0.45)"; [-ex, ex].forEach(cx => { g.beginPath(); g.arc(cx, ey, 1.75, 0, TAU); g.fill(); g.stroke(); }); line([[-0.25, ey], [0.25, ey]], 0.45); }
      if (sp === 2) { g.fillStyle = "#15161c"; g.beginPath(); g.roundRect(-ex - 1.9, ey - 1.25, 3.5, 2.4, 0.8); g.roundRect(ex - 1.6, ey - 1.25, 3.5, 2.4, 0.8); g.fill(); g.stroke(); line([[-0.4, ey - 0.6], [0.4, ey - 0.6]], 0.42); line([[-ex - 1.9, ey - 0.6], [-hr, ey - 0.9]], 0.42); line([[ex + 1.9, ey - 0.6], [hr, ey - 0.9]], 0.42); g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(-ex - 1.2, ey - 0.8, 0.9, 0.4); g.fillRect(ex - 0.9, ey - 0.8, 0.9, 0.4); }
      if (sp === 3) { g.fillStyle = "rgba(200,230,255,0.5)"; g.beginPath(); g.arc(ex, ey, 1.8, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.moveTo(ex + 1.5, ey + 0.9); g.quadraticCurveTo(ex + 3, ey + 4, ex + 1.8, ey + 6.8); g.stroke(); }
      if (sp === 4) { rr(-ex - 2, ey - 1.4, ex * 2 + 4, 2.8, 0.5, "#fff"); g.fillStyle = "#e0262d"; g.fillRect(-ex - 1.4, ey - 0.9, 2.8, 1.8); g.fillStyle = "#19b5d8"; g.fillRect(ex - 1.4, ey - 0.9, 2.8, 1.8); }
      if (sp === 5) { star(-ex, ey, 2.2, "#ffd23c"); star(ex, ey, 2.2, "#ffd23c"); line([[-0.4, ey], [0.4, ey]], 0.42); }
      if (sp === 6) { line([[-hr * 0.98, ey - 1.9], [hr * 0.98, ey + 0.3]], 0.42); g.beginPath(); g.moveTo(ex - 1.6, ey - 1.3); g.lineTo(ex + 1.6, ey - 1.3); g.quadraticCurveTo(ex + 1.5, ey + 1.9, ex, ey + 1.9); g.quadraticCurveTo(ex - 1.5, ey + 1.9, ex - 1.6, ey - 1.3); g.closePath(); fs("#15161c"); }
      if (sp === 7) { g.lineWidth = 0.6; [-ex, ex].forEach(cx => { g.beginPath(); g.arc(cx, ey, 1.75, 0, TAU); g.stroke(); }); line([[-0.3, ey - 0.4], [0.3, ey - 0.4]], 0.6); g.lineWidth = 0.42; ell(0.1, ey + 1.7, 1.25, 1.55, "#f7b79a"); line([[-ex - 1.5, ey - 2.2], [-ex + 1.5, ey - 2.2]], 1.1, "#23232c"); line([[ex - 1.5, ey - 2.2], [ex + 1.5, ey - 2.2]], 1.1, "#23232c"); }
    } else if (L[9] && L[9] !== 3) { line([[-hr * 1.02, hy - 0.5], [-hr + 1.2, hy - 0.7]], 0.42); line([[hr * 1.02, hy - 0.5], [hr - 1.2, hy - 0.7]], 0.42); if (L[9] === 6) line([[-hr * 0.98, hy - 1.6], [hr * 0.98, hy + 0.2]], 0.42); }
    // hats
    if (hat === 1) { g.beginPath(); g.arc(0, hy - 1, hr + 0.3, Math.PI, TAU); g.closePath(); fs("#d1383f"); if (back) rr(-1.7, hy - 1.7, 3.4, 1.3, 0.5, "#a3262c"); else { g.beginPath(); g.ellipse(0, hy - 1, hr + 1.6, 1.1, 0, 0, Math.PI, true); g.closePath(); fs("#a3262c"); ell(0, hy - 2.9, 1.3, 1, "#fffdf6"); } ell(0, top - 0.1, 0.6, 0.45, "#a3262c"); }
    if (hat === 2) { g.beginPath(); g.arc(0, hy - 0.6, hr + 0.35, Math.PI, TAU); g.closePath(); fs("#2f7d48"); for (let i = -2; i <= 2; i++) line([[i * 1.7, hy - 1.6], [i * 1.5, top + 0.4]], 0.25, "#1f5a32"); rr(-hr - 0.5, hy - 1.6, hr * 2 + 1, 1.7, 0.6, "#f2e9c8"); ell(0, top - 0.8, 1.3, 1.3, "#f2e9c8"); }
    if (hat === 3) { ell(0, hy - 2.5, hr + 3.9, 1.7, "#9c6b3a"); g.beginPath(); g.moveTo(-3.7, hy - 2.7); g.quadraticCurveTo(-3.9, top - 4.1, -1.3, top - 3.3); g.quadraticCurveTo(0, top - 2.2, 1.3, top - 3.3); g.quadraticCurveTo(3.9, top - 4.1, 3.7, hy - 2.7); g.closePath(); fs("#b98247"); g.fillStyle = "#4a2d14"; g.fillRect(-3.6, hy - 3.9, 7.2, 0.95); if (!back) star(0, hy - 3.4, 0.75, "#ffd23c"); }
    if (hat === 4) { g.beginPath(); g.arc(0, hy - 0.2, hr + 0.85, Math.PI * 0.92, TAU + Math.PI * 0.08); g.closePath(); fs("#ffd200"); g.fillStyle = "#22407a"; g.fillRect(-0.9, top - 1, 1.8, back ? hr * 1.9 : hr * 0.9); g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.ellipse(-hr * 0.5, hy - hr * 0.6, 1.3, 0.6, -0.6, 0, TAU); g.fill(); if (!back) { g.lineWidth = 0.6; g.strokeStyle = "#8a8f9c"; g.beginPath(); g.moveTo(-hr - 0.4, hy + 1); g.quadraticCurveTo(0, hy + 5.9, hr + 0.4, hy + 1); g.moveTo(-hr, hy + 2.4); g.quadraticCurveTo(0, hy + 3.9, hr, hy + 2.4); g.moveTo(0, hy + 2.6); g.lineTo(0, hy + 4.6); g.stroke(); g.lineWidth = 0.42; g.strokeStyle = INK; } }
    if (hat === 5) { poly([[-3.9, top + 1.4], [-4.3, top - 3.3], [-2.1, top - 0.9], [0, top - 4.2], [2.1, top - 0.9], [4.3, top - 3.3], [3.9, top + 1.4]], "#ffd23c"); dot(0, top - 0.2, 0.7, "#d1383f"); dot(-2.4, top + 0.4, 0.42, "#35e0d0"); dot(2.4, top + 0.4, 0.42, "#35e0d0"); dot(-4.3, top - 3.3, 0.5, "#fff8c8"); dot(0, top - 4.2, 0.5, "#fff8c8"); dot(4.3, top - 3.3, 0.5, "#fff8c8"); }
    if (hat === 6) { poly([[-3.5, top + 1.3], [-0.8, top - 7.7], [0.8, top - 7.7], [3.5, top + 1.3]], "#ff7a1a"); g.fillStyle = "#fff"; g.beginPath(); g.moveTo(-2.45, top - 2.1); g.lineTo(2.45, top - 2.1); g.lineTo(1.85, top - 4.1); g.lineTo(-1.85, top - 4.1); g.closePath(); g.fill(); rr(-4.6, top + 0.6, 9.2, 1.4, 0.4, "#ff7a1a"); }
    if (hat === 7) { g.lineWidth = 0.65; g.beginPath(); g.moveTo(-1.9, top + 0.4); g.quadraticCurveTo(-3.2, top - 3, -3.8 + Math.sin(t * 5) * 0.4, top - 4.9); g.moveTo(1.9, top + 0.4); g.quadraticCurveTo(3.2, top - 3, 3.8 + Math.sin(t * 5 + 1) * 0.4, top - 4.9); g.stroke(); g.lineWidth = 0.42; ell(-3.9 + Math.sin(t * 5) * 0.4, top - 5.5, 1.2, 1.2, "#ffd23c"); ell(3.9 + Math.sin(t * 5 + 1) * 0.4, top - 5.5, 1.2, 1.2, "#ffd23c"); }
    if (hat === 8) { ell(0, hy - 2.9, hr + 1.9, 1.15, "#1c1d26"); rr(-3.5, top - 6.2, 7, 7.6, 0.5, "#1c1d26"); g.fillStyle = "#d1383f"; g.fillRect(-3.3, top - 0.6, 6.6, 1.3); g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(-2.9, top - 5.8, 1, 5); }
    if (hat === 9) { ell(0, hy - 2.8, hr + 2.6, 1.3, "#5d6470"); g.beginPath(); g.moveTo(-3.8, hy - 2.9); g.quadraticCurveTo(-4, top - 3.6, -1.6, top - 3.9); g.quadraticCurveTo(0, top - 2.9, 1.6, top - 3.9); g.quadraticCurveTo(4, top - 3.6, 3.8, hy - 2.9); g.closePath(); fs("#747c8a"); g.fillStyle = "#23232c"; g.fillRect(-3.7, hy - 4.1, 7.4, 1); }
    if (hat === 10) { g.beginPath(); g.arc(0, hy - 0.9, hr + 0.3, Math.PI, TAU); g.closePath(); fs("#2f8fd8"); g.save(); g.beginPath(); g.arc(0, hy - 0.9, hr + 0.3, Math.PI, TAU); g.clip(); ["#d1383f", "#ffd23c"].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, top - 0.8); g.lineTo((i ? 1 : -1) * hr * 0.3, hy); g.lineTo((i ? 1 : -1) * hr * 1.2, hy); g.closePath(); g.fill(); }); g.restore(); g.beginPath(); g.arc(0, hy - 0.9, hr + 0.3, Math.PI, TAU); g.closePath(); g.stroke(); line([[0, top - 0.3], [0, top - 2.2]], 0.5); const pw = Math.cos(t * 16); ell(-2.1 * pw, top - 2.3, Math.abs(2.1 * pw) + 0.25, 0.6, "#d1383f"); ell(2.1 * pw, top - 2.3, Math.abs(2.1 * pw) + 0.25, 0.6, "#ffd23c"); dot(0, top - 2.3, 0.5, INK); }
    if (hat === 11) { [-1, 1].forEach(sd => { g.beginPath(); g.moveTo(sd * (hr - 0.6), hy - 2.2); g.quadraticCurveTo(sd * (hr + 3.6), hy - 2.6, sd * (hr + 2.6), top - 4.6); g.quadraticCurveTo(sd * (hr + 1.4), hy - 3.6, sd * (hr - 1.6), hy - 3.4); g.closePath(); fs("#f2e9c8"); }); g.beginPath(); g.arc(0, hy - 1.2, hr + 0.4, Math.PI, TAU); g.closePath(); fs("#9aa0ad"); rr(-hr - 0.6, hy - 2, hr * 2 + 1.2, 1.5, 0.4, "#c9a227"); [-3, 0, 3].forEach(px => dot(px, hy - 1.25, 0.38, "#7a5e10")); if (!back) rr(-0.7, hy - 1.4, 1.4, 3.4, 0.4, "#9aa0ad"); }
    if (hat === 12) { [[-2.7, -3.4, 2.5], [2.7, -3.4, 2.5], [0, -4.6, 3]].forEach(([px, py, r0]) => ell(px, top + py, r0, r0, "#fffdf6")); g.fillStyle = "#fffdf6"; g.fillRect(-3.4, top - 3.6, 6.8, 3.4); rr(-3.9, top - 1.2, 7.8, 2.8, 0.5, "#fffdf6"); line([[-2, top - 0.9], [-2, top + 1.2]], 0.22, "#c9c5b8"); line([[0, top - 0.9], [0, top + 1.2]], 0.22, "#c9c5b8"); line([[2, top - 0.9], [2, top + 1.2]], 0.22, "#c9c5b8"); }
    if (hat === 13) { g.beginPath(); g.moveTo(-3.9, hy - 2.6); g.quadraticCurveTo(-1.4, top - 6.5, 1.2, top - 9.4); g.quadraticCurveTo(3.4, top - 10.6, 4.4, top - 8.2); g.quadraticCurveTo(2.6, top - 8.6, 2.4, top - 6.6); g.quadraticCurveTo(3.2, top - 2.4, 3.9, hy - 2.6); g.closePath(); fs("#5b2a86"); ell(0, hy - 2.6, hr + 3.2, 1.5, "#7b4bc4"); star(-0.6, top - 2.6, 0.95, "#ffd23c"); star(1.5, top - 5.4, 0.6, "#ffd23c"); dot(-1.9, top - 0.6, 0.3, "#fff8c8"); }
    if (hat === 14) { rr(-hr * 1.06, hy - hr * 0.62, hr * 2.12, 1.7, 0.5, "#d1383f"); line([[-hr, hy - hr * 0.62 + 0.85], [hr, hy - hr * 0.62 + 0.85]], 0.4, "#fff"); }
    if (hat === 15) { line([[-hr * 0.7, hy + hr * 0.7], [-1.6, top + 0.4]], 0.18, "#555"); poly([[-2.2, top + 0.9], [0.4, top - 6.2], [3, top + 0.4]], "#ff5fa2"); line([[-1.1, top - 1.3], [1.9, top - 1.9]], 0.6, "#ffd23c"); line([[-0.4, top - 3.4], [1.3, top - 3.8]], 0.6, "#35e0d0"); ell(0.4, top - 6.6, 0.95, 0.95, "#ffd23c"); }
    // a cape from behind is most of what you see
    if (L[14] === 5 && back) { g.beginPath(); g.moveTo(-B.sw - 0.8, S0 - 0.6); g.lineTo(B.sw + 0.8, S0 - 0.6); g.quadraticCurveTo(B.ww + 3.4, mid, B.ww + 2.4 + Math.sin(t * 3) * 0.7, hem + 4); g.quadraticCurveTo(0, hem + 5.4 + Math.sin(t * 3 + 1) * 0.5, -B.ww - 2.4 + Math.sin(t * 3 + 2) * 0.7, hem + 4); g.quadraticCurveTo(-B.ww - 3.4, mid, -B.sw - 0.8, S0 - 0.6); g.closePath(); fs("#b3141d"); star(0, mid + 0.6, 2.6, "#ffd23c"); line([[-B.sw * 0.5, S0 + 1], [-B.ww * 0.7, hem + 3.6]], 0.25, "#7d0d14"); line([[B.sw * 0.5, S0 + 1], [B.ww * 0.7, hem + 3.6]], 0.25, "#7d0d14"); }
    let hand = null;
    if (act !== "address") { armO(); hand = armB(); }
    g.restore();
    if (pose.hold && hand) {
      const c = Math.cos(lean), sn = Math.sin(lean), bx2 = hand[0], by2 = hand[1] + 2.9, hx2 = bx2 * c - by2 * sn, hy2 = bx2 * sn + by2 * c;
      drawBall(g, x + hx2 * s, y + hy2 * s, 3.8 * s * (act === "walk" && a < 0.62 ? 1 + a * 0.25 : act === "walk" ? 1.15 - (a - 0.62) * 0.9 : 1), L[10], back ? Math.PI : 0);
    }
  }

  // ----- Glorbo, calling the game from a television bolted over lane one -----
  // mood: idle | cheer | groan | shock; talk: true while he's got something to say
  function drawTV(g, x, y, w, t, mood, talk) {
    const h = w * 0.8;
    g.save(); g.translate(x, y);
    g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = INK; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(w * 0.42, 2); g.lineTo(w * 0.22, -w * 0.16); g.moveTo(w * 0.52, 2); g.lineTo(w * 0.74, -w * 0.2); g.stroke();
    g.fillStyle = "#ffd23c"; [[0.22, -0.16], [0.74, -0.2]].forEach(([ax, ay]) => { g.beginPath(); g.arc(w * ax, w * ay, 3.2, 0, TAU); g.fill(); g.stroke(); });
    g.fillStyle = "#e9dcc0"; g.beginPath(); g.roundRect(0, 0, w, h, w * 0.12); g.fill(); g.stroke();
    g.fillStyle = "#b9a57c"; g.beginPath(); g.roundRect(w * 0.78, h * 0.12, w * 0.16, h * 0.76, w * 0.04); g.fill();
    g.fillStyle = INK; [0.28, 0.5].forEach(ky => { g.beginPath(); g.arc(w * 0.86, h * ky, w * 0.045, 0, TAU); g.fill(); });
    g.fillStyle = mood === "cheer" ? "#ff3d5a" : "#3fd35a"; g.beginPath(); g.arc(w * 0.86, h * 0.76, w * 0.03, 0, TAU); g.fill();
    const sx = w * 0.07, sy = h * 0.1, sw = w * 0.67, shh = h * 0.8;
    g.save(); g.beginPath(); g.roundRect(sx, sy, sw, shh, w * 0.08); g.clip();
    const bg = g.createLinearGradient(0, sy, 0, sy + shh); bg.addColorStop(0, mood === "cheer" ? "#ffb545" : mood === "groan" ? "#3c4a7a" : "#6a3fb5"); bg.addColorStop(1, mood === "cheer" ? "#ff5fa2" : mood === "groan" ? "#1c2340" : "#2a1b5a");
    g.fillStyle = bg; g.fillRect(sx, sy, sw, shh);
    if (mood === "cheer") { g.fillStyle = "rgba(255,255,255,0.25)"; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(sx + sw / 2, sy + shh * 0.55); const a1 = i * TAU / 8 + t, a2 = a1 + 0.2; g.lineTo(sx + sw / 2 + Math.cos(a1) * w, sy + shh * 0.55 + Math.sin(a1) * w); g.lineTo(sx + sw / 2 + Math.cos(a2) * w, sy + shh * 0.55 + Math.sin(a2) * w); g.fill(); } }
    const cx = sx + sw / 2, bobY = mood === "cheer" ? Math.abs(Math.sin(t * 9)) * -4 : Math.sin(t * 2) * 1.2, cy = sy + shh * 0.66 + bobY, u = w / 100;
    g.lineWidth = 2 * u + 0.6;
    // eye stalks
    [-1, 1].forEach(sd => {
      const ex = cx + sd * 13 * u + Math.sin(t * 3 + sd) * 1.5 * u, ey = cy - 30 * u + (mood === "groan" ? 9 * u : 0);
      g.strokeStyle = INK; g.lineWidth = 6 * u; g.beginPath(); g.moveTo(cx + sd * 8 * u, cy - 12 * u); g.quadraticCurveTo(cx + sd * 13 * u, cy - 20 * u, ex, ey); g.stroke();
      g.strokeStyle = "#7fbf3f"; g.lineWidth = 3.4 * u; g.stroke(); g.strokeStyle = INK; g.lineWidth = 1.6 * u + 0.5;
      g.fillStyle = "#fff"; g.beginPath(); g.arc(ex, ey, 7.5 * u, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = INK;
      if (mood === "cheer") { g.beginPath(); g.arc(ex, ey + 1.5 * u, 4 * u, Math.PI + 0.2, TAU - 0.2); g.stroke(); }
      else if (mood === "groan") { g.beginPath(); g.moveTo(ex - 4 * u, ey); g.lineTo(ex + 4 * u, ey); g.stroke(); }
      else { g.beginPath(); g.arc(ex + Math.sin(t * 1.3) * 2 * u, ey + (mood === "shock" ? 0 : 1.5 * u), (mood === "shock" ? 1.6 : 3) * u, 0, TAU); g.fill(); }
    });
    g.fillStyle = "#8fc45a"; g.beginPath(); g.ellipse(cx, cy, 19 * u, 15 * u, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = "#6fa63f"; [[-9, -5], [7, -8], [11, 3]].forEach(([px, py]) => { g.beginPath(); g.arc(cx + px * u, cy + py * u, 1.8 * u, 0, TAU); g.fill(); });
    const open = talk ? (0.3 + Math.abs(Math.sin(t * 17)) * 0.7) : mood === "shock" ? 1 : mood === "cheer" ? 0.9 : 0.12;
    g.fillStyle = "#4a1020"; g.beginPath();
    if (mood === "groan" && !talk) { g.moveTo(cx - 8 * u, cy + 7 * u); g.quadraticCurveTo(cx, cy + 2 * u, cx + 8 * u, cy + 7 * u); g.stroke(); }
    else { g.ellipse(cx, cy + 4 * u, (mood === "shock" ? 5 : 9) * u, (1.5 + open * 6) * u, 0, 0, TAU); g.fill(); g.stroke(); }
    g.fillStyle = "#d1383f"; g.beginPath(); g.moveTo(cx, cy + 16 * u); g.lineTo(cx - 9 * u, cy + 12 * u); g.lineTo(cx - 9 * u, cy + 21 * u); g.closePath(); g.moveTo(cx, cy + 16 * u); g.lineTo(cx + 9 * u, cy + 12 * u); g.lineTo(cx + 9 * u, cy + 21 * u); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "rgba(0,0,0,0.12)"; for (let ly = sy; ly < sy + shh; ly += 3) g.fillRect(sx, ly, sw, 1);
    g.fillStyle = "rgba(255,255,255,0.14)"; g.beginPath(); g.ellipse(sx + sw * 0.28, sy + shh * 0.22, sw * 0.22, shh * 0.1, -0.5, 0, TAU); g.fill();
    g.restore();
    g.lineWidth = 2.5; g.strokeStyle = INK; g.beginPath(); g.roundRect(sx, sy, sw, shh, w * 0.08); g.stroke();
    g.restore();
  }

  function drawStar(g, x, y, r, color) {
    g.save(); g.translate(x, y); g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath(); g.fillStyle = color; g.fill(); g.lineWidth = Math.max(1, r * 0.14); g.strokeStyle = color === "#111111" ? "#ffd23c" : INK; g.lineJoin = "round"; g.stroke(); g.restore();
  }

  // ----- the alley -----
  function lane(g, v, ox, al, dim) {
    const yn = v.cy + 13, far = YB.PIT, Ln = YB.LANE;
    const a = P(v, 0, yn), b = P(v, 0, far);
    const wood = g.createLinearGradient(0, b[1], 0, a[1]);
    wood.addColorStop(0, al.wood[0]); wood.addColorStop(1, al.wood[1]);
    quad(g, v, [[ox - Ln - 10, yn], [ox + Ln + 10, yn], [ox + Ln + 10, far], [ox - Ln - 10, far]], al.cap);
    quad(g, v, [[ox - Ln - 6, yn], [ox + Ln + 6, yn], [ox + Ln + 6, far], [ox - Ln - 6, far]], al.gutter);
    quad(g, v, [[ox - Ln, yn], [ox + Ln, yn], [ox + Ln, far], [ox - Ln, far]], wood);
    if (yn < 0) quad(g, v, [[ox - Ln - 6, yn], [ox + Ln + 6, yn], [ox + Ln + 6, 0], [ox - Ln - 6, 0]], al.approach);
    g.lineWidth = 1; g.strokeStyle = "rgba(0,0,0,0.09)";
    g.beginPath();
    for (let i = 1; i < 13; i++) { const x = ox - Ln + i * Ln * 2 / 13, p = P(v, x, yn), q = P(v, x, far); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); }
    g.stroke();
    // gutter shading and lane edges
    g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 1.5; g.beginPath();
    [-Ln, Ln, -Ln - 6, Ln + 6].forEach(x => { const p = P(v, ox + x, Math.max(yn, 0)), q = P(v, ox + x, far); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); });
    g.stroke();
    quad(g, v, [[ox - Ln - 6, -0.8], [ox + Ln + 6, -0.8], [ox + Ln + 6, 0.8], [ox - Ln - 6, 0.8]], INK);
    if (!dim) {
      const mark = "rgba(90,45,10,0.6)";
      for (let i = -3; i <= 3; i++) {
        const ax = ox + i * 5, ay = 42 + (3 - Math.abs(i)) * 4;
        quad(g, v, [[ax - 1.2, ay], [ax + 1.2, ay], [ax, ay + 7]], mark);
        quad(g, v, [[ax - 0.45, 18], [ax + 0.45, 18], [ax + 0.45, 19.4], [ax - 0.45, 19.4]], mark);
        quad(g, v, [[ax - 0.45, -9], [ax + 0.45, -9], [ax + 0.45, -7.6], [ax - 0.45, -7.6]], mark);
      }
      const gl = P(v, 0, 120), gf = P(v, 0, far), gloss = g.createLinearGradient(0, gf[1], 0, gl[1]);
      gloss.addColorStop(0, "rgba(255,255,255,0.3)"); gloss.addColorStop(1, "rgba(255,255,255,0)");
      quad(g, v, [[ox - Ln, 120], [ox + Ln, 120], [ox + Ln, far], [ox - Ln, far]], gloss);
    } else {
      quad(g, v, [[ox - Ln - 10, yn], [ox + Ln + 10, yn], [ox + Ln + 10, far], [ox - Ln - 10, far]], "rgba(8,8,24,0.42)");
    }
  }
  function housing(g, v, ox, al, dim, t) {
    const far = YB.PIT, W2 = YB.LANE + 10;
    quad(g, v, [[ox - W2, far - 12, 0], [ox + W2, far - 12, 0], [ox + W2, far + 10, 0], [ox - W2, far + 10, 0]], "#0b0b14");      // the pit
    quad(g, v, [[ox - W2, far + 10, 0], [ox + W2, far + 10, 0], [ox + W2, far + 10, 20], [ox - W2, far + 10, 20]], "#15151f");
    quad(g, v, [[ox - W2, far - 40, 0], [ox - W2, far + 10, 0], [ox - W2, far + 10, 20], [ox - W2, far - 40, 20]], dim ? "#191926" : "#2a2a3a", INK);
    quad(g, v, [[ox + W2, far - 40, 0], [ox + W2, far + 10, 0], [ox + W2, far + 10, 20], [ox + W2, far - 40, 20]], dim ? "#191926" : "#2a2a3a", INK);
    g.lineWidth = 2;
    const grad = (() => { const p = P(v, 0, far - 6, 38), q = P(v, 0, far - 6, 20), gr = g.createLinearGradient(0, p[1], 0, q[1]); gr.addColorStop(0, al.wall[1]); gr.addColorStop(1, al.wall[0]); return gr; })();
    quad(g, v, [[ox - W2 - 1, far - 6, 20], [ox + W2 + 1, far - 6, 20], [ox + W2 + 1, far - 6, 38], [ox - W2 - 1, far - 6, 38]], grad, INK);
    if (dim) { quad(g, v, [[ox - W2 - 1, far - 6, 20], [ox + W2 + 1, far - 6, 20], [ox + W2 + 1, far - 6, 38], [ox - W2 - 1, far - 6, 38]], "rgba(8,8,24,0.45)"); return; }
    // the sign over the pins: marquee bulbs and the alley's name
    const c = P(v, ox, far - 6, 29), k = c[2];
    g.save();
    g.textAlign = "center"; g.textBaseline = "middle";
    let fsz = Math.max(8, 9.5 * k);
    g.font = "400 " + fsz + "px 'Luckiest Guy', Impact, sans-serif";
    const wide = g.measureText(al.name.toUpperCase()).width, room = (W2 * 2 - 8) * k;
    if (wide > room) { fsz *= room / wide; g.font = "400 " + fsz + "px 'Luckiest Guy', Impact, sans-serif"; }
    g.lineWidth = Math.max(2, k * 1.4); g.strokeStyle = INK; g.lineJoin = "round";
    g.strokeText(al.name.toUpperCase(), c[0], c[1] + k * 0.6); g.fillStyle = al.sign; g.fillText(al.name.toUpperCase(), c[0], c[1] + k * 0.6);
    for (let i = 0; i <= 14; i++) {
      const on = (i + Math.floor(t * 3)) % 3 === 0;
      [21.6, 36.4].forEach(z => { const p = P(v, ox - W2 + 1.5 + i * (W2 * 2 - 3) / 14, far - 6.2, z); g.fillStyle = on ? al.glow : "rgba(255,255,255,0.25)"; g.beginPath(); g.arc(p[0], p[1], Math.max(1.2, k * 0.75), 0, TAU); g.fill(); });
    }
    g.restore();
  }
  function backdrop(g, v, al, t, idx) {
    const W = v.W, H = v.H;
    const sky = g.createLinearGradient(0, 0, 0, v.hz + 60);
    sky.addColorStop(0, al.wall[0]); sky.addColorStop(1, al.wall[1]);
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const dol = (v.cy - v.y0) / v.dolly, par = 1 + dol * 0.5;           // far things swell a little as the camera rolls in
    g.save(); g.translate(v.cx, v.hz); g.scale(par, par); g.translate(-v.cx, -v.hz);
    if (idx === 0) {            // lounge: diamond wallpaper, a neon cocktail, a little saucer
      g.strokeStyle = "rgba(255,95,162,0.16)"; g.lineWidth = 2;
      for (let i = -8; i < 24; i++) { g.beginPath(); g.moveTo(i * 44, -40); g.lineTo(i * 44 + 220, v.hz + 70); g.moveTo(i * 44 + 220, -40); g.lineTo(i * 44, v.hz + 70); g.stroke(); }
      const neon = (c, fn) => { g.save(); g.shadowColor = c; g.shadowBlur = 14; g.strokeStyle = c; g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); fn(); g.stroke(); g.restore(); };
      const nx = W * 0.14, ny = v.hz - 34;
      neon(al.accent, () => { g.moveTo(nx - 22, ny - 22); g.lineTo(nx + 22, ny - 22); g.lineTo(nx, ny + 4); g.closePath(); g.moveTo(nx, ny + 4); g.lineTo(nx, ny + 26); g.moveTo(nx - 12, ny + 26); g.lineTo(nx + 12, ny + 26); });
      neon(al.glow, () => { g.arc(nx + 12, ny - 30, 5, 0, TAU); });
      const ux = W * 0.86, uy = v.hz - 30 + Math.sin(t * 1.3) * 3;
      neon(al.glow, () => { g.ellipse(ux, uy, 30, 8, 0, 0, TAU); g.moveTo(ux - 14, uy - 6); g.quadraticCurveTo(ux, uy - 26, ux + 14, uy - 6); });
      neon(al.sign, () => { g.moveTo(ux - 16, uy + 12); g.lineTo(ux - 22, uy + 24); g.moveTo(ux, uy + 13); g.lineTo(ux, uy + 26); g.moveTo(ux + 16, uy + 12); g.lineTo(ux + 22, uy + 24); });
    } else if (idx === 1) {     // gridiron: night sky, floodlights, a crowd, goalposts behind the pins
      for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(255,255,255," + (0.25 + (i * 37 % 10) / 20) + ")"; g.fillRect((i * 131) % W, (i * 53) % (v.hz - 20), 2, 2); }
      [0.1, 0.9].forEach(fx => { const lx = W * fx; g.fillStyle = "#3b4350"; g.fillRect(lx - 3, v.hz - 70, 6, 80); g.fillStyle = "#59626f"; g.fillRect(lx - 26, v.hz - 86, 52, 20); for (let i = 0; i < 8; i++) { g.fillStyle = "#fff8c8"; g.beginPath(); g.arc(lx - 19 + (i % 4) * 13, v.hz - 81 + Math.floor(i / 4) * 10, 3.6, 0, TAU); g.fill(); } const gl = g.createRadialGradient(lx, v.hz - 76, 4, lx, v.hz - 76, 90); gl.addColorStop(0, "rgba(255,248,200,0.35)"); gl.addColorStop(1, "rgba(255,248,200,0)"); g.fillStyle = gl; g.fillRect(lx - 90, v.hz - 166, 180, 180); });
      g.fillStyle = "#16365e"; g.fillRect(0, v.hz - 8, W, 60);
      for (let r = 0; r < 4; r++) for (let i = 0; i < 70; i++) { g.fillStyle = ["#ffd200", "#e0262d", "#fff", "#7ec8ff", "#ff9a3c"][(i * 7 + r * 3) % 5]; g.beginPath(); g.arc(i * (W / 68) + (r % 2) * 5, v.hz + 2 + r * 9 + Math.sin(t * 2 + i) * 0.8, 2.6, 0, TAU); g.fill(); }
      g.strokeStyle = "#ffd200"; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.moveTo(v.cx, v.hz + 34); g.lineTo(v.cx, v.hz + 4); g.moveTo(v.cx - 46, v.hz + 4); g.lineTo(v.cx + 46, v.hz + 4); g.moveTo(v.cx - 46, v.hz + 4); g.lineTo(v.cx - 46, v.hz - 58); g.moveTo(v.cx + 46, v.hz + 4); g.lineTo(v.cx + 46, v.hz - 58); g.stroke();
    } else {                    // moonbase: stars, a ringed planet, the earth
      for (let i = 0; i < 90; i++) { const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i)); g.fillStyle = "rgba(255,255,255," + tw.toFixed(2) + ")"; g.fillRect((i * 97) % W, (i * 61) % (v.hz + 50), i % 7 ? 1.5 : 2.5, i % 7 ? 1.5 : 2.5); }
      const px = W * 0.16, py = v.hz - 26;
      g.fillStyle = "#b388ff"; g.beginPath(); g.arc(px, py, 26, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
      g.fillStyle = "rgba(0,0,0,0.18)"; g.beginPath(); g.arc(px + 8, py + 6, 26, -0.9, 1.9); g.fill();
      g.strokeStyle = "#7df9ff"; g.lineWidth = 4; g.beginPath(); g.ellipse(px, py, 44, 9, -0.35, 0, TAU); g.stroke();
      const ex = W * 0.86, ey = v.hz - 34;
      g.fillStyle = "#3b8bff"; g.beginPath(); g.arc(ex, ey, 20, 0, TAU); g.fill();
      g.fillStyle = "#4ec26b"; g.beginPath(); g.ellipse(ex - 6, ey - 4, 9, 6, 0.4, 0, TAU); g.ellipse(ex + 8, ey + 8, 6, 4, -0.3, 0, TAU); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.arc(ex, ey, 20, 0, TAU); g.stroke();
    }
    g.restore();
    // the floor everything sits on
    const fy = P(v, 0, YB.PIT + 10, 0)[1];
    const fl = g.createLinearGradient(0, fy, 0, H);
    fl.addColorStop(0, al.floor); fl.addColorStop(1, "#000");
    g.fillStyle = fl; g.fillRect(0, fy, W, H - fy);
    if (idx === 1) {            // yard lines across the turf
      g.fillStyle = "rgba(255,255,255,0.35)";
      for (let y = 0; y <= 200; y += 40) quad(g, v, [[-200, y], [200, y], [200, y + 1.2], [-200, y + 1.2]], "rgba(255,255,255,0.3)");
    }
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const bounce = r => { r = clamp(r, 0, 1); return r < 0.6 ? (r / 0.6) * (r / 0.6) : r < 0.85 ? 1 - Math.sin((r - 0.6) / 0.25 * Math.PI) * 0.14 : 1 - Math.sin((r - 0.85) / 0.15 * Math.PI) * 0.04; };
  const ease = r => { r = clamp(r, 0, 1); return 1 - Math.pow(1 - r, 3); };

  // scene: { alley, t, dt, pins (a throw's pins) or standing, ball, ballIdx, marker, bowler, aim, power, spin, word,
  //          confetti, up, after, sweep, rackIn, tv, bench, reacts, rise }
  function drawScene(g, v, sc) {
    const al = ALLEYS[sc.alley] || ALLEYS[0], t = sc.t || 0, dt = sc.dt || 0;
    backdrop(g, v, al, t, sc.alley || 0);
    [-63, 63].forEach(ox => { housing(g, v, ox, al, true, t); lane(g, v, ox, al, true); });
    housing(g, v, 0, al, false, t);
    lane(g, v, 0, al, false);
    [-63, 63].forEach(ox => YB.PIN_SPOTS.forEach(([x, row]) => { const p = P(v, ox + x, YB.HEAD + row * YB.ROW); drawPin(g, p[0], p[1], p[2], { alpha: 0.5, plain: true }); }));

    // aiming arrow, painted on the lane
    if (sc.aim) {
      const a = sc.aim, len = 84, tipx = a.pos + a.dir * 0.1 * len;
      const col = a.live ? "#ff3d5a" : "rgba(255,255,255,0.8)";
      g.lineWidth = 2; g.lineJoin = "round";
      quad(g, v, [[a.pos - 1.2, 4], [a.pos + 1.2, 4], [tipx + 0.9, len - 9], [tipx - 0.9, len - 9]], col, INK);
      quad(g, v, [[tipx - 3.2, len - 9], [tipx + 3.2, len - 9], [tipx + a.dir * 0.9, len + 2]], col, INK);
    }

    // the sweep bar that clears the deck, and where it is
    let barY = null, barZ = 0, lift = 0;
    if (sc.sweep != null) {
      const sw = sc.sweep, y0 = YB.HEAD - 11;
      barY = sw < 0.25 ? y0 : sw < 0.8 ? y0 + (YB.PIT - y0) * (sw - 0.25) / 0.55 : YB.PIT;
      barZ = sw < 0.25 ? 15 * (1 - sw / 0.25) : sw < 0.8 ? 0 : 15 * (sw - 0.8) / 0.2;
      lift = sw < 0.2 ? 9 * sw / 0.2 : sw > 0.85 ? 9 * (1 - (sw - 0.85) / 0.15) : 9;
    }

    // pins, ball and bar, far to near
    const things = [];
    const pins = sc.pins || YB.PIN_SPOTS.map(([x, row], i) => ({ x, y: YB.HEAD + row * YB.ROW, st: sc.standing && !sc.standing[i] ? 3 : 0 }));
    const ball = sc.ball && !sc.ball.gone ? sc.ball : null;
    pins.forEach((p, i) => {
      if (p.st > 2 || (p.st === 2 && (p._g = (p._g || 0) + dt) > 0.25)) return;
      if (p.st >= 1) {
        if (p._z === undefined) {
          const sp = Math.sqrt((p.vx || 0) * (p.vx || 0) + (p.vy || 0) * (p.vy || 0));
          p._z = 0; p._zv = 10 + Math.min(34, sp * 0.22) * (0.5 + Math.random() * 0.7);
          p._away = Math.abs(p.vx) < Math.abs(p.vy) * 0.45; p._side = p.vx > 0 ? 1 : p.vx < 0 ? -1 : (i % 2 ? 1 : -1);
          p._spin = p._side * (4 + Math.random() * 7); p._rot = 0;
        }
        p._zv -= 110 * dt; p._z += p._zv * dt;
        if (p._z < 0) { p._z = 0; p._zv = p._zv < -14 ? -p._zv * 0.32 : 0; }
        if (p._z > 0.05) p._rot += p._spin * dt;
        else { const tgt = p._away ? 0.5 * p._side : 1.5 * p._side, goal = tgt + Math.round((p._rot - tgt) / Math.PI) * Math.PI; p._rot += (goal - p._rot) * Math.min(1, dt * 12); }
        if (barY != null && barZ < 3 && barY >= YB.PIT - 3) return;          // swept into the pit
      }
      things.push({ y: p.st >= 1 && barY != null && barZ < 3 ? Math.max(p.y, barY + 1.5) : p.y, pin: p, i });
    });
    if (ball) things.push({ y: ball.y, ball });
    if (sc.marker) things.push({ y: 3, ball: { x: sc.marker.pos, y: 3, still: true } });
    if (barY != null) things.push({ y: barY, bar: true });
    things.sort((a, b) => b.y - a.y);
    things.forEach(o => {      // reflections in the polished wood
      if (o.pin && o.pin.st === 0 && !lift && sc.rackIn == null) { const p = P(v, o.pin.x, o.pin.y); drawPin(g, p[0], p[1], p[2], { squash: -0.55, alpha: 0.16, plain: true }); }
    });
    things.forEach(o => {
      if (o.pin) {
        const p = o.pin;
        if (p.st === 0) {
          const z = sc.rackIn != null ? 17 * (1 - bounce(sc.rackIn)) : lift, s0 = P(v, p.x, p.y), s = P(v, p.x, p.y, z);
          g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse(s0[0] + s0[2] * 0.8, s0[1], s0[2] * 2.6, s0[2] * 0.8, 0, 0, TAU); g.fill();
          let mood = "calm", lx = 0, ly = 0.5;
          if (sc.after) { mood = "smug"; }
          else if (ball && !ball.gutter) { const d = p.y - ball.y; mood = d < 60 ? "panic" : ball.y > 35 ? "worry" : "calm"; lx = clamp((ball.x - p.x) / 7, -1, 1); ly = 1; }
          else if (sc.aim) { lx = clamp(sc.aim.dir * 1.3 + (sc.aim.pos - p.x) / 30, -1, 1); }
          drawPin(g, s[0], s[1], s[2], { mood, lx, ly, blink: Math.sin(t * 1.7 + o.i * 1.9) > 0.972 });
        } else {
          const s0 = P(v, p.x, o.y), s = P(v, p.x, o.y, p._z + 1.2), air = p._z > 0.05;
          g.fillStyle = "rgba(0,0,0,0.2)"; g.beginPath(); g.ellipse(s0[0], s0[1], s0[2] * (air ? 2.4 : 5), s0[2] * 0.9, 0, 0, TAU); g.fill();
          drawPin(g, s[0], s[1] + (air ? 0 : s[2] * 1.6), s[2], { tilt: p._rot, squash: !air && p._away ? 0.62 : 1, mood: "ko" });
        }
      } else if (o.ball) {
        const b = o.ball, s = P(v, b.x, b.y, 0), r = YB.RB * s[2];
        g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.ellipse(s[0] + r * 0.2, s[1], r * 1.05, r * 0.32, 0, 0, TAU); g.fill();
        if (!b.still && !b.gutter && b.vy) {          // speed lines
          g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = Math.max(1, r * 0.08); g.lineCap = "round";
          [-0.7, 0, 0.7].forEach(o2 => { g.beginPath(); g.moveTo(s[0] + o2 * r, s[1] + r * 0.2); g.lineTo(s[0] + o2 * r * 1.15, s[1] + r * (0.9 + Math.abs(o2) * 0.2)); g.stroke(); });
        }
        drawBall(g, s[0], s[1] - r * (b.gutter ? 0.75 : 1), r, sc.ballIdx || 0, b.still ? 0 : b.y / 5);
      } else {
        const z = barZ + 0.4, W2 = YB.LANE + 6;
        g.lineWidth = 2;
        quad(g, v, [[-W2 + 2, barY, z + 4], [-W2 + 4, barY, z + 4], [-W2 + 4, barY, 21], [-W2 + 2, barY, 21]], "#3a3f52", INK);
        quad(g, v, [[W2 - 4, barY, z + 4], [W2 - 2, barY, z + 4], [W2 - 2, barY, 21], [W2 - 4, barY, 21]], "#3a3f52", INK);
        quad(g, v, [[-W2, barY, z], [W2, barY, z], [W2, barY, z + 4.4], [-W2, barY, z + 4.4]], "#2b2f3d", INK);
        for (let i = 0; i < 11; i++) { const x0 = -W2 + 1.5 + i * (W2 * 2 - 3) / 11; quad(g, v, [[x0, barY - 0.1, z + 0.5], [x0 + 2.2, barY - 0.1, z + 0.5], [x0 + 4.2, barY - 0.1, z + 3.9], [x0 + 2, barY - 0.1, z + 3.9]], "#ffc93c"); }
      }
    });

    if (sc.bowler) {
      const bo = sc.bowler, s = P(v, bo.x || 0, bo.y);
      if (s[1] - 26 * s[2] < v.H) drawBowler(g, bo.sx != null ? bo.sx : s[0], s[1], s[2] * (v.portrait ? 0.74 : 0.78), bo.look, bo.pose, true);
    }
    hud(g, v, sc, al);
  }

  function hud(g, v, sc, al) {
    const W = v.W, H = v.H, t = sc.t || 0;
    if (sc.tv) drawTV(g, 10, v.portrait ? 20 : 24, v.portrait ? 78 : 100, t, sc.tv.mood, sc.tv.talk);
    // which pins are up, like the lights over a real lane
    if (sc.up) {
      g.save(); g.translate(W - 86, 10);
      g.fillStyle = "rgba(10,14,30,0.78)"; g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.roundRect(0, 0, 76, 62, 10); g.fill(); g.stroke();
      YB.PIN_SPOTS.forEach(([x, row], i) => { g.fillStyle = sc.up[i] ? "#ffd23c" : "rgba(255,255,255,0.16)"; g.beginPath(); g.arc(38 + x * 1.5, 50 - row * 12.5, 4.6, 0, TAU); g.fill(); });
      g.restore();
    }
    // the others, waiting their turn at the side
    if (sc.bench) sc.bench.slice(0, 3).forEach((b, i) => drawBowler(g, W - 96 - i * 50, H - 5, v.portrait ? 2.9 : 3.2, b.look, { act: "idle", t: t + i }, false));
    // and everyone's opinion of what just happened
    if (sc.reacts) {
      const up = ease(sc.rise == null ? 1 : sc.rise);
      sc.reacts.forEach((r, i) => {
        if (r.big) drawBowler(g, v.portrait ? 70 : 92, H + (v.portrait ? 62 : 74) + 190 * (1 - up), v.portrait ? 6 : 7.4, r.look, { act: r.act, t: t * 1 + i, tag: r.tag }, false);
        else drawBowler(g, W - 64 - (i - 1) * (v.portrait ? 66 : 84), H + 44 + 150 * (1 - up), v.portrait ? 3.8 : 4.6, r.look, { act: r.act, t: t + i * 1.7 }, false);
      });
    }
    if (sc.power) {
      const x = W - 40, y0 = 92, h = H - 190, p = sc.power.v;
      g.save();
      g.fillStyle = "rgba(10,14,30,0.78)"; g.strokeStyle = sc.power.live ? "#ffd23c" : "#fff"; g.lineWidth = sc.power.live ? 4 : 2;
      g.beginPath(); g.roundRect(x - 6, y0 - 6, 34, h + 12, 10); g.fill(); g.stroke();
      const gr = g.createLinearGradient(0, y0 + h, 0, y0); gr.addColorStop(0, "#3fd35a"); gr.addColorStop(0.6, "#ffd23c"); gr.addColorStop(1, "#ff3d5a");
      g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(x, y0, 22, h);
      g.fillStyle = gr; g.fillRect(x, y0 + h * (1 - p), 22, h * p);
      g.fillStyle = "rgba(10,14,30,0.6)"; for (let i = 1; i < 10; i++) g.fillRect(x, y0 + h * i / 10 - 1, 22, 2);
      g.font = "600 12px Fredoka, Arial"; g.textAlign = "center"; g.fillStyle = "#fff"; g.fillText("POWER", x + 11, y0 + h + 22);
      g.restore();
    }
    if (sc.spin != null) {
      const cx = W / 2, y = H - 30;
      g.save(); g.font = "600 15px Fredoka, Arial"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = "rgba(10,14,30,0.78)"; g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.roundRect(cx - 118, y - 16, 236, 32, 16); g.fill(); g.stroke();
      g.fillStyle = sc.spin < 0 ? "#ffd23c" : "rgba(255,255,255,0.55)"; g.fillText("◀", cx - 96, y + 1);
      g.fillStyle = sc.spin > 0 ? "#ffd23c" : "rgba(255,255,255,0.55)"; g.fillText("▶", cx + 96, y + 1);
      g.fillStyle = "#fff"; g.fillText("HOLD TO SPIN", cx, y + 1);
      g.restore();
    }
    if (sc.word) {
      const w = sc.word, a = Math.min(1, w.t / 0.25), sc2 = (v.portrait ? 0.72 : 1) * (0.4 + 0.6 * (1 - Math.pow(1 - a, 3)) + (a >= 1 ? Math.sin(w.t * 6) * 0.02 : 0));
      g.save(); g.translate(W / 2, H * 0.36); g.rotate(-0.06); g.scale(sc2, sc2);
      if (w.kind === "good") {
        g.fillStyle = "#ffd23c"; g.strokeStyle = INK; g.lineWidth = 5; g.lineJoin = "round"; g.beginPath();
        for (let i = 0; i < 28; i++) { const ang = i * TAU / 28 + w.t * 0.4, rr = i % 2 ? 108 : 170; g.lineTo(Math.cos(ang) * rr * 1.25, Math.sin(ang) * rr * 0.62); }
        g.closePath(); g.fill(); g.stroke();
      }
      const size = w.text.length > 9 ? 54 : 78;
      g.font = "400 " + size + "px 'Luckiest Guy', Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
      g.lineWidth = 16; g.strokeStyle = INK; g.strokeText(w.text, 0, 6);
      g.lineWidth = 6; g.strokeStyle = "#fff"; g.strokeText(w.text, 0, 0);
      g.fillStyle = w.kind === "good" ? "#ff3d5a" : w.kind === "bad" ? "#7df9ff" : "#ffd23c"; g.fillText(w.text, 0, 0);
      g.restore();
    }
    if (sc.confetti) sc.confetti.forEach(c => { g.save(); g.translate(c.x, c.y); g.rotate(c.r); g.fillStyle = c.c; g.fillRect(-4, -2.5, 8, 5); g.restore(); });
  }

  // A portrait for lists and the dressing room: draws a bowler onto a small canvas.
  // opts: bust (head and shoulders), ball (show the ball beside them), back, act, t, tag
  function portrait(canvas, look, opts) {
    opts = opts || {};
    const g = canvas.getContext("2d"), W = canvas.width, H = canvas.height, L = fixLook(look), B = BUILD[L[0]];
    g.clearRect(0, 0, W, H);
    if (opts.bg) { g.fillStyle = opts.bg; g.fillRect(0, 0, W, H); }
    if (opts.bust) {
      const s = H / (B.hr * (opts.tall ? 5.4 : 3.9));
      drawBowler(g, W / 2, H * (opts.tall ? 0.66 : 0.56) - headY(L) * s, s, L, { act: opts.act || "idle", t: opts.t || 0, tag: opts.tag }, opts.back);
    } else {
      const tall = B.leg + B.th + B.hr * 2 + 10, s = H / tall;
      drawBowler(g, W / 2 - (opts.ball ? s * 2.4 : 0), H - s * 1.9, s, L, { act: opts.act || "idle", t: opts.t || 0, tag: opts.tag }, opts.back);
      if (opts.ball) drawBall(g, W / 2 + s * 9, H - s * 5.8, s * 4.1, L[10], 0);
    }
  }
  // One wardrobe item on its own little canvas: the bowler wearing it (head shot or full length), or the ball itself.
  const HEADSHOT = { skin: 1, hair: 1, hairColor: 1, eyes: 1, mouth: 1, hat: 1, specs: 1, beard: 1 };
  function itemThumb(canvas, look, part, value) {
    const L = fixLook(look).slice();
    L[PARTS.indexOf(part)] = value;
    if (part === "hair" || part === "hairColor") L[8] = 0;          // take the hat off so the hair shows
    if (part === "eyes") L[9] = 0;                                    // and the glasses, for eyes
    const g = canvas.getContext("2d");
    g.clearRect(0, 0, canvas.width, canvas.height);
    if (part === "ball") { drawBall(g, canvas.width / 2, canvas.height / 2 + canvas.height * 0.06, canvas.width * 0.3, value, 0); return; }
    const B = BUILD[L[0]], H = canvas.height;
    if (part === "pattern" || part === "extra") {          // close in on the shirt
      const sc = H / (B.th + 9.5);
      drawBowler(g, canvas.width / 2, H * 0.56 + (B.leg + B.th / 2) * sc, sc, L, { tag: "YB" }, false);
    } else if (part === "pants" || part === "shoes") {     // and on the legs
      const sc = H / (B.leg + 8.5);
      drawBowler(g, canvas.width / 2, H * 0.9, sc, L, { tag: "YB" }, false);
    } else portrait(canvas, L, { bust: !!HEADSHOT[part], tall: part === "hat", tag: "YB" });
  }
  // A little picture of an alley, for choosing one.
  function thumb(canvas, idx) {
    const g = canvas.getContext("2d"), v = makeView(false);
    g.setTransform(canvas.width / v.W, 0, 0, canvas.height / v.H, 0, 0);
    drawScene(g, v, { alley: idx, t: 1.3, standing: Array(10).fill(true) });
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  // The marquee over the lobby: the logo, a ball with somewhere to be, and three pins who'd rather be anywhere else.
  function drawHero(g, W, H, t, look, tag) {
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#22407a"); bg.addColorStop(1, "#5b2a86");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W * 0.3, H * 0.5); g.fillStyle = "rgba(255,255,255,0.06)";
    for (let i = 0; i < 14; i++) { const a1 = i * TAU / 14 + t * 0.12; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a1) * W, Math.sin(a1) * W); g.lineTo(Math.cos(a1 + 0.22) * W, Math.sin(a1 + 0.22) * W); g.fill(); }
    g.restore();
    const floor = H - 22;
    const wood = g.createLinearGradient(0, floor, 0, H); wood.addColorStop(0, "#f0c47a"); wood.addColorStop(1, "#c58f48");
    g.fillStyle = wood; g.fillRect(0, floor, W, H - floor);
    g.fillStyle = INK; g.fillRect(0, floor - 2, W, 3);
    g.strokeStyle = "rgba(0,0,0,0.12)"; g.lineWidth = 1; g.beginPath(); for (let x = -((t * 40) % 46); x < W; x += 46) { g.moveTo(x, floor + 1); g.lineTo(x - 14, H); } g.stroke();
    const small = W < 520, fs = Math.min(H * 0.4, W * (small ? 0.115 : 0.085));
    g.save(); g.translate(small ? W / 2 : 20, H * 0.36); g.rotate(-0.035);
    g.font = "400 " + fs + "px 'Luckiest Guy', Impact, sans-serif"; g.textAlign = small ? "center" : "left"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.lineWidth = fs * 0.22; g.strokeStyle = INK; g.strokeText("YOWZA BOWL", 0, fs * 0.07);
    g.lineWidth = fs * 0.08; g.strokeStyle = "#fff"; g.strokeText("YOWZA BOWL", 0, 0);
    g.fillStyle = "#ffc93c"; g.fillText("YOWZA BOWL", 0, 0);
    g.restore();
    g.font = "600 " + Math.max(11, fs * 0.26) + "px Fredoka, Arial"; g.textAlign = small ? "center" : "left"; g.fillStyle = "#dbe7ff"; g.textBaseline = "alphabetic";
    g.fillText("Oddball ten-pin for the Yowza League", small ? W / 2 : 24, H * 0.36 + fs * 0.7);
    // the chase
    const span = W + 320, bx = ((t * 150) % span) - 60, r = Math.min(17, H * 0.15);
    [0, 1, 2].forEach(i => {
      const px = bx + 70 + i * 38, hop = Math.abs(Math.sin(t * 11 + i * 1.3)) * 12;
      g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse(px, floor + 6, 9, 2.5, 0, 0, TAU); g.fill();
      drawPin(g, px, floor + 6 - hop, Math.min(3.1, H / 38), { mood: "panic", lx: -1, ly: 0.2, tilt: 0.16 + Math.sin(t * 11 + i) * 0.08 });
    });
    g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.ellipse(bx, floor + 7, r, r * 0.3, 0, 0, TAU); g.fill();
    drawBall(g, bx, floor + 6 - r, r, fixLook(look)[10], -bx / r);
    if (!small) drawBowler(g, W - 64, H - 5, Math.min(3.5, H / 34), look, { act: "wave", t, tag }, false);
  }

  YB.art = { PARTS, NAMES, PRICES, SIZES, DEFAULT_LOOK, ALLEYS, fixLook, randomLook, makeView, P, drawScene, drawBowler, drawBall, drawPin, drawStar, drawTV, drawHero, portrait, thumb, itemThumb, headY, BUILD };
})(typeof window !== "undefined" ? window : globalThis);
