<?php
/*
 * Emails in the staff inbox (2 Oct 2026). Owner: "yes add the emails too" - after asking for "a sort of inbox for
 * everything, all communications that come in from everywhere, just turns up in there."
 *
 * WHERE FROM. The company's own mailboxes on SiteGround (the MX is SiteGround's spam filter), read over IMAP exactly as
 * the voicemail mailbox is (comms_vm_poll): READ-ONLY, a pure observer. Nothing is ever marked read, moved, flagged or
 * deleted - the team works these mailboxes in Outlook and relies on their state. The mailboxes are named in ONE
 * server-only file the owner makes, api/mail-imap.php (never in git; .htaccess-denied), the same shape as vm-imap.php:
 *     $MAIL_USER = 'info@365techies.co.uk';   $MAIL_PASS = '...';
 *     $MAIL2_USER = 'help@365techies.co.uk';  $MAIL2_PASS = '...';    (optional; up to $MAIL5_)
 *     optional: $MAIL_HOST (default: vm-imap.php's $VM_HOST, the same SiteGround server), $MAIL_FOLDER (default INBOX)
 *
 * WHAT COMES IN: email from people. Left out, each counted by reason so the portal can say what was filtered: our own
 * domain (staff, the website's own mail), spam the filter flagged, mailing lists and bulk mail (List-Unsubscribe,
 * List-Id, Precedence), automatic mail (Auto-Submitted, auto-replies, out-of-office, delivery reports, meeting
 * responses), no-reply senders, and the services that mail us (SimplyBook, GoCardless, QuickBooks, HubSpot, Slack,
 * Voipfone, Textmagic, SiteGround, ...). A sender we hold - a customer record or a job - is always let through the
 * no-reply and service rules (never the own-domain, spam, list or automatic ones).
 *
 * DONE. A reply sent from Outlook or webmail sets the email's \Answered flag on the server; every sweep reads that flag
 * for the open ones and marks them done here (and ticks their Slack post). Done in the portal never touches the mailbox.
 *
 * SLACK. Each new email posts one line to #365-job-tracker as the app's bot, so it is linked at once: notes typed in the
 * portal go into its thread, replies there come back as notes, ticks both ways - as texts and voicemails do. The first
 * run on a mailbox (or after the server renumbers it) takes the last MAIL_LOOKBACK_DAYS in quietly: no Slack posts.
 *
 * Store: comms-data.json items of type 'email': number = a UK number written in the message, else ''; body = what they
 * wrote (quoted history cut); mail = {box, from, name, reply_to, subject, attach: [names], uid, validity, known}.
 * checkpoints['mail'][box] = {validity, uid}; checkpoints['mail_status'][box] = {at, new, left_out: {reason: n}, error}.
 *
 * Library only - no top-level side effects. NO closing tag in this file.
 */

define('MAIL_LOOKBACK_DAYS', 4);   // searched every run; all a first run takes in (quietly)
define('MAIL_MAX_EXAMINE', 40);    // messages read per mailbox per run
define('MAIL_MAX_POSTS', 10);      // Slack lines per mailbox per run; the rest still come into the inbox

/* ---------------- the mailboxes ---------------- */
function comms_mail_config($file = null, $vmFile = null) {
    $src = (string)@file_get_contents($file !== null ? $file : __DIR__ . '/mail-imap.php');
    if ($src === '') return array();
    $g = function ($name) use ($src) { return preg_match('/\$' . $name . '\s*=\s*[\'"]([^\'"]+)[\'"]/', $src, $m) ? $m[1] : ''; };
    $host = $g('MAIL_HOST');
    if ($host === '') {   // the same SiteGround server as the voicemail mailbox
        $vs = (string)@file_get_contents($vmFile !== null ? $vmFile : __DIR__ . '/vm-imap.php');
        if (preg_match('/\$VM_HOST\s*=\s*[\'"]([^\'"]+)[\'"]/', $vs, $vm)) $host = $vm[1];
    }
    $folder = $g('MAIL_FOLDER') !== '' ? $g('MAIL_FOLDER') : 'INBOX';
    $out = array(); $seen = array();
    foreach (array('MAIL', 'MAIL2', 'MAIL3', 'MAIL4', 'MAIL5') as $p) {
        $u = strtolower(trim($g($p . '_USER'))); $pw = $g($p . '_PASS');
        $h = $g($p . '_HOST') !== '' ? $g($p . '_HOST') : $host;
        $f = $g($p . '_FOLDER') !== '' ? $g($p . '_FOLDER') : $folder;
        if ($u === '' || $pw === '' || $h === '' || isset($seen[$u . '|' . $f])) continue;
        $seen[$u . '|' . $f] = 1;
        $out[] = array('key' => $u . ($f !== 'INBOX' ? '/' . $f : ''), 'user' => $u, 'pass' => $pw, 'host' => $h, 'folder' => $f);
    }
    return $out;
}

