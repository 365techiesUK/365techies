<?php
/**
 * Cyber Essentials Ready (29 Oct 2026, app 36.7). Owner: "a business one ... which basically does all the cyber essentials".
 *
 * Part of every BUSINESS support plan (owner, 29 Oct 2026: "I do want it to be part of the business plan"), never a paid unlock in
 * the app. On for every business customer unless the owner switches it off for one in pcm-admin ('ceready' === false). Then the check-in reply says ceready=1, the app switches its year-round
 * watch on (CyberEss.cs CeWatch) and says we watch the PC, and the portal shows the business every PC's readiness and the
 * month-by-month record as an evidence pack.
 *
 * What is stored per machine, from the check-in (all closed formats, nothing free text):
 *   cew     the year-round watch is on
 *   ceum    'YYYY-MM' - the month of the newest monthly Windows update installed
 *   cemon   'YYYY-MM' => 'YYYY-MM-DD' - the day each month's update was FIRST seen installed (15 months)
 *   cedays  'YYYY-MM-DD' => letters + count, e.g. 'rarar2' - the day's last reading (400 days)
 * It is a record of what the PCs showed - never "compliant" or "certified": only an IASME certification body certifies.
 */
if (!defined('PCM_CE_LIB')) {
    define('PCM_CE_LIB', 1);

function pce_ready($c) {
    return is_array($c) && (($c['tier'] ?? 'free') === 'pro') && ((string)($c['plan'] ?? '') === 'business') && (($c['ceready'] ?? true) !== false);
}

// $now is the check-in's gmdate('Y-m-d H:i'); call after ce/cen are stored
function pce_store(&$m, $in, $now) {
    if (!is_array($m) || !isset($in['ce'])) return;
    $day = substr((string)$now, 0, 10);
    if (isset($in['cew'])) $m['cew'] = !empty($in['cew']);
    $um = (string)($in['ceum'] ?? '');
    if (preg_match('/^20\d\d-(0[1-9]|1[0-2])$/', $um)) {
        $m['ceum'] = $um;
        $mon = (isset($m['cemon']) && is_array($m['cemon'])) ? $m['cemon'] : array();
        if (!isset($mon[$um])) $mon[$um] = $day;
        ksort($mon, SORT_STRING);
        while (count($mon) > 15) array_shift($mon);
        $m['cemon'] = $mon;
    }
    $days = (isset($m['cedays']) && is_array($m['cedays'])) ? $m['cedays'] : array();
    $days[$day] = substr(preg_replace('/[^rau]/', '', (string)($m['ce'] ?? '')), 0, 5) . max(0, min(99, intval($m['cen'] ?? 0)));
    ksort($days, SORT_STRING);
    while (count($days) > 400) array_shift($days);
    $m['cedays'] = $days;
}

// the second Tuesday (Microsoft's release day) + 14 days: when a month's update is due under Cyber Essentials v3.3
function pce_due($ym) {
    $t = strtotime($ym . '-01 00:00 UTC');
    if ($t === false) return '';
    while (gmdate('N', $t) !== '2') $t += 86400;
    return gmdate('Y-m-d', $t + 21 * 86400);
}

// the portal's fields for one machine
function pce_portal($m) {
    return array('cew'=>!empty($m['cew']), 'ceum'=>(string)($m['ceum'] ?? ''),
        'cemon'=>(isset($m['cemon']) && is_array($m['cemon'])) ? $m['cemon'] : (object)array(),
        'cedays'=>(isset($m['cedays']) && is_array($m['cedays'])) ? $m['cedays'] : (object)array());
}

}
