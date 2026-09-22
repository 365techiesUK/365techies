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

/* Prices are often typed in the thread ("£60 agreed"), not the post. Only read a
   thread when the post itself gave no price. */
function sj_thread_price($channel, $ts) {
    $r = slk_call('conversations.replies', array('channel' => $channel, 'ts' => $ts, 'limit' => 50), 8);
    if (empty($r['ok']) || empty($r['messages'])) return 0.0;
    foreach ((array)$r['messages'] as $m) {
        if (!is_array($m) || (string)(isset($m['ts']) ? $m['ts'] : '') === (string)$ts) continue;
        $p = sj_price(isset($m['text']) ? $m['text'] : '');
        if ($p > 0) return $p;
    }
    return 0.0;
}

/* The poll. Returns a small summary for the cron's output. */
function sj_poll($now = null) {
    $now = $now === null ? time() : $now;
    $out = array('channels' => 0, 'seen' => 0, 'jobs' => 0, 'new' => 0, 'updated' => 0, 'error' => '');
    $st = sj_status_read();
    if ((int)(isset($st['last']) ? $st['last'] : 0) > $now - SJ_MIN_GAP) { $out['error'] = 'recent'; return $out; }
    $c = slk_creds();
    if ($c[0] === '') { $out['error'] = 'not_configured'; sj_status_write(array('last' => $now, 'error' => 'not_configured')); return $out; }
    $errors = array(); $threads = 0;
    foreach (sj_channels() as $chan) {
        $out['channels']++;
        $r = slk_call('conversations.history', array('channel' => $chan, 'limit' => SJ_MAX_MSGS, 'oldest' => (string)($now - SJ_WINDOW_DAYS * 86400)), 10);
        if (empty($r['ok'])) { $errors[$chan] = (string)(isset($r['error']) ? $r['error'] : 'unknown'); sj_log('history ' . $chan . ' failed: ' . $errors[$chan]); continue; }
        foreach ((array)(isset($r['messages']) ? $r['messages'] : array()) as $m) {
            if (!is_array($m)) continue;
            $out['seen']++;
            $job = sj_job($m, $chan, $now);
            if (!$job) continue;
            if ($job['amount'] <= 0 && !empty($m['reply_count']) && $threads < SJ_MAX_THREADS) {
                $threads++;
                $p = sj_thread_price($chan, (string)$m['ts']);
                if ($p > 0) { $job['amount'] = $p; $job['amount_by'] = 'slack'; }
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
    }
    if ($errors) $out['error'] = implode(',', array_unique(array_values($errors)));
    sj_status_write(array('last' => $now, 'error' => $out['error'], 'errors' => $errors, 'jobs' => $out['jobs'], 'new' => $out['new'], 'channels' => sj_channels()));
    if ($out['new'] || $out['updated'] || $out['error']) sj_log('poll: ' . json_encode($out));
    return $out;
}
