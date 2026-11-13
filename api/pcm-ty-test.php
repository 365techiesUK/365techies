<?php
/* CLI tests for the payment thank-you (ty_* in pcm-review.php, 3 Nov 2026). Sends nothing: the queue is a temp file
   and the mail transport is never reached by the pure checks; the one ty_send run has no SMTP config and no local
   mail server, so it fails and must release its provisional review stamp.
   Run: php api/pcm-ty-test.php   (optional: a path to write the two HTML previews into) */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('RV_LIB', 1);
require __DIR__ . '/pcm-review.php';
$RV_Q = tempnam(sys_get_temp_dir(), 'tyq');
@unlink($RV_Q);
$pass = 0; $fail = 0;
function t($ok, $what) { global $pass, $fail; if ($ok) { $pass++; } else { $fail++; echo "FAIL: $what\n"; } }

$ts = strtotime('2026-11-03 12:00');
$nums = array('4905/816');
$withAsk = ty_body_html('Margaret', 60, $nums, $ts, true, true, 'm@example.com', 'salt');
$noAsk   = ty_body_html('Margaret', 60, $nums, $ts, false, false, 'm@example.com', 'salt');
$txtAsk  = ty_body('Margaret', 60, $nums, $ts, true, true, 'm@example.com', 'salt');
$txtNo   = ty_body('Margaret', 60, $nums, $ts, false, false, 'm@example.com', 'salt');

t(ty_subject($nums) === 'Thank you - payment received (invoice 4905/816)', 'subject names the invoice');
t(ty_subject(array()) === 'Thank you - payment received', 'subject with no invoice');
foreach (array('html' => $withAsk, 'text' => $txtAsk) as $k => $b) {
    t(strpos($b, $RV_REVIEW_URL) !== false || strpos($b, htmlspecialchars($RV_REVIEW_URL)) !== false, "$k: review link when asked");
    t(strpos($b, '60.00') !== false, "$k: amount");
    t(strpos($b, '4905/816') !== false, "$k: invoice number");
    t(strpos($b, 'Tuesday 3 November 2026') !== false, "$k: payment date");
    t(strpos($b, 'receipt is attached') !== false, "$k: says the receipt is attached");
    t(strpos($b, 'pcm-review.php?u=') !== false, "$k: one-click unsubscribe with the ask");
    // the law and Google's rules, as in rv_body: no gating, no incentive, no referral offer next to a review ask
    t(stripos($b, 'if you') === false || stripos($b, 'if you have any questions') !== false, "$k: no 'if you are happy' steering");
    t(stripos($b, 'month free') === false && stripos($b, 'free') === false, "$k: no offer of any kind beside the ask");
    t(stripos($b, 'happy') === false, "$k: no happy/unhappy steering");
    t(strpos($b, '01202') !== false && strpos($b, '07520') !== false, "$k: phone and text numbers");
    t(stripos($b, 'Becky') === false && strpos($b, 'David') !== false, "$k: signed David & Steve");
}
// the ask: unconditional, and the "if anything was not right" line comes AFTER it
t(strpos($txtAsk, 'review?') < strpos($txtAsk, "anything wasn't right"), 'text: recovery line after the ask');
t(strpos($withAsk, 'Leave a Google review') < strpos($withAsk, 'anything was not right'), 'html: recovery line after the ask');
foreach (array('html' => $noAsk, 'text' => $txtNo) as $k => $b) {
    t(strpos($b, 'writereview') === false && stripos($b, 'Google review') === false, "$k: no review ask when not allowed");
    t(strpos($b, 'pcm-review.php?u=') === false, "$k: no unsubscribe line without an ask");
    t(strpos($b, 'receipt is attached') === false, "$k: no attachment line without one");
    t(strpos($b, '60.00') !== false, "$k: still the thank-you");
}
t(substr_count($withAsk, 'bgcolor="#1d97e3" style="background-color:#1d97e3;border-radius:9px') === 1, 'one button at most');

