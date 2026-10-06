<?php
/*
 * Automatic "we have your request" reply for the two enquiries that sell (6 Oct 2026).
 *
 * WHY: the 6 Oct funnel check found two Dell buyers chasing - one after six days and two voicemails asking
 * "are you still trading?", one who sent his request again five days later. Owner: "help with ... the auto
 * acknowledgement as well ... do the whole lot". So a Dell quote (the picker, the refurbished-laptop finder,
 * the contact form's "refurbished Dell" topic) and a Virgin email-move ring-me-back get one short reply that
 * says it reached us and when we will be in touch. It is a SERVICE message to someone who has just asked us to
 * contact them (PECR: fine), never marketing: no offer, no link to anything but our phone numbers.
 *
 * HOW: slack-lead.php (the form relay) only QUEUES, after its Slack post succeeds - a fault here can never stop a
 * lead reaching Slack. pcm-bkpoll.php (the 5-minute cron, the same place the portal welcome is sent) calls
 * ack_flush(), which sends by email when there is an address (the proven rv_send_raw route, info@, DKIM-aligned)
 * and otherwise by text to a UK mobile (tm_send, with its rate and daily ceilings) between 08:00 and 20:00.
 * One reply per person per 24 hours. A reply that cannot go out within 16 hours is dropped: "thanks, we have
 * it" two days later is worse than nothing. Each send posts one line in #365-job-tracker so the team knows the
 * customer has been told; the lead still needs a call, and the lead reminders still chase it.
 *
 * OFF SWITCH: create api/pcm-ack.off on the server (or set ACK_LIVE false). Queued entries then wait, and expire.
 * STORE: api/pcm-ack.json (+ .lock) - gitignored and .htaccess-denied: it holds names, emails and numbers until
 * sent; a sent entry keeps only a stub.
 * Config is CONSTANTS on purpose: the include-scope trap (pcm-review.php's $RV_Q) cannot bite a constant.
 *
 * NO closing tag in this file.
 */
if (!defined('PCM_ACK_LIB')) {
define('PCM_ACK_LIB', 1);

define('ACK_LIVE', true);
define('ACK_DEDUPE', 86400);          // one reply per person per 24 h
define('ACK_MAX_AGE', 16 * 3600);     // not out within 16 h: drop it
define('ACK_DAY_CAP', 30);            // replies per day, all kinds - a spam run stops here
define('ACK_SMS_FROM_H', 8);          // texts only between 08:00 ...
define('ACK_SMS_TO_H', 20);           // ... and 20:00 UK time
define('ACK_TRIES', 3);

function ack_store() { return defined('ACK_STORE') ? ACK_STORE : __DIR__ . '/pcm-ack.json'; }
function ack_is_off() { return !ACK_LIVE || file_exists(dirname(ack_store()) . '/pcm-ack.off'); }

/* 'dell', 'emailmove' or '' (not one we acknowledge). Service Pass reports and internal tests never are. */
function ack_kind($topic, $message, $page = '') {
    $topic = (string)$topic; $message = (string)$message;
    if (preg_match('/ServicePass|6-weekly service report|\[INTERNAL TEST\]/i', $topic . "\n" . $message . "\n" . $page)) return '';
    if (preg_match('/Virgin email move/i', $topic) || preg_match('/^\s*virgin_addresses\s*:/im', $message)) return 'emailmove';
    if (preg_match('/Dell availability|refurbished Dell/i', $topic) || preg_match('/^\s*(machine|looking_for)\s*:/im', $message)) return 'dell';
    return '';
}

/* A first name we can safely put in a greeting: letters, hyphen, apostrophe; "Mrs Wilson" stays whole. */
function ack_first($name) {
    $n = trim(preg_replace('/\s+/u', ' ', (string)$name));
    $n = preg_replace("/[^\\p{L}\\p{M}' .-]/u", '', $n);
    if ($n === '' || $n === null) return 'there';
    $parts = explode(' ', trim($n));
    $f = $parts[0];
    if (preg_match('/^(mr|mrs|ms|miss|dr)\.?$/i', $f) && isset($parts[1])) $f = $f . ' ' . $parts[1];
    $f = trim($f, " .-'");
    if ($f === '') return 'there';
    return function_exists('mb_substr') ? mb_substr($f, 0, 20) : substr($f, 0, 20);
}

/* "machine: Latitude 5430 · 14in · ..." -> "the Dell Latitude 5430"; else ''. */
function ack_machine($message) {
    if (!preg_match('/^\s*machine\s*:\s*(.+)$/im', (string)$message, $m)) return '';
    $model = trim(preg_split('/\s*(\x{00B7}|\||,)\s*/u', $m[1])[0]);
    $model = preg_replace('/[^A-Za-z0-9 .\-]/', '', $model);
    if ($model === '' || strlen($model) > 40) return '';
    return 'the ' . (stripos($model, 'dell') === 0 ? $model : 'Dell ' . $model);
}

/* A UK mobile as +447xxxxxxxxx, or '' (landlines cannot take a text). */
function ack_mobile($phone) {
    $d = preg_replace('/\D/', '', (string)$phone);
    if (preg_match('/^07\d{9}$/', $d)) return '+44' . substr($d, 1);
    if (preg_match('/^447\d{9}$/', $d)) return '+' . $d;
    return '';
}

/* GSM-safe plain ASCII for a text message (one 160-character part, never the 70-character Unicode kind). */
function ack_ascii($s) {
    $s = (string)$s;
    if (function_exists('iconv')) { $t = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s); if ($t !== false) $s = $t; }
    return preg_replace('/[^A-Za-z0-9 .,\'()\-:]/', '', $s);
}

