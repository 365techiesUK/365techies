<?php
/*
 * "New customer" in the staff portal (2 Oct 2026).
 *
 * WHY. Owner: "In the portal, shouldn't there be a new customer button, like we've done in Slack ... if a new text
 * message comes in maybe there should be a new customer button there, or a voicemail. Because we've got their mobile
 * number then, and all we need is their name."
 *
 * In Slack a new customer is written up with the "New job in" form in #sos-jobs-in-out, and the server's reader
 * (pcm-slackjobs-sweep.php) turns each card into a job record in pcm-jobs.json, which the invoice queue picks up. The
 * portal does the same thing the same way:
 *   1. it posts the SAME card - byte for byte what slack-jobs-worker.js cardText() writes, pinned in the tests against
 *      $BOTCARD - to #sos-jobs-in-out as the app's bot (chat.postMessage), so the history is in Slack like any other;
 *   2. it stores the job at once under the id the reader gives that post (sj_job_id(ts)), so the next poll merges into
 *      it (sj_merge) instead of adding a second one. The job is in the portal straight away, not 15 minutes later.
 * If Slack will not take the card, the job is STILL saved (id P-...) and the answer says why: the record never depends
 * on the notification (the pcm-jobs.php rule).
 *
 * No Edit button on these cards (yet): that button is answered by the Cloudflare Worker, which is not wired up, and a
 * button that answers with an error is worse than none. Corrections go in the card's thread ("Address: ..."), which the
 * reader already applies - or, once the Worker is live, add its actions block here.
 *
 * NO closing tag in this file.
 */

require_once __DIR__ . '/pcm-slackjobs-sweep.php';   // sj_jobs_locked(), sj_job(), sj_merge(), SJ_DEFAULT_CHANNEL; slk_call()

/* The card's boxes, in the order the Slack form posts them (slack-jobs-worker.js FIELDS - keep the two identical). */
function nj_fields() {
    return array(
        array('name', 'Customer name'), array('address', 'Address'), array('postcode', 'Postcode'), array('phone', 'Contact number'),
        array('mobile', 'Mobile phone'), array('email', 'Email'), array('website', 'Website address'), array('jobtype', 'Job type'),
        array('issue', 'Issue'), array('assigned', 'Assigned to'), array('priority', 'Priority'), array('price', "Price \xC2\xA3."),
    );
}
function nj_job_types() { return array('Remote', 'On-site', 'Hardware'); }
function nj_priorities() { return array('Low', 'Medium', 'High'); }

/* slack-jobs-worker.js clean(): control characters (not newlines) to a space, no asterisks (they would make a box look
   like a label), trimmed. */
function nj_clean($s) {
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', ' ', (string)$s);
    return trim(str_replace('*', '', $s));
}

/* The card text: what slack-jobs-worker.js cardText(v, null) writes for the same answers. */
function nj_card_text($v) {
    $lines = array(':inbox_tray: *New job in*');
    foreach (nj_fields() as $f) {
        $lines[] = '*' . $f[1] . '*';
        $lines[] = nj_clean(isset($v[$f[0]]) ? $v[$f[0]] : '');
    }
    return implode("\n", $lines);
}

/* The portal's form -> the card's answers (the Worker's readSubmission): trimmed, newlines kept only in the issue,
   "£" off the price, "https://" and a trailing slash off the website, the two drop-downs held to their options. */
function nj_read($raw) {
    $raw = is_array($raw) ? $raw : array();
    $v = array();
    foreach (nj_fields() as $f) {
        $k = $f[0];
        $s = str_replace(array("\r\n", "\r"), "\n", (string)(isset($raw[$k]) && is_scalar($raw[$k]) ? $raw[$k] : ''));
        if ($k !== 'issue') $s = preg_replace('/\s*\n\s*/', ' ', $s);
        $s = trim($s);
        $v[$k] = function_exists('mb_substr') ? mb_substr($s, 0, $k === 'issue' ? 1500 : 200) : substr($s, 0, $k === 'issue' ? 1500 : 200);
    }
    $v['price'] = trim(preg_replace('/^\x{00A3}\s*/u', '', $v['price']));
    $v['website'] = preg_replace('#/$#', '', preg_replace('#^https?://#i', '', $v['website']));
    $pick = function ($val, $opts) { foreach ($opts as $o) if (strcasecmp(trim($val), $o) === 0) return $o; return ''; };
    $v['jobtype'] = $pick($v['jobtype'], nj_job_types());
    $v['priority'] = $pick($v['priority'], nj_priorities());
    return $v;
}

