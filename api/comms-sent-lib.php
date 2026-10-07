<?php
/*
 * Sent emails, for the staff portal (7 Oct 2026). Owner, for David: "somewhere we can check on the emails that have been
 * sent from help@ and also info@ ... maybe there could be an icon where we can check the sent emails ... so we can see
 * what [we] sent people, customers".
 *
 * TWO SOURCES, one list, newest first:
 *  - each company mailbox's Sent folder (the mailboxes in api/mail-imap.php, the same ones comms-mail-lib.php reads for
 *    Messages): what people sent from Outlook, webmail or a phone - IF that program keeps its sent mail on the server,
 *    which IMAP accounts normally do. Each mailbox's line says which folder was read and how many it holds, so a
 *    program keeping its Sent Items on the PC shows up as "nothing in Sent" rather than as silence.
 *  - the website's own automatic emails (pcm-sentlog-lib.php): those go out through the mail server and are saved in
 *    no Sent folder.
 *
 * READ-ONLY, a pure observer like comms-mail-lib.php: the folders are opened OP_READONLY and every body is fetched with
 * FT_PEEK. Nothing is ever flagged, moved, copied, appended or deleted (comms-sent-test.php greps for it).
 *
 * $io (the real one is comms_sent_io(); the tests pass a fake): folders() -> [[name, delimiter]], open($folder) -> bool,
 * count() -> messages in the open folder, search($criteria) -> msgnos, overview($msgnos) -> [{msgno, uid, subject, to,
 * date, size}] (raw header values), validity(), msgno($uid), header($msgno) -> raw, structure($msgno), body($msgno, $sec),
 * close().
 *
 * Library only - no top-level side effects (comms-api.php includes it after comms-lib.php). NO closing tag in this file.
 */
require_once __DIR__ . '/pcm-sentlog-lib.php';

define('SENT_PAGE', 30);        // the newest per Sent folder in the list ("Show more": SENT_MORE)
define('SENT_MORE', 100);
define('SENT_SNIP_SECS', 6);    // what a list may spend fetching the first lines of what was written
define('SENT_FULL', 20000);     // characters of one email shown in full

/* A Sent folder by its own name: "Sent", "INBOX.Sent", "Sent Items", "Sent Messages", "[Gmail]/Sent Mail", ... */
function comms_sent_is_folder($name, $delim) {
    $name = (string)$name; $delim = (string)$delim;
    $last = ($delim !== '' && strpos($name, $delim) !== false) ? substr($name, strrpos($name, $delim) + strlen($delim)) : $name;
    return (bool)preg_match('/^(sent|sent items|sent messages|sent mail|sent-mail|sentitems)$/i', trim($last));
}
/* "A <a@x>, \"Smith, Jo\" <b@y>, c@z" -> [[name, address], ...] (at most 20) */
function comms_sent_addrs($s) {
    $s = comms_mail_mime_decode((string)$s); $out = array(); $seen = array();
    if (preg_match_all('/(?:"([^"]*)"|([^",<>]*?))\s*<([^<>\s]+@[^<>\s]+)>|([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})/', $s, $mm, PREG_SET_ORDER)) {
        foreach ($mm as $m) {
            $addr = strtolower(trim(isset($m[4]) && $m[4] !== '' ? $m[4] : $m[3]));
            $name = trim(isset($m[4]) && $m[4] !== '' ? '' : ($m[1] !== '' ? $m[1] : $m[2]), " \t'\"");
            if ($addr === '' || isset($seen[$addr])) continue;
            if (strcasecmp($name, $addr) === 0 || strpos($name, '@') !== false) $name = '';
            $seen[$addr] = 1; $out[] = array(function_exists('mb_substr') ? mb_substr($name, 0, 80) : substr($name, 0, 80), $addr);
            if (count($out) >= 20) break;
        }
    }
    return $out;
}
/* The search a person typed -> an IMAP search over who it went to, the subject and the text ('' = no search). */
function comms_sent_query($q) {
    $q = trim(preg_replace('/[\x00-\x1F"\\\\]+/', ' ', (string)$q));
    $q = function_exists('mb_substr') ? mb_substr($q, 0, 60) : substr($q, 0, 60);
    return $q;
}
function comms_sent_criteria($q) {
    return $q === '' ? '' : 'OR OR TO "' . $q . '" CC "' . $q . '" OR SUBJECT "' . $q . '" BODY "' . $q . '"';
}
/* The recipients, named from our records where we hold them. */
function comms_sent_people($pairs, $known) {
    $o = array();
    foreach ($pairs as $p) {
        $k = isset($known['mail:' . $p[1]]) ? $known['mail:' . $p[1]] : null;
        $o[] = array('name' => $p[0], 'addr' => $p[1], 'cust' => $k ? (string)$k['name'] : '', 'cust_src' => $k ? (string)$k['src'] : '');
    }
    return $o;
}
function comms_sent_snip($t) {
    $t = trim(preg_replace('/\s+/u', ' ', (string)$t));
    return (function_exists('mb_strlen') ? mb_strlen($t) : strlen($t)) > 220 ? (function_exists('mb_substr') ? mb_substr($t, 0, 220) : substr($t, 0, 220)) . "\xE2\x80\xA6" : $t;
}