/* The email: subject, heading, plain text, paragraphs (for the HTML version), the footer line.
   $what = ack_machine() of the enquiry ("the Dell Latitude 5430") or ''. */
function ack_email($kind, $name, $what = '') {
    $first = ack_first($name);
    $talk = 'If you would rather talk now, ring 01202 775566 or text 07520 615332.';
    if ($kind === 'emailmove') {
        $subject = 'We have your email-move request - 365 Techies';
        $heading = 'Thanks - we have your request';
        $p1 = 'Thanks for asking us to move your Virgin Media email. Your request has reached us, and Steve or David will ring you, '
            . 'usually the same working day (Monday to Friday, 9am to 5pm).';
        $legal = 'You are receiving this because you asked us on 365techies.co.uk to move your email. It is the only email this request sends.';
    } else {
        $what = (string)$what;
        $subject = 'We have your Dell request - 365 Techies';
        $heading = 'Thanks - we have your request';
        $p1 = 'Thanks for asking about ' . ($what !== '' ? $what : 'a refurbished Dell') . '. Your request has reached us, and Steve or David '
            . 'will be in touch personally, usually the same working day (Monday to Friday, 9am to 5pm).';
        $legal = 'You are receiving this because you asked us about a refurbished Dell on 365techies.co.uk. It is the only email this request sends.';
    }
    $text = "Hi " . $first . ",\n\n" . $p1 . "\n\n" . $talk . "\n\n"
          . "Steve and David\n365 Techies - family-run IT support in Bournemouth since 1995\n01202 775566 - info@365techies.co.uk\n";
    return array('subject' => $subject, 'heading' => $heading, 'first' => $first, 'paras' => array($p1, $talk),
                 'text' => $text, 'legal' => $legal);
}

/* The text message: one part, plain ASCII, under 160 characters. */
function ack_sms($kind, $name) {
    $first = substr(ack_ascii(ack_first($name)), 0, 15);
    $hi = '365 Techies: thanks' . ($first !== '' && $first !== 'there' ? ' ' . $first : '');
    if ($kind === 'emailmove') return $hi . ', we have your request to move your Virgin email. We will ring you, usually the same working day (Mon-Fri 9-5).';
    return $hi . ', we have your Dell request. Steve or David will be in touch, usually the same working day (Mon-Fri 9-5).';
}

function ack_uk_hour($now) {
    $d = new DateTime('@' . (int)$now);
    $d->setTimezone(new DateTimeZone('Europe/London'));
    return (int)$d->format('G');
}
function ack_uk_day($now) {
    $d = new DateTime('@' . (int)$now);
    $d->setTimezone(new DateTimeZone('Europe/London'));
    return $d->format('Y-m-d');
}

