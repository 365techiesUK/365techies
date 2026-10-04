<?php
/*
 * 365 Solitaire's rules on the server (4 Oct 2026), for the Hall of Fame: the game sends the moves of a win and this
 * replays them from the deal number to prove the win is real - a score that does not replay is refused.
 * A line-for-line copy of games/solitaire/engine.js (deal, legal, apply, the move codes). ⚠ Change one, change both:
 * the scratchpad parity test (sol-parity) plays thousands of random games through both and compares every state.
 * Include-only (denied in .htaccess). NO closing tag in this file.
 */
if (!function_exists('sol_deal')) {

    // ---- mulberry32, exactly as the browser does it (32-bit integer maths on PHP's 64-bit ints)
    function sol_u32($x) { return $x & 0xFFFFFFFF; }
    function sol_imul($a, $b) {   // Math.imul: the low 32 bits of a 32 x 32 multiply
        $a = sol_u32($a); $b = sol_u32($b);
        $ah = ($a >> 16) & 0xFFFF; $al = $a & 0xFFFF; $bh = ($b >> 16) & 0xFFFF; $bl = $b & 0xFFFF;
        return sol_u32(((($ah * $bl + $al * $bh) & 0xFFFF) << 16) + $al * $bl);
    }
    function sol_shuffled($seed) {
        $a = sol_u32($seed); $d = range(0, 51);
        for ($i = 51; $i > 0; $i--) {
            $a = sol_u32($a + 0x6D2B79F5);
            $t = $a;
            $t = sol_imul($t ^ ($t >> 15), $t | 1);
            $t = sol_u32($t ^ sol_u32($t + sol_imul($t ^ ($t >> 7), $t | 61)));
            $r = sol_u32($t ^ ($t >> 14)) / 4294967296.0;
            $j = (int)floor($r * ($i + 1));
            $tmp = $d[$i]; $d[$i] = $d[$j]; $d[$j] = $tmp;
        }
        return $d;
    }
    function sol_suit($c) { return intdiv($c, 13); }
    function sol_rank($c) { return ($c % 13) + 1; }
    function sol_red($c) { $s = sol_suit($c); return $s === 1 || $s === 2; }

    // levels: 1 Easy (turn one), 3 Normal (turn three), 5 Hard (three times through), 7 Expert (once through)
    function sol_deal($seed, $lv) {
        $limits = array(1 => 0, 3 => 0, 5 => 3, 7 => 1);
        if (!isset($limits[$lv])) $lv = 1;
        $d = sol_shuffled($seed); $p = 0; $tab = array(array(), array(), array(), array(), array(), array(), array());
        for ($row = 0; $row < 7; $row++) for ($col = $row; $col < 7; $col++) $tab[$col][] = array('c' => $d[$p++], 'up' => $col === $row);
        return array('seed' => $seed, 'draw' => $lv === 1 ? 1 : 3, 'lv' => $lv, 'limit' => $limits[$lv], 'tab' => $tab,
            'stock' => array_slice($d, $p), 'waste' => array(), 'found' => array(array(), array(), array(), array()),
            'moves' => 0, 'score' => 0, 'passes' => 0, 'won' => false);
    }
    function sol_top($a) { return count($a) ? $a[count($a) - 1] : null; }
    function sol_can_recycle($s) { return !$s['limit'] || $s['passes'] + 1 < $s['limit']; }
    function sol_can_stack($card, $col) {
        if (!count($col)) return sol_rank($card) === 13;
        $t = $col[count($col) - 1];
        return $t['up'] && sol_red($t['c']) !== sol_red($card) && sol_rank($t['c']) === sol_rank($card) + 1;
    }
    function sol_can_found($card, $f) {
        if (!count($f)) return sol_rank($card) === 1;
        $t = $f[count($f) - 1];
        return sol_suit($t) === sol_suit($card) && sol_rank($card) === sol_rank($t) + 1;
    }
    function sol_found_for($s, $card) {
        $empty = -1;
        for ($i = 0; $i < 4; $i++) {
            if (count($s['found'][$i]) && sol_suit($s['found'][$i][0]) === sol_suit($card)) return sol_can_found($card, $s['found'][$i]) ? $i : -1;
            if (!count($s['found'][$i]) && $empty < 0) $empty = $i;
        }
        return sol_rank($card) === 1 ? $empty : -1;
    }
    function sol_run_len($col) { $n = 0; for ($k = count($col) - 1; $k >= 0 && $col[$k]['up']; $k--) $n++; return $n; }
    function sol_picked($s, $from) {
        if ($from['p'] === 'w') return count($s['waste']) ? array(sol_top($s['waste'])) : array();
        if ($from['p'] === 'f') return isset($s['found'][$from['i']]) && count($s['found'][$from['i']]) ? array(sol_top($s['found'][$from['i']])) : array();
        if (!isset($s['tab'][$from['i']])) return array();
        $col = $s['tab'][$from['i']]; $n = !empty($from['n']) ? $from['n'] : 1;   // as the browser's (from.n || 1)
        if ($n < 1 || $n > sol_run_len($col)) return array();
        $out = array(); foreach (array_slice($col, count($col) - $n) as $x) $out[] = $x['c'];
        return $out;
    }
    function sol_legal($s, $m) {
        if ($s['won']) return false;
        if ($m['t'] === 'draw') return count($s['stock']) > 0 || (count($s['waste']) > 0 && sol_can_recycle($s));
        $cards = sol_picked($s, $m['from']);
        if (!count($cards)) return false;
        if ($m['to']['p'] === 'f') {
            if (count($cards) !== 1 || $m['from']['p'] === 'f') return false;
            $f = $s['found'][$m['to']['i']];
            return sol_can_found($cards[0], $f) && (count($f) > 0 || sol_found_for($s, $cards[0]) >= 0);
        }
        if ($m['to']['p'] === 't') {
            if ($m['from']['p'] === 't' && $m['from']['i'] === $m['to']['i']) return false;
            return sol_can_stack($cards[0], $s['tab'][$m['to']['i']]);
        }
        return false;
    }
    // apply a legal move (returns false, changing nothing, for an illegal one)
    function sol_apply(&$s, $m) {
        if (!sol_legal($s, $m)) return false;
        if ($m['t'] === 'draw') {
            if (count($s['stock'])) {
                $k = min($s['draw'], count($s['stock']));
                for ($i = 0; $i < $k; $i++) $s['waste'][] = array_pop($s['stock']);
            } else {
                while (count($s['waste'])) $s['stock'][] = array_pop($s['waste']);
                $s['passes']++;
            }
            $s['moves']++;
            return true;
        }
        $cards = sol_picked($s, $m['from']); $pts = 0;
        if ($m['from']['p'] === 'w') array_pop($s['waste']);
        elseif ($m['from']['p'] === 'f') array_pop($s['found'][$m['from']['i']]);
        else array_splice($s['tab'][$m['from']['i']], count($s['tab'][$m['from']['i']]) - count($cards), count($cards));
        if ($m['to']['p'] === 'f') { $s['found'][$m['to']['i']][] = $cards[0]; $pts += 10; }
        else {
            foreach ($cards as $c) $s['tab'][$m['to']['i']][] = array('c' => $c, 'up' => true);
            if ($m['from']['p'] === 'w') $pts += 5;
            if ($m['from']['p'] === 'f') $pts -= 15;
        }
        if ($m['from']['p'] === 't') {
            $i = $m['from']['i']; $n = count($s['tab'][$i]);
            if ($n && !$s['tab'][$i][$n - 1]['up']) { $s['tab'][$i][$n - 1]['up'] = true; $pts += 5; }
        }
        $s['score'] = max(0, $s['score'] + $pts);
        $s['moves']++;
        if (count($s['found'][0]) + count($s['found'][1]) + count($s['found'][2]) + count($s['found'][3]) === 52) $s['won'] = true;
        return true;
    }
    function sol_decode($c) {
        $c = (string)$c;
        if ($c === 'd') return array('t' => 'draw');
        if (!preg_match('/^(w|f[0-3]|t[0-6]\.\d{1,2})>([ft])([0-6])$/', $c, $x)) return null;
        if ($x[2] === 'f' && intval($x[3]) > 3) return null;
        if ($x[1] === 'w') $from = array('p' => 'w');
        elseif ($x[1][0] === 'f') $from = array('p' => 'f', 'i' => intval($x[1][1]));
        else $from = array('p' => 't', 'i' => intval($x[1][1]), 'n' => intval(substr($x[1], 3)));
        return array('t' => 'move', 'from' => $from, 'to' => array('p' => $x[2], 'i' => intval($x[3])));
    }
    // replay a whole game: the final state, or null at the first move that is not legal (or not a move at all)
    function sol_replay($seed, $lv, $log) {
        if (!is_array($log) || count($log) > 3000) return null;
        $s = sol_deal($seed, $lv);
        foreach ($log as $c) {
            $m = sol_decode($c);
            if (!$m || !sol_apply($s, $m)) return null;
        }
        return $s;
    }
    function sol_found_count($s) { return count($s['found'][0]) + count($s['found'][1]) + count($s['found'][2]) + count($s['found'][3]); }

    // the day's deals, as the game picks them (table.js dailySeed): the proven-winnable list for Easy / Normal, a fixed
    // range for Hard / Expert. $n = days since 1 Jan 2026 (the player's own calendar day).
    function sol_deals_list($lv) {
        static $lists = null;
        if ($lists === null) {
            $lists = array();
            $src = (string)@file_get_contents(dirname(__DIR__) . '/games/solitaire/deals.js');
            foreach (array('d1', 'd3') as $k) $lists[$k] = preg_match('/\b' . $k . ':\s*\[([0-9,\s]+)\]/', $src, $m) ? array_map('intval', explode(',', $m[1])) : array();
        }
        return $lv === 1 ? $lists['d1'] : ($lv === 3 ? $lists['d3'] : array());
    }
    function sol_day_number($ymd) {
        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', (string)$ymd, $m)) return null;
        return intdiv(gmmktime(0, 0, 0, (int)$m[2], (int)$m[3], (int)$m[1]) - gmmktime(0, 0, 0, 1, 1, 2026), 86400);
    }
    function sol_daily_seed($n, $lv) {
        $list = sol_deals_list($lv);
        if (!count($list)) return 900000 + (($n % 90000) + 90000) % 90000;
        $len = count($list);
        return $list[(($n * 7919) % $len + $len) % $len];
    }
    // today's 3-minute sprint: one proven-winnable turn-one deal for everyone, on its own stride
    function sol_sprint_seed($n) {
        $list = sol_deals_list(1); $len = count($list);
        return $len ? $list[(($n * 104729 + 17) % $len + $len) % $len] : 700000 + (($n % 90000) + 90000) % 90000;
    }
}
