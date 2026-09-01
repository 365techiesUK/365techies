// street-manager-worker.test.mjs
//
// Tests the Street Manager SNS receiver WITHOUT deploying it. This matters
// more than usual: the AWS subscription handshake is one-shot with a 3-day
// expiry, so a bug found after registering costs a full re-registration.
//
// Node 24 exposes the same crypto.subtle, atob, fetch, Request and Response
// the Worker uses, so the real module runs here unmodified.
//
// Run: node --test street-manager-worker.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import worker, {
  TOPICS, SNS_HOST, OURS, canonicalString, spkiFromCertificate, base64ToBytes,
} from './street-manager-worker.js';

const PERMIT_ARN = 'arn:aws:sns:eu-west-2:287813576808:prod-permit-topic';

/* ---------------------------------------------------------------- fake KV */

function fakeKv() {
  const m = new Map();
  return {
    _m: m,
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async put(k, v) { m.set(k, String(v)); },
  };
}
const envWith = (over = {}) => ({
  ROADWORKS: fakeKv(), SM_PATH: 'secret-path', SM_TOKEN: 'read-token', ...over,
});

const post = (env, body, p = '/sns/secret-path') =>
  worker.fetch(new Request(`https://w.example${p}`, {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }), env);

/* ------------------------------------------------------- routing + guards */

test('the receive path is unguessable and rejects the wrong method', async () => {
  const env = envWith();
  // wrong path -> falls through to the token-authed reads, which refuse
  const wrong = await worker.fetch(new Request('https://w.example/sns/guessed', { method: 'POST' }), env);
  assert.equal(wrong.status, 403);

  // right path, wrong method
  const get = await worker.fetch(new Request('https://w.example/sns/secret-path'), env);
  assert.equal(get.status, 405);
});

test('reads require the token', async () => {
  const env = envWith();
  assert.equal((await worker.fetch(new Request('https://w.example/health'), env)).status, 403);
  assert.equal((await worker.fetch(new Request('https://w.example/health?token=wrong'), env)).status, 403);
  assert.equal((await worker.fetch(new Request('https://w.example/health?token=read-token'), env)).status, 200);
});

test('an unset SM_TOKEN refuses reads rather than allowing them', async () => {
  // Fail closed: a half-configured Worker must not serve data to anyone who
  // omits the parameter entirely.
  const env = envWith({ SM_TOKEN: undefined });
  assert.equal((await worker.fetch(new Request('https://w.example/health'), env)).status, 403);
  assert.equal((await worker.fetch(new Request('https://w.example/health?token='), env)).status, 403);
});

test('malformed bodies and foreign topics are handled distinctly', async () => {
  const env = envWith();
  const bad = await post(env, 'not json at all');
  assert.equal(bad.status, 400);
  assert.equal(await env.ROADWORKS.get('count:badJson'), '1');

  // A well-formed message on somebody else's topic: answer 200 so AWS stops
  // retrying, but count it and store nothing.
  const foreign = await post(env, { Type: 'Notification', TopicArn: 'arn:aws:sns:eu-west-2:1:other' });
  assert.equal(foreign.status, 200);
  assert.equal(await env.ROADWORKS.get('count:wrongTopic'), '1');
  assert.equal(await env.ROADWORKS.get('count:stored'), null);
});

