<?php
/*
 * 365 Spider's rules on the server (4 Oct 2026), for the Hall of Fame: replays a game's moves from its deal number to
 * prove a win. A line-for-line copy of games/spider/engine.js (the shuffle, legal, apply, the move codes, the sprint's
 * count). ⚠ Change one, change both: the scratchpad parity test (sp-parity) plays random games through both and compares.
 * Include-only (denied in .htaccess). NO closing tag in this file.
 */
if (!function_exists('sp_deal')) {

    function sp_u32($x) { return $x & 0xFFFFFFFF; }
    function sp_imul($a, $b) {   // Math.imul: the low 32 bits of a 32 x 32 multiply
        $a = sp_u32($a); $b = sp_u32($b);
        $ah = ($a >> 16) & 0xFFFF; $al = $a & 0xFFFF; $bh = ($b >> 16) & 0xFFFF; $bl = $b & 0xFFFF;
        return sp_u32(((($ah * $bl + $al * $bh) & 0xFFFF) << 16) + $al * $bl);
    }
    function sp_rank($c) { return ($c % 13) + 1; }
    function sp_suit_of($c, $suits) { $k = intdiv($c, 13); return $suits === 1 ? 0 : ($suits === 2 ? ($k % 2 === 0 ? 0 : 1) : $k % 4); }
    // levels: 1 Easy (one suit), 3 Normal (two), 5 Hard (four), 7 Expert (four, no Undo)
    function sp_lv($v) { $v = (int)$v; return $v === 2 ? 3 : ($v === 4 ? 5 : (in_array($v, array(1, 3, 5, 7), true) ? $v : 1)); }
    function sp_deal($seed, $v) {
        $lv = sp_lv($v); $suits = array(1 => 1, 3 => 2, 5 => 4, 7 => 4); $suits = $suits[$lv];
        $a = sp_u32($seed); $d = range(0, 103);
        for ($i = 103; $i > 0; $i--) {   // mulberry32, as the page shuffles
            $a = sp_u32($a + 0x6D2B79F5);
            $t = $a;
            $t = sp_imul($t ^ ($t >> 15), $t | 1);
            $t = sp_u32($t ^ sp_u32($t + sp_imul($t ^ ($t >> 7), $t | 61)));
            $r = sp_u32($t ^ ($t >> 14)) / 4294967296.0;
            $j = (int)floor($r * ($i + 1));
            $tmp = $d[$i]; $d[$i] = $d[$j]; $d[$j] = $tmp;
        }
        $tab = array(); $p = 0;
        for ($col = 0; $col < 10; $col++) $tab[] = array();
        for ($row = 0; $row < 6; $row++) for ($col = 0; $col < 10; $col++) if ($row < ($col < 4 ? 6 : 5)) $tab[$col][] = array($d[$p++], false);
        for ($col = 0; $col < 10; $col++) $tab[$col][count($tab[$col]) - 1][1] = true;
        return array('seed' => $seed, 'lv' => $lv, 'suits' => $suits, 'tab' => $tab, 'stock' => array_slice($d, $p), 'done' => 0, 'moves' => 0, 'won' => false);
    }
    function sp_run_len($s, $col) {
        $n = count($col); if (!$n || !$col[$n - 1][1]) return 0;
        $len = 1;
        for ($k = $n - 1; $k > 0; $k--) {
            $a = $col[$k]; $b = $col[$k - 1];
            if ($b[1] && sp_suit_of($a[0], $s['suits']) === sp_suit_of($b[0], $s['suits']) && sp_rank($b[0]) === sp_rank($a[0]) + 1) $len++; else break;
        }
        return $len;
    }
    function sp_empty_cols($s) { $n = 0; for ($i = 0; $i < 10; $i++) if (!count($s['tab'][$i])) $n++; return $n; }
    function sp_legal($s, $m) {
        if ($s['won']) return false;
        if ($m['t'] === 'draw') return count($s['stock']) > 0 && sp_empty_cols($s) === 0;
        $i = $m['i']; $n = $m['n']; $j = $m['j'];
        if ($i === $j || $i < 0 || $i > 9 || $j < 0 || $j > 9 || $n < 1 || $n > sp_run_len($s, $s['tab'][$i])) return false;
        $col = $s['tab'][$i]; $card = $col[count($col) - $n][0]; $dst = $s['tab'][$j];
        if (!count($dst)) return true;
        $t = $dst[count($dst) - 1];
        return $t[1] && sp_rank($t[0]) === sp_rank($card) + 1;
    }
    function sp_clear_run(&$s, $i) {
        $col = $s['tab'][$i]; $n = count($col);
        if ($n < 13 || sp_run_len($s, $col) < 13 || sp_rank($col[$n - 1][0]) !== 1) return;
        array_splice($s['tab'][$i], $n - 13, 13); $s['done']++;
        $k = count($s['tab'][$i]); if ($k && !$s['tab'][$i][$k - 1][1]) $s['tab'][$i][$k - 1][1] = true;
    }
    function sp_apply(&$s, $m) {
        if (!sp_legal($s, $m)) return false;
        if ($m['t'] === 'draw') {
            for ($i = 0; $i < 10; $i++) { $c = array_pop($s['stock']); $s['tab'][$i][] = array($c, true); }
            for ($j = 0; $j < 10; $j++) sp_clear_run($s, $j);
        } else {
            $cards = array_splice($s['tab'][$m['i']], count($s['tab'][$m['i']]) - $m['n'], $m['n']);
            foreach ($cards as $x) $s['tab'][$m['j']][] = array($x[0], true);
            $k = count($s['tab'][$m['i']]); if ($k && !$s['tab'][$m['i']][$k - 1][1]) $s['tab'][$m['i']][$k - 1][1] = true;
            sp_clear_run($s, $m['j']);
        }
        $s['moves']++;
        if ($s['done'] === 8) $s['won'] = true;
        return true;
    }
    function sp_decode($c) {
        if ($c === 'd') return array('t' => 'draw');
        if (!is_string($c) || !preg_match('/^t(\d)\.(\d{1,2})>t(\d)$/', $c, $x)) return null;
        return array('t' => 'move', 'i' => (int)$x[1], 'n' => (int)$x[2], 'j' => (int)$x[3]);
    }
    function sp_replay($seed, $lv, $log) {
        if (!is_array($log) || count($log) > 3000) return null;
        $s = sp_deal($seed, $lv);
        foreach ($log as $c) { $m = sp_decode($c); if (!$m || !sp_apply($s, $m)) return null; }
        return $s;
    }
    // the sprint's count: cards cleared, plus every face-up card sitting on the next card up in its own suit (engine inOrder)
    function sp_found_count($s) {
        $n = $s['done'] * 13;
        foreach ($s['tab'] as $col) for ($k = 1; $k < count($col); $k++) {
            $a = $col[$k]; $b = $col[$k - 1];
            if ($a[1] && $b[1] && sp_suit_of($a[0], $s['suits']) === sp_suit_of($b[0], $s['suits']) && sp_rank($b[0]) === sp_rank($a[0]) + 1) $n++;
        }
        return $n;
    }
    // the day's deals, as the game picks them: the proven lists in games/spider/deals.js
    function sp_list($lv) {
        static $lists = null;
        if ($lists === null) {
            $lists = array('s1' => array(), 's2' => array(), 's4' => array());
            $src = (string)@file_get_contents(dirname(__DIR__) . '/games/spider/deals.js');
            foreach (array_keys($lists) as $k) $lists[$k] = preg_match('/\b' . $k . ':\s*\[([0-9,\s]+)\]/', $src, $m) ? array_map('intval', explode(',', $m[1])) : array();
        }
        $lv = sp_lv($lv);
        return $lv === 1 ? $lists['s1'] : ($lv === 3 ? $lists['s2'] : $lists['s4']);
    }
    function sp_daily_seed($n, $lv) { $l = sp_list($lv); $len = count($l); return $len ? $l[(($n * 7919) % $len + $len) % $len] : 900000 + (($n % 90000) + 90000) % 90000; }
    function sp_sprint_seed($n) { $l = sp_list(1); $len = count($l); return $len ? $l[(($n * 104729 + 17) % $len + $len) % $len] : 1; }
}
