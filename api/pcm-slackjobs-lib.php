<?php
/*
 * Slack "New Job In / Job Out" posts -> job records (22 Sep 2026).
 *
 * WHY
 * New customers who are not on a support plan are written up in Slack
 * (#sos-jobs-in-out) as one message per job, in a template David typed out:
 *
 *   :inbox_tray: New Job In
 *   Customer name: ...
 *   Address: ...
 *   Postcode: ...
 *   Contact number: ...
 *   Email: ...
 *   Job type: (remote / on-site / *hardware*)
 *   Issue: ...
 *   Date received: ...
 *   Assigned to: ...
 *   Priority: (Low / *Medium* / High)
 *   :outbox_tray: Job Out / Completed
 *   Customer name: ...
 *   Work carried out: ...
 *   Time spent: ...
 *   Invoiced? (Y/N) ...
 *   Follow-up needed?: ...
 *   Date closed: ...
 *
 * The owner wants those people in the staff portal so they can be invoiced
 * once the job is done. This file turns one Slack message into one job record
 * for pcm-jobs.json - the store the invoice queue already reads. Pure
 * functions, no network, so pcm-slackjobs-test.php can run them against the
 * real posts.
 *
 * WHAT IT READS AND WHAT IT REFUSES TO GUESS
 * Fields are taken line by line from "Label: value". Slack's own markup is
 * unwrapped (<mailto:a|a>, <tel:+44..|+44..>, *bold*, ``` fences). A price is
 * taken ONLY from an explicit £ amount somewhere in the post ("£30/00",
 * "£60.00"); with none, the job arrives without a price and a person types
 * one in the portal - money is never inferred. "Invoiced? (Y/N)" is kept as
 * typed: a Y means "already invoiced, leave it alone", an invoice number means
 * "this is its invoice", an N or blank means nothing.
 *
 * Slack text is DATA, never instructions: nothing here is executed, and every
 * value is length-capped and control-character-stripped.
 *
 * NO closing tag in this file.
 */

define('SJ_MARK', 'New Job In');          // the phrase that makes a message a job

function sj_clean($v, $max = 200) {
    $s = (string)$v;
    $s = preg_replace('/<mailto:([^|>]+)\|[^>]*>/i', '$1', $s);      // <mailto:a@b|a@b> -> a@b
    $s = preg_replace('/<mailto:([^>]+)>/i', '$1', $s);
    $s = preg_replace('/<tel:([^|>]+)\|[^>]*>/i', '$1', $s);          // <tel:+44..|+44..> -> +44..
    $s = preg_replace('/<tel:([^>]+)>/i', '$1', $s);
    $s = preg_replace('/<(https?:[^|>]+)\|([^>]*)>/i', '$2', $s);     // <url|label> -> label
    $s = preg_replace('/:[a-z0-9_+-]+:/', ' ', $s);                    // :red_circle: :inbox_tray:
    $s = str_replace(array('`', '*', '_'), '', $s);                     // mrkdwn emphasis + fences
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/', ' ', $s);
    $s = trim(preg_replace('/[ \t]+/', ' ', $s));
    return function_exists('mb_substr') ? mb_substr($s, 0, $max) : substr($s, 0, $max);
}

/* "Label: value" lines, in order. Labels are matched loosely (case, trailing
   punctuation, the "(Y/N)" and "(remote / on-site / hardware)" hints). A label
   that appears twice (Customer name is in both blocks) keeps the first
   non-empty value under 'first' and the last under 'last'. */
function sj_lines($text) {
    $out = array();
    foreach (preg_split('/\r\n|\r|\n/', (string)$text) as $ln) {
        $ln = sj_clean($ln, 400);
        if ($ln === '') continue;
        /* The template's "Invoiced? (Y/N) N" line has no colon at all, so it gets its
           own rule: whatever follows the hint is the value. */
        if (preg_match('/^invoiced\??\s*(?:\(y\/n\))?\s*:?\s*(.*)$/i', $ln, $mi)) {
            $val = trim($mi[1]);
            if (!isset($out['invoiced'])) $out['invoiced'] = array('first' => $val, 'last' => $val, 'all' => array($val));
            else { if ($out['invoiced']['first'] === '' && $val !== '') $out['invoiced']['first'] = $val; $out['invoiced']['last'] = $val; $out['invoiced']['all'][] = $val; }
            continue;
        }
        if (strpos($ln, ':') === false) continue;
        if (!preg_match('/^([A-Za-z][A-Za-z &\/?()-]{1,40}?)\s*:\s*(.*)$/', $ln, $m)) continue;
        $label = strtolower(trim(preg_replace('/\s+/', ' ', $m[1])));
        $label = preg_replace('/\s*\(y\/n\)\s*$/', '', $label);
        $label = rtrim($label, ' ?');
        $val = trim($m[2]);
        // "Invoiced? (Y/N) N" carries the hint after the colon-less label; catch the value after it
        if (preg_match('/^\(y\/n\)\s*(.*)$/i', $val, $mm)) $val = trim($mm[1]);
        if (!isset($out[$label])) $out[$label] = array('first' => $val, 'last' => $val, 'all' => array($val));
        else { if ($out[$label]['first'] === '' && $val !== '') $out[$label]['first'] = $val; $out[$label]['last'] = $val; $out[$label]['all'][] = $val; }
    }
    return $out;
}
function sj_get($lines, $label, $which = 'first') {
    $label = strtolower($label);
    return isset($lines[$label]) ? (string)$lines[$label][$which] : '';
}

