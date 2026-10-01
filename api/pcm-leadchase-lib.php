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
    // only posts our app or webhook made; a person's message in the channel is not a lead
    if (empty($m['bot_id']) && (!isset($m['subtype']) || $m['subtype'] !== 'bot_message')) return null;
    if (isset($m['subtype']) && !in_array($m['subtype'], array('bot_message', ''), true)) return null;
    $text = isset($m['text']) ? (string)$m['text'] : '';
    $all = lc_all_text($m);
    if (stripos($all, '[INTERNAL TEST]') !== false) return null;
    if (stripos($text, 'Service report not in the portal') !== false) return null;
    $plain = trim(preg_replace('/^(:[a-z0-9_+\-]+:|[^\x00-\x7F]+)\s*/u', '', $text));   // drop a leading emoji
    $plain = str_replace(array('*', '_'), '', $plain);

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

/* Answered? Any reaction, any thread reply; for texts and voicemails, the inbox's own record too.
   $inbox: comms items (type, number, at ISO, handled). */
function lc_answered($m, $lead, $inbox) {
    if (!empty($m['reactions'])) return true;
    if (!empty($m['reply_count'])) return true;
    if (($lead['kind'] === 'text' || $lead['kind'] === 'voicemail') && $lead['number'] !== '' && is_array($inbox)) {
        $t = (float)$m['ts'];
        foreach ($inbox as $it) {
            if (!is_array($it) || !isset($it['number']) || $it['number'] !== $lead['number']) continue;
            $at = strtotime((string)(isset($it['at']) ? $it['at'] : ''));
            if ($at === false) continue;
            $type = isset($it['type']) ? $it['type'] : '';
            if ($type === 'sms_out' && $at >= $t - 60) return true;                        // we texted back
            if (($type === 'sms_in' || $type === 'voicemail') && abs($at - $t) <= 900 && !empty($it['handled'])) return true;
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
   Returns array(due => [ [ts, lead, level, work] ...], open => count of unanswered leads seen). */
function lc_due($msgs, $inbox, $state, $now) {
    $due = array(); $open = 0;
    $nudged = (isset($state['nudged']) && is_array($state['nudged'])) ? $state['nudged'] : array();
    foreach ((array)$msgs as $m) {
        $lead = lc_lead($m);
        if (!$lead) continue;
        $ts = (string)$m['ts'];
        if ($now - (float)$ts > LC_MAX_AGE) continue;
        if (lc_answered($m, $lead, $inbox)) continue;
        $open++;
        $lvl = lc_level((float)$ts, $now);
        $had = isset($nudged[$ts]) ? (int)(is_array($nudged[$ts]) ? $nudged[$ts]['l'] : $nudged[$ts]) : 0;
        if ($lvl > $had) $due[] = array('ts' => $ts, 'lead' => $lead, 'level' => $lvl, 'work' => lc_work_secs((float)$ts, $now));
    }
    usort($due, function ($a, $b) { return strcmp($a['ts'], $b['ts']); });   // oldest first
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
        $when = (new DateTime('@' . (int)(float)$d['ts']))->setTimezone($tz)->format('D j M H:i');
        $link = isset($links[$d['ts']]) && $links[$d['ts']] !== '' ? ' <' . $links[$d['ts']] . '|open>' : '';
        $lines[] = "\xE2\x80\xA2 " . ($d['level'] >= 2 ? '*still waiting* - ' : '') . '*' . $esc($d['lead']['label']) . ':* '
            . $esc($d['lead']['who']) . ' (' . $when . ', ' . lc_age_words($d['work']) . ')' . $link;
    }
    $more = count($due) - count($lines);
    return ":alarm_clock: *Not answered yet* - add a :white_check_mark: to the post, or reply in its thread, once someone has been in touch:\n"
        . implode("\n", $lines) . ($more > 0 ? "\n...and " . $more . ' more.' : '');
}

/* Remember what was listed; forget anything past the age limit. */
function lc_record($state, $due, $now) {
    if (!isset($state['nudged']) || !is_array($state['nudged'])) $state['nudged'] = array();
    foreach ($due as $d) $state['nudged'][$d['ts']] = array('l' => (int)$d['level'], 'at' => (int)$now);
    foreach (array_keys($state['nudged']) as $ts) if ($now - (float)$ts > LC_MAX_AGE + 86400) unset($state['nudged'][$ts]);
    return $state;
}

}  // PCM_LEADCHASE_LIB
