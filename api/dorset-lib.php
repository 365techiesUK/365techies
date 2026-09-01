<?php
/*
 * Shared plumbing for the Bournemouth365 Portal data endpoints.
 *
 * WHY THESE EXIST AT ALL. The 3D portal is a static build: every one of its
 * data sources currently runs as a Vite dev-server plugin, and `configureServer`
 * does not exist in a production bundle. So the built app renders a beautiful
 * map with nothing on it. These endpoints are the production half — the same
 * fetch-and-cache shape as bm-sea.php and visitors.php, holding the keys
 * server-side so the browser never sees one.
 *
 * ⚠️ TWO SOURCES DELIBERATELY DO NOT LIVE HERE.
 *   - The crowd signal layer already has a production endpoint:
 *     api/signal-check.php?map=1. Nothing new is needed; the client just
 *     points at it.
 *   - The ArcGIS scheduled-roadworks feed needs no key, filters server-side by
 *     bounding box and sends Access-Control-Allow-Origin: *, so the browser
 *     calls it directly. Proxying it here would add a hop and buy nothing.
 *
 * ⚠️ AND TWO LAYERS MUST NEVER BE SERVED FROM HERE.
 * The van drive-test log and the 3D reconstructions are engineer-only and
 * backend-marked private respectively. They reach the dev build through the
 * /dorset-api proxy with an engineer bearer token attached. There is no
 * production endpoint for either, and adding one would publish private data.
 *
 * HOUSE RULES OBSERVED THROUGHOUT:
 *   - a cache miss or upstream wobble serves the LAST GOOD payload, marked
 *     stale, rather than an empty one. An empty layer is a claim about the
 *     world ("no buses running") rather than about the feed;
 *   - every cache file is gitignored AND .htaccess-denied;
 *   - keys live in api/dorset-keys.php, which is both;
 *   - NO closing tag in this file.
 */

