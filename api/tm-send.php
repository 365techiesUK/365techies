<?php
/**
 * Textmagic send endpoint — STAFF ONLY, human-initiated.
 *
 * WHY THIS IS LOCKED DOWN: every send costs money and lands on a real person's
 * phone. There is deliberately no public/visitor path to this file. It requires
 * the same admin session as pcm-admin.php, so a text can only ever be sent by a
 * signed-in member of staff who chose to send it.
 *
 * CONSENT (UK PECR): texting a customer about a job they booked, or replying to
 * an enquiry, is a service message and fine. Bulk or promotional texting is NOT
 * - that needs prior consent and an opt-out, and must not be bolted onto this
 * endpoint without checking the rules first.
 *
 *   ?action=balance          - check credentials + credit (sends nothing)
 *   POST action=send         - to, text, ref
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

session_name('pcmadm');
session_set_cookie_params(array('httponly' => true, 'samesite' => 'Lax',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')));
@session_start();

/* the ONLY gate: an authenticated pcm-admin session */
if (empty($_SESSION['pcm_ok'])) {
    http_response_code(403);
    echo json_encode(array('ok' => false, 'error' => 'not-signed-in'));
    exit;
}

require_once __DIR__ . '/tm-lib.php';

$action = isset($_REQUEST['action']) ? (string)$_REQUEST['action'] : 'balance';

if ($action === 'balance') {
    echo json_encode(tm_balance());
    exit;
}

if ($action === 'log') {
    $f = __DIR__ . '/tm-log.json';
    $rows = is_file($f) ? json_decode((string)@file_get_contents($f), true) : array();
    echo json_encode(array('ok' => true, 'rows' => array_slice(is_array($rows) ? $rows : array(), -40)));
    exit;
}

if ($action === 'send') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('ok' => false, 'error' => 'post-only'));
        exit;
    }
    $to   = isset($_POST['to'])   ? (string)$_POST['to']   : '';
    $text = isset($_POST['text']) ? (string)$_POST['text'] : '';
    $ref  = isset($_POST['ref'])  ? (string)$_POST['ref']  : 'admin';
    echo json_encode(tm_send($to, $text, $ref));
    exit;
}

http_response_code(400);
echo json_encode(array('ok' => false, 'error' => 'unknown-action'));
