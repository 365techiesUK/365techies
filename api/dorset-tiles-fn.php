<?php
/*
 * Pure helpers for the 3D-tiles ticket store: a rolling per-day history kept
 * beside the live counter, so "how many 3D opens a day" is answerable from the
 * server (GA4 sees only the visitors who accept the banner). No I/O in here -
 * dorset-tiles.php calls these inside its locked counter update, and the test
 * harness calls them directly.
 *
 * Store shape after this change (backward compatible - an old store has no
 * 'history' key and reads as an empty map):
 *   {"day":"2026-09-06","used":4,"history":{"2026-09-05":0,"2026-09-06":4}}
 */

/**
 * Bring the stored state up to $day: the day that just finished (if any) is
 * folded into 'history', today's counter is reset, and days older than
 * $keepDays are pruned. Safe on null (fresh store) and on a legacy store.
 */
function tiles_fold_history($cur, $day, $keepDays) {
    if (!is_array($cur)) $cur = array();
    $hist = (isset($cur['history']) && is_array($cur['history'])) ? $cur['history'] : array();
    if (isset($cur['day']) && is_string($cur['day']) && $cur['day'] !== $day && isset($cur['used'])) {
        $hist[$cur['day']] = (int)$cur['used'];   // the day that just finished
    }
    if (!isset($cur['day']) || $cur['day'] !== $day) { $cur['day'] = $day; $cur['used'] = 0; }
    $cur['used'] = (int)$cur['used'];
    $cutoff = gmdate('Y-m-d', strtotime($day . ' UTC') - (int)$keepDays * 86400);
    foreach (array_keys($hist) as $k) {
        if (!is_string($k) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $k) || $k < $cutoff) unset($hist[$k]);
    }
    ksort($hist);
    $cur['history'] = $hist;
    return $cur;
}

/** Record today's live count in the map (call after a ticket is granted). */
function tiles_note_history($cur) {
    if (!isset($cur['history']) || !is_array($cur['history'])) $cur['history'] = array();
    $cur['history'][$cur['day']] = (int)$cur['used'];
    return $cur;
}

/**
 * A dense view of the last $days days ending $today: day => count, zero where
 * nothing happened. The live day (or a finished day the store has not rolled
 * past yet) is read from the counter itself, so the view never lags the store.
 */
function tiles_history_view($state, $today, $days) {
    $hist = (is_array($state) && isset($state['history']) && is_array($state['history'])) ? $state['history'] : array();
    if (is_array($state) && isset($state['day'], $state['used']) && is_string($state['day'])) {
        $hist[$state['day']] = (int)$state['used'];
    }
    $out = array();
    $t = strtotime($today . ' UTC');
    for ($i = (int)$days - 1; $i >= 0; $i--) {
        $d = gmdate('Y-m-d', $t - $i * 86400);
        $out[$d] = isset($hist[$d]) ? (int)$hist[$d] : 0;
    }
    return $out;
}

/** The first day the history covers: the earliest stored day, else the live day.
 *  Zeros in the view before this date mean "not recorded", not "nobody came". */
function tiles_history_since($state, $today) {
    $days = array();
    if (is_array($state) && isset($state['history']) && is_array($state['history'])) $days = array_keys($state['history']);
    if (is_array($state) && isset($state['day']) && is_string($state['day'])) $days[] = $state['day'];
    $days = array_filter($days, function ($d) { return is_string($d) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $d); });
    return $days ? min($days) : $today;
}