/* ---------------- reading one email (pure functions) ---------------- */
function comms_mail_utf8($s) {   // any bytes -> UTF-8 (a header without a charset is usually Windows-1252)
    $s = (string)$s;
    if ($s === '' || preg_match('//u', $s)) return $s;
    $t = @iconv('WINDOWS-1252', 'UTF-8//IGNORE', $s);
    return $t !== false ? $t : '';
}
function comms_mail_mime_decode($s) {   // "=?UTF-8?B?...?=" / "=?iso-8859-1?Q?...?=" -> text
    $s = trim((string)$s);
    if ($s === '' || strpos($s, '=?') === false) return comms_mail_utf8($s);
    $s = preg_replace('/\?=\s+=\?/', '?==?', $s);   // whitespace between two encoded words is not part of the text
    $out = preg_replace_callback('/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/', function ($m) {
        $cs = strtoupper(preg_replace('/\*.*$/', '', $m[1]));
        $raw = strtoupper($m[2]) === 'B' ? (string)base64_decode($m[3]) : quoted_printable_decode(str_replace('_', ' ', $m[3]));
        if ($cs === 'UTF-8' || $cs === 'UTF8') return comms_mail_utf8($raw);
        if ($cs === 'ISO-8859-1' || $cs === 'LATIN1' || $cs === 'US-ASCII') $cs = 'WINDOWS-1252';
        $t = @iconv($cs, 'UTF-8//IGNORE', $raw);
        return $t !== false ? $t : comms_mail_utf8($raw);
    }, $s);
    return comms_mail_utf8($out);
}
/* "Name <a@b>" | "a@b" | "\"Smith, Jo\" <a@b>, other" -> array(name, address); the first address only. */
function comms_mail_addr($s) {
    $s = trim((string)$s);
    if ($s === '') return array('', '');
    if (preg_match('/^\s*(.*?)\s*<([^<>\s]+@[^<>\s]+)>/s', $s, $m)) {
        $name = trim(comms_mail_mime_decode(trim($m[1])), " \t\"'");
        $addr = strtolower($m[2]);
        if (strcasecmp($name, $addr) === 0 || strpos($name, '@') !== false) $name = '';
        return array(function_exists('mb_substr') ? mb_substr($name, 0, 80) : substr($name, 0, 80), $addr);
    }
    if (preg_match('/([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})/', $s, $m)) return array('', strtolower($m[1]));
    return array('', '');
}
/* The headers that matter, from the raw header block. h = every header, lower-cased names, first occurrence. */
function comms_mail_head($raw) {
    $raw = preg_replace("/\r\n|\r/", "\n", (string)$raw);
    $raw = preg_replace("/\n[ \t]+/", ' ', $raw);   // unfold
    $h = array();
    foreach (explode("\n", $raw) as $ln) {
        if (preg_match('/^([A-Za-z0-9\-]+):[ \t]*(.*)$/', $ln, $m)) { $k = strtolower($m[1]); if (!isset($h[$k])) $h[$k] = trim($m[2]); }
    }
    list($name, $from) = comms_mail_addr(isset($h['from']) ? $h['from'] : '');
    list(, $reply) = comms_mail_addr(isset($h['reply-to']) ? $h['reply-to'] : '');
    $at = isset($h['date']) ? strtotime(preg_replace('/\s*\([^)]*\)\s*$/', '', $h['date'])) : false;
    return array('h' => $h, 'from' => $from, 'name' => $name, 'reply_to' => $reply !== $from ? $reply : '',
        'subject' => trim(comms_mail_mime_decode(isset($h['subject']) ? $h['subject'] : '')), 'at' => $at !== false ? (int)$at : 0,
        'ctype' => strtolower(isset($h['content-type']) ? $h['content-type'] : ''));
}

