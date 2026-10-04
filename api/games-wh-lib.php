<?php
/*
 * 365 Whist's rules AND its three computer players on the server (5 Oct 2026), for the Hall of Fame: replays a rubber from
 * its deal number and the player's own cards, working out every other card exactly as the browser did, to prove a win.
 * A line-for-line copy of games/whist/engine.js. ⚠ Change one, change both: the scratchpad parity test (wh-parity)
 * plays rubbers through both and compares. Include-only (denied in .htaccess). NO closing tag in this file.
 */
if (!function_exists('wh_new_match')) {

    function wh_u32($x) { return $x & 0xFFFFFFFF; }
    function wh_imul($a, $b) {
        $a = wh_u32($a); $b = wh_u32($b);
        $ah = ($a >> 16) & 0xFFFF; $al = $a & 0xFFFF; $bh = ($b >> 16) & 0xFFFF; $bl = $b & 0xFFFF;
        return wh_u32(((($ah * $bl + $al * $bh) & 0xFFFF) << 16) + $al * $bl);
    }
    function wh_rng($seed) {
        $a = wh_u32($seed);
        return function () use (&$a) {
            $a = wh_u32($a + 0x6D2B79F5);
            $t = $a;
            $t = wh_imul($t ^ ($t >> 15), $t | 1);
            $t = wh_u32($t ^ wh_u32($t + wh_imul($t ^ ($t >> 7), $t | 61)));
            return wh_u32($t ^ ($t >> 14)) / 4294967296.0;
        };
    }
    function wh_suit($c) { return intdiv($c, 13); }
    function wh_hi($c) { $r = ($c % 13) + 1; return $r === 1 ? 14 : $r; }
    function wh_whim($S, $p, $k) { $f = wh_rng(wh_u32($S['seed'] * 131 + $S['hand'] * 977 + $S['tricks'] * 61 + count($S['trick']) * 13 + $p * 7 + $k * 104729)); return $f(); }
    function wh_filter($L, $fn) { return array_values(array_filter($L, $fn)); }
    function wh_sort_hand($h, $trump) {
        $orders = array(array(3, 2, 0, 1), array(0, 3, 2, 1), array(0, 1, 3, 2), array(2, 0, 1, 3)); $pos = array_flip($orders[$trump]);
        usort($h, function ($a, $b) use ($pos) { $d = $pos[wh_suit($a)] - $pos[wh_suit($b)]; return $d ? $d : wh_hi($a) - wh_hi($b); });
        return $h;
    }

    function wh_new_match($seed, $lv) {
        $S = array('seed' => wh_u32($seed) ?: 1, 'lv' => in_array($lv, array(1, 3, 5, 7), true) ? $lv : 3, 'hand' => -1, 'dealer' => 2, 'points' => array(0, 0), 'games' => array(0, 0),
                   'gameNo' => 1, 'history' => array(), 'phase' => 'play', 'hands' => array(), 'trump' => 0, 'turnUp' => 0, 'trick' => array(), 'won' => array(0, 0, 0, 0),
                   'tricks' => 0, 'leader' => 0, 'turn' => 0, 'played' => array(), 'voids' => array(), 'lastLead' => array(), 'winner' => -1);
        wh_start_hand($S);
        return $S;
    }
    function wh_start_hand(&$S) {
        $S['hand']++;
        $S['dealer'] = ($S['dealer'] + 1) % 4;
        $r = wh_rng(wh_u32($S['seed'] * 2654435761 + $S['hand'] * 40503 + 17)); $d = range(0, 51);
        for ($i = 51; $i > 0; $i--) { $j = (int)floor($r() * ($i + 1)); $t = $d[$i]; $d[$i] = $d[$j]; $d[$j] = $t; }
        $H = array(array(), array(), array(), array());
        for ($i = 0; $i < 52; $i++) $H[($S['dealer'] + 1 + $i) % 4][] = $d[$i];
        $S['turnUp'] = $d[51]; $S['trump'] = wh_suit($d[51]);
        foreach ($H as $k => $h) $H[$k] = wh_sort_hand($h, $S['trump']);
        $S['hands'] = $H;
        $S['trick'] = array(); $S['won'] = array(0, 0, 0, 0); $S['tricks'] = 0; $S['played'] = array();
        $S['voids'] = array(array(0, 0, 0, 0), array(0, 0, 0, 0), array(0, 0, 0, 0), array(0, 0, 0, 0)); $S['lastLead'] = array(null, null, null, null);
        $S['leader'] = $S['turn'] = ($S['dealer'] + 1) % 4; $S['phase'] = 'play';
    }
    function wh_legal($S, $p) {
        $h = $S['hands'][$p];
        if (!count($S['trick'])) return $h;
        $led = wh_suit($S['trick'][0]['c']);
        $f = wh_filter($h, function ($c) use ($led) { return wh_suit($c) === $led; });
        return count($f) ? $f : $h;
    }
    function wh_winner_of($trick, $trump) {
        $w = $trick[0];
        for ($i = 1; $i < count($trick); $i++) {
            $c = $trick[$i]['c']; $wc = $w['c'];
            if (wh_suit($c) === $trump && wh_suit($wc) !== $trump) $w = $trick[$i];
            elseif (wh_suit($c) === wh_suit($wc) && wh_hi($c) > wh_hi($wc)) $w = $trick[$i];
        }
        return $w;
    }
    function wh_apply(&$S, $m) {
        if ($m['t'] === 'play') {
            if ($S['phase'] !== 'play' || count($S['trick']) >= 4) return false;
            $p = $S['turn']; $c = $m['c'];
            if (!in_array($c, wh_legal($S, $p), true)) return false;
            if (count($S['trick']) && wh_suit($c) !== wh_suit($S['trick'][0]['c'])) $S['voids'][$p][wh_suit($S['trick'][0]['c'])] = 1;
            if (!count($S['trick'])) $S['lastLead'][$p] = wh_suit($c);
            $S['hands'][$p] = wh_filter($S['hands'][$p], function ($x) use ($c) { return $x !== $c; });
            $S['trick'][] = array('p' => $p, 'c' => $c); $S['played'][] = $c;
            $S['turn'] = count($S['trick']) === 4 ? -1 : ($p + 1) % 4;
            return true;
        }
        if ($m['t'] === 'collect') {
            if (count($S['trick']) !== 4) return false;
            $w = wh_winner_of($S['trick'], $S['trump']); $w = $w['p'];
            $S['won'][$w]++; $S['tricks']++; $S['trick'] = array(); $S['leader'] = $S['turn'] = $w;
            if ($S['tricks'] === 13) wh_end_hand($S);
            return true;
        }
        if ($m['t'] === 'next') {
            if ($S['phase'] !== 'handEnd') return false;
            wh_start_hand($S);
            return true;
        }
        return false;
    }
    function wh_end_hand(&$S) {
        $tt = array($S['won'][0] + $S['won'][2], $S['won'][1] + $S['won'][3]); $side = $tt[0] > 6 ? 0 : 1; $pts = $tt[$side] - 6;
        $S['points'][$side] += $pts;
        if ($S['points'][$side] >= 5) {
            $S['games'][$side]++;
            $S['history'][] = array('game' => $S['gameNo'], 'points' => $S['points'], 'to' => $side);
            $S['points'] = array(0, 0); $S['gameNo']++;
        }
        if ($S['games'][$side] >= 2) { $S['phase'] = 'over'; $S['winner'] = $side; }
        else $S['phase'] = 'handEnd';
    }
    function wh_auto($S) {
        if ($S['phase'] !== 'play') return null;
        if (count($S['trick']) === 4) return array('t' => 'collect');
        if ($S['turn'] !== 0) return array('t' => 'play', 'c' => wh_ai($S, $S['turn']));
        return null;
    }

    // ---------------------------------------------------------------- the computer players
    function wh_by_suit($L, $s) { return wh_filter($L, function ($c) use ($s) { return wh_suit($c) === $s; }); }
    function wh_lowest($L) { $a = $L[0]; foreach ($L as $c) if (wh_hi($c) < wh_hi($a)) $a = $c; return $a; }
    function wh_highest($L) { $a = $L[0]; foreach ($L as $c) if (wh_hi($c) > wh_hi($a)) $a = $c; return $a; }
    function wh_top_left($S, $p, $c) {
        $g = array_flip($S['played']); $s = wh_suit($c);
        for ($r = wh_hi($c) + 1; $r <= 14; $r++) { $x = $s * 13 + ($r === 14 ? 0 : $r - 1); if (!isset($g[$x]) && !in_array($x, $S['hands'][$p], true)) return false; }
        return true;
    }
    function wh_trumps_out($S, $p) {
        $g = array_flip($S['played']); $n = 0;
        for ($r = 0; $r < 13; $r++) { $x = $S['trump'] * 13 + $r; if (!isset($g[$x]) && !in_array($x, $S['hands'][$p], true)) $n++; }
        return $n;
    }
    function wh_ai($S, $p) {
        $L = wh_legal($S, $p); $lv = $S['lv'];
        if (count($L) === 1) return $L[0];
        if ($lv === 1 && wh_whim($S, $p, 1) < 0.4) return $L[(int)floor(wh_whim($S, $p, 2) * count($L))];
        if (!count($S['trick'])) return wh_lead($S, $p, $L);
        $led = wh_suit($S['trick'][0]['c']);
        return count(wh_by_suit($L, $led)) ? wh_follow($S, $p, $L) : wh_discard($S, $p, $L);
    }
    function wh_lead($S, $p, $L) {
        $lv = $S['lv']; $h = $S['hands'][$p]; $T = $S['trump']; $partner = ($p + 2) % 4;
        $trumps = wh_by_suit($h, $T); $side = wh_filter($L, function ($c) use ($T) { return wh_suit($c) !== $T; });
        if ($lv >= 5) {
            $opp = array(($p + 1) % 4, ($p + 3) % 4); $tOut = wh_trumps_out($S, $p);
            $sure = wh_filter($side, function ($c) use ($S, $p, $tOut, $opp, $T) {
                if (!wh_top_left($S, $p, $c)) return false;
                if ($tOut) foreach ($opp as $o) if ($S['voids'][$o][wh_suit($c)] && !$S['voids'][$o][$T]) return false;
                return true;
            });
            if (count($sure)) return wh_highest($sure);
            if (count($trumps) && count($trumps) >= $tOut && $tOut > 0 && ($lv >= 7 ? (wh_top_left($S, $p, wh_highest($trumps)) || count($trumps) >= $tOut + 2) : count($trumps) >= 4))
                return wh_top_left($S, $p, wh_highest($trumps)) ? wh_highest($trumps) : wh_lowest($trumps);
        } elseif (count($trumps) >= 5) return wh_highest($trumps);
        if ($S['lastLead'][$partner] !== null) { $ps = wh_by_suit($side, $S['lastLead'][$partner]); if (count($ps)) return $lv >= 3 ? wh_highest($ps) : $ps[0]; }
        $pool = count($side) ? $side : $L; $best = null; $bl = -INF;
        foreach (array(0, 1, 2, 3) as $s) {
            $cs = wh_by_suit($pool, $s); if (!count($cs)) continue;
            $n = count($cs) + ($s === $T ? -3 : 0);
            if ($n > $bl) { $bl = $n; $best = $s; }
        }
        $cs = wh_by_suit($pool, $best);
        usort($cs, function ($a, $b) { return wh_hi($b) - wh_hi($a); });
        if (count($cs) >= 2 && wh_hi($cs[0]) >= 12 && wh_hi($cs[0]) - wh_hi($cs[1]) === 1) return $cs[0];
        return count($cs) >= 4 ? $cs[3] : $cs[count($cs) - 1];
    }
    function wh_follow($S, $p, $L) {
        $lv = $S['lv']; $w = wh_winner_of($S['trick'], $S['trump']); $partner = ($p + 2) % 4; $pos = count($S['trick']);
        $partnerWins = $w['p'] === $partner; $led = wh_suit($S['trick'][0]['c']); $trumped = wh_suit($w['c']) === $S['trump'] && $led !== $S['trump'];
        $wc = $w['c'];
        $over = wh_filter($L, function ($c) use ($trumped, $wc) { return !$trumped && wh_hi($c) > wh_hi($wc); });
        if ($partnerWins) {
            if ($lv >= 5 && $pos < 3 && count($over) && !wh_top_left($S, $p, $wc)) { $cheap = wh_lowest($over); if (wh_top_left($S, $p, $cheap)) return $cheap; }
            return wh_lowest($L);
        }
        if (!count($over)) return wh_lowest($L);
        if ($pos === 1) {
            if (wh_hi($wc) >= 11 && $lv >= 3) return wh_lowest($over);
            if ($lv >= 5) { $top = wh_filter($over, function ($c) use ($S, $p) { return wh_top_left($S, $p, $c); }); if (count($top) && $S['voids'][($p + 1) % 4][$led] === 0) return wh_lowest($top); }
            return wh_lowest($L);
        }
        if ($pos === 2) {
            if ($lv >= 5) { $t2 = wh_filter($over, function ($c) use ($S, $p) { return wh_top_left($S, $p, $c); }); if (count($t2)) return wh_lowest($t2); }
            return wh_highest($over);
        }
        return wh_lowest($over);
    }
    function wh_discard($S, $p, $L) {
        $lv = $S['lv']; $w = wh_winner_of($S['trick'], $S['trump']); $partner = ($p + 2) % 4; $T = $S['trump']; $pos = count($S['trick']);
        $trumps = wh_by_suit($L, $T); $others = wh_filter($L, function ($c) use ($T) { return wh_suit($c) !== $T; });
        $wc = $w['c'];
        $partnerWins = $w['p'] === $partner && ($lv < 5 || $pos === 3 || wh_top_left($S, $p, $wc) || wh_suit($wc) === $T);
        if (!$partnerWins && count($trumps)) {
            $beat = wh_filter($trumps, function ($c) use ($wc, $T) { return wh_suit($wc) !== $T || wh_hi($c) > wh_hi($wc); });
            if (count($beat)) {
                if ($lv >= 5 && $pos < 3) {
                    $nextOpp = ($p + 1) % 4; $led = wh_suit($S['trick'][0]['c']);
                    if ($S['voids'][$nextOpp][$led] && !$S['voids'][$nextOpp][$T]) return wh_highest($beat);
                }
                return wh_lowest($beat);
            }
        }
        $pool = count($others) ? $others : $L; $best = null; $bs = INF;
        foreach ($pool as $c) {
            $n = count(wh_by_suit($S['hands'][$p], wh_suit($c))); $keep = $lv >= 5 && wh_top_left($S, $p, $c) ? 30 : 0;
            $sc = wh_hi($c) + $n * 2 + $keep;
            if ($sc < $bs) { $bs = $sc; $best = $c; }
        }
        return $best;
    }

    // ---------------------------------------------------------------- the Hall of Fame
    function wh_decode($code) {
        $code = (string)$code;
        if ($code === 'N') return array('t' => 'next');
        if (preg_match('/^c(\d{1,2})$/', $code, $m) && (int)$m[1] < 52) return array('t' => 'play', 'c' => (int)$m[1]);
        return null;
    }
    function wh_replay($seed, $lv, $log) {
        $S = wh_new_match($seed, $lv); $i = 0; $n = count($log); $auto = 0; $guard = 0;
        while ($S['phase'] !== 'over') {
            if (++$guard > 8000) return null;
            $m = wh_auto($S);
            if ($m !== null) { if (!wh_apply($S, $m)) return null; $auto++; continue; }
            if ($i >= $n) return null;
            $m = wh_decode($log[$i++]);
            if ($m === null || !wh_apply($S, $m)) return null;
        }
        if ($i !== $n) return null;
        return array('S' => $S, 'won' => $S['winner'] === 0, 'pts' => $S['hand'] + 1, 'hands' => $S['hand'] + 1, 'games' => $S['games'], 'human' => $n, 'auto' => $auto);
    }
}
