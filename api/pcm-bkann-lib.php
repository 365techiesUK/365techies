<?php
/**
 * "Has the portal just announced this booking in Slack?" (27 Oct 2026, owner: "fix the double booking message in
 * Slack").
 *
 * A booking made, moved or cancelled IN THE PORTAL by staff is announced by the portal itself, with who did it
 * ("New booking - John Memmott on Wed 28 Oct 11:00am (by David)"). SimplyBook then calls pcm-sb-callback.php about the
 * same booking a second later, and the callback - whose job is to announce bookings typed straight into SimplyBook,
 * which nothing else announces - said it all again: "New booking (taken in SimplyBook) - John Memmott ...". The
 * callback already stayed quiet for the CUSTOMER's own online bookings (rv_seen: the book action queues them first),
 * but staff bookings, moves, cancels and logged jobs never went into that queue.
 *
 * So each of those portal actions marks the booking here (booking id + what happened), and the callback skips its
 * Slack line for a marked booking for 15 minutes. Everything else the callback does - the customer's emails, the
 * review queue, the PC Manager next-service date - is untouched: only the duplicate Slack line goes.
 *
 * The marks live in pcm-bkann.php, a .php whose first line exits (api/ stores are otherwise served - see
 * .gitignore). Declarations only, no side effects, no closing tag. Never fails a caller: a mark that cannot be
 * written costs one duplicate Slack line, which is what happened before.
 */

if (!function_exists('bkann_mark')) {

define('BKANN_FILE', __DIR__ . '/pcm-bkann.php');
define('BKANN_WINDOW', 900);   // SimplyBook calls back within seconds; 15 minutes covers its retries

/** The marks as an array "bid:kind" => unix time. */
function bkann_read($file = null) {
    $raw = (string)@file_get_contents($file !== null ? $file : BKANN_FILE);
    $nl = strpos($raw, "\n");
    $j = $nl === false ? null : json_decode(trim(substr($raw, $nl)), true);
    return is_array($j) ? $j : array();
}

/** The portal announced booking $bid ($kinds: 'create', 'change' and/or 'cancel', SimplyBook's own words). */
function bkann_mark($bid, $kinds, $file = null, $now = null) {
    $bid = preg_replace('/[^0-9]/', '', (string)$bid);
    if ($bid === '') return false;
    $f = $file !== null ? $file : BKANN_FILE;
    $now = $now === null ? time() : (int)$now;
    $h = @fopen($f . '.lock', 'c');
    if (!$h || !@flock($h, LOCK_EX)) { if ($h) @fclose($h); return false; }
    $m = bkann_read($f);
    foreach ($m as $k => $t) if ((int)$t < $now - 86400) unset($m[$k]);   // a day is plenty: SimplyBook calls back in seconds
    foreach ((array)$kinds as $kind) $m[$bid . ':' . preg_replace('/[^a-z]/', '', (string)$kind)] = $now;
    $tmp = $f . '.' . getmypid() . '.tmp';
    $okw = @file_put_contents($tmp, "<?php exit; ?>\n" . json_encode($m) . "\n", LOCK_EX) !== false && @rename($tmp, $f);
    if (!$okw) @unlink($tmp);
    @flock($h, LOCK_UN); @fclose($h);
    return $okw;
}

/** Did the portal announce $kind for booking $bid in the last BKANN_WINDOW seconds? */
function bkann_recent($bid, $kind, $file = null, $now = null) {
    $bid = preg_replace('/[^0-9]/', '', (string)$bid);
    if ($bid === '') return false;
    $m = bkann_read($file);
    $k = $bid . ':' . preg_replace('/[^a-z]/', '', (string)$kind);
    return isset($m[$k]) && (int)$m[$k] >= ($now === null ? time() : (int)$now) - BKANN_WINDOW;
}

}
