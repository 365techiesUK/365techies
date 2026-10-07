<?php
/*
 * The staff portal's "Calls & texts" card (1 Oct 2026). Owner: "rather than being behind a passphrase ... couldn't the
 * voicemails and the text messages be in the portal, where it says Worth a call today ... so we can see what's coming
 * in as we're doing the jobs."
 *
 * POST JSON {stoken, machine, do}: the portal's own staff session (vis_staff_ok - the same check as the Live view and
 * the installs card; a console session works too).
 *   do=list   -> {ok, texts: [{n, who, src, mobile, open, last, items}], vms: [{id, n, who, src, mobile, at, dur, audio, why, done}],
 *                open, open_texts, open_vms, total_texts, total_vms}   (comms_board: the two columns, newest first; names
 *                from our customer records, then Textmagic contacts, then the phone system - src says which)
 *   do=check  -> runs the comms sweep now (new texts from Textmagic, new voicemails from the mailbox), then the list
 *   do=reply  {n, text} -> a text from the 365 Techies number (comms_send_sms: marks that caller's texts and voicemails
 *                answered), then the list
 *   do=note   {id, text} -> a note into that item's Slack thread (#365-job-tracker) and onto the item; replies typed in the
 *                thread come back as notes (comms_slack_sync, every sweep)
 *   do=done   {id} one voicemail or enquiry | {n, kind:'text'} that number's texts | {n} everything from it -> marked handled
 *   do=newjob {v: {name, address, postcode, phone, mobile, email, website, jobtype, issue, assigned, priority, price}, from?}
 *             -> 2 Oct 2026, "New customer": the Slack "New job in" card posted to #sos-jobs-in-out and the job saved at
 *                once (pcm-newjob-lib.php); {from: an item id} also notes it in that item's own Slack thread. Answers
 *                job: {id, name, phone, mobile, email, slack} or job: {errors: {box: message}}, then the list.
 *   list also carries webs: website enquiries and call-back requests from #365-job-tracker (comms_lead_*, 2 Oct 2026),
 *             and names from the job list (comms_job_names); mails: emails from people in the company mailboxes
 *             (comms-mail-lib.php, 2 Oct 2026) and mailboxes: each one's last look [{box, at, new, left_out, replied, error}].
 *   do=sent    {q?, more?} -> 7 Oct 2026, "Sent emails" (owner, for David: "see what [we] sent people"): what went out from
 *              the company mailboxes - each one's Sent folder, read-only (comms-sent-lib.php) - and the website's own
 *              automatic emails (pcm-sentlog-lib.php), newest first: {items: [{k: box|auto, box, folder, uid, id, via, at,
 *              to: [{name, addr, cust}], subject, snip}], boxes: [{box, folders, total, shown, error}], auto_since}.
 *              q searches who it went to, the subject and the text. Answers on its own (no inbox list).
 *   do=sentmsg {box, folder, uid} | {auto: id} -> one of those in full: {msg: {to, cc, subject, at, wrote, full, attach}}
 * GET ?a=<recording>&e=<expiry>&s=<signature> -> the recording itself (comms_stream_audio), for the card's players.
 *   The link is signed with the server-only admin secret and lasts 3 hours, so an <audio> element needs no cookie.
 *
 * Same store and rules as the comms inbox (comms.php): nothing here sends anything except a reply a person typed.
 * NO closing tag in this file.
 */
header('X-Robots-Tag: noindex, nofollow');
$SECRET = __DIR__ . '/pcm-admin-secret.php';
if (!file_exists($SECRET)) { http_response_code(503); header('Content-Type: application/json'); echo json_encode(array('ok' => false, 'error' => 'not-configured')); exit; }
require $SECRET;   // $PCM_ADMIN_PASS - also the key the play links are signed with
require __DIR__ . '/comms-lib.php';
require_once __DIR__ . '/visitors-tally-lib.php';   // vis_staff_ok()
require_once __DIR__ . '/pcm-custbook-lib.php';     // cb_book_names(): the names staff set in the customer book

