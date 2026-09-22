<?php
/*
 * Slack jobs poller (22 Sep 2026): #sos-jobs-in-out -> pcm-jobs.json.
 *
 * Runs from tm-cron.php. Reads the last 30 days of the jobs channel(s) with the
 * server's Slack bot token (the same pcm-slack-bot.php the portal messaging
 * uses, read by pattern), turns each "New Job In" post into a job record with
 * pcm-slackjobs-lib.php, and upserts it into pcm-jobs.json under that store's
 * own lock. From there the invoice queue (pcm-invq-*.php) does the rest.
 *
 * WHAT IT NEEDS ON THE SLACK SIDE (owner, once): the app invited to the channel
 * (/invite @app in #sos-jobs-in-out) and the channels:history scope (public) or
 * groups:history (private). Without those Slack answers not_in_channel or
 * missing_scope; that is written to pcm-slackjobs-status.json so the console
 * can say exactly which, instead of silently showing nothing.
 *
 * Channels: $SLACK_JOBS_CHANNELS = 'C0C3VGP1SJC,C0...' in pcm-slack-bot.php
 * (read by pattern); default = #sos-jobs-in-out.
 *
 * Library only: no top-level side effects. NO closing tag in this file.
 */

require_once __DIR__ . '/pcm-slack-lib.php';      // slk_call(), slk_creds()
require_once __DIR__ . '/pcm-slackjobs-lib.php';

define('SJ_JOBS',    __DIR__ . '/pcm-jobs.json');
define('SJ_STATUS',  __DIR__ . '/pcm-slackjobs-status.json');
define('SJ_LOG',     __DIR__ . '/pcm-slackjobs.log');
define('SJ_BOTF',    __DIR__ . '/pcm-slack-bot.php');
define('SJ_DEFAULT_CHANNEL', 'C0C3VGP1SJC');       // #sos-jobs-in-out
define('SJ_WINDOW_DAYS', 30);
define('SJ_MAX_MSGS', 100);
define('SJ_MAX_THREADS', 6);                        // threads read per tick, for prices typed in replies
define('SJ_MIN_GAP', 240);                          // seconds between polls - the cron may tick faster than Slack deserves

function sj_log($m) { @file_put_contents(SJ_LOG, '[' . gmdate('Y-m-d H:i:s') . 'Z] slackjobs: ' . $m . "\n", FILE_APPEND | LOCK_EX); }

function sj_channels() {
    $raw = (string)@file_get_contents(SJ_BOTF);
    if (preg_match('/\$SLACK_JOBS_CHANNELS\s*=\s*[\'"]([^\'"]+)[\'"]/', $raw, $m)) {
        $ids = array_filter(array_map('trim', explode(',', $m[1])), function ($c) { return preg_match('/^[CG][A-Z0-9]{6,}$/', $c); });
        if ($ids) return array_values($ids);
    }
    return array(SJ_DEFAULT_CHANNEL);
}
function sj_status_read() { $j = @json_decode((string)@file_get_contents(SJ_STATUS), true); return is_array($j) ? $j : array(); }
function sj_status_write($s) {
    $tmp = SJ_STATUS . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($s, JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) @rename($tmp, SJ_STATUS);
}