/* Services that mail us (a domain or any subdomain of it). Personal mail domains (gmail, googlemail, outlook, hotmail,
   btinternet, ...) are NOT here - customers write from those. */
function comms_mail_services() {
    return array('simplybook.it', 'simplybook.me', 'simplybook.net', 'gocardless.com', 'intuit.com', 'quickbooks.com', 'hubspot.com',
        'hubspotemail.net', 'hubspotstarter.net', 'hs-sites.com', 'slack.com', 'slackbot.com', 'voipfone.co.uk', 'voipfone.net', 'textmagic.com',
        'siteground.com', 'siteground.net', 'sgvps.net', 'cloudflare.com', 'github.com', 'google.com', 'youtube.com', 'microsoft.com',
        'microsoftonline.com', 'office.com', 'office365.com', 'azure.com', 'amazon.co.uk', 'amazon.com', 'amazonses.com', 'paypal.co.uk',
        'paypal.com', 'stripe.com', 'dell.com', 'malwarebytes.com', 'splashtop.com', 'linkedin.com', 'facebookmail.com', 'facebook.com',
        'meta.com', 'instagram.com', 'apple.com', 'ebay.co.uk', 'ebay.com', 'trustpilot.com', 'yell.com', 'godaddy.com', 'ionos.co.uk',
        'mailchimp.com', 'mcsv.net', 'mailgun.org', 'sendgrid.net', 'zoom.us', 'calendly.com', 'xero.com', 'docusign.net', 'canva.com',
        'adobe.com', 'dropbox.com', 'wetransfer.com', 'partnerize.com', 'prf.hn', 'awin.com', 'tiktok.com', 'x.com', 'twitter.com',
        'openai.com', 'anthropic.com', 'cloudflareworkers.com', 'mailspamprotection.com');
}
/* Why an email is left out ('' = it comes in). $m = comms_mail_head(); $known = a sender we hold (or null). */
function comms_mail_skip($m, $known = null, $selfDomains = null) {
    $h = $m['h']; $from = (string)$m['from'];
    if ($from === '' || strpos($from, '@') === false) return 'no sender';
    $dom = strtolower(substr(strrchr($from, '@'), 1)); $local = strtolower((string)strstr($from, '@', true));
    $under = function ($d, $list) { foreach ($list as $x) if ($d === $x || substr($d, -strlen($x) - 1) === '.' . $x) return true; return false; };
    if ($under($dom, $selfDomains !== null ? $selfDomains : array('365techies.co.uk', '365-computers.com'))) return 'our own';
    $subj = (string)$m['subject'];
    if (preg_match('/^\s*yes\b/i', isset($h['x-spam-flag']) ? $h['x-spam-flag'] : '') || preg_match('/^\s*yes\b/i', isset($h['x-spam-status']) ? $h['x-spam-status'] : '')
        || preg_match('/^\s*[\[(]?\s*\*{0,3}\s*spam\b/i', $subj)) return 'spam';
    if (isset($h['list-unsubscribe']) || isset($h['list-id']) || isset($h['list-post'])) return 'newsletters and lists';
    if (preg_match('/\b(bulk|list|junk)\b/i', isset($h['precedence']) ? $h['precedence'] : '')) return 'newsletters and lists';
    $as = strtolower(trim(isset($h['auto-submitted']) ? $h['auto-submitted'] : ''));
    if (($as !== '' && $as !== 'no') || isset($h['x-autoreply']) || isset($h['x-autorespond']) || isset($h['x-autoresponse'])) return 'automatic';
    if (strpos((string)$m['ctype'], 'multipart/report') === 0) return 'automatic';
    if (preg_match('/^\s*(automatic reply|auto(matic)?[\s-]*(reply|response)\b|out of (the )?office|undeliver(able|ed)|delivery status notification|mail delivery (failed|system|subsystem)|returned mail|read:|accepted:|declined:|tentative:)/i', $subj)) return 'automatic';
    if ($known) return '';
    if (preg_match('/^(no-?reply|do-?not-?reply|donotreply|noreply[._+-].*|.*[._-]no-?reply|mailer-daemon|postmaster|bounces?([+._-].*)?|notifications?|notify|alerts?|newsletters?|marketing|automated|auto-?confirm\w*|daemon)$/', $local)) return 'no-reply senders';
    if ($under($dom, comms_mail_services())) return 'services and notifications';
    return '';
}

