<?php
/*
 * 365 FreeCell's rules on the server (4 Oct 2026), for the Hall of Fame: replays a game's moves from its deal number to
 * prove a win. A line-for-line copy of games/freecell/engine.js (the Microsoft deal, legal, apply, the move codes).
 * ⚠ Change one, change both: the scratchpad parity test (fc-parity) plays random games through both and compares.
 * Include-only (denied in .htaccess). NO closing tag in this file.
 */
if (!function_exists('fc_deal')) {

    function fc_suit($c) { return intdiv($c, 13); }
    function fc_rank($c) { return ($c % 13) + 1; }
    function fc_red($c) { $s = fc_suit($c); return $s === 1 || $s === 2; }
    function fc_top($a) { return count($a) ? $a[count($a) - 1] : null; }
    function fc_ms_order($seed) {   // Microsoft FreeCell's shuffle: exact in 64-bit integers
        $ms_suit = array(3, 2, 1, 0); $cards = array();
        for ($i = 0; $i < 52; $i++) $cards[] = 51 - $i;
        $state = $seed & 0xFFFFFFFF;
        for ($i = 0; $i < 52; $i++) {
            $state = ($state * 214013 + 2531011) % 2147483648;
            $r = intdiv($state, 65536); $j = 51 - ($r % (52 - $i));
            $t = $cards[$i]; $cards[$i] = $cards[$j]; $cards[$j] = $t;
        }
        $out = array(); foreach ($cards as $m) $out[] = $ms_suit[$m % 4] * 13 + intdiv($m, 4);
        return $out;
    }
    // levels: 1 Easy and 3 Normal (four free cells), 5 Hard (three), 7 Expert (two)
    function fc_deal($seed, $lv) {
        $ncell = array(1 => 4, 3 => 4, 5 => 3, 7 => 2);
        if (!isset($ncell[$lv])) $lv = 1;
        $tab = array(array(), array(), array(), array(), array(), array(), array(), array());
        foreach (fc_ms_order($seed) as $k => $c) $tab[$k % 8][] = $c;
        return array('seed' => $seed, 'lv' => $lv, 'ncell' => $ncell[$lv], 'tab' => $tab, 'cells' => array(null, null, null, null),
            'found' => array(array(), array(), array(), array()), 'moves' => 0, 'score' => 0, 'won' => false);
    }
    function fc_can_stack($card, $col) { if (!count($col)) return true; $t = fc_top($col); return fc_red($t) !== fc_red($card) && fc_rank($t) === fc_rank($card) + 1; }
    function fc_can_found($card, $f) { if (!count($f)) return fc_rank($card) === 1; $t = fc_top($f); return fc_suit($t) === fc_suit($card) && fc_rank($card) === fc_rank($t) + 1; }
    function fc_found_for($s, $card) {
        $empty = -1;
        for ($i = 0; $i < 4; $i++) {
            if (count($s['found'][$i]) && fc_suit($s['found'][$i][0]) === fc_suit($card)) return fc_can_found($card, $s['found'][$i]) ? $i : -1;
            if (!count($s['found'][$i]) && $empty < 0) $empty = $i;
        }
        return fc_rank($card) === 1 ? $empty : -1;
    }
    function fc_run_len($col) {
        if (!count($col)) return 0;
        $n = 1;
        for ($k = count($col) - 1; $k > 0; $k--) { $a = $col[$k]; $b = $col[$k - 1]; if (fc_red($a) !== fc_red($b) && fc_rank($b) === fc_rank($a) + 1) $n++; else break; }
        return $n;
    }
    function fc_free_cells($s) { $n = 0; for ($i = 0; $i < $s['ncell']; $i++) if ($s['cells'][$i] === null) $n++; return $n; }
    function fc_empty_cols($s) { $n = 0; for ($i = 0; $i < 8; $i++) if (!count($s['tab'][$i])) $n++; return $n; }
    function fc_max_move($s, $to_empty) { return (fc_free_cells($s) + 1) * pow(2, max(0, fc_empty_cols($s) - ($to_empty ? 1 : 0))); }
    function fc_picked($s, $from) {
        if ($from['p'] === 'c') return isset($s['cells'][$from['i']]) && $s['cells'][$from['i']] !== null ? array($s['cells'][$from['i']]) : array();
        if ($from['p'] !== 't' || !isset($s['tab'][$from['i']])) return array();
        $col = $s['tab'][$from['i']]; $n = !empty($from['n']) ? $from['n'] : 1;
        if ($n < 1 || $n > fc_run_len($col)) return array();
        return array_slice($col, count($col) - $n);
    }
    function fc_legal($s, $m) {
        if ($s['won']) return false;
        $cards = fc_picked($s, $m['from']); if (!count($cards)) return false;
        $to = $m['to'];
        if ($to['p'] === 'c') return count($cards) === 1 && $to['i'] >= 0 && $to['i'] < $s['ncell'] && $s['cells'][$to['i']] === null && $m['from']['p'] !== 'c';
        if ($to['p'] === 'f') { $f = $s['found'][$to['i']]; return count($cards) === 1 && fc_can_found($cards[0], $f) && (count($f) > 0 || fc_found_for($s, $cards[0]) >= 0); }
        if ($to['p'] === 't') {
            if ($m['from']['p'] === 't' && $m['from']['i'] === $to['i']) return false;
            $col = $s['tab'][$to['i']];
            return fc_can_stack($cards[0], $col) && count($cards) <= fc_max_move($s, count($col) === 0);
        }
        return false;
    }
    function fc_apply(&$s, $m) {
        if (!fc_legal($s, $m)) return false;
        $cards = fc_picked($s, $m['from']); $pts = 0;
        if ($m['from']['p'] === 't') array_splice($s['tab'][$m['from']['i']], count($s['tab'][$m['from']['i']]) - count($cards), count($cards));
        else $s['cells'][$m['from']['i']] = null;
        if ($m['to']['p'] === 't') foreach ($cards as $c) $s['tab'][$m['to']['i']][] = $c;
        elseif ($m['to']['p'] === 'c') $s['cells'][$m['to']['i']] = $cards[0];
        else { $s['found'][$m['to']['i']][] = $cards[0]; $pts = 10; }
        $s['score'] = max(0, $s['score'] + $pts);
        $s['moves']++;
        if (count($s['found'][0]) + count($s['found'][1]) + count($s['found'][2]) + count($s['found'][3]) === 52) $s['won'] = true;
        return true;
    }
    function fc_decode($c) {
        if (!preg_match('/^(c[0-3]|t[0-7]\.\d{1,2})>([cft])([0-7])$/', (string)$c, $x)) return null;
        if (($x[2] === 'c' || $x[2] === 'f') && intval($x[3]) > 3) return null;
        $from = $x[1][0] === 'c' ? array('p' => 'c', 'i' => intval($x[1][1])) : array('p' => 't', 'i' => intval($x[1][1]), 'n' => intval(substr($x[1], 3)));
        return array('t' => 'move', 'from' => $from, 'to' => array('p' => $x[2], 'i' => intval($x[3])));
    }
    function fc_replay($seed, $lv, $log) {
        if (!is_array($log) || count($log) > 3000) return null;
        $s = fc_deal($seed, $lv);
        foreach ($log as $c) { $m = fc_decode($c); if (!$m || !fc_apply($s, $m)) return null; }
        return $s;
    }
    function fc_found_count($s) { return count($s['found'][0]) + count($s['found'][1]) + count($s['found'][2]) + count($s['found'][3]); }
    // the day's deals, as the game picks them: every deal but #11982 with four cells; the proven three- / two-cell lists
    function fc_list($lv) {
        static $lists = null;
        if ($lists === null) {
            $all = array(); for ($n = 1; $n <= 32000; $n++) if ($n !== 11982) $all[] = $n;
            $lists = array('all' => $all, 'c3' => array(), 'c2' => array());
            $src = (string)@file_get_contents(dirname(__DIR__) . '/games/freecell/deals.js');
            foreach (array('c3', 'c2') as $k) $lists[$k] = preg_match('/\b' . $k . ':\s*\[([0-9,\s]+)\]/', $src, $m) ? array_map('intval', explode(',', $m[1])) : array();
        }
        return $lv === 5 ? $lists['c3'] : ($lv === 7 ? $lists['c2'] : $lists['all']);
    }
    function fc_daily_seed($n, $lv) { $l = fc_list($lv); $len = count($l); return $len ? $l[(($n * 7919) % $len + $len) % $len] : 1; }
    function fc_sprint_seed($n) { $l = fc_list(1); $len = count($l); return $l[(($n * 104729 + 17) % $len + $len) % $len]; }
}
