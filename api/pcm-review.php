<?php
/**
 * 365 Techies - post-visit Google-review email (OUR replacement for SimplyBook's
 * built-in feedback email).
 *
 * WHY: SimplyBook's feedback email can only be edited in their admin UI and links
 * customers to SimplyBook's own review page. This file replaces it end-to-end:
 * pcm-sb-callback.php records every booking into a queue here, and ~1 day after
 * the appointment ends we send OUR email - Google review link only, our wording,
 * editable in git in seconds.
 *
 * SAFE MODE: $RV_LIVE = false suppresses ALL customer sends (the queue still
 * builds; entries stay askable for 14 days after each visit).
 *
 * GO-LIVE CHECKLIST (before flipping $RV_LIVE to true):
 *  1. Switch OFF SimplyBook's own feedback email (Settings -> Email and SMS),
 *     or customers get two review asks.
 *  2. Verify deliverability at an EXTERNAL mailbox (Gmail), not just info@ -
 *     info@ is hosted on the same server, so local delivery can hide SPF/DKIM
 *     failures. Check Authentication-Results: dkim=pass + aligned spf.
 *     (SiteGround SPF/DKIM/DMARC setup is an open owner TODO - do it first.)
 *  3. Booking intake: confirm the SimplyBook form offers a marketing opt-out
 *     line (PECR soft opt-in requires an opt-out chance at collection time).
 *  4. House habit: always CANCEL no-shows / phone-cancellations in SimplyBook -
 *     the webhook then suppresses their email automatically.
 *  5. Opt-out replies ("no thanks" to info@): action them the same day via the
 *     ?optout action below (or just ask Claude to do it).
 *
 * HTTP modes (when this file is the entry script; when included by the callback
 * with RV_LIB defined, only the functions load):
 *   ?run=1                - process the due queue now. Unauthenticated BY DESIGN:
 *                           idempotent (per-entry state machine under an exclusive
 *                           lock, per-run cap, 60s min interval, 9am-8pm window),
 *                           so the worst an abuser achieves is doing the daily
 *                           cron's work early. Anonymous callers get {"ok":true}
 *                           only; add &s=<admin pass> for the detailed stats.
 *   ?test=1               - send the exact customer email to OUR OWN inbox
 *                           (hardcoded to info@365techies.co.uk - the target is
 *                           never caller-choosable). Rate-limited 1 per 10 min.
 *   ?optout=<email>&s=<admin pass>          - suppress an address (a "no thanks"
 *   ?optout=<email>&undo=1&s=<admin pass>     reply); undo re-allows it.
 *
 * Server-only data (gitignored + htaccess-denied): api/pcm-reviewq.json
 * Mail transport: api/pcm-smtp.php if configured (same sender as the portal
 * sign-in codes), else PHP mail() with an explicit -f envelope sender.
 */

$RV_LIVE = false;   // <-- flip to true ONLY after the GO-LIVE CHECKLIST above

$RV_Q = __DIR__ . '/pcm-reviewq.json';
$RV_ASK_WINDOW = 1209600;   // visits stay askable for 14 days after they end; older = too late

if (!function_exists('rvq_open')) {

date_default_timezone_set('Europe/London');   // SimplyBook datetimes are company-local

// ---- queue file: same lock + tmp-rename discipline as pcm-data.json ----
function rvq_open() {
    global $RV_Q;
    $lk = @fopen($RV_Q . '.lock', 'c');
    if (!$lk || !@flock($lk, LOCK_EX)) return array(null, null);
    $q = array();
    if (file_exists($RV_Q)) {
        $raw = (string)@file_get_contents($RV_Q);
        if ($raw !== '') {
            $q = json_decode($raw, true);
            // refuse-to-wipe: a file we can't parse must never be replaced with an
            // empty queue (that would destroy the opt-out list) - bail out instead
            if (!is_array($q)) { @flock($lk, LOCK_UN); @fclose($lk); return array(null, null); }
        }
    }
    if (!isset($q['q']) || !is_array($q['q'])) $q['q'] = array();
    if (!isset($q['last']) || !is_array($q['last'])) $q['last'] = array();
    if (!isset($q['optout']) || !is_array($q['optout'])) $q['optout'] = array();
    return array($lk, $q);
}
function rvq_save($q) {
    global $RV_Q;
    // json_encode returns FALSE on invalid UTF-8 - and false would coerce to '' and
    // silently WIPE the queue (including the opt-out list). Substitute bad bytes if
    // the flag exists, and refuse to write at all rather than write an empty file.
    $flags = defined('JSON_INVALID_UTF8_SUBSTITUTE') ? JSON_INVALID_UTF8_SUBSTITUTE : 0;
    $j = json_encode($q, $flags);
    if ($j === false || $j === '') return;
    $tmp = $RV_Q . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, $j, LOCK_EX) !== false) @rename($tmp, $RV_Q);
}
function rvq_close($lk) { if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); } }