/* Same lock, same shape as pcm-jobs.php's jobs_locked(). */
function sj_jobs_locked($fn) {
    $h = @fopen(SJ_JOBS . '.lock', 'c');
    if (!$h || !flock($h, LOCK_EX)) { if ($h) fclose($h); return array('ok' => false, 'error' => 'busy'); }
    $data = @json_decode((string)@file_get_contents(SJ_JOBS), true);
    if (!is_array($data)) $data = array('jobs' => array());
    if (!isset($data['jobs']) || !is_array($data['jobs'])) $data['jobs'] = array();
    $r = $fn($data);
    if (isset($r['data'])) {
        $tmp = SJ_JOBS . '.' . getmypid() . '.tmp';
        $j = json_encode($r['data'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($j !== false && @file_put_contents($tmp, $j, LOCK_EX) !== false) @rename($tmp, SJ_JOBS); else @unlink($tmp);
    }
    flock($h, LOCK_UN); fclose($h);
    return $r;
}

/* Prices are often typed in the thread ("£60 agreed"), not the post, and so is a
   missing email ("Email: x@y.com" as a reply, 22 Sep). Only read a thread when the
   post itself left one of those blank. */
function sj_thread_extras($channel, $ts) {
    /* FORM-encoded, not JSON: conversations.replies ignores a JSON body and answers
       invalid_arguments (seen live 22 Sep 2026, 16:30 - the console's red line). */
    $r = slk_call_form('conversations.replies', array('channel' => $channel, 'ts' => $ts, 'limit' => 50), 8);
    if (empty($r['ok'])) {
        $e = (string)(isset($r['error']) ? $r['error'] : 'unknown');
        sj_log('replies ' . $ts . ' failed: ' . $e);
        return array('price' => 0.0, 'email' => '', 'error' => $e);
    }
    if (empty($r['messages'])) return array('price' => 0.0, 'email' => '', 'error' => '');
    $x = sj_replies_extract($r['messages'], $ts);
    $x['error'] = '';
    sj_log('replies ' . $ts . ': ' . count($r['messages']) . ' msgs, price ' . $x['price'] . ', email ' . ($x['email'] !== '' ? 'found' : 'none'));
    return $x;
}

/* Merge a "Job Out" post into its job: the same email if the post carries one, else
   the same name, choosing the newest job in the window. Work carried out becomes
   the description and a £ price the amount - unless a person typed those in the
   portal; Invoiced? and Date closed are taken as typed; the job is marked done.
   Applied once per post (the post's ts is remembered on the job). */
function sj_apply_out($m, $now = null) {
    $now = $now === null ? time() : $now;
    $text = (string)(isset($m['text']) ? $m['text'] : ''); $ts = (string)(isset($m['ts']) ? $m['ts'] : '');
    $p = sj_parse($text);
    if ($p['name'] === '' || $ts === '') return false;
    $email = $p['email']; $nk = sj_name_key($p['name']);
    $r = sj_jobs_locked(function ($d) use ($p, $email, $nk, $ts, $now) {
        $best = -1; $bestTs = 0;
        foreach ($d['jobs'] as $i => $j) {
            if (!is_array($j) || (int)(isset($j['ts']) ? $j['ts'] : 0) < $now - SJ_WINDOW_DAYS * 86400) continue;
            $st = (string)(isset($j['status']) ? $j['status'] : '');
            if ($st !== '' && $st !== 'quoted' && $st !== 'done') continue;
            $hit = ($email !== '' && sj_email(isset($j['email']) ? $j['email'] : '') === $email) || ($nk !== '' && sj_name_key(isset($j['name']) ? $j['name'] : '') === $nk);
            if ($hit && (int)$j['ts'] > $bestTs) { $best = $i; $bestTs = (int)$j['ts']; }
        }
        if ($best < 0) return array('ok' => false, 'error' => 'no_match');
        $j = $d['jobs'][$best];
        if (isset($j['out_ts']) && (string)$j['out_ts'] === $ts) return array('ok' => false, 'error' => 'seen');
        if ((string)(isset($j['desc_by']) ? $j['desc_by'] : '') !== 'staff' && $p['work'] !== '') { $j['desc'] = $p['work']; $j['desc_by'] = 'slack_out'; }   // sj_merge keeps it
        if ((string)(isset($j['amount_by']) ? $j['amount_by'] : '') !== 'staff' && $p['price'] > 0) { $j['amount'] = $p['price']; $j['amount_by'] = 'slack'; }
        if ($p['invoice_doc'] !== '') $j['invoice_doc'] = $p['invoice_doc'];
        if ($p['invoiced'] === 'yes') $j['invoiced_in_slack'] = true;
        if ($p['time'] !== '') $j['note'] = trim((string)(isset($j['note']) ? $j['note'] : '') . ' · ' . $p['time'], ' ·');
        $j['status'] = 'done'; $j['out_ts'] = $ts;
        $d['jobs'][$best] = $j;
        return array('ok' => true, 'data' => $d, 'job' => (string)$j['id']);
    });
    if (!empty($r['ok'])) { sj_log('job out ' . $ts . ' -> job ' . $r['job']); return true; }
    if (!empty($r['error']) && $r['error'] === 'no_match') sj_log('job out ' . $ts . ' matched no job (' . $p['name'] . ')');
    return false;
}

/* The poll. Returns a small summary for the cron's output. */
function sj_poll($now = null) {
    $now = $now === null ? time() : $now;
    $out = array('channels' => 0, 'seen' => 0, 'jobs' => 0, 'new' => 0, 'updated' => 0, 'error' => '', 'threads' => 0, 'thread_error' => '');
    $st = sj_status_read();
    if ((int)(isset($st['last']) ? $st['last'] : 0) > $now - SJ_MIN_GAP) { $out['error'] = 'recent'; return $out; }
    $c = slk_creds();
    if ($c[0] === '') { $out['error'] = 'not_configured'; sj_status_write(array('last' => $now, 'error' => 'not_configured')); return $out; }
    $errors = array(); $threads = 0;
    foreach (sj_channels() as $chan) {
        $out['channels']++;
        $r = slk_call('conversations.history', array('channel' => $chan, 'limit' => SJ_MAX_MSGS, 'oldest' => (string)($now - SJ_WINDOW_DAYS * 86400)), 10);
        if (empty($r['ok'])) { $errors[$chan] = (string)(isset($r['error']) ? $r['error'] : 'unknown'); sj_log('history ' . $chan . ' failed: ' . $errors[$chan]); continue; }
        /* Oldest first, jobs before completions: a "Job Out" post must find the job
           it belongs to, which may have arrived in the same read. */
        $msgs = array_values(array_filter((array)(isset($r['messages']) ? $r['messages'] : array()), 'is_array'));
        usort($msgs, function ($a, $b) { return strcmp((string)(isset($a['ts']) ? $a['ts'] : ''), (string)(isset($b['ts']) ? $b['ts'] : '')); });
        $outs = array();
        foreach ($msgs as $m) {
            $out['seen']++;
            if (sj_is_out(isset($m['text']) ? $m['text'] : '')) { $outs[] = $m; continue; }
            $job = sj_job($m, $chan, $now);
            if (!$job) continue;
            if (($job['amount'] <= 0 || $job['email'] === '') && !empty($m['reply_count']) && $threads < SJ_MAX_THREADS) {
                $threads++; $out['threads']++;
                $x = sj_thread_extras($chan, (string)$m['ts']);
                if ($x['error'] !== '' && $out['thread_error'] === '') $out['thread_error'] = $x['error'];   // surfaced in the console
                if ($job['amount'] <= 0 && $x['price'] > 0) { $job['amount'] = $x['price']; $job['amount_by'] = 'slack'; }
                if ($job['email'] === '' && $x['email'] !== '') $job['email'] = $x['email'];
            }
            $res = sj_jobs_locked(function ($d) use ($job) {
                foreach ($d['jobs'] as $i => $old) {
                    if (is_array($old) && (string)(isset($old['id']) ? $old['id'] : '') === $job['id']) {
                        $merged = sj_merge($old, $job);
                        $changed = ($merged != $old);
                        $d['jobs'][$i] = $merged;
                        return array('ok' => true, 'data' => $d, 'what' => ($changed ? 'updated' : 'same'));
                    }
                }
                $d['jobs'][] = $job;
                if (count($d['jobs']) > 2000) $d['jobs'] = array_slice($d['jobs'], -2000);
                return array('ok' => true, 'data' => $d, 'what' => 'new');
            });
            if (!empty($res['ok'])) { $out['jobs']++; if ($res['what'] === 'new') $out['new']++; elseif ($res['what'] === 'updated') $out['updated']++; }
        }
        foreach ($outs as $m) if (sj_apply_out($m, $now)) $out['updated']++;
    }
    if ($errors) $out['error'] = implode(',', array_unique(array_values($errors)));
    sj_status_write(array('last' => $now, 'error' => $out['error'], 'errors' => $errors, 'jobs' => $out['jobs'], 'new' => $out['new'], 'channels' => sj_channels(),
                          'threads' => $out['threads'], 'thread_error' => $out['thread_error']));
    if ($out['new'] || $out['updated'] || $out['error']) sj_log('poll: ' . json_encode($out));
    return $out;
}