test('SSRF GUARD: a forged cert URL is never fetched', async () => {
  // The single most dangerous input. Without the host check the Worker would
  // fetch whatever an attacker put in SigningCertURL.
  const env = envWith();
  let fetched = false;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (...a) => { fetched = true; return realFetch(...a); };
  try {
    for (const url of [
      'https://evil.example/cert.pem',
      'http://sns.eu-west-2.amazonaws.com/c.pem',          // not https
      'https://sns.eu-west-2.amazonaws.com.evil.example/c', // suffix trick
      'https://amazonaws.com/c.pem',
      'file:///etc/passwd',
    ]) {
      const res = await post(env, {
        Type: 'SubscriptionConfirmation', TopicArn: PERMIT_ARN,
        SigningCertURL: url, Signature: 'x', SignatureVersion: '1',
        Message: 'm', MessageId: 'i', Timestamp: 't', Token: 'tk', SubscribeURL: 'https://x',
      });
      assert.equal(res.status, 403, `should refuse ${url}`);
    }
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(fetched, false, 'no outbound fetch may happen for a bad cert host');
});

test('the SNS host pattern accepts real regions and nothing else', () => {
  for (const h of ['sns.eu-west-2.amazonaws.com', 'sns.us-east-1.amazonaws.com', 'sns.ap-southeast-2.amazonaws.com']) {
    assert.ok(SNS_HOST.test(h), h);
  }
  for (const h of ['sns.eu-west-2.amazonaws.com.evil.com', 'evil.com/sns.eu-west-2.amazonaws.com',
                   'snsXeu-west-2.amazonaws.com', 'sns..amazonaws.com', 'amazonaws.com']) {
    assert.ok(!SNS_HOST.test(h), h);
  }
});

/* -------------------------------------------------- canonical string bytes */

test('canonical string matches the AWS field list and order exactly', () => {
  const notif = {
    Type: 'Notification', MessageId: 'id-1', TopicArn: PERMIT_ARN,
    Message: 'body', Timestamp: '2026-09-01T00:00:00.000Z', Subject: 'subj',
    Signature: 'ignored', SigningCertURL: 'ignored',
  };
  assert.equal(canonicalString(notif),
    'Message\nbody\nMessageId\nid-1\nSubject\nsubj\nTimestamp\n2026-09-01T00:00:00.000Z\n'
    + `TopicArn\n${PERMIT_ARN}\nType\nNotification\n`);

  // Subject is optional and must be OMITTED, not sent empty.
  const noSubject = { ...notif, Subject: undefined };
  assert.ok(!canonicalString(noSubject).includes('Subject'));

  // SubscriptionConfirmation signs SubscribeURL and Token instead.
  const conf = {
    Type: 'SubscriptionConfirmation', MessageId: 'id-2', TopicArn: PERMIT_ARN,
    Message: 'm', Timestamp: 'ts', Token: 'tok', SubscribeURL: 'https://sns.eu-west-2.amazonaws.com/?x=1',
  };
  assert.equal(canonicalString(conf),
    'Message\nm\nMessageId\nid-2\nSubscribeURL\nhttps://sns.eu-west-2.amazonaws.com/?x=1\n'
    + `Timestamp\nts\nToken\ntok\nTopicArn\n${PERMIT_ARN}\nType\nSubscriptionConfirmation\n`);

  assert.equal(canonicalString({ Type: 'Nonsense' }), null);
  assert.equal(canonicalString(null), null);
});

/* ------------------------------------ the DER walk, against openssl itself */

function makeCert() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-cert-'));
  const key = path.join(dir, 'k.pem');
  const crt = path.join(dir, 'c.pem');
  const pub = path.join(dir, 'p.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', key, '-out', crt, '-days', '1', '-subj', '/CN=sns.eu-west-2.amazonaws.com'],
    { stdio: 'ignore' });
  execFileSync('openssl', ['x509', '-in', crt, '-pubkey', '-noout', '-out', pub], { stdio: 'ignore' });
  return { dir, key, crt, pub };
}

