<?php
/*
 * Live-visitors STATISTICS - the library (include-only; .htaccess denies it as a URL). 29 Sep 2026.
 *
 * The Cloudflare Worker (visitors-live-worker.js) is transport: it holds a rolling 5-minute window and nothing else.
 * "Where do the views come from" over a day or a month is tallied HERE, on our own server, from what the Worker shows
 * while it is fresh: every fresh poll from the staff portal (api/visitors.php, at most every 90 s while a staff
 * screen is open) and the cron (api/visitors-cron.php, every 5 minutes, which skips when the portal polled recently)
 * fold the visitors on show into api/visitors-stats.json.
 *
 * Counting rules:
 *   - a visitor counts ONCE per UTC day per site (the Worker's visitor id already rotates daily), whatever they read;
 *   - a page counts once per visitor per day ("views" = distinct visitor-page pairs, not pings);
 *   - the device (system, phone/tablet/PC, browser) is counted the first time it is known - a visitor an older Worker
 *     saw without it is counted when a later poll knows it;
 *   - "warm" = the visitor reached a booking, contact, price or plan page (365techies.co.uk only), once a day.
 * Nothing here is more personal than the Worker's rows: rough town, page path, source name, device words. No names,
 * no IP addresses, no visitor ids beyond today and yesterday (kept only to count each visitor once).
 *
 * Store: api/visitors-stats.json (gitignored + denied) - {v, since, days: {YYYY-MM-DD: {site: rollup}}, seen: {...}}.
 * Days older than 60 are dropped; 'seen' keeps today and yesterday only. Written whole-or-nothing under a lock.
 * NO closing tag in this file.
 */

// what the portal calls "warm" (NXL_WARM in build_extra.py) - keep the two lists the same
function vis_warm_paths() {
    return array('/book-service/', '/contact/', '/pay/', '/pricing/', '/home-it-support-plans/', '/business-it-support-plans/',
        '/monthly-it-support/', '/plan-finder/', '/dell-support-plans/');
}
// 1 Oct 2026: the beacon's action pings - /~dl/pcm/ (a PC Manager download click), /~call/<page>, /~text/<page>,
// /~lead/<page> (an enquiry form sent). Returns dl, call, text or lead; '' for an ordinary page.
function vis_act_kind($p) {
    return preg_match('#^/~(dl|call|text|lead)/#', (string)$p, $m) ? $m[1] : '';
}
// the actions in a page-count map: how many of each (each visitor once a day), and the pages the calls, texts and
// enquiries came from (the page path after the kind; a download says nothing about its page)
function vis_actions(array $pages, $nFrom = 8) {
    $acts = array('dl' => 0, 'call' => 0, 'text' => 0, 'lead' => 0); $from = array();
    foreach ($pages as $k => $n) {
        $kind = vis_act_kind($k);
        if ($kind === '') continue;
        $acts[$kind] += (int)$n;
        if ($kind === 'dl') continue;
        $src = substr((string)$k, strlen($kind) + 2);
        if ($src === '' || $src[0] !== '/') $src = '/';
        if (!isset($from[$src])) $from[$src] = array('call' => 0, 'text' => 0, 'lead' => 0, 'n' => 0);
        $from[$src][$kind] += (int)$n; $from[$src]['n'] += (int)$n;
    }
    uasort($from, function ($x, $y) { return $y['n'] - $x['n']; });
    $list = array();
    foreach (array_slice($from, 0, $nFrom, true) as $k => $v) $list[] = array('k' => (string)$k, 'n' => $v['n'], 'call' => $v['call'], 'text' => $v['text'], 'lead' => $v['lead']);
    return array('n' => $acts, 'from' => $list);
}
// a page-count map without the action pings (the Pages lists show what people read)
function vis_reads(array $pages) {
    $out = array();
    foreach ($pages as $k => $n) if (vis_act_kind($k) === '') $out[$k] = $n;
    return $out;
}
function vis_sites() { return array('t365' => '365techies.co.uk', 'ccb' => 'colinclarkbuilders.co.uk', 'beckox' => 'beckox.co.uk'); }

