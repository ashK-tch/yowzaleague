/* Yowza Bowl, part 1 of 4: the engine. Lane physics, scoring, turn order (singles and doubles), the computer
   bowlers, ranks and prize money. No page code in here, so `node games/test_bowl.js` can check it.

   Yowza Bowl is a spiritual successor to Oddballs Bowling, the Gamer.tv / WePlayHere browser game (2002-2007):
   two to four cartoon bowlers on a lane, or two against two, with a lobby, a chat box, star ranks and prize money for
   clothes. All the code, art and sound here is original.

   The physics only uses + - * / and Math.sqrt on purpose. Those give the same answer in every browser, so when one
   player's throw is replayed on everyone else's screen it knocks down exactly the same pins. */
(function (root) {
  "use strict";

  // ----- lane geometry, in inches-ish units. x: 0 is the center board. y: 0 is the foul line, pins are up-lane. -----
  const LANE = 21, WALL = 26.5, HEAD = 170, ROW = 10.39, PIT = 214;
  const RB = 4.3, RP = 2.4, RD = 2.55;          // ball, standing pin, toppled pin
  const DT = 1 / 240, TICK = 8, TOPPLE = 22;     // steering is sampled every TICK steps (30 times a second)
  const PIN_SPOTS = [[0, 0], [-6, 1], [6, 1], [-12, 2], [0, 2], [12, 2], [-18, 3], [-6, 3], [6, 3], [18, 3]];

  // The first four roll differently. The rest are paint jobs on a House Ball.
  const BALLS = [
    { name: "House Ball", blurb: "Does a bit of everything.", mass: 4.5, hook: 1, speed: 1, wob: 0 },
    { name: "Cannonball", blurb: "Heavy. Barely spins, but pins fly.", mass: 7.5, hook: 0.5, speed: 0.92, wob: 0 },
    { name: "Screwball", blurb: "Light, with a wild spin.", mass: 3.5, hook: 1.7, speed: 1.04, wob: 0 },
    { name: "The Pigskin", blurb: "A football. Wobbles wherever it wants.", mass: 6.4, hook: 0.9, speed: 1, wob: 1 },
    { name: "Eight Ball", blurb: "A House Ball in a tuxedo.", mass: 4.5, hook: 1, speed: 1, wob: 0 },
    { name: "Disco Ball", blurb: "A House Ball that went out dancing.", mass: 4.5, hook: 1, speed: 1, wob: 0 }
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
  const gauss = r => (r() + r() + r() + r() - 2) * 1.73;

  // ----- a throw is three bytes (spot, direction, power) plus the spin held while the ball rolls -----
  const clampByte = v => Math.max(0, Math.min(255, Math.round(v)));
  const toBytes = (pos, dir, power) => [clampByte((pos + 17) / 34 * 255), clampByte((dir + 1) / 2 * 255), clampByte(power * 255)];
  const fromBytes = b => ({ pos: b[0] / 255 * 34 - 17, dir: b[1] / 255 * 2 - 1, power: b[2] / 255 });
  // spin travels as text, one character per thirtieth of a second: L, R or -
  const steerText = list => { let s = ""; for (let i = 0; i < list.length && i < 240; i++) s += list[i] < 0 ? "L" : list[i] > 0 ? "R" : "-"; return s.replace(/-+$/, ""); };
  const steerList = text => Array.from(String(text || "").slice(0, 240), c => (c === "L" ? -1 : c === "R" ? 1 : 0));

  // standing: ten true/false values. steer: a list of -1/0/1 the caller may keep adding to while the ball rolls.
  function createThrow(standing, bytes, ballIdx, seed, steer) {
    const ball = BALLS[ballIdx] || BALLS[0];
    const inp = fromBytes(bytes);
    const r = rng(seed);
    const pins = PIN_SPOTS.map(([x, row], i) => ({
      x: x + (r() - 0.5) * 0.5, y: HEAD + row * ROW + (r() - 0.5) * 0.5, vx: 0, vy: 0,
      st: standing[i] ? 0 : 3               // 0 standing, 1 toppled, 2 swept into the pit, 3 wasn't there
    }));
    const speed = (100 + 70 * inp.power) * ball.speed;
    return {
      pins, t: 0, n: 0, done: false, hits: 0, firstHit: -1, wobT: 0, wobA: 0, r, steer: steer || [],
      ball: { x: inp.pos, y: 0, vx: speed * inp.dir * 0.1, vy: speed, gutter: false, gone: false },
      curve: 44 * ball.hook * (1.3 - 0.6 * inp.power), mass: ball.mass, wob: ball.wob
    };
  }

  function step(s) {
    const b = s.ball, pins = s.pins;
    if (!b.gone) {
      if (!b.gutter) {
        const held = s.steer[(s.n - s.n % TICK) / TICK] || 0;
        const ramp = b.y < 40 ? 0 : b.y > 110 ? 1 : (b.y - 40) / 70;     // the front of the lane is oiled: spin bites late
        let ax = held * s.curve * (0.3 + 0.7 * ramp);
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
    s.n++;
    s.t += DT;
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
    if (b.gutter && b.y > PIT) b.gone = true;
    if ((b.gone && !moving) || s.t > 9 || (s.firstHit >= 0 && s.t - s.firstHit > 4.5)) s.done = true;
    return s;
  }

  function finish(s) { while (!s.done) step(s); return result(s); }
  function result(s) {
    const standing = s.pins.map(p => p.st === 0);
    return { standing, count: s.pins.filter(p => p.st === 1 || p.st === 2).length, gutter: s.ball.gutter && s.hits === 0 };
  }
  const toMask = standing => standing.reduce((m, up, i) => m | (up ? 1 << i : 0), 0);
  const fromMask = m => Array.from({ length: 10 }, (_, i) => !!(m & (1 << i)));

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
        if (!seen.has(i) && Math.abs(a[0] - c[0]) <= 12 && Math.abs(a[1] - c[1]) <= 1) { seen.add(i); todo.push(i); }
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
        const fresh = f < 9 ? k === 0 : k === 0 || (k === 1 && b[0] === 10) || (k === 2 && (b[1] === 10 || b[0] + b[1] === 10) && !(b[0] === 10 && b[1] < 10));
        if (fresh) out.push(b[k] === 10 ? "X" : b[k] === 0 ? "-" : String(b[k]));
        else out.push(b[k - 1] + b[k] === 10 ? "/" : b[k] === 0 ? "-" : String(b[k]));
      }
      return out;
    });
  }
  const strikesIn = rolls => [].concat(...marks(score(rolls).frames)).filter(m => m === "X").length;

  // Where a scoresheet is: which frame and ball, and whether the next ball faces a full rack.
  function progress(rolls) {
    const s = score(rolls);
    if (s.done) return { done: true, frame: 10, ball: 0, fresh: false };
    let f = 0;
    while (f < 9 && s.frames[f].balls.length && (s.frames[f].balls[0] === 10 || s.frames[f].balls.length === 2)) f++;
    const b = s.frames[f].balls;
    let fresh = b.length === 0;
    if (f === 9 && b.length === 1) fresh = b[0] === 10;
    if (f === 9 && b.length === 2) fresh = b[1] === 10 || b[0] + b[1] === 10;
    return { done: false, frame: f, ball: b.length, fresh };
  }

  // ----- a match: who bowls next -----
  // Standard game: every seat keeps its own scoresheet and they take a frame each in turn.
  // Team game (two against two): each team shares ONE scoresheet. Partners swap every frame ("frame") or every
  // ball ("ball"). A seat that leaves is skipped; if a whole sheet has left, it stops where it was.
  function makeMatch(seats, mode, alt) {
    const sheets = mode === "team" && seats === 4
      ? [{ seats: [0, 2], rolls: [], standing: null }, { seats: [1, 3], rolls: [], standing: null }]
      : Array.from({ length: seats }, (_, i) => ({ seats: [i], rolls: [], standing: null }));
    return { sheets, mode: sheets.length < seats ? "team" : "std", alt: alt === "ball" ? "ball" : "frame", left: [], throws: 0 };
  }
  function nextTurn(m) {
    const live = m.sheets.map((sh, i) => ({ sh, i, p: progress(sh.rolls) })).filter(o => !o.p.done && o.sh.seats.some(s => !m.left.includes(s)));
    if (!live.length) return null;
    const frame = Math.min(...live.map(o => o.p.frame));
    const o = live.find(x => x.p.frame === frame);
    const here = o.sh.seats.filter(s => !m.left.includes(s));
    let seat = here[0];
    if (here.length > 1) seat = o.sh.seats[(m.alt === "ball" ? o.p.frame + o.sh.rolls.length : o.p.frame) % 2];
    return { sheet: o.i, seat, frame: o.p.frame, ball: o.p.ball, fresh: o.p.fresh || !o.sh.standing };
  }
  function applyThrow(m, sheetIdx, standingAfter) {
    const sh = m.sheets[sheetIdx], p = progress(sh.rolls);
    const before = p.fresh || !sh.standing ? 10 : sh.standing.filter(Boolean).length;
    const fell = Math.max(0, before - standingAfter.filter(Boolean).length);
    sh.rolls.push(fell);
    sh.standing = standingAfter.slice();
    m.throws++;
    return fell;
  }
  const matchOver = m => !nextTurn(m);

  // ----- star ranks, like the old lobbies: a colored star for your average -----
  const RANKS = [
    { min: 250, color: "#111111", name: "Black star", tag: "Untouchable" },
    { min: 200, color: "#d62828", name: "Red star", tag: "Deadly" },
    { min: 150, color: "#2f6fd0", name: "Blue star", tag: "Dangerous" },
    { min: 100, color: "#f2b705", name: "Yellow star", tag: "Improving" },
    { min: 0, color: "#3a9b4b", name: "Green star", tag: "Harmless" }
  ];
  const RATED_AFTER = 3;
  function rank(games, sum) {
    if (!games || games < RATED_AFTER) return { color: "#9a9a9a", name: "Grey star", tag: "Unrated", avg: null };
    const avg = sum / games;
    return Object.assign({ avg }, RANKS.find(r => avg >= r.min));
  }
  // Prize money: a dollar a pin on the scoresheet, a bonus per strike, and big ones for 200 and 300.
  const payout = rolls => { const t = score(rolls).total; return t + 20 * strikesIn(rolls) + (t >= 300 ? 2000 : t >= 200 ? 500 : 0); };

  // ----- the computer bowlers: they plan with the same physics you play with, then miss by an amount set by skill -----
  const planCache = {};
  const hold = (from, to, side) => { const s = []; for (let i = 0; i < to; i++) s.push(i >= from ? side : 0); return s; };
  const SPINS = [[], hold(14, 44, -1), hold(14, 44, 1)];
  function bestShot(standing, ballIdx) {
    const type = BALLS[ballIdx] && ballIdx < 4 ? ballIdx : 0;
    const key = type + ":" + toMask(standing);
    if (planCache[key]) return planCache[key];
    const need = standing.filter(Boolean).length;
    let best = null;
    SPINS.forEach((spin, si) => {
      for (let d = -4; d <= 4; d++) {
        const row = [];
        for (let pos = -16; pos <= 16; pos += 2) {
          let sum = 0;
          for (let k = 0; k < 2; k++) sum += finish(createThrow(standing, toBytes(pos, d * 0.15, 0.72), type, 7001 + k * 13 + pos, spin)).count - (10 - need);
          row.push(sum / 2);
        }
        row.forEach((v, n) => {
          const robust = v * 2 + (row[n - 1] === undefined ? v - 1 : row[n - 1]) + (row[n + 1] === undefined ? v - 1 : row[n + 1]);
          if (!best || robust > best.robust) best = { robust, pos: n * 2 - 16, dir: d * 0.15, power: 0.72, spin: si };
        });
      }
    });
    return (planCache[key] = best);
  }
  // skill: 0 (lost in the car park) to 1 (league legend). nerves multiplies the miss (tenth-frame pressure).
  function cpuThrow(standing, ballIdx, skill, r, nerves) {
    const plan = bestShot(standing, ballIdx);
    const miss = (1.05 - skill) * (nerves || 1);
    const wild = r() < 0.04 + (1 - skill) * 0.1 ? 2.6 : 1;
    const late = Math.round(gauss(r) * 9 * miss);
    return {
      bytes: toBytes(
        Math.max(-17, Math.min(17, plan.pos + gauss(r) * (0.4 + 4.6 * miss) * wild)),
        Math.max(-1, Math.min(1, plan.dir + gauss(r) * (0.02 + 0.34 * miss) * wild)),
        Math.max(0.15, Math.min(1, plan.power + gauss(r) * 0.12 * miss))),
      steer: plan.spin ? hold(Math.max(0, 14 + late), Math.max(1, 44 + late * 2), plan.spin === 1 ? -1 : 1) : []
    };
  }
  const throwSeed = (seed, n) => ((seed & 0xffff) * 131 + n * 977 + 17) >>> 0;
  // Play out a whole game for one computer bowler (the tests use this to check the skill levels feel right).
  function simulateGame(ballIdx, skill, seed) {
    const r = rng(seed), m = makeMatch(1, "std");
    for (let t = nextTurn(m); t; t = nextTurn(m)) {
      const standing = t.fresh ? Array(10).fill(true) : m.sheets[0].standing;
      const shot = cpuThrow(standing, ballIdx, skill, r, t.frame === 9 ? 1.25 : 1);
      applyThrow(m, 0, finish(createThrow(standing, shot.bytes, ballIdx, throwSeed(seed, m.throws), shot.steer)).standing);
    }
    return { rolls: m.sheets[0].rolls, total: score(m.sheets[0].rolls).total };
  }

  const core = {
    BALLS, PIN_SPOTS, LANE, WALL, HEAD, ROW, PIT, RB, RP, DT, TICK, RANKS, RATED_AFTER,
    rng, toBytes, fromBytes, steerText, steerList, createThrow, step, finish, result, toMask, fromMask, isSplit,
    score, marks, strikesIn, progress, makeMatch, nextTurn, applyThrow, matchOver, rank, payout,
    bestShot, cpuThrow, simulateGame, throwSeed
  };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  root.YB = Object.assign(root.YB || {}, core);
})(typeof window !== "undefined" ? window : globalThis);
