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
 * SECOND LAYOUT (22 Sep 2026, later the same day): the owner rebuilt both halves
 * as Slack Workflow Builder forms. A form's "Send a message" step lays every
 * answer out as a whole-line bold label with the answer beneath it, and carries
 * no "New Job In" phrase at all (the workflow's name is the poster, not text):
 *
 *   *Customer name*
 *   Joan Baker
 *   *Email*
 *   <mailto:j@x.com|j@x.com>
 *   *Price £.*
 *   60
 *
 * sj_lines() folds that back into "Label: value" rows, so everything below
 * reads both layouts. A post is a job when it carries the job-in fields
 * (issue / job type / address / postcode / contact number) and a completion
 * when it carries the job-out ones (work carried out / time spent / date
 * closed / invoiced). Only KNOWN labels open a block: a bold line that is a
 * customer's name typed as a heading stays ordinary text.
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
/* The labels that may open a block in the Workflow Builder layout: a whole line
   that is nothing but *Label*, the answer on the line(s) beneath. Returns the
   normalised key ("Price £." -> "price", "Invoiced? (Y/N)" -> "invoiced") or ''
   for any other line, including a bold heading that is not a known label. */
function sj_block_label($rawLine) {
    $t = trim((string)$rawLine);
    if (!preg_match('/^\*([^*]{2,60})\*$/u', $t, $m)) return '';
    $k = strtolower(trim($m[1]));
    $k = str_replace(array('£', ':'), '', $k);
    $k = preg_replace('/\s*\(y\/n\)\s*/', ' ', $k);
    $k = trim(preg_replace('/\s+/', ' ', rtrim(trim($k), ' .?')));
    static $known = array('customer name', 'address', 'postcode', 'contact number', 'email', 'job type', 'issue',
                          'date received', 'assigned to', 'priority', 'price', 'work carried out', 'time spent',
                          'invoiced', 'follow-up needed', 'follow up needed', 'date closed');
    return in_array($k, $known, true) ? $k : '';
}
/* The set of block labels a post carries (empty for the hand-typed layout). */
function sj_block_labels($text) {
    $set = array();
    foreach (preg_split('/\r\n|\r|\n/', (string)$text) as $raw) { $k = sj_block_label($raw); if ($k !== '') $set[$k] = true; }
    return $set;
}
function sj_lines_put(&$out, $label, $val) {
    if (!isset($out[$label])) $out[$label] = array('first' => $val, 'last' => $val, 'all' => array($val));
    else { if ($out[$label]['first'] === '' && $val !== '') $out[$label]['first'] = $val; $out[$label]['last'] = $val; $out[$label]['all'][] = $val; }
}
function sj_lines($text) {
    $out = array();
    /* Pass 1: fold the block layout into rows. A known whole-line bold label opens a
       block; every line up to the next one is its value (a long answer may span
       lines and contain colons). Lines outside any block are hand-typed rows. */
    $rows = array(); $cur = ''; $buf = array();
    foreach (preg_split('/\r\n|\r|\n/', (string)$text) as $raw) {
        $k = sj_block_label($raw);
        if ($k !== '') { if ($cur !== '') $rows[] = array($cur, implode(' ', $buf)); $cur = $k; $buf = array(); continue; }
        if ($cur !== '') { $buf[] = $raw; continue; }
        $rows[] = array('', $raw);
    }
    if ($cur !== '') $rows[] = array($cur, implode(' ', $buf));
    /* Pass 2: "Label: value". */
    foreach ($rows as $r) {
        if ($r[0] !== '') { sj_lines_put($out, $r[0], sj_clean($r[1], 400)); continue; }
        $ln = sj_clean($r[1], 400);
        if ($ln === '') continue;
        /* The template's "Invoiced? (Y/N) N" line has no colon at all, so it gets its
           own rule: whatever follows the hint is the value. */
        if (preg_match('/^invoiced\??\s*(?:\(y\/n\))?\s*:?\s*(.*)$/i', $ln, $mi)) { sj_lines_put($out, 'invoiced', trim($mi[1])); continue; }
        if (strpos($ln, ':') === false) continue;
        if (!preg_match('/^([A-Za-z][A-Za-z &\/?()-]{1,40}?)\s*:\s*(.*)$/', $ln, $m)) continue;
        $label = strtolower(trim(preg_replace('/\s+/', ' ', $m[1])));
        $label = preg_replace('/\s*\(y\/n\)\s*$/', '', $label);
        $label = rtrim($label, ' ?');
        $val = trim($m[2]);
        // "Invoiced? (Y/N) N" carries the hint after the colon-less label; catch the value after it
        if (preg_match('/^\(y\/n\)\s*(.*)$/i', $val, $mm)) $val = trim($mm[1]);
        sj_lines_put($out, $label, $val);
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

/* The workflow form's own price box ("Price £." -> "60", "£60", "60.00", "30/00").
   Blank, words or 0 = no price; the person types one in the portal. */
function sj_price_field($raw) {
    $s = str_replace(array('£', ',', ' '), '', sj_clean($raw, 40));
    if ($s === '' || !preg_match('/^\d+(?:[.\/]\d{1,2})?$/', $s)) return 0.0;
    $v = round((float)str_replace('/', '.', $s), 2);
    return ($v > 0 && $v <= 100000) ? $v : 0.0;
}
/* A drop-down answer ("remote", "High") -> the option, lower-case; anything else ''. */
function sj_pick($val, $options) {
    $v = trim((string)$val);
    foreach ($options as $o) if (strcasecmp($v, $o) === 0) return strtolower($o);
    return '';
}

/* What a thread under a job post can add: the price ("£60 agreed") and the email
   ("Email: x@y.com" or just the address), typed as replies after the event. The
   parent post is skipped; the first of each wins. Pure - the poller feeds it the
   replies it fetched. */
function sj_replies_extract($messages, $parentTs) {
    $out = array('price' => 0.0, 'email' => '');
    foreach ((array)$messages as $m) {
        if (!is_array($m) || (string)(isset($m['ts']) ? $m['ts'] : '') === (string)$parentTs) continue;
        $t = (string)(isset($m['text']) ? $m['text'] : '');
        if ($out['price'] <= 0) $out['price'] = sj_price($t);
        if ($out['email'] === '') $out['email'] = sj_email(sj_clean($t, 4000));
        if ($out['price'] > 0 && $out['email'] !== '') break;
    }
    return $out;
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

/* Is this Slack message a job post at all? Hand-typed: the "New Job In" phrase plus a
   customer name. Workflow layout: a customer-name block plus at least one job-in
   field and none of the job-out ones. */
function sj_is_job($text) {
    $t = (string)$text;
    if (stripos($t, SJ_MARK) !== false && stripos($t, 'customer name') !== false) return true;
    $B = sj_block_labels($t);
    if (!isset($B['customer name'])) return false;
    $in   = isset($B['issue']) || isset($B['job type']) || isset($B['address']) || isset($B['postcode']) || isset($B['contact number']);
    $done = isset($B['work carried out']) || isset($B['date closed']) || isset($B['time spent']);
    return $in && !$done;
}

/* A stand-alone "Job Out / Completed" post - what a Workflow Builder "Job done" form
   produces, since a workflow cannot edit the original post. It names the customer
   and carries the work, time, price and Invoiced? fields; the poller merges it into
   the matching job. Never both: a post that is a job is not a completion. */
function sj_is_out($text) {
    $t = (string)$text;
    if (sj_is_job($t)) return false;
    if (stripos($t, 'job out') !== false && stripos($t, 'customer name') !== false) return true;
    $B = sj_block_labels($t);
    return isset($B['customer name']) && (isset($B['work carried out']) || isset($B['date closed']) || isset($B['time spent']) || isset($B['invoiced']));
}
/* Names as typed on two different days: "charlotte Jeffery" / "Mrs Charlotte Jeffery"
   / "Charlotte  Jeffery (Henrietta)". Letters only, lower-case, titles and brackets
   dropped - good enough to match a Job Out to its Job In within one month. */
function sj_name_key($name) {
    $s = strtolower(sj_clean($name, 120));
    $s = preg_replace('/\([^)]*\)/', ' ', $s);
    $s = preg_replace('/\b(mr|mrs|ms|miss|dr|mx)\b\.?/', ' ', $s);
    return preg_replace('/[^a-z]/', '', $s);
}

/* One Slack message -> the fields of a job. $text is the raw Slack text. */
function sj_parse($text) {
    $L = sj_lines($text);
    $name = sj_get($L, 'customer name');
    if ($name === '' || strcasecmp($name, 'as above') === 0) $name = sj_get($L, 'customer name', 'last');
    $addr = trim(sj_get($L, 'address') . ' ' . sj_get($L, 'postcode'));
    $TYPES = array('remote', 'on-site', 'hardware');
    $type = sj_bold_choice($text, 'Job type', $TYPES);
    if ($type === '') $type = sj_pick(sj_get($L, 'job type'), $TYPES);          // a drop-down answer on its own line
    $typeTail = trim(preg_replace('/\([^)]*\)/', '', sj_get($L, 'job type')));
    if ($type !== '' && strcasecmp($typeTail, $type) === 0) $typeTail = '';      // the answer IS the type, not a tail
    $issue = sj_get($L, 'issue');
    $work = sj_get($L, 'work carried out');
    if (strcasecmp($work, 'steve') === 0 || strcasecmp($work, 'david') === 0) $work = '';   // a name in the work box is who did it, not what
    list($invKind, $invVal) = sj_invoiced(sj_get($L, 'invoiced'));
    $closed = sj_get($L, 'date closed');
    $time = sj_get($L, 'time spent');
    $PRIOS = array('Low', 'Medium', 'High');
    $priority = sj_bold_choice($text, 'Priority', $PRIOS);
    if ($priority === '') $priority = sj_pick(sj_get($L, 'priority'), $PRIOS);
    // the form's own price box first (explicit, typed by a person); else the first £ in the text
    $priceField = sj_price_field(sj_get($L, 'price'));
    // the invoice line: what was done, else what was asked for, else the type
    $desc = $work !== '' ? $work : ($issue !== '' ? $issue : trim($type . ($typeTail !== '' ? ' - ' . $typeTail : '')));
    return array(
        'name' => sj_clean($name, 90), 'email' => sj_email(sj_get($L, 'email')), 'phone' => sj_phone(sj_get($L, 'contact number')),
        'addr' => sj_clean($addr, 200), 'type' => $type, 'type_tail' => sj_clean($typeTail, 80),
        'issue' => sj_clean($issue, 200), 'work' => sj_clean($work, 300), 'time' => sj_clean($time, 40),
        'assigned' => sj_clean(sj_get($L, 'assigned to'), 40), 'priority' => $priority,
        'invoiced' => $invKind, 'invoice_doc' => ($invKind === 'number' ? $invVal : ''),
        'closed' => sj_clean($closed, 40), 'price' => ($priceField > 0 ? $priceField : sj_price($text)),
        'desc' => sj_clean($desc, 200),
        'kind' => sj_clean($typeTail !== '' ? $typeTail : $type, 80),        // the job type as typed or picked: matched to a QuickBooks service by name
        'postcode' => sj_clean(sj_get($L, 'postcode'), 12),
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
    $kind = $p['type'] !== '' ? $p['type'] . ($p['type_tail'] !== '' ? ' - ' . $p['type_tail'] : '') : $p['type_tail'];
    $note = implode(' · ', array_filter(array($kind, $p['time'], $p['assigned']), 'strlen'));
    return array(
        'id' => sj_job_id($ts), 'ts' => (int)floor((float)$ts), 'by' => 'Slack', 'via' => 'slack',
        'slack' => array('channel' => (string)$channel, 'ts' => $ts, 'replies' => (int)(isset($msg['reply_count']) ? $msg['reply_count'] : 0),
                         'seen' => ($now === null ? time() : $now)),
        'name' => $p['name'], 'email' => $p['email'], 'phone' => $p['phone'], 'addr' => $p['addr'], 'postcode' => $p['postcode'],
        'desc' => $p['desc'], 'note' => $note, 'kind' => $p['kind'],
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
    foreach (array('name', 'email', 'phone', 'addr', 'postcode', 'note', 'kind', 'status', 'invoice_doc', 'invoiced_in_slack', 'slack', 'ts') as $k) $keep[$k] = $new[$k];
    if ((string)(isset($old['amount_by']) ? $old['amount_by'] : '') !== 'staff') { $keep['amount'] = $new['amount']; $keep['amount_by'] = $new['amount_by']; }
    if ((string)(isset($old['desc_by']) ? $old['desc_by'] : '') !== 'staff') $keep['desc'] = $new['desc'];
    if (!empty($old['invoice_no'])) { $keep['invoice_no'] = $old['invoice_no']; $keep['invoice_url'] = isset($old['invoice_url']) ? $old['invoice_url'] : ''; }
    return $keep;
}