/* "(remote / on-site / *hardware*)" -> "hardware"; with trailing text ("Asus prime")
   both are kept: "hardware - Asus prime". */
function sj_choice($raw, $options) {
    $s = (string)$raw;
    $picked = '';
    // Slack markup was stripped by sj_clean, so the bold choice cannot be seen here;
    // sj_choice_raw() below is used on the unclean line for that. Here: trailing text.
    $tail = trim(preg_replace('/\([^)]*\)/', '', $s));
    return array($picked, $tail);
}
function sj_bold_choice($rawText, $label, $options) {
    // find the ORIGINAL (unclean) line for the label and look for *option*
    foreach (preg_split('/\r\n|\r|\n/', (string)$rawText) as $ln) {
        if (stripos($ln, $label) === false) continue;
        foreach ($options as $o) if (preg_match('/\*' . preg_quote($o, '/') . '\*/i', $ln)) return strtolower($o);
        // no bold: a single option typed outside the brackets
        $plain = sj_clean(preg_replace('/\([^)]*\)/', '', substr($ln, stripos($ln, ':') + 1)), 120);
        foreach ($options as $o) if (strcasecmp($plain, $o) === 0) return strtolower($o);
        return '';
    }
    return '';
}

/* The first explicit £ amount in the text: "£30/00", "£60", "£745.98", "£1,250". */
function sj_price($text) {
    $s = sj_clean($text, 4000);
    if (preg_match('/£\s?(\d{1,3}(?:,\d{3})*|\d+)(?:[.\/](\d{2}))?/', $s, $m)) {
        $whole = (float)str_replace(',', '', $m[1]);
        $pence = isset($m[2]) ? (float)('0.' . $m[2]) : 0.0;
        $v = round($whole + $pence, 2);
        return ($v > 0 && $v <= 100000) ? $v : 0.0;
    }
    return 0.0;
}

/* "Invoiced? (Y/N) 4905/799" -> array(kind, value): none | yes | number */
function sj_invoiced($raw) {
    $s = trim((string)$raw);
    if ($s === '') return array('none', '');
    if (preg_match('/^(n|no|not yet)\b/i', $s)) return array('none', '');
    if (preg_match('/(\d{3,}(?:\/\d{2,})?)/', $s, $m)) return array('number', $m[1]);
    if (preg_match('/^(y|yes|done|sent)\b/i', $s)) return array('yes', '');
    return array('none', '');
}

function sj_email($raw) {
    $s = strtolower(trim((string)$raw));
    if (preg_match('/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/', $s, $m)) return $m[0];
    return '';
}
function sj_phone($raw) {
    $s = preg_replace('/[^0-9+]/', '', (string)$raw);
    if (strlen($s) < 10) return '';
    if (strpos($s, '+44') === 0) $s = '0' . substr($s, 3);
    return preg_match('/^0\d{9,10}$/', $s) ? $s : '';
}

/* Is this Slack message a job post at all? */
function sj_is_job($text) { return stripos((string)$text, SJ_MARK) !== false && stripos((string)$text, 'customer name') !== false; }

