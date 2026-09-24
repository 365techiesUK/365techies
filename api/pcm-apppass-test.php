<?php
/* Tests for pcm-apppass-lib.php. Run: php api/pcm-apppass-test.php */
require __DIR__ . '/pcm-apppass-lib.php';
$fails = 0;
function ok($cond, $what, $detail = '') { global $fails; echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n"; if (!$cond) $fails++; }

echo "-- the word list\n";
$w = apppass_words();
ok(count($w) === count(array_unique($w)), 'no word twice');
ok(count(array_filter($w, function ($x) { return !preg_match('/^[A-Z][a-z]{2,9}$/', $x); })) === 0, 'every word is one capitalised plain word, 3 to 10 letters');
ok(count($w) >= 40, 'enough words for two million combinations', (string)count($w));

echo "-- the generator\n";
$bad = 0; $same = 0; $seen = array();
for ($i = 0; $i < 500; $i++) {
    $p = apppass_generate();
    if (!apppass_ok($p)) $bad++;
    $parts = explode('-', $p);
    if ($parts[0] === $parts[1]) $same++;
    $seen[$p] = 1;
}
ok($bad === 0, '500 in a row have the Word-Word-NNN shape', (string)$bad);
ok($same === 0, 'the two words are never the same', (string)$same);
ok(count($seen) > 490, '500 draws are (almost) all different', (string)count($seen));

echo "-- the guard\n";
ok(apppass_ok('Beach-Pier-482'), 'accepts the shape');
ok(!apppass_ok('Beach-Beach-482'), 'rejects a repeated word');
ok(!apppass_ok('beach-pier-482'), 'rejects lower case');
ok(!apppass_ok('Beach-Pier-48'), 'rejects two digits');
ok(!apppass_ok('Beach-Pier-4821'), 'rejects four digits');
ok(!apppass_ok('Hello-World-123'), 'rejects words outside the list');
ok(!apppass_ok('password'), 'rejects anything else');

echo "\n" . ($fails ? $fails . " FAILED\n" : "all passed\n");
exit($fails ? 1 : 0);
