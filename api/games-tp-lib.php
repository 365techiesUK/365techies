<?php
/*
 * 365 TriPeaks' rules on the server (4 Oct 2026), for the Hall of Fame: replays a game's moves from its deal number to
 * prove a win. A line-for-line copy of games/tripeaks/engine.js (the shuffle, legal, apply, the move codes, the sprint's
 * count). ⚠ Change one, change both: the scratchpad parity test (tp-parity) plays random games through both and compares.
 * Include-only (denied in .htaccess). NO closing tag in this file.
 */
if (!function_exists('tp_deal')) {

    function tp_u32($x) { return $x & 0xFFFFFFFF; }
    function tp_imul($a, $b) {   // Math.imul: the low 32 bits of a 32 x 32 multiply
        $a = tp_u32($a); $b = tp_u32($b);
        $ah = ($a >> 16) & 0xFFFF; $al = $a & 0xFFFF; $bh = ($b >> 16) & 0xFFFF; $bl = $b & 0xFFFF;
        return tp_u32(((($ah * $bl + $al * $bh) & 0xFFFF) << 16) + $al * $bl);
    }
    function tp_shuffled($seed) {   // mulberry32, as the page shuffles
        $a = tp_u32($seed); $d = range(0, 51);
        for ($i = 51; $i > 0; $i--) {
            $a = tp_u32($a + 0x6D2B79F5);
            $t = $a;
            $t = tp_imul($t ^ ($t >> 15), $t | 1);
            $t = tp_u32($t ^ tp_u32($t + tp_imul($t ^ ($t >> 7), $t | 61)));
            $r = tp_u32($t ^ ($t >> 14)) / 4294967296.0;
            $j = (int)floor($r * ($i + 1));
            $tmp = $d[$i]; $d[$i] = $d[$j]; $d[$j] = $tmp;
        }
        return $d;
    }
    function tp_rank($c) { return ($c % 13) + 1; }
    // the 28 places: row 0 = 0-2, row 1 = 3-8, row 2 = 9-17, row 3 = 18-27; COVER[i] = the two places lying over place i
    function tp_cover() {
        static $C = null;
        if ($C === null) {
            $C = array();
            for ($p = 0; $p < 3; $p++) $C[] = array(3 + 2 * $p, 4 + 2 * $p);
            for ($j = 0; $j < 6; $j++) { $p = $j >> 1; $C[] = array(9 + 3 * $p + ($j & 1), 10 + 3 * $p + ($j & 1)); }
            for ($k = 0; $k < 9; $k++) $C[] = array(18 + $k, 19 + $k);
            for ($k = 0; $k < 10; $k++) $C[] = array();
        }
        return $C;
    }
    // levels: 1 Easy (all face up, King-Ace join), 3 Normal (face down, join), 5 Hard and 7 Expert (no join)
    function tp_deal($seed, $lv) {
        $LV = array(1 => array(true, true), 3 => array(false, true), 5 => array(false, false), 7 => array(false, false));
        $lv = (int)$lv; if (!isset($LV[$lv])) $lv = 1;
        $d = tp_shuffled($seed); $tab = array();
        for ($i = 0; $i < 28; $i++) $tab[] = array($d[$i], $LV[$lv][0] || $i >= 18);
        return array('seed' => $seed, 'lv' => $lv, 'wrap' => $LV[$lv][1], 'tab' => $tab, 'stock' => array_slice($d, 28, 23), 'waste' => array($d[51]),
            'moves' => 0, 'score' => 0, 'run' => 0, 'bestRun' => 0, 'peaks' => 0, 'won' => false);
    }
    function tp_free($s, $i) {
        $C = tp_cover(); $cv = $C[$i];
        return $s['tab'][$i] !== null && (!count($cv) || ($s['tab'][$cv[0]] === null && $s['tab'][$cv[1]] === null));
    }
    function tp_fits($s, $c) {
        $n = count($s['waste']); if (!$n) return true;
        $d = abs(tp_rank($c) - tp_rank($s['waste'][$n - 1]));
        return $d === 1 || ($s['wrap'] && $d === 12);
    }
    function tp_left($s) { $n = 0; for ($i = 0; $i < 28; $i++) if ($s['tab'][$i] !== null) $n++; return $n; }
    function tp_legal($s, $m) {
        if ($s['won']) return false;
        if ($m['t'] === 'draw') return count($s['stock']) > 0;
        $i = $m['i'];
        return $i >= 0 && $i < 28 && tp_free($s, $i) && $s['tab'][$i][1] && tp_fits($s, $s['tab'][$i][0]);
    }
    function tp_apply(&$s, $m) {
        if (!tp_legal($s, $m)) return false;
        if ($m['t'] === 'draw') { $s['waste'][] = array_pop($s['stock']); $s['run'] = 0; }
        else {
            $i = $m['i']; $card = $s['tab'][$i][0];
            $s['tab'][$i] = null; $s['waste'][] = $card;
            $s['run']++; if ($s['run'] > $s['bestRun']) $s['bestRun'] = $s['run'];
            $pts = 10 * $s['run'];
            for ($j = 0; $j < 18; $j++) if ($s['tab'][$j] !== null && !$s['tab'][$j][1] && tp_free($s, $j)) $s['tab'][$j][1] = true;
            if ($i < 3) { $s['peaks']++; $pts += 250; }
            if (!tp_left($s)) { $s['won'] = true; $pts += 500; }
            $s['score'] += $pts;
        }
        $s['moves']++;
        return true;
    }
    function tp_decode($c) {
        if ($c === 'd') return array('t' => 'draw');
        if (!is_string($c) || !preg_match('/^p(\d{1,2})$/', $c, $x) || (int)$x[1] > 27) return null;
        return array('t' => 'move', 'i' => (int)$x[1]);
    }
    function tp_replay($seed, $lv, $log) {
        if (!is_array($log) || count($log) > 3000) return null;
        $s = tp_deal($seed, $lv);
        foreach ($log as $c) { $m = tp_decode($c); if (!$m || !tp_apply($s, $m)) return null; }
        return $s;
    }
    function tp_found_count($s) { return 28 - tp_left($s); }   // the sprint: cards cleared from the peaks
    // the day's deals, as the game picks them: the proven lists in games/tripeaks/deals.js
    function tp_list($lv) {
        static $lists = null;
        if ($lists === null) {
            $lists = array('k1' => array(), 'k5' => array());
            $src = (string)@file_get_contents(dirname(__DIR__) . '/games/tripeaks/deals.js');
            foreach (array_keys($lists) as $k) $lists[$k] = preg_match('/\b' . $k . ':\s*\[([0-9,\s]+)\]/', $src, $m) ? array_map('intval', explode(',', $m[1])) : array();
        }
        return (int)$lv <= 3 ? $lists['k1'] : $lists['k5'];
    }
    function tp_daily_seed($n, $lv) { $l = tp_list($lv); $len = count($l); return $len ? $l[(($n * 7919) % $len + $len) % $len] : 900000 + (($n % 90000) + 90000) % 90000; }
    function tp_sprint_seed($n) { $l = tp_list(1); $len = count($l); return $len ? $l[(($n * 104729 + 17) % $len + $len) % $len] : 1; }
}