/* ---- the store: lock, read, refuse-to-wipe, atomic write ---- */
function ack_open() {
    $f = ack_store();
    $lk = @fopen($f . '.lock', 'c');
    if (!$lk || !@flock($lk, LOCK_EX)) return array(null, null);
    $s = array();
    if (file_exists($f)) {
        $raw = (string)@file_get_contents($f);
        if ($raw !== '') { $s = json_decode($raw, true); if (!is_array($s)) { @flock($lk, LOCK_UN); @fclose($lk); return array(null, null); } }
    }
    foreach (array('q', 'seen', 'day') as $k) if (!isset($s[$k]) || !is_array($s[$k])) $s[$k] = array();
    return array($lk, $s);
}
function ack_save($s) {
    $f = ack_store();
    $j = json_encode($s);
    if ($j === false || $j === '') return;
    $tmp = $f . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, $j, LOCK_EX) !== false) @rename($tmp, $f);
}
function ack_close($lk) { if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); } }

/* Queue one reply. Returns 'queued', 'dup', 'off', 'not-eligible', 'no-contact' or 'locked'. Called by the form
   relay AFTER its Slack post, inside try/catch: it must never be able to cost us the lead itself. */
function ack_queue($kind, $name, $email, $phone, $message = '', $now = null) {
    $now = $now === null ? time() : (int)$now;
    if (ack_is_off()) return 'off';
    if ($kind !== 'dell' && $kind !== 'emailmove') return 'not-eligible';
    $email = strtolower(trim((string)$email));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $email = '';
    $mobile = ack_mobile($phone);
    if ($email === '' && $mobile === '') return 'no-contact';
    $h = sha1($email !== '' ? $email : $mobile);
    list($lk, $s) = ack_open();
    if (!$lk) return 'locked';
    foreach ($s['seen'] as $k => $t) if ($t < $now - 7 * 86400) unset($s['seen'][$k]);
    foreach ($s['day'] as $k => $n) if ($k < ack_uk_day($now - 7 * 86400)) unset($s['day'][$k]);
    if (isset($s['seen'][$h]) && $s['seen'][$h] > $now - ACK_DEDUPE) { ack_close($lk); return 'dup'; }
    $s['q'][$h . '-' . $now] = array('k' => $kind, 'nm' => substr(trim((string)$name), 0, 80), 'em' => $email, 'mo' => $mobile,
        'mc' => ack_machine($message), 'ts' => $now, 'st' => 'pending', 'tries' => 0);
    $s['seen'][$h] = $now;
    ack_save($s);
    ack_close($lk);
    return 'queued';
}

/* Send what is due. $sendEmail($to, $mail) and $sendSms($to, $text) return true on success; $say($text) posts to
   Slack. All three are callables (names or closures) so the tests can stand in for the real ones. */