// UTF-8-safe 60-char name truncation: a raw byte substr can cut a multibyte
// character in half, and one bad byte would poison json_encode for the whole queue.
function rv_clean_name($name) {
    $nm = trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', (string)$name));
    if (function_exists('mb_substr')) return mb_substr($nm, 0, 60, 'UTF-8');
    if (strlen($nm) <= 60) return $nm;                // nothing cut - nothing to repair
    $nm = substr($nm, 0, 60);
    $nm = preg_replace('/[\x80-\xBF]+$/', '', $nm);   // dangling continuation bytes
    $nm = preg_replace('/[\xC0-\xFF]$/', '', $nm);    // dangling lead byte
    return $nm;
}

// ---- called by pcm-sb-callback.php on every booking create/change/cancel ----
// $endTs = unix time the appointment ENDS (0 = unknown). Cancel marks the entry so
// a cancelled visit never gets a "how did we do?" email.
function rv_record($bid, $email, $name, $endTs, $type) {
    global $RV_ASK_WINDOW;
    $bid = preg_replace('/[^0-9]/', '', (string)$bid);
    $email = strtolower(trim((string)$email));
    if ($bid === '' || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) return;
    list($lk, $q) = rvq_open();
    if (!$lk) return;
    // prune on BOTH stamps (a far-advance booking's created stamp ages long before
    // its visit happens - keying the prune on ts alone would delete it early)
    foreach ($q['q'] as $k => $v) {
        $age = max((isset($v['ts']) ? $v['ts'] : 0), (isset($v['end']) ? $v['end'] : 0));
        if ($age < time() - 7776000) unset($q['q'][$k]);
    }
    foreach ($q['last'] as $k => $v) if ($v < time() - 5184000) unset($q['last'][$k]);
    $cur = isset($q['q'][$bid]) ? $q['q'][$bid] : null;
    if ($type === 'cancel') {
        if ($cur && (!isset($cur['st']) || $cur['st'] !== 'sent')) { $q['q'][$bid]['st'] = 'cancelled'; rvq_save($q); }
    } else {
        // never resurrect an already-handled entry (a late "change"/duplicate webhook
        // after we emailed, cancelled, or superseded it), and never (re)create an entry
        // whose visit already ended outside the ask window (an admin editing an OLD
        // booking months later must not trigger a "thanks for having us" email).
        $lateEnd = ($endTs > 0 && $endTs < time() - $RV_ASK_WINDOW);
        $protected = $cur && in_array((isset($cur['st']) ? $cur['st'] : ''), array('sent', 'sending', 'cancelled', 'skipped'), true);
        if (!$lateEnd && (!$cur || !$protected)) {
            $q['q'][$bid] = array(
                'em' => $email,
                'nm' => rv_clean_name($name),
                'end' => (int)$endTs,
                'ts' => ($cur && isset($cur['ts'])) ? $cur['ts'] : time(),   // keep original created stamp
                'st' => 'pending',
                'tries' => ($cur && isset($cur['tries'])) ? $cur['tries'] : 0,
            );
            rvq_save($q);
        }
    }
    rvq_close($lk);
}

