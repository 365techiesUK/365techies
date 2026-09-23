// VIKING RAID (tr62): where the static pier crowd figures stand, in pier frame (s along the axis,
// o across, metres). Baked into the coast mesh by src/gl/pier-people-scale.js, so the raid cannot
// hide them without a draw-range hook in craft.js (off limits). Instead every fire spot, ladder
// top, fire-pot/arrow impact and collapse effect is kept clear of these points (the intro says the
// pier was evacuated; no visitor may look in danger). Regenerate with tmp-tr62/crowd-dump.mjs
// if pier-people-scale.js changes.
export const CROWD = [[0.9,-0.1],[1.5,4.3],[3.1,0.1],[3.8,0.5],[6.3,-3.1],[10.5,-4.4],[11.9,2.8],[12.9,-3.1],[13.4,-3.7],[13.7,-4.5],[14.2,-3.5],[14.6,-4.3],[15.1,3.9],[26.6,3.9],[26.6,-3.9],[26.7,4.6],[26.7,-4.6],[27.5,3.8],[27.5,-3.8],[27.6,4.6],[27.6,-4.5],[34,5.3],[38.8,5.3],[52.4,5],[53.4,5],[54.1,5],[58,-5.3],[62.1,-5.3],[63.6,3.3],[63.6,4.1],[65.8,-5.3],[70.6,-5.3],[78.5,5],[79.5,5],[80.4,5],[96,-5.3],[100.4,-5.3],[105.7,-5.3],[120.8,3.1],[121,3.8],[121.1,4.6],[122.4,4.2],[122.4,-4.2],[171.4,18.2],[171.4,-6.5],[173.1,18],[203.7,17.8],[203.7,-7.4],[210.8,17.4],[210.9,18.2],[218.9,18.5],[219.1,-8.7],[220,18.6],[220.1,-8.6],[220.9,18.6],[221,-8.8],[221.8,18.5],[222,-8.9],[224.8,-8.7],[224.9,18.5],[225.8,-8.6],[226,18.4],[226.8,-8.7],[227.1,18.5],[227.8,18.6],[230.6,-8.7],[230.7,18.4],[231.7,18.5],[232.6,18.6],[236.5,18.5],[237.4,18.5],[238.4,18.4],[247.2,11],[248.6,10.6],[249.5,-1],[250.6,8.4],[250.7,0.9],[251.3,6.4],[251.4,4.1]];
export const CROWD_CLEAR = 5;   // metres kept between any raid effect and a figure

export function crowdDist(s, o) {
  let d = Infinity;
  for (const q of CROWD) { const e = Math.hypot(q[0] - s, q[1] - o); if (e < d) d = e; }
  return d;
}

// The nearest point to (s, o) inside [s0,s1] x [o0,o1] at least r from every figure (0.5 m grid);
// if none exists, the point in the box farthest from the crowd.
export function crowdClear(s, o, s0, s1, o0, o1, r = CROWD_CLEAR) {
  if (crowdDist(s, o) >= r) return [s, o];
  let best = null, bd = Infinity, far = null, fd = -1;
  for (let a = s0; a <= s1 + 1e-6; a += 0.5) for (let b = o0; b <= o1 + 1e-6; b += 0.5) {
    const c = crowdDist(a, b);
    if (c > fd) { fd = c; far = [a, b]; }
    if (c >= r) { const e = Math.hypot(a - s, b - o); if (e < bd) { bd = e; best = [a, b]; } }
  }
  return best || far;
}
