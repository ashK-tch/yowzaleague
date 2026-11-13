// Checks the Yowza Bowl engine: scoring, scoresheet marks, turn order for singles and doubles, ranks, and that a
// throw replayed from what gets sent over the wire knocks down the same pins.
//   node games/test_bowl.js
const assert = require("assert");
const B = require("./yb-engine.js");

const total = rolls => B.score(rolls).total;
assert.strictEqual(total(Array(12).fill(10)), 300, "perfect game");
assert.strictEqual(total(Array(21).fill(5)), 150, "all spares");
assert.strictEqual(total(Array(20).fill(0)), 0, "all gutters");
assert.strictEqual(total([].concat(...Array(10).fill([9, 0]))), 90, "nine and a miss, ten times");
assert.strictEqual(total([10, 7, 3, 9, 0, 10, 0, 8, 8, 2, 0, 6, 10, 10, 10, 8, 1]), 167, "a mixed game");
assert.strictEqual(B.score([10, 10]).frames[0].cum, null, "a strike waits for two more balls");
assert.strictEqual(B.score([10, 10, 4]).frames[0].cum, 24);
assert.ok(!B.score(Array(11).fill(10)).done && B.score(Array(12).fill(10)).done);

const marks = rolls => B.marks(B.score(rolls).frames).map(m => m.join("")).join(" ").trim();
assert.strictEqual(marks([10, 7, 3, 9, 0, 0, 10]), "X 7/ 9- -/");
const nine = Array(18).fill(0), tenth = balls => B.marks(B.score(nine.concat(balls)).frames)[9].join("");
assert.strictEqual(tenth([10, 10, 10]), "XXX");
assert.strictEqual(tenth([7, 3, 10]), "7/X");
assert.strictEqual(tenth([10, 7, 3]), "X7/");
assert.strictEqual(tenth([10, 10, 4]), "XX4");
assert.strictEqual(B.strikesIn(Array(12).fill(10)), 12);
assert.strictEqual(B.strikesIn(Array(21).fill(5)), 0);

assert.deepStrictEqual(B.progress([]), { done: false, frame: 0, ball: 0, fresh: true });
assert.deepStrictEqual(B.progress([10]), { done: false, frame: 1, ball: 0, fresh: true });
assert.deepStrictEqual(B.progress([4]), { done: false, frame: 0, ball: 1, fresh: false });
assert.deepStrictEqual(B.progress(nine.concat([10])), { done: false, frame: 9, ball: 1, fresh: true });
assert.deepStrictEqual(B.progress(nine.concat([10, 6])), { done: false, frame: 9, ball: 2, fresh: false });
assert.deepStrictEqual(B.progress(nine.concat([6, 4])), { done: false, frame: 9, ball: 2, fresh: true });
assert.ok(B.progress(nine.concat([6, 3])).done);

const up = list => Array.from({ length: 10 }, (_, i) => list.includes(i + 1));
assert.ok(B.isSplit(up([7, 10])) && B.isSplit(up([4, 6])));
assert.ok(!B.isSplit(up([1, 2, 3])) && !B.isSplit(up([2, 4, 5, 8])) && !B.isSplit(up([10])));
assert.deepStrictEqual(B.fromMask(B.toMask(up([1, 5, 10]))), up([1, 5, 10]));

// turn order. Everyone leaves five pins on ball one and misses ball two, so every frame is two balls.
const play = (m, seen) => { for (let t = B.nextTurn(m); t; t = B.nextTurn(m)) { seen.push(t.seat); B.applyThrow(m, t.sheet, t.fresh ? up([1, 2, 3, 4, 5]) : m.sheets[t.sheet].standing); } };
let seen = [], m = B.makeMatch(3, "std");
play(m, seen);
assert.deepStrictEqual(seen.slice(0, 8), [0, 0, 1, 1, 2, 2, 0, 0], "standard game: a frame each, in order");
assert.strictEqual(seen.length, 60);
assert.ok(m.sheets.every(sh => B.score(sh.rolls).total === 50));
seen = []; m = B.makeMatch(4, "team", "frame"); play(m, seen);
assert.strictEqual(m.sheets.length, 2, "a team shares one scoresheet");
assert.deepStrictEqual(seen.slice(0, 8), [0, 0, 1, 1, 2, 2, 3, 3], "team, alternate frame");
seen = []; m = B.makeMatch(4, "team", "ball"); play(m, seen);
assert.deepStrictEqual(seen.slice(0, 8), [0, 2, 1, 3, 2, 0, 3, 1], "team, alternate ball");
// someone leaves: their partner bowls on, and a lane with nobody left stops
m = B.makeMatch(4, "team", "frame"); m.left.push(2);
seen = []; play(m, seen);
assert.ok(!seen.includes(2) && seen.filter(s => s === 0).length === 20);
m = B.makeMatch(2, "std"); m.left.push(1); seen = []; play(m, seen);
assert.deepStrictEqual([...new Set(seen)], [0]);