// ---------------------------------------------------------------- the staff check (visitors.php and visitors-stats.php)
// ONE rule for a portal staff token - the same as need_staff() in pcm-booking.php (3 Oct 2026). Signed in on your own
// computer ("trust") = 30 days since it was last used, 90 days at most; a shared computer = 12 hours; always bound to
// the computer it was made on. These checks used a flat 12 hours from sign-in, so on a trusted sign-in the staff area
// kept working while the Live view, statistics, Calls & texts, installs and the three consoles said "auth" /
// "session expired" after 12 hours. Every check of a staff token outside pcm-booking.php comes here.
function vis_staff_rec_ok($sS, $macS) {
    if (!is_array($sS)) return false;
    $slide = !empty($sS['trust']) ? 2592000 : 43200;
    $cap   = !empty($sS['trust']) ? 7776000 : 43200;
    return (time() - intval(isset($sS['ts']) ? $sS['ts'] : 0)) < $slide
        && (time() - intval(isset($sS['iat']) ? $sS['iat'] : 0)) < $cap
        && !empty($sS['machine']) && $sS['machine'] === (string)$macS;
}
function vis_staff_ok(array $in, $dir) {
    $tokS = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['stoken']) ? $in['stoken'] : ''));
    $macS = preg_replace('/[^a-f0-9]/', '', substr((string)(isset($in['machine']) ? $in['machine'] : ''), 0, 32));
    if ($tokS !== '') {
        $dbT = @json_decode((string)@file_get_contents($dir . '/pcm-data.json'), true);
        $sS = (is_array($dbT) && isset($dbT['staff'][$tokS])) ? $dbT['staff'][$tokS] : null;
        if (vis_staff_rec_ok($sS, $macS)) return true;
    }
    @session_start();
    return !empty($_SESSION['pcm_ok']);   // a console session works too
}

