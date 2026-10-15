<?php
/**
 * When a PC last had a FULL service, for PC Manager 36.4's Home screen (owner, 15 Oct 2026: "it doesn't show when the last
 * service was done, or whether it's due a service"). The server already keeps every report a PC uploads: repk[ts] is
 * 'service' (our six-weekly service, run with PC Service Professional) or 'selfrun' (the customer ran the full service from
 * the app); health checks are not services. The app knows its OWN runs from its job history; this adds ours - the visits
 * a plan PC gets every six weeks - so it can say "Last serviced by 365 on ..." honestly. Returns array(ts, kind) or (0, '').
 */
function pcm_last_service($m) {
    $best = 0; $kind = '';
    if (!is_array($m) || !isset($m['repk']) || !is_array($m['repk'])) return array(0, '');
    foreach ($m['repk'] as $ts => $k) {
        $t = intval($ts);
        if (($k === 'service' || $k === 'selfrun') && $t > $best) { $best = $t; $kind = $k; }
    }
    return array($best, $kind);
}
