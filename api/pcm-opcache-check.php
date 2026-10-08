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
echo json_encode($out);