// ---- the email itself (ONE place to edit wording) ----
function rv_first($name) {
    $t = trim((string)$name);
    $parts = ($t === '') ? array('') : preg_split('/\s+/', $t);
    $t = preg_replace("/[^A-Za-z'\\-]/", '', $parts[0]);
    if ($t === '' || strlen($t) > 20) return 'there';
    return strtoupper($t[0]) . substr($t, 1);
}
function rv_subject() { return 'How did we do? (30 seconds, genuinely)'; }
function rv_body($first) {
    // Wording rules (do not regress): the review ask is UNCONDITIONAL - no "if
    // you're happy" steering (Google policy bans selectively soliciting positive
    // reviews), no incentives (unlawful, UK DMCC Act). Service recovery comes
    // AFTER the ask. Opener says "booking us in", not "having us in" - it must
    // read honestly even for a no-show we didn't hear about.
    return 'Hi ' . $first . ",\r\n\r\n"
    . "Thanks for booking us in recently - we hope everything is running exactly\r\n"
    . "as it should be.\r\n\r\n"
    . "Would you leave us a quick Google review? Honest feedback takes about 30\r\n"
    . "seconds, every single one gets read by us, and it's how other local people\r\n"
    . "find a firm they can trust:\r\n\r\n"
    . "https://search.google.com/local/writereview?placeid=ChIJlTb8YRuic0gRCRczduB8OFI\r\n\r\n"
    . "And if anything wasn't right, please just reply to this email or call\r\n"
    . "01202 775566 and we'll sort it - we'd always rather hear it from you\r\n"
    . "first.\r\n\r\n"
    . "Thanks again,\r\n"
    . "Steve & David\r\n"
    . "365 Techies - family-run IT support in Bournemouth since 1995\r\n"
    . "01202 775566 - https://365techies.co.uk\r\n\r\n"
    . "P.S. We've rebuilt our website, and it's full of free tools you can use\r\n"
    . "any time: test your WiFi room by room, check any website's health, and\r\n"
    . "see your bookings and reports in your own customer portal:\r\n"
    . "https://365techies.co.uk\r\n\r\n"
    . "(Prefer not to get the occasional follow-up like this? Just reply\r\n"
    . "\"no thanks\" and we'll switch them off.)\r\n";
}

// ---- transport: authenticated SMTP if api/pcm-smtp.php is configured, else mail().
// Same minimal implicit-TLS client as the portal sign-in codes (port 465 only).
function rv_send($to, $first) {
    $to = strtolower(trim((string)$to));
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
    $subject = rv_subject();
    $body = rv_body(rv_first($first));
    $cfg = __DIR__ . '/pcm-smtp.php';
    if (is_readable($cfg)) {
        include $cfg;
        if (!empty($SMTP_HOST) && !empty($SMTP_USER) && !empty($SMTP_PASS)) {
            $env = !empty($SMTP_FROM) ? $SMTP_FROM : $SMTP_USER;   // envelope sender
            $port = !empty($SMTP_PORT) ? intval($SMTP_PORT) : 465;
            $fp = @stream_socket_client('ssl://' . $SMTP_HOST . ':' . $port, $en, $es, 8);
            if ($fp) {
                stream_set_timeout($fp, 10);
                $dead = false;
                $say = function($cmd) use ($fp, &$dead) {
                    if ($dead) return '';
                    if ($cmd !== null) fwrite($fp, $cmd . "\r\n");
                    $line = ''; $n = 0;
                    while (($l = fgets($fp, 512)) !== false) {
                        $md = stream_get_meta_data($fp);
                        if (!empty($md['timed_out'])) { $dead = true; return ''; }
                        $line = $l;
                        if (strlen($l) < 4 || $l[3] !== '-') break;
                        if (++$n > 50) break;
                    }
                    $md = stream_get_meta_data($fp);
                    if (!empty($md['timed_out'])) { $dead = true; return ''; }
                    return $line;
                };
                $ok = true;
                $say(null);
                $ok = $ok && strpos($say('EHLO 365techies.co.uk'), '250') === 0;
                $ok = $ok && strpos($say('AUTH LOGIN'), '334') === 0;
                $ok = $ok && strpos($say(base64_encode($SMTP_USER)), '334') === 0;
                $ok = $ok && strpos($say(base64_encode($SMTP_PASS)), '235') === 0;
                $ok = $ok && strpos($say('MAIL FROM:<' . $env . '>'), '250') === 0;
                $ok = $ok && strpos($say('RCPT TO:<' . $to . '>'), '250') === 0;
                $ok = $ok && strpos($say('DATA'), '354') === 0;
                if ($ok) {
                    $msg = 'Date: ' . date('r') . "\r\n"
                         . 'Message-ID: <' . bin2hex(random_bytes(8)) . '.' . time() . "@365techies.co.uk>\r\n"
                         . 'From: 365 Techies <info@365techies.co.uk>' . "\r\n"
                         . 'Reply-To: 365 Techies <info@365techies.co.uk>' . "\r\n"
                         . 'To: <' . $to . ">\r\n"
                         . 'Subject: ' . $subject . "\r\n"
                         . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n"
                         . preg_replace('/^\./m', '..', $body) . "\r\n.";   // dot-stuffing per RFC 5321
                    $ok = strpos($say($msg), '250') === 0;
                }
                if (!$dead) @fwrite($fp, "QUIT\r\n");
                fclose($fp);
                if ($ok) return true;
            }
        }
    }
    // -f pins the ENVELOPE sender to our domain: without it Return-Path defaults to
    // the hosting account, SPF authenticates the wrong domain, and DMARC alignment
    // then hangs entirely on DKIM.
    $hdr = "From: 365 Techies <info@365techies.co.uk>\r\nReply-To: info@365techies.co.uk\r\nContent-Type: text/plain; charset=UTF-8";
    return @mail($to, $subject, $body, $hdr, '-finfo@365techies.co.uk');
}

