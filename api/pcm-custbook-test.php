<?php
/*
 * The customer book (pcm-custbook-lib.php, 6 Oct 2026). Run:
 *   C:\tools\php\php.exe -d extension=mbstring api/pcm-custbook-test.php
 * Pure checks on made-up customers: no store, no SimplyBook, no pcm-data.json. The store test uses a temp file.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
require __DIR__ . '/pcm-custbook-lib.php';

$fails = 0;
function ok($c, $what, $detail = '') { global $fails; echo ($c ? "  PASS  " : "  FAIL  ") . $what . ($c ? '' : "  [" . $detail . "]") . "\n"; if (!$c) $fails++; }

// ---- made-up sources
$JOBS = array(
    // Jules, a business: two jobs, the landline + mobile on the card, the company on the newer one
    array('id' => '1790000000-000100', 'ts' => 1790000000, 'name' => 'Jules and Juliette', 'email' => 'jake@firstchoice.example', 'phone' => '01202096096',
          'mobile' => '07595691892', 'addr' => 'Unit 1, Avon Trading Park, Christchurch BH23 2BT', 'postcode' => 'BH23 2BT', 'desc' => 'Set up the new Vostro', 'status' => 'quoted', 'amount' => 0),
    array('id' => '1790500000-000100', 'ts' => 1790500000, 'name' => 'Jules', 'company' => 'First Choice Detailing', 'email' => '', 'phone' => '07595 691892',
          'addr' => '', 'postcode' => '', 'desc' => 'Printer offline', 'status' => 'done', 'amount' => 60, 'invoice_no' => '4911'),
    // a different person with the same surname and nothing else in common
    array('id' => '1790100000-000100', 'ts' => 1790100000, 'name' => 'Jules Smith', 'email' => 'jsmith@example.com', 'phone' => '01425 111222', 'addr' => '1 High St, Ringwood', 'postcode' => 'BH24 1AA', 'desc' => 'Wi-Fi', 'status' => 'quoted', 'amount' => 0),
);
$PCM = array(
    'SBAAAA111111' => array('name' => 'Rebecca Dismore', 'email' => 'rebecca@example.com', 'tier' => 'free', 'sb_client_id' => 501, 'mobile' => '+447700900123',
                            'addr' => array('line1' => 'Hillside', 'line2' => 'Gotham', 'city' => 'Cranborne', 'postcode' => 'bh215qy'),
                            'machines' => array('m1' => array('seen' => '2026-10-06 10:20'))),
    'SBBBBB222222' => array('name' => 'Old merged', 'email' => 'rebecca@example.com', 'merged_into' => 'SBAAAA111111'),
);
$SB = array(array('id' => 501, 'name' => 'Rebecca Dismore', 'email' => 'rebecca@example.com', 'phone' => '+441202813527', 'address1' => 'Hillside, Gotham', 'city' => 'Cranborne', 'zip' => 'BH21 5QY'),
            array('id' => 777, 'name' => 'Booking Only', 'email' => 'bonly@example.com', 'phone' => '07000 111222'));
$rows = array_merge(cb_rows_from_jobs($JOBS), cb_rows_from_pcm($PCM), cb_rows_from_sb($SB));

echo "A  tidying\n";
ok(cb_postcode('bh215qy') === 'BH21 5QY' && cb_postcode(' bh8 9ng ') === 'BH8 9NG' && cb_postcode('X1') === 'X1', 'postcodes tidied, odd ones kept', cb_postcode('bh215qy'));
ok(cb_addr_strip('Unit 1, Avon Trading Park, Christchurch BH23 2BT', 'BH23 2BT') === 'Unit 1, Avon Trading Park, Christchurch', 'the postcode comes off the job\'s address line');
ok(cb_phone_key('07595 691892') === '+447595691892' && cb_phone_key('+44 7595 691892') === '+447595691892' && cb_phone_key('ext 12') === '', 'numbers keyed as E.164; junk never keys');
ok(cb_email(' Jake@FirstChoice.example ') === 'jake@firstchoice.example' && cb_email('nope') === '', 'emails lower-cased; a non-email is blank');

echo "B  the same person, folded together\n";
$cl = cb_cluster($rows);
$who = function ($nm) use ($rows, $cl) { foreach ($cl as $g) foreach ($g as $i) if ($rows[$i]['name'] === $nm) return $g; return array(); };
$jules = $who('Jules and Juliette');
ok(count($jules) === 2, 'Jules\'s two jobs join on the mobile number, written two ways', json_encode($jules));
ok(count($who('Jules Smith')) === 1, 'Jules Smith, who shares nothing but a word of the name, stays apart');
$reb = $who('Rebecca Dismore');
ok(count($reb) === 2, 'Rebecca: the PC Manager record and the SimplyBook client join (client 501 and the email); the merged record is left out', json_encode($reb));
$p = cb_person($rows, $jules);
ok($p['fields']['company'] === 'First Choice Detailing' && $p['fields']['name'] === 'Jules', 'the newest job wins: its name, and the company only it carries', json_encode($p['fields']));
ok($p['fields']['email'] === 'jake@firstchoice.example' && $p['fields']['phone'] === '01202 096096' && $p['fields']['mobile'] === '07595 691892', 'a blank on the newest job falls back to the older one; numbers shown the UK way', json_encode($p['fields']));
ok($p['fields']['address'] === 'Unit 1, Avon Trading Park, Christchurch' && $p['fields']['postcode'] === 'BH23 2BT', 'address and postcode apart');
ok($p['jobs'] === 2 && !$p['booked'] && $p['pcm'] === '' && in_array('Jules and Juliette', $p['aka'], true), 'two jobs, not booked, no app; the other name is kept as "also known as"', json_encode($p));
$pr = cb_person($rows, $reb);
ok($pr['fields']['mobile'] === '07700 900123' && $pr['fields']['phone'] === '01202 813527' && $pr['from']['mobile'] === 'pcm' && $pr['from']['phone'] === 'sb', 'Rebecca: her own portal mobile, and the booking\'s number as the landline', json_encode(array($pr['fields'], $pr['from'])));
ok($pr['fields']['address'] === 'Hillside, Gotham, Cranborne' && $pr['fields']['postcode'] === 'BH21 5QY' && $pr['from']['address'] === 'pcm', 'the address she typed in her portal beats the booking\'s', json_encode($pr['fields']));
ok($pr['sb'] === 501 && $pr['booked'] && $pr['pcm'] === 'free', 'her SimplyBook client and her PC Manager plan', json_encode($pr));
ok(strpos(json_encode($pr), 'SBAAAA111111') === false, 'never the licence key, in any field');
ok($pr['ref'] === 's:501' && $p['ref'] === 'e:jake@firstchoice.example', 'the handle: the SimplyBook client, else the email', $pr['ref'] . ' ' . $p['ref']);
ok(cb_cluster_for($rows, $p['ref']) == $jules && cb_cluster_for($rows, 'e:nobody@example.com') === null, 'a handle finds its person again; an unknown one finds nobody');

echo "C  search\n";
$names = function ($res) { return array_map(function ($x) { return $x['fields']['name']; }, $res); };
ok($names(cb_search($rows, 'first choice')) === array('Jules'), 'by company (words in any order)', json_encode($names(cb_search($rows, 'first choice'))));
ok($names(cb_search($rows, '07595691892')) === array('Jules') && $names(cb_search($rows, '+44 7595 691892')) === array('Jules') && $names(cb_search($rows, '691892')) === array('Jules'), 'by mobile, typed any way, or the end of it');
ok(count(cb_search($rows, 'jules')) === 2, 'a shared first name: both customers, each once', json_encode($names(cb_search($rows, 'jules'))));
ok($names(cb_search($rows, 'bh215qy')) === array('Rebecca Dismore') && $names(cb_search($rows, 'BH21 5QY')) === array('Rebecca Dismore'), 'by postcode, with or without the space');
ok($names(cb_search($rows, 'bonly@example.com')) === array('Booking Only'), 'a customer who only ever booked');
ok(cb_search($rows, 'zzzz') === array() && cb_search($rows, '') === array(), 'nothing found = nothing');

echo "D  editing: laid over the sources, never into them\n";
list($v, $e) = cb_read(array('name' => 'Jules', 'company' => 'First Choice Detailing Ltd', 'email' => 'jake@firstchoice.example', 'phone' => '01202 096096',
    'mobile' => '07595 691892', 'address' => 'Unit 1, Avon Trading Park, Christchurch', 'postcode' => 'bh23 2bt', 'website' => 'https://www.firstchoice.example/', 'note' => "Ask for Jake\nBack door"));
ok(!$e && $v['postcode'] === 'BH23 2BT' && $v['website'] === 'www.firstchoice.example' && $v['mobile'] === '+447595691892' && $v['note'] === "Ask for Jake\nBack door", 'read: tidied, numbers stored as the inbox matches them, the note keeps its lines', json_encode($v));
list($book, $id, $ch) = cb_save_into(array(), $rows, $jules, $v, 'Steve', 1791000000);
ok($id !== '' && $id[0] === 'C' && $ch === array('company', 'website', 'note'), 'only what changed is laid over: company, website, note', json_encode($ch));
$rec = $book['people'][$id];
ok($rec['company'] === 'First Choice Detailing Ltd' && $rec['mobile'] === '' && $rec['name'] === '', 'unchanged fields stay the sources\' (blank in the book)', json_encode($rec));
ok(in_array('+447595691892', $rec['links']['phones'], true) && in_array('jake@firstchoice.example', $rec['links']['emails'], true) && count($rec['links']['jobs']) === 2, 'the record remembers every number, email and job it joined', json_encode($rec['links']));
ok($rec['history'][0]['by'] === 'Steve' && $rec['history'][0]['fields'] === $ch, 'who changed what, kept');
$rows2 = array_merge($rows, cb_rows_from_book($book));
$g2 = cb_cluster_for($rows2, 'b:' . $id);
$p2 = cb_person($rows2, $g2);
ok($p2['fields']['company'] === 'First Choice Detailing Ltd' && $p2['from']['company'] === 'book' && $p2['fields']['mobile'] === '07595 691892' && $p2['edited'] && $p2['ref'] === 'b:' . $id, 'shown: the book\'s company, the sources\' mobile; the handle is now the book record', json_encode($p2));
// a new job brings a new landline: still shows, because the book never froze the landline
$rows3 = array_merge(cb_rows_from_jobs(array_merge($JOBS, array(array('id' => '1791500000-000100', 'ts' => 1791500000, 'name' => 'Jules', 'email' => 'jake@firstchoice.example', 'phone' => '01202 555000', 'desc' => 'x', 'status' => 'quoted', 'amount' => 0)))), cb_rows_from_pcm($PCM), cb_rows_from_sb($SB), cb_rows_from_book($book));
$p3 = cb_person($rows3, cb_cluster_for($rows3, 'b:' . $id));
ok($p3['fields']['phone'] === '01202 555000' && $p3['jobs'] === 3, 'a later job\'s new landline still comes through', json_encode($p3['fields']));
// clearing a field a source still has: it stays clear
list($v4) = cb_read(array_merge($p2['fields'], array('mobile' => '')));
list($book4, $id4, $ch4) = cb_save_into($book, $rows2, $g2, $v4, 'David', 1791100000);
$rows4 = array_merge($rows, cb_rows_from_book($book4));
$p4 = cb_person($rows4, cb_cluster_for($rows4, 'b:' . $id));
ok($id4 === $id && $ch4 === array('mobile') && $p4['fields']['mobile'] === '' && in_array('mobile', $book4['people'][$id]['clear'], true), 'a mobile cleared on purpose stays cleared (the job still has it)', json_encode(array($ch4, $p4['fields']['mobile'])));
ok(cb_cluster_for($rows4, 'b:' . $id) == cb_cluster_for($rows4, 'e:jake@firstchoice.example'), 'still the same person after the clear: the links keep the jobs joined');
// typing it back un-clears it
list($v5) = cb_read(array_merge($p4['fields'], array('mobile' => '07595 691892')));
list($book5) = cb_save_into($book4, $rows4, cb_cluster_for($rows4, 'b:' . $id), $v5, 'David', 1791200000);
ok(!in_array('mobile', $book5['people'][$id]['clear'], true) && $book5['people'][$id]['mobile'] === '+447595691892', 'typing it back un-clears it');
// a corrected email still finds the old jobs
list($v6) = cb_read(array_merge($p2['fields'], array('email' => 'accounts@firstchoice.example')));
list($book6) = cb_save_into($book, $rows2, $g2, $v6, 'Steve', 1791300000);
$rows6 = array_merge($rows, cb_rows_from_book($book6));
$p6 = cb_person($rows6, cb_cluster_for($rows6, 'b:' . $id));
ok($p6['fields']['email'] === 'accounts@firstchoice.example' && $p6['jobs'] === 2 && cb_search($rows6, 'accounts@firstchoice')[0]['ref'] === 'b:' . $id, 'a corrected email: shown, searchable, and the old jobs still belong', json_encode($p6['fields']));
// saving with nothing changed makes no record
list($b7, $id7, $ch7) = cb_save_into(array(), $rows, $who('Jules Smith'), cb_read(cb_person($rows, $who('Jules Smith'))['fields'])[0], 'Steve', 1791400000);
ok($id7 === '' && $ch7 === array() && empty($b7['people']), 'Save with nothing changed: no record made', json_encode($b7));
// two book records for one person fold into the newest
$bb = array('people' => array('C1' => array('name' => '', 'company' => 'Old Co', 'updated' => 10, 'links' => array('emails' => array('jsmith@example.com'))),
                              'C2' => array('name' => '', 'note' => 'newer', 'updated' => 20, 'links' => array('phones' => array('+441425111222')))));
$rb = array_merge($rows, cb_rows_from_book($bb));
$gb = cb_cluster_for($rb, 'b:C1');
ok($gb == cb_cluster_for($rb, 'b:C2'), 'two book records for Jules Smith are one person');
list($bb2, $idb) = cb_save_into($bb, $rb, $gb, cb_read(array_merge(cb_person($rb, $gb)['fields'], array('note' => 'merged')))[0], 'Steve', 30);
ok($idb === 'C2' && $bb2['people']['C1']['merged_into'] === 'C2' && in_array('jsmith@example.com', $bb2['people']['C2']['links']['emails'], true), 'saved into the newest; the other folded in, its links kept', json_encode($bb2));
list(, $er) = cb_read(array('name' => '', 'company' => '', 'email' => 'x@', 'mobile' => '0770', 'website' => 'not a site'));
ok(isset($er['name'], $er['email'], $er['mobile'], $er['website']), 'checks: a name or a company, a real email, a long-enough number, a website', json_encode($er));
list($vc, $ec) = cb_read(array('name' => '', 'company' => 'Acme Ltd'));
ok(!$ec, 'a company with no person\'s name is enough');

echo "E  the store and the texts inbox\n";
$tmp = sys_get_temp_dir() . '/cbtest-' . getmypid() . '.json';
$r = cb_book_locked(function ($d) use ($book) { return array('ok' => true, 'data' => $book); }, $tmp);
ok(!empty($r['ok']) && cb_book_read($tmp)['people'][$id]['company'] === 'First Choice Detailing Ltd', 'written under the lock and read back');
list($vn) = cb_read(array_merge($p2['fields'], array('name' => 'Jake Turner')));
list($bn) = cb_save_into($book, $rows2, $g2, $vn, 'Steve', 1791600000);
cb_book_locked(function ($d) use ($bn) { return array('ok' => true, 'data' => $bn); }, $tmp);
$nm = cb_book_names($tmp);
ok(isset($nm['+447595691892']) && $nm['+447595691892']['name'] === 'Jake Turner' && $nm['+447595691892']['src'] === 'book', 'a name staff set reaches the texts inbox, keyed the way it matches numbers', json_encode($nm));
@unlink($tmp); @unlink($tmp . '.lock');

echo "F  at source level\n";
$L = (string)file_get_contents(__DIR__ . '/pcm-custbook-lib.php');
ok(strpos($L, '?' . '>') === false, 'no closing tag in the library');
ok(strpos($L, 'sb_adm(') === false && strpos($L, 'editClient') === false, 'the book never writes to SimplyBook');
$B = (string)file_get_contents(__DIR__ . '/pcm-booking.php');
foreach (array('custfind', 'custget', 'custsave') as $a) {
    $at = strpos($B, "\$action === '" . $a . "'");
    ok($at !== false && strpos(substr($B, $at, 400), 'need_staff();') !== false, $a . ': staff only, the session check first');
}
$HT = (string)file_get_contents(__DIR__ . '/../.htaccess');
ok(preg_match('/\^\(pcm-data\|[^"]*pcm-custbook[^"]*\)\\\\\.json\(\\\\\.\.\*\)\?\$/', $HT) === 1, 'the store (and its lock and temp files) are denied over HTTP');
ok(strpos($HT, 'pcm-custbook-(lib|test)') !== false, 'the library and the tests are denied over HTTP');
$C = (string)file_get_contents(__DIR__ . '/comms-api.php');
ok(strpos($C, 'cb_book_names()') !== false, 'the texts inbox reads the names staff set');

echo "\n" . ($fails ? "pcm-custbook-test: $fails FAILED\n" : "pcm-custbook-test: all passed\n");
exit($fails ? 1 : 0);