if (!defined('DORSET_LIB')) {
    define('DORSET_LIB', 1);

    date_default_timezone_set('Europe/London');

    /*
     * The conurbation plus the A31 corridor out to Ringwood. Used for every
     * geographic filter so one definition governs buses, roadworks, flood
     * stations and satellite alike — a layer that disagreed with its
     * neighbours about where "here" is would be quietly wrong at the edges.
     */
    define('DORSET_W', -2.25);
    define('DORSET_S', 50.65);
    define('DORSET_E', -1.55);
    define('DORSET_N', 50.95);

    /** Send a JSON body and stop. Never cached by the browser. */
    function dorset_send($body, $status = 200) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Robots-Tag: noindex, nofollow');
        /*
         * ⚠️ NO JSON_UNESCAPED_UNICODE, AND THAT IS DELIBERATE.
         * This host re-encodes response bytes: a correctly UTF-8 encoded "©"
         * (C2 A9) arrived at the browser as "Â©" (C3 82 C2 A9), and it did so
         * even when PHP generated the code point at runtime rather than
         * reading it from the file. Something in the output layer is treating
         * our bytes as Latin-1 — mb_output_handler or similar.
         *
         * Letting json_encode escape non-ASCII as \uXXXX makes every response
         * pure ASCII, which no re-encoding can corrupt, and every JSON parser
         * decodes back to the same characters. Slightly larger payloads; total
         * immunity to a hosting layer we do not control. That matters most for
         * the attribution strings, which are licence conditions rather than
         * decoration.
         */
        echo json_encode($body, JSON_UNESCAPED_SLASHES);
        exit;
    }

    /**
     * One HTTP GET with a single retry.
     *
     * The retry is not superstition: the EA endpoints were observed answering
     * 503 then 502 then succeeding during research (see bm-sea-lib.php), and a
     * single-shot fetch would mark a layer dead on what is really a hiccup.
     *
     * Returns array(body|null, http code). The caller decides what a failure
     * means — this never throws and never echoes.
     */
    function dorset_http($url, $timeout = 20, $headers = array()) {
        for ($attempt = 0; $attempt < 2; $attempt++) {
            $ch = @curl_init($url);
            if (!$ch) return array(null, 0);
            @curl_setopt_array($ch, array(
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => $timeout,
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_MAXREDIRS      => 3,
                CURLOPT_HTTPHEADER     => $headers,
                // ⚠️ A HONEST, PINNED USER AGENT IS LOAD-BEARING. The van
                // stack learned this the hard way: a WAF 403s default library
                // agents, and several of these providers rate-limit unknown
                // ones. It also lets a provider find us if we misbehave.
                CURLOPT_USERAGENT      => '365techies-bournemouth365/1.0 (+https://365techies.co.uk/)',
            ));
            $body = @curl_exec($ch);
            $code = (int)@curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            @curl_close($ch);
            if ($body !== false && $code >= 200 && $code < 300) return array($body, $code);
            if ($code === 401 || $code === 403 || $code === 429) return array(null, $code);  // no point retrying
            if ($attempt === 0) usleep(400000);
        }
        return array(null, isset($code) ? $code : 0);
    }

    /** As dorset_http, but decodes JSON. Returns null unless it decoded to an array. */
    function dorset_http_json($url, $timeout = 20, $headers = array()) {
        $headers[] = 'Accept: application/json';
        list($body, $code) = dorset_http($url, $timeout, $headers);
        if ($body === null) return null;
        $j = json_decode($body, true);
        return is_array($j) ? $j : null;
    }

    /**
     * Read a cache file if it is younger than $ttl seconds.
     * Returns null on miss, so `?: ` chains read naturally.
     *
     * ⚠️ PASS $version WHENEVER THE PAYLOAD SHAPE CAN CHANGE.
     * A deploy that adds a field to a response cannot be observed while an old
     * cache is still being served, and with a six-hour TTL that is six hours of
     * looking at a fix that has in fact shipped — which is exactly what
     * happened to the satellite endpoint's scene date. When $version is given
     * it must match the `v` stored alongside the payload, so new code never
     * serves a payload built by old code.
     */
    function dorset_cache_get($file, $ttl, $version = null) {
        if (!is_file($file)) return null;
        if ((time() - (int)@filemtime($file)) >= $ttl) return null;
        $j = json_decode((string)@file_get_contents($file), true);
        if (!is_array($j)) return null;
        if ($version !== null && (!isset($j['v']) || $j['v'] !== $version)) return null;
        return $j;
    }

    /** The last good payload regardless of age, for honest degradation. */
    function dorset_cache_stale($file, $maxAge = 21600) {
        if (!is_file($file)) return null;
        if ((time() - (int)@filemtime($file)) > $maxAge) return null;
        $j = json_decode((string)@file_get_contents($file), true);
        return is_array($j) ? $j : null;
    }

    /**
     * Write atomically. A half-written cache read by a concurrent request is
     * indistinguishable from a corrupt feed, and on shared hosting concurrent
     * requests are the normal case rather than the exception.
     */
    function dorset_cache_put($file, $data) {
        $tmp = $file . '.' . getmypid() . '.tmp';
        if (@file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) === false) return false;
        return @rename($tmp, $file);
    }

    /**
     * Crude site-wide rate limit on the UPSTREAM call, not on the visitor.
     * The thing being protected is our quota with the provider — National
     * Highways cap at 10 calls a minute and treat overrunning as abuse — so
     * this counts calls we make, and the caller serves cache when it trips.
     */
    function dorset_rate_ok($file, $perMinute) {
        $min = (int)floor(time() / 60);
        $r = json_decode((string)@file_get_contents($file), true);
        if (!is_array($r) || !isset($r['min']) || $r['min'] !== $min) $r = array('min' => $min, 'n' => 0);
        if ($r['n'] >= $perMinute) return false;
        $r['n']++;
        @file_put_contents($file, json_encode($r), LOCK_EX);
        return true;
    }

    /** True when a point falls inside the conurbation box. */
    function dorset_in_box($lon, $lat) {
        return is_numeric($lon) && is_numeric($lat)
            && $lon >= DORSET_W && $lon <= DORSET_E
            && $lat >= DORSET_S && $lat <= DORSET_N;
    }

    /**
     * Load server-only credentials. Absent file is NOT an error: every layer
     * degrades to "not configured" and says so, which is how the portal comes
     * up on a fresh server without a wall of failures.
     */
    function dorset_keys() {
        static $k = null;
        if ($k !== null) return $k;
        $k = array();
        $f = __DIR__ . '/dorset-keys.php';
        if (is_file($f)) {
            $BODS_API_KEY = ''; $NH_API_KEY = ''; $CDSE_CLIENT_ID = ''; $CDSE_CLIENT_SECRET = '';
            $TOMTOM_API_KEY = '';
            require $f;
            $k = array(
                'bods' => $BODS_API_KEY,
                'nh'   => $NH_API_KEY,
                'cdse_id' => $CDSE_CLIENT_ID,
                'cdse_secret' => $CDSE_CLIENT_SECRET,
                'tomtom' => $TOMTOM_API_KEY,
            );
        }
        return $k;
    }

    /**
     * The standard "we could not refresh" answer: serve the last good payload
     * with stale:true and a reason, or an explicit empty with the reason. The
     * client can then say "last seen 14:05" instead of implying the world
     * emptied out.
     */
    function dorset_degrade($cacheFile, $reason, $emptyShape) {
        $stale = dorset_cache_stale($cacheFile);
        if (is_array($stale)) {
            $stale['stale'] = true;
            $stale['reason'] = $reason;
            dorset_send($stale);
        }
        $empty = $emptyShape;
        $empty['ok'] = false;
        $empty['reason'] = $reason;
        dorset_send($empty);
    }
}