// ---------------------------------------------------------------- the Worker: address + token, one fetch, the shape the portal reads
function vis_config($dir) {
    $cfgsrc = (string)@file_get_contents($dir . '/visitors-key.php');
    $u = preg_match('/\$VIS_URL\s*=\s*[\'"]([^\'"]+)[\'"]/', $cfgsrc, $m1) ? rtrim($m1[1], '/') : '';
    $k = preg_match('/\$VIS_TOKEN\s*=\s*[\'"]([^\'"]+)[\'"]/', $cfgsrc, $m2) ? $m2[1] : '';
    return array($u, $k);
}
function vis_fetch_live($u, $k) {   // -> array(code, decoded json or null, curl error)
    $ch = curl_init($u . '/live?site=all&auth=' . rawurlencode($k));
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6,
        CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS));
    $body = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $cerr = (string)curl_error($ch);
    curl_close($ch);
    $j = json_decode((string)$body, true);
    return array($code, is_array($j) ? $j : null, $cerr);
}
// the Worker's answer -> what the staff portal's Live view reads (every field bounded); 'why' says, in plain words,
// what went wrong when it did (staff only; never the token or the raw reply)
function vis_shape($code, $j, $cerr) {
    $out = array('ok' => true, 'at' => time(), 'sites' => array());
    $werr = (is_array($j) && isset($j['error'])) ? (string)$j['error'] : '';
    if ($code === 0) $why = 'The web server could not reach Cloudflare' . ($cerr !== '' ? ' (' . substr($cerr, 0, 120) . ')' : '') . '.';
    elseif ($code === 403 && $werr === 'auth') $why = 'Cloudflare turned the password away: the VIS_TOKEN secret on the visitors-live Worker is missing or does not match api/visitors-key.php.';
    elseif ($code === 400 && $werr === 'site') $why = 'The visitors-live Worker is running older code. Paste visitors-live-worker.js into it again and deploy.';
    elseif ($code === 500 && $werr === 'no-kv') $why = 'The visitors-live Worker has no store connected (a KV binding named VISITS).';
    elseif ($code === 404) $why = 'Nothing answered at the Worker address in api/visitors-key.php.';
    elseif ($code !== 200 || !is_array($j) || empty($j['ok']) || !isset($j['sites'])) $why = 'Cloudflare answered HTTP ' . $code . ($werr !== '' ? ' (' . preg_replace('/[^a-z0-9-]/', '', $werr) . ')' : '') . '.';
    else $why = '';
    if ($why !== '') $out['why'] = $why;
    foreach (vis_sites() as $key => $label) {
        $sj = ($code === 200 && is_array($j) && !empty($j['ok']) && isset($j['sites'][$key])) ? $j['sites'][$key] : null;
        if ($sj) {
            $rows = array();
            foreach ((isset($sj['rows']) && is_array($sj['rows'])) ? array_slice($sj['rows'], 0, 100) : array() as $r) {
                if (!is_array($r)) continue;
                $pg = array();
                foreach ((isset($r['pages']) && is_array($r['pages'])) ? array_slice($r['pages'], -12) : array() as $p) $pg[] = substr((string)$p, 0, 200);
                $rows[] = array(
                    'id' => preg_replace('/[^a-f0-9]/', '', (string)(isset($r['id']) ? $r['id'] : '')),
                    'place' => substr((string)(isset($r['place']) ? $r['place'] : ''), 0, 60),
                    'ct' => preg_replace('/[^A-Z]/', '', substr((string)(isset($r['ct']) ? $r['ct'] : ''), 0, 2)),
                    'la' => (isset($r['la']) && is_numeric($r['la'])) ? round((float)$r['la'], 2) : null,
                    'lo' => (isset($r['lo']) && is_numeric($r['lo'])) ? round((float)$r['lo'], 2) : null,
                    'local' => !empty($r['local']),
                    'src' => (isset($r['src']) && $r['src'] !== null) ? substr((string)$r['src'], 0, 60) : null,
                    // what they are on (the Worker's deviceOf: short words only; null from an older Worker)
                    'dev' => (isset($r['dev']) && is_array($r['dev'])) ? array(
                        'os' => preg_replace('/[^A-Za-z0-9 .]/', '', substr((string)(isset($r['dev']['os']) ? $r['dev']['os'] : ''), 0, 20)),
                        'br' => preg_replace('/[^A-Za-z0-9 .]/', '', substr((string)(isset($r['dev']['br']) ? $r['dev']['br'] : ''), 0, 24)),
                        'dv' => in_array((string)(isset($r['dev']['dv']) ? $r['dev']['dv'] : ''), array('phone', 'tablet', 'pc'), true) ? (string)$r['dev']['dv'] : '',
                        'sc' => in_array((string)(isset($r['dev']['sc']) ? $r['dev']['sc'] : ''), array('s', 'm', 'l'), true) ? (string)$r['dev']['sc'] : '',
                        'dk' => !empty($r['dev']['dk']) ? 1 : 0,
                        'lg' => preg_replace('/[^A-Za-z-]/', '', substr((string)(isset($r['dev']['lg']) ? $r['dev']['lg'] : ''), 0, 12))) : null,
                    'pages' => $pg,
                    // 1 Oct 2026: a data centre or VPN (the Worker's dc) and that network's name - a company, never a person's
                    'dc' => !empty($r['dc']),
                    'org' => !empty($r['dc']) ? substr(preg_replace('/[^A-Za-z0-9 .,&()-]/', '', (string)(isset($r['org']) ? $r['org'] : '')), 0, 40) : '',
                    'since' => isset($r['since']) ? (int)$r['since'] : null,
                    'ago' => isset($r['ago']) ? (int)$r['ago'] : null);
            }
            $out['sites'][$key] = array('label' => $label, 'visitors' => (int)$sj['visitors'], 'auto' => (int)(isset($sj['auto']) ? $sj['auto'] : 0),
                'pages' => isset($sj['pages']) ? $sj['pages'] : array(),
                'places' => isset($sj['places']) ? $sj['places'] : array(),
                'rows' => $rows, 'hasRows' => isset($sj['rows']));
        } else {
            $out['sites'][$key] = array('label' => $label, 'visitors' => -1, 'error' => 'unreachable');
        }
    }
    return $out;
}