test('spkiFromCertificate extracts exactly what openssl extracts', () => {
  // This is the trickiest code in the file — a hand-rolled ASN.1 walk to pull
  // SubjectPublicKeyInfo out of an X.509 DER, because WebCrypto imports SPKI
  // and not whole certificates. Compared byte-for-byte against openssl rather
  // than merely "looks plausible".
  const { dir, crt, pub } = makeCert();
  try {
    const mine = spkiFromCertificate(fs.readFileSync(crt, 'utf8'));
    assert.ok(mine, 'should extract an SPKI');

    const theirs = base64ToBytes(
      fs.readFileSync(pub, 'utf8').replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '').replace(/\s+/g, ''));

    assert.equal(mine.length, theirs.length, 'SPKI length must match openssl');
    assert.deepEqual(Buffer.from(mine), Buffer.from(theirs), 'SPKI bytes must match openssl');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('spkiFromCertificate refuses rubbish instead of returning nonsense', () => {
  for (const bad of ['', 'not a pem', '-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----']) {
    const out = spkiFromCertificate(bad);
    assert.ok(out === null || out instanceof Uint8Array, 'must be null or bytes, never a throw');
  }
});

/* ------------------------------- the extracted key actually verifies a sig */

test('a signature made with the cert key verifies against the extracted SPKI', async () => {
  // End-to-end proof of the crypto path: sign the exact canonical bytes with
  // the private key, then verify with the SPKI our own DER walk produced.
  const { dir, key, crt } = makeCert();
  try {
    const msg = {
      Type: 'SubscriptionConfirmation', MessageId: 'm1', TopicArn: PERMIT_ARN,
      Message: 'hello', Timestamp: '2026-09-01T00:00:00.000Z', Token: 'tok',
      SubscribeURL: 'https://sns.eu-west-2.amazonaws.com/?Action=ConfirmSubscription',
    };
    const canonical = canonicalString(msg);
    const payload = path.join(dir, 'payload.txt');
    fs.writeFileSync(payload, canonical, 'utf8');

    for (const [sigAlg, hash] of [['-sha1', 'SHA-1'], ['-sha256', 'SHA-256']]) {
      const sigFile = path.join(dir, `sig${hash}.bin`);
      execFileSync('openssl', ['dgst', sigAlg, '-sign', key, '-out', sigFile, payload], { stdio: 'ignore' });

      const spki = spkiFromCertificate(fs.readFileSync(crt, 'utf8'));
      const pubKey = await crypto.subtle.importKey(
        'spki', spki, { name: 'RSASSA-PKCS1-v1_5', hash }, false, ['verify']);
      const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pubKey,
        fs.readFileSync(sigFile), new TextEncoder().encode(canonical));
      assert.equal(ok, true, `${hash} signature should verify`);

      // And a tampered message must NOT verify.
      const tampered = canonicalString({ ...msg, Message: 'goodbye' });
      const bad = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pubKey,
        fs.readFileSync(sigFile), new TextEncoder().encode(tampered));
      assert.equal(bad, false, `${hash} must reject a tampered message`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/* ------------------------------------------------------- the Dorset filter */

test('the authority filter keeps ours and drops the rest', () => {
  for (const a of ['Bournemouth, Christchurch and Poole Council', 'BCP Council',
                   'Dorset Council', 'POOLE BOROUGH', 'christchurch']) {
    assert.ok(OURS.test(a), a);
  }
  for (const a of ['Hampshire County Council', 'Southampton City Council',
                   'Transport for London', 'Devon County Council', '']) {
    assert.ok(!OURS.test(a), a);
  }
});

test('the three real topics are recognised and nothing else is', () => {
  assert.deepEqual(Object.values(TOPICS).sort(), ['activity', 'permit', 'section58']);
  for (const arn of Object.keys(TOPICS)) assert.ok(arn.startsWith('arn:aws:sns:eu-west-2:287813576808:'));
  assert.equal(TOPICS['arn:aws:sns:eu-west-2:287813576808:prod-permit-topic'], 'permit');
  assert.equal(TOPICS['arn:aws:sns:us-east-1:287813576808:prod-permit-topic'], undefined);
});

/* ------------------------------------------------------------------ health */

test('health separates "nothing arrived" from "everything was filtered"', async () => {
  const env = envWith();
  const res = await worker.fetch(new Request('https://w.example/health?token=read-token'), env);
  const body = await res.json();
  assert.equal(body.ok, true);
  for (const k of ['seen', 'stored', 'filteredOut', 'confirmed', 'unverified', 'wrongTopic']) {
    assert.equal(body.counts[k], 0, `${k} should start at 0`);
  }
  assert.equal(body.lastConfirm, null);
  assert.deepEqual(body.authorities, {});
  assert.match(body.note, /handshake/i);
});

test('the source carries no control characters', () => {
  // A NUL byte crept into this file once and cost an afternoon: it terminates
  // the string when the file is pasted into the Cloudflare editor, so the
  // paste truncated at exactly that character every time and the deploy was
  // silently a fifth of the file. Nothing in JavaScript source needs a control
  // character, so the cheapest guard is to forbid them outright.
  const src = fs.readFileSync(new URL('./street-manager-worker.js', import.meta.url), 'utf8');
  const bad = [];
  for (let i = 0; i < src.length; i++) {
    const c = src.charCodeAt(i);
    if (c < 9 || (c > 13 && c < 32)) bad.push({ index: i, code: '0x' + c.toString(16) });
  }
  assert.deepEqual(bad, [], `control characters found: ${JSON.stringify(bad.slice(0, 5))}`);
});