// ranks and prize money
assert.strictEqual(B.rank(2, 400).tag, "Unrated");
assert.strictEqual(B.rank(3, 300).name, "Yellow star");
assert.strictEqual(B.rank(10, 2600).name, "Black star");
assert.strictEqual(B.rank(4, 396).name, "Green star");
assert.strictEqual(B.payout(Array(12).fill(10)), 300 + 240 + 2000);
assert.strictEqual(B.payout(Array(20).fill(4)), 80);

// the lane behaves: gutters score nothing, strikes are possible but not automatic, nothing runs forever
const full = Array(10).fill(true);
assert.strictEqual(B.finish(B.createThrow(full, B.toBytes(-17, -1, 0.5), 0, 1, [])).count, 0, "aimed into the gutter");
let strikes = 0, pins = 0, n = 0;
for (let pos = -16; pos <= 16; pos += 2) for (let d = -4; d <= 4; d += 2) for (let ball = 0; ball < 4; ball++) for (const spin of [[], Array(40).fill(-1), Array(40).fill(1)]) {
  const s = B.createThrow(full, B.toBytes(pos, d * 0.15, 0.7), ball, pos * 31 + ball, spin), r = B.finish(s);
  assert.ok(s.t <= 9.01 && r.count >= 0 && r.count <= 10);
  assert.strictEqual(r.count, 10 - r.standing.filter(Boolean).length);
  strikes += r.count === 10; pins += r.count; n++;
}
assert.ok(strikes >= n * 0.01 && strikes <= n * 0.2, "strikes: " + strikes + " of " + n);
assert.ok(pins / n > 2.5 && pins / n < 7.5, "average pins per first ball: " + pins / n);
// spin does something: holding right moves the ball right
const straight = B.createThrow(full, B.toBytes(0, 0, 0.5), 0, 9, []), hooked = B.createThrow(full, B.toBytes(0, 0, 0.5), 0, 9, Array(60).fill(1));
for (let i = 0; i < 300; i++) { B.step(straight); B.step(hooked); }
assert.ok(hooked.ball.x > straight.ball.x + 4, "held spin curves the ball");

// what goes over the wire is enough to replay a throw exactly
const live = B.createThrow(full, [170, 120, 190], 3, 4242, []);
while (!live.done) { if (live.n % B.TICK === 0) live.steer[live.n / B.TICK] = live.n < 200 ? 0 : live.n < 420 ? -1 : 1; B.step(live); }
const wire = JSON.parse(JSON.stringify({ b: [170, 120, 190], k: B.steerText(live.steer), m: B.toMask(B.result(live).standing) }));
const replay = B.finish(B.createThrow(full, wire.b, 3, 4242, B.steerList(wire.k)));
assert.strictEqual(B.toMask(replay.standing), wire.m, "the replay matches the original throw");
assert.ok(/^[LR-]*$/.test(wire.k) && wire.k.length <= 240);

// computer bowlers: better skill, better scores
const avg = skill => { let t = 0; for (let g = 0; g < 12; g++) t += B.simulateGame(0, skill, 900 + g).total; return t / 12; };
const low = avg(0.22), high = avg(0.95);
assert.ok(high > low + 15, "skill matters: " + low + " vs " + high);
assert.ok(low > 50 && high < 260);

console.log("Yowza Bowl engine OK: " + strikes + " strikes in " + n + " test throws, computer averages " + Math.round(low) + " (rookie) to " + Math.round(high) + " (shark).");
