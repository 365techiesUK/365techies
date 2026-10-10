<?php
/*
 * "Tips by email" sign-ups for 365 Techies' own newsletter (10 Oct 2026). Owner: "yes, build the website sign-up box".
 *
 * WHY: Techies One Mail sends 365 Techies' mailings from the owner's PC, and UK law (PECR) says a business mailing
 * only goes to people who agreed. This captures that agreement properly: the visitor ticks nothing pre-ticked, gets
 * a "please confirm" email, and only a press of the button on our page counts (double opt-in). The confirm link opens
 * a page with a button rather than confirming by itself, because email security scanners (Outlook Safe Links, Gmail)
 * open links on their own and would otherwise sign people up who never agreed.
 *
 * WHERE THE LIST LIVES: on the owner's PC, in Techies One Mail's address book, with "Agreed to hear from you"
 * recorded. This server only holds a sign-up until the app collects it (every 15 minutes while it runs), then
 * forgets it; an unconfirmed one is forgotten after 7 days. The store holds names and emails: gitignored AND
 * .htaccess-denied (api-runtime-store-exposure: the sweep finds it by its __DIR__ path below).
 *
 * THE APP'S KEY: the app proves itself with a long random key it keeps (Windows-locked). Only the key's SHA-256 is
 * here (this repo is PUBLIC), so the key itself is in no file on this server and in no commit.
 *
 * Tokens in confirm emails are stored only as their SHA-256 too: a copy of the store can't confirm anyone.
 * Config is CONSTANTS on purpose (the include-scope trap cannot bite a constant). NO closing tag in this file.
 */
