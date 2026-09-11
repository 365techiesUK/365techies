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
// Where the blobs and the salt live. Overridable ONLY so the CLI test can point at a temp
// directory and never touch a real conversation; production never defines it.
if (!defined('MSG_DIR')) define('MSG_DIR', __DIR__);

// The filename must not leak the licence key or the email, because the file
// name is the one part of a blob that tends to end up in logs and directory
// listings. A per-install salt means the mapping cannot be reproduced by
// anyone who guesses a customer's email.
function msg_salt() {
    static $s = null;
    if ($s !== null) return $s;
    $f = MSG_DIR . '/' . MSG_SALT_FILE;
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
function msg_path($id){ return MSG_DIR . '/pcm-msg-' . preg_replace('/[^a-f0-9]/', '', (string)$id) . '.json'; }

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
                 'via'=>'portal', 'pc'=>'', 'machine'=>'',   // 'app' threads: which PC (owner: one thread per machine)
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
    foreach ((array)@glob(MSG_DIR . '/pcm-msg-*.json') as $p) {
        $b = basename($p);
        if (preg_match('/^pcm-msg-([a-f0-9]{24})\.json$/', $b, $m)) $out[] = $m[1];
    }
    return $out;
}

// ---- Message us from 365 PC Manager: the app door -----------------------------------
// Owner decisions 2026-09-11: any keyed customer may message; ONE THREAD PER MACHINE;
// the PC's context rides along for the engineer's eyes only; a reply raises a balloon.
// The portal door (pcm-msg.php) is untouched; these share only the store and the poller.

// The context the app attaches. Only fields it already sends at check-in, whitelisted,
// capped, rendered as one line for Slack. Never stored as customer text, never echoed back.
function msg_ctx_line($ctx) {
    if (!is_array($ctx)) return '';
    $s = function ($k, $n) use ($ctx) { return (isset($ctx[$k]) && is_scalar($ctx[$k])) ? msg_clean((string)$ctx[$k], $n) : ''; };
    $parts = array();
    $pc = $s('pc', 60); if ($pc !== '') $parts[] = $pc;
    if (isset($ctx['score']) && is_numeric($ctx['score'])) { $v = $s('verdict', 24); $parts[] = max(0, min(100, (int)$ctx['score'])) . '%' . ($v !== '' ? ' ' . $v : ''); }
    $os = $s('os', 60); if ($os !== '') $parts[] = $os;
    if (isset($ctx['disk']) && is_numeric($ctx['disk'])) $parts[] = 'disk ' . max(0, min(100, (int)$ctx['disk'])) . '%';
    $av = $s('av', 8); if ($av !== '') $parts[] = 'AV ' . $av;
    if (array_key_exists('backup', $ctx)) $parts[] = 'backup ' . (!empty($ctx['backup']) ? 'on' : 'none');
    if (!empty($ctx['reboot'])) $parts[] = 'restart pending';
    if (isset($ctx['batt']) && is_numeric($ctx['batt']) && (int)$ctx['batt'] > 0) $parts[] = 'battery ' . max(0, min(100, (int)$ctx['batt'])) . '%';
    if (isset($ctx['ver']) && is_numeric($ctx['ver']) && (int)$ctx['ver'] > 0) $parts[] = 'app v' . (int)$ctx['ver'];
    return $parts ? mb_substr(implode(' · ', $parts), 0, 300) : '';
}

// The Slack post for a customer message. A NEW thread opens with who wrote and from where;
// later messages are just the text. App messages carry the context line underneath.
function msg_head($box, $text, $ctxline = '') {
    $app  = ((string)($box['via'] ?? 'portal') === 'app');
    $body = $text . (($app && $ctxline !== '') ? "\n\n_Context: " . $ctxline . "_" : '');
    if ((string)($box['thread'] ?? '') !== '') return $body;
    $name = (string)($box['name'] ?? '');
    $who  = $name !== '' ? $name : 'A customer';
    $mem  = (string)($box['member'] ?? '');
    if (!$app && $mem !== '') $who .= ' (' . $mem . ')';
    $pc    = (string)($box['pc'] ?? '');
    $from  = $app ? ('365 PC Manager' . ($pc !== '' ? ' on ' . $pc : '')) : 'the portal';
    $where = $app ? 'their app' : 'their portal';
    $email = (string)($box['email'] ?? '');
    return ":speech_balloon: *" . $who . "* messaged from " . $from
         . ($email !== '' ? "\n" . $email : '')
         . "\nReply *in this thread* and it appears in " . $where . ".\n\n" . $body;
}