/* One mailbox: its Sent folder(s), newest first. -> {status: {box, folders, total, shown, error}, items: [...]} */
function comms_sent_box($box, $io, $q = '', $limit = SENT_PAGE, $known = array(), $deadline = null) {
    $status = array('box' => $box['user'], 'folders' => array(), 'total' => 0, 'shown' => 0, 'error' => '');
    $items = array();
    $all = (array)call_user_func($io['folders']);
    $sent = array();
    foreach ($all as $f) if (is_array($f) && comms_sent_is_folder($f[0], isset($f[1]) ? $f[1] : '')) $sent[] = (string)$f[0];
    if (!$sent) {
        $names = array(); foreach ($all as $f) if (is_array($f)) $names[] = (string)$f[0];
        $status['error'] = 'no Sent folder on the server' . ($names ? ' (it has: ' . implode(', ', array_slice($names, 0, 8)) . ')' : '');
        return array('status' => $status, 'items' => $items);
    }
    $crit = comms_sent_criteria($q);
    foreach ($sent as $folder) {
        if (!call_user_func($io['open'], $folder)) { $status['error'] = 'could not open ' . $folder; continue; }
        $status['folders'][] = $folder;
        $n = (int)call_user_func($io['count']);
        $status['total'] += $n;
        if ($n < 1) continue;
        if ($crit !== '') { $nos = (array)call_user_func($io['search'], $crit); sort($nos); $nos = array_slice($nos, -$limit); }
        else $nos = range(max(1, $n - $limit + 1), $n);
        if (!$nos) continue;
        $validity = (int)call_user_func($io['validity']);
        foreach ((array)call_user_func($io['overview'], $nos) as $ov) {
            $ov = (array)$ov;
            $at = isset($ov['date']) ? strtotime(preg_replace('/\s*\([^)]*\)\s*$/', '', (string)$ov['date'])) : false;
            $items[] = array('k' => 'box', 'box' => $box['user'], 'folder' => $folder, 'uid' => (int)($ov['uid'] ?? 0), 'validity' => $validity,
                'msgno' => (int)($ov['msgno'] ?? 0), 'at' => $at ? gmdate('c', $at) : '', 'ts' => $at ? (int)$at : 0,
                'to' => comms_sent_people(comms_sent_addrs($ov['to'] ?? ''), $known),
                'subject' => trim(comms_mail_mime_decode((string)($ov['subject'] ?? ''))), 'size' => (int)($ov['size'] ?? 0), 'snip' => '', '_f' => $folder);
        }
    }
    usort($items, function ($a, $b) { return $b['ts'] - $a['ts']; });
    // the first lines of what was written, newest first, while there is time
    $deadline = $deadline === null ? microtime(true) + SENT_SNIP_SECS : $deadline;
    $openF = '';
    foreach ($items as $i => $it) {
        if (microtime(true) > $deadline) break;
        if ($openF !== $it['_f']) { if (count($status['folders']) > 1 && !call_user_func($io['open'], $it['_f'])) continue; $openF = $it['_f']; }
        $x = comms_mail_extract($io, $it['msgno']);
        $items[$i]['snip'] = comms_sent_snip($x['text']);
        $items[$i]['attach'] = $x['attach'];
    }
    foreach ($items as $i => $it) unset($items[$i]['_f'], $items[$i]['msgno']);
    $status['shown'] = count($items);
    return array('status' => $status, 'items' => $items);
}

