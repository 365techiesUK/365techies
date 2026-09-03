<?php
/**
 * Tests for the shared HTML email shell and the two emails built on it.
 *   Run:  php api/pcm-mailhtml-test.php
 *
 * What is worth pinning here:
 *   - the plain-text part still exists and still says the same thing (it is the
 *     first part of the multipart message and what text-only clients read);
 *   - a customer's name and a service name cannot inject markup;
 *   - the referral offer NEVER appears in the review ask - rewarding a
 *     recommendation is lawful, rewarding a REVIEW is not (UK DMCC Act);
 *   - the review ask keeps its unsubscribe;
 *   - the visit record actually contains the visit.
 */
if (php_sapi_name() !== 'cli') { http_response_code(404); exit; }
define('RV_LIB', 1);                 // stops pcm-review.php's HTTP entry point firing
require __DIR__ . '/pcm-review.php';

$fails = 0;
function ok($cond, $what) {
    global $fails;
    echo ($cond ? "  PASS  " : "  FAIL  ") . $what . "\n";
    if (!$cond) $fails++;
}

$TS = mktime(9, 0, 0, 7, 31, 2026);   // Friday 31 July 2026

// --- the visit record --------------------------------------------------------
$html = dn_body_html('Cordelia', 'Computer Health Check', $TS);
$text = dn_body('Cordelia', 'Computer Health Check', $TS);

ok(strpos($html, '<!DOCTYPE html') === 0, 'the record is a complete HTML document');
ok(substr(rtrim($html), -7) === '</html>', 'and it is closed');
ok(strpos($html, 'Computer Health Check') !== false, 'the HTML names the service');
ok(strpos($html, '31 July 2026') !== false, 'the HTML carries the visit date');
ok(strpos($text, 'Computer Health Check') !== false, 'the plain text names the service too');
ok(strpos($text, '31 July 2026') !== false, 'and carries the date');
ok(strpos($text, 'Hi Cordelia,') === 0, 'the plain text still opens as it always did');
ok(strpos($text, '01202 775566') !== false, 'the plain text still carries the phone number');
ok(strpos($html, 'first Computer Service &amp; Health Check free') !== false, 'the record carries the referral offer');

// Two different visits must not produce identical emails - the whole reason a
// customer with two bookings thought we had sent the same thing twice.
$a = dn_body_html('Cordelia', 'Computer Health Check', $TS);
$b = dn_body_html('Cordelia', 'Laptop Repair', $TS + 86400);
ok($a !== $b, 'two different visits give two different records');
$at = dn_body('Cordelia', 'Computer Health Check', $TS);
$bt = dn_body('Cordelia', 'Laptop Repair', $TS + 86400);
ok($at !== $bt, 'and two different plain-text records');

// With nothing known about the visit, the block is simply absent.
$bare = dn_body('Cordelia');
ok(strpos($bare, 'Your visit:') === false, 'no facts, no empty "Your visit" heading in the text');
ok(strpos(dn_body_html('Cordelia'), 'What we did') === false, 'nor an empty facts table in the HTML');
ok(strpos(dn_body_html('Cordelia'), '<!DOCTYPE html') === 0, 'and the email is still well formed');

// --- the review ask ----------------------------------------------------------
$rHtml = rv_body_html('Cordelia', 'jo@example.com', 'saltysalt');
$rText = rv_body('Cordelia', 'jo@example.com', 'saltysalt');
ok(strpos($rHtml, '<!DOCTYPE html') === 0, 'the review ask is a complete HTML document');
ok(strpos($rHtml, 'pcm-review.php?u=') !== false, 'the review ask keeps a one-click unsubscribe');
ok(strpos($rText, 'pcm-review.php?u=') !== false, 'and so does its plain text');

/* THE LEGAL ONE. An incentive may accompany a request for a RECOMMENDATION but
   never a request for a REVIEW, so no referral wording may reach this email. */
foreach (array('month free', 'Health Check free', 'something in it for both') as $bait) {
    ok(stripos($rHtml, $bait) === false, 'the review ask HTML carries no incentive: ' . $bait);
    ok(stripos($rText, $bait) === false, 'the review ask text carries no incentive: ' . $bait);
}
// ...and no steering towards happy customers only (Google policy).
foreach (array('if you are happy', 'if you were happy', 'if you enjoyed') as $steer)
    ok(stripos($rHtml, $steer) === false, 'the review ask does not steer: ' . $steer);

// --- injection ---------------------------------------------------------------
$evil = dn_body_html('<script>alert(1)</script>', '"><img src=x onerror=alert(1)>', $TS);
ok(strpos($evil, '<script>') === false, 'a name cannot open a script tag');
ok(strpos($evil, '<img src=x') === false, 'a service name cannot inject an element');
ok(strpos($evil, '&lt;script&gt;') !== false || strpos($evil, 'alert') !== false, 'it is escaped rather than silently dropped');
ok(strpos(rv_body_html('<b>x</b>', 'a@b.com', 's'), '<b>x</b>') === false, 'the review ask escapes the name too');

// --- the shell itself --------------------------------------------------------
$shell = rv_html_shell(array('heading' => 'Test', 'eyebrow' => 'Eyebrow', 'blocks' => array(rv_h_p('Body'))));
ok(strpos($shell, 'role="presentation"') !== false, 'layout tables are marked presentational for screen readers');
ok(strpos($shell, 'bgcolor="#ffffff"') !== false && strpos($shell, 'background-color:#ffffff') !== false,
   'bgcolor AND background-color are both set, for Outlook');
ok(substr_count($shell, '!important') > 3, 'text colours are forced, so dark mode cannot repaint them invisible');
ok(strpos($shell, 'max-width:600px') !== false, 'the body is width-capped for phones');
ok(strpos($shell, '<link') === false && strpos($shell, '<style') === false, 'no stylesheet: inline styles only');
ok(strpos($shell, 'privacy-policy') !== false, 'the footer keeps the privacy link');
ok(strpos(rv_h_facts(array()), 'table') === false, 'an empty facts block renders nothing at all');

// --- the transport still gets both parts ------------------------------------
$src = (string)file_get_contents(__DIR__ . '/pcm-review.php');
ok(preg_match('/rv_send_raw\(\$to, \$subject, dn_body\(.*dn_body_html\(/', $src) === 1, 'the record is sent as text AND HTML');
ok(preg_match('/rv_send_raw\(\$to, \$subject, rv_body\(.*rv_body_html\(/', $src) === 1, 'the review ask is sent as text AND HTML');
ok(strpos($src, "multipart/alternative") !== false, 'the transport still builds multipart/alternative');

echo "\n" . ($fails ? "$fails FAILED" : "all passed") . "\n";
exit($fails ? 1 : 0);
