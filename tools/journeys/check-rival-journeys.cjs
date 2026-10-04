// Checks the four Journeys (tools/journeys/<game>-levels.json): every level's gold line, replayed move by move,
// reaches all three targets; the Hint's own line is scored too (how many stars a careful player gets); deals are
// all different; targets climb (star 1 easiest). Exit 1 on any failure.
const R = require('./rival-sim.cjs');
const fs = require('fs'), path = require('path');
function stars(game, t, res) {
  const ok = (x) => x === 'moon' ? res.flag : x === 'gin' ? res.flag && res.v > 0 : game === 'hearts' ? res.v <= x : res.v >= x;
  return ok(t[0]) ? (ok(t[1]) ? (ok(t[2]) ? 3 : 2) : 1) : 0;
}
let fails = 0;
for (const game of ['hearts', 'gin', 'cribbage', 'whist']) {
  const J = JSON.parse(fs.readFileSync(path.join(__dirname, game + '-levels.json'), 'utf8'));
  const seeds = new Set(), botStars = [0, 0, 0, 0];
  J.levels.forEach((l, i) => {
    if (seeds.has(l.seed)) { console.log('FAIL', game, i + 1, 'deal used twice'); fails++; }
    seeds.add(l.seed);
    const nums = l.t.filter((x) => typeof x === 'number');
    for (let k = 1; k < nums.length; k++) if (game === 'hearts' ? nums[k] >= nums[k - 1] : nums[k] <= nums[k - 1]) { console.log('FAIL', game, i + 1, 'targets do not climb', l.t); fails++; }
    const g = R.replay(game, l.seed, l.lv, J.lines[i].gold), b = R.replay(game, l.seed, l.lv, J.lines[i].bot);
    if (!g || stars(game, l.t, g) !== 3) { console.log('FAIL', game, i + 1, 'gold line', JSON.stringify(g), 'targets', l.t); fails++; }
    if (!b) { console.log('FAIL', game, i + 1, 'the Hint line does not replay'); fails++; } else botStars[stars(game, l.t, b)]++;
  });
  console.log(game + ': 100 levels, every gold line reaches 3 stars' + (fails ? '?' : '') + '; the Hint’s own play gets 0/1/2/3 stars on ' + botStars.join('/') + ' levels');
}
console.log(fails ? 'FAIL (' + fails + ')' : 'PASS');
process.exit(fails ? 1 : 0);