// ---- queue processor. Sends entries whose appointment ended >24h ago. ----
// Returns a small stats array. Never throws; safe to call from the callback.
function rv_process($cap = 5) {
    global $RV_LIVE, $RV_ASK_WINDOW;
    $h = (int)date('G');
    if ($h < 9 || $h >= 20) return array('skip' => 'quiet_hours');   // no 3am review asks
    list($lk, $q) = rvq_open();
    if (!$lk) return array('skip' => 'locked');
    if ((isset($q['run_ts']) ? $q['run_ts'] : 0) > time() - 60) { rvq_close($lk); return array('skip' => 'ran_recently'); }
    $q['run_ts'] = time();

    $picked = array(); $batchEm = array(); $due = 0;
    foreach ($q['q'] as $bid => $e) {
        $st = isset($e['st']) ? $e['st'] : '';
        $retryable = ($st === 'sending' && (isset($e['snd_ts']) ? $e['snd_ts'] : 0) < time() - 600
                      && (isset($e['tries']) ? $e['tries'] : 0) < 3);   // a crashed send, not a live one
        if ($st !== 'pending' && !$retryable) continue;
        $end = isset($e['end']) ? (int)$e['end'] : 0;
        if ($end <= 0 || time() < $end + 86400) continue;              // not due yet
        if ($end < time() - $RV_ASK_WINDOW) continue;                  // visit ended >14 days ago: too late to ask
        if ((isset($e['tries']) ? $e['tries'] : 0) >= 3) continue;
        $em = isset($e['em']) ? $e['em'] : '';
        if ($em === '' || !filter_var($em, FILTER_VALIDATE_EMAIL)) continue;
        $eh = sha1($em);
        if (isset($q['optout'][$eh])) continue;                        // they said no thanks
        if ((isset($q['last'][$eh]) ? $q['last'][$eh] : 0) > time() - 1209600) continue;   // asked <14 days ago
        if (isset($batchEm[$eh])) continue;                            // two bookings, one email
        $due++;
        if ($RV_LIVE && count($picked) < $cap) {
            $q['q'][$bid]['st'] = 'sending';
            $q['q'][$bid]['snd_ts'] = time();
            $q['q'][$bid]['tries'] = (isset($e['tries']) ? $e['tries'] : 0) + 1;
            // provisional dedupe stamp UNDER THE LOCK: a second overlapping run must not
            // pick this email again while our send is in flight (removed again on failure)
            $prov = time();
            $q['last'][$eh] = $prov;
            $picked[$bid] = array('em' => $em, 'nm' => isset($e['nm']) ? $e['nm'] : '', 'eh' => $eh, 'prov' => $prov);
            $batchEm[$eh] = true;
        }
    }
    rvq_save($q);
    rvq_close($lk);   // NEVER hold the lock across slow SMTP

    if (!$RV_LIVE) return array('mode' => 'safe', 'due_waiting' => $due, 'sent' => 0);

    $sent = 0; $failed = 0;
    foreach ($picked as $bid => $p) {
        $ok = rv_send($p['em'], $p['nm']);
        list($lk2, $q2) = rvq_open();
        if (!$lk2) continue;
        // only transition if still 'sending': a cancel webhook that landed during the
        // unlocked SMTP window must WIN on the failure path (never resurrect to pending)
        if (isset($q2['q'][$bid]) && (isset($q2['q'][$bid]['st']) ? $q2['q'][$bid]['st'] : '') === 'sending') {
            if ($ok) {
                $q2['q'][$bid]['st'] = 'sent'; $q2['q'][$bid]['sent_ts'] = time(); $q2['last'][$p['eh']] = time(); $sent++;
                // supersede this customer's OTHER already-ended entries (two visits in one
                // week = one ask; without this the second fires again when the dedupe lapses)
                foreach ($q2['q'] as $bid2 => $e2) {
                    if ($bid2 === $bid) continue;
                    if ((isset($e2['em']) ? $e2['em'] : '') !== $p['em']) continue;
                    $st2 = isset($e2['st']) ? $e2['st'] : '';
                    if (($st2 === 'pending' || $st2 === 'sending') && (isset($e2['end']) ? (int)$e2['end'] : 0) <= time())
                        $q2['q'][$bid2]['st'] = 'skipped';
                }
            } else {
                $q2['q'][$bid]['st'] = ((isset($q2['q'][$bid]['tries']) ? $q2['q'][$bid]['tries'] : 1) >= 3) ? 'failed' : 'pending';
                // release OUR provisional dedupe stamp so the retry isn't blocked for 14
                // days (only if it's still ours - a real send may have stamped since)
                if ((isset($q2['last'][$p['eh']]) ? $q2['last'][$p['eh']] : 0) === $p['prov']) unset($q2['last'][$p['eh']]);
                $failed++;
            }
        } elseif ($ok && isset($q2['q'][$bid])) {
            // sent but state changed underneath us (e.g. cancelled mid-send): the mail
            // already went, so record that truthfully and stamp the dedupe anyway
            $q2['q'][$bid]['st'] = 'sent'; $q2['q'][$bid]['sent_ts'] = time(); $q2['last'][$p['eh']] = time(); $sent++;
        }
        rvq_save($q2);
        rvq_close($lk2);
    }
    return array('mode' => 'live', 'due' => $due, 'sent' => $sent, 'failed' => $failed);
}

} // function_exists guard

