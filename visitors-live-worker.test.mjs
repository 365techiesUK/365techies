// visitors-live-worker.test.mjs - the live-visitors Worker WITHOUT deploying it (deploying = a paste into the
// Cloudflare dashboard by the owner, so a bug found after deploying costs a second paste).
// Node 24 has the same crypto.subtle, fetch, Request and Response the Worker uses, so the real module runs here.
// Run: node --test visitors-live-worker.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { deviceOf, dataCentre } from './visitors-live-worker.js';

/* ------------------------------------------------------------ a fake KV with metadata, as Workers KV has */
function fakeKv() {
  const m = new Map();
  return {
    _m: m, puts: 0,
    async get(k, type) { const e = m.get(k); if (!e) return null; return type === 'json' ? JSON.parse(e.value) : e.value; },
    async put(k, v, opts) { this.puts++; m.set(k, { value: String(v), metadata: opts && opts.metadata }); },
    async list({ prefix, cursor, limit }) {
      const keys = [...m.keys()].filter((k) => k.startsWith(prefix || '')).map((name) => ({ name, metadata: m.get(name).metadata }));
      return { keys, list_complete: true, cursor: undefined };
    },
  };
}
const ORIGIN = 'https://365techies.co.uk';
const UA_WIN_EDGE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0';
const UA_WIN_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const UA_WIN_FX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0';
const UA_WIN7 = 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36';
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const UA_IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1';
const UA_IPAD_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15';
const UA_MAC_CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const UA_ANDROID_TAB = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const UA_SAMSUNG = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36';
const UA_CROS = 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const UA_LINUX_FX = 'Mozilla/5.0 (X11; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0';

const ping = (env, body, ua = UA_WIN_EDGE, cf = {}, ip = '203.0.113.9') => {
  const req = new Request('https://w.example/ping', {
    method: 'POST', body: JSON.stringify(body),
    headers: { Origin: ORIGIN, 'User-Agent': ua, 'CF-Connecting-IP': ip, 'Content-Type': 'text/plain' },
  });
  Object.defineProperty(req, 'cf', { value: cf });   // what Cloudflare attaches; Node's Request has none
  return worker.fetch(req, env);
};
// Node's Request has no .cf: the Worker reads request.cf || {} (city etc. empty here) - fine for these tests
const live = (env) => worker.fetch(new Request('https://w.example/live?site=all&auth=tok'), env).then((r) => r.json());

test('deviceOf: Windows 11 / 10 / plain from the client-hint platformVersion', () => {
  assert.equal(deviceOf(UA_WIN_EDGE, { pv: '15.0.0' }).os, 'Windows 11');
  assert.equal(deviceOf(UA_WIN_EDGE, { pv: '13.0.0' }).os, 'Windows 11');
  assert.equal(deviceOf(UA_WIN_CHROME, { pv: '10.0.0' }).os, 'Windows 10');
  assert.equal(deviceOf(UA_WIN_CHROME, { pv: '1.0.0' }).os, 'Windows 10');
  assert.equal(deviceOf(UA_WIN_CHROME, { pv: '0.3.0' }).os, 'Windows');      // 8.1 says NT 10.0 with pv 0.x: leave it plain
  assert.equal(deviceOf(UA_WIN_FX, {}).os, 'Windows');                       // Firefox has no client hints
  assert.equal(deviceOf(UA_WIN_CHROME, { pv: 'junk' }).os, 'Windows');
  assert.equal(deviceOf(UA_WIN7, {}).os, 'Windows 7');
});

test('deviceOf: browsers and their major versions', () => {
  assert.equal(deviceOf(UA_WIN_EDGE, {}).br, 'Edge 140');
  assert.equal(deviceOf(UA_WIN_CHROME, {}).br, 'Chrome 140');
  assert.equal(deviceOf(UA_WIN_FX, {}).br, 'Firefox 143');
  assert.equal(deviceOf(UA_IPHONE, {}).br, 'Safari 18');
  assert.equal(deviceOf(UA_IPHONE_CHROME, {}).br, 'Chrome 140');
  assert.equal(deviceOf(UA_SAMSUNG, {}).br, 'Samsung Internet 28');
  assert.equal(deviceOf(UA_MAC_CHROME, {}).br, 'Chrome 140');
  assert.equal(deviceOf(UA_IPAD_DESKTOP, {}).br, 'Safari 18');
});

