<?php
/*
 * 365 PC Manager "Suggest an idea" - the store behind it. 29 Oct 2026 (owner: "a part on the 365 PC Manager where people
 * can leave suggestions or features they'd like ... just to get feedback", then "yes add it to build 47").
 * api/pcm-ideas.json (denied in .htaccess with the other pcm stores): {"ideas":[...newest last, 500 at most],
 * "rate":{"<day>":{"<install id>":n}}, "hr":{"h":<hour>,"n":n}}. Each idea: t (unix time), k (feature | wrong | confusing
 * | other), x (the words, 1,500 characters at most), e (an email ONLY when they asked for a reply, UK only - the app never
 * shows the box abroad), v (build), c (country from the install's own check-in), l (1 = linked to a customer record),
 * m (the install's anonymous id, as pcm-installs.json - never the machine id itself).
 * Included by pcm.php (action=idea) and pcm-installs.php (the staff portal's list). NO closing tag in this file.
 */
function ideas_file() { return isset($GLOBALS['PCM_IDEAS_FILE']) ? $GLOBALS['PCM_IDEAS_FILE'] : __DIR__ . '/pcm-ideas.json'; }

// the words as stored: control characters out (newlines kept), trimmed, 1,500 characters at most
function ideas_clean_text($s) {
    $s = preg_replace('/[^\P{C}\n]/u', '', (string)$s);
    if ($s === null) $s = '';
    $s = trim(str_replace("\r", '', $s));
    return function_exists('mb_substr') ? mb_substr($s, 0, 1500) : substr($s, 0, 1500);
}

// $row: k, x, e, v, c, l, m. Returns 'ok' | 'empty' | 'rate' | 'busy'. Per install: 5 a day; everyone: 40 an hour.
function ideas_add($row, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $x = ideas_clean_text(isset($row['x']) ? $row['x'] : '');
    if (strlen($x) < 3) return 'empty';
    $k = isset($row['k']) ? (string)$row['k'] : '';
    if (!in_array($k, array('feature', 'wrong', 'confusing', 'other'), true)) $k = 'other';
    $e = strtolower(trim((string)(isset($row['e']) ? $row['e'] : '')));
    if ($e !== '' && (strlen($e) > 120 || !filter_var($e, FILTER_VALIDATE_EMAIL))) $e = '';
    $m = preg_replace('/[^a-f0-9]/', '', (string)(isset($row['m']) ? $row['m'] : ''));
    $f = ideas_file();
    $fh = @fopen($f, 'c+');
    if (!$fh) return 'busy';
    if (!flock($fh, LOCK_EX)) { fclose($fh); return 'busy'; }
    $d = json_decode((string)stream_get_contents($fh), true);
    if (!is_array($d)) $d = array();
    if (!isset($d['ideas']) || !is_array($d['ideas'])) $d['ideas'] = array();
    $day = gmdate('Y-m-d', $now); $hour = (int)floor($now / 3600);
    $rate = (isset($d['rate']) && is_array($d['rate']) && isset($d['rate'][$day])) ? array($day => $d['rate'][$day]) : array($day => array());
    $hr = (isset($d['hr']['h']) && (int)$d['hr']['h'] === $hour) ? $d['hr'] : array('h' => $hour, 'n' => 0);
    $mine = $m !== '' && isset($rate[$day][$m]) ? (int)$rate[$day][$m] : 0;
    if ($mine >= 5 || (int)$hr['n'] >= 40) { flock($fh, LOCK_UN); fclose($fh); return 'rate'; }
    $d['ideas'][] = array('t' => $now, 'k' => $k, 'x' => $x, 'e' => $e, 'v' => max(0, min(9999, (int)(isset($row['v']) ? $row['v'] : 0))),
        'c' => strtoupper(substr(preg_replace('/[^A-Za-z]/', '', (string)(isset($row['c']) ? $row['c'] : '')), 0, 2)),
        'l' => empty($row['l']) ? 0 : 1, 'm' => substr($m, 0, 16));
    if (count($d['ideas']) > 500) $d['ideas'] = array_slice($d['ideas'], -500);
    if ($m !== '') $rate[$day][$m] = $mine + 1;
    $hr['n'] = (int)$hr['n'] + 1;
    $d['rate'] = $rate; $d['hr'] = $hr;
    $js = json_encode($d);
    if ($js === false) { flock($fh, LOCK_UN); fclose($fh); return 'busy'; }
    ftruncate($fh, 0); rewind($fh); fwrite($fh, $js); fflush($fh);
    flock($fh, LOCK_UN); fclose($fh);
    return 'ok';
}

// For the staff portal: the newest $n ideas (newest first) and how many came in the last 7 and 30 days.
function ideas_recent($n = 60, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $d = @json_decode((string)@file_get_contents(ideas_file()), true);
    $all = (is_array($d) && isset($d['ideas']) && is_array($d['ideas'])) ? $d['ideas'] : array();
    $d7 = 0; $d30 = 0;
    foreach ($all as $i) { $age = $now - (int)(isset($i['t']) ? $i['t'] : 0); if ($age < 30 * 86400) { $d30++; if ($age < 7 * 86400) $d7++; } }
    $list = array();
    foreach (array_slice(array_reverse($all), 0, $n) as $i)
        $list[] = array('at' => gmdate('Y-m-d H:i', (int)$i['t']), 'kind' => (string)$i['k'], 'text' => (string)$i['x'], 'email' => (string)(isset($i['e']) ? $i['e'] : ''),
            'ver' => (int)(isset($i['v']) ? $i['v'] : 0), 'cc' => (string)(isset($i['c']) ? $i['c'] : ''), 'linked' => !empty($i['l']));
    return array('d7' => $d7, 'd30' => $d30, 'total' => count($all), 'list' => $list);
}
