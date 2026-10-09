<?php
/* Staff notes on a customer's PC (9 Oct 2026, owner: "notes and things on each customer's thing we can open it there ...
   quite a few of them have ... things I can say about each one").

   Its own small store, pcm-pcnotes.json - NOT pcm-data.json: the check-ins rewrite that file every hour from every PC,
   and after 8 Oct (customer list wiped by an empty write) nothing new goes into it that doesn't have to. Denied over HTTP
   in .htaccess (the pcm-data rule) and gitignored. Read-modify-written under its own lock, written to a temporary file and
   renamed, and never written at all when the JSON can't be made - an empty file can't replace the notes.

   Shape: {"v":1, "pcs": {"<cid>|<pc>": [ {"id":"<8 hex>", "ts":<unix>, "by":"<first name>", "t":"<text>"} , ... ]}}
   cid = the opaque customer id the portal already uses (sha1('365cid|'+key)[:12]), pc = the app's machine id. Staff only:
   a customer never sees these, and the customer's portal view (view-as) never reads this file.
   Include-only; tests: pcm-pcnotes-test.php (CLI). */
if (!defined('PCN_STORE')) define('PCN_STORE', __DIR__ . '/pcm-pcnotes.json');
if (!defined('PCN_MAX_PER_PC')) define('PCN_MAX_PER_PC', 60);
if (!defined('PCN_MAX_LEN')) define('PCN_MAX_LEN', 1500);

/** The store key for one PC, or '' when either id is not what the portal hands out. */
function pcn_key($cid, $pc) {
    $cid = (string)$cid; $pc = (string)$pc;
    if (!preg_match('/^[a-f0-9]{12}$/', $cid) || !preg_match('/^[a-f0-9]{1,32}$/', $pc)) return '';
    return $cid . '|' . $pc;
}

/** A note's text as stored: no control characters but new lines, trimmed, at most PCN_MAX_LEN characters. */
function pcn_text($s) {
    $s = str_replace(array("\r\n", "\r"), "\n", (string)$s);
    $s = preg_replace('/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]+/', ' ', $s);
    $s = preg_replace("/\n{3,}/", "\n\n", trim($s));
    return function_exists('mb_substr') ? mb_substr($s, 0, PCN_MAX_LEN, 'UTF-8') : substr($s, 0, PCN_MAX_LEN);
}

function pcn_read($file = null) {
    $d = @json_decode((string)@file_get_contents($file !== null ? $file : PCN_STORE), true);
    if (!is_array($d)) $d = array();
    if (!isset($d['pcs']) || !is_array($d['pcs'])) $d['pcs'] = array();
    $d['v'] = 1;
    return $d;
}

/** Run $fn(store) under the lock; when it returns 'data', that is written (temporary file, then rename). */
function pcn_locked($fn, $file = null) {
    $f = $file !== null ? $file : PCN_STORE;
    $h = @fopen($f . '.lock', 'c');
    if (!$h || !flock($h, LOCK_EX)) { if ($h) fclose($h); return array('ok' => false, 'error' => 'busy'); }
    $data = pcn_read($f);
    $r = $fn($data);
    if (isset($r['data'])) {
        $tmp = $f . '.' . getmypid() . '.tmp';
        $j = json_encode($r['data'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($j !== false && strlen($j) > 2 && @file_put_contents($tmp, $j, LOCK_EX) !== false) @rename($tmp, $f);
        else { @unlink($tmp); $r = array('ok' => false, 'error' => 'store'); }
        unset($r['data']);
    }
    flock($h, LOCK_UN); fclose($h);
    return $r;
}

/** One PC's notes, newest first. */
function pcn_list($cid, $pc, $file = null) {
    $k = pcn_key($cid, $pc); if ($k === '') return array();
    $d = pcn_read($file);
    $l = isset($d['pcs'][$k]) && is_array($d['pcs'][$k]) ? array_values($d['pcs'][$k]) : array();
    // newest first; two in the same second keep the order they were saved in (the store is oldest first)
    $ix = array_keys($l);
    usort($ix, function ($a, $b) use ($l) { $t = (int)$l[$b]['ts'] - (int)$l[$a]['ts']; return $t !== 0 ? $t : $b - $a; });
    return array_map(function ($i) use ($l) { return $l[$i]; }, $ix);
}

/** How many notes each PC has: key => n (for the fleet list's little note mark). */
function pcn_counts($file = null) {
    $o = array();
    foreach (pcn_read($file)['pcs'] as $k => $l) if (is_array($l) && $l) $o[$k] = count($l);
    return $o;
}

/** Add a note. Returns ok + the PC's notes, or ok=false with error empty | bad_pc | busy | store. */
function pcn_add($cid, $pc, $text, $by, $now = null, $file = null) {
    $k = pcn_key($cid, $pc); if ($k === '') return array('ok' => false, 'error' => 'bad_pc');
    $t = pcn_text($text); if ($t === '') return array('ok' => false, 'error' => 'empty');
    $now = $now === null ? time() : (int)$now;
    $by = trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', (string)$by)); if ($by === '') $by = 'staff';
    $by = function_exists('mb_substr') ? mb_substr($by, 0, 40, 'UTF-8') : substr($by, 0, 40);
    $r = pcn_locked(function ($d) use ($k, $t, $by, $now) {
        $l = isset($d['pcs'][$k]) && is_array($d['pcs'][$k]) ? array_values($d['pcs'][$k]) : array();
        $l[] = array('id' => substr(sha1($k . '|' . $now . '|' . $t . '|' . mt_rand()), 0, 8), 'ts' => $now, 'by' => $by, 't' => $t);
        // oldest first; the same second keeps the order saved
        $ix = array_keys($l);
        usort($ix, function ($a, $b) use ($l) { $t2 = (int)$l[$a]['ts'] - (int)$l[$b]['ts']; return $t2 !== 0 ? $t2 : $a - $b; });
        $l = array_map(function ($i) use ($l) { return $l[$i]; }, $ix);
        while (count($l) > PCN_MAX_PER_PC) array_shift($l);
        $d['pcs'][$k] = array_values($l);
        return array('ok' => true, 'data' => $d);
    }, $file);
    if (empty($r['ok'])) return $r;
    return array('ok' => true, 'notes' => pcn_list($cid, $pc, $file));
}

/** Delete one note by id. Returns ok + the PC's notes; a note already gone is not an error. */
function pcn_del($cid, $pc, $id, $file = null) {
    $k = pcn_key($cid, $pc); if ($k === '') return array('ok' => false, 'error' => 'bad_pc');
    $id = (string)$id; if (!preg_match('/^[a-f0-9]{8}$/', $id)) return array('ok' => false, 'error' => 'bad_id');
    $r = pcn_locked(function ($d) use ($k, $id) {
        if (!isset($d['pcs'][$k]) || !is_array($d['pcs'][$k])) return array('ok' => true);
        $l = array_values(array_filter($d['pcs'][$k], function ($n) use ($id) { return !is_array($n) || (string)$n['id'] !== $id; }));
        if (count($l) === count($d['pcs'][$k])) return array('ok' => true);
        if ($l) $d['pcs'][$k] = $l; else unset($d['pcs'][$k]);
        return array('ok' => true, 'data' => $d);
    }, $file);
    if (empty($r['ok'])) return $r;
    return array('ok' => true, 'notes' => pcn_list($cid, $pc, $file));
}