test('deviceOf: phone, tablet or PC, and the system', () => {
  assert.deepEqual([deviceOf(UA_IPHONE, {}).os, deviceOf(UA_IPHONE, {}).dv], ['iPhone', 'phone']);
  assert.deepEqual([deviceOf(UA_ANDROID, {}).os, deviceOf(UA_ANDROID, {}).dv], ['Android', 'phone']);
  assert.deepEqual([deviceOf(UA_ANDROID_TAB, {}).os, deviceOf(UA_ANDROID_TAB, {}).dv], ['Android', 'tablet']);
  // an iPad in Safari's desktop mode says Macintosh - its touch points give it away
  assert.deepEqual([deviceOf(UA_IPAD_DESKTOP, { t: 5 }).os, deviceOf(UA_IPAD_DESKTOP, { t: 5 }).dv], ['iPad', 'tablet']);
  assert.deepEqual([deviceOf(UA_IPAD_DESKTOP, { t: 0 }).os, deviceOf(UA_IPAD_DESKTOP, { t: 0 }).dv], ['Mac', 'pc']);
  assert.deepEqual([deviceOf(UA_MAC_CHROME, {}).os, deviceOf(UA_MAC_CHROME, {}).dv], ['Mac', 'pc']);
  assert.equal(deviceOf(UA_WIN_EDGE, { t: 10 }).dv, 'pc');                  // a touch-screen laptop is still a PC
  assert.equal(deviceOf(UA_CROS, {}).os, 'ChromeOS');
  assert.deepEqual([deviceOf(UA_LINUX_FX, {}).os, deviceOf(UA_LINUX_FX, {}).br], ['Linux', 'Firefox 143']);
  assert.deepEqual([deviceOf('', {}).os, deviceOf('', {}).br, deviceOf('', {}).dv], ['', '', '']);   // nothing to go on: nothing said
  assert.equal(deviceOf('Something/1.0', { t: 5, sw: 390 }).dv, 'phone');    // unknown system, small touch screen
});

test('deviceOf: screen band, dark mode, language - coarse and bounded', () => {
  const d = deviceOf(UA_WIN_EDGE, { sw: 1920, dk: 1, lg: 'en-GB' });
  assert.deepEqual([d.sc, d.dk, d.lg], ['l', 1, 'en-GB']);
  assert.equal(deviceOf(UA_IPHONE, { sw: 390 }).sc, 's');
  assert.equal(deviceOf(UA_ANDROID_TAB, { sw: 800 }).sc, 'm');
  assert.equal(deviceOf(UA_WIN_EDGE, {}).sc, '');
  assert.equal(deviceOf(UA_WIN_EDGE, { dk: 'no' }).dk, 0);
  assert.equal(deviceOf(UA_WIN_EDGE, { lg: 'pl-PL<script>' }).lg, 'pl-PLscript');
  assert.ok(deviceOf('x'.repeat(5000), { lg: 'a'.repeat(100) }).lg.length <= 12);
});