if (!defined('T1_SIGNUP_LIB')) {
define('T1_SIGNUP_LIB', 1);

define('SU_KEY_SHA256', 'dedf206a122a215871ce2afd2428217d776a7318a2750179bc8c1e3ea0548b2a');   // sha256 of the key Techies One Mail holds
define('SU_PENDING_DAYS', 7);                   // unconfirmed sign-ups forgotten after this
define('SU_RESEND_GAP', 15 * 60);               // one confirm email per address per 15 minutes
define('SU_PER_IP_HOUR', 5);                    // sign-ups per visitor (by address) per hour
define('SU_PER_HOUR', 60);                      // and for the whole site: a spam run stops here
define('SU_MAX_PENDING', 2000);
define('SU_CONSENT', '2026-10-10: "Yes, please send me 365 Techies\' tips, news and offers by email, about once a month. I can unsubscribe at any time."');
define('SU_PAGE_URL', 'https://365techies.co.uk/api/t1-signup.php');

function su_store() { return defined('SU_STORE') ? SU_STORE : __DIR__ . '/t1-signups.json'; }
function su_rate_file() { return defined('SU_RATE') ? SU_RATE : __DIR__ . '/t1-signup-rate.json'; }

function su_clean($v, $max) {
    $v = trim((string)$v);
    $v = preg_replace('/[^\P{C}]/u', '', $v);   // no control characters (or line breaks) anywhere
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

function su_email_ok($email) {
    return strlen($email) <= 160 && filter_var($email, FILTER_VALIDATE_EMAIL) && !preg_match('/@365techies\.co\.uk$/i', $email);
}

/* Read-change-write under an exclusive lock: $fn(&$db) changes the store; the new version is written to a temp file
   and renamed into place, so a crash mid-write never leaves half a file. Returns what $fn returns. */
function su_with_store($fn) {
    $f = su_store();
    $lock = @fopen($f . '.lock', 'c');
    if ($lock) @flock($lock, LOCK_EX);
    try {
        $db = is_file($f) ? json_decode((string)@file_get_contents($f), true) : null;
        if (!is_array($db) || !isset($db['list']) || !is_array($db['list'])) $db = array('list' => array(), 'collected' => 0);
        $before = json_encode($db);
        $out = $fn($db);
        if (json_encode($db) !== $before) {
            $tmp = $f . '.' . bin2hex(random_bytes(4)) . '.tmp';
            if (@file_put_contents($tmp, json_encode($db, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)) === false || !@rename($tmp, $f)) {
                @unlink($tmp);
                throw new RuntimeException('store');
            }
        }
        return $out;
    } finally {
        if ($lock) { @flock($lock, LOCK_UN); @fclose($lock); }
    }
}

/* Sliding one-hour counters, per visitor (a hash of their address, never the address) and for the whole site. */
function su_rate_ok($ipHash, $now) {
    $f = su_rate_file();
    $fp = @fopen($f, 'c+');
    if (!$fp) return true;
    @flock($fp, LOCK_EX);
    $r = json_decode((string)stream_get_contents($fp), true);
    if (!is_array($r)) $r = array();
    $keep = array();
    foreach ($r as $k => $times) { $t = array_values(array_filter((array)$times, function ($x) use ($now) { return $x > $now - 3600; })); if ($t) $keep[$k] = $t; }
    $all = isset($keep['*']) ? count($keep['*']) : 0;
    $mine = isset($keep[$ipHash]) ? count($keep[$ipHash]) : 0;
    $ok = $all < SU_PER_HOUR && $mine < SU_PER_IP_HOUR;
    if ($ok) { $keep['*'][] = $now; $keep[$ipHash][] = $now; }
    @ftruncate($fp, 0); @rewind($fp); @fwrite($fp, json_encode($keep));
    @flock($fp, LOCK_UN); @fclose($fp);
    return $ok;
}

function su_ip_hash($ip) { return substr(hash('sha256', 'su|' . (string)$ip . '|' . date('Y-m-d')), 0, 16); }

/* A sign-up from the website. Always the same answer whether or not the address is already on the list (no
   "already signed up" oracle). $send($to, $token) sends the confirm email and returns true/false.
   Returns array('ok' => bool, 'error' => ''|'email'|'rate'|'busy'). */
function su_signup($email, $name, $page, $ip, $now, $send) {
    $email = strtolower(su_clean($email, 160));
    $name = su_clean($name, 80);
    $page = su_clean($page, 200);
    if (!su_email_ok($email)) return array('ok' => false, 'error' => 'email');
    if (!su_rate_ok(su_ip_hash($ip), $now)) return array('ok' => false, 'error' => 'rate');
    $token = bin2hex(random_bytes(20));
    $mail = su_with_store(function (&$db) use ($email, $name, $page, $now, $token) {
        $db['list'] = array_values(array_filter($db['list'], function ($e) use ($now) {
            return !($e['status'] === 'pending' && $e['created'] < $now - SU_PENDING_DAYS * 86400);
        }));
        $pending = count(array_filter($db['list'], function ($e) { return $e['status'] === 'pending'; }));
        foreach ($db['list'] as &$e) {
            if ($e['email'] !== $email) continue;
            if ($e['status'] === 'confirmed') return false;                     // already agreed: nothing to send
            if (($e['last_sent'] ?? 0) > $now - SU_RESEND_GAP) return false;   // an email went a moment ago
            $e['token'] = hash('sha256', $token); $e['last_sent'] = $now; $e['sent'] = ($e['sent'] ?? 0) + 1;
            if ($name !== '') $e['name'] = $name;
            return true;
        }
        unset($e);
        if ($pending >= SU_MAX_PENDING) return 'busy';
        $db['list'][] = array('id' => 's' . bin2hex(random_bytes(6)), 'email' => $email, 'name' => $name, 'status' => 'pending',
                              'token' => hash('sha256', $token), 'created' => $now, 'confirmed' => null, 'page' => $page,
                              'consent' => SU_CONSENT, 'last_sent' => $now, 'sent' => 1);
        return true;
    });
    if ($mail === 'busy') return array('ok' => false, 'error' => 'busy');
    if ($mail === true && !$send($email, $token)) return array('ok' => false, 'error' => 'send');
    return array('ok' => true, 'error' => '');
}

/* What a confirm link points at: 'pending' (show the button), 'confirmed' (already done) or 'gone'. */
function su_peek($token, $now) {
    $h = hash('sha256', (string)$token);
    return su_with_store(function (&$db) use ($h, $now) {
        foreach ($db['list'] as $e) {
            if (!hash_equals((string)$e['token'], $h)) continue;
            if ($e['status'] === 'confirmed') return 'confirmed';
            return $e['created'] >= $now - SU_PENDING_DAYS * 86400 ? 'pending' : 'gone';
        }
        return 'gone';
    });
}

/* The button was pressed: this is the agreement. Returns 'confirmed', 'already' or 'gone'. */
function su_confirm($token, $now) {
    $h = hash('sha256', (string)$token);
    return su_with_store(function (&$db) use ($h, $now) {
        foreach ($db['list'] as &$e) {
            if (!hash_equals((string)$e['token'], $h)) continue;
            if ($e['status'] === 'confirmed') return 'already';
            if ($e['created'] < $now - SU_PENDING_DAYS * 86400) return 'gone';
            $e['status'] = 'confirmed'; $e['confirmed'] = $now;
            return 'confirmed';
        }
        return 'gone';
    });
}

function su_key_ok($given) {
    $given = (string)$given;
    return SU_KEY_SHA256 !== '__SU_KEY_SHA256__' && strlen($given) >= 32 && hash_equals(SU_KEY_SHA256, hash('sha256', $given));
}

/* For Techies One Mail: the confirmed sign-ups waiting to be collected (and old unconfirmed ones forgotten). */
function su_collect($now) {
    return su_with_store(function (&$db) use ($now) {
        $out = array();
        foreach ($db['list'] as $i => $e) {
            if ($e['status'] === 'pending' && $e['created'] < $now - SU_PENDING_DAYS * 86400) { unset($db['list'][$i]); continue; }
            if ($e['status'] === 'confirmed') {
                $out[] = array('id' => $e['id'], 'email' => $e['email'], 'name' => $e['name'], 'confirmed' => $e['confirmed'],
                               'signed_up' => $e['created'], 'consent' => $e['consent'], 'page' => $e['page']);
            }
        }
        $db['list'] = array_values($db['list']);
        return $out;
    });
}

/* The app has them safely: they leave this server. Returns how many went. */
function su_ack($ids) {
    $ids = array_flip(array_map('strval', (array)$ids));
    return su_with_store(function (&$db) use ($ids) {
        $n = 0;
        foreach ($db['list'] as $i => $e) {
            if ($e['status'] === 'confirmed' && isset($ids[$e['id']])) { unset($db['list'][$i]); $n++; }
        }
        $db['list'] = array_values($db['list']);
        $db['collected'] = ($db['collected'] ?? 0) + $n;
        return $n;
    });
}

/* The "please confirm" email, in the same look as every other 365 Techies email when pcm-review.php is loaded. */
function su_email_parts($token) {
    $link = SU_PAGE_URL . '?c=' . rawurlencode($token);
    $text = "Hello,\n\nSomeone (we hope you) asked for 365 Techies' tips, news and offers by email on our website.\n\n"
          . "To say yes, open this link and press the button:\n" . $link . "\n\n"
          . "It's about once a month: scams doing the rounds locally, simple fixes, news and offers from us. You can unsubscribe at any time.\n\n"
          . "Didn't ask? Just ignore this email: you won't hear from us, and we'll forget your address in a week.\n\n"
          . "Steve and David\n365 Techies, 01202 775566";
    $html = '';
    if (function_exists('rv_html_shell') && function_exists('rv_h_p') && function_exists('rv_h_cta')) {
        $html = rv_html_shell(array(
            'title' => 'Please confirm: tips by email', 'preview' => 'One click to confirm your tips by email from 365 Techies.',
            'eyebrow' => 'Tips by email', 'heading' => 'Please confirm your email address',
            'blocks' => array(
                rv_h_p('Someone (we hope you) asked for 365 Techies&rsquo; tips, news and offers by email on our website. To say yes, press the button and then <strong>Yes, send me the tips</strong> on the page that opens.'),
                rv_h_cta('Confirm my email address', $link),
                rv_h_p('It&rsquo;s about once a month: scams doing the rounds locally, simple fixes, news and offers from us. You can unsubscribe at any time.'),
                rv_h_note('Didn&rsquo;t ask? Just ignore this email. You won&rsquo;t hear from us, and we&rsquo;ll forget your address in a week.')),
            'legal' => 'You are receiving this one email because this address was entered on 365techies.co.uk.'));
    }
    return array('subject' => 'Please confirm: tips by email from 365 Techies', 'text' => $text, 'html' => $html);
}

/* Needs pcm-review.php loaded first, at TOP-LEVEL scope by the caller (t1-signup.php does it): included from inside a
   function it would silently unset $RV_Q for the whole request (php-include-scope-trap). */
function su_send_confirm($to, $token) {
    if (!function_exists('rv_send_raw')) return false;
    $p = su_email_parts($token);
    return (bool)rv_send_raw($to, $p['subject'], $p['text'], '', '', $p['html']);
}

}
