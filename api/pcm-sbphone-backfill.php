<?php
/**
 * One-off backfill: copy customers' phone numbers from SimplyBook into our own
 * records, so the comms matcher can name them when they text.
 *
 *   php api/pcm-sbphone-backfill.php            <- DRY RUN, prints what it would do
 *   php api/pcm-sbphone-backfill.php --live     <- writes
 *
 * WHY THIS EXISTS. Bookings typed straight into SimplyBook - most of them - put
 * the customer's phone number in SimplyBook and nowhere else. The comms matcher
 * only reads our own customer file, so those people arrive as "not a number we
 * hold" when they text, even though the number is sitting in the booking system.
 * pcm-sb-callback.php now stores the phone for every NEW booking; this fills in
 * everyone who was already on the books.
 *
 * SAFETY:
 *  1. CLI only - a web request exits.
 *  2. DRY RUN by default. Nothing is written without --live.
 *  3. FILL ONLY WHERE EMPTY. A number the customer typed themselves in the
 *     portal (mobile/tel) always wins, and an existing sb_phone is left alone.
 *  4. Matches on EXACT email only - the same rule the rest of the integration
 *     uses. Never on name: two Smiths must not be merged.
 *  5. Refuses to write if the customer file will not parse, and takes the same
 *     lock every other writer takes.
 */
if (php_sapi_name() !== 'cli') { http_response_code(404); exit; }

$BASE = __DIR__;
$DATA = $BASE . '/pcm-data.json';
$CFG  = $BASE . '/pcm-simplybook.php';
$LIVE = in_array('--live', $argv, true);

require_once $BASE . '/pcm-phone-lib.php';
if (!is_readable($CFG)) { fwrite(STDERR, "no api/pcm-simplybook.php - run this on the server\n"); exit(2); }
require $CFG;   // $SB_COMPANY, $SB_API_USER, $SB_API_USER_KEY (admin API)
if (empty($SB_COMPANY) || empty($SB_API_USER) || empty($SB_API_USER_KEY)) {
    fwrite(STDERR, "admin API credentials missing - cannot list clients\n"); exit(2);
}

function rpc($url, $method, $params, $headers = array()) {
    $ch = curl_init($url);
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => array_merge(array('Content-Type: application/json'), $headers),
        CURLOPT_POSTFIELDS => json_encode(array('jsonrpc' => '2.0', 'id' => 1, 'method' => $method, 'params' => $params))));
    $r = curl_exec($ch); curl_close($ch);
    $j = json_decode((string)$r, true);
    return is_array($j) ? $j : array();
}

// Admin token, exactly as pcm-booking.php's sb_adm does.
$t = rpc('https://user-api.simplybook.me/login/', 'getUserToken', array($SB_COMPANY, $SB_API_USER, $SB_API_USER_KEY));
$token = isset($t['result']) ? (string)$t['result'] : '';
if ($token === '') { fwrite(STDERR, "could not get an admin token\n"); exit(2); }
$H = array('X-Company-Login: ' . $SB_COMPANY, 'X-User-Token: ' . $token);

// Pull the client list. An empty search term returns everyone; page through it.
$clients = array(); $page = 1;
while ($page <= 40) {
    $r = rpc('https://user-api.simplybook.me/admin/', 'getClientList', array('', 100, $page), $H);
    $rows = isset($r['result']) && is_array($r['result']) ? $r['result'] : array();
    if (!$rows) break;
    foreach ($rows as $cl) {
        if (!is_array($cl)) continue;
        $em = strtolower(trim((string)(isset($cl['email']) ? $cl['email'] : '')));
        $ph = (string)(isset($cl['phone']) ? $cl['phone'] : '');
        if ($em !== '' && $ph !== '') $clients[$em] = $ph;
    }
    if (count($rows) < 100) break;
    $page++;
}
echo "SimplyBook clients with an email AND a phone: " . count($clients) . "\n";
if (!$clients) { echo "nothing to do\n"; exit(0); }

$lk = @fopen($DATA . '.lock', 'c'); if ($lk) @flock($lk, LOCK_EX);
$raw = (string)@file_get_contents($DATA);
$db = json_decode($raw, true);
if (!is_array($db) || !isset($db['customers'])) {
    if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }
    fwrite(STDERR, "customer file unreadable - refusing to touch it\n"); exit(2);
}

$filled = 0; $skipHave = 0; $skipNoMatch = 0; $badNumber = 0;
foreach ($db['customers'] as $key => &$c) {
    if (!is_array($c)) continue;
    $em = strtolower(trim((string)(isset($c['email']) ? $c['email'] : '')));
    if ($em === '' || !isset($clients[$em])) { $skipNoMatch++; continue; }
    if (!empty($c['sb_phone']) || !empty($c['mobile']) || !empty($c['tel'])) { $skipHave++; continue; }
    $norm = pcm_phone_norm($clients[$em]);
    if ($norm === '') { $badNumber++; continue; }
    $shown = pcm_phone_display($norm);
    echo ($LIVE ? "  FILL " : "  would fill ") . $key . ' (' . $em . ') -> ' . $shown . "\n";
    if ($LIVE) { $c['sb_phone'] = $shown; $c['sb_phone_ts'] = time(); }
    $filled++;
}
unset($c);

if ($LIVE && $filled > 0) {
    $tmp = $DATA . '.backfill.tmp';
    if (@file_put_contents($tmp, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) @rename($tmp, $DATA);
    else { fwrite(STDERR, "WRITE FAILED - nothing changed\n"); }
}
if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }

echo "\n" . ($LIVE ? "WROTE" : "DRY RUN") . ": filled $filled, already had a number $skipHave, "
   . "no SimplyBook match $skipNoMatch, unusable number $badNumber\n";
if (!$LIVE && $filled > 0) echo "Re-run with --live to write.\n";
