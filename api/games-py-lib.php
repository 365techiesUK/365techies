<?php
/*
 * 365 Pyramid's rules on the server (4 Oct 2026), for the Hall of Fame: replays a game's moves from its deal number to
 * prove a win. A line-for-line copy of games/pyramid/engine.js (the shuffle, legal, apply, the move codes, the sprint's
 * count). ⚠ Change one, change both: the scratchpad parity test (py-parity) plays random games through both and compares.
 * Include-only (denied in .htaccess). NO closing tag in this file.
 */
if (!function_exists('py_deal')) {

    function py_u32($x) { return $x & 0xFFFFFFFF; }
    function py_imul($a, $b) {   // Math.imul: the low 32 bits of a 32 x 32 multiply
        $a = py_u32($a); $b = py_u32($b);
        $ah = ($a >> 16) & 0xFFFF; $al = $a & 0xFFFF; $bh = ($b >> 16) & 0xFFFF; $bl = $b & 0xFFFF;
        return py_u32(((($ah * $bl + $al * $bh) & 0xFFFF) << 16) + $al * $bl);
    }
    function py_shuffled($seed) {   // mulberry32, as the page shuffles
        $a = py_u32($seed); $d = range(0, 51);
        for ($i = 51; $i > 0; $i--) {
            $a = py_u32($a + 0x6D2B79F5);
            $t = $a;
            $t = py_imul($t ^ ($t >> 15), $t | 1);
            $t = py_u32($t ^ py_u32($t + py_imul($t ^ ($t >> 7), $t | 61)));
            $r = py_u32($t ^ ($t >> 14)) / 4294967296.0;
            $j = (int)floor($r * ($i + 1));
            $tmp = $d[$i]; $d[$i] = $d[$j]; $d[$j] = $tmp;
        }
        return $d;
    }
    function py_rank($c) { return ($c % 13) + 1; }
    function py_cover() {   // place r(r+1)/2+k lies under the two places below it
        static $C = null;
        if ($C === null) { $C = array(); for ($r = 0; $r < 7; $r++) for ($k = 0; $k <= $r; $k++) $C[] = $r < 6 ? array(($r + 1) * ($r + 2) / 2 + $k, ($r + 1) * ($r + 2) / 2 + $k + 1) : array(); }
        return $C;
    }
    // levels: times through the deck - 1 Easy no limit, 3 Normal three, 5 Hard two, 7 Expert one
    function py_deal($seed, $lv) {
        $LIMIT = array(1 => 0, 3 => 3, 5 => 2, 7 => 1);
        $lv = (int)$lv; if (!isset($LIMIT[$lv])) $lv = 1;
        $d = py_shuffled($seed);
        return array('seed' => $seed, 'lv' => $lv, 'limit' => $LIMIT[$lv], 'tab' => array_slice($d, 0, 28), 'stock' => array_slice($d, 28), 'waste' => array(), 'done' => array(),
            'passes' => 0, 'moves' => 0, 'score' => 0, 'won' => false);
    }
    function py_free($s, $i) { $C = py_cover(); $cv = $C[$i]; return $s['tab'][$i] !== null && (!count($cv) || ($s['tab'][$cv[0]] === null && $s['tab'][$cv[1]] === null)); }
    function py_can_recycle($s) { return !$s['limit'] || $s['passes'] + 1 < $s['limit']; }
    function py_card_at($s, $pos) {
        if ($pos === null) return null;
        if ($pos['p'] === 'w') return count($s['waste']) ? $s['waste'][count($s['waste']) - 1] : null;
        if ($pos['p'] === 't' && $pos['i'] >= 0 && $pos['i'] < 28 && py_free($s, $pos['i'])) return $s['tab'][$pos['i']];
        return null;
    }
    function py_same($a, $b) { return $a['p'] === $b['p'] && ($a['p'] === 'w' || $a['i'] === $b['i']); }
    function py_left($s) { $n = 0; for ($i = 0; $i < 28; $i++) if ($s['tab'][$i] !== null) $n++; return $n; }
    function py_rows_left($s) { $n = 0; for ($r = 0; $r < 7; $r++) for ($k = 0; $k <= $r; $k++) if ($s['tab'][$r * ($r + 1) / 2 + $k] !== null) { $n++; break; } return $n; }
    function py_legal($s, $m) {
        if ($s['won']) return false;
        if ($m['t'] === 'draw') return count($s['stock']) > 0 || (count($s['waste']) > 0 && py_can_recycle($s));
        $a = py_card_at($s, $m['from']); if ($a === null) return false;
        if ($m['to']['p'] === 'f') return py_rank($a) === 13;
        $b = py_card_at($s, $m['to']); if ($b === null || py_same($m['from'], $m['to'])) return false;
        return py_rank($a) + py_rank($b) === 13;
    }
    function py_apply(&$s, $m) {
        if (!py_legal($s, $m)) return false;
        if ($m['t'] === 'draw') {
            if (count($s['stock'])) $s['waste'][] = array_pop($s['stock']);
            else { $s['stock'] = array_reverse($s['waste']); $s['waste'] = array(); $s['passes']++; }
        } else {
            $before = py_rows_left($s); $take = array($m['from']);
            if ($m['to']['p'] !== 'f') $take[] = $m['to'];
            foreach ($take as $pos) {
                $card = py_card_at($s, $pos);
                if ($pos['p'] === 'w') array_pop($s['waste']); else $s['tab'][$pos['i']] = null;
                $s['done'][] = $card;
            }
            $pts = 10 + 50 * ($before - py_rows_left($s));
            if (!py_left($s)) { $s['won'] = true; $pts += 500; }
            $s['score'] += $pts;
        }
        $s['moves']++;
        return true;
    }
    function py_pos($t) { if ($t === 'w') return array('p' => 'w'); return preg_match('/^t(\d{1,2})$/', $t, $x) && (int)$x[1] < 28 ? array('p' => 't', 'i' => (int)$x[1]) : null; }
    function py_decode($c) {
        if (!is_string($c)) return null;
        if ($c === 'd') return array('t' => 'draw');
        if (preg_match('/^k(w|t\d{1,2})$/', $c, $x)) { $f = py_pos($x[1]); return $f ? array('t' => 'move', 'from' => $f, 'to' => array('p' => 'f')) : null; }
        if (preg_match('/^x(w|t\d{1,2})\.(w|t\d{1,2})$/', $c, $x)) { $a = py_pos($x[1]); $b = py_pos($x[2]); return $a && $b ? array('t' => 'move', 'from' => $a, 'to' => $b) : null; }
        return null;
    }
    function py_replay($seed, $lv, $log) {
        if (!is_array($log) || count($log) > 3000) return null;
        $s = py_deal($seed, $lv);
        foreach ($log as $c) { $m = py_decode($c); if (!$m || !py_apply($s, $m)) return null; }
        return $s;
    }
    function py_found_count($s) { return 28 - py_left($s); }   // the sprint: cards cleared from the pyramid
    // the day's deals, as the game picks them: the proven lists in games/pyramid/deals.js (p4 Easy ... p1 Expert)
    function py_list($lv) {
        static $lists = null;
        if ($lists === null) {
            $lists = array('p1' => array(), 'p2' => array(), 'p3' => array(), 'p4' => array());
            $src = (string)@file_get_contents(dirname(__DIR__) . '/games/pyramid/deals.js');
            foreach (array_keys($lists) as $k) $lists[$k] = preg_match('/\b' . $k . ':\s*\[([0-9,\s]+)\]/', $src, $m) ? array_map('intval', explode(',', $m[1])) : array();
        }
        $map = array(1 => 'p4', 3 => 'p3', 5 => 'p2', 7 => 'p1'); $lv = (int)$lv;
        return $lists[isset($map[$lv]) ? $map[$lv] : 'p4'];
    }
    function py_daily_seed($n, $lv) { $l = py_list($lv); $len = count($l); return $len ? $l[(($n * 7919) % $len + $len) % $len] : 900000 + (($n % 90000) + 90000) % 90000; }
    function py_sprint_seed($n) { $l = py_list(1); $len = count($l); return $len ? $l[(($n * 104729 + 17) % $len + $len) % $len] : 1; }
}
