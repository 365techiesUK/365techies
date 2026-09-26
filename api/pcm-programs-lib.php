<?php
// Programs check - the server half (app v28, PC Service Professional v4.11, the service report email).
// ONE list: downloads/pcm/programs-rules.json (git-deployed, public - it names programs and gives a sourced, factual
// reason for each; owner's rule 26 Sep 2026: the word scam only where a regulator found it). The app matches it
// itself (the same logic, in C#); the service tool asks progcheck; reportup evaluates the uploaded inventory so the
// customer's email and the staff Slack post carry the findings. Read-only facts in, findings out - nothing stored
// here, and the reasons always come from this server's copy of the list, never from what a PC sends.
if (!defined('PCM_PROGRAMS_LIB')) {
define('PCM_PROGRAMS_LIB', 1);

define('PCM_PROG_IDLE_REASON', "Installed, but it isn't the program protecting this PC - usually a trial that has ended. Removing it stops its reminders and any clash with the one that is.");

function pcm_prog_rules() {
    static $cache = null;
    if ($cache !== null) return $cache;
    $cache = array();
    $f = __DIR__ . '/../downloads/pcm/programs-rules.json';
    if (!is_readable($f)) return $cache;
    $raw = (string)@file_get_contents($f);
    if (substr($raw, 0, 3) === "\xEF\xBB\xBF") $raw = substr($raw, 3);
    $j = json_decode($raw, true);
    if (!is_array($j) || empty($j['ver']) || !is_array($j['rules'] ?? null)) return $cache;
    $rules = array();
    foreach ($j['rules'] as $r) {
        if (!is_array($r) || empty($r['id']) || empty($r['rx']) || empty($r['name'])) continue;
        $o = array();
        foreach (array('id', 'name', 'cat', 'kind', 'verdict', 'rx', 'prx', 'scrx', 'reason') as $k) $o[$k] = (string)($r[$k] ?? '');
        $rules[] = $o;
    }
    if ($rules) $cache = array('ver' => intval($j['ver']), 'rules' => $rules);
    return $cache;
}
function pcm_prog_ver() { $p = pcm_prog_rules(); return $p ? array('prog_ver' => $p['ver']) : array(); }

// a list pattern as a PHP regex; a pattern PHP cannot compile never matches (and never warns)
function pcm_prog_rx($rx) {
    if ($rx === '') return null;
    $p = '~' . str_replace('~', '\~', $rx) . '~i';
    return @preg_match($p, '') === false ? null : $p;
}
function pcm_prog_m($p, $s) { return $p !== null && @preg_match($p, (string)$s) === 1; }

/**
 * $installed: array of array(displayName, publisher); $av: array of array(name, on, outOfDate) from Windows' register
 * of security programs, or null when it was not read. Mirrors ProgramsCheck.Evaluate in the app (Program.cs).
 */
function pcm_prog_eval($installed, $av, $rules = null) {
    if ($rules === null) { $p = pcm_prog_rules(); $rules = $p ? $p['rules'] : array(); }
    $out = array('active' => array(), 'ood' => array(), 'unneeded' => array(), 'remote' => array(), 'programs' => 0);
    $scRead = is_array($av);
    $sec = array();
    foreach ($scRead ? $av : array() as $a) {
        if (!is_array($a) || !isset($a[0]) || trim((string)$a[0]) === '') continue;
        $n = substr(trim((string)$a[0]), 0, 60);
        $sec[] = array('n' => $n, 'on' => !empty($a[1]), 'ood' => !empty($a[2]), 'def' => stripos($n, 'Defender') !== false);
        if (count($sec) >= 10) break;
    }
    foreach ($sec as $s) {
        if ($s['on'] && !$s['def'] && !in_array($s['n'], $out['active'], true)) $out['active'][] = $s['n'];
        if ($s['on'] && $s['ood'] && !in_array($s['n'], $out['ood'], true)) $out['ood'][] = $s['n'];
    }
    if (!is_array($installed) || !$rules) return $out;
    $compiled = array();
    foreach ($rules as $r) { $r['_rx'] = pcm_prog_rx($r['rx']); $r['_prx'] = pcm_prog_rx($r['prx']); $r['_scrx'] = pcm_prog_rx($r['scrx']); if ($r['_rx'] !== null) $compiled[] = $r; }
    $used = array();
    foreach ($installed as $it) {
        if (!is_array($it) || !isset($it[0])) continue;
        $name = (string)$it[0]; $pub = (string)($it[1] ?? '');
        if (trim($name) === '') continue;
        $out['programs']++;
        $hit = null;
        foreach ($compiled as $r) if ($r['cat'] === 'allow' && pcm_prog_m($r['_rx'], $name) && ($r['_prx'] === null || pcm_prog_m($r['_prx'], $pub))) { $hit = $r; break; }
        if ($hit) continue;
        foreach ($compiled as $r) if ($r['cat'] !== 'allow' && pcm_prog_m($r['_rx'], $name) && ($r['_prx'] === null || pcm_prog_m($r['_prx'], $pub))) { $hit = $r; break; }
        if (!$hit || isset($used[$hit['id']])) continue;
        $row = array('id' => $hit['id'], 'name' => $hit['name'], 'dn' => substr($name, 0, 80), 'verdict' => $hit['verdict'], 'reason' => $hit['reason']);
        if ($hit['cat'] === 'remote_access') { $used[$hit['id']] = 1; $out['remote'][] = $row; continue; }
        if ($hit['cat'] === 'security') {
            // a suite the list itself says to replace is reported whether or not it is on duty (as the app does)
            if ($hit['kind'] === 'realtime_suite' && ($hit['verdict'] === 'remove' || $hit['verdict'] === 'not_needed')) { $used[$hit['id']] = 1; $out['unneeded'][] = $row; continue; }
            if ($hit['kind'] === 'realtime_suite') {
                // installed but not on duty - only when the register was read and ANOTHER program is protecting
                $onDuty = false; $other = false;
                foreach ($sec as $s) {
                    $mine = pcm_prog_m($hit['_scrx'], $s['n']) || pcm_prog_m($hit['_rx'], $s['n']);
                    if ($s['on'] && $mine) $onDuty = true;
                    if ($s['on'] && !$mine) $other = true;
                }
                if ($scRead && !$onDuty && $other) { $used[$hit['id']] = 1; $row['verdict'] = 'not_needed'; $row['reason'] = PCM_PROG_IDLE_REASON; $out['unneeded'][] = $row; }
                continue;
            }
            if ($hit['verdict'] !== 'remove' && $hit['verdict'] !== 'not_needed') continue;
        }
        if ($hit['verdict'] === 'remove' || $hit['verdict'] === 'not_needed') { $used[$hit['id']] = 1; $out['unneeded'][] = $row; }
    }
    usort($out['unneeded'], function ($a, $b) {
        $ka = $a['verdict'] === 'remove' ? 0 : 1; $kb = $b['verdict'] === 'remove' ? 0 : 1;
        return $ka !== $kb ? $ka - $kb : strcasecmp($a['name'], $b['name']);
    });
    return $out;
}

// the inventory the service tool uploads (summary.software.items = [{n, v, pub, upd}]) as evaluator input
function pcm_prog_from_software($sw) {
    $inst = array();
    foreach ((array)(is_array($sw) && isset($sw['items']) ? $sw['items'] : array()) as $it) {
        if (!is_array($it)) continue;
        $inst[] = array((string)($it['n'] ?? ''), (string)($it['pub'] ?? ''));
        if (count($inst) >= 400) break;
    }
    return $inst;
}
// the register rows the tool sends (summary.av = [[name, on, outOfDate]]), or null when it sent none
function pcm_prog_av_in($av) {
    if (!is_array($av)) return null;
    $o = array();
    foreach ($av as $a) { if (is_array($a) && isset($a[0])) $o[] = array((string)$a[0], !empty($a[1]), !empty($a[2])); if (count($o) >= 10) break; }
    return $o;
}

}