// ---------------------------------------------------------------- HTTP entry
if (!defined('RV_LIB')) {
    header('Content-Type: application/json; charset=utf-8');
    header('X-Robots-Tag: noindex, nofollow');
    header('Cache-Control: no-store');

    // admin pass (same secret as the PCM admin console) unlocks detail + optout
    $rv_admin = false;
    $rv_s = isset($_POST['s']) ? (string)$_POST['s'] : (isset($_GET['s']) ? (string)$_GET['s'] : '');
    if ($rv_s !== '' && is_readable(__DIR__ . '/pcm-admin-secret.php')) {
        require __DIR__ . '/pcm-admin-secret.php';   // $PCM_ADMIN_PASS
        if (!empty($PCM_ADMIN_PASS) && hash_equals($PCM_ADMIN_PASS, $rv_s)) $rv_admin = true;
    }

    if (isset($_GET['optout'])) {
        if (!$rv_admin) { http_response_code(403); echo json_encode(array('ok' => false, 'error' => 'denied')); exit; }
        $em = strtolower(trim((string)$_GET['optout']));
        if (!filter_var($em, FILTER_VALIDATE_EMAIL)) { echo json_encode(array('ok' => false, 'error' => 'bad_email')); exit; }
        list($lk, $q) = rvq_open();
        if (!$lk) { echo json_encode(array('ok' => false, 'error' => 'locked')); exit; }
        if (isset($_GET['undo'])) unset($q['optout'][sha1($em)]);
        else $q['optout'][sha1($em)] = time();
        rvq_save($q);
        rvq_close($lk);
        echo json_encode(array('ok' => true, 'optout' => !isset($_GET['undo']))); exit;
    }

    if (isset($_GET['test'])) {
        // exact customer email, to OUR OWN inbox only - never a caller-supplied address
        list($lk, $q) = rvq_open();
        if (!$lk) { echo json_encode(array('ok' => false, 'error' => 'locked')); exit; }
        if ((isset($q['test_ts']) ? $q['test_ts'] : 0) > time() - 600) {
            $wait = 600 - (time() - $q['test_ts']);
            rvq_close($lk);
            echo json_encode(array('ok' => false, 'error' => 'throttled', 'retry_in_s' => $wait)); exit;
        }
        $q['test_ts'] = time();
        rvq_save($q);
        rvq_close($lk);
        $ok = rv_send('info@365techies.co.uk', 'Steve');
        echo json_encode(array('ok' => (bool)$ok, 'mode' => 'test', 'to' => 'info@365techies.co.uk',
                               'note' => $ok ? 'check the inbox (and spam folder on first send)' : 'send failed - check server mail config'));
        exit;
    }

    if (isset($_GET['run'])) {
        $r = rv_process(5);
        // anonymous callers (the cron) learn nothing; the admin pass unlocks the stats
        if ($rv_admin) echo json_encode(array('ok' => true, 'mode' => 'run', 'live' => (bool)$GLOBALS['RV_LIVE'], 'result' => $r));
        else echo json_encode(array('ok' => true));
        exit;
    }

    echo json_encode($rv_admin
        ? array('ok' => true, 'service' => '365 Techies review mail', 'live' => (bool)$GLOBALS['RV_LIVE'])
        : array('ok' => true));
}