// ---------------------------------------------------------------- the tally
function vis_empty_day() {
    return array('visitors' => 0, 'local' => 0, 'uk' => 0, 'abroad' => 0, 'warm' => 0,
        'places' => array(), 'placesLocal' => array(), 'os' => array(), 'dv' => array(), 'br' => array(), 'src' => array(), 'pages' => array(),
        'byCountry' => array(),
        'auto' => 0);   // 1 Oct 2026: visitors from data centres and VPNs (mostly automated) - counted, nothing else kept   // 30 Sep 2026: per country {visitors, pages, src, os, dv} - what visitors from each country read
}
// the per-country block of a day's rollup (at most 60 countries a day; beyond that, "Other")
function &vis_bc(array &$d, $cc) {
    if (!isset($d['byCountry']) || !is_array($d['byCountry'])) $d['byCountry'] = array();
    if (!isset($d['byCountry'][$cc]) && count($d['byCountry']) >= 60) $cc = 'Other';
    if (!isset($d['byCountry'][$cc])) $d['byCountry'][$cc] = array('visitors' => 0, 'pages' => array(), 'src' => array(), 'os' => array(), 'dv' => array());
    return $d['byCountry'][$cc];
}
function vis_bump(array &$map, $key, $cap) {   // a counter with a cap: beyond it, new keys fold into "Other"
    $key = (string)$key;
    if ($key === '') return;
    if (!isset($map[$key]) && count($map) >= $cap) $key = 'Other';
    $map[$key] = (isset($map[$key]) ? (int)$map[$key] : 0) + 1;
}
// fold one /live answer (the SHAPED one, vis_shape's output, or the Worker's raw answer - both carry sites.*.rows)
// into the store. Pure: returns the new store; the caller writes it.
function vis_fold(array $store, array $live, $now) {
    if (!isset($store['v'])) $store = array('v' => 1, 'since' => '', 'days' => array(), 'seen' => array());
    if (!isset($store['days']) || !is_array($store['days'])) $store['days'] = array();
    if (!isset($store['seen']) || !is_array($store['seen'])) $store['seen'] = array();
    $at = (isset($live['at']) && is_numeric($live['at']) && (int)$live['at'] > 0) ? (int)$live['at'] : (int)$now;
    $day = gmdate('Y-m-d', $at);
    if (empty($store['since'])) $store['since'] = $day;
    $warm = array_flip(vis_warm_paths());
    if (!isset($store['seen'][$day])) $store['seen'][$day] = array();
    $seen = &$store['seen'][$day];
    foreach (vis_sites() as $site => $label) {
        if (!isset($live['sites'][$site]['rows']) || !is_array($live['sites'][$site]['rows'])) continue;
        if (!isset($store['days'][$day][$site])) $store['days'][$day][$site] = vis_empty_day();
        $d = &$store['days'][$day][$site];
        foreach ($live['sites'][$site]['rows'] as $r) {
            if (!is_array($r)) continue;
            $id = preg_replace('/[^a-f0-9]/', '', (string)(isset($r['id']) ? $r['id'] : ''));
            if ($id === '') continue;
            $sk = $site . ':' . $id;
            // 1 Oct 2026: a data centre or VPN - counted once a day as automated, and left out of everything else
            if (!empty($r['dc'])) {
                if (!isset($seen[$sk])) { $seen[$sk] = array('p' => array(), 'd' => 1, 'w' => 0, 'c' => '', 'dc' => 1); $d['auto'] = (int)(isset($d['auto']) ? $d['auto'] : 0) + 1; }
                continue;
            }
            if (isset($seen[$sk]['dc'])) continue;   // (the Worker never mixes the two for one visitor; belt and braces)
            $ct = (string)(isset($r['ct']) ? $r['ct'] : '');
            $cc = preg_match('/^[A-Z]{2}$/', $ct) ? $ct : 'Unknown';
            if (!isset($seen[$sk])) {
                $seen[$sk] = array('p' => array(), 'd' => 0, 'w' => 0, 'c' => $cc);
                $d['visitors']++;
                $bc = &vis_bc($d, $cc); $bc['visitors']++; unset($bc);
                $local = !empty($r['local']);
                if ($local) $d['local']++; elseif ($ct !== '' && $ct !== 'GB') $d['abroad']++; else $d['uk']++;
                $place = (string)(isset($r['place']) ? $r['place'] : '');
                $where = $place !== '' ? $place . ', ' . ($ct !== '' ? $ct : '?') : ($ct !== '' ? $ct : 'Unknown');
                vis_bump($d['places'], $where, 500);
                if ($local) vis_bump($d['placesLocal'], $where, 500);
                $src = (isset($r['src']) && $r['src'] !== null && (string)$r['src'] !== '') ? (string)$r['src'] : 'Unknown';
                vis_bump($d['src'], $src, 100);
                $bc = &vis_bc($d, $cc); vis_bump($bc['src'], $src, 50); unset($bc);
            }
            $s = &$seen[$sk];
            if (empty($s['c'])) $s['c'] = $cc;   // an entry from before countries were kept per visitor
            $vc = (string)$s['c'];
            // the device, the first time it is known
            if (!$s['d'] && isset($r['dev']) && is_array($r['dev']) && ((string)(isset($r['dev']['os']) ? $r['dev']['os'] : '') !== '' || (string)(isset($r['dev']['dv']) ? $r['dev']['dv'] : '') !== '')) {
                $s['d'] = 1;
                $os = (string)(isset($r['dev']['os']) ? $r['dev']['os'] : '');
                vis_bump($d['os'], $os !== '' ? $os : 'Unknown system', 50);
                if (!empty($r['dev']['dv'])) vis_bump($d['dv'], (string)$r['dev']['dv'], 5);
                if (!empty($r['dev']['br'])) vis_bump($d['br'], (string)$r['dev']['br'], 100);
                $bc = &vis_bc($d, $vc);
                vis_bump($bc['os'], $os !== '' ? $os : 'Unknown system', 30);
                if (!empty($r['dev']['dv'])) vis_bump($bc['dv'], (string)$r['dev']['dv'], 5);
                unset($bc);
            }
            // pages: each once per visitor per day
            foreach ((isset($r['pages']) && is_array($r['pages'])) ? $r['pages'] : array() as $p) {
                $p = substr((string)$p, 0, 200);
                if ($p === '' || isset($s['p'][$p])) continue;
                if (count($s['p']) >= 40) break;
                $s['p'][$p] = 1;
                vis_bump($d['pages'], $p, 500);
                $bc = &vis_bc($d, $vc); vis_bump($bc['pages'], $p, 200); unset($bc);
                // 1 Oct 2026: a tap on Call or Text, or an enquiry sent (the beacon's /~call/, /~text/, /~lead/ pings), is warm too
                if ($site === 't365' && !$s['w'] && (isset($warm[$p]) || vis_act_kind($p) === 'call' || vis_act_kind($p) === 'text' || vis_act_kind($p) === 'lead')) { $s['w'] = 1; $d['warm']++; }
            }
            unset($s);
        }
        unset($d);
    }
    unset($seen);
    // prune: 60 days of rollups; visitor ids for today and yesterday only
    $keepFrom = gmdate('Y-m-d', $at - 60 * 86400);
    foreach (array_keys($store['days']) as $k) if ($k < $keepFrom) unset($store['days'][$k]);
    $yesterday = gmdate('Y-m-d', $at - 86400);
    foreach (array_keys($store['seen']) as $k) if ($k !== $day && $k !== $yesterday) unset($store['seen'][$k]);
    ksort($store['days']);
    return $store;
}
// fold into the store on disk, under a lock; a concurrent tally (the cron and a portal poll at the same moment)
// simply skips - the other one folds the same rows. Returns true when folded, 'locked' when another tally had the
// lock, false when the store could not be written.
function vis_tally(array $live, $file, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $lock = @fopen($file . '.lock', 'c');
    if (!$lock) return false;
    if (!@flock($lock, LOCK_EX | LOCK_NB)) { fclose($lock); return 'locked'; }
    $ok = false;
    try {
        $store = @json_decode((string)@file_get_contents($file), true);
        if (!is_array($store)) $store = array();
        $store = vis_fold($store, $live, $now);
        $tmp = $file . '.' . getmypid() . '.tmp';
        if (@file_put_contents($tmp, json_encode($store)) !== false) {
            $ok = @rename($tmp, $file);
            // Linux (the server) replaces in one step; a Windows dev box cannot rename over a file that exists
            if (!$ok && DIRECTORY_SEPARATOR === '\\') { @unlink($file); $ok = @rename($tmp, $file); }
        }
        if (!$ok) @unlink($tmp);
    } finally {
        @flock($lock, LOCK_UN); fclose($lock);
    }
    return (bool)$ok;
}