/* the recording: a signed, unexpired link only */
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['a'])) {
    $a = (string)$_GET['a']; $e = (int)($_GET['e'] ?? 0); $s = (string)($_GET['s'] ?? '');
    if (!preg_match('/^vm-audio-[A-Za-z0-9\-]+\.(mp3|wav)$/', $a) || $e < time() || !hash_equals(comms_audio_sig($a, $e, $PCM_ADMIN_PASS), $s)) {
        http_response_code(403); exit('expired - reload the portal');
    }
    comms_stream_audio(__DIR__ . '/' . $a, !empty($_GET['dl']));
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function ca_out($a) { echo json_encode($a, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); ca_out(array('ok' => false, 'error' => 'post')); }
$in = json_decode((string)file_get_contents('php://input', false, null, 0, 20000), true);
if (!is_array($in)) $in = array();
if (!vis_staff_ok($in, __DIR__)) { http_response_code(403); ca_out(array('ok' => false, 'error' => 'auth')); }

$do = (string)($in['do'] ?? 'list');
// 7 Oct 2026 (owner, for David): Sent emails - read-only, and answered on its own, before anything below touches the inbox
if ($do === 'sent' || $do === 'sentmsg') {
    require_once __DIR__ . '/comms-sent-lib.php';
    @set_time_limit(60);
    $known = comms_mail_known_map();
    $boxCfg = array(); foreach (comms_mail_config() as $bx) if (!isset($boxCfg[$bx['user']])) $boxCfg[$bx['user']] = $bx;   // one look per mailbox
    if ($do === 'sentmsg') {
        if (!empty($in['auto'])) { $r = comms_sent_auto_read((string)$in['auto'], $known); ca_out(isset($r['error']) ? array('ok' => false, 'error' => $r['error']) : array('ok' => true, 'msg' => $r)); }
        $want = strtolower(trim((string)($in['box'] ?? '')));
        if (!isset($boxCfg[$want])) ca_out(array('ok' => false, 'error' => 'no such mailbox'));
        $e2 = ''; $io = comms_sent_io($boxCfg[$want], $e2);
        if (!$io) ca_out(array('ok' => false, 'error' => $e2));
        $r = comms_sent_read_box($boxCfg[$want], $io, (string)($in['folder'] ?? ''), (int)($in['uid'] ?? 0), $known);
        call_user_func($io['close']);
        ca_out(isset($r['error']) ? array('ok' => false, 'error' => $r['error']) : array('ok' => true, 'msg' => $r));
    }
    $q = comms_sent_query($in['q'] ?? '');
    $limit = !empty($in['more']) ? SENT_MORE : SENT_PAGE;
    $items = array(); $boxes = array();
    foreach ($boxCfg as $bx) {
        $e2 = ''; $io = comms_sent_io($bx, $e2);
        if (!$io) { $boxes[] = array('box' => $bx['user'], 'folders' => array(), 'total' => 0, 'shown' => 0, 'error' => $e2); continue; }
        $r = comms_sent_box($bx, $io, $q, $limit, $known, microtime(true) + max(2, SENT_SNIP_SECS / max(1, count($boxCfg))));
        call_user_func($io['close']);
        $boxes[] = $r['status']; $items = array_merge($items, $r['items']);
    }
    $items = array_merge($items, comms_sent_auto($q, $limit, $known));
    usort($items, function ($a, $b) { return $b['ts'] - $a['ts']; });
    $log = sentlog_all();
    ca_out(array('ok' => true, 'items' => $items, 'boxes' => $boxes, 'auto_since' => $log ? (int)$log[0]['at'] : 0, 'q' => $q, 'more' => !empty($in['more'])));
}
$note = ''; $err = ''; $jobOut = null; $blockKey = '';
$num = function ($raw) { $r = (string)$raw; if ($r !== '' && $r[0] === ' ') $r = '+' . ltrim($r); return substr(preg_replace('/[^0-9+]/', '', $r), 0, 20); };
if ($do === 'check') {
    $sw = comms_sweep();
    $nt = (int)($sw['sms']['new'] ?? 0); $nv = (int)($sw['vm']['new'] ?? 0); $nw = (int)($sw['slack']['enquiries'] ?? 0);
    $bits = array();
    if ($nv) $bits[] = $nv . ' new voicemail' . ($nv === 1 ? '' : 's');
    if ($nt) $bits[] = $nt . ' new text' . ($nt === 1 ? '' : 's');
    if ($nw) $bits[] = $nw . ' new enquir' . ($nw === 1 ? 'y' : 'ies');   // 2 Oct 2026: website enquiries and call-back requests
    $ne = (int)($sw['mail']['new'] ?? 0);
    if ($ne) $bits[] = $ne . ' new email' . ($ne === 1 ? '' : 's');   // 2 Oct 2026: emails from people (comms-mail-lib.php)
    foreach ((array)($sw['mail']['boxes'] ?? array()) as $bk => $bx) if (!empty($bx['error']) && $err === '') $err = 'Mailbox ' . $bk . ': ' . $bx['error'];
    $note = $bits ? implode(', ', $bits) : 'Nothing new.';
    if (!empty($sw['vm']['error'])) $err = 'Voicemail mailbox: ' . $sw['vm']['error'];
} elseif ($do === 'reply') {
    $n = $num($in['n'] ?? ''); $text = trim((string)($in['text'] ?? ''));
    if ($text === '') $err = 'Nothing to send.';
    elseif (!tm_is_mobile(tm_number($n))) $err = 'Texts can only go to a UK mobile - ring this one instead.';
    else {
        $r = comms_send_sms($n, mb_substr($text, 0, 600), 'portal');
        if (!empty($r['ok'])) $note = 'Text sent' . (!empty($r['dry']) ? ' (dry run)' : '') . '.';
        else $err = 'The text did not send: ' . (string)($r['error'] ?? 'unknown') . '.';
    }
} elseif ($do === 'note') {
    // 1 Oct 2026 (late): a note on a text or voicemail - into its Slack thread in #365-job-tracker, and kept here
    $id = preg_replace('/[^A-Za-z0-9\-]/', '', (string)($in['id'] ?? ''));
    $tokS = preg_replace('/[^a-f0-9]/', '', (string)($in['stoken'] ?? ''));
    $dbS = @json_decode((string)@file_get_contents(__DIR__ . '/pcm-data.json'), true);
    $by = comms_staff_name((string)($dbS['staff'][$tokS]['login'] ?? $dbS['staff'][$tokS]['email'] ?? ''));
    $rn = comms_add_note($id, (string)($in['text'] ?? ''), $by);
    if (!empty($rn['ok']) && empty($rn['error'])) $note = 'Note added - it is in the Slack thread too.';
    elseif (!empty($rn['ok'])) $err = $rn['error'];
    else $err = $rn['error'];
} elseif ($do === 'newjob') {
    // 2 Oct 2026 (owner): "shouldn't there be a new customer button, like we've done in Slack" - the same "New job in"
    // card, posted to #sos-jobs-in-out, and the job saved at once (pcm-newjob-lib.php). From a text, voicemail or
    // website enquiry ({from: item id}) the item's own Slack thread gets a note saying so.
    require_once __DIR__ . '/pcm-newjob-lib.php';
    $tokS = preg_replace('/[^a-f0-9]/', '', (string)($in['stoken'] ?? ''));
    $dbS = @json_decode((string)@file_get_contents(__DIR__ . '/pcm-data.json'), true);
    $by = comms_staff_name((string)($dbS['staff'][$tokS]['login'] ?? $dbS['staff'][$tokS]['email'] ?? ''));
    $from = preg_replace('/[^A-Za-z0-9\-]/', '', (string)($in['from'] ?? ''));
    $fromIt = null;
    if ($from !== '') { list($okF, $fromIt) = comms_locked(function ($d) use ($from) { foreach ($d['items'] as $x) if ($x['id'] === $from) return array('__result' => $x); return array('__result' => null); }); }
    $uk = function ($n) { return strpos((string)$n, '+44') === 0 ? '0' . substr((string)$n, 3) : (string)$n; };
    $fromLabel = '';
    if ($fromIt) {
        $t = (string)$fromIt['type'];
        $fromLabel = ($t === 'voicemail' ? 'a voicemail' : ($t === 'web' ? 'a ' . strtolower((string)($fromIt['lead']['label'] ?? 'website enquiry')) : ($t === 'email' ? 'an email' : 'a text')))
            . ($t === 'email' ? ' from ' . (string)($fromIt['mail']['from'] ?? '') : ((string)$fromIt['number'] !== '' ? ' from ' . $uk($fromIt['number']) : ''));
    }
    $rj = nj_create((array)($in['v'] ?? array()), $by, $fromLabel, $fromIt ? array('comms' => $fromIt['id']) : array());
    if (empty($rj['ok'])) { $err = (string)$rj['error']; $jobOut = array('errors' => (array)($rj['errors'] ?? array())); }
    else {
        $jobOut = array('id' => $rj['id'], 'name' => $rj['name'], 'phone' => $rj['phone'], 'mobile' => $rj['mobile'], 'email' => $rj['email'], 'slack' => $rj['slack']);
        $note = $rj['name'] . ' is in the job list' . ($rj['slack'] ? ', and the New job in card is in #sos-jobs-in-out.' : '.')
            . ($rj['saved'] ? '' : ' (The job list was busy - it will pick the card up from Slack within 15 minutes.)');
        if (!$rj['slack']) $err = 'Saved in the portal, but Slack did not take the card (' . $rj['slack_error'] . ').';
        if ($fromIt) comms_add_note($fromIt['id'], 'Made a customer record: ' . $rj['name'] . ($rj['slack'] ? ' (New job in posted to #sos-jobs-in-out)' : ''), $by);
    }
} elseif ($do === 'done') {
    // one voicemail ({id}), or a caller's texts ({n, kind: 'text'}), or everything from a number ({n})
    $id = preg_replace('/[^A-Za-z0-9\-]/', '', (string)($in['id'] ?? ''));
    $n = $num($in['n'] ?? '');
    if ($id !== '') { $k = comms_set_handled($id, true, 'portal'); $k = is_array($k) ? !empty($k[1]) : (bool)$k; }
    else $k = $n !== '' ? comms_handle_number($n, 'portal', ($in['kind'] ?? '') === 'text' ? array('sms_in') : array('sms_in', 'voicemail')) : 0;
    $note = $k ? 'Marked done.' : 'Nothing left to mark.';
    // and a tick on each one's Slack post, so the channel shows it is dealt with (best effort, up to 8)
    if ($k) {
        list($okT, $its) = comms_locked(function ($d) { return array('__result' => $d['items']); });
        $ticks = 0;
        foreach ($okT ? $its : array() as $it) {
            if ($ticks >= 8 || empty($it['slack_ts']) || empty($it['handled']) || ($it['handled_by'] ?? '') !== 'portal') continue;
            if ($id !== '' ? $it['id'] !== $id : $it['number'] !== $n) continue;
            if (strtotime((string)($it['handled_at'] ?? '')) < time() - 120) continue;
            comms_slack_tick($it['slack_ts']); $ticks++;
        }
    }
} elseif ($do === 'undone') {
    // 3 Oct 2026 (owner, for David): the Undo after a Done - the same item, or that caller's texts, back on the list.
    // Only what the PORTAL marked done in the last 10 minutes, so an Undo never reopens something closed in Slack,
    // by a reply from Outlook, or long ago.
    $id = preg_replace('/[^A-Za-z0-9\-]/', '', (string)($in['id'] ?? ''));
    $n = $num($in['n'] ?? '');
    $types = ($in['kind'] ?? '') === 'text' ? array('sms_in') : array('sms_in', 'voicemail');
    list($okU, $back) = comms_locked(function ($d) use ($id, $n, $types) {
        $ts = array(); $cut = time() - 600;
        foreach ($d['items'] as $i => $it) {
            if (empty($it['handled']) || ($it['handled_by'] ?? '') !== 'portal') continue;
            if (strtotime((string)($it['handled_at'] ?? '')) < $cut) continue;
            if ($id !== '' ? $it['id'] !== $id : ($n === '' || $it['number'] !== $n || !in_array($it['type'], $types, true))) continue;
            $d['items'][$i]['handled'] = false; $d['items'][$i]['handled_by'] = ''; $d['items'][$i]['handled_at'] = '';
            $ts[] = (string)($it['slack_ts'] ?? '');
        }
        return $ts ? array('__data' => $d, '__result' => $ts) : array('__result' => array());
    });
    if (!$okU) { $err = 'The list was busy - press Undo again.'; $back = array(); }
    $back = is_array($back) ? $back : array();
    if ($okU) $note = $back ? 'Back on the list.' : 'Too late to undo that one - it is under Show done.';
    $unticks = 0;
    foreach ($back as $t) if ($t !== '' && $unticks < 8) { comms_slack_untick($t); $unticks++; }
} elseif ($do === 'block') {
    // 3 Oct 2026 (owner: "add the block this sender button"): an email's sender, or the address typed into a website form.
    // scope 'addr' = that address; 'domain' = everyone at their firm (never a personal-mail domain). Never someone we
    // hold. Their open items here are cleared at once (done, by 'blocked'); later ones are left out as they arrive.
    $id = preg_replace('/[^A-Za-z0-9\-]/', '', (string)($in['id'] ?? ''));
    $scope = ($in['scope'] ?? '') === 'domain' ? 'domain' : 'addr';
    list($okF, $it) = comms_locked(function ($d) use ($id) { foreach ($d['items'] as $x) if ($x['id'] === $id) return array('__result' => $x); return array('__result' => null); });
    $addr = is_array($it) ? comms_item_sender($it) : '';
    $known = comms_mail_known_map();
    $key = comms_block_key($addr, $scope);
    if (!$okF) $err = 'The list was busy - press Block again.';
    elseif (!is_array($it) || $addr === '' || $key === '') $err = 'There is no email address on that one to block.';
    elseif (isset($known['mail:' . $addr]) || (($it['match']['status'] ?? '') === 'MATCH')) $err = $addr . ' is someone we hold - not blocked.';
    elseif ($scope === 'domain' && comms_block_domain_ok($addr) === '') $err = 'Everyone at ' . substr(strrchr($addr, '@'), 1) . ' can\'t be blocked - customers use it. Block just the address instead.';
    else {
        $tokS = preg_replace('/[^a-f0-9]/', '', (string)($in['stoken'] ?? ''));
        $dbS = @json_decode((string)@file_get_contents(__DIR__ . '/pcm-data.json'), true);
        $by = comms_staff_name((string)($dbS['staff'][$tokS]['login'] ?? $dbS['staff'][$tokS]['email'] ?? ''));
        list($okB, $cleared) = comms_locked(function ($d) use ($key, $by, $known) {
            if (!isset($d['checkpoints']['blocked']) || !is_array($d['checkpoints']['blocked'])) $d['checkpoints']['blocked'] = array();
            $d['checkpoints']['blocked'][$key] = array('by' => $by, 'at' => gmdate('c'));
            $bl = array($key => 1); $ts = array();
            foreach ($d['items'] as $i => $x) {
                if (!empty($x['handled'])) continue;
                $s = comms_item_sender($x);
                if ($s === '' || isset($known['mail:' . $s]) || comms_is_blocked($s, $bl) === '') continue;
                $d['items'][$i]['handled'] = true; $d['items'][$i]['handled_by'] = 'blocked'; $d['items'][$i]['handled_at'] = gmdate('c');
                $ts[] = (string)($x['slack_ts'] ?? '');
            }
            return array('__data' => $d, '__result' => $ts);
        });
        if (!$okB) $err = 'The list was busy - press Block again.';
        else {
            $n = count((array)$cleared);
            $note = 'Blocked ' . ($scope === 'domain' ? 'everyone at ' . substr($key, 1) : $key) . ' - ' . $n . ' cleared from the list. Outlook still has them.';
            $blockKey = $key;
            $ticks = 0;
            foreach ((array)$cleared as $t) if ($t !== '' && $ticks < 8) { comms_slack_tick($t); $ticks++; }
        }
    }
} elseif ($do === 'unblock') {
    // the Undo after a Block (reopen = 1: what that block cleared in the last 10 minutes comes back), or Unblock in the list
    $key = strtolower(trim((string)($in['key'] ?? '')));
    $reopen = !empty($in['reopen']);
    list($okU, $back) = comms_locked(function ($d) use ($key, $reopen) {
        if (!isset($d['checkpoints']['blocked'][$key])) return array('__result' => false);
        unset($d['checkpoints']['blocked'][$key]);
        $ts = array(); $cut = time() - 600; $bl = array($key => 1);
        if ($reopen) foreach ($d['items'] as $i => $x) {
            if (empty($x['handled']) || ($x['handled_by'] ?? '') !== 'blocked' || strtotime((string)($x['handled_at'] ?? '')) < $cut) continue;
            if (comms_is_blocked(comms_item_sender($x), $bl) === '') continue;
            $d['items'][$i]['handled'] = false; $d['items'][$i]['handled_by'] = ''; $d['items'][$i]['handled_at'] = '';
            $ts[] = (string)($x['slack_ts'] ?? '');
        }
        return array('__data' => $d, '__result' => $ts);
    });
    if (!$okU) $err = 'The list was busy - try again.';
    elseif ($back === false) $note = 'That sender was not blocked.';
    else {
        $note = 'Unblocked ' . ($key !== '' && $key[0] === '@' ? 'everyone at ' . substr($key, 1) : $key) . ($reopen && $back ? ' - back on the list.' : '.');
        $unticks = 0;
        foreach ((array)$back as $t) if ($t !== '' && $unticks < 8) { comms_slack_untick($t); $unticks++; }
    }
}
list($ok, $snap) = comms_locked(function ($d) { return array('__result' => array('items' => $d['items'], 'names' => $d['checkpoints']['names'] ?? array(),
    'mailstat' => $d['checkpoints']['mail_status'] ?? array(), 'blocked' => $d['checkpoints']['blocked'] ?? array())); });
if (!$ok) ca_out(array('ok' => false, 'error' => 'busy'));
// 2 Oct 2026: people written up as a job (Slack's New job in, or New customer here) are named by it
// ... and emails from people we hold are named by our records or the job list (comms_mail_known_map: 'mail:<address>')
// 6 Oct 2026: then the names staff set in the customer book (pcm-custbook-lib.php) - over the job cards' names
$b = comms_board($snap['items'], comms_names_with_jobs(comms_names_with_jobs(comms_names_with_jobs($snap['names'], comms_job_names()), comms_mail_known_map()), cb_book_names()), $PCM_ADMIN_PASS);
// 2 Oct 2026: each mailbox's last look - when, how many came in, how many were left out and why - so the card can say so
$boxes = array();
foreach (comms_mail_config() as $bx) {
    $st = is_array($snap['mailstat'][$bx['key']] ?? null) ? $snap['mailstat'][$bx['key']] : array();
    $boxes[] = array('box' => $bx['key'], 'at' => (int)($st['at'] ?? 0), 'new' => (int)($st['new'] ?? 0), 'left_out' => (array)($st['left_out'] ?? array()),
        'replied' => (int)($st['replied'] ?? 0), 'error' => (string)($st['error'] ?? ''));
}
ca_out(array('ok' => true, 'texts' => $b['texts'], 'vms' => $b['vms'], 'webs' => $b['webs'], 'mails' => $b['mails'], 'open' => $b['open'], 'open_texts' => $b['open_texts'], 'open_vms' => $b['open_vms'],
    'open_webs' => $b['open_webs'], 'open_mails' => $b['open_mails'], 'total_texts' => $b['total_texts'], 'total_vms' => $b['total_vms'], 'total_webs' => $b['total_webs'],
    'total_mails' => $b['total_mails'], 'mailboxes' => $boxes,
    'blocked' => comms_blocked_out($snap['blocked']), 'block_key' => $blockKey,
    'note' => $note, 'err' => $err, 'job' => $jobOut, 'at' => time()));
