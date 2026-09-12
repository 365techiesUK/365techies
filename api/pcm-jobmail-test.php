<?php
/**
 * "Job done" email - test suite.   Run:  php -d extension=mbstring api/pcm-jobmail-test.php
 * Pins: the first-name rule, line cleaning and caps, the prices (must equal the plan pages), the home and
 * business variants, the amount line, escaping, and that no review ask or phone number leaks into the subject.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }
require __DIR__ . '/pcm-jobmail-lib.php';
$fails = 0;
function ok($cond, $what, $detail = '') { global $fails; echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n"; if (!$cond) $fails++; }

echo "-- names and lines\n";
ok(jd_first('Sarah Jones') === 'Sarah' && jd_first('Mrs Wilson') === 'Mrs Wilson' && jd_first('') === 'there' && jd_first('  dave  ') === 'dave', 'first name rule');
$l = jd_lines("- Restarted the print spooler\n\n* <b>Reinstalled</b> the HP driver  \n• Set the printer as default\n" . str_repeat("x\n", 20));
ok(count($l) === 8 && $l[0] === 'Restarted the print spooler' && $l[1] === 'Reinstalled the HP driver' && $l[2] === 'Set the printer as default', 'bullets cleaned, tags stripped, capped at 8', json_encode($l));
ok(jd_lines(array('one', ' two ', ''))[1] === 'two', 'array input works');

echo "-- the home email\n";
list($s, $t, $h) = jd_build('Sarah Jones', "Restarted the print spooler\nReinstalled the HP driver", 45.00, 'home', 1757700000);
ok($s === 'Your computer is sorted - here is what we did' && strpos($s, '01202') === false, 'subject, no phone number in it', $s);
ok(strpos($t, 'Hi Sarah,') === 0 && strpos($t, '- Restarted the print spooler') !== false, 'text greets by first name and lists the work');
ok(strpos($t, 'Agreed price: £45.00') !== false && strpos($h, '&pound;45.00') !== false, 'amount line in both parts');
ok(strpos($t, '£18.25 a month per computer') !== false && strpos($h, '&pound;18.25 a month per computer') !== false && strpos($t, '£23.10') !== false, 'home prices match the plan pages');
ok(strpos($t, 'https://365techies.co.uk/monthly-it-support/') !== false && strpos($h, 'href="https://365techies.co.uk/monthly-it-support/"') !== false, 'home plans link');
ok(strpos($h, 'href="https://365techies.co.uk/free-pc-health-check/"') !== false, 'free app link');
ok(stripos($t, 'review') === false && stripos($h, 'review') === false, 'no review ask (that is a separate system)');
ok(strpos($t, 'cancel whenever you like') !== false, 'rolling monthly, cancel any time');

echo "-- the business email\n";
list($s2, $t2, $h2) = jd_build('Acme Ltd', array('Recovered the shared folder permissions'), 0, 'business');
ok(strpos($t2, 'start at £24.38 a month per computer') !== false && strpos($h2, '&pound;24.38 a month per computer') !== false, 'business price', substr($t2, strpos($t2, 'Business plans'), 60));
ok(strpos($t2, '/business-it-support-plans/') !== false && strpos($h2, 'insurer or bank') !== false, 'business link + the insurer/bank line');
ok(strpos($t2, 'Agreed price') === false && strpos($h2, 'Agreed price') === false, 'no amount line when none given');

echo "-- escaping\n";
list($s3, $t3, $h3) = jd_build('<script>alert(1)</script> Bob', array('Fixed "the" <thing> & more'), 0, 'home');
ok(strpos($h3, '<script>') === false && strpos($h3, '<thing>') === false && strpos($h3, '&quot;the&quot; &amp; more') !== false, 'tags stripped and the rest HTML-escaped in the html part', substr($h3, strpos($h3, 'Fixed'), 60));
ok(strpos($t3, 'Fixed "the"') !== false && strpos($t3, '<thing>') === false, 'tags stripped from the text lines');

echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
