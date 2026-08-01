<?php
/**
 * Abandoned-booking visibility.
 *
 * THE BLIND SPOT THIS FILLS. The booking page asks for name, email and phone,
 * then emails a 6-digit code to prove the inbox. Until now the `join` call sent
 * ONLY the email - so a customer who picked a slot, typed their details and then
 * never found the code was completely invisible. No name, no number, no trace,
 * no way to ring them back. They are the warmest lead the site produces and they
 * fell through the floor.
 *
 * Now `join` parks the details here, a completed booking clears them, and
 * anything still sitting here after BKPEND_AGE gets one Slack line so somebody
 * can pick up the phone.
 *
 * ⚠️ THREE THINGS THAT WILL BITE:
 *
 * 1. The phone arrives as `bk_phone`, NEVER as `mobile`. pcm-booking.php's join
 *    handler treats `mobile` as an SMS destination and has a careful pile of
 *    rules stopping a stranger texting a code to a number they chose. Feeding a
 *    typed number into that field would hand out account takeovers. This value
 *    is for a HUMAN to ring back and is never texted by anything.
 *
 * 2. pcm-bkpend.json MUST be in the root .htaccess deny list. It holds a real
 *    person's name, email and phone. pcm-bkpoll-cache.json was found publicly
 *    readable on 2026-07-27 because it was never added. Check with a BROWSER
 *    fetch - scripted curl gets 202 from the bot wall and hides a real 200.
 *
 * 3. This file is included from tm-cron.php, which runs as CLI. Nothing here may
 *    echo, set a header, or exit.
 *
 * Retention is deliberately short: 24 hours, then the record is gone. It exists
 * to enable a callback the same day, not to build a shadow CRM.
 *
 * (pcm-booking.php has its own pcm_slack_say(). It is not reused here because
 * requiring that 2,400-line router from a cron would run its top-level setup for
 * the sake of one function. The webhook read below is the same four lines.)
 */

if (!defined('BKPEND_AGE')) {
    // How long a half-finished booking sits before it is worth a nudge. Long
    // enough that someone reading their email in another tab is not reported;
    // short enough to ring back while they still want the appointment.
    define('BKPEND_AGE', 25 * 60);
}
if (!defined('BKPEND_TTL')) define('BKPEND_TTL', 24 * 3600);

function bkpend_file() { return __DIR__ . '/pcm-bkpend.json'; }

function bkpend_load() {
    $f = bkpend_file();
    $c = file_exists($f) ? json_decode((string)@file_get_contents($f), true) : null;
    return is_array($c) ? $c : array();
}

function bkpend_save($c) {
    $f = bkpend_file();
    $tmp = $f . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($c), LOCK_EX) !== false) @rename($tmp, $f);
}

/** Strip anything that would break a Slack line or smuggle markup into it. */
function bkpend_clean($s, $max = 80) {
    $s = preg_replace('/[\x00-\x1f\x7f]+/u', ' ', (string)$s);
    $s = trim(preg_replace('/\s+/u', ' ', $s));
    if (function_exists('mb_substr')) $s = mb_substr($s, 0, $max, 'UTF-8');
    else $s = substr($s, 0, $max);
    return str_replace(array('<', '>', '`'), array('', '', "'"), $s);
}

/**
 * Called when a booking code goes out.
 *
 * ⚠️ NEVER blanks a field it already has. The "send it again" button re-posts
 * `join`, and an empty name or phone arriving second must not wipe the good one
 * captured first - the person clicking resend is the likeliest in the funnel to
 * give up, so that record is the one that matters most. `ts` is NOT refreshed
 * either: the clock runs from when they first asked, not from their last
 * frustrated click, or a customer stabbing resend would never age into a nudge.
 */
function bkpend_add($email, $name, $phone, $extra = array()) {
    $email = strtolower(trim((string)$email));
    if ($email === '') return;
    $c = bkpend_load();
    $k = sha1($email);
    $had = isset($c[$k]) ? $c[$k] : array();

    $keep = function ($new, $key, $max) use ($had) {
        $new = bkpend_clean($new, $max);
        if ($new !== '') return $new;
        return isset($had[$key]) ? (string)$had[$key] : '';
    };

    $c[$k] = array(
        'email' => bkpend_clean($email, 120),
        'name'  => $keep($name, 'name', 80),
        'phone' => $keep($phone, 'phone', 32),
        'what'  => $keep(isset($extra['what']) ? $extra['what'] : '', 'what', 120),
        'when'  => $keep(isset($extra['when']) ? $extra['when'] : '', 'when', 60),
        'ts'    => isset($had['ts']) ? $had['ts'] : time(),
        'told'  => isset($had['told']) ? $had['told'] : 0,
    );
    bkpend_save(bkpend_prune($c));
}

