// slack-jobs-worker.test.mjs - the job-card Worker WITHOUT deploying it (a deploy is a dashboard paste by the owner).
// Node has the same crypto.subtle, Request and Response; fetch is stubbed to record what would go to Slack.
// Run: node --test slack-jobs-worker.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import worker, { cardText, cardBlocks, parseCard, modalView, readSubmission, validate } from './slack-jobs-worker.js';

const SECRET = 'test-signing-secret';
const env = { SLACK_BOT_TOKEN: 'xoxb-test', SLACK_SIGNING_SECRET: SECRET };

/* ---------------------------------------------------------------- stubbed Slack */
let calls = [];
let answer = () => ({ ok: true, ts: '1790900000.000100' });
globalThis.fetch = async (url, init) => {
  const body = JSON.parse(init.body);
  calls.push({ method: String(url).replace('https://slack.com/api/', ''), auth: init.headers.Authorization, body });
  return { json: async () => answer(calls[calls.length - 1]) };
};
function signed(path, body, { ts = Math.floor(Date.now() / 1000), secret = SECRET, sig } = {}) {
  const mac = sig || ('v0=' + createHmac('sha256', secret).update('v0:' + ts + ':' + body).digest('hex'));
  return new Request('https://w.example' + path, {
    method: 'POST', body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Slack-Request-Timestamp': String(ts), 'X-Slack-Signature': mac },
  });
}
const payload = (p) => 'payload=' + encodeURIComponent(JSON.stringify(p));
const V = { name: 'Davina Gahan', address: '8 Copsewood Avenue, Bournemouth', postcode: 'BH8 9NG', phone: '01202 123456', mobile: '07584168898', email: 'davinagahn@hotmail.com', website: 'www.davinagahan.co.uk',
  jobtype: 'Remote', issue: 'MS 365 Lost password. Waiting for reply from MS to restore the password', assigned: 'Steve', priority: 'Medium', price: '60' };
// the EXACT card the Worker posts for V - pinned here and in api/pcm-slackjobs-test.php, where the server's reader parses it
const CARD = ':inbox_tray: *New job in*\n*Customer name*\nDavina Gahan\n*Address*\n8 Copsewood Avenue, Bournemouth\n*Postcode*\nBH8 9NG\n*Contact number*\n01202 123456\n*Mobile phone*\n07584168898\n*Email*\ndavinagahn@hotmail.com\n*Website address*\nwww.davinagahan.co.uk\n*Job type*\nRemote\n*Issue*\nMS 365 Lost password. Waiting for reply from MS to restore the password\n*Assigned to*\nSteve\n*Priority*\nMedium\n*Price £.*\n60';
function submission(values, privateMetadata = '', user = { id: 'U1', name: 'david' }) {
  const state = {};
  for (const [k, val] of Object.entries(values)) state[k] = { v: (k === 'jobtype' || k === 'priority') ? { type: 'static_select', selected_option: val ? { value: val } : null } : { type: 'plain_text_input', value: val } };
  return { type: 'view_submission', user, view: { callback_id: 'job_form', private_metadata: privateMetadata, state: { values: state } } };
}

test('the card: the Workflow Builder layout the reader already knows, empty answers as empty lines', () => {
  assert.equal(cardText(V, null), CARD);
  const t = cardText({ name: 'Joan Baker' }, null);
  assert.ok(t.includes('*Customer name*\nJoan Baker\n*Address*\n\n*Postcode*\n\n'), t);
  assert.ok(t.includes('*Mobile phone*\n\n*Email*\n\n*Website address*\n\n'), t);
  assert.ok(t.endsWith('*Price £.*\n'), t);
  const e = cardText(V, { by: 'david', when: '1 Oct, 14:20' });
  assert.ok(e.endsWith('\n_Edited by david · 1 Oct, 14:20_'), e);
  const b = cardBlocks(CARD);
  assert.equal(b[0].text.text, CARD);
  assert.equal(b[1].elements[0].action_id, 'edit_job');
});

