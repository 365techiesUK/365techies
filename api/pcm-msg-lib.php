<?php
/**
 * Portal messaging - the message store.
 *
 * Shared by pcm-msg.php (customer side, web) and pcm-msg-poll.php (engineer
 * side, CLI cron). One conversation per customer - or per team member, since a
 * company's staff each get their own thread rather than all landing in the
 * director's.
 *
 * ON DISK: api/pcm-msg-<24hex>.json, the per-customer blob pattern from
 * pcm-wifi.php. Deliberately NOT inside pcm-data.json: conversations are chatty
 * and unbounded, and that file is one shared flat file behind one exclusive
 * lock which every app check-in and portal load queues on.
 *
 * Both the file and its .lock/.tmp siblings need a .gitignore line AND an
 * .htaccess deny rule. Only one of the two was in place once before in this
 * project, and a live admin token was publicly readable as a result.
 *
 * INCLUDE-SCOPE NOTE: this file defines FUNCTIONS and CONSTANTS only. It sets
 * no top-level variables that a caller depends on, so it is safe to require
 * from anywhere - unlike pcm-review.php, whose top-level $RV_Q silently became
 * function-local when included from function scope and cost this codebase the
 * entire welcome-email queue.
 */

if (!defined('PCM_MSG_LIB')) {
    define('PCM_MSG_LIB', 1);

define('MSG_MAX_LEN',   2000);   // one message
define('MSG_KEEP',       200);   // messages kept per conversation
define('MSG_PER_HOUR',    30);   // customer messages per hour
define('MSG_SALT_FILE', 'pcm-msg-salt.php');

// The filename must not leak the licence key or the email, because the file
// name is the one part of a blob that tends to end up in logs and directory
// listings. A per-install salt means the mapping cannot be reproduced by
// anyone who guesses a customer's email.
function msg_salt() {
    static $s = null;
    if ($s !== null) return $s;
    $f = __DIR__ . '/' . MSG_SALT_FILE;
    if (file_exists($f)) {
        $raw = (string)@file_get_contents($f);
        if (preg_match('/\$MSG_SALT\s*=\s*[\'"]([a-f0-9]{16,})[\'"]/', $raw, $m)) { $s = $m[1]; return $s; }
    }
    $s = bin2hex(random_bytes(16));
    @file_put_contents($f, "<?php\n// auto-generated; do not edit, do not commit\n\$MSG_SALT = '" . $s . "';\n", LOCK_EX);
    return $s;
}
function msg_id($key, $member = '') {
    return substr(hash('sha256', msg_salt() . '|' . (string)$key . '|' . strtolower((string)$member)), 0, 24);
}
function msg_path($id){ return __DIR__ . '/pcm-msg-' . preg_replace('/[^a-f0-9]/', '', (string)$id) . '.json'; }

// Free text in, plain text out. Control characters go; ordinary punctuation -
// including quotes and apostrophes - STAYS, because this is a human writing a
// sentence and mangling it would be visible to them. Escaping happens on
// output, in the portal, which is where escaping belongs.
function msg_clean($s, $len) {
    if (!is_scalar($s)) return '';
    $s = (string)preg_replace('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/', '', (string)$s);
    if (!mb_check_encoding($s, 'UTF-8')) return '';
    $s = (string)preg_replace('/\r\n?/', "\n", $s);
    $s = (string)preg_replace('/\n{3,}/', "\n\n", $s);
    return trim(mb_substr($s, 0, $len));
}

function msg_blank() {
    return array('v'=>1, 'key'=>'', 'member'=>'', 'name'=>'', 'email'=>'',
                 'thread'=>'', 'cursor'=>'', 'unread'=>0, 'msgs'=>array());
}

// Returns array($box, $lockHandle). ALWAYS msg_close($lockHandle) - and never
// hold it across a network call to Slack.
function msg_open($id) {
    $f = msg_path($id);
    $lk = @fopen($f . '.lock', 'c');
    if ($lk) @flock($lk, LOCK_EX);
    $box = msg_blank();
    if (file_exists($f)) {
        $raw = (string)@file_get_contents($f);
        if ($raw !== '') {
            $d = json_decode($raw, true);
            // A corrupt blob must not be silently replaced with an empty one -
            // that would erase a customer's history. Hand back a blank marked
            // read-only so callers show nothing rather than destroying it.
            if (is_array($d)) { $box = array_merge($box, $d); }
            else { $box['ro'] = 1; }
        }
    }
    if (!is_array($box['msgs'])) $box['msgs'] = array();
    return array($box, $lk);
}
function msg_save($id, $box) {
    if (!empty($box['ro'])) return false;      // never overwrite an unreadable file
    $f = msg_path($id);
    $tmp = $f . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($box, JSON_UNESCAPED_SLASHES), LOCK_EX) === false) return false;
    return @rename($tmp, $f);
}
function msg_close($lk) { if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); } }

function msg_trim(&$box) {
    if (count($box['msgs']) > MSG_KEEP) $box['msgs'] = array_slice($box['msgs'], -MSG_KEEP);
}

// What the portal is allowed to see. 'w' is who: c = the customer, e = us.
// Engineer replies are always attributed to "365 Techies" and never to the
// individual who typed them: the customer is buying a company's attention, and
// naming whichever engineer happened to be free invites "can I have Dave again".
function msg_public($box) {
    $out = array();
    foreach ($box['msgs'] as $m) {
        $out[] = array(
            't' => intval($m['t'] ?? 0),
            'w' => ((string)($m['w'] ?? 'c') === 'e') ? 'e' : 'c',
            'x' => (string)($m['x'] ?? ''),
            'p' => !empty($m['p']) ? 1 : 0,
        );
    }
    return $out;
}

// Every conversation blob on disk - the cron's work list.
function msg_all_ids() {
    $out = array();
    foreach ((array)@glob(__DIR__ . '/pcm-msg-*.json') as $p) {
        $b = basename($p);
        if (preg_match('/^pcm-msg-([a-f0-9]{24})\.json$/', $b, $m)) $out[] = $m[1];
    }
    return $out;
}

}  // PCM_MSG_LIB