// The app's gate: a licence key that exists and a machine that key activated. No tier
// check - any keyed customer may message; a keyless install never reaches this far.
function msg_app_gate($db, $key, $machine) {
    if ($key === '' || !isset($db['customers'][$key])) return array('ok'=>false, 'error'=>'unknown_key');
    $c  = $db['customers'][$key];
    $ms = (isset($c['machines']) && is_array($c['machines'])) ? $c['machines'] : array();
    if ($machine === '' || !isset($ms[$machine])) return array('ok'=>false, 'error'=>'unknown_machine');
    return array('ok'=>true, 'error'=>'',
                 'name'   => msg_clean((string)($c['name'] ?? ''), 60),
                 'email'  => msg_clean((string)($c['email'] ?? ''), 80),
                 'pcname' => msg_clean((string)($ms[$machine]['name'] ?? ''), 60));
}
// One thread per MACHINE: the machine is folded into the id, so two PCs on one key never
// share a conversation, and none of them is the portal's account-holder thread.
function msg_app_id($key, $machine) { return msg_id($key, 'pc:' . $machine); }

function msg_app_list($id) {
    list($box, $lk) = msg_open($id);
    if (!empty($box['unread'])) { $box['unread'] = 0; msg_save($id, $box); }   // opening IS reading
    msg_close($lk);
    return array('ok'=>true, 'msgs'=>msg_public($box), 'unread'=>0);
}

// $deliver: callable(head, thread) -> array(ok, ts) that posts to Slack, or null to leave
// delivery to the poller. STORE FIRST: delivery may fail without losing the message.
function msg_app_send($id, $meta, $text, $ctx, $deliver = null) {
    $text = msg_clean($text, MSG_MAX_LEN);
    if ($text === '') return array('ok'=>false, 'error'=>'empty');
    list($box, $lk) = msg_open($id);
    if (!empty($box['ro'])) { msg_close($lk); return array('ok'=>false, 'error'=>'unavailable'); }
    $lastT = 0; $hour = 0;
    foreach ($box['msgs'] as $m) if ((string)($m['w'] ?? '') === 'c') { $t = intval($m['t'] ?? 0); if ($t > $lastT) $lastT = $t; if ($t > time() - 3600) $hour++; }
    if ($lastT > time() - 2) { msg_close($lk); return array('ok'=>false, 'error'=>'slow_down'); }
    if ($hour >= MSG_PER_HOUR) { msg_close($lk); return array('ok'=>false, 'error'=>'too_many'); }
    $ctxline = msg_ctx_line($ctx);
    $msg = array('t'=>time(), 'w'=>'c', 'x'=>$text, 'p'=>1);
    if ($ctxline !== '') $msg['c'] = $ctxline;   // engineer-only; msg_public() never returns it
    $box['msgs'][] = $msg;
    $box['key']   = (string)$meta['key'];   $box['member'] = '';   $box['via'] = 'app';
    $box['name']  = (string)$meta['name'];  $box['email']  = (string)$meta['email'];
    $box['pc']    = (string)$meta['pcname']; $box['machine'] = substr((string)$meta['machine'], 0, 12);
    msg_trim($box);
    msg_save($id, $box);
    $idx = count($box['msgs']) - 1;
    msg_close($lk);                               // never hold the lock across the network
    if ($deliver) {
        $r = call_user_func($deliver, msg_head($box, $text, $ctxline), (string)$box['thread']);
        if (is_array($r) && !empty($r['ok'])) {
            list($box, $lk) = msg_open($id);
            if ($box['thread'] === '') { $box['thread'] = (string)$r['ts']; $box['cursor'] = (string)$r['ts']; }
            if (isset($box['msgs'][$idx])) $box['msgs'][$idx]['p'] = 0;
            msg_save($id, $box);
            msg_close($lk);
        }
    }
    list($box, $lk) = msg_open($id); msg_close($lk);
    return array('ok'=>true, 'msgs'=>msg_public($box));
}

// The number the app reads at every check-in to raise its balloon. Lock-free on purpose:
// a torn read costs at worst one late balloon, whereas a lock could stall a check-in.
function msg_app_unread($key, $machine) {
    $f = msg_path(msg_app_id($key, $machine));
    if (!file_exists($f)) return 0;
    $d = json_decode((string)@file_get_contents($f), true);
    return is_array($d) ? max(0, intval($d['unread'] ?? 0)) : 0;
}

}  // PCM_MSG_LIB