test('parseCard reads a card back, a mailto-wrapped email, a two-line issue, and ignores the edited-by line', () => {
  assert.deepEqual(parseCard(CARD), V);
  const wrapped = CARD.replace('davinagahn@hotmail.com', '<mailto:davinagahn@hotmail.com|davinagahn@hotmail.com>').replace('Waiting for', '\nWaiting for') + '\n_Edited by david · 1 Oct, 14:20_';
  const p = parseCard(wrapped);
  assert.equal(p.email, 'davinagahn@hotmail.com');
  assert.equal(p.issue, V.issue);
  assert.equal(p.price, '60');
  assert.deepEqual(parseCard(''), {});
  assert.deepEqual(parseCard('*Customer name*\n*Address*\n'), { name: '', address: '' });
});

test('the form: a select keeps its current choice, an input its current text; the title says which it is', () => {
  const m = modalView({}, '');
  assert.equal(m.title.text, 'New job in'); assert.equal(m.submit.text, 'Post'); assert.equal(m.private_metadata, '');
  assert.equal(m.blocks.length, 12);
  assert.equal(m.blocks[0].optional, false);
  assert.equal(m.blocks[1].optional, true);
  const e = modalView(V, JSON.stringify({ channel: 'C1', ts: '1.2' }));
  assert.equal(e.title.text, 'Edit job'); assert.equal(e.submit.text, 'Save');
  assert.equal(e.blocks[0].element.initial_value, 'Davina Gahan');
  assert.equal(e.blocks[7].element.initial_option.value, 'Remote');
  assert.equal(e.blocks[10].element.initial_option.value, 'Medium');
  assert.equal(e.blocks[4].element.initial_value, '07584168898');
  assert.equal(e.blocks[6].element.initial_value, 'www.davinagahan.co.uk');
  assert.equal(modalView({ jobtype: 'on-site' }, 'x').blocks[7].element.initial_option.value, 'On-site');
  assert.equal(modalView({ jobtype: 'Van' }, 'x').blocks[7].element.initial_option, undefined);
});

test('readSubmission + validate: trims, strips a leading £, insists on a name, checks email and price', () => {
  const v = readSubmission(submission({ ...V, name: '  Davina Gahan ', price: '£ 60' }).view);
  assert.equal(v.name, 'Davina Gahan'); assert.equal(v.price, '60'); assert.equal(v.jobtype, 'Remote');
  assert.deepEqual(validate(v), {});
  assert.deepEqual(Object.keys(validate(readSubmission(submission({ name: '', email: 'nope', price: 'sixty' }).view))).sort(), ['email', 'name', 'price']);
  assert.deepEqual(validate(readSubmission(submission({ name: 'X', price: '45.50' }).view)), {});
  const w = readSubmission(submission({ name: 'X', website: 'https://www.Example.co.uk/' }).view);
  assert.equal(w.website, 'www.Example.co.uk'); assert.deepEqual(validate(w), {});
  assert.ok(validate(readSubmission(submission({ name: 'X', website: 'not a site' }).view)).website);
});

test('/newjob opens the empty form; the shortcut too', async () => {
  calls = [];
  let r = await worker.fetch(signed('/slack/command', 'command=%2Fnewjob&trigger_id=T1&user_id=U1'), env);
  assert.equal(r.status, 200);
  assert.equal(calls[0].method, 'views.open'); assert.equal(calls[0].body.trigger_id, 'T1'); assert.equal(calls[0].body.view.title.text, 'New job in');
  assert.equal(calls[0].auth, 'Bearer xoxb-test');
  calls = [];
  r = await worker.fetch(signed('/slack/interact', payload({ type: 'shortcut', callback_id: 'new_job', trigger_id: 'T2' })), env);
  assert.equal(r.status, 200); assert.equal(calls[0].method, 'views.open'); assert.equal(calls[0].body.trigger_id, 'T2');
});

