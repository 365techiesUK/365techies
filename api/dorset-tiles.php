<?php
/*
 * Bournemouth365 portal: the DAILY ALLOWANCE for Google Photorealistic 3D Tiles.
 *
 * WHY THIS EXISTS. Google bills the 3D city per ROOT TILE REQUEST - one per
 * visitor who clicks "Explore in 3D" - at $6 per 1,000 after 1,000 free a
 * month, i.e. about 32 a day. The console's own daily quota is the proper
 * ceiling, but a Free Trial billing account cannot edit quotas (Google's
 * documented restriction), and a quota that lives in someone else's console is
 * one click from being raised anyway. This file is the ceiling WE own: the
 * client must obtain a ticket here before it creates the tileset, and there
 * are only $DAILY tickets a day. When they are gone the map says so and stays
 * on the free flat map - "3D busy today" rather than a bill or a dark map.
 *
 * Two operations:
 *   GET  dorset-tiles.php?status=1   read-only: {used, remaining, resetsAt}
 *   POST dorset-tiles.php?ticket=1   consume one:  {granted, remaining, ...}
 * The ticket is POST-only on purpose: a GET could be consumed by a link
 * prefetcher, a crawler or a curious person pasting the URL, and each of those
 * would spend a real visitor's 3D view.
 *
 * Fail CLOSED. If the counter file cannot be locked, no ticket is issued - the
 * visitor keeps the flat map and nobody is billed. The client treats any
 * non-granted answer, including a network error, the same way.
 *
 * The counter is UTC-day keyed because Google's daily quotas reset on Pacific
 * time and ours on UTC; the mismatch is harmless (ours is the smaller number)
 * and UTC is what the client can compute for "back after midnight".
 *
 * Stores (gitignored; served-denied by the dorset-*-(budget|rate).json rule in
 * .htaccess): dorset-tiles-budget.json, dorset-tiles-rate.json.
 */
error_reporting(0);
require __DIR__ . '/dorset-lib.php';
require __DIR__ . '/dorset-tiles-fn.php';   // per-day history helpers (pure, tested)

$BUDGET = __DIR__ . '/dorset-tiles-budget.json';
$RATE   = __DIR__ . '/dorset-tiles-rate.json';

/*
 * Tickets per UTC day. 30 keeps a full month inside Google's 1,000 free root
 * requests with a margin for the odd retry. Raise it only with the console
 * quota raised to match - this number is a promise about the bill, not a UX
 * setting.
 */
$DAILY = 30;

/* Per-day counts kept in the store beside the live counter (added 5 Sep 2026 so
 * "how many 3D opens a day" has a server-side answer). ?status=1 shows the last
 * 30 days, zeros filled in; the store keeps this many. */
$HISTORY_DAYS = 90;

/* Site-wide guard on the counter file itself: a storm of ticket requests must
 * not be able to hold the lock in a loop. 120/min is far above any honest
 * traffic; when it trips the answer is "not granted", never an error page. */
$PER_MINUTE = 120;

function tiles_day() { return gmdate('Y-m-d'); }
function tiles_resets_at() { return gmdate('Y-m-d\TH:i:s\Z', strtotime('tomorrow UTC')); }

function tiles_shape($state, $daily, $extra = array()) {
    $used = (is_array($state) && isset($state['day']) && $state['day'] === tiles_day() && isset($state['used']))
        ? (int)$state['used'] : 0;
    $remaining = max(0, $daily - $used);
    return array_merge(array(
        'ok'        => true,
        'generated' => gmdate('c'),
        'day'       => tiles_day(),
        'daily'     => $daily,
        'used'      => $used,
        'remaining' => $remaining,
        'resetsAt'  => tiles_resets_at(),
    ), $extra);
}

$wantTicket = isset($_GET['ticket']);
$wantStatus = isset($_GET['status']);

if (!$wantTicket && !$wantStatus) {
    dorset_send(array('ok' => false, 'reason' => 'usage', 'usage' => 'GET ?status=1 or POST ?ticket=1'), 400);
}

if (!dorset_rate_ok($RATE, $PER_MINUTE)) {
    // Over the site-wide guard: never grant, never error. The client shows
    // "unavailable right now" and keeps the flat map.
    dorset_send(array('ok' => true, 'generated' => gmdate('c'), 'granted' => false, 'reason' => 'rate',
                      'resetsAt' => tiles_resets_at()), 200);
}

if ($wantStatus) {
    // The state is wrapped because a brand-new store legitimately reads as
    // null, and null is also what the helper returns when it cannot take the
    // lock. The wrapper keeps "nothing yet" (30 remaining) distinct from
    // "cannot lock" (fail closed: zero remaining, button disabled).
    $read = dorset_counter_update($BUDGET, function ($cur) { return array(null, array('state' => $cur)); });
    if ($read === null) dorset_send(array('ok' => false, 'reason' => 'lock', 'remaining' => 0, 'resetsAt' => tiles_resets_at()), 503);
    dorset_send(tiles_shape($read['state'], $DAILY, array(
        'history'         => tiles_history_view($read['state'], tiles_day(), 30),
        'historyKeptDays' => $HISTORY_DAYS,
    )));
}

// ?ticket=1 : POST only.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    dorset_send(array('ok' => false, 'reason' => 'method', 'granted' => false, 'usage' => 'POST ?ticket=1'), 405);
}

$daily = $DAILY;
$keep  = $HISTORY_DAYS;
$result = dorset_counter_update($BUDGET, function ($cur) use ($daily, $keep) {
    $day = tiles_day();
    $rolled = !is_array($cur) || !isset($cur['day']) || $cur['day'] !== $day;
    $cur = tiles_fold_history($cur, $day, $keep);   // finished day -> history; today reset; old days pruned
    if ((int)$cur['used'] >= $daily) {
        // No ticket. Write only when the day rolled, so the finished day's count is kept.
        return array($rolled ? $cur : null, array('granted' => false, 'state' => $cur));
    }
    $cur['used'] = (int)$cur['used'] + 1;
    $cur = tiles_note_history($cur);
    return array($cur, array('granted' => true, 'state' => $cur));
});

if ($result === null) {
    // Lock failure: fail closed.
    dorset_send(array('ok' => false, 'reason' => 'lock', 'granted' => false, 'resetsAt' => tiles_resets_at()), 503);
}

dorset_send(tiles_shape($result['state'], $DAILY, array(
    'granted' => $result['granted'] === true,
    'reason'  => $result['granted'] === true ? null : 'budget',
)));