test('ping stores the device in the key AND its metadata; /live hands it out per visitor', async () => {
  const env = { VISITS: fakeKv(), VIS_TOKEN: 'tok' };
  let r = await ping(env, { site: 't365', path: '/computer-spec-checker/', ref: 'www.google.com', pv: '15.0.0', t: 0, sw: 1920, dk: 1, lg: 'en-GB' });
  assert.equal(r.status, 200);
  assert.equal(env.VISITS.puts, 1);
  const [key] = [...env.VISITS._m.keys()];
  const meta = env.VISITS._m.get(key).metadata;
  assert.deepEqual([meta.os, meta.br, meta.dv, meta.sc, meta.dk, meta.lg], ['Windows 11', 'Edge 140', 'pc', 'l', 1, 'en-GB']);
  assert.deepEqual(JSON.parse(env.VISITS._m.get(key).value), meta);
  // a second visitor on an iPhone
  r = await ping(env, { site: 't365', path: '/', ref: '', t: 5, sw: 390, dk: 0, lg: 'en-GB' }, UA_IPHONE);
  assert.equal(r.status, 200);
  const j = await live(env);
  assert.equal(j.ok, true);
  const rows = j.sites.t365.rows;
  assert.equal(rows.length, 2);
  const pc = rows.find((x) => x.dev && x.dev.dv === 'pc'), ph = rows.find((x) => x.dev && x.dev.dv === 'phone');
  assert.deepEqual(pc.dev, { os: 'Windows 11', br: 'Edge 140', dv: 'pc', sc: 'l', dk: 1, lg: 'en-GB' });
  assert.deepEqual(ph.dev, { os: 'iPhone', br: 'Safari 18', dv: 'phone', sc: 's', dk: 0, lg: 'en-GB' });
  assert.equal(pc.src, 'Google');
});

test('an older beacon (no device fields) still counts, with dev = null; a hit without a device does not blank a known one', async () => {
  const env = { VISITS: fakeKv(), VIS_TOKEN: 'tok' };
  await ping(env, { site: 't365', path: '/a/', ref: '' }, '');
  let j = await live(env);
  assert.equal(j.sites.t365.rows[0].dev, null);
  // the same visitor's earlier hit knew the device (hand-planted, as an older/newer Worker mix would leave it)
  const env2 = { VISITS: fakeKv(), VIS_TOKEN: 'tok' };
  await ping(env2, { site: 't365', path: '/a/', ref: '', pv: '15.0.0' }, UA_WIN_EDGE);
  const k = [...env2.VISITS._m.keys()][0].replace(/:[0-9a-f]{10}$/, ':deadbeef00');
  const old = { p: '/b/', c: '', ct: '', t: Math.floor(Date.now() / 1000) + 1, la: null, lo: null, a: '', s: '' };
  await env2.VISITS.put(k, JSON.stringify(old), { metadata: old });
  j = await live(env2);
  assert.equal(j.sites.t365.rows.length, 1);
  assert.equal(j.sites.t365.rows[0].dev.os, 'Windows 11');
});

test('the metadata stays under KV\'s 1,024-byte limit with every field at its longest', () => {
  const d = deviceOf('x'.repeat(400) + ' SamsungBrowser/99999', { lg: 'a'.repeat(50), sw: 9999, dk: 1 });
  const m = { p: '/' + 'p'.repeat(199), c: 'c'.repeat(60), ct: 'GB', t: 1759140000, la: -50.12, lo: -180.12, a: 'BH',
    s: 's'.repeat(80), os: d.os, br: d.br, dv: d.dv, sc: d.sc, dk: d.dk, lg: d.lg };
  assert.ok(JSON.stringify(m).length < 1024, JSON.stringify(m).length);
});

test('the beacon\'s extra fields never change the write count (one put per visitor+page per minute)', async () => {
  const env = { VISITS: fakeKv(), VIS_TOKEN: 'tok' };
  await ping(env, { site: 't365', path: '/x/', ref: '', pv: '15.0.0', sw: 1920 });
  await ping(env, { site: 't365', path: '/x/', ref: '', pv: '15.0.0', sw: 1920 });
  assert.equal(env.VISITS.puts, 1);
});

