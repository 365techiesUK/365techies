<?php
/*
 * 365 Gin Rummy's rules AND its computer player on the server (5 Oct 2026), for the Hall of Fame: replays a match from its
 * deal number and the player's own moves, working out every one of Sam's moves exactly as the browser did, to prove a win.
 * A line-for-line copy of games/gin/engine.js. ⚠ Change one, change both: the scratchpad parity test (gr-parity) plays
 * matches through both and compares. Include-only (denied in .htaccess). NO closing tag in this file.
 * The one difference: deadwood totals are remembered by the set of cards (the answer never depends on their order).
 */
if (!function_exists('gr_new_match')) {

    function gr_u32($x) { return $x & 0xFFFFFFFF; }
    function gr_imul($a, $b) {
        $a = gr_u32($a); $b = gr_u32($b);
        $ah = ($a >> 16) & 0xFFFF; $al = $a & 0xFFFF; $bh = ($b >> 16) & 0xFFFF; $bl = $b & 0xFFFF;
        return gr_u32(((($ah * $bl + $al * $bh) & 0xFFFF) << 16) + $al * $bl);
    }
    function gr_rng($seed) {
        $a = gr_u32($seed);
        return function () use (&$a) {
            $a = gr_u32($a + 0x6D2B79F5);
            $t = $a;
            $t = gr_imul($t ^ ($t >> 15), $t | 1);
            $t = gr_u32($t ^ gr_u32($t + gr_imul($t ^ ($t >> 7), $t | 61)));
            return gr_u32($t ^ ($t >> 14)) / 4294967296.0;
        };
    }
    function gr_suit($c) { return intdiv($c, 13); }
    function gr_rank($c) { return ($c % 13) + 1; }
    function gr_val($c) { $r = ($c % 13) + 1; return $r > 10 ? 10 : $r; }
    function gr_whim($S, $k) { $f = gr_rng(gr_u32($S['seed'] * 131 + $S['hand'] * 977 + $S['turnN'] * 61 + $k * 104729)); return $f(); }
    function gr_without($L, $c) { return array_values(array_filter($L, function ($x) use ($c) { return $x !== $c; })); }

    // ---------------------------------------------------------------- melds
    function gr_all_melds($cards) {
        $out = array(); $byR = array(); $byS = array(array(), array(), array(), array());
        foreach ($cards as $c) { $byR[gr_rank($c)][] = $c; $byS[gr_suit($c)][] = $c; }
        for ($r = 1; $r <= 13; $r++) {
            if (!isset($byR[$r])) continue;
            $g = $byR[$r]; $n = count($g);
            if ($n >= 3) {
                if ($n === 4) $out[] = $g;
                for ($i = 0; $i < $n; $i++) for ($j = $i + 1; $j < $n; $j++) for ($k = $j + 1; $k < $n; $k++) $out[] = array($g[$i], $g[$j], $g[$k]);
            }
        }
        foreach ($byS as $l) {
            usort($l, function ($a, $b) { return gr_rank($a) - gr_rank($b); });
            $n = count($l);
            for ($i = 0; $i < $n; $i++) {
                $run = array($l[$i]);
                for ($j = $i + 1; $j < $n && gr_rank($l[$j]) === gr_rank($run[count($run) - 1]) + 1; $j++) { $run[] = $l[$j]; if (count($run) >= 3) $out[] = $run; }
            }
        }
        return $out;
    }
    function gr_best($cards, $extra = array()) {
        $melds = array_merge(gr_all_melds($cards), $extra); $idx = array();
        foreach ($cards as $i => $c) $idx[$c] = $i;
        $masks = array(); $mval = array(); $total = 0;
        foreach ($melds as $m) { $b = 0; $s = 0; foreach ($m as $c) { $b |= 1 << $idx[$c]; $s += gr_val($c); } $masks[] = $b; $mval[] = $s; }
        foreach ($cards as $c) $total += gr_val($c);
        $bestD = INF; $bestPick = null; $M = count($melds); $pick = array();
        $go = function ($start, $used, $saved) use (&$go, &$bestD, &$bestPick, &$pick, $total, $masks, $mval, $M) {
            $d = $total - $saved;
            if ($d < $bestD) { $bestD = $d; $bestPick = $pick; }
            for ($i = $start; $i < $M; $i++) {
                if ($masks[$i] & $used) continue;
                $pick[] = $i; $go($i + 1, $used | $masks[$i], $saved + $mval[$i]); array_pop($pick);
            }
        };
        $go(0, 0, 0);
        $used = 0; foreach ($bestPick as $i) $used |= $masks[$i];
        $out = array(); foreach ($bestPick as $i) $out[] = $melds[$i];
        $dw = array(); foreach ($cards as $i => $c) if (!($used & (1 << $i))) $dw[] = $c;
        return array('dead' => (int)$bestD, 'melds' => $out, 'deadwood' => $dw);
    }
    function gr_deadwood($cards) {   // remembered by the set of cards
        static $memo = array();
        $key = 0; foreach ($cards as $c) $key |= 1 << $c;
        if (isset($memo[$key])) return $memo[$key];
        if (count($memo) > 300000) $memo = array();
        $b = gr_best($cards);
        return $memo[$key] = $b['dead'];
    }
    function gr_discards($S, $p) {
        $h = $S['hands'][$p]; $out = array();
        foreach ($h as $c) $out[] = array('c' => $c, 'dead' => gr_deadwood(gr_without($h, $c)));
        return $out;
    }
    function gr_layoff_pieces($cards, $kMelds) {
        $pieces = array();
        foreach ($kMelds as $m) {
            if (gr_rank($m[0]) === gr_rank($m[1])) {
                if (count($m) === 3) foreach ($cards as $c) if (gr_rank($c) === gr_rank($m[0])) $pieces[] = array($c);
            } else {
                $s = gr_suit($m[0]); $rs = array_map('gr_rank', $m); $lo = min($rs); $top = max($rs); $mine = array();
                foreach ($cards as $c) if (gr_suit($c) === $s) $mine[gr_rank($c)] = $c;
                $run = array();
                for ($r = $lo - 1; $r >= 1 && isset($mine[$r]); $r--) { $run[] = $mine[$r]; $pieces[] = $run; }
                $run = array();
                for ($r = $top + 1; $r <= 13 && isset($mine[$r]); $r++) { $run[] = $mine[$r]; $pieces[] = $run; }
            }
        }
        return $pieces;
    }
    function gr_defend($cards, $kMelds) {
        $lp = gr_layoff_pieces($cards, $kMelds); $b = gr_best($cards, $lp);
        return array('dead' => $b['dead']);   // (only the deadwood counts for the score)
    }

    // ---------------------------------------------------------------- a match, and each hand
    function gr_new_match($seed, $lv) {
        $S = array('seed' => gr_u32($seed) ?: 1, 'lv' => in_array($lv, array(1, 3, 5, 7), true) ? $lv : 3, 'target' => 100, 'hand' => -1, 'scores' => array(0, 0), 'wins' => array(0, 0),
                   'dealer' => 1, 'hands' => array(), 'stock' => array(), 'pile' => array(), 'turn' => 0, 'phase' => 'draw', 'took' => null, 'turnN' => 0,
                   'picked' => array(array(), array()), 'thrown' => array(array(), array()), 'history' => array(), 'winner' => -1, 'gins' => array(0, 0), 'final' => null);
        gr_start_hand($S);
        return $S;
    }
    function gr_start_hand(&$S) {
        $S['hand']++;
        $S['dealer'] = $S['hand'] === 0 ? 1 : 1 - $S['dealer'];
        $r = gr_rng(gr_u32($S['seed'] * 2654435761 + $S['hand'] * 40503 + 11)); $d = range(0, 51);
        for ($i = 51; $i > 0; $i--) { $j = (int)floor($r() * ($i + 1)); $t = $d[$i]; $d[$i] = $d[$j]; $d[$j] = $t; }
        $S['hands'] = array(array_slice($d, 0, 10), array_slice($d, 10, 10));
        $S['pile'] = array($d[20]); $S['stock'] = array_slice($d, 21);
        $S['turn'] = 1 - $S['dealer']; $S['phase'] = 'draw'; $S['took'] = null; $S['turnN'] = 0; $S['picked'] = array(array(), array()); $S['thrown'] = array(array(), array());
    }
    function gr_can_draw($S, $p, $from) {
        if ($S['phase'] !== 'draw' || $S['turn'] !== $p) return false;
        return $from === 'stock' ? count($S['stock']) > 2 : ($from === 'pile' ? count($S['pile']) > 0 : false);
    }
    function gr_can_throw($S, $p, $c) { return $S['phase'] === 'discard' && $S['turn'] === $p && in_array($c, $S['hands'][$p], true) && $c !== ($S['took'] && $S['took']['from'] === 'pile' ? $S['took']['c'] : -1); }

    function gr_apply(&$S, $m) {
        $p = $S['turn'];
        if ($m['t'] === 'draw') {
            if (!gr_can_draw($S, $p, $m['from'])) return false;
            $c = $m['from'] === 'stock' ? array_pop($S['stock']) : array_pop($S['pile']);
            $S['hands'][$p][] = $c; $S['took'] = array('from' => $m['from'], 'c' => $c); $S['phase'] = 'discard';
            if ($m['from'] === 'pile') $S['picked'][$p][] = $c;
            return true;
        }
        if ($m['t'] === 'discard' || $m['t'] === 'knock') {
            if (!gr_can_throw($S, $p, $m['c'])) return false;
            $rest = gr_without($S['hands'][$p], $m['c']);
            if ($m['t'] === 'knock' && gr_deadwood($rest) > 10) return false;
            $S['hands'][$p] = $rest; $S['pile'][] = $m['c']; $S['thrown'][$p][] = $m['c']; $S['took'] = null;
            if ($m['t'] === 'knock') { gr_showdown($S, $p); return true; }
            $S['turnN']++; $S['turn'] = 1 - $p; $S['phase'] = 'draw';
            if (count($S['stock']) <= 2) { $S['phase'] = 'handEnd'; $S['history'][] = array(0, 0); }
            return true;
        }
        if ($m['t'] === 'next') {
            if ($S['phase'] !== 'handEnd') return false;
            gr_start_hand($S);
            return true;
        }
        return false;
    }
    function gr_showdown(&$S, $k) {
        $o = 1 - $k; $kb = gr_best($S['hands'][$k]); $gin = $kb['dead'] === 0;
        $dd = $gin ? gr_deadwood($S['hands'][$o]) : gr_defend($S['hands'][$o], $kb['melds'])['dead'];
        if ($gin) { $to = $k; $pts = $dd + 25; }
        elseif ($dd <= $kb['dead']) { $to = $o; $pts = $kb['dead'] - $dd + 25; }
        else { $to = $k; $pts = $dd - $kb['dead']; }
        $S['scores'][$to] += $pts; $S['wins'][$to]++; if ($gin) $S['gins'][$k]++;
        $add = array(0, 0); $add[$to] = $pts; $S['history'][] = $add;
        if ($S['scores'][$to] >= $S['target']) {
            $S['phase'] = 'over'; $S['winner'] = $to;
            $S['final'] = array($S['scores'][0] + 25 * $S['wins'][0] + ($to === 0 ? 100 : 0), $S['scores'][1] + 25 * $S['wins'][1] + ($to === 1 ? 100 : 0));
        } else $S['phase'] = 'handEnd';
    }
    function gr_auto($S) {
        if ($S['turn'] !== 1 || ($S['phase'] !== 'draw' && $S['phase'] !== 'discard')) return null;
        return $S['phase'] === 'draw' ? array('t' => 'draw', 'from' => gr_ai_draw($S, 1)) : gr_ai_throw($S, 1);
    }

    // ---------------------------------------------------------------- the computer player
    function gr_dead_set($S) { $d = array(); foreach ($S['pile'] as $c) $d[$c] = 1; return $d; }
    function gr_set_gone($dead, $r) { $n = 0; for ($s = 0; $s < 4; $s++) if (isset($dead[$s * 13 + $r - 1])) $n++; return $n >= 2; }
    function gr_run_gone($dead, $s, $r) { return $r < 1 || $r > 13 || isset($dead[$s * 13 + $r - 1]); }
    function gr_keep_value($S, $p, $c, $hand) {
        $r = gr_rank($c); $s = gr_suit($c); $v = 0; $dead = gr_dead_set($S);
        foreach ($hand as $x) {
            if ($x === $c) continue;
            if (gr_rank($x) === $r) $v += 3 - (gr_set_gone($dead, $r) ? 2 : 0);
            if (gr_suit($x) === $s && abs(gr_rank($x) - $r) === 1) $v += 3 - (gr_run_gone($dead, $s, min($r, gr_rank($x)) - 1) && gr_run_gone($dead, $s, max($r, gr_rank($x)) + 1) ? 2 : 0);
            if (gr_suit($x) === $s && abs(gr_rank($x) - $r) === 2) $v += 1 - (isset($dead[$s * 13 + min($r, gr_rank($x))]) ? 1 : 0);
        }
        return $v;
    }
    function gr_danger($S, $p, $c) {
        $o = 1 - $p; $r = gr_rank($c); $s = gr_suit($c); $d = 0;
        foreach ($S['picked'][$o] as $x) { if (gr_rank($x) === $r) $d += 4; if (gr_suit($x) === $s && abs(gr_rank($x) - $r) <= 2) $d += 3; }
        foreach ($S['thrown'][$o] as $x) { if (gr_rank($x) === $r) $d -= 2; if (gr_suit($x) === $s && abs(gr_rank($x) - $r) === 1) $d -= 1; }
        return $d;
    }
    function gr_unseen($S, $p) {
        $o = 1 - $p; $known = array(); $out = array();
        foreach ($S['hands'][$p] as $x) $known[$x] = 1; foreach ($S['pile'] as $x) $known[$x] = 1;
        foreach ($S['picked'][$o] as $x) if (!in_array($x, $S['pile'], true)) $known[$x] = 1;
        for ($c = 0; $c < 52; $c++) if (!isset($known[$c])) $out[] = $c;
        return $out;
    }
    function gr_related($c, $hand) { foreach ($hand as $x) if (gr_rank($x) === gr_rank($c) || (gr_suit($x) === gr_suit($c) && abs(gr_rank($x) - gr_rank($c)) <= 2)) return true; return false; }
    function gr_best_after($hand10, $x, $d10) {
        $h = $hand10; $h[] = $x; $m = $d10;
        for ($i = 0; $i < 10; $i++) { $hh = $h; array_splice($hh, $i, 1); $dd = gr_deadwood($hh); if ($dd < $m) $m = $dd; }
        return $m;
    }
    function gr_expect_next($hand10, $uns, $d10) {
        $tot = 0;
        foreach ($uns as $x) $tot += gr_related($x, $hand10) ? gr_best_after($hand10, $x, $d10) : $d10;
        return count($uns) ? $tot / count($uns) : $d10;
    }
    function gr_ai_draw($S, $p) {
        $top = count($S['pile']) ? $S['pile'][count($S['pile']) - 1] : null; $h = $S['hands'][$p]; $lv = $S['lv'];
        if (!gr_can_draw($S, $p, 'stock')) return 'pile';
        if ($top === null) return 'stock';
        $now = gr_deadwood($h); $after = gr_best_after($h, $top, $now);
        if ($lv === 1) return $after < $now - 2 && gr_whim($S, 3) < 0.7 ? 'pile' : 'stock';
        if ($lv <= 3) return $after < $now ? 'pile' : 'stock';
        if ($after < $now) return $after <= gr_expect_next($h, gr_unseen($S, $p), $now) + 0.5 ? 'pile' : 'stock';
        return 'stock';
    }
    function gr_ai_throw($S, $p) {
        $lv = $S['lv']; $h = $S['hands'][$p];
        $opts = array_values(array_filter(gr_discards($S, $p), function ($o) use ($S, $p) { return gr_can_throw($S, $p, $o['c']); }));
        $minD = INF; foreach ($opts as $o) if ($o['dead'] < $minD) $minD = $o['dead'];
        $kn = array_values(array_filter($opts, function ($o) { return $o['dead'] <= 10; }));
        if (count($kn)) {
            $kb = $kn[0];
            for ($i = 1; $i < count($kn); $i++) { $o = $kn[$i]; if ($o['dead'] < $kb['dead'] || ($o['dead'] === $kb['dead'] && gr_val($o['c']) > gr_val($kb['c']))) $kb = $o; }
            if ($kb['dead'] === 0 || gr_should_knock($S, $p, $kb['dead'])) return array('t' => 'knock', 'c' => $kb['c']);
        }
        if ($lv === 1) {
            $loose = array_values(array_filter($opts, function ($o) use ($minD) { return $o['dead'] <= $minD + 4; }));
            usort($loose, function ($a, $b) { $d = gr_val($b['c']) - gr_val($a['c']); return $d ? $d : $a['c'] - $b['c']; });
            $n = count($loose);
            return array('t' => 'discard', 'c' => $loose[min($n - 1, (int)floor(gr_whim($S, 5) * min(3, $n)))]['c']);
        }
        $bestO = null; $bs = INF; $uns = $lv >= 5 ? gr_unseen($S, $p) : null;
        foreach ($opts as $o) {
            $rest = gr_without($h, $o['c']);
            if ($lv <= 3) $sc = $o['dead'] * 10 + gr_keep_value($S, $p, $o['c'], $rest) * 4 - gr_val($o['c']);
            else {
                if ($o['dead'] > $minD + 12) continue;
                $sc = gr_expect_next($rest, $uns, $o['dead']) * 10 - gr_val($o['c']) * 0.2;
                if ($lv >= 7) $sc += max(0, gr_danger($S, $p, $o['c'])) * 4;
            }
            if ($sc < $bs) { $bs = $sc; $bestO = $o; }
        }
        return array('t' => 'discard', 'c' => $bestO['c']);
    }
    function gr_should_knock($S, $p, $dead) {
        if ($S['lv'] <= 5) return true;
        $o = 1 - $p;
        return !(count($S['picked'][$o]) >= 2 && $dead >= 7 && count($S['stock']) > 16);
    }

    // ---------------------------------------------------------------- the Hall of Fame
    function gr_decode($code) {
        $code = (string)$code;
        if ($code === 'N') return array('t' => 'next');
        if ($code === 'S') return array('t' => 'draw', 'from' => 'stock');
        if ($code === 'D') return array('t' => 'draw', 'from' => 'pile');
        if (preg_match('/^([cK])(\d{1,2})$/', $code, $m) && (int)$m[2] < 52) return array('t' => $m[1] === 'K' ? 'knock' : 'discard', 'c' => (int)$m[2]);
        return null;
    }
    function gr_replay($seed, $lv, $log) {
        $S = gr_new_match($seed, $lv); $i = 0; $n = count($log); $auto = 0; $guard = 0;
        while ($S['phase'] !== 'over') {
            if (++$guard > 20000) return null;
            $m = gr_auto($S);
            if ($m !== null) { if (!gr_apply($S, $m)) return null; $auto++; continue; }
            if ($i >= $n) return null;
            $m = gr_decode($log[$i++]);
            if ($m === null || !gr_apply($S, $m)) return null;
        }
        if ($i !== $n) return null;
        return array('S' => $S, 'won' => $S['winner'] === 0, 'pts' => $S['final'][0] - $S['final'][1], 'hands' => $S['hand'] + 1, 'human' => $n, 'auto' => $auto);
    }
}