/* One Slack message -> the fields of a job. $text is the raw Slack text. */
function sj_parse($text) {
    $L = sj_lines($text);
    $name = sj_get($L, 'customer name');
    if ($name === '' || strcasecmp($name, 'as above') === 0) $name = sj_get($L, 'customer name', 'last');
    $addr = trim(sj_get($L, 'address') . ' ' . sj_get($L, 'postcode'));
    $type = sj_bold_choice($text, 'Job type', array('remote', 'on-site', 'hardware'));
    $typeTail = trim(preg_replace('/\([^)]*\)/', '', sj_get($L, 'job type')));
    $issue = sj_get($L, 'issue');
    $work = sj_get($L, 'work carried out');
    if (strcasecmp($work, 'steve') === 0 || strcasecmp($work, 'david') === 0) $work = '';   // a name in the work box is who did it, not what
    list($invKind, $invVal) = sj_invoiced(sj_get($L, 'invoiced'));
    $closed = sj_get($L, 'date closed');
    $time = sj_get($L, 'time spent');
    $priority = sj_bold_choice($text, 'Priority', array('Low', 'Medium', 'High'));
    // the invoice line: what was done, else what was asked for, else the type
    $desc = $work !== '' ? $work : ($issue !== '' ? $issue : trim($type . ($typeTail !== '' ? ' - ' . $typeTail : '')));
    return array(
        'name' => sj_clean($name, 90), 'email' => sj_email(sj_get($L, 'email')), 'phone' => sj_phone(sj_get($L, 'contact number')),
        'addr' => sj_clean($addr, 200), 'type' => $type, 'type_tail' => sj_clean($typeTail, 80),
        'issue' => sj_clean($issue, 200), 'work' => sj_clean($work, 300), 'time' => sj_clean($time, 40),
        'assigned' => sj_clean(sj_get($L, 'assigned to'), 40), 'priority' => $priority,
        'invoiced' => $invKind, 'invoice_doc' => ($invKind === 'number' ? $invVal : ''),
        'closed' => sj_clean($closed, 40), 'price' => sj_price($text),
        'desc' => sj_clean($desc, 200),
        'done' => ($work !== '' || $closed !== '' || $time !== ''),
    );
}

/* The job-store record for one Slack message. The id is the Slack ts with the
   dot replaced, so the same message always maps to the same job and a re-poll
   updates rather than duplicates. */
function sj_job_id($ts) { return preg_replace('/[^0-9]/', '-', (string)$ts); }
function sj_job($msg, $channel, $now = null) {
    $text = (string)(isset($msg['text']) ? $msg['text'] : '');
    if (!sj_is_job($text)) return null;
    $p = sj_parse($text);
    $ts = (string)(isset($msg['ts']) ? $msg['ts'] : '');
    if ($ts === '' || $p['name'] === '') return null;
    return array(
        'id' => sj_job_id($ts), 'ts' => (int)floor((float)$ts), 'by' => 'Slack', 'via' => 'slack',
        'slack' => array('channel' => (string)$channel, 'ts' => $ts, 'replies' => (int)(isset($msg['reply_count']) ? $msg['reply_count'] : 0),
                         'seen' => ($now === null ? time() : $now)),
        'name' => $p['name'], 'email' => $p['email'], 'phone' => $p['phone'], 'addr' => $p['addr'],
        'desc' => $p['desc'], 'note' => trim($p['type'] . ($p['type_tail'] !== '' ? ' - ' . $p['type_tail'] : '') . ($p['time'] !== '' ? ' · ' . $p['time'] : '') . ($p['assigned'] !== '' ? ' · ' . $p['assigned'] : '')),
        'amount' => $p['price'], 'amount_by' => ($p['price'] > 0 ? 'slack' : ''),
        'invoice_no' => '', 'invoice_url' => '', 'invoice_doc' => $p['invoice_doc'], 'invoiced_in_slack' => ($p['invoiced'] === 'yes'),
        'status' => ($p['done'] ? 'done' : 'quoted'),
    );
}

/* Merge a fresh parse over a stored job WITHOUT losing what a person set here:
   a staff-typed price or description, and the invoice id once one exists. */
function sj_merge($old, $new) {
    if (!is_array($old)) return $new;
    $keep = $old;
    foreach (array('name', 'email', 'phone', 'addr', 'note', 'status', 'invoice_doc', 'invoiced_in_slack', 'slack', 'ts') as $k) $keep[$k] = $new[$k];
    if ((string)(isset($old['amount_by']) ? $old['amount_by'] : '') !== 'staff') { $keep['amount'] = $new['amount']; $keep['amount_by'] = $new['amount_by']; }
    if ((string)(isset($old['desc_by']) ? $old['desc_by'] : '') !== 'staff') $keep['desc'] = $new['desc'];
    if (!empty($old['invoice_no'])) { $keep['invoice_no'] = $old['invoice_no']; $keep['invoice_url'] = isset($old['invoice_url']) ? $old['invoice_url'] : ''; }
    return $keep;
}