// 13 Nov 2026 (owner): 30 days' aftercare, "anything else", LinkedIn - in every thank-you
foreach (array('html ask' => $withAsk, 'html' => $noAsk, 'text ask' => $txtAsk, 'text' => $txtNo) as $k => $b) {
    t(strpos($b, 'in the next 30 days') !== false && (strpos($b, "that's included") !== false || strpos($b, 'that is included') !== false), "$k: the job's 30 days' aftercare, included");
    t(strpos($b, 'anything else we can help with') !== false, "$k: anything else, just let us know");
    t(strpos($b, 'https://www.linkedin.com/company/365techies/') !== false, "$k: LinkedIn");
    t(stripos($b, 'PC Manager') === false && strpos($b, 'XP99J1CFV8W876') === false, "$k: no check-up offer unless asked for");
}
// the check-up offer (a new customer, no service on the job): the app on the Store, for Windows, and no review ask beside it
$offH = ty_body_html('Margaret', 60, $nums, $ts, false, true, 'm@example.com', 'salt', true);
$offT = ty_body('Margaret', 60, $nums, $ts, false, true, 'm@example.com', 'salt', true);
foreach (array('html' => $offH, 'text' => $offT) as $k => $b) {
    $flat = preg_replace('/\s+/', ' ', $b);   // the text version wraps its lines
    t(strpos($b, 'https://apps.microsoft.com/detail/XP99J1CFV8W876') !== false && strpos($flat, 'Windows computer') !== false && strpos($flat, 'full service') !== false && strpos($flat, 'backups') !== false,
      "$k offer: 365 PC Manager on the Microsoft Store, a full service for their Windows computer, backups checked");
    t(strpos($b, 'writereview') === false && stripos($b, 'Google review') === false && strpos($b, 'pcm-review.php?u=') === false, "$k offer: no review ask, no unsubscribe line");
    t(strpos($b, '60.00') !== false && strpos($b, 'in the next 30 days') !== false, "$k offer: still the thank-you, with the aftercare");
}
t(strpos($offH, 'Get 365 PC Manager') !== false && substr_count($offH, 'bgcolor="#1d97e3" style="background-color:#1d97e3;border-radius:9px') === 1, 'html offer: its one button');
$both = ty_body_html('Margaret', 60, $nums, $ts, true, true, 'm@example.com', 'salt', true);
t(strpos($both, 'Leave a Google review') !== false && stripos($both, 'PC Manager') === false, 'asked for an offer AND a review: the review rules win, the offer is left out');
// escaping
$x = ty_body_html('<script>', 60, array('<b>1</b>'), $ts, false, false);
t(strpos($x, '<script>') === false && strpos($x, '<b>1</b>') === false, 'name and invoice number escaped');
t(rv_first('12345') === 'there', 'no name -> there');

// the MIME: text + HTML + the PDF, base64, under its own type
list($ct, $pl) = rv_mime("hello", 'receipt-4905-816.pdf', "%PDF-1.4 fake", '<p>hi</p>', 'application/pdf');
t(strpos($ct, 'multipart/mixed') !== false, 'mixed with a file');
t(strpos($pl, 'multipart/alternative') !== false, 'alternative inside');
t(strpos($pl, 'Content-Type: application/pdf; name="receipt-4905-816.pdf"') !== false, 'pdf part typed');
t(strpos($pl, base64_encode('%PDF-1.4 fake')) !== false, 'pdf base64');
t(strpos($pl, '%PDF-1.4 fake') === false, 'pdf never raw');
t(strpos($pl, 'text/calendar') === false, 'not a calendar');
t(strpos($pl, "Content-Type: text/plain; charset=UTF-8\r\n\r\nhello") !== false, 'text part first');
list($ct2, $pl2) = rv_mime("hello", 'a.pdf', "%PDF", '', 'application/pdf');
t(strpos($pl2, 'multipart/alternative') === false && strpos($pl2, 'application/pdf') !== false, 'text-only + pdf');
list($ct3, $pl3) = rv_mime("hello", 'x.ics', "BEGIN:VCALENDAR", '<p>hi</p>');
t(strpos($pl3, 'text/calendar') !== false && strpos($pl3, 'BEGIN:VCALENDAR') !== false, 'calendar path unchanged');
list(, $pl4) = rv_mime("hello", 'a b"c.pdf', "%PDF", '', 'application/pdf');
t(strpos($pl4, 'filename="abc.pdf"') !== false, 'file name cleaned');

// ty_send: who may be asked (the queue rules), and a failed send releases the provisional stamp
list($lk, $q) = rvq_open();
$q['optout'][sha1('no@example.com')] = time();
$q['reviewed'][sha1('done@example.com')] = time();
$q['last'][sha1('recent@example.com')] = time() - 86400 * 30;
$q['last'][sha1('old@example.com')] = time() - 86400 * 400;
rvq_save($q); rvq_close($lk);
$sent = array();
foreach (array('no@example.com', 'done@example.com', 'recent@example.com', 'old@example.com', 'new@example.com') as $em) {
    list($ok, $asked) = ty_send($em, 'Test', 10, array('1'), $ts);
    $sent[$em] = $ok;
}
list($lk, $q) = rvq_open(); rvq_close($lk);
t((int)$q['last'][sha1('recent@example.com')] < time() - 86400 * 29, 'recent: stamp untouched');
if (!$sent['new@example.com']) {
    t(!isset($q['last'][sha1('new@example.com')]), 'failed send released the provisional stamp');
    t((int)$q['last'][sha1('old@example.com')] < time() - 86400 * 399, 'failed send restored nothing it did not own');
}
list($ok) = ty_send('not-an-email', 'x', 1, array(), 0);
t($ok === false, 'bad address refused');
// 13 Nov 2026: the check-up offer never comes with a review ask, and never touches (stamps) the queue
list($ok, $asked) = ty_send('offer.new@example.com', 'Test', 10, array('1'), $ts, '', '', true);
list($lk, $q) = rvq_open(); rvq_close($lk);
t($asked === false && !isset($q['last'][sha1('offer.new@example.com')]), 'with the check-up offer: no review ask, no stamp in the queue (they can still be asked later)');
$TY_ASK = false;
@unlink($RV_Q); @unlink($RV_Q . '.lock');

if (!empty($argv[1])) {
    file_put_contents($argv[1] . '/ty-with-ask.html', $withAsk);
    file_put_contents($argv[1] . '/ty-no-ask.html', $noAsk);
    file_put_contents($argv[1] . '/ty-with-ask.txt', $txtAsk);
}
echo "pcm-ty-test: $pass passed, $fail failed\n";
exit($fail ? 1 : 0);