/* One text part -> UTF-8 text. $enc = IMAP transfer encoding (3 base64, 4 quoted-printable); $charset from the part. */
function comms_mail_text($raw, $enc, $charset, $isHtml) {
    $s = comms_vm_decode((string)$raw, (int)$enc);
    $cs = strtoupper(trim((string)$charset, " \t\"'"));
    if ($cs === '' || $cs === 'US-ASCII' || $cs === 'ASCII') $cs = 'UTF-8';
    if ($cs === 'ISO-8859-1' || $cs === 'LATIN1' || $cs === 'ISO_8859-1') $cs = 'WINDOWS-1252';   // what "Latin-1" mail really is
    if ($cs !== 'UTF-8' && $cs !== 'UTF8') {
        $t = @iconv($cs, 'UTF-8//IGNORE', $s);
        if (($t === false || $t === '') && function_exists('mb_convert_encoding')) $t = @mb_convert_encoding($s, 'UTF-8', $cs);
        if ($t !== false && $t !== null && $t !== '') $s = $t;
    }
    $s = comms_mail_utf8($s);
    return $isHtml ? comms_mail_html_text($s) : $s;
}
function comms_mail_html_text($h) {
    $h = preg_replace('#<(script|style|head|title)\b[^>]*>.*?</\1\s*>#is', ' ', (string)$h);
    $h = preg_replace('#<blockquote\b[^>]*>.*?</blockquote\s*>#is', "\n", $h);                  // quoted history
    $h = preg_replace('#<div[^>]*(gmail_quote|divRplyFwdMsg|OutlookMessageHeader)[^>]*>.*$#is', "\n", $h);   // the reply's quoted tail
    $h = preg_replace('#</(p|h[1-6])\s*>#i', "\n\n", $h);                                       // a paragraph: a blank line after it
    $h = preg_replace('#<(br|/div|/tr|/li)\b[^>]*>#i', "\n", $h);
    $h = preg_replace('#<li\b[^>]*>#i', "\n- ", $h);
    $s = html_entity_decode(strip_tags($h), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $s = str_replace("\xC2\xA0", ' ', $s);
    return preg_replace("/\n{3,}/", "\n\n", preg_replace("/[ \t]+\n/", "\n", $s));
}
/* What they wrote: the quoted history and the "Sent from my iPhone" tail cut off. A message that is ONLY a forward keeps
   the forwarded text (that is what they are showing us). */
function comms_mail_strip($t) {
    $t = str_replace(array("\r\n", "\r"), "\n", (string)$t);
    $lines = explode("\n", $t); $n = count($lines); $cut = $n; $fwd = false;
    for ($i = 0; $i < $n; $i++) {
        $l = trim($lines[$i]); $next = $i + 1 < $n ? trim($lines[$i + 1]) : '';
        if ($l !== '' && $l[0] === '>') { $cut = $i; break; }
        if (preg_match('/^On .{3,250}wrote:$/i', $l) || (preg_match('/^On .{3,200}$/i', $l) && preg_match('/wrote:$/i', $next))) { $cut = $i; break; }
        if (preg_match('/^-{2,}\s*Original Message\s*-{2,}$/i', $l) || preg_match('/^_{8,}$/', $l)) { $cut = $i; break; }
        if (preg_match('/^-{2,}\s*Forwarded message\s*-{2,}$/i', $l) || preg_match('/^Begin forwarded message:?$/i', $l)) { $cut = $i; $fwd = true; break; }
        if (preg_match('/^(From|Van|Von|De):\s+\S/', $l)) {
            for ($k = $i + 1; $k <= min($n - 1, $i + 4); $k++) if (preg_match('/^(Sent|Date|Verzonden|Gesendet|Envoy\x{00E9}):\s/u', trim($lines[$k]))) { $cut = $i; break 2; }
        }
        if ($lines[$i] === '-- ' || $l === '--') { $cut = $i; break; }
        if (preg_match('/^(Sent from (my )?(iPhone|iPad|Samsung|Galaxy|Android|mobile|Outlook|Mail for Windows|Yahoo Mail)|Get Outlook for (iOS|Android))/i', $l)) { $cut = $i; break; }
    }
    $kept = trim(implode("\n", array_slice($lines, 0, $cut)));
    if ($kept === '' && $fwd) $kept = trim(implode("\n", array_slice($lines, $cut + 1)));   // only a forward: show what they forwarded
    if ($kept === '' && $cut < $n && !$fwd) $kept = trim($t);                               // nothing above the cut: show it all
    $kept = preg_replace("/\n{3,}/", "\n\n", $kept);
    return function_exists('mb_substr') ? mb_substr($kept, 0, 2500) : substr($kept, 0, 2500);
}
/* A UK number written in the message (not one of ours), as tm_number() writes it, or ''. */
function comms_mail_phone($text) {
    if (!preg_match_all('/(\+44[\s\d()\-]{9,17}|\b0[127]\d[\d\s\-]{7,12}\d)/', (string)$text, $mm)) return '';
    foreach ($mm[1] as $c) {
        $n = tm_number(str_replace('(0)', '', $c));   // "+44 (0)1202 ..." is written with the trunk 0 in brackets
        if ($n !== '' && $n !== '+441202775566' && $n !== '+447520615332') return $n;
    }
    return '';
}

/* People we hold, by email address: our customer records, then the job list. 'mail:<address>' => {name, src}. */
function comms_mail_known_map($dbFile = null, $jobsFile = null) {
    $out = array();
    $db = @json_decode((string)@file_get_contents($dbFile !== null ? $dbFile : __DIR__ . '/pcm-data.json'), true);
    $put = function ($e, $name, $src) use (&$out) {
        $e = strtolower(trim((string)$e));
        if (!preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $e) || trim((string)$name) === '' || isset($out['mail:' . $e])) return;
        $out['mail:' . $e] = array('name' => function_exists('mb_substr') ? mb_substr(trim($name), 0, 60) : substr(trim($name), 0, 60), 'src' => $src);
    };
    $jf = array('email', 'sb_email', 'contact_email', 'billing_email', 'bk_email');
    foreach ((is_array($db) && isset($db['customers']) && is_array($db['customers'])) ? $db['customers'] : array() as $cid => $c) {
        if (!is_array($c)) continue;
        $nm = isset($c['name']) ? (string)$c['name'] : '';
        foreach ($jf as $k) if (!empty($c[$k]) && is_scalar($c[$k])) $put($c[$k], $nm, 'customer');
        if (!empty($c['org']['members']) && is_array($c['org']['members'])) foreach ($c['org']['members'] as $mk => $mb) {
            if (is_array($mb) && !empty($mb['email'])) $put($mb['email'], (!empty($mb['name']) ? $mb['name'] : $mk) . ' at ' . $nm, 'customer');
        }
    }
    $jd = @json_decode((string)@file_get_contents($jobsFile !== null ? $jobsFile : __DIR__ . '/pcm-jobs.json'), true);
    $jobs = (isset($jd['jobs']) && is_array($jd['jobs'])) ? array_reverse($jd['jobs']) : array();   // newest first: the first name kept wins
    foreach ($jobs as $j) if (is_array($j) && !empty($j['email']) && !empty($j['name'])) $put($j['email'], $j['name'], 'job');
    return $out;
}