/* One email from a Sent folder, in full: what was written (the earlier messages it quotes cut off) and the whole text. */
function comms_sent_read_box($box, $io, $folder, $uid, $known = array()) {
    $found = false;
    foreach ((array)call_user_func($io['folders']) as $f) if (is_array($f) && (string)$f[0] === (string)$folder && comms_sent_is_folder($f[0], isset($f[1]) ? $f[1] : '')) $found = true;
    if (!$found) return array('error' => 'not a Sent folder');
    if (!call_user_func($io['open'], $folder)) return array('error' => 'could not open ' . $folder);
    $no = (int)call_user_func($io['msgno'], (int)$uid);
    if ($no < 1) return array('error' => 'that email is no longer in ' . $folder);
    $raw = (string)call_user_func($io['header'], $no);
    $m = comms_mail_head($raw);
    $full = ''; $attach = array(); $plain = null; $html = null;
    foreach (comms_vm_parts(call_user_func($io['structure'], $no)) as $pi) {
        $disp = isset($pi['disp']) ? $pi['disp'] : ''; $named = $pi['name'] !== '';
        if ($disp === 'ATTACHMENT' || ($named && !($pi['type'] === 'TEXT' && $disp === 'INLINE')) || $pi['type'] !== 'TEXT') {
            if ($named && !($pi['type'] === 'IMAGE' && $disp !== 'ATTACHMENT') && count($attach) < 10) $attach[] = comms_mail_mime_decode($pi['name']);
            continue;
        }
        if ($pi['bytes'] > 900000) continue;
        $cs = isset($pi['charset']) ? $pi['charset'] : '';
        if ($pi['sub'] === 'PLAIN' && $plain === null) $plain = comms_mail_text(call_user_func($io['body'], $no, $pi['sec']), $pi['enc'], $cs, false);
        elseif ($pi['sub'] === 'HTML' && $html === null) $html = comms_sent_html_full(comms_mail_text_raw(call_user_func($io['body'], $no, $pi['sec']), $pi['enc'], $cs));
    }
    $full = ($plain !== null && trim($plain) !== '') ? $plain : (string)$html;
    $full = trim(preg_replace("/\n{3,}/", "\n\n", str_replace(array("\r\n", "\r"), "\n", $full)));
    $wrote = comms_mail_strip($full);
    $cut = function ($s, $n) { return function_exists('mb_substr') ? mb_substr($s, 0, $n) : substr($s, 0, $n); };
    $h = $m['h'];
    return array('k' => 'box', 'box' => $box['user'], 'folder' => $folder, 'uid' => (int)$uid, 'at' => $m['at'] ? gmdate('c', $m['at']) : '',
        'to' => comms_sent_people(comms_sent_addrs($h['to'] ?? ''), $known), 'cc' => comms_sent_people(comms_sent_addrs($h['cc'] ?? ''), $known),
        'from' => $m['from'], 'subject' => $m['subject'], 'wrote' => $wrote, 'full' => $cut($full, SENT_FULL),
        'more' => trim($wrote) !== trim($cut($full, 2500)), 'attach' => $attach);
}
/* An HTML part as text WITH its quoted history (comms_mail_html_text cuts it; here "Show the whole email" wants it). */
function comms_mail_text_raw($raw, $enc, $charset) {
    $s = comms_vm_decode((string)$raw, (int)$enc);
    $cs = strtoupper(trim((string)$charset, " \t\"'"));
    if ($cs === '' || $cs === 'US-ASCII' || $cs === 'ASCII') $cs = 'UTF-8';
    if ($cs === 'ISO-8859-1' || $cs === 'LATIN1' || $cs === 'ISO_8859-1') $cs = 'WINDOWS-1252';
    if ($cs !== 'UTF-8' && $cs !== 'UTF8') { $t = @iconv($cs, 'UTF-8//IGNORE', $s); if ($t !== false && $t !== '') $s = $t; }
    return comms_mail_utf8($s);
}
function comms_sent_html_full($h) {
    $h = preg_replace('#<(script|style|head|title)\b[^>]*>.*?</\1\s*>#is', ' ', (string)$h);
    $h = preg_replace('#</(p|h[1-6]|blockquote)\s*>#i', "\n\n", $h);
    $h = preg_replace('#<(br|/div|/tr|/li|hr)\b[^>]*>#i', "\n", $h);
    $h = preg_replace('#<li\b[^>]*>#i', "\n- ", $h);
    $s = html_entity_decode(strip_tags($h), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $s = str_replace("\xC2\xA0", ' ', $s);
    return preg_replace("/\n{3,}/", "\n\n", preg_replace("/[ \t]+\n/", "\n", $s));
}

/* The website's own emails (pcm-sentlog-lib.php), newest first, matching the search. */
function comms_sent_auto($q = '', $limit = SENT_MORE, $known = array(), $file = null) {
    $all = array_reverse(sentlog_all($file)); $out = array();
    $low = function ($s) { return function_exists('mb_strtolower') ? mb_strtolower((string)$s) : strtolower((string)$s); };
    $ql = $low($q);
    foreach ($all as $e) {
        if ($q !== '' && strpos($low(($e['to'] ?? '') . ' ' . ($e['subject'] ?? '') . ' ' . ($e['text'] ?? '')), $ql) === false) continue;
        $out[] = array('k' => 'auto', 'id' => (string)($e['id'] ?? ''), 'box' => 'info@365techies.co.uk', 'via' => (string)($e['via'] ?? 'website'),
            'at' => gmdate('c', (int)($e['at'] ?? 0)), 'ts' => (int)($e['at'] ?? 0), 'to' => comms_sent_people(array(array('', (string)($e['to'] ?? ''))), $known),
            'subject' => (string)($e['subject'] ?? ''), 'snip' => comms_sent_snip($e['text'] ?? ''));
        if (count($out) >= $limit) break;
    }
    return $out;
}
function comms_sent_auto_read($id, $known = array(), $file = null) {
    foreach (sentlog_all($file) as $e) if ((string)($e['id'] ?? '') === (string)$id && $id !== '') {
        $t = (string)($e['text'] ?? '');
        return array('k' => 'auto', 'id' => $id, 'box' => 'info@365techies.co.uk', 'via' => (string)($e['via'] ?? 'website'), 'at' => gmdate('c', (int)($e['at'] ?? 0)),
            'to' => comms_sent_people(array(array('', (string)($e['to'] ?? ''))), $known), 'cc' => array(), 'from' => 'info@365techies.co.uk',
            'subject' => (string)($e['subject'] ?? ''), 'wrote' => $t, 'full' => $t, 'more' => false, 'attach' => array());
    }
    return array('error' => 'that email is no longer kept (90 days)');
}

/* The real Sent folders: one read-only connection per mailbox, moved between its folders. null + $err when refused. */
function comms_sent_io($box, &$err = null) {
    $fake = getenv('COMMS_SENT_FAKE');   // a local test server only (never set on the live server): a JSON mailbox
    if ($fake && is_file($fake)) return comms_sent_fake_io($box, $fake, $err);
    if (!function_exists('imap_open')) { $err = 'PHP has no IMAP on this server'; return null; }
    if (function_exists('imap_timeout')) { @imap_timeout(IMAP_OPENTIMEOUT, 12); @imap_timeout(IMAP_READTIMEOUT, 20); }
    $srv = '{' . $box['host'] . ':993/imap/ssl/novalidate-cert}';
    $im = @imap_open($srv, $box['user'], $box['pass'], OP_READONLY | OP_HALFOPEN, 1);
    if (!$im) { $e = function_exists('imap_errors') ? (array)@imap_errors() : array(); $err = 'could not open the mailbox' . ($e ? ' (' . mb_substr((string)end($e), 0, 120) . ')' : ''); return null; }
    $cur = '';
    return array(
        'folders' => function () use ($im, $srv) {
            $o = array(); $l = @imap_getmailboxes($im, $srv, '*');
            foreach (is_array($l) ? $l : array() as $x) {   // "{server...}INBOX.Sent" -> "INBOX.Sent" (the server part as the server writes it)
                $nm = preg_replace('/^\{[^}]*\}/', '', (string)$x->name);
                $o[] = array(comms_mail_utf8(function_exists('imap_utf7_decode') ? (string)@imap_utf7_decode($nm) : $nm), (string)$x->delimiter);
            }
            return $o;
        },
        'open' => function ($folder) use ($im, $srv, &$cur) {
            if ($cur === $folder) return true;
            $enc = function_exists('imap_utf7_encode') ? imap_utf7_encode($folder) : $folder;
            if (!@imap_reopen($im, $srv . $enc, OP_READONLY)) return false;
            $cur = $folder; return true;
        },
        'count' => function () use ($im) { return (int)@imap_num_msg($im); },
        'search' => function ($crit) use ($im) { $f = @imap_search($im, $crit, SE_FREE, 'UTF-8'); return is_array($f) ? $f : array(); },
        'overview' => function ($nos) use ($im) {
            $o = array(); $ov = @imap_fetch_overview($im, implode(',', array_map('intval', $nos)), 0);
            foreach (is_array($ov) ? $ov : array() as $x) $o[] = array('msgno' => (int)$x->msgno, 'uid' => (int)$x->uid, 'subject' => isset($x->subject) ? $x->subject : '',
                'to' => isset($x->to) ? $x->to : '', 'date' => isset($x->date) ? $x->date : '', 'size' => isset($x->size) ? (int)$x->size : 0);
            return $o;
        },
        'validity' => function () use ($im) { $c = @imap_check($im); $s = $c ? @imap_status($im, $c->Mailbox, SA_UIDVALIDITY) : null; return ($s && isset($s->uidvalidity)) ? (int)$s->uidvalidity : 0; },
        'msgno' => function ($uid) use ($im) { return (int)@imap_msgno($im, (int)$uid); },
        'header' => function ($n) use ($im) { return (string)@imap_fetchheader($im, $n); },
        'structure' => function ($n) use ($im) { return @imap_fetchstructure($im, $n); },
        'body' => function ($n, $sec) use ($im) { return (string)@imap_fetchbody($im, $n, $sec, FT_PEEK); },
        'close' => function () use ($im) { if (function_exists('imap_errors')) { @imap_errors(); @imap_alerts(); } @imap_close($im); },
    );
}
/* COMMS_SENT_FAKE (tests only): {"<mailbox>": {"folders": [[name, delim]], "msgs": {"<folder>": [{uid, date, to, cc,
   subject, text, attach}]}}} -> the same callables as the real one. */
function comms_sent_fake_io($box, $file, &$err = null) {
    $all = json_decode((string)@file_get_contents($file), true);
    $mb = is_array($all) && isset($all[$box['user']]) ? $all[$box['user']] : null;
    if (!is_array($mb)) { $err = 'could not open the mailbox (fake: no such mailbox)'; return null; }
    if (!empty($mb['error'])) { $err = (string)$mb['error']; return null; }
    $cur = array('f' => '', 'm' => array());
    $byNo = function ($n) use (&$cur) { return isset($cur['m'][$n - 1]) ? $cur['m'][$n - 1] : null; };
    return array(
        'folders' => function () use ($mb) { return isset($mb['folders']) ? $mb['folders'] : array(); },
        'open' => function ($f) use ($mb, &$cur) { if (!isset($mb['msgs'][$f])) return false; $cur = array('f' => $f, 'm' => $mb['msgs'][$f]); return true; },
        'count' => function () use (&$cur) { return count($cur['m']); },
        'search' => function ($crit) use (&$cur) {
            if (!preg_match('/TO "([^"]*)"/', $crit, $m)) return array();
            $q = strtolower($m[1]); $o = array();
            foreach ($cur['m'] as $i => $x) if (strpos(strtolower(($x['to'] ?? '') . ' ' . ($x['cc'] ?? '') . ' ' . ($x['subject'] ?? '') . ' ' . ($x['text'] ?? '')), $q) !== false) $o[] = $i + 1;
            return $o;
        },
        'overview' => function ($nos) use ($byNo) { $o = array(); foreach ($nos as $n) { $x = $byNo($n); if ($x) $o[] = array('msgno' => $n, 'uid' => $x['uid'], 'subject' => $x['subject'] ?? '', 'to' => $x['to'] ?? '', 'date' => $x['date'] ?? '', 'size' => strlen($x['text'] ?? '')); } return $o; },
        'validity' => function () { return 77; },
        'msgno' => function ($uid) use (&$cur) { foreach ($cur['m'] as $i => $x) if ((int)$x['uid'] === (int)$uid) return $i + 1; return 0; },
        'header' => function ($n) use ($byNo) { $x = $byNo($n); return $x ? "From: Steve <steve@365techies.co.uk>\r\nTo: " . ($x['to'] ?? '') . "\r\n" . (!empty($x['cc']) ? 'Cc: ' . $x['cc'] . "\r\n" : '') . 'Subject: ' . ($x['subject'] ?? '') . "\r\nDate: " . ($x['date'] ?? '') . "\r\n" : ''; },
        'structure' => function ($n) use ($byNo) {
            $x = $byNo($n); $parts = array((object)array('type' => 0, 'subtype' => 'PLAIN', 'encoding' => 0, 'bytes' => strlen($x['text'] ?? ''), 'ifparameters' => 1, 'parameters' => array((object)array('attribute' => 'charset', 'value' => 'UTF-8')), 'ifdisposition' => 0, 'ifdparameters' => 0));
            foreach ((array)($x['attach'] ?? array()) as $a) $parts[] = (object)array('type' => 3, 'subtype' => 'PDF', 'encoding' => 3, 'bytes' => 1000, 'ifdisposition' => 1, 'disposition' => 'attachment', 'ifdparameters' => 1, 'dparameters' => array((object)array('attribute' => 'filename', 'value' => $a)), 'ifparameters' => 0);
            return count($parts) > 1 ? (object)array('type' => 1, 'subtype' => 'MIXED', 'parts' => $parts) : $parts[0];
        },
        'body' => function ($n, $sec) use ($byNo) { $x = $byNo($n); return $x ? (string)($x['text'] ?? '') : ''; },
        'close' => function () {},
    );
}