/** Called the moment a booking actually completes. */
function bkpend_clear($email) {
    $email = strtolower(trim((string)$email));
    if ($email === '') return;
    $c = bkpend_load();
    if (isset($c[sha1($email)])) { unset($c[sha1($email)]); bkpend_save($c); }
}

function bkpend_prune($c) {
    $cut = time() - BKPEND_TTL;
    foreach ($c as $k => $v) {
        if (!isset($v['ts']) || $v['ts'] < $cut) unset($c[$k]);
    }
    return $c;
}

function bkpend_webhook() {
    $f = __DIR__ . '/slack-webhook.php';
    if (!file_exists($f)) return '';
    $raw = (string)@file_get_contents($f);
    // read the URL out by pattern - never require() a secrets file
    if (preg_match('#https://hooks\.slack\.com/\S+#', $raw, $m)) return rtrim(trim($m[0]), "';\"");
    return '';
}

function bkpend_say($text) {
    $wh = bkpend_webhook();
    if ($wh === '') return false;
    $ch = @curl_init($wh);
    if (!$ch) return false;
    @curl_setopt_array($ch, array(
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(array('text' => $text)),
        CURLOPT_HTTPHEADER => array('Content-Type: application/json'),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
    ));
    $ok = @curl_exec($ch) !== false;
    @curl_close($ch);
    return $ok;
}

/**
 * Report anything half-finished and older than BKPEND_AGE. Idempotent: each
 * record is reported once, then kept (silent) until it ages out, so a customer
 * who genuinely walked away is not re-reported every 15 minutes.
 */
function bkpend_sweep($sender = null) {
    // $sender is injectable so the behaviour can be TESTED without a live Slack
    // webhook. A sweep nobody has watched select the right records is a sweep
    // that quietly reports nothing forever.
    if ($sender === null) $sender = 'bkpend_say';

    $lk = @fopen(__DIR__ . '/pcm-bkpend.lock', 'c');
    if (!$lk || !@flock($lk, LOCK_EX | LOCK_NB)) return array('told' => 0, 'busy' => true);

    $c = bkpend_prune(bkpend_load());
    $now = time();
    $told = 0;
    foreach ($c as $k => $v) {
        if (!empty($v['told'])) continue;
        if ($now - $v['ts'] < BKPEND_AGE) continue;

        $mins = (int)round(($now - $v['ts']) / 60);
        $who  = $v['name'] !== '' ? $v['name'] : $v['email'];
        $msg  = ":telephone_receiver: *Booking started but never finished* - " . $who
              . ($v['phone'] !== '' ? " on *" . $v['phone'] . "*" : " (no phone given)")
              . "\n> " . $v['email']
              . ($v['what'] !== '' ? " - wanted: " . $v['what'] : "")
              . ($v['when'] !== '' ? " - slot: " . $v['when'] : "")
              . "\n> Sent a code " . $mins . " min ago and never came back. Worth a ring.";

        if (call_user_func($sender, $msg)) { $c[$k]['told'] = 1; $told++; }
    }
    bkpend_save($c);

    /* Proof of life. Written HERE rather than in tm-cron.php because that file
       writes its heartbeat only after its SMS gate, so a sweep that ran while
       SMS was unconfigured would leave no evidence at all - and "ran fine,
       found nothing" and "never ran" would look identical. That is exactly how
       the portal freshness beacon did nothing for a month. */
    $beat = __DIR__ . '/pcm-bkpend-beat.json';
    $tmp  = $beat . '.tmp';
    if (@file_put_contents($tmp, json_encode(array(
            't' => time(), 'at' => date('Y-m-d H:i'),
            'told' => $told, 'pending' => count($c),
            'via' => (php_sapi_name() === 'cli' ? 'cron' : 'http')))) !== false) {
        @rename($tmp, $beat);
    }

    @flock($lk, LOCK_UN); @fclose($lk);
    return array('told' => $told, 'pending' => count($c));
}