function ack_flush($sendEmail, $sendSms = null, $say = null, $now = null, $cap = 5) {
    $now = $now === null ? time() : (int)$now;
    if (ack_is_off()) return array('skip' => 'off');
    list($lk, $s) = ack_open();
    if (!$lk) return array('skip' => 'locked');
    $day = ack_uk_day($now);
    $smsOk = ($h = ack_uk_hour($now)) >= ACK_SMS_FROM_H && $h < ACK_SMS_TO_H;
    $picked = array(); $stale = 0; $waiting = 0;
    foreach ($s['q'] as $id => $e) {
        $st = isset($e['st']) ? $e['st'] : '';
        $stuck = ($st === 'sending' && (isset($e['snd']) ? $e['snd'] : 0) < $now - 600);
        if ($st !== 'pending' && !$stuck) continue;
        if ((int)$e['ts'] < $now - ACK_MAX_AGE || (int)$e['tries'] >= ACK_TRIES) {
            $s['q'][$id] = array('st' => ((int)$e['tries'] >= ACK_TRIES ? 'failed' : 'stale'), 'ts' => $now, 'k' => $e['k']);
            if ((int)$e['tries'] >= ACK_TRIES && $say) call_user_func($say, ':warning: Auto-reply could not be sent to ' . ($e['nm'] !== '' ? $e['nm'] : 'an enquirer')
                . ' after ' . ACK_TRIES . ' tries - they have NOT been told we got their request. Give them a ring.');
            $stale++;
            continue;
        }
        $ch = $e['em'] !== '' ? 'email' : (($e['mo'] !== '' && $sendSms) ? 'text' : '');
        if ($ch === '') continue;
        if ($ch === 'text' && !$smsOk) { $waiting++; continue; }   // a text waits for the morning
        if ((isset($s['day'][$day]) ? $s['day'][$day] : 0) + count($picked) >= ACK_DAY_CAP) { $waiting++; continue; }
        if (count($picked) >= $cap) { $waiting++; continue; }
        $s['q'][$id]['st'] = 'sending'; $s['q'][$id]['snd'] = $now; $s['q'][$id]['tries'] = (int)$e['tries'] + 1;
        $picked[$id] = $e + array('ch' => $ch);
    }
    ack_save($s);
    ack_close($lk);                                     // send OUTSIDE the lock

    $sent = 0; $failed = array();
    foreach ($picked as $id => $e) {
        $ok = false;
        try {
            if ($e['ch'] === 'email') $ok = (bool)call_user_func($sendEmail, $e['em'], ack_email($e['k'], $e['nm'], $e['mc']));
            else $ok = (bool)call_user_func($sendSms, $e['mo'], ack_sms($e['k'], $e['nm']));
        } catch (Throwable $x) { $ok = false; }
        if ($ok) {
            $sent++;
            if ($say) call_user_func($say, ':outbox_tray: Auto-reply sent to ' . ($e['nm'] !== '' ? $e['nm'] : 'the enquirer') . ' by ' . $e['ch']
                . ' ("we have your ' . ($e['k'] === 'emailmove' ? 'email-move' : 'Dell') . ' request, usually the same working day"). They still need a call.');
        } else $failed[] = $id;
    }
    if (!$picked) return array('sent' => 0, 'stale' => $stale, 'waiting' => $waiting);

    list($lk2, $s2) = ack_open();                       // re-open to record outcomes
    if ($lk2) {
        foreach ($picked as $id => $e) {
            if (!isset($s2['q'][$id])) continue;
            if (in_array($id, $failed, true)) { $s2['q'][$id]['st'] = 'pending'; continue; }
            $s2['q'][$id] = array('st' => 'sent', 'ts' => $now, 'k' => $e['k'], 'ch' => $e['ch']);   // stub only, no PII
            $s2['day'][$day] = (isset($s2['day'][$day]) ? $s2['day'][$day] : 0) + 1;
        }
        foreach ($s2['q'] as $id => $e) if ($e['st'] !== 'pending' && $e['st'] !== 'sending' && $e['ts'] < $now - 7 * 86400) unset($s2['q'][$id]);
        ack_save($s2);
        ack_close($lk2);
    }
    return array('sent' => $sent, 'failed' => count($failed), 'stale' => $stale, 'waiting' => $waiting);
}

/* ---- the real senders, used by pcm-bkpoll.php. Both need their library loaded at TOP LEVEL by the caller. ---- */
/* The HTML version, in the same chrome as every other 365 email ('' when pcm-review.php is not loaded). */
function ack_email_html($m) {
    if (!function_exists('rv_html_shell') || !function_exists('rv_h_p') || !function_exists('rv_h')) return '';
    $blocks = array(rv_h_p('Hi ' . rv_h($m['first']) . ','));
    foreach ($m['paras'] as $p) $blocks[] = rv_h_p(rv_h($p));
    return rv_html_shell(array('title' => $m['subject'], 'preview' => $m['paras'][0], 'eyebrow' => 'We have your request',
                               'heading' => $m['heading'], 'blocks' => $blocks, 'legal' => $m['legal']));
}
function ack_send_email_rv($to, $m) {
    if (!function_exists('rv_send_raw')) return false;
    return (bool)rv_send_raw($to, $m['subject'], $m['text'], '', '', ack_email_html($m));
}
function ack_send_sms_tm($to, $text) {
    if (!function_exists('tm_send')) return false;
    $r = tm_send($to, $text, 'ack');
    return is_array($r) && !empty($r['ok']);
}

}
