<?php
/*
 * 365 Hearts' rules AND its three computer players on the server (5 Oct 2026), for the Hall of Fame: replays a match from
 * its deal number and the player's own moves, working out every computer card exactly as the browser did, to prove a win.
 * A line-for-line copy of games/hearts/engine.js. ⚠ Change one, change both: the scratchpad parity test (he-parity)
 * plays thousands of matches through both and compares. Include-only (denied in .htaccess). NO closing tag in this file.
 * A card is 0-51: suit = card / 13 (0 spades, 1 hearts, 2 diamonds, 3 clubs), rank = card % 13 + 1; hi() = Ace high (14).
 */
if (!function_exists('he_new_match')) {

    function he_u32($x) { return $x & 0xFFFFFFFF; }
    function he_imul($a, $b) {   // Math.imul: the low 32 bits of a 32 x 32 multiply
        $a = he_u32($a); $b = he_u32($b);
        $ah = ($a >> 16) & 0xFFFF; $al = $a & 0xFFFF; $bh = ($b >> 16) & 0xFFFF; $bl = $b & 0xFFFF;
        return he_u32(((($ah * $bl + $al * $bh) & 0xFFFF) << 16) + $al * $bl);
    }
    function he_rng($seed) {   // mulberry32, as the page shuffles
        $a = he_u32($seed);
        return function () use (&$a) {
            $a = he_u32($a + 0x6D2B79F5);
            $t = $a;
            $t = he_imul($t ^ ($t >> 15), $t | 1);
            $t = he_u32($t ^ he_u32($t + he_imul($t ^ ($t >> 7), $t | 61)));
            return he_u32($t ^ ($t >> 14)) / 4294967296.0;
        };
    }
    function he_suit($c) { return intdiv($c, 13); }
    function he_rank($c) { return ($c % 13) + 1; }
    function he_hi($c) { $r = ($c % 13) + 1; return $r === 1 ? 14 : $r; }
    function he_pts($c) { return he_suit($c) === 1 ? 1 : ($c === 11 ? 13 : 0); }
    function he_whim($S, $p, $k) { $f = he_rng(he_u32($S['seed'] * 131 + $S['hand'] * 977 + $S['tricks'] * 61 + count($S['trick']) * 13 + $p * 7 + $k * 104729)); return $f(); }
    function he_in($c, $L) { return in_array($c, $L, true); }
    function he_filter($L, $fn) { return array_values(array_filter($L, $fn)); }
    function he_sort_hand($h) {
        $show = array(3 => 0, 2 => 1, 0 => 2, 1 => 3);   // clubs, diamonds, spades, hearts
        usort($h, function ($a, $b) use ($show) { $d = $show[he_suit($a)] - $show[he_suit($b)]; return $d ? $d : he_hi($a) - he_hi($b); });
        return $h;
    }

    // ---------------------------------------------------------------- a match, and each hand
    function he_new_match($seed, $lv) {
        $lvs = array(1, 3, 5, 7);
        $S = array('seed' => he_u32($seed) ?: 1, 'lv' => in_array($lv, $lvs, true) ? $lv : 3, 'target' => 100, 'hand' => -1, 'scores' => array(0, 0, 0, 0), 'history' => array(),
                   'moons' => array(0, 0, 0, 0), 'phase' => 'deal', 'hands' => array(), 'trick' => array(), 'won' => array(), 'taken' => array(0, 0, 0, 0), 'played' => array(),
                   'tricks' => 0, 'broken' => false, 'leader' => 0, 'turn' => 0, 'dir' => 0, 'got' => array(), 'voids' => array(), 'moonTry' => array(0, 0, 0, 0), 'winner' => -1, 'lastHand' => null);
        he_start_hand($S);
        return $S;
    }
    function he_start_hand(&$S) {
        $S['hand']++;
        $r = he_rng(he_u32($S['seed'] * 2654435761 + $S['hand'] * 40503 + 7)); $d = range(0, 51);
        for ($i = 51; $i > 0; $i--) { $j = (int)floor($r() * ($i + 1)); $t = $d[$i]; $d[$i] = $d[$j]; $d[$j] = $t; }
        $H = array(array(), array(), array(), array());
        for ($i = 0; $i < 52; $i++) $H[$i % 4][] = $d[$i];
        $S['hands'] = array_map('he_sort_hand', $H);
        $S['dir'] = $S['hand'] % 4; $S['trick'] = array(); $S['won'] = array(array(), array(), array(), array()); $S['taken'] = array(0, 0, 0, 0); $S['played'] = array();
        $S['tricks'] = 0; $S['broken'] = false; $S['got'] = array(); $S['voids'] = array(array(0, 0, 0, 0), array(0, 0, 0, 0), array(0, 0, 0, 0), array(0, 0, 0, 0)); $S['moonTry'] = array(0, 0, 0, 0);
        if ($S['dir'] === 3) he_begin_play($S); else $S['phase'] = 'pass';
    }
    function he_owner($S, $c) { for ($p = 0; $p < 4; $p++) if (he_in($c, $S['hands'][$p])) return $p; return -1; }
    function he_begin_play(&$S) {
        $S['phase'] = 'play'; $S['leader'] = $S['turn'] = he_owner($S, 40);
        if ($S['lv'] >= 7) for ($p = 1; $p < 4; $p++) $S['moonTry'][$p] = he_moon_hand($S['hands'][$p]) ? 1 : 0;
    }
    function he_pass_to($S, $p) { $o = array(1, 3, 2, 0); return ($p + $o[$S['dir']]) % 4; }
    function he_legal($S, $p) {
        $h = $S['hands'][$p];
        if (!count($S['trick'])) {
            if ($S['tricks'] === 0) return he_in(40, $h) ? array(40) : $h;
            if (!$S['broken']) { $out = he_filter($h, function ($c) { return he_suit($c) !== 1; }); if (count($out)) return $out; }
            return $h;
        }
        $led = he_suit($S['trick'][0]['c']);
        $out = he_filter($h, function ($c) use ($led) { return he_suit($c) === $led; });
        if (count($out)) return $out;
        if ($S['tricks'] === 0) { $out = he_filter($h, function ($c) { return he_pts($c) === 0; }); if (count($out)) return $out; }
        return $h;
    }
    function he_winner_of($trick) {
        $led = he_suit($trick[0]['c']); $w = $trick[0];
        for ($i = 1; $i < count($trick); $i++) if (he_suit($trick[$i]['c']) === $led && he_hi($trick[$i]['c']) > he_hi($w['c'])) $w = $trick[$i];
        return $w;
    }

    // ---------------------------------------------------------------- moves
    function he_apply(&$S, $m) {
        if ($m['t'] === 'pass') {
            if ($S['phase'] !== 'pass' || count($m['cards']) !== 3) return false;
            $mine = $m['cards']; $seen = array();
            foreach ($mine as $c) { if (!he_in($c, $S['hands'][0]) || isset($seen[$c])) return false; $seen[$c] = 1; }
            $sent = array($mine, he_ai_pass($S, 1), he_ai_pass($S, 2), he_ai_pass($S, 3));
            for ($p = 0; $p < 4; $p++) { $sp = $sent[$p]; $S['hands'][$p] = he_filter($S['hands'][$p], function ($c) use ($sp) { return !he_in($c, $sp); }); }
            for ($p = 0; $p < 4; $p++) { $to = he_pass_to($S, $p); $S['hands'][$to] = he_sort_hand(array_merge($S['hands'][$to], $sent[$p])); }
            $fr = array(3, 1, 2, 0); $S['got'] = $sent[(0 + $fr[$S['dir']]) % 4];
            he_begin_play($S);
            return true;
        }
        if ($m['t'] === 'play') {
            if ($S['phase'] !== 'play' || count($S['trick']) >= 4) return false;
            $pl = $S['turn']; $c = $m['c'];
            if (!he_in($c, he_legal($S, $pl))) return false;
            if (count($S['trick']) && he_suit($c) !== he_suit($S['trick'][0]['c'])) $S['voids'][$pl][he_suit($S['trick'][0]['c'])] = 1;
            $S['hands'][$pl] = he_filter($S['hands'][$pl], function ($x) use ($c) { return $x !== $c; });
            $S['trick'][] = array('p' => $pl, 'c' => $c); $S['played'][] = $c;
            if (he_suit($c) === 1 && !$S['broken']) $S['broken'] = true;
            if (count($S['trick']) === 4) $S['turn'] = -1; else $S['turn'] = ($pl + 1) % 4;
            return true;
        }
        if ($m['t'] === 'collect') {
            if (count($S['trick']) !== 4) return false;
            $w = he_winner_of($S['trick']); $w = $w['p']; $got = 0; $cards = array();
            foreach ($S['trick'] as $x) { $cards[] = $x['c']; $got += he_pts($x['c']); }
            $S['won'][$w] = array_merge($S['won'][$w], $cards); $S['taken'][$w] += $got; $S['tricks']++;
            $S['trick'] = array(); $S['leader'] = $S['turn'] = $w;
            for ($q = 1; $q < 4; $q++) if ($S['moonTry'][$q] && $got && $w !== $q) $S['moonTry'][$q] = 0;
            if ($S['tricks'] === 13) he_end_hand($S);
            return true;
        }
        if ($m['t'] === 'next') {
            if ($S['phase'] !== 'handEnd') return false;
            he_start_hand($S);
            return true;
        }
        return false;
    }
    function he_end_hand(&$S) {
        $moon = -1; $add = $S['taken'];
        for ($p = 0; $p < 4; $p++) if ($S['taken'][$p] === 26) $moon = $p;
        if ($moon >= 0) { $add = array(26, 26, 26, 26); $add[$moon] = 0; $S['moons'][$moon]++; }
        for ($p = 0; $p < 4; $p++) $S['scores'][$p] += $add[$p];
        $S['history'][] = $add;
        $S['lastHand'] = array('taken' => $S['taken'], 'add' => $add, 'moon' => $moon);
        if (max($S['scores']) >= $S['target']) {
            $low = min($S['scores']); $at = array();
            for ($p = 0; $p < 4; $p++) if ($S['scores'][$p] === $low) $at[] = $p;
            if (count($at) === 1) { $S['phase'] = 'over'; $S['winner'] = $at[0]; return; }
        }
        $S['phase'] = 'handEnd';
    }
    function he_auto($S) {
        if ($S['phase'] !== 'play') return null;
        if (count($S['trick']) === 4) return array('t' => 'collect');
        if ($S['turn'] !== 0) return array('t' => 'play', 'c' => he_ai($S, $S['turn']));
        return null;
    }

    // ---------------------------------------------------------------- the computer players: passing
    function he_ai_pass($S, $p) {
        $h = $S['hands'][$p]; $lv = $S['lv']; $out = array();
        $take = function ($c) use (&$out, $h) { if (count($out) < 3 && !in_array($c, $out, true) && in_array($c, $h, true)) $out[] = $c; };
        if ($lv === 1) {
            $s = $h; usort($s, function ($a, $b) { $d = he_hi($b) - he_hi($a); return $d ? $d : $a - $b; });
            foreach ($s as $i => $c) if (he_whim($S, $p, $i) < 0.75) $take($c);
            foreach ($s as $c) $take($c);
            return $out;
        }
        if ($lv >= 7 && he_moon_hand($h)) {
            $s = $h; usort($s, function ($a, $b) { $d = he_hi($a) - he_hi($b); return $d ? $d : $a - $b; });
            foreach ($s as $c) if (he_suit($c) !== 1 || he_hi($c) < 6) $take($c);
            return $out;
        }
        $spades = he_filter($h, function ($c) { return he_suit($c) === 0; }); $longSp = count($spades) >= 5;
        if (he_in(11, $h) && !($lv >= 5 && $longSp)) $take(11);
        if (!($lv >= 5 && $longSp)) { $take(0); $take(12); }
        if ($lv >= 5) {
            $lists = array();
            foreach (array(3, 2) as $su) $lists[] = he_filter($h, function ($c) use ($su) { return he_suit($c) === $su && $c !== 40; });
            $room = 3 - count($out);
            $lists = he_filter($lists, function ($l) use ($room) { return count($l) && count($l) <= $room; });
            usort($lists, function ($a, $b) { $d = count($a) - count($b); return $d ? $d : he_suit($b[0]) - he_suit($a[0]); });
            if (count($lists)) foreach ($lists[0] as $c) $take($c);
        }
        $hh = he_filter($h, function ($c) { return he_suit($c) === 1 && he_hi($c) >= 10; });
        usort($hh, function ($a, $b) { return he_hi($b) - he_hi($a); });
        foreach ($hh as $c) $take($c);
        $s = $h; usort($s, function ($a, $b) { $d = he_hi($b) - he_hi($a); if ($d) return $d; $e = (he_suit($a) === 0 ? 0 : 1) - (he_suit($b) === 0 ? 0 : 1); return $e ? $e : $a - $b; });
        foreach ($s as $c) if (!(he_suit($c) === 0 && he_hi($c) < 12)) $take($c);
        $s = $h; usort($s, function ($a, $b) { $d = he_hi($b) - he_hi($a); return $d ? $d : $a - $b; });
        foreach ($s as $c) $take($c);
        return $out;
    }
    function he_moon_hand($h) {
        $he = he_filter($h, function ($c) { return he_suit($c) === 1; });
        $top = count(he_filter($he, function ($c) { return he_hi($c) >= 11; }));
        $big = count(he_filter($h, function ($c) { return he_hi($c) >= 12; }));
        return count($he) >= 6 && $top >= 3 && $big >= 6 && he_in(0, $h);
    }

    // ---------------------------------------------------------------- the computer players: playing a card
    function he_out($S) {
        $seen = array(); foreach ($S['played'] as $c) $seen[$c] = 1; foreach ($S['trick'] as $x) $seen[$x['c']] = 1;
        $o = array(); for ($c = 0; $c < 52; $c++) if (!isset($seen[$c])) $o[] = $c; return $o;
    }
    function he_lowest($L) { $a = $L[0]; foreach ($L as $c) if (he_hi($c) < he_hi($a)) $a = $c; return $a; }
    function he_highest($L) { $a = $L[0]; foreach ($L as $c) if (he_hi($c) > he_hi($a)) $a = $c; return $a; }
    function he_by_suit($L, $s) { return he_filter($L, function ($c) use ($s) { return he_suit($c) === $s; }); }
    function he_ai($S, $p) {
        $L = he_legal($S, $p); $lv = $S['lv'];
        if (count($L) === 1) return $L[0];
        if ($lv === 1 && he_whim($S, $p, 1) < 0.4) return $L[(int)floor(he_whim($S, $p, 2) * count($L))];
        if ($lv >= 7 && $S['moonTry'][$p]) { $mc = he_moon_play($S, $p, $L); if ($mc !== null) return $mc; }
        if (!count($S['trick'])) return he_lead($S, $p, $L);
        $led = he_suit($S['trick'][0]['c']); $all = true;
        foreach ($L as $c) if (he_suit($c) !== $led) { $all = false; break; }
        return $all ? he_follow($S, $p, $L) : he_discard($S, $p, $L);
    }
    function he_lead($S, $p, $L) {
        $lv = $S['lv']; $h = $S['hands'][$p];
        $o = he_filter(he_out($S), function ($c) use ($h) { return !in_array($c, $h, true); });
        $qsOut = he_in(11, $o); $haveQ = he_in(11, $h);
        $allHe = true; foreach ($L as $x) if (he_suit($x) !== 1) { $allHe = false; break; }
        $opts = he_filter($L, function ($c) use ($allHe) { return he_suit($c) !== 1 || $allHe; });
        if (!count($opts)) $opts = $L;
        if ($lv >= 5 && $qsOut && !$haveQ && !he_in(0, $h) && !he_in(12, $h)) {
            $sp = he_filter(he_by_suit($opts, 0), function ($c) { return he_hi($c) < 12; });
            if (count($sp)) return he_highest($sp);
        }
        $safe = he_filter($opts, function ($c) use ($qsOut) { return $c !== 11 && !($qsOut && ($c === 0 || $c === 12)); });
        if (!count($safe)) $safe = $opts;
        if ($lv >= 5) {
            $sure = he_filter($safe, function ($c) use ($haveQ, $o) {
                if (!(he_suit($c) !== 0 || !$haveQ)) return false;
                $under = false; $any = false;
                foreach ($o as $x) if (he_suit($x) === he_suit($c)) { $any = true; if (he_hi($x) < he_hi($c)) $under = true; }
                return !$under && $any;
            });
            if (count($sure)) return he_lowest($sure);
        }
        $best = null; $bs = INF;
        foreach ($safe as $c) {
            $n = count(he_by_suit($h, he_suit($c))) + (he_suit($c) === 1 ? 6 : 0) + (he_suit($c) === 0 && $haveQ ? 4 : 0);
            $sc = $n * 20 + he_hi($c);
            if ($lv >= 7) for ($q = 0; $q < 4; $q++) if ($q !== $p && $S['voids'][$q][he_suit($c)] && count($S['hands'][$q])) $sc += 120;
            if ($sc < $bs) { $bs = $sc; $best = $c; }
        }
        return $best;
    }
    function he_follow($S, $p, $L) {
        $lv = $S['lv']; $w = he_winner_of($S['trick']); $led = he_suit($S['trick'][0]['c']); $last = count($S['trick']) === 3;
        $inTrick = 0; foreach ($S['trick'] as $x) $inTrick += he_pts($x['c']);
        $wc = $w['c'];
        $under = he_filter($L, function ($c) use ($wc) { return he_hi($c) < he_hi($wc); });
        if ($led === 0 && he_in(11, $L) && he_hi($wc) > 12) return 11;
        if ($lv >= 5 && he_moon_threat($S, $p) === $w['p'] && $inTrick > 0) {
            $over = he_filter($L, function ($c) use ($wc) { return he_hi($c) > he_hi($wc) && $c !== 11; });
            if (count($over)) return he_lowest($over);
        }
        if ($last && $inTrick === 0 && !($led === 1)) {
            $big = he_filter($L, function ($c) { return $c !== 11; });
            if (count($big)) {
                $top = he_highest($big);
                if (!($led === 0 && !he_in(11, $S['played']) && he_hi($top) > 12 && $lv >= 3 && count($under))) return $top;
            }
        }
        if (count($under)) {
            $u = he_filter($under, function ($c) use ($wc) { return $c !== 11 || he_hi($wc) > 12; });
            if (count($u)) return he_highest($u);
        }
        $nq = he_filter($L, function ($c) { return $c !== 11; });
        if (!count($nq)) $nq = $L;
        return $last ? he_highest($nq) : he_lowest($nq);
    }
    function he_discard($S, $p, $L) {
        $lv = $S['lv']; $h = $S['hands'][$p]; $w = he_winner_of($S['trick']);
        $threat = $lv >= 5 ? he_moon_threat($S, $p) : -1;
        if ($threat >= 0 && $threat === $w['p']) {
            $plain = he_filter($L, function ($c) { return he_pts($c) === 0; });
            if (count($plain)) return he_highest($plain);
        }
        if (he_in(11, $L)) return 11;
        if (!he_in(11, $S['played']) && !he_in(11, $h)) { if (he_in(0, $L)) return 0; if (he_in(12, $L)) return 12; }
        $he = he_by_suit($L, 1);
        if (count($he)) return he_highest($he);
        $best = null; $bs = -INF;
        foreach ($L as $c) { $sc = he_hi($c) * 2 - count(he_by_suit($h, he_suit($c))) * 3; if ($sc > $bs) { $bs = $sc; $best = $c; } }
        return $best;
    }
    function he_moon_threat($S, $me) {
        $who = -1; $tot = 0;
        for ($p = 0; $p < 4; $p++) if ($S['taken'][$p]) { if ($who >= 0) return -1; $who = $p; $tot = $S['taken'][$p]; }
        return $who >= 0 && $who !== $me && $S['tricks'] >= 5 && $tot >= 6 ? $who : -1;
    }
    function he_moon_play($S, $p, $L) {
        if (!count($S['trick'])) return he_highest($L);
        $w = he_winner_of($S['trick']); $led = he_suit($S['trick'][0]['c']); $wc = $w['c'];
        $over = he_filter($L, function ($c) use ($led, $wc) { return he_suit($c) === $led && he_hi($c) > he_hi($wc); });
        if (count($over)) return he_highest($over);
        $plain = he_filter($L, function ($c) { return he_pts($c) === 0; });
        return count($plain) ? he_lowest($plain) : he_lowest($L);
    }

    // ---------------------------------------------------------------- the Hall of Fame
    function he_decode($code) {   // the page's move codes (engine.js code())
        $code = (string)$code;
        if ($code === 'N') return array('t' => 'next');
        if (preg_match('/^c(\d{1,2})$/', $code, $m) && (int)$m[1] < 52) return array('t' => 'play', 'c' => (int)$m[1]);
        if (preg_match('/^P(\d{1,2})\.(\d{1,2})\.(\d{1,2})$/', $code, $m) && max((int)$m[1], (int)$m[2], (int)$m[3]) < 52) return array('t' => 'pass', 'cards' => array((int)$m[1], (int)$m[2], (int)$m[3]));
        return null;
    }
    // the match from the deal number and your moves; null if any move doesn't fit. Returns the final state and counts.
    function he_replay($seed, $lv, $log) {
        $S = he_new_match($seed, $lv); $i = 0; $n = count($log); $auto = 0; $guard = 0;
        while ($S['phase'] !== 'over') {
            if (++$guard > 6000) return null;
            $m = he_auto($S);
            if ($m !== null) { if (!he_apply($S, $m)) return null; $auto++; continue; }
            if ($i >= $n) return null;
            $m = he_decode($log[$i++]);
            if ($m === null || !he_apply($S, $m)) return null;
        }
        if ($i !== $n) return null;
        return array('S' => $S, 'won' => $S['winner'] === 0, 'pts' => $S['scores'][0], 'hands' => $S['hand'] + 1, 'human' => $n, 'auto' => $auto);
    }
}