/* ---------------- the poll ---------------- */
/* $io: the mailbox, as callables - validity(), search($since) -> msgnos, uid($n), header($n) -> raw, structure($n),
   body($n, $section) -> raw part (never marking it read), flags(array uids) -> uid => answered (bool). comms_mail_io()
   is the real one; the tests pass a fake. $announce($item) -> Slack ts or ''. */
function comms_mail_extract($io, $msgno) {
    $plain = null; $html = null; $attach = array();
    foreach (comms_vm_parts(call_user_func($io['structure'], $msgno)) as $pi) {
        $disp = isset($pi['disp']) ? $pi['disp'] : '';
        $named = $pi['name'] !== '';
        if ($disp === 'ATTACHMENT' || ($named && !($pi['type'] === 'TEXT' && $disp === 'INLINE')) || !in_array($pi['type'], array('TEXT'), true)) {
            if ($named && !($pi['type'] === 'IMAGE' && $disp !== 'ATTACHMENT') && count($attach) < 6) $attach[] = comms_mail_mime_decode($pi['name']);   // inline pictures (logos) are not listed
            continue;
        }
        if ($pi['bytes'] > 600000) continue;
        $cs = isset($pi['charset']) ? $pi['charset'] : '';
        if ($pi['sub'] === 'PLAIN' && $plain === null) $plain = comms_mail_text(call_user_func($io['body'], $msgno, $pi['sec']), $pi['enc'], $cs, false);
        elseif ($pi['sub'] === 'HTML' && $html === null) $html = comms_mail_text(call_user_func($io['body'], $msgno, $pi['sec']), $pi['enc'], $cs, true);
    }
    $text = ($plain !== null && trim($plain) !== '') ? $plain : (string)$html;
    return array('text' => comms_mail_strip($text), 'attach' => $attach);
}
function comms_mail_poll_box($box, $io, $now = null, $announce = null, $known = null, $blocked = null) {
    $now = $now === null ? time() : (int)$now;
    $known = is_array($known) ? $known : comms_mail_known_map();
    $blocked = is_array($blocked) ? $blocked : comms_blocked_list();   // 3 Oct 2026: senders staff blocked in the portal
    $validity = (int)call_user_func($io['validity']);
    list($okc, $cp) = comms_locked(function ($d) use ($box) { return array('__result' => isset($d['checkpoints']['mail'][$box['key']]) ? $d['checkpoints']['mail'][$box['key']] : null); });
    if (!$okc) return array('error' => 'busy');
    $first = !is_array($cp) || (int)$cp['validity'] !== $validity;   // a mailbox new to us (or renumbered): its window comes in quietly
    $lastUid = $first ? 0 : (int)$cp['uid'];
    $found = (array)call_user_func($io['search'], gmdate('j-M-Y', $now - MAIL_LOOKBACK_DAYS * 86400));
    sort($found);
    $new = 0; $posted = 0; $examined = 0; $maxUid = $lastUid; $left = array();
    foreach ($found as $msgno) {
        $uid = (int)call_user_func($io['uid'], $msgno);
        if ($uid <= $lastUid) continue;
        if ($examined >= MAIL_MAX_EXAMINE) break;
        $examined++;
        if ($uid > $maxUid) $maxUid = $uid;
        $m = comms_mail_head(call_user_func($io['header'], $msgno));
        $k = isset($known['mail:' . $m['from']]) ? $known['mail:' . $m['from']] : null;
        $why = comms_mail_skip($m, $k);
        if ($why === '' && !$k && comms_is_blocked($m['from'], $blocked) !== '') $why = 'blocked by you';   // never someone we hold
        if ($why !== '') { $left[$why] = (isset($left[$why]) ? $left[$why] : 0) + 1; continue; }
        $x = comms_mail_extract($io, $msgno);
        $num = comms_mail_phone($x['text']);
        $item = array('type' => 'email', 'ext_id' => 'mail-' . $box['key'] . '-' . $validity . '-' . $uid, 'at' => gmdate('c', $m['at'] > 0 ? $m['at'] : $now),
            'number' => $num, 'body' => $x['text'], 'audio' => '', 'duration' => '',
            'match' => $k ? array('status' => $k['src'] === 'customer' ? 'MATCH' : 'NO_MATCH', 'name' => $k['name'], 'cid' => '', 'why' => '') : array('status' => 'NO_MATCH', 'name' => '', 'cid' => '', 'why' => 'not an address we hold'),
            'handled' => false, 'handled_by' => '', 'handled_at' => '',
            'mail' => array('box' => $box['user'], 'from' => $m['from'], 'name' => $m['name'], 'reply_to' => $m['reply_to'],
                'subject' => function_exists('mb_substr') ? mb_substr($m['subject'], 0, 200) : substr($m['subject'], 0, 200), 'attach' => $x['attach'],
                'uid' => $uid, 'validity' => $validity, 'known' => $k));
        list($ok, $res) = comms_add_item($item);
        if (!$ok || !empty($res['duplicate'])) continue;
        $new++;
        if (!$first && $posted < MAIL_MAX_POSTS && $announce !== null) {
            $ts = (string)call_user_func($announce, $item);
            $posted++;
            if ($ts !== '') { $id = $res['id']; comms_locked(function ($d) use ($id, $ts) { foreach ($d['items'] as $i => $x2) if ($x2['id'] === $id) { $d['items'][$i]['slack_ts'] = $ts; $d['items'][$i]['slack_rc'] = 0; } return array('__data' => $d, '__result' => true); }); }
        }
    }
    $done = comms_mail_answered($box, $io, $validity, $now);
    comms_locked(function ($d) use ($box, $validity, $maxUid, $lastUid, $first, $now, $new, $left, $done) {
        if ($validity !== 0 && ($maxUid > $lastUid || $first)) $d['checkpoints']['mail'][$box['key']] = array('validity' => $validity, 'uid' => $maxUid);
        $d['checkpoints']['mail_status'][$box['key']] = comms_mail_status_add(isset($d['checkpoints']['mail_status'][$box['key']]) ? $d['checkpoints']['mail_status'][$box['key']] : null, $now, $new, $left, $done, '');
        return array('__data' => $d, '__result' => true);
    });
    return array('new' => $new, 'examined' => $examined, 'posted' => $posted, 'left_out' => $left, 'replied' => $done, 'first' => $first);
}
/* A mailbox's running totals for the day (UK time): what came in, what was left out and why, what was replied to from
   the mailbox. A single look usually reads one or two emails, so "today" is what the portal's line can say usefully. */
