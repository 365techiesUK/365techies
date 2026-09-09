<?php
/**
 * Serves ONE stored service report to the holder of a signed, expiring link -
 * the "View the full report" button in the six-weekly service report email.
 *
 * No sign-in: the link IS the credential. It carries only the report's
 * coordinates (customer-key hash, machine id, timestamp) plus an expiry, HMAC'd
 * with the mail queue's salt (pcm-review.php sr_link / sr_token_verify), so it
 * cannot be forged or altered and stops working after $SR_LINK_DAYS. The stored
 * files themselves stay .htaccess-denied; this is the only door.
 *
 * Anything invalid, expired or missing gets the same friendly page: every report
 * is in the portal, sign in there. Never a distinguishing error.
 */
define('RV_LIB', 1);
require __DIR__ . '/pcm-review.php';

header('X-Robots-Tag: noindex, nofollow, noarchive');
header('Cache-Control: private, no-store, max-age=0');
header('Referrer-Policy: no-referrer');
header('X-Content-Type-Options: nosniff');

$t = isset($_GET['t']) ? (string)$_GET['t'] : '';
$v = ($t !== '' && strlen($t) < 600) ? sr_token_verify($t, rv_salt()) : null;
$f = $v ? __DIR__ . '/pcm-rep-' . $v['kh'] . '-' . $v['machine'] . '-' . $v['ts'] . '.html' : '';

if (!$v || !is_file($f)) {
    http_response_code(404);
    header('Content-Type: text/html; charset=UTF-8');
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<meta name="robots" content="noindex,nofollow"><title>This report link has expired</title>'
       . '<style>body{margin:0;background:#eef3f9;font:17px/1.6 "Segoe UI",-apple-system,Helvetica,Arial,sans-serif;color:#243352}'
       . '.c{max-width:560px;margin:40px auto;background:#fff;border-radius:14px;overflow:hidden}'
       . '.h{background:#0b1226;padding:22px 30px;color:#fff;font-weight:700;font-size:18px}.h span{display:inline-block;background:#1d97e3;border-radius:8px;width:40px;height:40px;line-height:40px;text-align:center;margin-right:12px;font-size:15px}'
       . '.b{padding:28px 30px 32px}h1{margin:0 0 12px;font-size:24px;color:#0b1226}p{margin:0 0 14px}'
       . 'a.btn{display:inline-block;background:#1d97e3;color:#fff;text-decoration:none;font-weight:700;padding:14px 26px;border-radius:9px;margin:6px 0 14px}'
       . 'a{color:#1266a8}small{color:#7c8aa5;font-size:14px}</style></head><body><div class="c">'
       . '<div class="h"><span>365</span>365 Techies</div><div class="b">'
       . '<h1>This report link has expired</h1>'
       . '<p>Links in our service report emails work for ' . (int)$GLOBALS['SR_LINK_DAYS'] . ' days. Every report we have ever written for you is kept in your 365 portal &ndash; sign in with your email address and we will send you a code.</p>'
       . '<a class="btn" href="https://365techies.co.uk/portal/">Open my 365 portal</a>'
       . '<p><small>Prefer to talk? Ring <a href="tel:+441202775566">01202 775566</a> and we will read it to you.</small></p>'
       . '</div></div></body></html>';
    exit;
}

header('Content-Type: text/html; charset=UTF-8');
// the report is our own static HTML: inline styles and a small inline script (the score
// count-up). Nothing external is allowed to load from inside it.
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'");
readfile($f);
