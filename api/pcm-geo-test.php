<?php
/**
 * "Where our customers are" - test suite.   Run:  php api/pcm-geo-test.php
 * Pins: postcode parsing (the only clever part), the town labels for our core
 * districts, the plan/other split and the coverage counts, that sign-in identities
 * never inflate the totals, that NOTHING personal is in the result, and the
 * endpoint's source-level guarantees (staff gate first, counts only, no store).
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }
require __DIR__ . '/pcm-geo-lib.php';
$fails = 0;
function ok($cond, $what, $detail = '') { global $fails; echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n"; if (!$cond) $fails++; }

echo "-- postcode parsing\n";
ok(geo_outward('BH21 1TH') === 'BH21' && geo_outward('bh211th') === 'BH21' && geo_outward(' BH21  1TH ') === 'BH21', 'full postcodes, any case or spacing');
ok(geo_outward('BH2 6DF') === 'BH2' && geo_outward('DT11 7AA') === 'DT11' && geo_outward('SO41 8ZZ') === 'SO41', 'one- and two-digit districts');
ok(geo_outward('SW1A 1AA') === 'SW1A' && geo_outward('EC1A 1BB') === 'EC1A', 'London-style districts with a letter');
ok(geo_outward('BH21') === 'BH21' && geo_outward('bh21') === 'BH21', 'an outward code on its own is accepted');
ok(geo_outward('') === '' && geo_outward('unknown') === '' && geo_outward('12345') === '' && geo_outward('BFPO 123') === '', 'blank, words, numbers and BFPO give nothing');
ok(geo_area_of('BH21') === 'BH' && geo_area_of('DT11') === 'DT' && geo_area_of('SO41') === 'SO', 'postcode area letters');

echo "-- labels\n";
ok(geo_label('BH21') === 'Wimborne / Colehill / Corfe Mullen', 'BH21 is Wimborne');
ok(geo_label('BH31') === 'Verwood' && geo_label('BH23') === 'Christchurch / Highcliffe / Burton' && geo_label('BH10') === 'Kinson / Northbourne / Ensbury Park', 'the towns we work in');
ok(geo_label('DT11') === 'Blandford Forum' && geo_label('SP7') === 'Shaftesbury' && geo_label('SO41') === 'Lymington / Milford on Sea', 'west Dorset and the Forest edges');
ok(geo_label('BH99') === 'Bournemouth, Poole and east Dorset', 'an unlisted BH district falls back to the area');
ok(geo_label('SW1A') === 'Outside our usual area', 'somewhere else is said plainly');

echo "-- the tally\n";
$cust = array(
    'k1' => array('name' => 'Gordon Snook', 'email' => 'g@example.com', 'tier' => 'oneoff', 'addr' => array('postcode' => 'BH21 1TH')),
    'k2' => array('name' => 'A Plan Customer', 'tier' => 'pro', 'addr' => array('postcode' => 'bh21 3al')),
    'k3' => array('name' => 'Another', 'tier' => 'pro', 'addr' => array('postcode' => 'BH31 6AE')),
    'k4' => array('name' => 'Free app user', 'tier' => 'free'),                                   // no address at all
    'k5' => array('name' => 'Odd address', 'tier' => 'free', 'addr' => array('postcode' => 'ask reception')),
    'k6' => array('name' => 'Portal sign-in', 'via' => 'signin', 'addr' => array('postcode' => 'BH1 1AA')),
    'k7' => array('name' => 'Blank postcode', 'tier' => 'pro', 'addr' => array('postcode' => '   ')),
    'k8' => 'not even an array',
);
$t = geo_tally($cust);
ok($t['customers'] === 6, 'six real customer records (sign-in skipped, junk skipped)', (string)$t['customers']);
ok($t['signin_skipped'] === 1, 'the sign-in identity is counted as skipped, not as a customer');
ok($t['with_postcode'] === 3 && $t['without_postcode'] === 2 && $t['unreadable_postcode'] === 1, 'coverage: 3 with, 2 without, 1 unreadable', json_encode(array($t['with_postcode'], $t['without_postcode'], $t['unreadable_postcode'])));
ok($t['on_plan'] === 3, 'plan customers counted whether or not they have a postcode');
ok(count($t['districts']) === 2 && $t['districts'][0]['district'] === 'BH21' && $t['districts'][0]['total'] === 2, 'BH21 first with two');
ok($t['districts'][0]['plan'] === 1 && $t['districts'][0]['other'] === 1, 'BH21 split one plan, one other');
ok($t['districts'][0]['area'] === 'Wimborne / Colehill / Corfe Mullen' && $t['districts'][1]['district'] === 'BH31', 'labels ride along; BH31 second');
ok(count($t['areas']) === 1 && $t['areas'][0]['area'] === 'BH' && $t['areas'][0]['total'] === 3, 'the area view rolls both up to BH');
$json = json_encode($t);
ok(strpos($json, 'Gordon') === false && strpos($json, 'example.com') === false && strpos($json, '1TH') === false && strpos($json, '6AE') === false,
   'no name, email or inward code anywhere in the result');
$e = geo_tally(array());
ok($e['customers'] === 0 && $e['districts'] === array() && $e['areas'] === array(), 'an empty store tallies to zeros, not errors');

echo "-- the endpoint's guarantees (source level)\n";
$SRC = (string)file_get_contents(__DIR__ . '/pcm-geo.php');
ok(strpos($SRC, '?' . '>') === false, 'no closing tag');
ok(strpos($SRC, 'need_staff();') !== false && strpos($SRC, 'need_staff();') < strpos($SRC, "if (\$action === 'tally')"), 'the staff gate runs before the action');
ok(!preg_match("/\\['(name|email|tel|mobile|line1|line2)'\\]/", $SRC), 'the endpoint never touches a name, email, phone or street');
ok(!preg_match('/file_put_contents|fopen\(|rename\(/', $SRC), 'nothing is written - no store, no cache, no log');
ok(strpos($SRC, "fail('bad_action')") !== false, 'an unknown action is refused');
$ht = (string)file_get_contents(__DIR__ . '/../.htaccess');
ok(preg_match('/<FilesMatch "[^"]*pcm-geo[^"]*">/', $ht, $mm) === 1, 'a deny rule exists for the geo files');
$deny = preg_match('/<FilesMatch "(\^\([^"]*pcm-geo[^"]*)">/', $ht, $m2) ? $m2[1] : '';
ok($deny !== '' && preg_match('#' . $deny . '#', 'pcm-geo-lib.php') === 1 && preg_match('#' . $deny . '#', 'pcm-geo-test.php') === 1, 'the library and the test file are denied', $deny);
ok($deny !== '' && preg_match('#' . $deny . '#', 'pcm-geo.php') !== 1, 'the endpoint itself stays served');

echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