// ---------------------------------------------------------------- what the portal shows: today / 7 days / 30 days, top lists
function vis_top(array $map, $n) {
    arsort($map);
    $out = array(); $i = 0;
    foreach ($map as $k => $v) { if ($k === 'Other') continue; if ($i++ >= $n) break; $out[] = array('k' => (string)$k, 'n' => (int)$v); }
    return $out;
}
function vis_period(array $store, array $days, $site) {
    $sum = vis_empty_day(); $covered = 0;
    foreach ($days as $day) {
        if (!isset($store['days'][$day]) || !is_array($store['days'][$day])) continue;
        $any = false;
        foreach ($store['days'][$day] as $sk => $d) {
            if ($site !== 'all' && $sk !== $site) continue;
            if (!is_array($d)) continue;
            $any = true;
            foreach (array('visitors', 'local', 'uk', 'abroad', 'warm', 'auto') as $f) $sum[$f] += (int)(isset($d[$f]) ? $d[$f] : 0);
            foreach (array('places', 'placesLocal', 'os', 'dv', 'br', 'src', 'pages') as $f) {
                if (!isset($d[$f]) || !is_array($d[$f])) continue;
                foreach ($d[$f] as $k => $v) $sum[$f][$k] = (isset($sum[$f][$k]) ? $sum[$f][$k] : 0) + (int)$v;
            }
            foreach ((isset($d['byCountry']) && is_array($d['byCountry'])) ? $d['byCountry'] : array() as $cc => $b) {
                if (!is_array($b)) continue;
                if (!isset($sum['byCountry'][$cc])) $sum['byCountry'][$cc] = array('visitors' => 0, 'pages' => array(), 'src' => array(), 'os' => array(), 'dv' => array());
                $sum['byCountry'][$cc]['visitors'] += (int)(isset($b['visitors']) ? $b['visitors'] : 0);
                foreach (array('pages', 'src', 'os', 'dv') as $f) {
                    if (!isset($b[$f]) || !is_array($b[$f])) continue;
                    foreach ($b[$f] as $k => $v) $sum['byCountry'][$cc][$f][$k] = (isset($sum['byCountry'][$cc][$f][$k]) ? $sum['byCountry'][$cc][$f][$k] : 0) + (int)$v;
                }
            }
        }
        if ($any) $covered++;
    }
    // per country (the busiest 8, Other never listed): what visitors from there read, where they came from, what on
    $perCountry = array(); $ccv = array();
    foreach ($sum['byCountry'] as $cc => $b) $ccv[$cc] = (int)$b['visitors'];
    foreach (vis_top($ccv, 8) as $c) {
        $b = $sum['byCountry'][$c['k']];
        $ba = vis_actions($b['pages'], 4);
        $perCountry[] = array('k' => $c['k'], 'n' => $c['n'], 'pages' => vis_top(vis_reads($b['pages']), 8), 'src' => vis_top($b['src'], 5), 'acts' => $ba['n'],
            'os' => vis_top($b['os'], 6), 'dv' => vis_top($b['dv'], 3), 'known' => array_sum($b['dv']));
    }
    $places = array();
    foreach (vis_top($sum['places'], 10) as $p) {
        $lo = isset($sum['placesLocal'][$p['k']]) ? (int)$sum['placesLocal'][$p['k']] : 0;
        $places[] = array('k' => $p['k'], 'n' => $p['n'], 'local' => $lo * 2 >= $p['n'] && $lo > 0);
    }
    // 30 Sep 2026: countries, from the towns' country codes ("Poole, GB" -> GB; a bare "GB" when no town was known)
    $countries = array();
    foreach ($sum['places'] as $k => $n) {
        if ($k === 'Other') continue;
        $cc = preg_match('/, ([A-Z]{2})$/', (string)$k, $cm) ? $cm[1] : (preg_match('/^[A-Z]{2}$/', (string)$k) ? (string)$k : 'Unknown');
        $countries[$cc] = (isset($countries[$cc]) ? $countries[$cc] : 0) + (int)$n;
    }
    $acts = vis_actions($sum['pages']);
    return array('visitors' => $sum['visitors'], 'local' => $sum['local'], 'uk' => $sum['uk'], 'abroad' => $sum['abroad'], 'warm' => $sum['warm'], 'auto' => $sum['auto'],
        'days' => $covered, 'places' => $places, 'countries' => vis_top($countries, 12), 'perCountry' => $perCountry,
        'pages' => vis_top(vis_reads($sum['pages']), 10), 'os' => vis_top($sum['os'], 12),
        'acts' => $acts['n'], 'actFrom' => $acts['from'],
        'dv' => vis_top($sum['dv'], 3), 'br' => vis_top($sum['br'], 8), 'src' => vis_top($sum['src'], 10),
        'known' => array_sum($sum['dv']));   // visitors whose device is known (the share the device lists cover)
}
function vis_stats(array $store, $now) {
    $today = gmdate('Y-m-d', $now);
    $per = array('today' => array($today), 'd7' => array(), 'd30' => array());
    for ($i = 0; $i < 30; $i++) { $dk = gmdate('Y-m-d', $now - $i * 86400); $per['d30'][] = $dk; if ($i < 7) $per['d7'][] = $dk; }
    $out = array('ok' => true, 'at' => (int)$now, 'since' => (string)(isset($store['since']) ? $store['since'] : ''), 'sites' => array());
    foreach (array_merge(array('all'), array_keys(vis_sites())) as $site) {
        $out['sites'][$site] = array();
        foreach ($per as $name => $days) $out['sites'][$site][$name] = vis_period($store, $days, $site);
    }
    return $out;
}