/* ------------------------------------------------------------ 1 Oct 2026: data centres and VPNs */
test('dataCentre: cloud and hosting networks yes; home broadband, mobile and privacy relays no', () => {
  for (const [asn, org] of [[16509, 'Amazon.com, Inc.'], [0, 'Amazon Technologies Inc.'], [396982, ''], [8075, 'Microsoft Corporation'],
    [0, 'DigitalOcean, LLC'], [0, 'OVH SAS'], [0, 'Hetzner Online GmbH'], [0, 'Akamai Connected Cloud'], [0, 'Contabo GmbH'],
    [0, 'M247 Europe SRL'], [0, 'Datacamp Limited'], [0, 'Some Hosting Ltd'], [0, 'Example Datacenter LLC'], [0, 'Servers.com, Inc.']]) {
    assert.equal(dataCentre(asn, org), true, asn + ' ' + org);
  }
  for (const [asn, org] of [[2856, 'British Telecommunications PLC'], [5089, 'Virgin Media Limited'], [5607, 'Sky UK Limited'],
    [13285, 'TalkTalk Communications Limited'], [25135, 'Vodafone Limited'], [12576, 'EE Limited'], [206067, 'Hutchison 3G UK Limited'],
    [35228, 'Telefonica UK Limited'], [13037, 'Zen Internet Ltd'], [56478, 'Hyperoptic Ltd'], [7922, 'Comcast Cable Communications, LLC'],
    [21928, 'T-Mobile USA, Inc.'], [16591, 'Google Fiber Inc.'], [14593, 'Space Exploration Technologies Corporation'],
    [13335, 'Cloudflare, Inc.'], [36183, 'Akamai Technologies, Inc.'], [54113, 'Fastly, Inc.'], [714, 'Apple Inc.'], [0, ''], [undefined, undefined]]) {
    assert.equal(dataCentre(asn, org), false, asn + ' ' + org);
  }
});

test('a data-centre visit: one entry per visitor (newest page), its network named, outside the count of people', async () => {
  const env = { VISITS: fakeKv(), VIS_TOKEN: 'tok' };
  const AWS = { asn: 16509, asOrganization: 'Amazon.com, Inc.', country: 'US', city: 'Ashburn' };
  await ping(env, { site: 't365', path: '/a/', ref: '' }, UA_WIN_CHROME, AWS, '198.51.100.7');
  await ping(env, { site: 't365', path: '/b/', ref: '' }, UA_WIN_CHROME, AWS, '198.51.100.7');   // within the minute: no write
  assert.equal(env.VISITS.puts, 1);
  const keys = [...env.VISITS._m.keys()];
  assert.equal(keys.length, 1);
  assert.match(keys[0], /:dc$/);
  const meta = env.VISITS._m.get(keys[0]).metadata;
  assert.deepEqual([meta.dc, meta.org, meta.p], [1, 'Amazon.com, Inc.', '/a/']);
  // a person on Virgin Media at the same time
  await ping(env, { site: 't365', path: '/contact/', ref: 'www.google.com' }, UA_IPHONE, { asn: 5089, asOrganization: 'Virgin Media Limited', country: 'GB', city: 'Poole' });
  const j = await live(env);
  const t = j.sites.t365;
  assert.equal(t.visitors, 1);
  assert.equal(t.auto, 1);
  assert.deepEqual(t.pages, { '/contact/': 1 });
  assert.deepEqual(Object.keys(t.places), ['Poole, GB']);
  assert.equal(t.rows.length, 2);
  assert.equal(t.rows[0].dc, undefined);           // the person first
  assert.equal(t.rows[1].dc, 1);
  assert.equal(t.rows[1].org, 'Amazon.com, Inc.');
  assert.ok(!('org' in t.rows[0]));                // a person's network is never kept
  const one = await worker.fetch(new Request('https://w.example/live?site=t365&auth=tok'), env).then((r) => r.json());
  assert.equal(one.visitors, 1);
});

test('the data-centre metadata stays under KV\'s 1,024-byte limit too', () => {
  const m = { p: '/' + 'p'.repeat(199), c: 'c'.repeat(60), ct: 'GB', t: 1759140000, la: -50.12, lo: -180.12, a: 'BH',
    s: 's'.repeat(80), os: 'o'.repeat(20), br: 'b'.repeat(24), dv: 'tablet', sc: 'l', dk: 1, lg: 'l'.repeat(12), dc: 1, org: 'g'.repeat(40) };
  assert.ok(JSON.stringify(m).length < 1024, JSON.stringify(m).length);
});
