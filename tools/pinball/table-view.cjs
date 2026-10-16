/* 365 Pinball Hero - draw a table exactly as the engine sees it (16 Oct 2026). Never deployed.
 * Writes an SVG of every collider, toy, path, sensor and storey (approach lines dashed red) and, with --png, takes a
 * picture of it with headless Edge (playwright-core from the launch-reel project; nothing is served).
 *
 *   node tools/pinball/table-view.cjs [out.svg] [--png out.png] [--scale 3]      (Ember Peak; --orbit for the old table)
 * The last tool run's overlay.js (trap spots, shot fans, paths) is drawn on top when it is for the same table. */
'use strict';
var fs = require('fs'), path = require('path');
var S = require('./sim.cjs'), E = S.E;

function svg(tableId, scale) {
  var B = E.table(tableId), T = B.T, W = E.newWorld(2, 0, 1, tableId), k = scale || 3, o = [];
  var pad = 10, w = (T.W + pad * 2) * k, h = (T.H + 60 + pad * 2) * k;
  function X(x) { return ((x + pad) * k).toFixed(1); }
  function Y(y) { return ((y + pad) * k).toFixed(1); }
  function line(a, b, c, d, col, wd, dash) { o.push('<line x1="' + X(a) + '" y1="' + Y(b) + '" x2="' + X(c) + '" y2="' + Y(d) + '" stroke="' + col + '" stroke-width="' + (wd * k).toFixed(1) + '" stroke-linecap="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>'); }
  function circ(x, y, r, fill, stroke, sw) { o.push('<circle cx="' + X(x) + '" cy="' + Y(y) + '" r="' + (r * k).toFixed(1) + '" fill="' + (fill || 'none') + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + ((sw || 1) * k).toFixed(1) + '"' : '') + '/>'); }
  function text(x, y, s, col, size) { o.push('<text x="' + X(x) + '" y="' + Y(y) + '" fill="' + (col || '#fff') + '" font-size="' + ((size || 5) * k) + '" font-family="Segoe UI, Arial">' + s + '</text>'); }
  function poly(P, col, close, wd, dash) { o.push('<polyline points="' + P.map(function (p) { return X(p[0]) + ',' + Y(p[1]); }).join(' ') + (close ? ' ' + X(P[0][0]) + ',' + Y(P[0][1]) : '') + '" fill="none" stroke="' + col + '" stroke-width="' + ((wd || 1) * k).toFixed(1) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>'); }
  o.push('<rect width="' + w + '" height="' + h + '" fill="#0b1622"/>');
  // storeys: areas and approach lines
  (T.storeys || []).forEach(function (s, i) {
    o.push('<rect x="' + X(s.x0) + '" y="' + Y(s.y0) + '" width="' + ((s.x1 - s.x0) * k) + '" height="' + ((Math.min(s.y1, T.H) - s.y0) * k) + '" fill="' + (i ? 'rgba(255,140,0,0.06)' : 'rgba(0,160,255,0.06)') + '"/>');
    line(s.x0, s.approach, s.x1, s.approach, '#ff3355', 0.8, '8,6'); text(s.x0 + 2, s.approach - 2, s.name + ' approach y ' + s.approach, '#ff6680', 4.5);
  });
  (T.voids || []).forEach(function (v) { poly(v, 'rgba(255,255,255,0.25)', true, 0.5, '3,3'); });
  // the arch
  var A = T.arch, a0 = ((A.x - A.R + pad) * k).toFixed(1), a1 = ((A.x + A.R + pad) * k).toFixed(1);
  o.push('<path d="M' + a0 + ',' + Y(A.y) + ' A' + (A.R * k) + ',' + (A.R * k) + ' 0 0 1 ' + a1 + ',' + Y(A.y) + '" fill="none" stroke="#9fb4c8" stroke-width="' + (A.r * 2 * k) + '"/>');
  // walls (and slings), posts, bumpers
  B.WALLS.forEach(function (s) {
    var col = s.kind === 'sling' ? '#ff9a2e' : s.kind === 'rubber' ? '#ffd27a' : s.kind === 'post' ? '#d0e0ff' : s.kind === 'apron' ? '#334455' : s.e <= 0.16 ? '#7f8fa0' : '#c8d6e5';
    line(s.ax, s.ay, s.bx, s.by, col, s.r * 2);
  });
  B.POSTS.forEach(function (p) { circ(p.x, p.y, p.r, '#ffd27a'); });
  B.BUMPERS.forEach(function (b) { circ(b.x, b.y, b.r, 'rgba(255,90,40,0.35)', '#ff6a3d', 1.2); });
  B.GATES.forEach(function (g) { line(g.ax, g.ay, g.bx, g.by, '#41e0c8', g.r * 2); line((g.ax + g.bx) / 2, (g.ay + g.by) / 2, (g.ax + g.bx) / 2 + g.nx * 6, (g.ay + g.by) / 2 + g.ny * 6, '#41e0c8', 0.6); });
  B.LAVA.forEach(function (g) { line(g.ax, g.ay, g.bx, g.by, '#ff5a00', g.r * 2, '4,3'); line((g.ax + g.bx) / 2, (g.ay + g.by) / 2, (g.ax + g.bx) / 2 + g.nx * 6, (g.ay + g.by) / 2 + g.ny * 6, '#ff5a00', 0.6); });
  B.DROPS.forEach(function (d) { line(d.ax, d.ay, d.bx, d.by, '#b06cff', d.r * 2); });
  // flippers at rest and up
  W.flippers.forEach(function (f) {
    [[f.rest, '#ffffff', 1], [f.up, 'rgba(255,255,255,0.3)', 0.8]].forEach(function (q) {
      var c = Math.cos(q[0]), sn = Math.sin(q[0]);
      line(f.x, f.y, f.x + c * f.len, f.y + sn * f.len, q[1], (f.r0 + f.r1) * q[2]);
    });
    circ(f.x, f.y, 1.2, '#000');
  });
  // the volcano, its mouth, the geyser, the crabs and their paths
  if (B.VOLC) {
    var V = B.VOLC, half = Math.acos(V.cosHalf), m0 = Math.atan2(V.my, V.mx);
    circ(V.x, V.y, V.r, 'rgba(40,30,30,0.9)', '#ff7a1a', 1.2); circ(V.x, V.y, V.r * 0.45, '#ff5a00');
    [m0 - half, m0 + half].forEach(function (a) { line(V.x, V.y, V.x + Math.cos(a) * (V.r + 10), V.y + Math.sin(a) * (V.r + 10), '#ffcc00', 0.6, '3,2'); });
    text(V.x - 14, V.y - V.r - 3, 'VOLCANO', '#ffb070');
  }
  if (B.GEY) { circ(B.GEY.x, B.GEY.y, B.GEY.r, 'rgba(180,220,255,0.15)', '#bfe4ff', 0.6); text(B.GEY.x - 10, B.GEY.y + B.GEY.r + 5, 'geyser', '#bfe4ff', 4); }
  B.CRABS.forEach(function (C, i) { line(C.d.path[0][0], C.d.path[0][1], C.d.path[1][0], C.d.path[1][1], 'rgba(255,80,80,0.5)', 0.6, '2,2'); var c = W.toys.crabs[i]; circ(c.x, c.y, C.d.r, '#d8342a', '#ffb0a0', 0.6); });
  // the ramp and the carries (height as colour: lighter = higher)
  function zcol(z) { var t = Math.min(1, z / 170); return 'rgb(' + Math.round(60 + 195 * t) + ',' + Math.round(200 + 55 * t) + ',255)'; }
  if (B.RAMP) { var P = B.RAMP.P; for (var i = 1; i < P.length; i++) line(P[i - 1][0], P[i - 1][1], P[i][0], P[i][1], zcol(P[i][2]), 1.2); var en = B.RAMP.entry; line(en.x0, en.y, en.x1, en.y, '#00ffff', 0.6); text(P[P.length - 1][0] + 3, P[P.length - 1][1], 'ramp end', '#8ff', 4); }
  Object.keys(B.CARRY).forEach(function (k2) { var C = B.CARRY[k2].P; for (var i = 1; i < C.length; i++) line(C[i - 1][0], C[i - 1][1], C[i][0], C[i][1], zcol(C[i][2]), 1, '5,3'); text(C[C.length - 1][0] + 4, C[C.length - 1][1] + 2, 'rail out', '#cdf', 4); });
  // sensors
  T.sensors.circles.forEach(function (s) { circ(s[1], s[2], s[3], 'none', 'rgba(120,255,120,0.6)', 0.4); });
  T.sensors.lines.forEach(function (s) { line(s[1], s[2], s[3], s[4], 'rgba(120,255,120,0.8)', 0.5, '2,2'); });
  // the plunger
  line(T.shooter.x0 + 3, T.shooter.tip, T.shooter.x1 - 3, T.shooter.tip, '#e0e0e0', 2);
  // the last tool's overlay, if it was drawn for this table
  try {
    var ov = fs.readFileSync(path.join(__dirname, 'overlay.js'), 'utf8'), O = JSON.parse(ov.replace(/^window\.OVERLAY = /, '').replace(/;\s*$/, ''));
    if (!O.table || O.table === tableId) {
      (O.paths || []).forEach(function (p) { if (p.pts.length > 1) poly(p.pts, p.col, false, p.w || 0.5); });
      (O.dots || []).forEach(function (d) { circ(d[0], d[1], d[3] || 1.5, d[2]); });
    }
  } catch (e) { /* no overlay */ }
  text(4, T.H + 14, T.name + ' (' + tableId + '): ' + T.W + ' x ' + T.H + ', ' + W.flippers.length + ' flippers, ' + (T.storeys || []).length + ' storeys', '#fff', 6);
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' + o.join('') + '</svg>';
}

async function png(svgText, out) {
  var pw = require('D:/claude/365-techies-website-launch-reel/node_modules/playwright-core');
  var m = svgText.match(/width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/);
  var browser = await pw.chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11'] });
  var page = await browser.newPage({ viewport: { width: Math.ceil(+m[1]), height: Math.ceil(+m[2]) } });
  await page.setContent('<html><body style="margin:0;background:#0b1622">' + svgText + '</body></html>');
  await page.screenshot({ path: out });
  await browser.close();
}

if (require.main === module) {
  var a = process.argv.slice(2), scale = 3, outPng = null, outSvg = null;
  for (var i = 0; i < a.length; i++) {
    if (a[i] === '--png') outPng = a[++i];
    else if (a[i] === '--scale') scale = +a[++i];
    else outSvg = a[i];
  }
  var s = svg(S.tableId, scale);
  if (outSvg) fs.writeFileSync(outSvg, s);
  if (outPng) png(s, outPng).then(function () { console.log('wrote ' + outPng); }, function (e) { console.error(e); process.exitCode = 1; });
  else if (!outSvg) process.stdout.write(s);
}
module.exports = { svg: svg, png: png };
