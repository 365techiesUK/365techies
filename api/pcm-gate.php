<?php
/* PC Manager's minute poll, answered without PHP while nothing is waiting (29 Sep 2026).

   Every PC linked to 365 posts {"action":"shield"} to pcm.php once a minute (Ui.cs ShieldPoll). That is about 80% of
   the plan's PHP executions, and SiteGround allows 4,000 an hour: the cap would be reached at roughly 65 linked PCs
   switched on at once. The root .htaccess answers that poll with 204 - which the app reads as "nothing waiting" -
   WITHOUT running PHP, except while one of these files exists:

     .pcmgate/open      a call code, a fresh-check request or a maintenance job is waiting for some PC, so every poll
                        reaches pcm.php exactly as before. pcm_gate_sync() creates it when work is queued and removes it
                        once nothing is waiting (a wait counts for 15 minutes at most - the life of a code or a job).
     .pcmgate/sb/<ip>   this address has a 12-character (SB...) key. That key's "services" request is exactly the size
                        of a 14-character key's poll (67 bytes), so 67-byte posts from these addresses always reach PHP.

   The .htaccess rules only fire while .pcmgate/armed exists. pcm_gate_sync() arms the gate once both folders are
   writable AND 65 minutes have passed since it first made them, so every running PC has done an hourly check-in (which
   records its SB address) before a single poll is answered early. If PHP cannot keep the flags, it never arms (or
   disarms itself) and the poll reaches PHP as it always did.

   KILL SWITCH: create api/.pcmgate/disarm (SiteGround File Manager). The next request that reaches pcm.php removes
   "armed", and nothing re-arms while "disarm" exists. Deleting "armed" by hand takes effect at once.
   Tests: pcm-gate.test.php. Top-level function definitions only - safe to include from anywhere. */

function pcm_gate_dir() { return isset($GLOBALS['PCM_GATE_DIR']) ? $GLOBALS['PCM_GATE_DIR'] : __DIR__ . '/.pcmgate'; }

// Is anything waiting for any PC? The three things the minute poll delivers (pcm.php, action "shield").
function pcm_gate_waiting($db, $now = null) {
    $now = $now === null ? time() : $now;
    $cs = (is_array($db) && isset($db['customers']) && is_array($db['customers'])) ? $db['customers'] : array();
    foreach ($cs as $c) {
        if (!is_array($c)) continue;
        if (!empty($c['shield_code']) && $now - intval(isset($c['shield_ts']) ? $c['shield_ts'] : 0) < 900) return true;
        $ms = (isset($c['machines']) && is_array($c['machines'])) ? $c['machines'] : array();
        foreach ($ms as $m) {
            if (!is_array($m)) continue;
            if (!empty($m['req_check']) && $now - intval($m['req_check']) < 900) return true;
            $qs = (isset($m['cmdq']) && is_array($m['cmdq'])) ? $m['cmdq'] : array();
            foreach ($qs as $q) if (is_array($q) && $now - intval(isset($q['ts']) ? $q['ts'] : 0) < 900) return true;
        }
    }
    return false;
}

// Open or close the gate to match the data, and arm or disarm it. Call after anything that queues or delivers work,
// and from every poll that reaches PHP. Never throws.
function pcm_gate_sync($db, $now = null) {
    try {
        $now = $now === null ? time() : $now;
        $d = pcm_gate_dir();
        $armed = $d . '/armed';
        if (!is_dir($d . '/sb') && !@mkdir($d . '/sb', 0755, true)) return;
        if (!file_exists($d . '/created')) @file_put_contents($d . '/created', (string)$now);
        $open = $d . '/open';
        if (pcm_gate_waiting($db, $now)) {
            // cannot open the gate = work could sit unseen behind it: stop answering early instead
            if (!file_exists($open) && !@touch($open)) { @unlink($armed); return; }
        } elseif (file_exists($open)) {
            @unlink($open);
        }
        if (file_exists($d . '/disarm')) { if (file_exists($armed)) @unlink($armed); return; }
        if (!file_exists($armed)) {
            $since = intval(@file_get_contents($d . '/created'));
            if ($since > 0 && $now - $since >= 3900 && is_writable($d) && is_writable($d . '/sb')) @touch($armed);
        }
    } catch (Throwable $e) { }
}

// A 12-character (SB...) key reached PHP from this address: keep its 67-byte posts going to PHP (see the header).
// Refreshed at most every 6 hours; addresses unseen for 3 days are pruned now and then. Never throws.
function pcm_gate_mark_sb($db, $key, $now = null) {
    try {
        $now = $now === null ? time() : $now;
        if (strlen((string)$key) !== 12 || !isset($db['customers'][$key])) return;
        $ip = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '';
        if (!preg_match('/^[0-9A-Fa-f:.]{3,45}$/', $ip)) return;
        $d = pcm_gate_dir() . '/sb';
        if (!is_dir($d) && !@mkdir($d, 0755, true)) return;
        $f = $d . '/' . $ip;
        if (!file_exists($f) || $now - filemtime($f) > 21600) @touch($f, $now);
        if (mt_rand(1, 200) === 1) {
            foreach ((array)glob($d . '/*') as $old) if (is_file($old) && $now - filemtime($old) > 259200) @unlink($old);
        }
    } catch (Throwable $e) { }
}