function comms_mail_status_add($prev, $now, $new, $left, $replied, $error) {
    $day = (new DateTime('@' . (int)$now))->setTimezone(new DateTimeZone('Europe/London'))->format('Y-m-d');
    $p = (is_array($prev) && (isset($prev['day']) ? $prev['day'] : '') === $day) ? $prev : array('new' => 0, 'left_out' => array(), 'replied' => 0);
    $lo = is_array($p['left_out']) ? $p['left_out'] : array();
    foreach ((array)$left as $k => $v) $lo[$k] = (isset($lo[$k]) ? (int)$lo[$k] : 0) + (int)$v;
    arsort($lo);
    return array('at' => (int)$now, 'day' => $day, 'new' => (int)$p['new'] + (int)$new, 'left_out' => $lo, 'replied' => (int)$p['replied'] + (int)$replied, 'error' => (string)$error);
}
/* Replied to from Outlook or webmail (\Answered on the server) -> done here, and a tick on its Slack post. */
function comms_mail_answered($box, $io, $validity, $now) {
    list($ok, $open) = comms_locked(function ($d) use ($box, $validity, $now) {
        $o = array();
        foreach ($d['items'] as $it) {
            if (($it['type'] ?? '') !== 'email' || !empty($it['handled']) || ($it['mail']['box'] ?? '') !== $box['user'] || (int)($it['mail']['validity'] ?? 0) !== $validity) continue;
            $st = strtotime((string)($it['stored_at'] ?? ''));
            if ($st !== false && $now - $st > 21 * 86400) continue;
            $o[$it['id']] = (int)($it['mail']['uid'] ?? 0);
        }
        return array('__result' => $o);
    });
    if (!$ok || !$open) return 0;
    $flags = (array)call_user_func($io['flags'], array_values(array_filter($open)));
    $ids = array(); foreach ($open as $id => $uid) if (!empty($flags[$uid])) $ids[$id] = 1;
    if (!$ids) return 0;
    $ticks = array();
    comms_locked(function ($d) use ($ids, $now, &$ticks) {
        foreach ($d['items'] as $i => $it) if (isset($ids[$it['id']])) {
            $d['items'][$i]['handled'] = true; $d['items'][$i]['handled_by'] = 'replied from the mailbox'; $d['items'][$i]['handled_at'] = gmdate('c', $now);
            if (!empty($it['slack_ts'])) $ticks[] = (string)$it['slack_ts'];
        }
        return array('__data' => $d, '__result' => true);
    });
    foreach (array_slice($ticks, 0, 8) as $ts) comms_slack_tick($ts);
    return count($ids);
}