test('Post: the submission becomes a card in the jobs channel with an Edit button', async () => {
  calls = [];
  const r = await worker.fetch(signed('/slack/interact', payload(submission(V))), env);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { response_action: 'clear' });
  assert.equal(calls[0].method, 'chat.postMessage');
  assert.equal(calls[0].body.channel, 'C0C3VGP1SJC');
  assert.equal(calls[0].body.text, CARD);
  assert.equal(calls[0].body.blocks[1].elements[0].action_id, 'edit_job');
});

test('Edit: the button opens the form filled from the card; Save rewrites that message with an edited-by line', async () => {
  calls = [];
  let r = await worker.fetch(signed('/slack/interact', payload({ type: 'block_actions', trigger_id: 'T3', user: { id: 'U1', name: 'david' },
    channel: { id: 'C0C3VGP1SJC' }, message: { ts: '1790900000.000100', text: CARD }, actions: [{ action_id: 'edit_job' }] })), env);
  assert.equal(r.status, 200);
  assert.equal(calls[0].method, 'views.open');
  assert.equal(calls[0].body.view.title.text, 'Edit job');
  assert.equal(calls[0].body.view.blocks[1].element.initial_value, '8 Copsewood Avenue, Bournemouth');
  assert.deepEqual(JSON.parse(calls[0].body.view.private_metadata), { channel: 'C0C3VGP1SJC', ts: '1790900000.000100' });
  calls = [];
  r = await worker.fetch(signed('/slack/interact', payload(submission({ ...V, postcode: 'BH8 9NH' }, JSON.stringify({ channel: 'C0C3VGP1SJC', ts: '1790900000.000100' })))), env);
  assert.deepEqual(await r.json(), { response_action: 'clear' });
  assert.equal(calls[0].method, 'chat.update');
  assert.equal(calls[0].body.ts, '1790900000.000100');
  assert.ok(calls[0].body.text.includes('*Postcode*\nBH8 9NH\n'), calls[0].body.text);
  assert.ok(/\n_Edited by david · .+_$/.test(calls[0].body.text), calls[0].body.text);
  assert.equal(parseCard(calls[0].body.text).postcode, 'BH8 9NH');   // and it reads back for the next edit
});

test('a submission with no name is sent back with the error on that field; Slack refusing the post is shown too', async () => {
  calls = [];
  let r = await worker.fetch(signed('/slack/interact', payload(submission({ ...V, name: '' }))), env);
  const j = await r.json();
  assert.equal(j.response_action, 'errors'); assert.ok(j.errors.name);
  assert.equal(calls.length, 0);
  answer = () => ({ ok: false, error: 'not_in_channel' });
  r = await worker.fetch(signed('/slack/interact', payload(submission(V))), env);
  const j2 = await r.json();
  assert.equal(j2.response_action, 'errors'); assert.ok(j2.errors.name.includes('not_in_channel'));
  answer = () => ({ ok: true, ts: '1.2' });
});

test('unsigned, wrongly signed or stale requests are refused; other buttons and GETs are harmless', async () => {
  calls = [];
  let r = await worker.fetch(signed('/slack/command', 'trigger_id=T', { secret: 'wrong' }), env);
  assert.equal(r.status, 401);
  r = await worker.fetch(signed('/slack/command', 'trigger_id=T', { ts: Math.floor(Date.now() / 1000) - 3600 }), env);
  assert.equal(r.status, 401);
  r = await worker.fetch(new Request('https://w.example/slack/command', { method: 'POST', body: 'x' }), env);
  assert.equal(r.status, 401);
  assert.equal(calls.length, 0);
  r = await worker.fetch(signed('/slack/interact', payload({ type: 'block_actions', actions: [{ action_id: 'something_else' }] })), env);
  assert.equal(r.status, 200); assert.equal(calls.length, 0);
  r = await worker.fetch(new Request('https://w.example/'), env);
  assert.equal(r.status, 200);
  r = await worker.fetch(signed('/slack/command', 'trigger_id=T'), { SLACK_SIGNING_SECRET: SECRET });
  assert.equal(r.status, 500);
});