/* The Worker's validate(), word for word, keyed by box. Empty = fine. */
function nj_validate($v) {
    $e = array();
    if ((string)$v['name'] === '') $e['name'] = "Please put the customer's name.";
    if ($v['email'] !== '' && !preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $v['email'])) $e['email'] = "That doesn't look like an email address.";
    if ($v['price'] !== '' && !preg_match('/^\d+(\.\d{1,2})?$/', $v['price'])) $e['price'] = 'Just the number, e.g. 60 or 45.50.';
    if ($v['website'] !== '' && !preg_match('#^[a-z0-9.-]+\.[a-z]{2,}(/\S*)?$#i', $v['website'])) $e['website'] = "That doesn't look like a website address (e.g. www.example.co.uk).";
    return $e;
}

/* The line under the card: who added it and from what ("a text from 07584 168898"). In a context block, so the
   card's own text - the part the reader parses - is exactly the Slack form's. */
function nj_context($by, $from) {
    $esc = function ($s) { return str_replace(array('&', '<', '>'), array('&amp;', '&lt;', '&gt;'), (string)$s); };
    return 'Added in the staff portal by ' . $esc($by !== '' ? $by : 'staff') . ($from !== '' ? ' - from ' . $esc($from) : '');
}

/* Post the card and save the job. $raw: the form; $by: the staff member's first name; $from: what it came from, for the
   context line; $extra: kept on the job (e.g. comms => the inbox item it was made from). $post and $save are
   injectable for tests: $post(array $args) -> Slack's answer; $save(array $job) -> bool. Returns ok, id, name, slack
   (bool), slack_error, saved (bool), errors. */
function nj_save_job($job) {   // into pcm-jobs.json, under the reader's own lock, merging if the reader got there first
    $res = sj_jobs_locked(function ($d) use ($job) {
        foreach ($d['jobs'] as $i => $old) {
            if (is_array($old) && (string)(isset($old['id']) ? $old['id'] : '') === $job['id']) { $d['jobs'][$i] = sj_merge($old, $job); return array('ok' => true, 'data' => $d); }
        }
        $d['jobs'][] = $job;
        if (count($d['jobs']) > 2000) $d['jobs'] = array_slice($d['jobs'], -2000);
        return array('ok' => true, 'data' => $d);
    });
    return !empty($res['ok']);
}
function nj_create($raw, $by, $from = '', $extra = array(), $now = null, $post = null, $save = null) {
    $now = $now === null ? time() : (int)$now;
    $v = nj_read($raw);
    $errs = nj_validate($v);
    if ($errs) return array('ok' => false, 'error' => reset($errs), 'errors' => $errs);
    $text = nj_card_text($v);
    $args = array('channel' => SJ_DEFAULT_CHANNEL, 'text' => $text, 'unfurl_links' => false, 'blocks' => array(
        array('type' => 'section', 'text' => array('type' => 'mrkdwn', 'text' => function_exists('mb_substr') ? mb_substr($text, 0, 2900) : substr($text, 0, 2900))),
        array('type' => 'context', 'elements' => array(array('type' => 'mrkdwn', 'text' => nj_context($by, $from)))),
    ));
    $r = $post !== null ? call_user_func($post, $args) : slk_call('chat.postMessage', $args, 8);
    $ts = (is_array($r) && !empty($r['ok']) && !empty($r['ts'])) ? (string)$r['ts'] : '';
    if ($ts !== '') {
        $job = sj_job(array('ts' => $ts, 'text' => $text, 'reply_count' => 0), SJ_DEFAULT_CHANNEL, $now);
    } else {
        $job = sj_job(array('ts' => $now . '.' . sprintf('%06d', mt_rand(0, 999999)), 'text' => $text), SJ_DEFAULT_CHANNEL, $now);
        if ($job) { $job['id'] = 'P-' . $job['id']; $job['via'] = 'portal'; unset($job['slack']); }
    }
    if (!$job) return array('ok' => false, 'error' => 'The card could not be read back as a job - tell Claude.', 'errors' => array());
    $job['by'] = ($by !== '' ? $by : 'Staff') . ' (portal)';
    foreach ((array)$extra as $k => $x) if (!isset($job[$k])) $job[$k] = $x;
    $saved = (bool)call_user_func($save !== null ? $save : 'nj_save_job', $job);
    if (function_exists('sj_log')) sj_log('portal new job ' . $job['id'] . ' by ' . $by . ($ts !== '' ? ' (posted)' : ' (Slack: ' . (is_array($r) && isset($r['error']) ? $r['error'] : 'no answer') . ')') . ($saved ? '' : ' - store busy'));
    return array('ok' => $saved || $ts !== '', 'id' => $job['id'], 'job' => $job, 'name' => $v['name'], 'phone' => $v['phone'], 'mobile' => $v['mobile'], 'email' => $v['email'],
        'slack' => $ts !== '', 'slack_error' => $ts !== '' ? '' : (string)(is_array($r) && isset($r['error']) ? $r['error'] : 'no answer'),
        'saved' => $saved, 'error' => ($saved || $ts !== '') ? '' : 'Neither Slack nor the job list took it - try again.', 'errors' => array());
}