/* The real mailbox. null when PHP has no IMAP or the server refuses (the error goes in the mailbox's status). */
function comms_mail_io($box, &$err = null) {
    if (!function_exists('imap_open')) { $err = 'PHP has no IMAP on this server'; return null; }
    if (function_exists('imap_timeout')) { @imap_timeout(IMAP_OPENTIMEOUT, 12); @imap_timeout(IMAP_READTIMEOUT, 20); }
    $mbox = '{' . $box['host'] . ':993/imap/ssl/novalidate-cert}' . $box['folder'];
    $im = @imap_open($mbox, $box['user'], $box['pass'], OP_READONLY, 1);
    if (!$im) { $e = function_exists('imap_errors') ? (array)@imap_errors() : array(); $err = 'could not open the mailbox' . ($e ? ' (' . mb_substr((string)end($e), 0, 120) . ')' : ''); return null; }   // the server's own reason: a wrong password, or no such server
    return array(
        'validity' => function () use ($im, $mbox) { $s = @imap_status($im, $mbox, SA_UIDVALIDITY); return ($s && isset($s->uidvalidity)) ? (int)$s->uidvalidity : 0; },
        'search' => function ($since) use ($im) { $f = @imap_search($im, 'SINCE "' . $since . '"'); return is_array($f) ? $f : array(); },
        'uid' => function ($n) use ($im) { return (int)@imap_uid($im, $n); },
        'header' => function ($n) use ($im) { return (string)@imap_fetchheader($im, $n); },
        'structure' => function ($n) use ($im) { return @imap_fetchstructure($im, $n); },
        'body' => function ($n, $sec) use ($im) { return (string)@imap_fetchbody($im, $n, $sec, FT_PEEK); },
        'flags' => function ($uids) use ($im) {
            $o = array();
            foreach (array_chunk(array_values($uids), 50) as $ch) {
                $ov = @imap_fetch_overview($im, implode(',', $ch), FT_UID);
                foreach (is_array($ov) ? $ov : array() as $x) if (isset($x->uid)) $o[(int)$x->uid] = !empty($x->answered);
            }
            return $o;
        },
        'close' => function () use ($im) { if (function_exists('imap_errors')) { @imap_errors(); @imap_alerts(); } @imap_close($im); },
    );
}

