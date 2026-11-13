/* Yowza Bowl: oddball ten-pin for the Yowza League.
   A spiritual successor to the early-2000s browser bowling games where two to four cartoon bowlers shared a lane and a
   chat box. Everything here is original: the physics, the art (drawn in code) and the sounds.

   The top half of this file is the engine (lane physics, scoring, the computer bowlers and challenge codes). It has no
   page dependencies, so `node games/test_bowl.js` can check it. The bottom half draws the game and runs a match.

   The physics only uses + - * / and Math.sqrt on purpose: those give the same answer in every browser, so a throw
   replayed from a challenge link knocks down exactly the pins it did for the person who bowled it. */
(function (root) {
  "use strict";

  // ----- lane geometry, in inches-ish units. x: 0 is the center board. y: 0 is the foul line, pins are up-lane. -----
  const LANE = 21, WALL = 26.5, HEAD = 170, ROW = 10.39, PIT = 214, APPROACH = -24;
  const RB = 4.3, RP = 2.4, RD = 2.55;           // ball, standing pin, toppled pin
  const DT = 1 / 240, TOPPLE = 22;                // a nudge slower than TOPPLE leaves a pin standing
  const PIN_SPOTS = [[0, 0], [-6, 1], [6, 1], [-12, 2], [0, 2], [12, 2], [-18, 3], [-6, 3], [6, 3], [18, 3]];
  const VERSION = 1;

  const BALLS = [
    { name: "House Ball", blurb: "Does a bit of everything. Smells like the 90s.", mass: 4.5, hook: 1, speed: 1, wob: 0, c: "#1c3faa", c2: "#6f8fff" },
    { name: "Cannonball", blurb: "Heavy. Barely hooks, but pins fly.", mass: 7.5, hook: 0.45, speed: 0.92, wob: 0, c: "#2b2b2b", c2: "#8a8a8a" },
    { name: "Screwball", blurb: "Light, with a huge hook. Hard to tame.", mass: 3.5, hook: 1.7, speed: 1.04, wob: 0, c: "#b3001b", c2: "#ff9aa8" },
    { name: "The Pigskin", blurb: "A football. Wobbles wherever it wants, then explodes.", mass: 6.4, hook: 0.9, speed: 1, wob: 1, c: "#8a4b2a", c2: "#ffffff" }
  ];

  // ----- seeded random numbers (integer math only, identical everywhere) -----
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const gauss = r => (r() + r() + r() + r() - 2) * 1.73;   // roughly a bell curve with spread 1

  // ----- throws are stored as three bytes, so every throw can travel in a link -----
  const clampByte = v => Math.max(0, Math.min(255, Math.round(v)));
  const toBytes = (pos, power, hook) => [clampByte((pos + 17) / 34 * 255), clampByte(power * 255), clampByte((hook + 1) / 2 * 255)];
  const fromBytes = b => ({ pos: b[0] / 255 * 34 - 17, power: b[1] / 255, hook: b[2] / 255 * 2 - 1 });

  // ----- one throw -----
  // standing: ten true/false values. bytes: [spot, power, spin]. Returns a state you step() until state.done.
  function createThrow(standing, bytes, ballIdx, seed) {
    const ball = BALLS[ballIdx] || BALLS[0];
    const inp = fromBytes(bytes);
    const r = rng(seed);
    const pins = PIN_SPOTS.map(([x, row], i) => ({
      x: x + (r() - 0.5) * 0.5, y: HEAD + row * ROW + (r() - 0.5) * 0.5, vx: 0, vy: 0,
      st: standing[i] ? 0 : 3               // 0 standing, 1 toppled, 2 swept into the pit, 3 wasn't there
    }));
    const speed = (100 + 70 * inp.power) * ball.speed;
    return {
      pins, t: 0, done: false, hits: 0, firstHit: -1, wobT: 0, wobA: 0, r,
      ball: { x: inp.pos, y: 0, vx: 0, vy: speed, gutter: false, gone: false, type: ballIdx },
      curve: inp.hook * 50 * ball.hook * (1.3 - 0.6 * inp.power), mass: ball.mass, wob: ball.wob
    };
  }

  function step(s) {
    const b = s.ball, pins = s.pins;
    s.t += DT;
    if (!b.gone) {
      if (!b.gutter) {
        const ramp = b.y < 50 ? 0 : b.y > 110 ? 1 : (b.y - 50) / 60;   // the front of the lane is oiled: no hook yet
        let ax = s.curve * ramp;
        if (s.wob) {
          s.wobT -= DT;
          if (s.wobT <= 0) { s.wobT = 0.12; s.wobA = (s.r() - 0.5) * 48 * s.wob; }
          ax += s.wobA;
        }
        b.vx += ax * DT;
        if (b.x > LANE || b.x < -LANE) { b.gutter = true; b.x = b.x > 0 ? LANE + 3 : -LANE - 3; b.vx = 0; if (b.vy < 60) b.vy = 60; }
      }
      b.x += b.vx * DT;
      b.y += b.vy * DT;
      if (b.y > PIT + 6) b.gone = true;
      if (!b.gutter && b.vy < 12 && b.vy > -12 && b.vx < 12 && b.vx > -12) b.vy += 40 * DT;   // never let it die on the deck
    }
    let moving = false;
    for (let i = 0; i < 10; i++) {
      const p = pins[i];
      if (p.st !== 1) continue;
      p.x += p.vx * DT;
      p.y += p.vy * DT;
      p.vx *= 0.9915;
      p.vy *= 0.9915;
      if (p.vx * p.vx + p.vy * p.vy < 2.5) { p.vx = 0; p.vy = 0; } else moving = true;
      if (p.x > WALL - RP && p.vx > 0) { p.x = WALL - RP; p.vx = -p.vx * 0.55; }     // kickbacks
      if (p.x < -WALL + RP && p.vx < 0) { p.x = -WALL + RP; p.vx = -p.vx * 0.55; }
      if (p.y > PIT) { p.st = 2; p.vx = 0; p.vy = 0; }
    }
    // ball against pins
    if (!b.gone && !b.gutter) {
      for (let i = 0; i < 10; i++) {
        const p = pins[i];
        if (p.st > 1) continue;
        const dx = p.x - b.x, dy = p.y - b.y, rr = RB + RP, d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
        const vr = (b.vx - p.vx) * nx + (b.vy - p.vy) * ny;
        if (vr > 0) {
          const j = 1.6 * vr / (1 / s.mass + 1);
          b.vx -= j / s.mass * nx; b.vy -= j / s.mass * ny;
          p.vx += j * nx; p.vy += j * ny;
          if (p.st === 0) { p.st = 1; s.hits++; }
          if (s.firstHit < 0) s.firstHit = s.t;
        }
        const push = rr - d;
        p.x += nx * push; p.y += ny * push;
      }
    }
    // pins against pins
    for (let i = 0; i < 10; i++) {
      const p = pins[i];
      if (p.st > 1) continue;
      for (let k = i + 1; k < 10; k++) {
        const q = pins[k];
        if (q.st > 1 || (p.st === 0 && q.st === 0)) continue;
        const rr = (p.st ? RD : RP) + (q.st ? RD : RP);
        const dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
        const vr = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
        const push = rr - d;
        if (p.st === 1 && q.st === 1) {
          if (vr > 0) { const j = 0.72 * vr; p.vx -= j * nx; p.vy -= j * ny; q.vx += j * nx; q.vy += j * ny; }
          p.x -= nx * push / 2; p.y -= ny * push / 2; q.x += nx * push / 2; q.y += ny * push / 2;
        } else {
          const mover = p.st === 1 ? p : q, still = p.st === 1 ? q : p, sgn = p.st === 1 ? 1 : -1;
          if (vr > TOPPLE) {
            const j = 0.72 * vr;
            mover.vx -= sgn * j * nx; mover.vy -= sgn * j * ny;
            still.vx += sgn * j * nx; still.vy += sgn * j * ny;
            still.st = 1; s.hits++;
          } else if (vr > 0) {
            mover.vx -= sgn * 1.35 * vr * nx; mover.vy -= sgn * 1.35 * vr * ny;
          }
          mover.x -= sgn * nx * push; mover.y -= sgn * ny * push;
        }
      }
    }
    const ballOut = b.gone || (b.gutter && b.y > PIT);
    if (b.gutter && b.y > PIT) b.gone = true;
    if ((ballOut && !moving) || s.t > 9 || (s.firstHit >= 0 && s.t - s.firstHit > 4.5)) s.done = true;
    return s;
  }

  function finish(s) {
    while (!s.done) step(s);
    return result(s);
  }
  function result(s) {
    const standing = s.pins.map(p => p.st === 0);
    return { standing, count: s.pins.filter(p => p.st === 1 || p.st === 2).length, gutter: s.ball.gutter && s.hits === 0 };
  }

  // A split: the head pin is down and what's left is in two or more groups.
  function isSplit(standing) {
    if (standing[0]) return false;
    const left = [];
    standing.forEach((up, i) => { if (up) left.push(i); });
    if (left.length < 2) return false;
    const seen = new Set([left[0]]), todo = [left[0]];
    while (todo.length) {
      const a = PIN_SPOTS[todo.pop()];
      left.forEach(i => {
        const c = PIN_SPOTS[i];
        if (!seen.has(i) && Math.abs(a[0] - c[0]) <= 12 && Math.abs(a[1] - c[1]) <= 1 && !(a[1] === c[1] && Math.abs(a[0] - c[0]) > 12)) { seen.add(i); todo.push(i); }
      });
    }
    return seen.size < left.length;
  }

  // ----- scoring -----
  function score(rolls) {
    const frames = [];
    let i = 0, total = 0, open = false;
    for (let f = 0; f < 10; f++) {
      const fr = { balls: [], cum: null };
      frames.push(fr);
      if (i >= rolls.length) continue;
      let pts = null;
      if (f < 9) {
        if (rolls[i] === 10) {
          fr.balls = [10];
          if (i + 2 < rolls.length) pts = 10 + rolls[i + 1] + rolls[i + 2];
          i += 1;
        } else if (i + 1 < rolls.length) {
          fr.balls = [rolls[i], rolls[i + 1]];
          const two = rolls[i] + rolls[i + 1];
          if (two === 10) { if (i + 2 < rolls.length) pts = 10 + rolls[i + 2]; } else pts = two;
          i += 2;
        } else {
          fr.balls = [rolls[i]];
          i += 1;
        }
      } else {
        fr.balls = rolls.slice(i, i + 3);
        const b = fr.balls;
        if (b.length === 3 || (b.length === 2 && b[0] + b[1] < 10)) pts = b[0] + b[1] + (b[2] || 0);
        i += b.length;
      }
      if (pts === null) open = true;
      if (!open) { total += pts; fr.cum = total; }
    }
    const last = frames[9].balls;
    const done = last.length === 3 || (last.length === 2 && last[0] + last[1] < 10);
    return { frames, total, done };
  }

  // What a scoresheet shows in each little box: X, /, - or a number.
  function marks(frames) {
    return frames.map((fr, f) => {
      const b = fr.balls, out = [];
      for (let k = 0; k < b.length; k++) {
        const prev = k ? b[k - 1] : null;
        const fresh = f < 9 ? k === 0 : k === 0 || (k === 1 && b[0] === 10) || (k === 2 && (b[1] === 10 || b[0] + b[1] === 10) && !(b[0] === 10 && b[1] < 10));
        if (fresh) out.push(b[k] === 10 ? "X" : b[k] === 0 ? "-" : String(b[k]));
        else out.push(prev + b[k] === 10 ? "/" : b[k] === 0 ? "-" : String(b[k]));
      }
      return out;
    });
  }

  // Where a bowler is in their game: which frame and ball, and whether the next ball faces a full rack.
  function progress(rolls) {
    const s = score(rolls);
    if (s.done) return { done: true, frame: 9, ball: 0, fresh: false };
    let f = 0;
    while (f < 9 && s.frames[f].balls.length && (s.frames[f].balls[0] === 10 || s.frames[f].balls.length === 2)) f++;
    const b = s.frames[f].balls;
    let fresh = b.length === 0;
    if (f === 9 && b.length === 1) fresh = b[0] === 10;
    if (f === 9 && b.length === 2) fresh = b[1] === 10 || b[0] + b[1] === 10;
    return { done: false, frame: f, ball: b.length, fresh };
  }

  // ----- the computer bowlers: they plan with the same physics you play with, then miss by an amount set by skill -----
  const planCache = {};
  function bestShot(standing, ballIdx) {
    const key = ballIdx + ":" + standing.map(s => (s ? 1 : 0)).join("");
    if (planCache[key]) return planCache[key];
    const full = standing.every(Boolean);
    const hooks = [-0.8, -0.4, 0, 0.4, 0.8], power = 0.72;
    const need = standing.filter(Boolean).length;
    let best = null;
    for (const hook of hooks) {
      const row = [];
      for (let pos = -17; pos <= 17; pos++) {
        let sum = 0;
        for (let k = 0; k < 2; k++) sum += finish(createThrow(standing, toBytes(pos, power, hook), ballIdx, 7001 + k * 13 + pos)).count - (10 - need);
        row.push(sum / 2);
      }
      row.forEach((v, n) => {
        // prefer a shot that still works if it lands a board either side
        const robust = v * 2 + (row[n - 1] === undefined ? v - 1 : row[n - 1]) + (row[n + 1] === undefined ? v - 1 : row[n + 1]) - (full && hook === 0 ? 1.5 : 0);
        if (!best || robust > best.robust) best = { robust, pos: n - 17, hook, power };
      });
    }
    return (planCache[key] = best);
  }

  // skill: 0 (lost in the car park) to 1 (league legend). nerves multiplies the miss (tenth-frame pressure).
  function cpuThrow(standing, ballIdx, skill, r, nerves) {
    const plan = bestShot(standing, ballIdx);
    const miss = (1.05 - skill) * (nerves || 1);
    const wild = r() < 0.04 + (1 - skill) * 0.1 ? 2.6 : 1;      // everybody yanks one now and then
    return toBytes(
      Math.max(-17, Math.min(17, plan.pos + gauss(r) * (0.4 + 7.5 * miss) * wild)),
      Math.max(0.15, Math.min(1, plan.power + gauss(r) * 0.12 * miss)),
      Math.max(-1, Math.min(1, plan.hook + gauss(r) * 0.42 * miss * wild)));
  }

  // Play out a whole game for a computer bowler (the tests use this to check the skill levels feel right).
  function simulateGame(ballIdx, skill, seed) {
    const r = rng(seed), rolls = [], throws = [];
    let standing = null;
    for (;;) {
      const p = progress(rolls);
      if (p.done) break;
      if (p.fresh || !standing) standing = Array(10).fill(true);
      const bytes = cpuThrow(standing, ballIdx, skill, r, p.frame === 9 ? 1.25 : 1);
      const before = standing.filter(Boolean).length;
      const res = finish(createThrow(standing, bytes, ballIdx, throwSeed(seed, rolls.length)));
      standing = res.standing;
      const fell = before - standing.filter(Boolean).length;
      rolls.push(fell);
      throws.push(bytes.concat(fell));
    }
    return { rolls, throws, total: score(rolls).total };
  }
  const throwSeed = (seed, n) => ((seed & 0xffff) * 131 + n * 977 + 17) >>> 0;

  // ----- challenge codes: a finished game squeezed into a link -----
  const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  function b64(bytes) {
    let out = "";
    for (let i = 0; i < bytes.length; i += 3) {
      const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
      out += B64[n >> 18] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : "") + (i + 2 < bytes.length ? B64[n & 63] : "");
    }
    return out;
  }
  function unb64(str) {
    const out = [];
    for (let i = 0; i < str.length; i += 4) {
      const c = [0, 1, 2, 3].map(k => (i + k < str.length ? B64.indexOf(str[i + k]) : 0));
      if (c.some(v => v < 0)) return null;
      const n = (c[0] << 18) | (c[1] << 12) | (c[2] << 6) | c[3], left = str.length - i;
      out.push(n >> 16);
      if (left > 2) out.push((n >> 8) & 255);
      if (left > 3) out.push(n & 255);
    }
    return out;
  }
  // game: { name, team, look: [shape, colour, eyes, hat, ball], seed, throws: [[spot, power, spin, pinsDown], ...] }
  function encodeGame(g) {
    const name = Array.from(new TextEncoder().encode(String(g.name || "").slice(0, 12))).slice(0, 36);
    const l = g.look;
    const bytes = [VERSION, (l[0] & 3) | ((l[1] & 7) << 2) | ((l[2] & 3) << 5), (l[3] & 7) | ((l[4] & 3) << 3),
      (g.seed >> 8) & 255, g.seed & 255, g.team & 255, name.length].concat(name, [g.throws.length]);
    g.throws.forEach(t => bytes.push(t[0], t[1], t[2], t[3]));
    let sum = 0;
    bytes.forEach(v => { sum = (sum * 31 + v) & 255; });
    bytes.push(sum);
    return b64(bytes);
  }
  function decodeGame(code) {
    try {
      const bytes = unb64(String(code));
      if (!bytes || bytes.length < 12 || bytes[0] !== VERSION) return null;
      let sum = 0;
      bytes.slice(0, -1).forEach(v => { sum = (sum * 31 + v) & 255; });
      if (sum !== bytes[bytes.length - 1]) return null;
      const nameLen = bytes[6];
      const name = new TextDecoder().decode(new Uint8Array(bytes.slice(7, 7 + nameLen)));
      let at = 7 + nameLen;
      const n = bytes[at++];
      if (n < 11 || n > 21 || bytes.length !== at + n * 4 + 1) return null;
      const throws = [];
      for (let i = 0; i < n; i++, at += 4) throws.push([bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]]);
      const rolls = throws.map(t => t[3]);
      if (rolls.some(v => v > 10) || !score(rolls).done) return null;
      return {
        name: name.replace(/[^\p{L}\p{N} ._'-]/gu, "").trim().slice(0, 12) || "Mystery Bowler", team: bytes[5],
        look: [bytes[1] & 3, (bytes[1] >> 2) & 7, (bytes[1] >> 5) & 3, bytes[2] & 7, (bytes[2] >> 3) & 3],
        seed: (bytes[3] << 8) | bytes[4], throws, rolls, total: score(rolls).total
      };
    } catch (e) { return null; }
  }

  const core = {
    BALLS, PIN_SPOTS, LANE, HEAD, ROW, PIT, RB, RP, DT, VERSION,
    rng, toBytes, fromBytes, createThrow, step, finish, result, isSplit, score, marks, progress,
    bestShot, cpuThrow, simulateGame, throwSeed, encodeGame, decodeGame
  };
  if (typeof module !== "undefined" && module.exports) module.exports = core;

  if (typeof document === "undefined") return;

  // ===================================================================================================================
  // The game itself: bowler art, lane drawing, sound, and the match.
  // ===================================================================================================================
  const SHAPE_NAMES = ["Blob", "Beanpole", "Boulder", "Brick"];
  const COLOR_NAMES = ["Swamp", "Ketchup", "Blueberry", "Mustard", "Grape", "Mint", "Bubblegum", "Concrete"];
  const COLORS = ["#7a9a3e", "#d9482b", "#2f6fd0", "#e0a100", "#8e44ad", "#1f9e8a", "#e86aa6", "#7d7d7d"];
  const SHADES = ["#566f27", "#a3311b", "#1d4c96", "#a87800", "#62297c", "#12705f", "#b3447c", "#555555"];
  const EYE_NAMES = ["Googly", "Cyclops", "Sleepy", "Shades"];
  const HAT_NAMES = ["No hat", "Ball cap", "Helmet", "Crown", "Traffic cone", "Antenna", "Top hat", "Mohawk"];
  const LOOK_SIZES = [4, 8, 4, 8, 4];
  const SHAPES = [
    [[3, 8], [2, 9], [1, 10], [1, 10], [1, 10], [1, 10], [1, 10], [1, 10], [2, 9], [2, 9]],
    [[4, 7], [3, 8], [3, 8], [3, 8], [3, 8], [3, 8], [3, 8], [3, 8], [3, 8], [3, 8], [3, 8], [3, 8]],
    [[3, 8], [1, 10], [0, 11], [0, 11], [0, 11], [0, 11], [0, 11], [1, 10], [3, 8]],
    [[1, 10], [1, 10], [1, 10], [1, 10], [1, 10], [1, 10], [1, 10], [1, 10], [1, 10]]
  ];

  // Draws a bowler on a 12-cell-wide grid. (x, y) is the middle of the feet; c is the size of one cell in pixels.
  function drawBowler(g, x, y, look, c) {
    const rows = SHAPES[look[0]] || SHAPES[0], h = rows.length;
    const left = Math.round(x - 6 * c), top = Math.round(y - (h + 1) * c);
    const cell = (cx, cy, w, hh, fill) => { g.fillStyle = fill; g.fillRect(left + cx * c, top + cy * c, w * c, hh * c); };
    rows.forEach(([a, b], r) => {
      cell(a, r, b - a + 1, 1, COLORS[look[1]]);
      cell(b, r, 1, 1, SHADES[look[1]]);
    });
    cell(rows[h - 1][0], h - 1, rows[h - 1][1] - rows[h - 1][0] + 1, 1, SHADES[look[1]]);
    cell(2, h, 3, 1, "#111"); cell(7, h, 3, 1, "#111");
    const e = 3;
    if (look[2] === 0) { cell(3, e, 2, 2, "#fff"); cell(7, e, 2, 2, "#fff"); cell(4, e + 1, 1, 1, "#000"); cell(7, e + 1, 1, 1, "#000"); }
    else if (look[2] === 1) { cell(4, e - 1, 4, 3, "#fff"); cell(5, e, 2, 2, "#000"); }
    else if (look[2] === 2) { cell(3, e + 1, 2, 1, "#000"); cell(7, e + 1, 2, 1, "#000"); }
    else { cell(3, e, 6, 1, "#000"); cell(3, e + 1, 2, 1, "#000"); cell(7, e + 1, 2, 1, "#000"); }
    cell(4, e + 3, 4, 1, "#000");
    const hat = look[3];
    if (hat === 1) { cell(3, -2, 6, 2, "#c00000"); cell(8, -1, 3, 1, "#7a0000"); }
    else if (hat === 2) { cell(2, -3, 8, 3, "#ffd200"); cell(3, -4, 6, 1, "#ffd200"); cell(5, -4, 2, 4, "#000080"); cell(9, 0, 2, 1, "#9a9a9a"); cell(10, 1, 1, 2, "#9a9a9a"); }
    else if (hat === 3) { cell(3, -1, 6, 1, "#ffd200"); cell(3, -2, 1, 1, "#ffd200"); cell(5, -2, 2, 1, "#ffd200"); cell(8, -2, 1, 1, "#ffd200"); cell(5, -3, 2, 1, "#ffd200"); }
    else if (hat === 4) { cell(3, -1, 6, 1, "#ff7a1a"); cell(4, -2, 4, 1, "#fff"); cell(4, -3, 4, 1, "#ff7a1a"); cell(5, -5, 2, 2, "#ff7a1a"); }
    else if (hat === 5) { cell(5, -3, 1, 3, "#111"); cell(4, -5, 3, 2, "#ffd200"); }
    else if (hat === 6) { cell(2, -1, 8, 1, "#111"); cell(3, -5, 6, 4, "#111"); cell(3, -2, 6, 1, "#c00000"); }
    else if (hat === 7) { cell(5, -4, 2, 4, "#ff3fa4"); cell(4, -2, 4, 2, "#ff3fa4"); }
  }

  function drawBall(g, sx, sy, type, rot, r) {
    const b = BALLS[type] || BALLS[0];
    g.save();
    g.translate(sx, sy);
    if (type === 3) {
      g.rotate(rot * 0.7);
      g.fillStyle = b.c;
      g.beginPath(); g.ellipse(0, 0, r * 0.78, r * 1.25, 0, 0, 6.2832); g.fill();
      g.fillStyle = "#fff";
      g.fillRect(-1, -r * 0.6, 2, r * 1.2);
      for (let k = -2; k <= 2; k++) g.fillRect(-4, k * r * 0.24 - 1, 8, 2);
    } else {
      g.fillStyle = b.c;
      g.beginPath(); g.arc(0, 0, r, 0, 6.2832); g.fill();
      g.fillStyle = b.c2;
      g.beginPath(); g.arc(-r * 0.35, -r * 0.35, r * 0.28, 0, 6.2832); g.fill();
      g.rotate(rot);
      g.fillStyle = "#000";
      [[0, -r * 0.45], [-r * 0.3, -r * 0.05], [r * 0.3, -r * 0.05]].forEach(([hx, hy]) => { g.beginPath(); g.arc(hx, hy, r * 0.14, 0, 6.2832); g.fill(); });
    }
    g.restore();
  }

  const CSS = `
.yb { display: grid; gap: 12px; }
.yb fieldset { border: 2px groove #fff; margin: 0; padding: 10px 12px 12px; min-width: 0; display: grid; gap: 8px; align-content: start; }
.yb legend { font: 700 13px var(--pixel, sans-serif); padding: 0 4px; }
.yb-cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
.yb label { display: grid; grid-template-columns: 52px minmax(0, 1fr); align-items: center; gap: 8px; font-size: 13px; }
.yb label.yb-check { display: flex; gap: 6px; }
.yb input[type=text], .yb select { font: 400 13px var(--body, sans-serif); color: #000; background: #fff; border: 0; border-radius: 0; padding: 4px 6px; min-height: 28px; min-width: 0; width: 100%;
  box-shadow: inset -1px -1px #fff, inset 1px 1px #808080, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a; }
.yb-me { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 10px; align-items: start; }
.yb-preview { width: 96px; height: 120px; image-rendering: pixelated; background: #2e7a3e; }
.yb-fields { display: grid; gap: 6px; }
.yb-pick { display: grid; grid-template-columns: 52px 28px minmax(0, 1fr) 28px; align-items: center; gap: 4px; font-size: 13px; }
.yb-pick b { text-align: center; font-weight: 400; background: #fff; padding: 4px 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  box-shadow: inset -1px -1px #fff, inset 1px 1px #808080, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a; }
.yb-pick .btn { padding: 4px 0; min-width: 28px; }
.yb-blurb, .yb-rec, .yb-hint { font-size: 12px; color: var(--ink-2, #3a3a3a); margin: 0; }
.yb-slot { display: grid; gap: 4px; }
.yb-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.yb-challenge { padding: 10px 12px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; background: var(--tip, #ffffe1); border: 1px solid #000; font-size: 13px; }
.yb-challenge b { font-family: var(--pixel, sans-serif); }
.yb-game { display: grid; grid-template-columns: minmax(220px, min(360px, 40%, calc(62vh * 216 / 336))) minmax(0, 1fr); gap: 14px; align-items: start; }
.yb-lane-col { display: grid; gap: 8px; min-width: 0; }
html.yb-playing #glorbo { display: none !important; }
.yb-turn { font: 700 14px var(--pixel, sans-serif); margin: 0; min-height: 2.5em; }
.yb-lane { position: relative; padding: 2px; background: #000; line-height: 0; }
.yb-lane canvas { width: 100%; height: auto; image-rendering: pixelated; touch-action: none; display: block; }
.yb-flash { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; text-align: center; line-height: 1;
  font: 400 44px var(--wordart, Impact, sans-serif); color: #ffd200; text-shadow: 3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000; letter-spacing: 0.03em; }
.yb-flash span { animation: yb-pop 0.35s ease-out; }
@keyframes yb-pop { from { transform: scale(2.2) rotate(-8deg); opacity: 0; } to { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .yb-flash span { animation: none; } }
.yb-meters { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 8px; align-items: center; font-size: 12px; }
.yb-meter { position: relative; height: 16px; background: #000;
  box-shadow: inset -1px -1px #fff, inset 1px 1px #808080, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a; overflow: hidden; }
.yb-meter i { position: absolute; top: 2px; bottom: 2px; left: 2px; width: 0; background: repeating-linear-gradient(90deg, #39ff5a 0 6px, #000 6px 8px); }
.yb-meter.yb-spin::before { content: ""; position: absolute; top: 0; bottom: 0; left: 50%; width: 1px; background: #808080; }
.yb-meter.yb-spin i { width: 8px; margin-left: -4px; left: 50%; background: #ffd200; }
.yb-meter.live { outline: 2px solid #ffd200; }
.yb-ctrl { display: grid; grid-template-columns: 48px minmax(0, 1fr) 48px; gap: 6px; }
.yb-ctrl .btn { min-height: 44px; font: 700 15px var(--pixel, sans-serif); padding: 4px; touch-action: manipulation; }
.yb-ctrl .btn:disabled { color: #808080; text-shadow: 1px 1px #fff; cursor: default; }
.yb-side { display: grid; gap: 10px; min-width: 0; }
.yb-scores { overflow-x: auto; background: #fff; padding: 2px;
  box-shadow: inset -1px -1px #fff, inset 1px 1px #808080, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a; }
.yb-scores table { border-collapse: collapse; width: 100%; font-size: 12px; font-variant-numeric: tabular-nums; }
.yb-scores th, .yb-scores td { border: 1px solid #808080; padding: 2px 3px; text-align: center; min-width: 30px; }
.yb-scores thead th { background: var(--silver, #c0c0c0); font-weight: 400; }
.yb-scores th.who { text-align: left; min-width: 96px; max-width: 150px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.yb-scores th.who small { display: block; font-weight: 400; color: #3a3a3a; overflow: hidden; text-overflow: ellipsis; }
.yb-scores tr.up th.who { background: #000080; color: #fff; }
.yb-scores tr.up th.who small { color: #dfdfdf; }
.yb-scores td .m { display: block; letter-spacing: 1px; min-height: 1.3em; }
.yb-scores td .c { display: block; font-weight: 700; min-height: 1.3em; }
.yb-scores td.now { background: #ffffe1; }
.yb-scores td.tot { font-weight: 700; font-size: 14px; }
.yb-sides { font: 700 13px var(--pixel, sans-serif); margin: 0; }
.yb-chat { height: 150px; overflow-y: auto; background: #fff; padding: 6px 8px; font: 400 12px/1.5 var(--mono, monospace);
  box-shadow: inset -1px -1px #fff, inset 1px 1px #808080, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a; }
.yb-chat p { margin: 0; }
.yb-chat .yb-sys { color: #000080; }
.yb-chat .yb-g b { color: #3f6b00; }
.yb-over { padding: 10px 12px; background: var(--tip, #ffffe1); border: 1px solid #000; display: grid; gap: 8px; font-size: 13px; }
.yb-over h3 { font: 700 16px var(--pixel, sans-serif); margin: 0; }
.yb-over ol { margin: 0; padding-left: 22px; }
.yb-over input { font-size: 12px; }
@media (max-width: 760px) {
  .yb-cols, .yb-game { grid-template-columns: minmax(0, 1fr); }
  .yb-lane-col { margin-inline: auto; width: min(100%, 340px, max(220px, calc(58vh * 216 / 336))); }
  .yb-chat { height: 110px; }
}`;

  const HOUSE = [
    { id: -1, name: "Gutter Gary", blurb: "easy", skill: 0.22, nerves: 1.3, look: [3, 7, 2, 1, 0] },
    { id: -2, name: "Spare-Me Sam", blurb: "medium", skill: 0.6, nerves: 1.1, look: [1, 3, 0, 6, 2] },
    { id: -3, name: "Glorbo", blurb: "hard", skill: 0.9, nerves: 0.8, look: [0, 0, 1, 5, 1] }
  ];
  const VW = 216, VH = 336, S = 4, VIEW = VH / S;

  function mount(el, ctx) {
    ctx = ctx || {};
    const teams = ctx.teams || [];
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    if (!document.getElementById("yb-css")) {
      const st = document.createElement("style");
      st.id = "yb-css";
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    const randomLook = () => LOOK_SIZES.map(n => Math.floor(Math.random() * n));
    const lookFor = id => { const r = rng(id * 7919 + 11); return LOOK_SIZES.map(n => Math.floor(r() * n)); };

    // ----- what this device remembers -----
    let mem = { name: "", team: 0, look: randomLook(), best: 0, games: 0, strikes: 0, sound: true };
    try { Object.assign(mem, JSON.parse(localStorage.getItem("yowza-bowl") || "{}")); } catch (e) { /* private mode */ }
    if (!Array.isArray(mem.look) || mem.look.length !== 5) mem.look = randomLook();
    mem.look = mem.look.map((v, i) => ((Number(v) || 0) % LOOK_SIZES[i] + LOOK_SIZES[i]) % LOOK_SIZES[i]);
    const remember = () => { try { localStorage.setItem("yowza-bowl", JSON.stringify(mem)); } catch (e) { /* private mode */ } };

    const cpuList = teams.map(t => ({ id: t.id, name: t.manager || t.name, team: t, skill: t.skill == null ? 0.62 : t.skill, nerves: t.nerves || 1, look: lookFor(t.id) }));
    let challenge = ctx.challenge ? decodeGame(ctx.challenge) : null;

    el.innerHTML =
      '<div class="yb">' +
      '<div class="yb-lobby">' +
        '<div class="yb-challenge" hidden></div>' +
        '<div class="yb-cols">' +
          '<fieldset><legend>Your bowler</legend>' +
            '<div class="yb-me"><canvas class="yb-preview" width="96" height="120" aria-hidden="true"></canvas><div class="yb-fields">' +
              '<label>Name <input type="text" class="yb-name" maxlength="12" autocomplete="off" placeholder="Your name"></label>' +
              '<label>Team <select class="yb-team"><option value="0">Free agent</option>' + teams.map(t => '<option value="' + t.id + '">' + esc(t.name) + '</option>').join("") + '</select></label>' +
            '</div></div>' +
            ["Body", "Color", "Eyes", "Hat", "Ball"].map((n, i) => '<div class="yb-pick" data-i="' + i + '"><span>' + n + '</span><button class="btn" type="button" data-d="-1" aria-label="Previous ' + n.toLowerCase() + '">&#9664;</button><b></b><button class="btn" type="button" data-d="1" aria-label="Next ' + n.toLowerCase() + '">&#9654;</button></div>').join("") +
            '<p class="yb-blurb"></p>' +
            '<div class="yb-row"><button class="btn yb-dice" type="button">Surprise me</button></div>' +
          '</fieldset>' +
          '<fieldset><legend>Who else is bowling</legend>' +
            [2, 3, 4].map(n => '<div class="yb-slot"><label>Lane ' + n + ' <select class="yb-opp" data-n="' + n + '"></select></label>' +
              '<label hidden>Name <input type="text" class="yb-oname" maxlength="12" autocomplete="off" placeholder="Player ' + n + '"></label></div>').join("") +
            '<label class="yb-check"><input type="checkbox" class="yb-teams"> Teams: lanes 1 &amp; 3 against 2 &amp; 4</label>' +
            '<p class="yb-rec"></p>' +
            '<div class="yb-row"><button class="btn default yb-go" type="button">Bowl!</button></div>' +
          '</fieldset>' +
        '</div>' +
        '<p class="yb-hint">Ten frames, real scoring. Pick your spot, stop the power bar, stop the spin needle. Two to four bowlers share the lane: league managers bowl as computer players, or pass the phone around. When you finish, send your game to the group chat and anyone can bowl against it.</p>' +
      '</div>' +
      '<div class="yb-game" hidden>' +
        '<div class="yb-lane-col">' +
          '<p class="yb-turn" role="status"></p>' +
          '<div class="yb-lane"><canvas width="' + VW + '" height="' + VH + '" aria-label="Bowling lane"></canvas><div class="yb-flash" aria-hidden="true"></div></div>' +
          '<div class="yb-meters"><span>Power</span><div class="yb-meter yb-power"><i></i></div><span>Spin</span><div class="yb-meter yb-spin"><i></i></div></div>' +
          '<div class="yb-ctrl"><button class="btn yb-left" type="button" aria-label="Move left">&#9664;</button><button class="btn default yb-act" type="button">Bowl</button><button class="btn yb-right" type="button" aria-label="Move right">&#9654;</button></div>' +
          '<p class="yb-hint yb-tip"></p>' +
        '</div>' +
        '<div class="yb-side">' +
          '<div class="yb-over" hidden></div>' +
          '<p class="yb-sides" hidden></p>' +
          '<div class="yb-scores"><table></table></div>' +
          '<div class="yb-chat" role="log" aria-label="Lane chat"></div>' +
          '<div class="yb-row"><button class="btn yb-sound" type="button"></button><button class="btn yb-quit" type="button">Leave the lane</button></div>' +
        '</div>' +
      '</div></div>';
    const q = s => el.querySelector(s), qa = s => Array.from(el.querySelectorAll(s));
    const lobby = q(".yb-lobby"), gameEl = q(".yb-game"), canvas = q(".yb-lane canvas"), g = canvas.getContext("2d");
    const flash = q(".yb-flash"), turnEl = q(".yb-turn"), tipEl = q(".yb-tip"), actBtn = q(".yb-act"), chatEl = q(".yb-chat"), overEl = q(".yb-over");
    const powerEl = q(".yb-power"), spinEl = q(".yb-spin.yb-meter");

    // ----- lobby -----
    const prev = q(".yb-preview").getContext("2d");
    function showLook() {
      prev.fillStyle = "#2e7a3e"; prev.fillRect(0, 0, 96, 120);
      prev.fillStyle = "#276b35"; prev.fillRect(0, 100, 96, 20);
      drawBowler(prev, 44, 104, mem.look, 6);
      drawBall(prev, 78, 94, mem.look[4], 0.4, 13);
      const names = [SHAPE_NAMES, COLOR_NAMES, EYE_NAMES, HAT_NAMES, BALLS.map(b => b.name)];
      qa(".yb-pick").forEach((p, i) => { p.querySelector("b").textContent = names[i][mem.look[i]]; });
      q(".yb-blurb").textContent = BALLS[mem.look[4]].name + ": " + BALLS[mem.look[4]].blurb;
    }
    qa(".yb-pick").forEach(p => p.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      const i = Number(p.dataset.i);
      mem.look[i] = (mem.look[i] + Number(b.dataset.d) + LOOK_SIZES[i]) % LOOK_SIZES[i];
      remember(); showLook();
    }));
    q(".yb-dice").addEventListener("click", () => { mem.look = randomLook(); remember(); showLook(); });
    const nameIn = q(".yb-name"), teamIn = q(".yb-team");
    nameIn.value = mem.name || "";
    if (teams.some(t => t.id === Number(mem.team))) teamIn.value = String(mem.team);
    nameIn.addEventListener("input", () => { mem.name = nameIn.value.trim().slice(0, 12); remember(); });
    teamIn.addEventListener("change", () => { mem.team = Number(teamIn.value); remember(); });

    function fillSlots() {
      qa(".yb-opp").forEach(sel => {
        const n = Number(sel.dataset.n), keep = sel.value;
        sel.innerHTML = '<option value="">Nobody</option>' +
          (n === 2 && challenge ? '<option value="ghost">Challenge: ' + esc(challenge.name) + "'s " + challenge.total + '</option>' : "") +
          '<option value="human">Another person (pass and play)</option>' +
          '<optgroup label="House bowlers">' + HOUSE.map(h => '<option value="cpu:' + h.id + '">' + esc(h.name) + ' (' + h.blurb + ')</option>').join("") + '</optgroup>' +
          (cpuList.length ? '<optgroup label="League managers">' + cpuList.map(c => '<option value="cpu:' + c.id + '">' + esc(c.name) + (c.team.manager ? ' (' + esc(c.team.name) + ')' : "") + '</option>').join("") + '</optgroup>' : "");
        if (keep) sel.value = keep;
      });
    }
    fillSlots();
    const opp2 = q('.yb-opp[data-n="2"]');
    opp2.value = challenge ? "ghost" : cpuList.length ? "cpu:" + pick(cpuList).id : "cpu:-2";
    const teamsBox = q(".yb-teams");
    function slotsChanged() {
      qa(".yb-opp").forEach(sel => { sel.closest(".yb-slot").querySelector(".yb-oname").closest("label").hidden = sel.value !== "human"; });
      const full = qa(".yb-opp").every(sel => sel.value);
      teamsBox.disabled = !full;
      if (!full) teamsBox.checked = false;
    }
    qa(".yb-opp").forEach(sel => sel.addEventListener("change", slotsChanged));
    slotsChanged();
    function showRecord() {
      q(".yb-rec").textContent = mem.games ? "On this device: best game " + mem.best + ", " + mem.games + (mem.games === 1 ? " game" : " games") + " bowled, " + mem.strikes + (mem.strikes === 1 ? " strike." : " strikes.") : "No games on this device yet.";
    }
    function showChallenge() {
      const box = q(".yb-challenge");
      box.hidden = !challenge;
      if (!challenge) return;
      const t = teams.find(x => x.id === challenge.team);
      box.innerHTML = "<span><b>" + esc(challenge.name) + "</b>" + (t ? " (" + esc(t.name) + ")" : "") + " rolled a <b>" + challenge.total +
        "</b> and says you can't beat it. Their game is loaded into lane 2, throw for throw.</span>";
    }
    showLook(); showRecord(); showChallenge();

    // ----- sound: all synthesized, nothing to download -----
    let ac = null, rumble = null;
    function audio() {
      if (!mem.sound) return null;
      try {
        if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
        if (ac.state === "suspended") ac.resume();
      } catch (e) { ac = null; }
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
    function crash(n) {
      const k = noise(0.28, 1800, Math.min(0.5, 0.12 + n * 0.05), "bandpass");
      if (!k) return;
      k.v.gain.exponentialRampToValueAtTime(0.001, k.a.currentTime + 0.28);
      k.src.start();
    }
    function startRumble() {
      stopRumble();
      const k = noise(3, 140, 0.16);
      if (!k) return;
      k.src.loop = true; k.src.start(); rumble = k;
    }
    function stopRumble() { if (rumble) { try { rumble.src.stop(); } catch (e) { /* already stopped */ } rumble = null; } }
    function tune(notes, wave) {
      const a = audio();
      if (!a) return;
      notes.forEach(([freq, at, len]) => {
        const o = a.createOscillator(), v = a.createGain();
        o.type = wave || "square"; o.frequency.value = freq;
        v.gain.setValueAtTime(0.07, a.currentTime + at);
        v.gain.exponentialRampToValueAtTime(0.001, a.currentTime + at + len);
        o.connect(v); v.connect(a.destination);
        o.start(a.currentTime + at); o.stop(a.currentTime + at + len + 0.02);
      });
    }
    const blip = () => tune([[660, 0, 0.06]]);
    const fanfare = () => tune([[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.3]]);
    const ding = () => tune([[784, 0, 0.1], [988, 0.1, 0.22]]);
    const womp = () => tune([[220, 0, 0.18], [196, 0.18, 0.18], [165, 0.36, 0.4]], "sawtooth");
    const soundBtn = q(".yb-sound");
    const showSound = () => { soundBtn.textContent = mem.sound ? "Sound: on" : "Sound: off"; soundBtn.setAttribute("aria-pressed", String(mem.sound)); };
    soundBtn.addEventListener("click", () => { mem.sound = !mem.sound; if (!mem.sound) stopRumble(); remember(); showSound(); });
    showSound();

    // ----- the match -----
    let players = [], turn = 0, frame = 0, phase = "idle", sim = null, pos = 0, power = 0, spin = 0, clock = 0, acc = 0, cam = APPROACH + VIEW;
    let teamsOn = false, raf = 0, lastT = 0, bytes = null, lastHits = 0, flashT = 0, cur = null, held = 0;
    const full = () => Array(10).fill(true);

    function chat(who, text, cls) {
      const p = document.createElement("p");
      if (cls) p.className = cls;
      p.innerHTML = (who ? "<b>&lt;" + esc(who) + "&gt;</b> " : "*** ") + esc(text);
      chatEl.appendChild(p);
      while (chatEl.children.length > 60) chatEl.removeChild(chatEl.firstChild);
      chatEl.scrollTop = chatEl.scrollHeight;
    }
    const glorbo = text => chat("Glorbo", text, "yb-g");

    function talk(kind, speaker, target) {
      const t = speaker.team, tt = target && target.team, lines = [];
      if (kind === "brag") {
        lines.push("Somebody screenshot that for the group chat.", "Easier than setting a lineup.", "Rack 'em again.");
        if (t && t.rec) lines.push("That's what a " + t.rec + " team looks like.");
      } else if (kind === "oops") {
        lines.push("Lane's crooked. Commissioner, do something.", "I was checking the waiver wire.", "That one doesn't count. New ball.");
        if (t && t.bench >= 20) lines.push("Left that one on the bench, like the other " + Math.round(t.bench) + " points.");
      } else if (kind === "jeer") {
        lines.push("Yowza of the Week material, " + target.name + ".", "Bold strategy, " + target.name + ".", "The gutters aren't worth points, " + target.name + ".");
        if (tt && tt.bench >= 20) lines.push(Math.round(tt.bench) + " points left on the bench this season and now this, " + target.name + "?");
      } else if (kind === "grumble") {
        lines.push("Lucky. Just like your schedule.", "Do that in the playoffs and we'll talk.", "Okay, " + target.name + ". Okay.");
      } else if (kind === "win") {
        lines.push("Scoreboard.", "Good game. For me.", "Put it in the record book.");
      } else lines.push("Rematch. Right now.", "I demand a recount.", "My arm was cold.");
      chat(speaker.name, pick(lines));
    }
    const cpus = except => players.filter(p => p.kind === "cpu" && p !== except);

    function makePlayers() {
      const me = { kind: "human", name: mem.name || "You", team: teams.find(t => t.id === Number(mem.team)) || null, look: mem.look.slice(), me: true };
      const list = [me];
      qa(".yb-opp").forEach(sel => {
        const v = sel.value, n = Number(sel.dataset.n);
        if (v === "human") list.push({ kind: "human", name: sel.closest(".yb-slot").querySelector(".yb-oname").value.trim().slice(0, 12) || "Player " + n, team: null, look: randomLook() });
        else if (v === "ghost" && challenge) list.push({ kind: "ghost", name: challenge.name, team: teams.find(t => t.id === challenge.team) || null, look: challenge.look.slice(), seed: challenge.seed, tape: challenge.throws });
        else if (v.indexOf("cpu:") === 0) {
          const id = Number(v.slice(4)), c = HOUSE.find(h => h.id === id) || cpuList.find(x => x.id === id);
          if (c) list.push({ kind: "cpu", name: c.name, team: c.team || null, look: c.look.slice(), skill: c.skill, nerves: c.nerves, r: rng(Math.floor(Math.random() * 1e9)) });
        }
      });
      list.forEach(p => { p.rolls = []; p.throws = []; p.streak = 0; if (p.seed == null) p.seed = Math.floor(Math.random() * 65536); p.standing = full(); });
      return list;
    }

    function startGame() {
      players = makePlayers();
      teamsOn = teamsBox.checked && players.length === 4;
      turn = 0; frame = 0;
      lobby.hidden = true; gameEl.hidden = false; overEl.hidden = true;
      document.documentElement.classList.add("yb-playing");
      chatEl.innerHTML = "";
      chat("", players.map(p => p.name).join(", ") + (players.length > 1 ? " have" : " has") + " entered the lane.", "yb-sys");
      glorbo(players.length > 1 ? "Welcome to the Yowza Bowl. Ten frames. Keep it clean. Or don't." : "Solo practice. I'll be watching. Judging, mostly.");
      audio();
      beginTurn(true);
      lastT = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
      el.scrollIntoView({ block: "nearest" });
    }

    function beginTurn(freshRack) {
      cur = players[turn];
      if (freshRack) cur.standing = full();
      const pr = progress(cur.rolls);
      pos = 0; power = 0; spin = 0; clock = 0; sim = null; cam = APPROACH + VIEW; flash.innerHTML = "";
      turnEl.textContent = "Frame " + (pr.frame + 1) + ", ball " + (pr.ball + 1) + ": " + cur.name + (cur.kind === "cpu" ? " (computer)" : cur.kind === "ghost" ? " (challenge replay)" : players.filter(p => p.kind === "human").length > 1 ? ", you're up" : "");
      drawScores();
      if (cur.kind === "human") {
        phase = "place";
        setControls(true, "Bowl", "Slide left or right with the arrows (or drag on the lane), then press Bowl.");
        actBtn.focus({ preventScroll: true });
      } else {
        phase = "think";
        setControls(false, cur.kind === "cpu" ? "Thinking..." : "Replay", cur.kind === "cpu" ? cur.name + " is lining it up." : "This is " + cur.name + "'s real throw from the game they sent.");
        const n = cur.throws.length;
        bytes = cur.kind === "ghost" ? cur.tape[n].slice(0, 3) : cpuThrow(cur.standing, cur.look[4], cur.skill, cur.r, pr.frame === 9 ? cur.nerves * 1.15 : 1);
      }
      meters();
    }
    function setControls(on, label, tip) {
      actBtn.disabled = !on; actBtn.textContent = label; tipEl.textContent = tip;
      q(".yb-left").disabled = q(".yb-right").disabled = !(on && phase === "place");
      powerEl.classList.toggle("live", phase === "power");
      spinEl.classList.toggle("live", phase === "spin");
    }
    function meters() {
      powerEl.firstChild.style.width = "calc(" + Math.round(power * 100) + "% - 4px)";
      spinEl.firstChild.style.left = (50 + spin * 46) + "%";
    }

    function act() {
      if (!cur || cur.kind !== "human") return;
      if (phase === "place") { phase = "power"; clock = 0; blip(); setControls(true, "Stop the power", "More power sends pins flying, but the ball hooks less."); }
      else if (phase === "power") { phase = "spin"; clock = 0; blip(); setControls(true, "Stop the spin", "Left of center hooks left, right hooks right. Dead center is dead straight."); }
      else if (phase === "spin") { blip(); bytes = toBytes(pos, power, spin); release(); }
    }
    function release() {
      const v = fromBytes(bytes);
      pos = v.pos; power = v.power; spin = v.hook;
      phase = "approach"; clock = 0;
      setControls(false, "...", "");
      meters();
    }
    function nudge(d) { if (phase === "place" && cur.kind === "human") pos = Math.max(-17, Math.min(17, pos + d)); }

    function settle() {
      stopRumble();
      const res = result(sim), before = cur.standing.filter(Boolean).length;
      let standing = res.standing, fell = before - standing.filter(Boolean).length;
      if (cur.kind === "ghost") {
        const want = cur.tape[cur.throws.length][3];
        // a challenge always scores what its bowler really scored, even if a browser's maths ever disagreed
        for (let i = 9; i >= 0 && fell < want; i--) if (standing[i]) { standing[i] = false; fell++; }
        for (let i = 9; i >= 0 && fell > want; i--) if (!standing[i] && cur.standing[i]) { standing[i] = true; fell--; }
      }
      const pr = progress(cur.rolls), firstBall = before === 10;
      cur.rolls.push(fell);
      cur.throws.push([bytes[0], bytes[1], bytes[2], fell]);
      cur.standing = standing;
      const left = standing.filter(Boolean).length;
      let word, kind = null;
      if (firstBall && left === 0) {
        cur.streak++;
        word = cur.streak === 2 ? "DOUBLE!" : cur.streak === 3 ? "TURKEY!" : cur.streak > 3 ? cur.streak + " IN A ROW!" : "STRIKE!";
        glorbo(cur.streak === 3 ? "TURKEY for " + cur.name + "! Gobble gobble." : cur.streak > 3 ? cur.name + " has " + cur.streak + " in a row. Somebody check that ball." : pick(["STRIKE! " + cur.name + " clears the deck.", "Strike. All ten. Yowza.", "X marks the spot for " + cur.name + "."]));
        fanfare(); kind = "good";
      } else {
        if (firstBall || left > 0) cur.streak = 0;
        if (left === 0) { word = "SPARE!"; glorbo(pick(["Spare for " + cur.name + ". Clean living.", cur.name + " picks it up.", "Spare. Tidy."])); ding(); if (!firstBall) cur.streak = 0; }
        else if (fell === 0) {
          word = res.gutter ? "GUTTER!" : "MISS!";
          glorbo(res.gutter ? pick(["Gutterball. Yowza.", cur.name + " finds the gutter. It was right there the whole time.", "Straight into the gutter."]) : cur.name + " hits nothing but air.");
          womp(); kind = "bad";
        } else if (firstBall && isSplit(standing)) { word = "SPLIT!"; glorbo("Split! " + cur.name + " needs a miracle or a very bouncy pin."); kind = "bad"; }
        else {
          word = String(fell);
          if (firstBall && fell === 9) glorbo("Nine for " + cur.name + ". One pin had other plans.");
          else if (!firstBall && pr.frame < 9) glorbo(cur.name + " leaves " + left + ". Open frame.");
        }
      }
      flash.innerHTML = "<span>" + word + "</span>";
      if (kind && Math.random() < 0.5) {
        const others = cpus(cur);
        if (cur.kind === "cpu" && Math.random() < 0.6) talk(kind === "good" ? "brag" : "oops", cur);
        else if (others.length && players.length > 1) talk(kind === "good" ? "grumble" : "jeer", pick(others), cur);
      }
      drawScores();
      phase = "settle"; clock = 0;
    }

    function advance() {
      const pr = progress(cur.rolls);
      if (!pr.done && pr.frame === frame) { if (pr.fresh) cur.standing = full(); beginTurn(false); return; }
      turn++;
      if (turn >= players.length) { turn = 0; frame++; }
      if (frame > 9 || players.every(p => progress(p.rolls).done)) { gameOver(); return; }
      beginTurn(true);
    }

    function copyText(text, btn) {
      const done = () => { const old = btn.textContent; btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = old; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => {});
      else {
        const ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { /* the text is still in the box to copy by hand */ }
        ta.remove();
      }
    }

    function gameOver() {
      phase = "over"; cur = null; sim = null; cam = APPROACH + VIEW; flash.innerHTML = ""; stopRumble();
      setControls(false, "Game over", "");
      turnEl.textContent = "Final";
      drawScores();
      const totals = players.map(p => score(p.rolls).total);
      const me = players[0], mine = totals[0];
      let headline;
      const sideTotals = [totals[0] + (totals[2] || 0), totals[1] + (totals[3] || 0)];
      if (teamsOn) headline = sideTotals[0] === sideTotals[1] ? "A tie, " + sideTotals[0] + " all." : (sideTotals[0] > sideTotals[1] ? me.name + " & " + players[2].name : players[1].name + " & " + players[3].name) + " win, " + Math.max(...sideTotals) + " to " + Math.min(...sideTotals) + ".";
      else if (players.length === 1) headline = me.name + " bowls a " + mine + ".";
      else {
        const top = Math.max(...totals), winners = players.filter((p, i) => totals[i] === top);
        headline = winners.length > 1 ? "A tie at " + top + "." : winners[0].name + " wins with a " + top + ".";
      }
      glorbo(mine === 300 ? "A PERFECT GAME. Twelve strikes. Frame it." : headline);
      if (!teamsOn && players.length > 1) {
        const top = Math.max(...totals);
        const cw = players.find((p, i) => p.kind === "cpu" && totals[i] === top), cl = players.find((p, i) => p.kind === "cpu" && totals[i] < top);
        if (cw) talk("win", cw); else if (cl) talk("lose", cl);
      }
      if (mine >= 200) fanfare();
      const strikes = me.rolls.filter((v, i) => v === 10 && marksFlat(me.rolls)[i] === "X").length;
      const best = mine > mem.best;
      mem.games++; mem.strikes += strikes; if (best) mem.best = mine;
      remember(); showRecord();
      const ghost = players.find(p => p.kind === "ghost");
      const code = encodeGame({ name: me.name, team: me.team ? me.team.id : 0, look: me.look, seed: me.seed, throws: me.throws });
      const link = (ctx.url || "") + "#bowl-" + code;
      const text = "🎳 Yowza Bowl: " + me.name + (ghost ? (mine > score(ghost.rolls).total ? " beat " : mine === score(ghost.rolls).total ? " tied " : " lost to ") + ghost.name + "'s " + score(ghost.rolls).total + " with a " + mine : " rolled a " + mine) +
        (strikes ? " (" + strikes + (strikes === 1 ? " strike)" : " strikes)") : "") + ". Bowl against it: " + link;
      const order = players.map((p, i) => ({ p, t: totals[i] })).sort((a, b) => b.t - a.t);
      overEl.hidden = false;
      overEl.innerHTML = "<h3>" + esc(headline) + "</h3>" +
        (players.length > 1 ? "<ol>" + order.map(o => "<li>" + esc(o.p.name) + ": <b>" + o.t + "</b></li>").join("") + "</ol>" : "") +
        "<p>" + (best ? "That's your best game on this device. " : "Your best on this device is " + mem.best + ". ") + "Send your game to the group chat and anyone in the league can bowl against it, throw for throw.</p>" +
        '<input type="text" readonly aria-label="Message for the group chat" value="' + esc(text) + '">' +
        '<div class="yb-row"><button class="btn default yb-copy" type="button">Copy for the group chat</button><button class="btn yb-again" type="button">Rematch</button><button class="btn yb-change" type="button">Change bowlers</button></div>';
      overEl.querySelector(".yb-copy").addEventListener("click", e => copyText(text, e.currentTarget));
      overEl.querySelector(".yb-again").addEventListener("click", startGame);
      overEl.querySelector(".yb-change").addEventListener("click", leave);
      overEl.querySelector("input").addEventListener("focus", e => e.target.select());
      overEl.scrollIntoView({ block: "nearest" });
    }
    const marksFlat = rolls => [].concat(...marks(score(rolls).frames));

    function leave() {
      cancelAnimationFrame(raf);
      stopRumble();
      phase = "idle"; cur = null; sim = null;
      gameEl.hidden = true; lobby.hidden = false;
      document.documentElement.classList.remove("yb-playing");
    }

    function drawScores() {
      const head = "<thead><tr><th class=\"who\">Bowler</th>" + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => "<th>" + n + "</th>").join("") + "<th>Total</th></tr></thead>";
      const body = players.map((p, i) => {
        const sc = score(p.rolls), mk = marks(sc.frames), pr = progress(p.rolls);
        let run = 0;
        sc.frames.forEach(f => { if (f.cum != null) run = f.cum; });
        return '<tr class="' + (p === cur ? "up" : "") + '"><th class="who" scope="row">' + esc(p.name) + (teamsOn ? " [" + (i % 2 ? "B" : "A") + "]" : "") + "<small>" + esc(p.team ? p.team.name : p.kind === "cpu" ? "House bowler" : p.kind === "ghost" ? "Challenge" : "Free agent") + "</small></th>" +
          sc.frames.map((f, n) => '<td class="' + (p === cur && !pr.done && n === pr.frame ? "now" : "") + '"><span class="m">' + mk[n].join(" ") + '</span><span class="c">' + (f.cum == null ? "" : f.cum) + "</span></td>").join("") +
          '<td class="tot">' + run + "</td></tr>";
      }).join("");
      q(".yb-scores table").innerHTML = head + "<tbody>" + body + "</tbody>";
      const sides = q(".yb-sides");
      sides.hidden = !teamsOn;
      if (teamsOn) {
        const t = players.map(p => { let run = 0; score(p.rolls).frames.forEach(f => { if (f.cum != null) run = f.cum; }); return run; });
        sides.textContent = "Team A (" + players[0].name + " & " + players[2].name + ") " + (t[0] + t[2]) + "  ·  Team B (" + players[1].name + " & " + players[3].name + ") " + (t[1] + t[3]);
      }
    }

    // ----- drawing the lane -----
    const X = x => (x + 27) * S, Y = y => (cam - y) * S;
    function drawLane() {
      g.fillStyle = "#101010"; g.fillRect(0, 0, VW, VH);
      const top = Math.max(0, Y(PIT)), bottom = VH;
      g.fillStyle = "#e3b96b"; g.fillRect(X(-LANE), top, LANE * 2 * S, bottom - top);
      g.fillStyle = "#d6aa58";
      for (let i = 0; i < 10; i++) g.fillRect(X(-LANE + i * 4.2 + 2.1), top, 2.1 * S, bottom - top);
      if (Y(0) < VH) { g.fillStyle = "#c79a4c"; g.fillRect(X(-LANE), Y(0), LANE * 2 * S, VH - Y(0)); g.fillStyle = "#111"; g.fillRect(X(-LANE), Y(0) - 1, LANE * 2 * S, 3); }
      g.fillStyle = "#2f2f2f"; g.fillRect(X(-27), top, 6 * S, bottom - top); g.fillRect(X(LANE), top, 6 * S, bottom - top);
      g.fillStyle = "#555"; g.fillRect(X(-LANE) - 2, top, 2, bottom - top); g.fillRect(X(LANE), top, 2, bottom - top);
      g.fillStyle = "#7a4a1c";
      for (let i = -3; i <= 3; i++) {       // the aiming arrows
        const ax = X(i * 5), ay = Y(40 + (3 - Math.abs(i)) * 4);
        g.fillRect(ax - 1, ay - 8, 2, 4); g.fillRect(ax - 3, ay - 4, 6, 4); g.fillRect(ax - 5, ay, 10, 4);
      }
      for (let i = -3; i <= 3; i++) { g.fillRect(X(i * 5) - 1, Y(18) - 1, 3, 3); g.fillRect(X(i * 5) - 1, Y(-10) - 1, 3, 3); }
      g.fillStyle = "#000"; g.fillRect(0, 0, VW, Math.max(0, Y(PIT)));
    }
    function drawPins(list) {
      list.forEach(p => {
        if (p.st > 1) return;
        const sx = X(p.x), sy = Y(p.y);
        if (p.st === 0) {
          g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.arc(sx + 3, sy + 3, RP * S, 0, 6.2832); g.fill();
          g.fillStyle = "#fff"; g.beginPath(); g.arc(sx, sy, RP * S, 0, 6.2832); g.fill();
          g.fillStyle = "#d00000"; g.beginPath(); g.arc(sx, sy, RP * S * 0.62, 0, 6.2832); g.fill();
          g.fillStyle = "#fff"; g.beginPath(); g.arc(sx, sy, RP * S * 0.36, 0, 6.2832); g.fill();
        } else {
          if (p.ang === undefined) p.ang = Math.atan2(-p.vy, p.vx) || 0;
          g.save(); g.translate(sx, sy); g.rotate(p.ang);
          g.fillStyle = "#fff"; g.fillRect(-18, -8, 26, 16); g.beginPath(); g.arc(8, 0, 8, 0, 6.2832); g.fill(); g.fillRect(8, -5, 12, 10);
          g.fillStyle = "#d00000"; g.fillRect(9, -5, 4, 10);
          g.restore();
        }
      });
    }
    function draw() {
      drawLane();
      const standing = cur ? cur.standing : full();
      drawPins(sim ? sim.pins : PIN_SPOTS.map(([x, row], i) => ({ x, y: HEAD + row * ROW, st: standing[i] ? 0 : 3 })));
      if (cur) {
        const lift = phase === "approach" ? Math.min(1, clock / 0.45) : phase === "roll" || phase === "settle" ? 1 : 0;
        const by = -15 + lift * 9;
        if (phase === "place" || phase === "power" || phase === "spin") {
          g.fillStyle = "rgba(255,255,255,0.55)";
          for (let yy = 4; yy < 60; yy += 6) g.fillRect(X(pos) - 1, Y(yy), 2, 8);
        }
        drawBowler(g, X(pos - 7), Y(by - 5), cur.look, 3);
        if (sim) { if (!sim.ball.gone) drawBall(g, X(sim.ball.x), Y(sim.ball.y), cur.look[4], sim.ball.y / 9, RB * S); }
        else drawBall(g, X(pos), Y(by + 7), cur.look[4], 0, RB * S);
        // pin indicator, like the lights above a real lane
        g.fillStyle = "rgba(0,0,0,0.7)"; g.fillRect(VW - 50, 4, 46, 40);
        const up = sim ? sim.pins.map(p => p.st === 0) : standing;
        PIN_SPOTS.forEach(([x, row], i) => { g.fillStyle = up[i] ? "#ffd200" : "#3a3a3a"; g.fillRect(VW - 27 + x * 1.1 - 2, 34 - row * 9, 5, 5); });
      }
    }

    function loop(t) {
      raf = requestAnimationFrame(loop);
      const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0;
      lastT = t;
      if (!cur) { draw(); return; }
      clock += dt;
      if (held) nudge(held * dt * 16);
      const fast = cur.kind === "human" ? 1 : 1.5;
      if (phase === "power") { const u = (clock * 1.05) % 2; power = u < 1 ? u : 2 - u; meters(); }
      else if (phase === "spin") { const u = (clock * 0.9 + 0.5) % 2; spin = (u < 1 ? u : 2 - u) * 2 - 1; meters(); }
      else if (phase === "think" && clock > (cur.kind === "cpu" ? 0.9 : 0.6)) release();
      else if (phase === "approach" && clock > 0.45 / fast) {
        sim = createThrow(cur.standing, bytes, cur.look[4], throwSeed(cur.seed, cur.throws.length));
        phase = "roll"; acc = 0; lastHits = 0; startRumble();
      } else if (phase === "roll") {
        acc += dt * fast;
        while (acc >= DT && !sim.done) { step(sim); acc -= DT; }
        if (sim.hits > lastHits) { crash(sim.hits - lastHits); lastHits = sim.hits; }
        if (sim.ball.gone || sim.ball.gutter && sim.ball.y > HEAD) stopRumble();
        const want = Math.max(APPROACH + VIEW, Math.min(PIT + 5, (sim.ball.gone ? PIT : sim.ball.y) + VIEW * 0.6));
        cam += (want - cam) * Math.min(1, dt * 9);
        if (sim.done) settle();
      } else if (phase === "settle" && clock > 1.5 / fast) advance();
      draw();
    }

    // ----- controls -----
    q(".yb-go").addEventListener("click", startGame);
    q(".yb-quit").addEventListener("click", leave);
    actBtn.addEventListener("click", act);
    [[".yb-left", -1], [".yb-right", 1]].forEach(([sel, d]) => {
      const b = q(sel);
      b.addEventListener("pointerdown", e => { e.preventDefault(); nudge(d); held = d; });
      ["pointerup", "pointerleave", "pointercancel"].forEach(ev => b.addEventListener(ev, () => { held = 0; }));
      b.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); nudge(d * 1.5); } });
    });
    gameEl.addEventListener("keydown", e => {
      if (e.key === "ArrowLeft") { nudge(-1.5); e.preventDefault(); }
      if (e.key === "ArrowRight") { nudge(1.5); e.preventDefault(); }
    });
    function aim(e) {
      if (phase !== "place" || !cur || cur.kind !== "human") return;
      const r = canvas.getBoundingClientRect();
      pos = Math.max(-17, Math.min(17, (e.clientX - r.left) / r.width * 54 - 27));
    }
    canvas.addEventListener("pointerdown", e => { aim(e); try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } });
    canvas.addEventListener("pointermove", e => { if (e.buttons || e.pointerType === "touch") aim(e); });

    draw();
    return {
      // a challenge link opened while the page is already showing
      challenge(code) {
        const c = decodeGame(code);
        if (!c) return false;
        challenge = c;
        if (phase !== "idle") leave();
        fillSlots(); opp2.value = "ghost"; slotsChanged(); showChallenge();
        return true;
      },
      hasChallenge: () => !!challenge
    };
  }

  root.YowzaBowl = Object.assign({ mount }, core);

})(typeof window !== "undefined" ? window : globalThis);
