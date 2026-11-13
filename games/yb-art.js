/* Yowza Bowl, part 2 of 4: the art. Everything is drawn in code on a canvas, in a flat, bold-outline cartoon style
   (the look of early-2000s browser games): the lane seen from behind the bowler, three alleys, the pins, the balls and
   the bowlers ("oddballs": round little people you dress up). */
(function (root) {
  "use strict";
  if (typeof document === "undefined") return;
  const YB = root.YB, TAU = Math.PI * 2;
  const INK = "#1b2338";

  // ----- what a bowler can look like. A look is a list of numbers in this order. -----
  const PARTS = ["build", "skin", "hair", "hairColor", "eyes", "mouth", "shirt", "pants", "hat", "specs", "ball"];
  const NAMES = {
    build: ["Guy", "Gal"],
    skin: ["Peach", "Tan", "Brown", "Deep", "Olive", "Alien green"],
    hair: ["Bald", "Short", "Spiky", "Ponytail", "Afro", "Mohawk"],
    hairColor: ["Black", "Brown", "Blonde", "Red", "Grey", "Blue"],
    eyes: ["Dots", "Googly", "Sleepy", "Game face"],
    mouth: ["Smile", "Grin", "Flat", "Tongue out"],
    shirt: ["League grey", "Navy", "Cherry", "Forest", "Mustard", "Teal", "Hot pink", "Purple", "Orange", "Tuxedo black"],
    pants: ["Charcoal", "Denim", "Khaki", "Maroon", "Olive", "White"],
    hat: ["No hat", "Ball cap", "Beanie", "Cowboy hat", "Football helmet", "Crown", "Traffic cone", "Antennae"],
    specs: ["No glasses", "Round glasses", "Shades", "Monocle"],
    ball: YB.BALLS.map(b => b.name)
  };
  // What costs money in the pro shop (everything else is free).
  const PRICES = {
    shirt: [0, 0, 0, 0, 100, 100, 150, 150, 150, 400],
    hat: [0, 150, 200, 400, 600, 1500, 300, 800],
    specs: [0, 100, 250, 500],
    ball: [0, 500, 500, 900, 300, 700]
  };
  const SKIN = ["#ffd3b0", "#e9b384", "#b97a4f", "#7a4a2b", "#c9a36b", "#8fc45a"];
  const HAIR = ["#1d1d24", "#6b3f1f", "#f1c84b", "#c8452c", "#a9abb3", "#3b7ae0"];
  const SHIRT = ["#9ea4ad", "#22407a", "#d1383f", "#2f7d48", "#e9b320", "#1f9e9a", "#ff5fa2", "#7b4bc4", "#f07a1f", "#22232b"];
  const TRIM = ["#6f757f", "#f2c230", "#ffffff", "#f2e9c8", "#22232b", "#ffffff", "#22232b", "#f2c230", "#22407a", "#d1383f"];
  const PANTS = ["#3a3d47", "#3b5c94", "#c9b183", "#7a2630", "#5f6b3a", "#f1f1ee"];
  const SIZES = PARTS.map(p => NAMES[p].length);
  const DEFAULT_LOOK = [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0];      // the famous default grey bowler
  const fixLook = look => SIZES.map((n, i) => ((Number(look && look[i]) || 0) % n + n) % n);
  function randomLook(r, fancy) {
    const pick = n => Math.floor(r() * n);
    const look = SIZES.map(pick);
    if (!fancy) { look[6] = pick(4); look[8] = 0; look[9] = 0; look[10] = 0; }
    return look;
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

  // ----- pins -----
  const PIN = new Path2D("M1 0 C2 -0.3 2.6 -3.2 2.36 -5.3 C2.1 -7.6 0.95 -8.7 0.9 -10.3 C0.86 -11.4 1.3 -12 1.3 -13.2 C1.3 -14.4 0.7 -15 0 -15 C-0.7 -15 -1.3 -14.4 -1.3 -13.2 C-1.3 -12 -0.86 -11.4 -0.9 -10.3 C-0.95 -8.7 -2.1 -7.6 -2.36 -5.3 C-2.6 -3.2 -2 -0.3 -1 0 Z");
  function drawPin(g, sx, sy, k, tilt, squash, alpha, plain) {
    g.save();
    g.translate(sx, sy);
    g.scale(k, k * (squash || 1));
    if (tilt) { g.translate(0, -5); g.rotate(tilt); g.translate(0, 5); }
    if (alpha != null) g.globalAlpha = alpha;
    g.fillStyle = "#fffdf6"; g.fill(PIN);
    if (!plain) {
      g.save(); g.clip(PIN);
      g.fillStyle = "rgba(40,60,120,0.2)"; g.fillRect(0.7, -16, 3, 17);
      g.fillStyle = "rgba(255,255,255,0.9)"; g.fillRect(-1.5, -7.5, 0.6, 5);
      g.fillStyle = "#e0262d"; g.fillRect(-2, -10.5, 4, 0.75); g.fillRect(-2, -11.9, 4, 0.75);
      g.restore();
    }
    g.lineWidth = 0.38; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(PIN);
    g.restore();
  }

  // ----- bowling balls -----
  function drawBall(g, sx, sy, r, idx, phase) {
    g.save();
    g.translate(sx, sy);
    g.lineWidth = Math.max(1.2, r * 0.09); g.strokeStyle = INK;
    const shine = () => { g.fillStyle = "rgba(255,255,255,0.75)"; g.beginPath(); g.ellipse(-r * 0.38, -r * 0.42, r * 0.22, r * 0.13, -0.6, 0, TAU); g.fill(); };
    const round = (c1, c2) => {
      const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
      gr.addColorStop(0, c1); gr.addColorStop(1, c2);
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    };
    const holes = () => {
      const a = (phase || 0) % TAU, oy = -Math.cos(a) * r * 0.5, sq = Math.max(0.25, Math.abs(Math.sin(a)));
      if (Math.sin(a) < -0.15) return;
      g.fillStyle = "rgba(0,0,0,0.75)";
      [[-0.22, -0.16], [0.22, -0.16], [0, 0.2]].forEach(([hx, hy]) => { g.beginPath(); g.ellipse(hx * r, oy + hy * r * sq, r * 0.11, r * 0.11 * sq, 0, 0, TAU); g.fill(); });
    };
    if (idx === 3) {                       // the football
      g.rotate(Math.sin((phase || 0) * 0.8) * 0.5 + 0.3);
      const gr = g.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, "#b8693a"); gr.addColorStop(1, "#6b3615");
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r * 1.25, r * 0.8, 0, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = "#fff"; g.lineWidth = Math.max(1, r * 0.09);
      g.beginPath(); g.moveTo(-r * 0.5, 0); g.lineTo(r * 0.5, 0);
      for (let i = -2; i <= 2; i++) { g.moveTo(i * r * 0.2, -r * 0.16); g.lineTo(i * r * 0.2, r * 0.16); }
      g.stroke();
      g.restore();
      return;
    }
    if (idx === 1) { round("#7b8191", "#16181f"); holes(); }
    else if (idx === 2) {
      round("#ff8a8f", "#b3141d");
      g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = r * 0.12; g.beginPath();
      for (let a = 0; a < 9; a += 0.3) { const rr = a / 9 * r * 0.85, x = Math.cos(a + (phase || 0)) * rr, y = Math.sin(a + (phase || 0)) * rr; if (a) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke(); g.strokeStyle = INK; g.lineWidth = Math.max(1.2, r * 0.09);
    } else if (idx === 4) {
      round("#5a5d6b", "#0c0d12");
      const oy = -Math.cos((phase || 0) % TAU) * r * 0.35;
      g.fillStyle = "#fff"; g.beginPath(); g.arc(0, oy, r * 0.42, 0, TAU); g.fill();
      g.fillStyle = "#0c0d12"; g.font = "900 " + Math.round(r * 0.62) + "px Fredoka, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("8", 0, oy + r * 0.03);
    } else if (idx === 5) {
      round("#ffffff", "#8b93ab");
      g.save(); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip();
      g.strokeStyle = "rgba(60,70,110,0.55)"; g.lineWidth = Math.max(0.6, r * 0.04);
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.ellipse(0, 0, Math.abs(i) * r * 0.3 + 0.01, r, 0, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(-r, i * r * 0.3); g.lineTo(r, i * r * 0.3); g.stroke(); }
      const tw = (phase || 0) * 2;
      ["#ff5fa2", "#35e0d0", "#ffd23c"].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(Math.cos(tw + i * 2.1) * r * 0.55, Math.sin(tw * 1.3 + i * 2.1) * r * 0.55, r * 0.12, 0, TAU); g.fill(); });
      g.restore();
    } else { round("#8fb4ff", "#1c3faa"); holes(); }
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
    shine();
    g.restore();
  }

  // ----- bowlers -----
  // (x, y) is the middle of the feet; s is pixels per unit (a bowler is about 22 units tall).
  // pose: { swing: -1 (arm back) .. 1 (arm thrown forward), mood: 1 cheer / -1 slump, bob, hold: ball in hand, tag }
  function drawBowler(g, x, y, s, look, pose, back) {
    pose = pose || {};
    const L = fixLook(look), build = L[0], skin = SKIN[L[1]], hairC = HAIR[L[3]], shirt = SHIRT[L[6]], trim = TRIM[L[6]], pants = PANTS[L[7]];
    const mood = pose.mood || 0, swing = pose.swing || 0;
    g.save();
    g.translate(x, y - (pose.bob || 0) * s);
    g.scale(s, s);
    g.lineWidth = 0.42; g.strokeStyle = INK; g.lineJoin = "round"; g.lineCap = "round";
    const fs = fill => { g.fillStyle = fill; g.fill(); g.stroke(); };
    const ell = (cx, cy, rx, ry, fill, rot) => { g.beginPath(); g.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU); fs(fill); };
    const rr = (x0, y0, w, h, r, fill) => { g.beginPath(); g.roundRect(x0, y0, w, h, r); fs(fill); };
    const bw = build ? 5.5 : 6.3;
    // shadow
    g.fillStyle = "rgba(0,0,0,0.22)"; g.beginPath(); g.ellipse(0, 0.2 + (pose.bob || 0), 7, 1.6, 0, 0, TAU); g.fill();
    // legs and shoes
    const st = Math.sin((pose.step || 0) * TAU) * 0.9;
    rr(-4, -5.4 - st * 0.3, 2.6, 5, 1, pants); rr(1.4, -5.4 + st * 0.3, 2.6, 5, 1, pants);
    ell(-2.9, -0.7 - Math.max(0, st) * 0.6, 2.3, 1.15, "#f4efe2"); ell(2.9, -0.7 - Math.max(0, -st) * 0.6, 2.3, 1.15, "#f4efe2");
    g.fillStyle = "#c8352f"; g.beginPath(); g.ellipse(-2.9 + (back ? 0 : -0.9), -0.7 - Math.max(0, st) * 0.6, 1, 1.05, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(2.9 + (back ? 0 : 0.9), -0.7 - Math.max(0, -st) * 0.6, 1, 1.05, 0, 0, TAU); g.fill();
    // the arm that isn't bowling
    const lean = mood < 0 ? 0.9 : 0;
    const lh = mood > 0 ? [-8.6, -19.5] : [-8.3 - swing * 0.6, -6.6 + lean];
    const armTo = (sx0, sy0, h) => { g.lineWidth = 2.5; g.strokeStyle = INK; g.beginPath(); g.moveTo(sx0, sy0); g.lineTo(h[0], h[1]); g.stroke(); g.lineWidth = 1.7; g.strokeStyle = shirt; g.beginPath(); g.moveTo(sx0, sy0); g.lineTo((sx0 + h[0]) / 2, (sy0 + h[1]) / 2); g.stroke(); g.strokeStyle = skin; g.beginPath(); g.moveTo((sx0 + h[0]) / 2, (sy0 + h[1]) / 2); g.lineTo(h[0], h[1]); g.stroke(); g.lineWidth = 0.42; g.strokeStyle = INK; ell(h[0], h[1], 1.25, 1.25, skin); };
    const side = back ? 1 : -1;                      // the bowling arm is on the right from behind, the left from the front
    armTo(-side * (bw - 0.9), -11.6 + lean, [side * lh[0], lh[1]]);
    // body: a bowling shirt on a ball-shaped torso
    ell(0, -9.3 + lean * 0.4, bw, build ? 5.9 : 5.6, shirt);
    g.save(); g.beginPath(); g.ellipse(0, -9.3 + lean * 0.4, bw, build ? 5.9 : 5.6, 0, 0, TAU); g.clip();
    g.fillStyle = trim;
    if (back) { g.fillRect(-bw, -5.3, bw * 2, 0.9); }
    else { g.fillRect(1.6, -16, 2.1, 14); }
    g.fillStyle = "rgba(0,0,0,0.13)"; g.fillRect(bw * 0.45, -16, bw, 14);
    g.restore();
    if (back) {
      g.fillStyle = trim; g.font = "700 3.6px Fredoka, Arial"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(String(pose.tag || "").slice(0, 4).toUpperCase(), 0, -9.6 + lean * 0.4);
    } else {
      g.fillStyle = trim; g.beginPath(); g.moveTo(-2.2, -14.4); g.lineTo(0, -11.6); g.lineTo(2.2, -14.4); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = INK; [-9.8, -7.8, -5.8].forEach(by => { g.beginPath(); g.arc(0, by, 0.32, 0, TAU); g.fill(); });
    }
    // head
    const hy = -18.2 + lean * 1.6 + (mood > 0 ? -0.4 : 0), hr = 4.7;
    if (L[2] === 4) ell(0, hy - 0.8, 6.4, 6, hairC);
    if (L[2] === 3) { g.beginPath(); g.moveTo(back ? 0 : 3.6, hy - 1); g.quadraticCurveTo(back ? 3.4 : 8.6, hy + 1.5, back ? 0.6 : 6.4, hy + 7.4); g.quadraticCurveTo(back ? -2.4 : 4.4, hy + 3, back ? -0.6 : 3, hy + 0.6); g.closePath(); fs(hairC); }
    ell(-hr, hy + 0.5, 0.95, 1.25, skin); ell(hr, hy + 0.5, 0.95, 1.25, skin);
    ell(0, hy, hr, hr, skin);
    g.save(); g.beginPath(); g.arc(0, hy, hr, 0, TAU); g.clip();
    g.fillStyle = hairC;
    if (L[2] === 1 || L[2] === 3) g.fillRect(-hr, hy - hr, hr * 2, back ? hr * 1.45 : hr * 0.62);
    if (L[2] === 2) g.fillRect(-hr, hy - hr, hr * 2, back ? hr * 1.2 : hr * 0.5);
    if (L[2] === 4) g.fillRect(-hr, hy - hr, hr * 2, back ? hr * 1.6 : hr * 0.55);
    g.restore();
    g.beginPath(); g.arc(0, hy, hr, 0, TAU); g.stroke();
    if (L[2] === 2) { g.beginPath(); g.moveTo(-4, hy - 2.6); [[-3, -7.4], [-1.6, -4], [0, -8], [1.6, -4], [3, -7.4], [4, -2.6]].forEach(([px, py]) => g.lineTo(px, hy + py)); g.closePath(); fs(hairC); }
    if (L[2] === 5) { g.beginPath(); g.roundRect(-1.1, hy - 7.6, 2.2, back ? 9.5 : 5.6, 1); fs(hairC); }
    if (!back) {
      const ey = hy - 0.2;
      g.fillStyle = INK;
      if (L[4] === 0) { g.beginPath(); g.arc(-1.7, ey, 0.55, 0, TAU); g.arc(1.7, ey, 0.55, 0, TAU); g.fill(); }
      else if (L[4] === 1) { ell(-1.7, ey, 1.35, 1.5, "#fff"); ell(1.7, ey, 1.35, 1.5, "#fff"); g.fillStyle = INK; g.beginPath(); g.arc(-1.3, ey + 0.3, 0.6, 0, TAU); g.arc(1.9, ey - 0.2, 0.6, 0, TAU); g.fill(); }
      else if (L[4] === 2) { g.lineWidth = 0.5; g.beginPath(); g.arc(-1.7, ey, 0.9, 0.15, Math.PI - 0.15); g.stroke(); g.beginPath(); g.arc(1.7, ey, 0.9, 0.15, Math.PI - 0.15); g.stroke(); g.lineWidth = 0.42; }
      else { g.beginPath(); g.arc(-1.7, ey + 0.2, 0.55, 0, TAU); g.arc(1.7, ey + 0.2, 0.55, 0, TAU); g.fill(); g.lineWidth = 0.6; g.beginPath(); g.moveTo(-2.9, ey - 1.5); g.lineTo(-0.8, ey - 0.7); g.moveTo(2.9, ey - 1.5); g.lineTo(0.8, ey - 0.7); g.stroke(); g.lineWidth = 0.42; }
      const my = hy + 2.3;
      if (mood < 0) { g.beginPath(); g.arc(0, my + 1.1, 1.3, Math.PI + 0.4, TAU - 0.4); g.stroke(); }
      else if (L[5] === 0 && mood <= 0) { g.beginPath(); g.arc(0, my - 0.7, 1.5, 0.35, Math.PI - 0.35); g.stroke(); }
      else if (L[5] === 1 || mood > 0) { g.beginPath(); g.moveTo(-1.9, my - 0.4); g.quadraticCurveTo(0, my + 2.2, 1.9, my - 0.4); g.closePath(); fs("#fff"); }
      else if (L[5] === 2) { g.beginPath(); g.moveTo(-1.3, my); g.lineTo(1.3, my); g.stroke(); }
      else { g.beginPath(); g.arc(0, my - 0.7, 1.5, 0.35, Math.PI - 0.35); g.stroke(); ell(0.3, my + 1, 0.75, 0.9, "#f0556a"); }
      if (L[9] === 1) { g.lineWidth = 0.45; g.fillStyle = "rgba(200,230,255,0.45)"; [-1.8, 1.8].forEach(cx => { g.beginPath(); g.arc(cx, ey, 1.5, 0, TAU); g.fill(); g.stroke(); }); g.beginPath(); g.moveTo(-0.3, ey); g.lineTo(0.3, ey); g.stroke(); g.lineWidth = 0.42; }
      if (L[9] === 2) { g.fillStyle = "#15161c"; g.beginPath(); g.roundRect(-3.6, ey - 1.1, 3.2, 2.1, 0.7); g.roundRect(0.4, ey - 1.1, 3.2, 2.1, 0.7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-0.4, ey - 0.6); g.lineTo(0.4, ey - 0.6); g.moveTo(-3.6, ey - 0.6); g.lineTo(-hr, ey - 0.9); g.moveTo(3.6, ey - 0.6); g.lineTo(hr, ey - 0.9); g.stroke(); }
      if (L[9] === 3) { g.fillStyle = "rgba(200,230,255,0.5)"; g.beginPath(); g.arc(1.8, ey, 1.6, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.moveTo(3.2, ey + 0.8); g.quadraticCurveTo(4.6, ey + 4, 3.4, ey + 6.5); g.stroke(); }
    } else if (L[9] === 2 || L[9] === 1) { g.beginPath(); g.moveTo(-hr, hy - 0.5); g.lineTo(-hr + 1.2, hy - 0.7); g.moveTo(hr, hy - 0.5); g.lineTo(hr - 1.2, hy - 0.7); g.stroke(); }
    // hats
    const top = hy - hr;
    if (L[8] === 1) { g.beginPath(); g.arc(0, hy - 1, hr + 0.25, Math.PI, TAU); g.closePath(); fs("#d1383f"); if (back) { rr(-1.6, hy - 1.6, 3.2, 1.2, 0.5, "#a3262c"); } else { g.beginPath(); g.ellipse(0, hy - 1, hr + 1.3, 1, 0, 0, Math.PI, true); g.closePath(); fs("#a3262c"); } ell(0, top - 0.1, 0.55, 0.45, "#a3262c"); }
    if (L[8] === 2) { g.beginPath(); g.arc(0, hy - 0.6, hr + 0.3, Math.PI, TAU); g.closePath(); fs("#2f7d48"); rr(-hr - 0.4, hy - 1.5, hr * 2 + 0.8, 1.5, 0.6, "#f2e9c8"); ell(0, top - 0.7, 1.15, 1.15, "#f2e9c8"); }
    if (L[8] === 3) { ell(0, hy - 2.4, hr + 3.4, 1.5, "#9c6b3a"); g.beginPath(); g.moveTo(-3.4, hy - 2.6); g.quadraticCurveTo(-3.6, top - 3.6, -1.2, top - 3); g.quadraticCurveTo(0, top - 2, 1.2, top - 3); g.quadraticCurveTo(3.6, top - 3.6, 3.4, hy - 2.6); g.closePath(); fs("#b98247"); g.fillStyle = "#4a2d14"; g.fillRect(-3.3, hy - 3.6, 6.6, 0.8); }
    if (L[8] === 4) { g.beginPath(); g.arc(0, hy - 0.2, hr + 0.75, Math.PI * 0.92, TAU + Math.PI * 0.08); g.closePath(); fs("#ffd200"); g.fillStyle = "#22407a"; g.fillRect(-0.8, top - 0.9, 1.6, back ? hr * 1.9 : hr * 0.9); if (!back) { g.lineWidth = 0.55; g.strokeStyle = "#8a8f9c"; g.beginPath(); g.moveTo(-hr - 0.4, hy + 1); g.quadraticCurveTo(0, hy + 5.4, hr + 0.4, hy + 1); g.moveTo(-hr, hy + 2.3); g.quadraticCurveTo(0, hy + 3.6, hr, hy + 2.3); g.stroke(); g.lineWidth = 0.42; g.strokeStyle = INK; } }
    if (L[8] === 5) { g.beginPath(); g.moveTo(-3.6, top + 1.3); [[-4, -3], [-2, -0.8], [0, -3.8], [2, -0.8], [4, -3], [3.6, 1.3]].forEach(([px, py]) => g.lineTo(px, top + py)); g.closePath(); fs("#ffd23c"); g.fillStyle = "#d1383f"; g.beginPath(); g.arc(0, top - 0.2, 0.6, 0, TAU); g.fill(); }
    if (L[8] === 6) { g.beginPath(); g.moveTo(-3.2, top + 1.2); g.lineTo(-0.7, top - 7); g.lineTo(0.7, top - 7); g.lineTo(3.2, top + 1.2); g.closePath(); fs("#ff7a1a"); g.fillStyle = "#fff"; g.beginPath(); g.moveTo(-2.25, top - 1.9); g.lineTo(2.25, top - 1.9); g.lineTo(1.7, top - 3.7); g.lineTo(-1.7, top - 3.7); g.closePath(); g.fill(); rr(-4.2, top + 0.6, 8.4, 1.3, 0.4, "#ff7a1a"); }
    if (L[8] === 7) { g.lineWidth = 0.6; g.beginPath(); g.moveTo(-1.8, top + 0.4); g.quadraticCurveTo(-3, top - 3, -3.6, top - 4.6); g.moveTo(1.8, top + 0.4); g.quadraticCurveTo(3, top - 3, 3.6, top - 4.6); g.stroke(); g.lineWidth = 0.42; ell(-3.7, top - 5.2, 1.1, 1.1, "#ffd23c"); ell(3.7, top - 5.2, 1.1, 1.1, "#ffd23c"); }
    // the bowling arm, with the ball if it hasn't been let go
    const hand = mood > 0 ? [8.6, -19.5] : swing < 0 ? [7.6 + swing * 0.4, -6.4 - swing * 2.6 + lean] : [7.6 - swing * 2.4, -6.4 - swing * 10 + lean];
    armTo(side * (bw - 0.9), -11.6 + lean, [side * hand[0], hand[1]]);
    g.restore();
    if (pose.hold) drawBall(g, x + side * hand[0] * s, y - (pose.bob || 0) * s + (hand[1] + 2.6) * s, 3.7 * s * (swing < 0 ? 1 - swing * 0.12 : 1 - swing * 0.1), L[10], 0.9);
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

  // scene: { alley, t, dt, pins (a throw's pins) or standing, ball, ballIdx, bowler, aim, power, spin, word, up, portrait }
  function drawScene(g, v, sc) {
    const al = ALLEYS[sc.alley] || ALLEYS[0], t = sc.t || 0;
    backdrop(g, v, al, t, sc.alley || 0);
    [-63, 63].forEach(ox => { housing(g, v, ox, al, true, t); lane(g, v, ox, al, true); });
    housing(g, v, 0, al, false, t);
    lane(g, v, 0, al, false);
    [-63, 63].forEach(ox => YB.PIN_SPOTS.forEach(([x, row]) => { const p = P(v, ox + x, YB.HEAD + row * YB.ROW); drawPin(g, p[0], p[1], p[2], 0, 1, 0.5, true); }));

    // aiming arrow, painted on the lane
    if (sc.aim) {
      const a = sc.aim, len = 62, tipx = a.pos + a.dir * 0.1 * len;
      const col = a.live ? "#ff3d5a" : "rgba(255,255,255,0.75)";
      g.lineWidth = 2; g.lineJoin = "round";
      quad(g, v, [[a.pos - 1.1, 5], [a.pos + 1.1, 5], [tipx + 0.9, len - 9], [tipx - 0.9, len - 9]], col, INK);
      quad(g, v, [[tipx - 3.2, len - 9], [tipx + 3.2, len - 9], [tipx + a.dir * 0.9, len + 2]], col, INK);
    }

    // pins and ball, far to near
    const things = [];
    const pins = sc.pins || YB.PIN_SPOTS.map(([x, row], i) => ({ x, y: YB.HEAD + row * YB.ROW, st: sc.standing && !sc.standing[i] ? 3 : 0 }));
    pins.forEach((p, i) => {
      if (p.st > 2 || (p.st === 2 && (p._g = (p._g || 0) + (sc.dt || 0)) > 0.25)) return;
      if (p.st >= 1 && p._f === undefined) { p._f = 0; p._away = Math.abs(p.vx) < Math.abs(p.vy) * 0.45; p._side = p.vx > 0 ? 1 : p.vx < 0 ? -1 : (i % 2 ? 1 : -1); p._rot = 0; }
      if (p.st >= 1) { p._f = Math.min(1, p._f + (sc.dt || 0) / 0.2); p._rot += (sc.dt || 0) * Math.sqrt((p.vx || 0) * (p.vx || 0) + (p.vy || 0) * (p.vy || 0)) * 0.05 * p._side; }
      things.push({ y: p.y, pin: p });
    });
    if (sc.ball && !sc.ball.gone) things.push({ y: sc.ball.y, ball: sc.ball });
    things.sort((a, b) => b.y - a.y);
    things.forEach(o => {      // reflections in the polished wood
      if (o.pin && o.pin.st === 0) { const p = P(v, o.pin.x, o.pin.y); drawPin(g, p[0], p[1], p[2], 0, -0.55, 0.16, true); }
    });
    things.forEach(o => {
      if (o.pin) {
        const p = o.pin, s = P(v, p.x, p.y);
        if (p.st === 0) { g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse(s[0] + s[2] * 0.8, s[1], s[2] * 2.6, s[2] * 0.8, 0, 0, TAU); g.fill(); drawPin(g, s[0], s[1], s[2]); }
        else {
          const f = p._f, e = f * f * (3 - 2 * f);
          g.fillStyle = "rgba(0,0,0,0.2)"; g.beginPath(); g.ellipse(s[0], s[1], s[2] * (2.6 + e * 3), s[2] * 1, 0, 0, TAU); g.fill();
          drawPin(g, s[0], s[1] + s[2] * e * 2.2, s[2], p._away ? e * 0.5 * p._side + p._rot * 0.3 : e * 1.5 * p._side + p._rot, p._away ? 1 - e * 0.5 : 1);
        }
      } else {
        const b = o.ball, s = P(v, b.x, b.y, 0), r = YB.RB * s[2];
        g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.ellipse(s[0] + r * 0.2, s[1], r * 1.05, r * 0.32, 0, 0, TAU); g.fill();
        drawBall(g, s[0], s[1] - r * (b.gutter ? 0.75 : 1), r, sc.ballIdx || 0, b.y / 5);
      }
    });

    if (sc.bowler) {
      const bo = sc.bowler, s = P(v, bo.x, bo.y);
      if (s[1] - 23 * s[2] < v.H) drawBowler(g, s[0], s[1], s[2] * (v.portrait ? 0.8 : 0.84), bo.look, bo.pose, true);
    }
    hud(g, v, sc, al);
  }

  function hud(g, v, sc, al) {
    const W = v.W, H = v.H;
    // which pins are up, like the lights over a real lane
    if (sc.up) {
      g.save(); g.translate(W - 86, 10);
      g.fillStyle = "rgba(10,14,30,0.78)"; g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.roundRect(0, 0, 76, 62, 10); g.fill(); g.stroke();
      YB.PIN_SPOTS.forEach(([x, row], i) => { g.fillStyle = sc.up[i] ? "#ffd23c" : "rgba(255,255,255,0.16)"; g.beginPath(); g.arc(38 + x * 1.5, 50 - row * 12.5, 4.6, 0, TAU); g.fill(); });
      g.restore();
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
      const w = sc.word, a = Math.min(1, w.t / 0.25), sc2 = 0.4 + 0.6 * (1 - Math.pow(1 - a, 3)) + (a >= 1 ? Math.sin(w.t * 6) * 0.02 : 0);
      g.save(); g.translate(W / 2, H * 0.4); g.rotate(-0.06); g.scale(sc2, sc2);
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

  // A portrait for lists and the dressing room: draws a bowler from the front onto a small canvas.
  function portrait(canvas, look, opts) {
    opts = opts || {};
    const g = canvas.getContext("2d"), W = canvas.width, H = canvas.height;
    g.clearRect(0, 0, W, H);
    if (opts.bg) { g.fillStyle = opts.bg; g.fillRect(0, 0, W, H); }
    const s = H / (opts.bust ? 17 : 31);
    drawBowler(g, W / 2 - (opts.ball ? s * 2 : 0), opts.bust ? H + s * 9.5 : H - s * 1.6, s, look, { mood: opts.mood || 0, tag: opts.tag }, opts.back);
    if (opts.ball) drawBall(g, W / 2 + s * 8.2, H - s * 5.4, s * 3.9, fixLook(look)[10], 0.9);
  }

  YB.art = { PARTS, NAMES, PRICES, SIZES, DEFAULT_LOOK, ALLEYS, fixLook, randomLook, makeView, P, drawScene, drawBowler, drawBall, drawPin, drawStar, portrait };
})(typeof window !== "undefined" ? window : globalThis);
