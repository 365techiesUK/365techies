<?php
/**
 * The portal web-session check, as a pure function.
 *
 * Standalone customer endpoints (pcm-myinvoices.php, and anything like it) each
 * need the same gate, and including pcm.php or pcm-booking.php to borrow it
 * would run their whole action routers. Before this file the choice was to
 * re-type the rules in every such endpoint - and an auth ladder that is re-typed
 * is an auth ladder that eventually fails OPEN somewhere. So: one function, no
 * side effects, no globals, an injectable clock, and a test that pins every
 * refusal.
 *
 * ⚠ The rules must stay in step with pcm.php's custaddr block and
 * pcm-booking.php's web_snapshot(). Those two are older and keep their own
 * copies; this is the canonical one for anything new.
 *
 * Returns array('ok' => true, 'key' => <customer key>, 'viewas' => bool)
 *      or array('ok' => false, 'error' => 'expired' | 'ask_your_manager' | 'db_unavailable')
 * A refusal carries NOTHING else: no key, no name, no hint about whether the
 * customer or the session existed.
 */
if (!function_exists('portal_session_check')) {

    function portal_session_check($db, $wtoken, $machine, $now = null) {
        if ($now === null) $now = time();
        if (!is_array($db)) return array('ok' => false, 'error' => 'db_unavailable');
        $wt = preg_replace('/[^a-f0-9]/', '', (string)$wtoken);
        if ($wt === '') return array('ok' => false, 'error' => 'expired');
        $ws = isset($db['websessions'][$wt]) && is_array($db['websessions'][$wt]) ? $db['websessions'][$wt] : null;
        if (!$ws) return array('ok' => false, 'error' => 'expired');

        // Sliding window and hard cap, by session kind.
        if (!empty($ws['forever']))   { $slide = 31536000; $cap = null; }
        elseif (!empty($ws['long']))  { $slide = 5184000;  $cap = 7776000; }
        else                          { $slide = 43200;    $cap = 86400; }
        $fresh = intval(isset($ws['ts']) ? $ws['ts'] : 0) > $now - $slide
              && ($cap === null || intval(isset($ws['iat']) ? $ws['iat'] : 0) > $now - $cap);

        /* FAIL CLOSED on the machine binding. Omitting the field (so $machine is
           '') must NOT skip the check, or a stolen bearer token could be replayed
           from any device simply by leaving the field out. */
        if ($fresh && !empty($ws['machine']) && $ws['machine'] !== (string)$machine) $fresh = false;
        if (!$fresh) return array('ok' => false, 'error' => 'expired');

        // Account-level data belongs to the account holder: a company team
        // member is told who to ask, and gets nothing else.
        if (!empty($ws['member'])) return array('ok' => false, 'error' => 'ask_your_manager');

        $key = (string)(isset($ws['key']) ? $ws['key'] : '');
        if ($key === '' || !isset($db['customers'][$key]) || !is_array($db['customers'][$key]))
            return array('ok' => false, 'error' => 'expired');

        return array('ok' => true, 'key' => $key, 'viewas' => !empty($ws['viewas']));
    }

    /**
     * The 365 PC Manager app's own gate: a licence key plus a machine that has
     * actually been activated against it. The app has no web session, so this is
     * the equivalent ladder for it, and it is deliberately STRICTER than a
     * check-in: an unregistered machine is refused rather than quietly ignored,
     * because this is used to hand back account data rather than to record
     * telemetry.
     *
     * Same shape as portal_session_check(), so a caller can accept either.
     * A refusal carries nothing but the reason.
     */
    function app_licence_check($db, $rawKey, $rawMachine, $needPro = false) {
        if (!is_array($db)) return array('ok' => false, 'error' => 'db_unavailable');
        // Normalised exactly as pcm.php does, or a key would match here and miss there.
        $key = strtoupper(preg_replace('/[^A-Za-z0-9\-]/', '', (string)$rawKey));
        $machine = preg_replace('/[^a-f0-9]/', '', substr((string)$rawMachine, 0, 32));
        if ($key === '' || $machine === '') return array('ok' => false, 'error' => 'missing');
        if (!isset($db['customers'][$key]) || !is_array($db['customers'][$key]))
            return array('ok' => false, 'error' => 'unknown_key');
        $c = $db['customers'][$key];
        $machines = isset($c['machines']) && is_array($c['machines']) ? $c['machines'] : array();
        if (!isset($machines[$machine])) return array('ok' => false, 'error' => 'activate_first');
        if ($needPro && (string)(isset($c['tier']) ? $c['tier'] : 'free') !== 'pro')
            return array('ok' => false, 'error' => 'not_on_support');
        return array('ok' => true, 'key' => $key, 'viewas' => false, 'via' => 'app');
    }
}
