<?php
/*
 * Lead chaser, the sweep (1 Oct 2026). Runs from tm-cron.php (every 15 minutes). The rules are pcm-leadchase-lib.php.
 *
 * Reads the last 7 days of #365-job-tracker with the server's Slack bot token (pcm-slack-lib.php, the same app that
 * posts the bookings there), reads the comms inbox (comms-data.json) for texts answered from the portal, and - in
 * working hours only - posts ONE "Not answered yet" message through the channel's own webhook (comms_slack) listing
 * any lead that has waited 2 working hours, and once more after a full working day.
 *
 * ON THE SLACK SIDE (owner, once, only if Slack says so): the app must be in #365-job-tracker and have the
 * channels:history scope. If either is missing the sweep posts ONE line a day saying exactly which, instead of
 * silently doing nothing. The first sweep that works posts one line explaining the tick habit.
 *
 * State: api/pcm-leadchase.json (gitignored + .htaccess-denied): {nudged: {ts: {l, at}}, last, intro, err_day, err}.
 * Switch off: create api/pcm-leadchase.off (the sweep then does nothing at all).
 *
 * Library only: no top-level side effects. NO closing tag in this file.
 */

require_once __DIR__ . '/pcm-leadchase-lib.php';
require_once __DIR__ . '/pcm-slack-lib.php';      // slk_call_form(), slk_creds()
require_once __DIR__ . '/comms-lib.php';          // comms_locked(), comms_slack()

define('LC_STATE', __DIR__ . '/pcm-leadchase.json');
define('LC_CHANNEL', 'C0B4TD439FB');               // #365-job-tracker
define('LC_MIN_GAP', 600);                         // seconds between sweeps; the cron ticks every 15 minutes

function lc_state_read() { $j = @json_decode((string)@file_get_contents(LC_STATE), true); return is_array($j) ? $j : array('v' => 1, 'nudged' => array()); }
function lc_state_write($s) {
    $tmp = LC_STATE . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($s, JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) {
        if (!@rename($tmp, LC_STATE)) { @unlink(LC_STATE); @rename($tmp, LC_STATE); }   // Windows dev box
    }
}

/* The channel's last 7 days, newest first, up to 3 pages of 200. Returns array(ok, messages|error). */
function lc_history($now) {
    $out = array(); $cursor = '';
    for ($p = 0; $p < 3; $p++) {
        $args = array('channel' => LC_CHANNEL, 'limit' => 200, 'oldest' => (string)($now - LC_MAX_AGE));
        if ($cursor !== '') $args['cursor'] = $cursor;
        $r = slk_call_form('conversations.history', $args, 10);
        if (empty($r['ok'])) return array(false, (string)(isset($r['error']) ? $r['error'] : 'unknown'));
        foreach ((array)(isset($r['messages']) ? $r['messages'] : array()) as $m) $out[] = $m;
        $cursor = isset($r['response_metadata']['next_cursor']) ? (string)$r['response_metadata']['next_cursor'] : '';
        if ($cursor === '' || empty($r['has_more'])) break;
    }
    return array(true, $out);
}

function lc_sweep($now = null) {
    $now = $now === null ? time() : (int)$now;
    if (file_exists(__DIR__ . '/pcm-leadchase.off')) return array('ok' => true, 'skip' => 'switched off');
    $st = lc_state_read();
    if (!empty($st['last']) && $now - (int)$st['last'] < LC_MIN_GAP) return array('ok' => true, 'skip' => 'gap');
    $st['last'] = $now;
    $inHours = lc_post_window($now);
    // nothing can be posted out of hours, so Slack is not even read then (the next working sweep catches up)
    if (!$inHours) { lc_state_write($st); return array('ok' => true, 'skip' => 'out of hours'); }

    if (slk_creds()[0] === '') { lc_state_write($st); return array('ok' => false, 'error' => 'no bot token'); }
    list($ok, $msgs) = lc_history($now);
    if (!$ok) {
        $st['err'] = $msgs;
        // say so once a working day, in plain words, so a missing permission never hides as "no leads"
        $day = gmdate('Y-m-d', $now);
        if ($inHours && (isset($st['err_day']) ? $st['err_day'] : '') !== $day) {
            $how = $msgs === 'not_in_channel' ? 'add the 365 app to #365-job-tracker (in the channel: /invite, then pick the app that posts the bookings)'
                : ($msgs === 'missing_scope' ? 'give the 365 Slack app the channels:history permission (api.slack.com/apps > OAuth & Permissions), then reinstall it'
                : 'check the 365 Slack app');
            comms_slack(":alarm_clock: Lead reminders cannot read this channel yet (Slack said: " . $msgs . "). To switch them on: " . $how . '.');
            $st['err_day'] = $day;
        }
        lc_state_write($st);
        return array('ok' => false, 'error' => $msgs);
    }
    unset($st['err']);

    list($okI, $inbox) = comms_locked(function ($d) { return array('__result' => isset($d['items']) ? $d['items'] : array()); });
    if (!$okI) $inbox = array();

    $r = lc_due($msgs, $inbox, $st, $now);
    $posted = 0;
    if ($inHours) {
        if (empty($st['intro'])) {
            // say whether voicemails can reach the channel at all: none had, 1 Aug - 1 Oct 2026, while customers wrote
            // "just left a voicemail" - the relay mailbox (api/vm-imap.php) is server-only and the owner's to connect
            $vmCfg = function_exists('comms_vm_config') ? comms_vm_config() : null;
            $vmLine = !$vmCfg ? "\n:warning: Voicemails are not reaching this channel yet: the voicemail mailbox is not connected (api/vm-imap.php on the server)."
                : (!function_exists('imap_open') ? "\n:warning: Voicemails are not reaching this channel yet: the server's PHP has no IMAP extension." : '');
            comms_slack(":alarm_clock: *Lead reminders are on.* Website enquiries, Dell quotes, call-back requests, voicemails and texts "
                . "from new numbers that nobody has answered after 2 working hours get listed here (once more after a full working day). "
                . "When someone has been in touch, add a :white_check_mark: to the post or reply in its thread. Texts answered "
                . "from the portal inbox count automatically." . $vmLine);
            $st['intro'] = $now;
        }
        if ($r['due']) {
            $links = array();
            foreach (array_slice($r['due'], 0, LC_MAX_LINES) as $d) {
                $pl = slk_call_form('chat.getPermalink', array('channel' => LC_CHANNEL, 'message_ts' => $d['ts']), 5);
                if (!empty($pl['ok']) && !empty($pl['permalink'])) $links[$d['ts']] = (string)$pl['permalink'];
            }
            if (comms_slack(lc_message($r['due'], $links, $now))) {
                $st = lc_record($st, $r['due'], $now);
                $posted = count($r['due']);
            }
        }
    }
    $st['open'] = $r['open'];
    lc_state_write($st);
    return array('ok' => true, 'open' => $r['open'], 'posted' => $posted, 'in_hours' => $inHours);
}
