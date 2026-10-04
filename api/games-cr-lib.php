<?php
/*
 * 365 Cribbage's rules AND its computer player on the server (5 Oct 2026), for the Hall of Fame: replays a match from its
 * deal number and the player's own moves, working out every one of Sam's moves exactly as the browser did, to prove a win.
 * A line-for-line copy of games/cribbage/engine.js. ⚠ Change one, change both: the scratchpad parity test (cr-parity)
 * plays matches through both and compares. Include-only (denied in .htaccess). NO closing tag in this file.
 */
if (!function_exists('cr_new_match')) {

    function cr_u32($x) { return $x & 0xFFFFFFFF; }
    function cr_imul($a, $b) {
        $a = cr_u32($a); $b = cr_u32($b);
        $ah = ($a >> 16) & 0xFFFF; $al = $a & 0xFFFF; $bh = ($b >> 16) & 0xFFFF; $bl = $b & 0xFFFF;
        return cr_u32(((($ah * $bl + $al * $bh) & 0xFFFF) << 16) + $al * $bl);
    }
    function cr_rng($seed) {
        $a = cr_u32($seed);
        return function () use (&$a) {
            $a = cr_u32($a + 0x6D2B79F5);
            $t = $a;
            $t = cr_imul($t ^ ($t >> 15), $t | 1);
            $t = cr_u32($t ^ cr_u32($t + cr_imul($t ^ ($t >> 7), $t | 61)));
            return cr_u32($t ^ ($t >> 14)) / 4294967296.0;
        };
    }
    function cr_suit($c) { return intdiv($c, 13); }
    function cr_rank($c) { return ($c % 13) + 1; }
    function cr_val($c) { $r = ($c % 13) + 1; return $r > 10 ? 10 : $r; }
    function cr_whim($S, $k) { $f = cr_rng(cr_u32($S['seed'] * 131 + $S['hand'] * 977 + count($S['pegged']) * 61 + $k * 104729)); return $f(); }
    function cr_filter($L, $fn) { return array_values(array_filter($L, $fn)); }

    // ---------------------------------------------------------------- counting
    function cr_score($cards, $starter, $crib) {
        $all = $cards; if ($starter !== null) $all[] = $starter; $n = count($all); $total = 0;
        for ($m = 1; $m < (1 << $n); $m++) { $s = 0; for ($i = 0; $i < $n; $i++) if ($m & (1 << $i)) $s += cr_val($all[$i]); if ($s === 15) $total += 2; }
        for ($i = 0; $i < $n; $i++) for ($j = $i + 1; $j < $n; $j++) if (cr_rank($all[$i]) === cr_rank($all[$j])) $total += 2;
        $cnt = array_fill(1, 14, 0);
        foreach ($all as $c) $cnt[cr_rank($c)]++;
        for ($lo = 1; $lo <= 11; $lo++) {
            if (!$cnt[$lo] || ($lo > 1 && $cnt[$lo - 1])) continue;
            $hi = $lo; while ($hi < 13 && $cnt[$hi + 1]) $hi++;
            $len = $hi - $lo + 1;
            if ($len >= 3) { $ways = 1; for ($r = $lo; $r <= $hi; $r++) $ways *= $cnt[$r]; $total += $ways * $len; }
            $lo = $hi;
        }
        if (count($cards) === 4) {
            $same = true; foreach ($cards as $c) if (cr_suit($c) !== cr_suit($cards[0])) { $same = false; break; }
            if ($same) { if ($starter !== null && cr_suit($starter) === cr_suit($cards[0])) $total += 5; elseif (!$crib) $total += 4; }
        }
        if ($starter !== null) foreach ($cards as $c) if (cr_rank($c) === 11 && cr_suit($c) === cr_suit($starter)) $total += 1;
        return $total;
    }
    function cr_peg_points($seq, $count) {
        $pts = 0; $n = count($seq); $last = $seq[$n - 1]; $k = 1;
        if ($count === 15) $pts += 2;
        if ($count === 31) $pts += 2;
        while ($k < $n && cr_rank($seq[$n - 1 - $k]) === cr_rank($last)) $k++;
        if ($k >= 2) { $pp = array(0, 0, 2, 6, 12); $pts += $pp[$k]; }
        for ($l = $n; $l >= 3; $l--) {
            $rs = array_map('cr_rank', array_slice($seq, -$l)); sort($rs); $ok = true;
            for ($i = 1; $i < $l; $i++) if ($rs[$i] !== $rs[$i - 1] + 1) { $ok = false; break; }
            if ($ok) { $pts += $l; break; }
        }
        return $pts;
    }

    // ---------------------------------------------------------------- a match, and each deal
    function cr_new_match($seed, $lv) {
        $S = array('seed' => cr_u32($seed) ?: 1, 'lv' => in_array($lv, array(1, 3, 5, 7), true) ? $lv : 3, 'hand' => -1, 'dealer' => 1, 'scores' => array(0, 0), 'phase' => 'discard',
                   'winner' => -1, 'hands' => array(), 'deck' => array(), 'starter' => null, 'crib' => array(), 'held' => array(), 'inHand' => array(), 'gave' => array(),
                   'count' => 0, 'seq' => array(), 'pegged' => array(), 'said' => array(false, false), 'lastBy' => -1, 'turn' => 0, 'run' => 0, 'showStep' => 0, 'cut' => 0, 'best' => array(0, 0));
        cr_start_hand($S);
        return $S;
    }
    function cr_start_hand(&$S) {
        $S['hand']++;
        $S['dealer'] = $S['hand'] === 0 ? 1 : 1 - $S['dealer'];
        $r = cr_rng(cr_u32($S['seed'] * 2654435761 + $S['hand'] * 40503 + 13)); $d = range(0, 51);
        for ($i = 51; $i > 0; $i--) { $j = (int)floor($r() * ($i + 1)); $t = $d[$i]; $d[$i] = $d[$j]; $d[$j] = $t; }
        $nd = 1 - $S['dealer']; $H = array(array(), array());
        for ($i = 0; $i < 12; $i++) $H[$i % 2 === 0 ? $nd : $S['dealer']][] = $d[$i];
        foreach ($H as $k => $h) { usort($h, function ($a, $b) { $x = cr_rank($a) - cr_rank($b); return $x ? $x : $a - $b; }); $H[$k] = $h; }
        $S['hands'] = $H;
        $S['deck'] = array_slice($d, 12); $S['cut'] = (int)floor($r() * 36) + 2;
        $S['starter'] = null; $S['crib'] = array(); $S['held'] = array(array(), array()); $S['inHand'] = array(array(), array()); $S['gave'] = array(array(), array());
        $S['count'] = 0; $S['seq'] = array(); $S['pegged'] = array(); $S['said'] = array(false, false); $S['lastBy'] = -1; $S['run'] = 0; $S['showStep'] = 0;
        $S['phase'] = 'discard'; $S['turn'] = $nd;
    }
    function cr_add(&$S, $p, $pts) {
        if (!$pts || $S['phase'] === 'over') return false;
        $S['scores'][$p] = min(121, $S['scores'][$p] + $pts);
        if ($S['scores'][$p] >= 121) { $S['phase'] = 'over'; $S['winner'] = $p; return true; }
        return false;
    }
    function cr_legal($S, $p) { $cnt = $S['count']; return cr_filter($S['inHand'][$p], function ($c) use ($cnt) { return $cnt + cr_val($c) <= 31; }); }
    function cr_reset(&$S) { $S['count'] = 0; $S['seq'] = array(); $S['said'] = array(false, false); $S['run']++; }

    function cr_apply(&$S, $m) {
        if ($m['t'] === 'discard') {
            $cs = $m['cards'];
            if ($S['phase'] !== 'discard' || count($cs) !== 2 || $cs[0] === $cs[1]) return false;
            foreach ($cs as $c) if (!in_array($c, $S['hands'][0], true)) return false;
            $his = cr_ai_discard($S, 1);
            $S['gave'] = array($cs, $his);
            $S['crib'] = array_merge($cs, $his);
            for ($p = 0; $p < 2; $p++) { $g = $S['gave'][$p]; $S['held'][$p] = cr_filter($S['hands'][$p], function ($c) use ($g) { return !in_array($c, $g, true); }); $S['inHand'][$p] = $S['held'][$p]; }
            $S['starter'] = $S['deck'][$S['cut']];
            $S['phase'] = 'peg'; $S['turn'] = 1 - $S['dealer'];
            if (cr_rank($S['starter']) === 11) cr_add($S, $S['dealer'], 2);
            return true;
        }
        if ($m['t'] === 'play') {
            if ($S['phase'] !== 'peg') return false;
            $pl = $S['turn']; $c = $m['c'];
            if (!in_array($c, cr_legal($S, $pl), true)) return false;
            $S['inHand'][$pl] = cr_filter($S['inHand'][$pl], function ($x) use ($c) { return $x !== $c; });
            $S['count'] += cr_val($c); $S['seq'][] = $c; $S['pegged'][] = array('p' => $pl, 'c' => $c, 'r' => $S['run']); $S['lastBy'] = $pl;
            if (cr_add($S, $pl, cr_peg_points($S['seq'], $S['count']))) return true;
            if (!count($S['inHand'][0]) && !count($S['inHand'][1])) {
                if ($S['count'] !== 31) { if (cr_add($S, $pl, 1)) return true; }
                $S['phase'] = 'show'; $S['showStep'] = 0;
                return true;
            }
            if ($S['count'] === 31) { cr_reset($S); $S['turn'] = 1 - $pl; return true; }
            $S['turn'] = $S['said'][1 - $pl] ? $pl : 1 - $pl;
            return true;
        }
        if ($m['t'] === 'go') {
            if ($S['phase'] !== 'peg') return false;
            $gp = $S['turn']; $o = 1 - $gp;
            if (count(cr_legal($S, $gp))) return false;
            $S['said'][$gp] = true;
            if ($S['said'][$o]) {
                if ($S['lastBy'] >= 0 && $S['count'] > 0 && cr_add($S, $S['lastBy'], 1)) return true;
                $lb = $S['lastBy']; cr_reset($S); $S['turn'] = $lb >= 0 ? 1 - $lb : $o;
            } else $S['turn'] = $o;
            return true;
        }
        if ($m['t'] === 'count') {
            if ($S['phase'] !== 'show' || $S['showStep'] > 2) return false;
            $who = $S['showStep'] === 0 ? 1 - $S['dealer'] : $S['dealer']; $crib = $S['showStep'] === 2; $cards = $crib ? $S['crib'] : $S['held'][$who];
            $t = cr_score($cards, $S['starter'], $crib);
            $S['showStep']++;
            if ($t > $S['best'][$who] && !$crib) $S['best'][$who] = $t;
            if (cr_add($S, $who, $t)) return true;
            if ($S['showStep'] === 3) $S['phase'] = 'handEnd';
            return true;
        }
        if ($m['t'] === 'next') {
            if ($S['phase'] !== 'handEnd') return false;
            cr_start_hand($S);
            return true;
        }
        return false;
    }
    function cr_auto($S) {
        if ($S['phase'] === 'peg') {
            if (!count(cr_legal($S, $S['turn']))) return array('t' => 'go');
            return $S['turn'] === 1 ? array('t' => 'play', 'c' => cr_ai_play($S, 1)) : null;
        }
        if ($S['phase'] === 'show' && $S['showStep'] === 0) return array('t' => 'count');
        return null;
    }

    // ---------------------------------------------------------------- the computer player
    function cr_unseen_for($S, $p) { $seen = array(); foreach ($S['hands'][$p] as $c) $seen[$c] = 1; $out = array(); for ($c = 0; $c < 52; $c++) if (!isset($seen[$c])) $out[] = $c; return $out; }
    function cr_crib_guess($pr) {
        $a = $pr[0]; $b = $pr[1]; $v = 0;
        if (cr_val($a) + cr_val($b) === 15) $v += 2;
        if (cr_rank($a) === cr_rank($b)) $v += 2;
        if (abs(cr_rank($a) - cr_rank($b)) === 1) $v += 1;
        if (abs(cr_rank($a) - cr_rank($b)) === 2) $v += 0.5;
        if (cr_rank($a) === 5) $v += 1.5; if (cr_rank($b) === 5) $v += 1.5;
        if (cr_suit($a) === cr_suit($b)) $v += 0.2;
        return $v;
    }
    function cr_ai_discard($S, $p) {
        $h = $S['hands'][$p]; $lv = $S['lv']; $mine = $S['dealer'] === $p; $best = null; $bs = -INF; $pairs = array();
        for ($i = 0; $i < 6; $i++) for ($j = $i + 1; $j < 6; $j++) $pairs[] = array($h[$i], $h[$j]);
        if ($lv === 1 && cr_whim($S, 7) < 0.5) return $pairs[(int)floor(cr_whim($S, 8) * count($pairs))];
        $uns = $lv >= 5 ? cr_unseen_for($S, $p) : null;
        foreach ($pairs as $pr) {
            $keep = cr_filter($h, function ($c) use ($pr) { return !in_array($c, $pr, true); });
            if ($lv <= 3) $v = cr_score($keep, null, false) + ($mine ? 1 : -1) * cr_crib_guess($pr) * 0.6;
            else {
                $t = 0; foreach ($uns as $st) $t += cr_score($keep, $st, false);
                $v = $t / count($uns) + ($mine ? 1 : -1) * cr_crib_guess($pr);
                if ($lv >= 7) {
                    $low = 0; foreach ($keep as $c) if (cr_val($c) <= 4) $low++;
                    $fives = 0; foreach ($pr as $c) if (cr_rank($c) === 5) $fives++;
                    $v += $low * 0.25 - ($mine ? 0 : 0.2 * $fives);
                }
            }
            if ($v > $bs + 1e-9) { $bs = $v; $best = $pr; }
        }
        return $best;
    }
    function cr_ai_play($S, $p) {
        $L = cr_legal($S, $p); $lv = $S['lv'];
        if (count($L) === 1) return $L[0];
        if ($lv === 1 && cr_whim($S, 3) < 0.45) return $L[(int)floor(cr_whim($S, 4) * count($L))];
        $o = 1 - $p; $seen = array();
        foreach ($S['held'][$p] as $c) $seen[$c] = 1; foreach ($S['gave'][$p] as $c) $seen[$c] = 1;
        foreach ($S['pegged'] as $x) $seen[$x['c']] = 1; $seen[$S['starter']] = 1;
        $uns = array(); for ($c = 0; $c < 52; $c++) if (!isset($seen[$c])) $uns[] = $c;
        $oppN = count($S['inHand'][$o]); $U = count($uns) ?: 1;
        $pHas = function ($fn) use ($uns, $oppN, $U) { $n = 0; foreach ($uns as $x) if ($fn($x)) $n++; return min(1, $n * $oppN / $U); };
        $best = null; $bs = -INF;
        foreach ($L as $c) {
            $seq = $S['seq']; $seq[] = $c; $cnt = $S['count'] + cr_val($c);
            $v = cr_peg_points($seq, $cnt) * 10;
            if ($lv >= 3) {
                if ($cnt === 5 || $cnt === 21) $v -= 6;
                if ($cnt < 15 && $cnt > 4) $v -= 20 * $pHas(function ($x) use ($cnt) { return cr_val($x) === 15 - $cnt; }) * ($lv >= 5 ? 1 : 0.6);
                if ($cnt < 31 && $cnt > 20) $v -= 20 * $pHas(function ($x) use ($cnt) { return cr_val($x) === 31 - $cnt; }) * ($lv >= 5 ? 1 : 0.6);
                if (!count($S['seq']) && cr_val($c) <= 4) $v += 3;
                if (!count($S['seq']) && cr_rank($c) === 5) $v -= 5;
                if ($lv >= 5 && $cnt < 31) {
                    $again = 0; foreach ($S['inHand'][$p] as $x) if ($x !== $c && cr_rank($x) === cr_rank($c)) $again++;
                    $rc = cr_rank($c);
                    $v -= ($again ? -6 : 12) * $pHas(function ($x) use ($rc) { return cr_rank($x) === $rc; });
                }
                if ($lv >= 7 && $cnt < 31) {
                    $reply = 0;
                    foreach ($uns as $x) { if ($cnt + cr_val($x) > 31) continue; $s2 = $seq; $s2[] = $x; $reply += cr_peg_points($s2, $cnt + cr_val($x)); }
                    $v -= $reply / $U * $oppN * 6;
                }
                $v -= cr_val($c) * 0.3;
            }
            if ($v > $bs + 1e-9) { $bs = $v; $best = $c; }
        }
        return $best;
    }

    // ---------------------------------------------------------------- the Hall of Fame
    function cr_decode($code) {
        $code = (string)$code;
        if ($code === 'N') return array('t' => 'next');
        if ($code === 'T') return array('t' => 'count');
        if (preg_match('/^c(\d{1,2})$/', $code, $m) && (int)$m[1] < 52) return array('t' => 'play', 'c' => (int)$m[1]);
        if (preg_match('/^C(\d{1,2})\.(\d{1,2})$/', $code, $m) && max((int)$m[1], (int)$m[2]) < 52) return array('t' => 'discard', 'cards' => array((int)$m[1], (int)$m[2]));
        return null;
    }
    function cr_replay($seed, $lv, $log) {
        $S = cr_new_match($seed, $lv); $i = 0; $n = count($log); $auto = 0; $guard = 0;
        while ($S['phase'] !== 'over') {
            if (++$guard > 6000) return null;
            $m = cr_auto($S);
            if ($m !== null) { if (!cr_apply($S, $m)) return null; $auto++; continue; }
            if ($i >= $n) return null;
            $m = cr_decode($log[$i++]);
            if ($m === null || !cr_apply($S, $m)) return null;
        }
        if ($i !== $n) return null;
        return array('S' => $S, 'won' => $S['winner'] === 0, 'pts' => 121 - $S['scores'][1], 'hands' => $S['hand'] + 1, 'human' => $n, 'auto' => $auto);
    }
}
