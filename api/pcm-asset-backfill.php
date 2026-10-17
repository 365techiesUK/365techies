<?php
/* The asset register for support customers' PCs, worked out in the background (17 Oct 2026; owner: a refurbished PC we
   sold a year ago showed in 365 PC Manager as "5-6 years old" - a support customer should see when they bought it from
   us and how long their 5-year guarantee has left). Called by pcm-bkpoll.php (every 5 minutes, after its token check
   and single-runner lock, BEFORE its SimplyBook work - so a SimplyBook fault can't stop it - and before it takes the
   customer file's lock itself): the QuickBooks look-up never runs while pcm-data.json is locked (pcm.php holds that lock
   for the whole of every check-in, so a slow QuickBooks inside one would stall every PC).
   Up to $max PCs a run: support plan (tier pro) or one that already has a register, a known model, no register worked
   out with the sale rule (asset v2) or one over 7 days old, and not tried in the last day. Read under the lock, look up with NO lock, then re-read under the
   lock and write back ONLY those machines' asset + asset_try, with pcm_db_put (never json_encode into the file).
   A look-up that failed (QuickBooks busy, no token, an error) keeps whatever register was there; "busy" is retried on
   the next poll, other failures tomorrow. Include-only (denied in .htaccess with the other pcm- libraries). */
if (!function_exists('pcm_asset_backfill')) {

function pcm_asset_backfill_read($DATA) {
    $raw = @file_get_contents($DATA);
    if (!is_string($raw) || $raw === '') return null;   // a 0-byte customer file is a failure - never work from it
    $d = json_decode($raw, true);
    return (is_array($d) && isset($d['customers']) && is_array($d['customers'])) ? $d : null;
}

/** Which machines need a look-up now: [ [customerKey, machineId], ... ], at most $max. Pure, for the tests. */
function pcm_asset_backfill_pick($db, $max, $now) {
    $todo = array();
    foreach ((array)(isset($db['customers']) ? $db['customers'] : array()) as $k => $c) {
        if (!is_array($c) || !empty($c['merged_into']) || trim((string)(isset($c['email']) ? $c['email'] : '')) === '') continue;
        $pro = (string)(isset($c['tier']) ? $c['tier'] : '') === 'pro';
        foreach ((array)(isset($c['machines']) ? $c['machines'] : array()) as $mid => $m) {
            if (!is_array($m) || trim((string)(isset($m['model']) ? $m['model'] : '')) === '') continue;
            $a = (isset($m['asset']) && is_array($m['asset'])) ? $m['asset'] : null;
            if (!$pro && !$a) continue;   // support PCs, plus any PC that already has a register (a one-off service made one) - kept current
            $current = $a && (int)(isset($a['v']) ? $a['v'] : 0) >= 2 && ($now - (int)(isset($a['computed']) ? $a['computed'] : 0)) < 7 * 86400;
            if ($current || ($now - (int)(isset($m['asset_try']) ? $m['asset_try'] : 0)) < 86400) continue;
            $todo[] = array((string)$k, (string)$mid);
            if (count($todo) >= $max) return $todo;
        }
    }
    return $todo;
}

function pcm_asset_backfill($DATA, $max = 2) {
    $now = time();
    $lk = @fopen($DATA . '.lock', 'c');
    if (!$lk) return array('picked' => 0, 'stored' => 0);
    @flock($lk, LOCK_EX); $db = pcm_asset_backfill_read($DATA); @flock($lk, LOCK_UN);
    $todo = $db ? pcm_asset_backfill_pick($db, $max, $now) : array();
    if (!$todo) { @fclose($lk); return array('picked' => 0, 'stored' => 0); }
    require_once __DIR__ . '/pcm-asset-lib.php';
    $results = array();
    foreach ($todo as $t) {   // the slow part - no lock held
        list($k, $mid) = $t;
        $c = $db['customers'][$k]; $m = $c['machines'][$mid];
        $r = null;
        try { $r = pcm_asset_for_machine($c, $mid, (string)$m['model'], (isset($m['drives']) && is_array($m['drives'])) ? $m['drives'] : array()); }
        catch (Throwable $e) { $r = null; }
        $results[] = array($k, $mid, $r);
    }
    // nothing worth writing (every look-up 'busy'): leave the customer file alone - no rewrite every 5 minutes (review)
    $worth = false;
    foreach ($results as $res) { $s0 = is_array($res[2]) ? (string)(isset($res[2]['source']) ? $res[2]['source'] : '') : 'exception'; if ($s0 !== 'busy') { $worth = true; break; } }
    if (!$worth) { @fclose($lk); return array('picked' => count($todo), 'stored' => 0, 'busy' => true); }
    $stored = 0;
    @flock($lk, LOCK_EX);
    $db = pcm_asset_backfill_read($DATA);   // re-read: check-ins wrote meanwhile
    if ($db) {
        foreach ($results as $res) {
            list($k, $mid, $r) = $res;
            if (!isset($db['customers'][$k]['machines'][$mid]) || !is_array($db['customers'][$k]['machines'][$mid])) continue;
            $src = is_array($r) ? (string)(isset($r['source']) ? $r['source'] : '') : 'exception';
            if ($src !== 'busy') $db['customers'][$k]['machines'][$mid]['asset_try'] = $now;
            if (is_array($r) && !empty($r['ok'])) {   // a real answer only - a failed look-up keeps the register we had
                $db['customers'][$k]['machines'][$mid]['asset'] = $r;
                $stored++;
            }
        }
        require_once __DIR__ . '/pcm-dbsafe-lib.php';
        pcm_db_put($DATA . '.' . getmypid() . '.asset.tmp', $db, $DATA);   // 8 Oct 2026 rule: every writer goes through pcm_db_put
    }
    @flock($lk, LOCK_UN); @fclose($lk);
    return array('picked' => count($todo), 'stored' => $stored);
}

} // function_exists guard
