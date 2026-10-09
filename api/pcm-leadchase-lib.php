<?php
/*
 * Lead chaser, the rules (1 Oct 2026). Pure functions: no I/O, so pcm-leadchase-test.php can pin every decision.
 *
 * WHY: the 25 Sep Search Console read found a Dell buyer who left two voicemails in a week and asked "are you still
 * trading?", and the 1 Oct read found a website enquiry for a refurbished Latitude with no reaction or reply in Slack a
 * day later. Leads land in #365-job-tracker among bookings, service records and sign-in codes, so they scroll away.
 * The owner: "answer every call the same working day" and "reply to Dell picker quotes the same day" - "do it".
 *
 * WHAT COUNTS AS A LEAD (posts in #365-job-tracker, all posted by our own app or webhook):
 *   web       "New website enquiry" (slack-lead.php: the contact forms, the Dell picker, the Virgin GBP 60 ring-me-back),
 *             "Website enquiry (no-JS fallback)" (form-relay.php), "New AI opportunity" (ai-lead.php)
 *   callback  "Virgin email move: please ring" (PC Manager's Stuck? card), "Booking started but never finished"
 *   voicemail "Voicemail from" (comms-lib.php) - every caller, customer or not: calls are the leak
 *   text      "Text from" (comms-lib.php) - only from a number we do not hold (a customer's text is an ongoing
 *             conversation the team already works), and never a short "thanks" / "ok" / "yes ..." reply
 * Never: a service report ("Service report not in the portal"), anything marked [INTERNAL TEST], a person's own post.
 *
 * ANSWERED when the post has ANY reaction (a tick is the house habit) or ANY thread reply; for a text or voicemail
 * also when the comms inbox marks that item handled, or a text went back to that number from the inbox afterwards.
 *
 * WHEN: working time only (Mon-Fri 09:00-17:00 UK). A lead unanswered for 2 working hours is listed once; still
 * unanswered after a full working day (8 working hours) it is listed once more, then left alone. Leads older than 7
 * days are never listed. Everything due in one sweep goes out as ONE Slack message.
 *
 * NO closing tag in this file.
 */

