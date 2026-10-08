<?php
/*
 * One-off (8 Oct 2026): is PHP's code cache serving an OLD pcm.php? Two deploys put a new pcm.php on disk (35ed20b9,
 * 8dbc63a4) yet the live endpoint kept answering as the old one, while pcm-booking.php from the same deploy ran new.
 * Reports cached-vs-disk timestamps for the PC Manager endpoints, and asks PHP to drop a cached copy ONLY when it is
 * older than the file on disk (a non-forced invalidate - exactly what timestamp validation would do), so calling it
 * again changes nothing. No customer data, no paths beyond the file names. Removed once it has done its job.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$out = array('opcache' => function_exists('opcache_get_status'));
$cfg = function_exists('opcache_get_configuration') ? @opcache_get_configuration() : false;
if (is_array($cfg) && isset($cfg['directives'])) {
    $d = $cfg['directives'];
    $out['validate_timestamps'] = isset($d['opcache.validate_timestamps']) ? (bool)$d['opcache.validate_timestamps'] : null;
    $out['revalidate_freq'] = isset($d['opcache.revalidate_freq']) ? (int)$d['opcache.revalidate_freq'] : null;
}
$st = function_exists('opcache_get_status') ? @opcache_get_status(true) : false;
$out['status_readable'] = is_array($st);
foreach (array('pcm.php', 'pcm-booking.php', 'pcm-rehome-lib.php') as $f) {
    $p = __DIR__ . '/' . $f;
    $row = array('disk' => @filemtime($p) ?: 0);
    $row['cached'] = function_exists('opcache_is_script_cached') ? (bool)@opcache_is_script_cached($p) : null;
    if (is_array($st) && isset($st['scripts'][$p]['timestamp'])) $row['cached_ts'] = (int)$st['scripts'][$p]['timestamp'];
    $row['stale'] = isset($row['cached_ts']) && $row['disk'] > $row['cached_ts'];
    if ($row['stale'] && function_exists('opcache_invalidate')) $row['invalidated'] = (bool)@opcache_invalidate($p, false);
    $out[$f] = $row;
}
// is the pcm.php on disk the new one, and what does the re-home conclude for a made-up key on the live data? (counts and
// yes/no only - nothing about any customer)
$src = (string)@file_get_contents(__DIR__ . '/pcm.php');
$out['php'] = PHP_VERSION;
$out['pcm_md5'] = md5($src);
$out['pcm_has_keygone'] = strpos($src, 'PCM_KEYGONE') !== false;
$out['pcm_has_resend_note'] = strpos($src, 'Re-sent 8 Oct 2026') !== false;
if (is_readable(__DIR__ . '/pcm-plus-lib.php')) require_once __DIR__ . '/pcm-plus-lib.php';
$out['plus_fn'] = function_exists('plus_is_key');
require_once __DIR__ . '/pcm-rehome-lib.php';
$db = json_decode((string)@file_get_contents(__DIR__ . '/pcm-data.json'), true);
$out['db_ok'] = is_array($db) && isset($db['customers']) && is_array($db['customers']);
if ($out['db_ok']) {
    $out['db_has_customers'] = count($db['customers']) > 0;
    $copy = $db; $r = rehome_resolve($copy, 'ZZREHOMECHECK', '000000000000', '');
    $out['resolve_how'] = $r[1];
}
echo json_encode($out);