/* The Slack line for a new email (the bot posts it, so the item links to it at once). */
function comms_mail_announce($item) {
    if (!comms_slack_lib()) return '';
    $m = $item['mail'];
    $esc = function ($s) { return str_replace(array('&', '<', '>'), array('&amp;', '&lt;', '&gt;'), (string)$s); };
    $who = ($m['name'] !== '' ? $m['name'] . ' ' : '') . '<' . $m['from'] . '>';
    $snip = trim(preg_replace('/\s+/', ' ', (string)$item['body']));
    if (mb_strlen($snip) > 280) $snip = mb_substr($snip, 0, 280) . "\xE2\x80\xA6";
    $text = "\xF0\x9F\x93\xA7 Email from " . $esc($who) . ' to ' . $esc(strstr($m['box'] . '@', '@', true)) . '@'
        . ($m['subject'] !== '' ? ': *' . $esc(str_replace('*', '', $m['subject'])) . '*' : '')
        . ($snip !== '' ? "\n>" . $esc($snip) : '') . "\nIn the portal: Today > Messages.";
    $r = slk_call('chat.postMessage', array('channel' => COMMS_SLACK_CHANNEL, 'text' => $text, 'unfurl_links' => false, 'unfurl_media' => false), 8);
    if (!empty($r['ok']) && !empty($r['ts'])) return (string)$r['ts'];
    comms_slack($text);   // the webhook: the sweep links it by "Email from" + the address (comms_slack_sync)
    return '';
}

/* Every mailbox in mail-imap.php, one after another. */
function comms_mail_poll() {
    $boxes = comms_mail_config();
    if (!$boxes) return array('skipped' => 'mail-not-configured');
    $out = array('new' => 0, 'boxes' => array());
    $known = comms_mail_known_map();
    foreach ($boxes as $box) {
        $err = '';
        $io = comms_mail_io($box, $err);
        if (!$io) {
            comms_locked(function ($d) use ($box, $err) { $d['checkpoints']['mail_status'][$box['key']] = comms_mail_status_add(isset($d['checkpoints']['mail_status'][$box['key']]) ? $d['checkpoints']['mail_status'][$box['key']] : null, time(), 0, array(), 0, $err); return array('__data' => $d, '__result' => true); });
            $out['boxes'][$box['key']] = array('error' => $err);
            continue;
        }
        $r = comms_mail_poll_box($box, $io, null, 'comms_mail_announce', $known);
        call_user_func($io['close']);
        $out['boxes'][$box['key']] = $r;
        $out['new'] += (int)(isset($r['new']) ? $r['new'] : 0);
    }
    return $out;
}