if (!defined('PCM_LEADCHASE_LIB')) {
define('PCM_LEADCHASE_LIB', 1);

define('LC_LEVEL1', 7200);          // 2 working hours
define('LC_LEVEL2', 28800);         // a full working day
define('LC_MAX_AGE', 7 * 86400);    // older leads are never listed
define('LC_MAX_LINES', 12);         // lines in one reminder; the rest are counted

/* Everything Slack gives us as text for a message: the fallback text plus every block's text, flattened. */
function lc_all_text($m) {
    $t = isset($m['text']) ? (string)$m['text'] : '';
    $walk = function ($v) use (&$walk, &$t) {
        if (is_array($v)) {
            foreach ($v as $k => $x) {
                if ($k === 'text' && is_string($x)) $t .= "\n" . $x;
                else $walk($x);
            }
        }
    };
    if (isset($m['blocks'])) $walk($m['blocks']);
    return $t;
}

/* A short acknowledgement ("Thanks David", "ok", "Yes 122 ... Road") is a reply in a chat already going, not a lead. */
function lc_is_ack($body) {
    $b = trim(preg_replace('/\s+/', ' ', (string)$body));
    if ($b === '' || strpos($b, '?') !== false || mb_strlen($b) > 40) return false;
    return (bool)preg_match('/^(thanks|thank you|thank u|thx|ty|cheers|ta|ok|okay|k|great|perfect|brilliant|lovely|fab|super|'
        . 'will do|no problem|np|yes|yep|yeah|no|nope|done|got it|sounds good|see you|bye|\x{1F44D}|\x{1F64F}|\x{1F60A})\b/iu', $b)
        || (bool)preg_match('/^[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\s]+$/u', $b);
}

/* The UK number in a post, as tm_number() writes it (+447..., +441...), or ''. */
function lc_number($s) {
    return preg_match('/\+44\d{9,10}/', (string)$s, $m) ? $m[0] : '';
}

/* Classify one #365-job-tracker message. Returns null (not a lead) or array(kind, label, who, number). */
function lc_lead($m) {
    if (!is_array($m) || empty($m['ts'])) return null;
    // only posts our app or webhook made; a person's message in the channel is not a lead. A voicemail RECORDING
    // (comms_vm_announce, 1 Oct 2026) is a file share from the app - accepted for voicemails only, below.
    $sub = isset($m['subtype']) ? (string)$m['subtype'] : '';
    $isBot = !empty($m['bot_id']) || $sub === 'bot_message';
    if ($sub !== '' && $sub !== 'bot_message' && $sub !== 'file_share') return null;
    if (!$isBot && $sub !== 'file_share') return null;
    $text = isset($m['text']) ? (string)$m['text'] : '';
    $all = lc_all_text($m);
    if (stripos($all, '[INTERNAL TEST]') !== false) return null;
    if (stripos($text, 'Service report not in the portal') !== false) return null;
    // 6 Oct 2026: Service Pass posts each 6-weekly report through the same "New website enquiry" relay (email
    // service-report@, "via ServicePass"). Every report on a Latitude or OptiPlex was listed as an unanswered
    // "Dell quote", the rest as "Website enquiry" - noise that buried the real Dell quotes in the reminders.
    if (stripos($all, 'service-report@365techies.co.uk') !== false || preg_match('/via ServicePass|6-weekly service report/i', $all)) return null;
    $plain = trim(preg_replace('/^(:[a-z0-9_+\-]+:|[^\x00-\x7F]+)\s*/u', '', $text));   // drop a leading emoji
    $plain = str_replace(array('*', '_'), '', $plain);
    if (!$isBot && !preg_match('/^Voicemail from /', $plain)) return null;   // a person's own file is never a lead

    if (preg_match('/^New website enquiry(?: from (.+?))?(?: <[^>]*>)?\s*$/s', strtok($plain, "\n"), $mm)) {
        $who = isset($mm[1]) ? trim(preg_replace('/<mailto:[^|>]*\|([^>]*)>/', '$1', $mm[1])) : '';
        $who = trim(preg_replace('/\s*<[^>]*>\s*$/', '', $who));
        // no name in the summary line: the post's own "Name:" field (the layout Slack shows)
        if ($who === '' && preg_match('/\*?Name:\*?\s*\n\s*([^\n*]+)/', $all, $nm)) $who = trim($nm[1]);
        $label = 'Website enquiry';
        if (preg_match('/dell-hardware|refurbished|looking_for|Latitude|OptiPlex/i', $all)) $label = 'Dell quote';
        elseif (preg_match('/Virgin email move|virgin_addresses/i', $all)) $label = 'Email move (ring-me-back)';
        return array('kind' => 'web', 'label' => $label, 'who' => $who !== '' ? $who : 'no name given', 'number' => lc_number($all));
    }
    if (stripos($plain, 'Website enquiry (no-JS fallback)') === 0) {
        $who = preg_match('/^Name:\s*(.+)$/mi', $plain, $mm) ? trim($mm[1]) : 'no name given';
        return array('kind' => 'web', 'label' => 'Website enquiry', 'who' => $who, 'number' => lc_number($plain));
    }
    if (preg_match('/^New AI opportunity\b.*? from (.+)$/m', $plain, $mm)) {
        return array('kind' => 'web', 'label' => 'AI enquiry', 'who' => trim($mm[1]), 'number' => lc_number($all));
    }
    if (preg_match('/^Virgin email move: please ring (.+?) on (.+)$/m', $plain, $mm)) {
        return array('kind' => 'callback', 'label' => 'Email move call-back', 'who' => trim($mm[1]) . ' (' . trim($mm[2]) . ')', 'number' => lc_number($all));
    }
    // the 365 Get Help browser add-on's "Ring me back" (pcm-gethelp.php, 2 Oct 2026)
    if (preg_match('/^Get Help button: please ring (.+?) on (.+)$/m', $plain, $mm)) {
        return array('kind' => 'callback', 'label' => 'Get Help button', 'who' => trim($mm[1]) . ' (' . trim($mm[2]) . ')', 'number' => lc_number($all));
    }
    // PC Manager's free month: "send my report for a free look-over" (pcm-lookover.php lo_card, 9 Oct 2026) - an email back
    if (preg_match('/^Report look-over: please email (.+?) at (\S+@\S+)\s*$/m', $plain, $mm)) {
        return array('kind' => 'web', 'label' => 'Report look-over', 'who' => trim($mm[1]), 'number' => lc_number($all));
    }
    if (preg_match('/^Booking started but never finished\s*-\s*(.+)$/m', $plain, $mm)) {
        return array('kind' => 'callback', 'label' => 'Unfinished booking', 'who' => trim(strtok($mm[1], "\n")), 'number' => lc_number($all));
    }
    if (preg_match('/^Voicemail from (.+)$/m', $plain, $mm)) {
        return array('kind' => 'voicemail', 'label' => 'Voicemail', 'who' => trim($mm[1]), 'number' => lc_number($plain));
    }
    if (preg_match('/^Text from (.+?): (.*)$/s', $plain, $mm)) {
        $who = trim($mm[1]);
        $body = trim(preg_replace('/\nReply from\b.*$/s', '', $mm[2]));
        // a customer we hold is an ongoing conversation; an unknown, unmatched or "possibly" number is a new person
        $unknown = $who !== '' && ($who[0] === '+' || stripos($who, 'Textmagic contact list') !== false);
        if (!$unknown || lc_is_ack($body)) return null;
        $snip = mb_substr(preg_replace('/\s+/', ' ', $body), 0, 60);
        return array('kind' => 'text', 'label' => 'Text', 'who' => preg_replace('/ \(not a number we hold\)$/', '', $who) . ': "' . $snip . (mb_strlen($body) > 60 ? '...' : '') . '"',
            'number' => lc_number($who));
    }
    return null;
}

/* The comms inbox item behind a text or voicemail post: same number, and stored when the post went out (stored_at,
   within 5 minutes) or - for older items without it - received then (at, within 15). A catch-up import posts days-old
   voicemails all at once, so stored_at is what ties a post to its item. null when none. */
function lc_inbox_item($m, $lead, $inbox) {
    if (($lead['kind'] !== 'text' && $lead['kind'] !== 'voicemail') || $lead['number'] === '' || !is_array($inbox)) return null;
    $t = (float)$m['ts'];
    $want = $lead['kind'] === 'text' ? 'sms_in' : 'voicemail';
    $best = null; $bestGap = 1e9;
    foreach ($inbox as $it) {
        if (!is_array($it) || ($it['number'] ?? '') !== $lead['number'] || ($it['type'] ?? '') !== $want) continue;
        $st = strtotime((string)($it['stored_at'] ?? ''));
        $at = strtotime((string)($it['at'] ?? ''));
        $gap = ($st !== false && abs($st - $t) <= 300) ? abs($st - $t) : (($at !== false && abs($at - $t) <= 900) ? abs($at - $t) + 300 : 1e9);
        if ($gap < $bestGap) { $best = $it; $bestGap = $gap; }
    }
    return $best;
}

/* When it really happened: the voicemail's or text's own time when the inbox knows it, else the post's. */
function lc_real_time($m, $item) {
    $at = $item ? strtotime((string)($item['at'] ?? '')) : false;
    return ($at !== false && $at > 0 && $at <= (float)$m['ts'] + 60) ? (float)$at : (float)$m['ts'];
}

/* Answered? Any reaction, any thread reply; for texts and voicemails, the inbox's own record too: that item marked
   handled, or a text sent back to the number after it arrived. $inbox: comms items. */
// the 365 techies app's own Slack user: its replies (a voicemail's recording posted under the line) are not an answer
define('LC_BOT_USERS', 'U0BJCHP9G3W');
function lc_answered($m, $lead, $inbox, $bots = null) {
    if (!empty($m['reactions'])) return true;
    if (!empty($m['reply_count'])) {
        $bots = $bots === null ? explode(',', LC_BOT_USERS) : (array)$bots;
        $people = isset($m['reply_users']) && is_array($m['reply_users']) ? array_diff($m['reply_users'], $bots) : array('?');
        if ($people) return true;   // someone replied (or Slack did not say who: count it, as before)
    }
    /* 2 Oct 2026: website enquiries and call-back requests are inbox items too now (comms-lib comms_lead_item), linked to
       their post by slack_ts: Done in the portal is an answer even when the tick on the post could not be added. */
    if (($lead['kind'] === 'web' || $lead['kind'] === 'callback') && is_array($inbox)) {
        foreach ($inbox as $it) if (is_array($it) && ($it['type'] ?? '') === 'web' && (string)($it['slack_ts'] ?? '') === (string)$m['ts'] && !empty($it['handled'])) return true;
    }
    if (($lead['kind'] === 'text' || $lead['kind'] === 'voicemail') && $lead['number'] !== '' && is_array($inbox)) {
        $item = lc_inbox_item($m, $lead, $inbox);
        if ($item && !empty($item['handled'])) return true;
        $t = lc_real_time($m, $item);
        foreach ($inbox as $it) {
            if (!is_array($it) || ($it['number'] ?? '') !== $lead['number'] || ($it['type'] ?? '') !== 'sms_out') continue;
            $at = strtotime((string)($it['at'] ?? ''));
            if ($at !== false && $at >= $t - 60) return true;                               // we texted back
        }
    }
    return false;
}

/* Working seconds (Mon-Fri 09:00-17:00 UK) between two moments. */
function lc_work_secs($from, $to) {
    if ($to <= $from) return 0;
    $tz = new DateTimeZone('Europe/London');
    $d = (new DateTime('@' . (int)$from))->setTimezone($tz);
    $d->setTime(0, 0, 0);
    $sum = 0;
    for ($i = 0; $i < 400; $i++) {
        $dow = (int)$d->format('N');
        if ($dow <= 5) {
            $s = (clone $d)->setTime(9, 0, 0)->getTimestamp();
            $e = (clone $d)->setTime(17, 0, 0)->getTimestamp();
            $a = max($s, (int)$from); $b = min($e, (int)$to);
            if ($b > $a) $sum += $b - $a;
        }
        $d->modify('+1 day');
        if ($d->getTimestamp() > $to) break;
    }
    return $sum;
}

/* May a reminder go out now? Mon-Fri 09:00-17:30 UK. */
function lc_post_window($now) {
    $d = (new DateTime('@' . (int)$now))->setTimezone(new DateTimeZone('Europe/London'));
    $dow = (int)$d->format('N'); $hm = (int)$d->format('Hi');
    return $dow <= 5 && $hm >= 900 && $hm < 1730;
}

/* Which level a lead has reached (0, 1 or 2) at $now. */
function lc_level($ts, $now) {
    $w = lc_work_secs((int)$ts, (int)$now);
    if ($w >= LC_LEVEL2) return 2;
    if ($w >= LC_LEVEL1) return 1;
    return 0;
}

/* The decision for one sweep. $msgs: conversations.history messages; $state['nudged'][ts] = level already listed.
   Voicemails and texts from one number are ONE line (a caller who rang five times needs one call back).
   Returns array(due => [ [ts (newest post), tss (every post in the line), t (when it happened), lead, level, work,
   count] ...] oldest first, open => unanswered leads seen). */
function lc_due($msgs, $inbox, $state, $now) {
    $open = 0; $groups = array();
    $nudged = (isset($state['nudged']) && is_array($state['nudged'])) ? $state['nudged'] : array();
    foreach ((array)$msgs as $m) {
        $lead = lc_lead($m);
        if (!$lead) continue;
        $ts = (string)$m['ts'];
        $t = lc_real_time($m, lc_inbox_item($m, $lead, $inbox));
        if ($now - $t > LC_MAX_AGE) continue;
        if (lc_answered($m, $lead, $inbox)) continue;
        $open++;
        $had = isset($nudged[$ts]) ? (int)(is_array($nudged[$ts]) ? $nudged[$ts]['l'] : $nudged[$ts]) : 0;
        $key = (($lead['kind'] === 'voicemail' || $lead['kind'] === 'text') && $lead['number'] !== '') ? $lead['kind'] . '|' . $lead['number'] : 'ts|' . $ts;
        $groups[$key][] = array('ts' => $ts, 't' => $t, 'lead' => $lead, 'lvl' => lc_level($t, $now), 'had' => $had);
    }
    $due = array();
    foreach ($groups as $g) {
        usort($g, function ($a, $b) { return $a['t'] < $b['t'] ? -1 : ($a['t'] > $b['t'] ? 1 : 0); });
        $lvl = 0; $fresh = false;
        foreach ($g as $c) { $lvl = max($lvl, $c['lvl']); if ($c['lvl'] > $c['had']) $fresh = true; }
        if (!$fresh) continue;
        $last = $g[count($g) - 1];
        $due[] = array('ts' => $last['ts'], 'tss' => array_map(function ($c) { return $c['ts']; }, $g), 't' => $last['t'],
            'first' => $g[0]['t'], 'lead' => $last['lead'], 'level' => $lvl, 'work' => lc_work_secs($g[0]['t'], $now), 'count' => count($g));
    }
    usort($due, function ($a, $b) { return $a['first'] < $b['first'] ? -1 : ($a['first'] > $b['first'] ? 1 : 0); });   // oldest first
    return array('due' => $due, 'open' => $open);
}

function lc_age_words($work) {
    $h = (int)floor($work / 3600);
    if ($work >= LC_LEVEL2) { $d = max(1, (int)floor($work / LC_LEVEL2)); return $d . ' working day' . ($d === 1 ? '' : 's'); }
    return $h . ' working hour' . ($h === 1 ? '' : 's');
}

/* The one Slack message for a sweep. $links[ts] = permalink (optional). Slack mrkdwn; names escaped. */
function lc_message($due, $links, $now) {
    if (!$due) return '';
    $tz = new DateTimeZone('Europe/London');
    $esc = function ($s) { return str_replace(array('&', '<', '>'), array('&amp;', '&lt;', '&gt;'), (string)$s); };
    $lines = array();
    foreach (array_slice($due, 0, LC_MAX_LINES) as $d) {
        $when = (new DateTime('@' . (int)(isset($d['t']) ? $d['t'] : (float)$d['ts'])))->setTimezone($tz)->format('D j M H:i');
        $link = isset($links[$d['ts']]) && $links[$d['ts']] !== '' ? ' <' . $links[$d['ts']] . '|open>' : '';
        $n = isset($d['count']) ? (int)$d['count'] : 1;
        $label = $d['lead']['label'] . ($n > 1 ? ' x' . $n : '');
        // a voicemail or text: straight to that caller's inbox thread, where the recording plays and replies go
        if (($d['lead']['kind'] === 'voicemail' || $d['lead']['kind'] === 'text') && $d['lead']['number'] !== '') {
            $link .= ' <https://365techies.co.uk/api/comms.php?n=' . rawurlencode($d['lead']['number']) . '|' . ($d['lead']['kind'] === 'voicemail' ? 'play it' : 'reply') . '>';
        }
        $lines[] = "\xE2\x80\xA2 " . ($d['level'] >= 2 ? '*still waiting* - ' : '') . '*' . $esc($label) . ':* '
            . $esc($d['lead']['who']) . ' (' . ($n > 1 ? 'latest ' : '') . $when . ', ' . lc_age_words($d['work']) . ')' . $link;
    }
    $more = count($due) - count($lines);
    return ":alarm_clock: *Not answered yet* - add a :white_check_mark: to the post, or reply in its thread, once someone has been in touch:\n"
        . implode("\n", $lines) . ($more > 0 ? "\n...and " . $more . ' more.' : '');
}

/* Remember what was listed; forget anything past the age limit. */
function lc_record($state, $due, $now) {
    if (!isset($state['nudged']) || !is_array($state['nudged'])) $state['nudged'] = array();
    foreach ($due as $d) foreach ((isset($d['tss']) ? $d['tss'] : array($d['ts'])) as $ts) $state['nudged'][$ts] = array('l' => (int)$d['level'], 'at' => (int)$now);
    foreach (array_keys($state['nudged']) as $ts) if ($now - (float)$ts > LC_MAX_AGE + 86400) unset($state['nudged'][$ts]);
    return $state;
}

}  // PCM_LEADCHASE_LIB
