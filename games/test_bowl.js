// Checks the Yowza Bowl engine: scoring, the scoresheet marks, turn order, challenge links and replays.
//   node games/test_bowl.js
const assert = require("assert");
const B = require("./yowzabowl.js");

const total = rolls => B.score(rolls).total;
assert.strictEqual(total(Array(12).fill(10)), 300, "perfect game");
assert.strictEqual(total(Array(21).fill(5)), 150, "all spares");
assert.strictEqual(total(Array(20).fill(0)), 0, "all gutters");
assert.strictEqual(total([].concat(...Array(10).fill([9, 0]))), 90, "nine and a miss, ten times");
assert.strictEqual(total([10, 7, 3, 9, 0, 10, 0, 8, 8, 2, 0, 6, 10, 10, 10, 8, 1]), 167, "a mixed game");
assert.strictEqual(B.score([10, 10]).frames[0].cum, null, "a strike waits for two more balls");
assert.strictEqual(B.score([10, 10, 4]).frames[0].cum, 24);
assert.ok(!B.score(Array(11).fill(10)).done && B.score(Array(12).fill(10)).done);

const marks = rolls => B.marks(B.score(rolls).frames).map(m => m.join("")).join(" ");
assert.strictEqual(marks([10, 7, 3, 9, 0, 0, 10]).trim(), "X 7/ 9- -/");
assert.strictEqual(B.marks(B.score(Array(18).fill(0).concat([10, 10, 10])).frames)[9].join(""), "XXX");
assert.strictEqual(B.marks(B.score(Array(18).fill(0).concat([7, 3, 10])).frames)[9].join(""), "7/X");
assert.strictEqual(B.marks(B.score(Array(18).fill(0).concat([10, 7, 3])).frames)[9].join(""), "X7/");
assert.strictEqual(B.marks(B.score(Array(18).fill(0).concat([10, 10, 4])).frames)[9].join(""), "XX4");

assert.deepStrictEqual(B.progress([]), { done: false, frame: 0, ball: 0, fresh: true });
assert.deepStrictEqual(B.progress([10]), { done: false, frame: 1, ball: 0, fresh: true });
assert.deepStrictEqual(B.progress([4]), { done: false, frame: 0, ball: 1, fresh: false });
const nine = Array(18).fill(0);
assert.deepStrictEqual(B.progress(nine.concat([10])), { done: false, frame: 9, ball: 1, fresh: true });
assert.deepStrictEqual(B.progress(nine.concat([10, 6])), { done: false, frame: 9, ball: 2, fresh: false });
assert.deepStrictEqual(B.progress(nine.concat([6, 4])), { done: false, frame: 9, ball: 2, fresh: true });
assert.ok(B.progress(nine.concat([6, 3])).done);

const up = list => Array.from({ length: 10 }, (_, i) => list.includes(i + 1));
assert.ok(B.isSplit(up([7, 10])), "7-10 is a split");
assert.ok(B.isSplit(up([4, 6])), "4-6 is a split");
assert.ok(!B.isSplit(up([1, 2, 3])), "head pin standing is never a split");
assert.ok(!B.isSplit(up([2, 4, 5, 8])), "a connected cluster isn't a split");
assert.ok(!B.isSplit(up([10])), "one pin isn't a split");

// the lane behaves: gutters score nothing, the pocket strikes sometimes, and nothing ever runs forever
const full = Array(10).fill(true);
assert.strictEqual(B.finish(B.createThrow(full, B.toBytes(-17, 0.5, -1), 0, 1)).count, 0, "hooked into the gutter");
let strikes = 0, pins = 0;
for (let pos = -17; pos <= 17; pos++) for (const hook of [-0.8, -0.4, 0, 0.4, 0.8]) for (let ball = 0; ball < 4; ball++) {
  const s = B.createThrow(full, B.toBytes(pos, 0.7, hook), ball, pos * 31 + ball);
  const r = B.finish(s);
  assert.ok(s.t <= 9.01 && r.count >= 0 && r.count <= 10);
  assert.strictEqual(r.count, 10 - r.standing.filter(Boolean).length);
  strikes += r.count === 10; pins += r.count;
}
assert.ok(strikes >= 8 && strikes <= 140, "strikes are possible but not automatic: " + strikes + " of 700");
assert.ok(pins / 700 > 3 && pins / 700 < 7.5, "average pins per first ball: " + pins / 700);

// the same throw always gives the same result (this is what makes challenge links fair)
const a = B.finish(B.createThrow(full, [170, 190, 90], 3, 4242)), b = B.finish(B.createThrow(full, [170, 190, 90], 3, 4242));
assert.deepStrictEqual(a, b);

// computer bowlers: better skill, better scores; and a whole game survives the trip through a link
const avg = skill => { let t = 0; for (let g = 0; g < 12; g++) t += B.simulateGame(0, skill, 900 + g).total; return t / 12; };
const low = avg(0.25), high = avg(0.95);
assert.ok(high > low + 15, "skill matters: " + low + " vs " + high);
assert.ok(low > 50 && high < 260);

const game = B.simulateGame(2, 0.8, 31337);
const sent = { name: "Glorbo ✨", team: 7, look: [3, 5, 1, 6, 2], seed: 31337, throws: game.throws };
const code = B.encodeGame(sent);
assert.ok(/^[\w-]+$/.test(code) && code.length < 170, "the code is link-safe and short: " + code.length);
const got = B.decodeGame(code);
assert.strictEqual(got.total, game.total);
assert.deepStrictEqual(got.look, sent.look);
assert.deepStrictEqual(got.throws, sent.throws);
assert.strictEqual(got.team, 7);
assert.strictEqual(got.name, "Glorbo");
assert.strictEqual(B.decodeGame(code.slice(0, -2) + "AA"), null, "a damaged code is refused");
assert.strictEqual(B.decodeGame("not-a-game"), null);
assert.strictEqual(B.decodeGame(""), null);

// replaying the decoded throws knocks down the same pins, ball for ball
let standing = null;
const rolls = [];
got.throws.forEach((t, n) => {
  if (B.progress(rolls).fresh || !standing) standing = Array(10).fill(true);
  const before = standing.filter(Boolean).length;
  standing = B.finish(B.createThrow(standing, t.slice(0, 3), got.look[4], B.throwSeed(got.seed, n))).standing;
  rolls.push(before - standing.filter(Boolean).length);
});
assert.deepStrictEqual(rolls, game.rolls, "the replay matches the original game");

console.log("Yowza Bowl engine OK: " + strikes + " strikes in 700 test throws, computer averages " + Math.round(low) + " (rookie) to " + Math.round(high) + " (shark).");
