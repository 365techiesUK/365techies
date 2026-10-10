<?php
/*
 * Microsoft 365 orders from /order-microsoft-365/ (9 Oct 2026, owner: "yes build it with option B"). How it fits
 * together, and the rules for GoCardless and Pax8, are at the top of api/m365-order-lib.php.
 *
 * The customer's browser (no sign-in; an order's own secret, k, proves it is theirs):
 *   do=create  {plan, qty, biz, crn, street, street2, city, postcode, domain, email_now, now_with, first, last, email,
 *               phone, notes, signatory, mca, term, terms, website(empty)} -> {ok, id, k, url}
 *              url = GoCardless's own page for the Direct Debit ('' if it could not be made: then we email them a link)
 *   do=status  {id, k} -> {ok, order}         after GoCardless sends them back
 *   do=resume  {id, k} -> {ok, url}           "Set up the Direct Debit" again, after leaving the page
 * Staff (portal session, vis_staff_ok):
 *   do=list                                    every order, newest first
 *   do=check     {id}                          ask GoCardless about its Direct Debit now
 *   do=ddlink    {id}                          a fresh Direct Debit page, emailed to the customer
 *   do=pax8order {id, prefix}                  Pax8: the company (once), ?isMock=true, then the real order
 *   do=startpay  {id}                          the monthly Direct Debit, on this order's own mandate
 *   do=mark      {id, what: ordered|paid|cancel|reopen, ref}   by hand
 * NO closing tag in this file.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
require_once __DIR__ . '/m365-order-lib.php';

function mo_out($a, $code = 200) { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); exit; }
function mo_fail($e, $x = array(), $code = 200) { mo_out(array_merge(array('ok' => false, 'error' => $e), $x), $code); }
/* Answer now, then carry on (Slack, email): the customer is waiting to be sent to GoCardless. */
function mo_answer_then($a) {
    http_response_code(200);
    echo json_encode($a, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (function_exists('fastcgi_finish_request')) { @fastcgi_finish_request(); } else { @ob_flush(); @flush(); }
}
function mo_mail($to, $m) {
    require_once __DIR__ . '/pcm-jobmail-lib.php';   // jd_mail: pcm-smtp.php, else mail(); logs to the portal's Sent emails
    try { return jd_mail($to, $m[0], $m[1], $m[2]); } catch (Throwable $e) { return false; }
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') mo_fail('method', array(), 405);
$raw = (string)file_get_contents('php://input', false, null, 0, 40000);
$in = json_decode($raw, true);
if (!is_array($in)) mo_fail('bad_request');
$do = preg_replace('/[^a-z0-9]/', '', (string)($in['do'] ?? ''));
$ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');

/* ============================================================== the customer's side */
if ($do === 'create') {
    if (!empty($in['website'])) mo_out(array('ok' => true, 'id' => '', 'k' => '', 'url' => ''));   // a field a person never fills
    if (PHP_SAPI !== 'cli-server') {   // a browser posting from our page always says where from (form-relay.php's rule)
        $src = (string)($_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? ''));
        if ($src === '' || !preg_match('#^https://(www\.)?365techies\.co\.uk(/|$)#', $src)) mo_fail('origin', array(), 403);
    }
    $v = m365_validate($in);
    if (!$v['ok']) mo_fail('invalid', array('fields' => $v['errors']));
    $rt = mm_rate_take(mm_rate_file(M365_DIR), array(array('m365c:' . mm_ip_key(), 5), array('m365c', 60)));
    if ($rt === 'busy') mo_fail('busy');
    if ($rt !== true) mo_fail('rate');

    $key = bin2hex(random_bytes(16));
    $row = m365_new_row($v['f'], m365_plans(), $key, $ip, (string)($_SERVER['HTTP_USER_AGENT'] ?? ''));
    $s = m365_store_locked(function ($data) use ($row) { $data['orders'][] = $row; return array('ok' => true, 'data' => $data); });
    if (empty($s['ok'])) mo_fail('unavailable');
    m365_log('order ' . $row['id'] . ' ' . m365_what($row) . ' ' . m365_money($row['monthly']));

    // the Direct Debit page (no lock held while GoCardless thinks), then write down what happened
    $work = $row;
    list($okDd, $url, $why) = m365_dd_start($work, $key);
    m365_update($row['id'], function (&$r) use ($work, $okDd) {
        $r['dd'] = $work['dd'];
        if (!$okDd) m365_add_log($r, 'website', 'Could not open the Direct Debit page: ' . (string)($work['dd']['why'] ?? ''));
        return '';
    });
    mo_answer_then(array('ok' => true, 'id' => $row['id'], 'k' => $key, 'url' => $okDd ? $url : ''));

    // after the answer: the Slack card (the portal inbox reads it) and their own copy by email
    $hook = mm_hook(M365_DIR);
    if ($hook === '' || !mm_post_slack($hook, m365_card($work))) m365_log('order ' . $row['id'] . ' Slack card NOT posted');
    if (!mo_mail($row['person']['email'], m365_email($work, $key))) m365_log('order ' . $row['id'] . ' confirmation email NOT sent');
    exit;
}

if ($do === 'status' || $do === 'resume') {
    $id = preg_replace('/[^a-f0-9]/', '', (string)($in['id'] ?? ''));
    $key = (string)($in['k'] ?? '');
    $rt = mm_rate_take(mm_rate_file(M365_DIR), array(array('m365s:' . mm_ip_key(), 200)));
    if ($rt !== true) mo_fail($rt === 'busy' ? 'busy' : 'rate');
    $row = m365_find($id);
    if (!$row || !m365_key_ok($row, $key)) mo_fail('unknown_order');
    if ($do === 'status') {
        // just back from GoCardless: ask them (the page asks a few times, 3 seconds apart, while the bank's answer arrives;
        // at most once every 2 seconds per order, and the per-address limit above caps the rest)
        if (($row['dd']['state'] ?? '') === 'waiting' && (int)($row['dd']['checked_at'] ?? 0) <= time() - 2) {
            m365_dd_refresh($id);
            $row = m365_find($id);
        }
        mo_out(array('ok' => true, 'order' => m365_public($row)));
    }
    // resume: a still-good page is handed back; otherwise a new one
    if (!empty($row['cancelled'])) mo_fail('cancelled');
    if (($row['dd']['state'] ?? '') === 'ready') mo_out(array('ok' => true, 'url' => '', 'order' => m365_public($row)));
    $rt = mm_rate_take(mm_rate_file(M365_DIR), array(array('m365r:' . $id, 10)));
    if ($rt !== true) mo_fail($rt === 'busy' ? 'busy' : 'rate');
    if (($row['dd']['state'] ?? '') === 'waiting' && !empty($row['dd']['url']) && (int)($row['dd']['expires'] ?? 0) > time() + 300) {
        m365_dd_refresh($id);
        $row = m365_find($id);
        if (($row['dd']['state'] ?? '') === 'ready') mo_out(array('ok' => true, 'url' => '', 'order' => m365_public($row)));
        if (!empty($row['dd']['url']) && m365_flow_ok($row['dd']['url'])) mo_out(array('ok' => true, 'url' => $row['dd']['url']));
    }
    $work = $row;
    list($okDd, $url, $why) = m365_dd_start($work, $key);
    m365_update($id, function (&$r) use ($work) { $r['dd'] = $work['dd']; return ''; });
    if (!$okDd) mo_fail('dd_unavailable');
    mo_out(array('ok' => true, 'url' => $url));
}

/* ============================================================== staff */
require_once __DIR__ . '/visitors-tally-lib.php';
if (!vis_staff_ok($in, __DIR__)) mo_fail('not_staff', array(), 403);
$who = 'staff';
$dbS = @json_decode((string)@file_get_contents(__DIR__ . '/pcm-data.json'), true);   // read only: whose session this is
$tokS = preg_replace('/[^a-f0-9]/', '', (string)($in['stoken'] ?? ''));
if (is_array($dbS) && $tokS !== '' && isset($dbS['staff'][$tokS])) {
    $sr = $dbS['staff'][$tokS];
    $nm = trim((string)($sr['name'] ?? ($sr['login'] ?? ($sr['email'] ?? ''))));
    if ($nm !== '') $who = $nm;
}
unset($dbS);

if ($do === 'list') {
    $rows = array();
    foreach (array_reverse(m365_store_read()['orders']) as $r) $rows[] = m365_staff($r);
    mo_out(array('ok' => true, 'orders' => $rows, 'gocardless' => m365_gc_token() !== '', 'pax8' => m365_pax8_ready(), 'mpn' => M365_MPN));
}

$id = preg_replace('/[^a-f0-9]/', '', (string)($in['id'] ?? ''));
$row = m365_find($id);
if (!$row) mo_fail('unknown_order');

if ($do === 'check') {
    if (empty($row['dd']['br'])) mo_fail('no_dd');
    if (m365_gc_token() === '') mo_fail('no_gocardless');
    m365_dd_refresh($id);
    mo_out(array('ok' => true, 'order' => m365_staff(m365_find($id))));
}

if ($do === 'ddlink') {
    if (!empty($row['cancelled'])) mo_fail('cancelled');
    if (($row['dd']['state'] ?? '') === 'ready') mo_fail('already_ready');
    // a new secret too: the old one may be sitting in an email they have lost
    $key = bin2hex(random_bytes(16));
    $work = $row;
    list($okDd, $url, $why) = m365_dd_start($work, $key);
    if (!$okDd) {
        m365_update($id, function (&$r) use ($work) { $r['dd'] = $work['dd']; return ''; });
        mo_fail('gc_failed', array('why' => (string)($work['dd']['why'] ?? '')));
    }
    $sent = mo_mail($row['person']['email'], m365_ddlink_email($row, $url));
    $res = m365_update($id, function (&$r) use ($work, $key, $who, $sent) {
        $r['dd'] = $work['dd']; $r['kh'] = hash('sha256', $key);
        m365_add_log($r, $who, $sent ? 'Emailed them a new Direct Debit link' : 'Made a new Direct Debit link (the email did not send)');
        return '';
    });
    mo_out(array('ok' => true, 'sent' => $sent, 'order' => m365_staff($res['row'])));
}

if ($do === 'pax8order') {
    $plans = m365_plans();
    $plan = $plans[$row['plan']] ?? null;
    if (!$plan) mo_fail('unknown_plan');
    if (!empty($row['cancelled'])) mo_fail('cancelled');
    if (($row['pax8']['state'] ?? '') === 'ordered') mo_fail('already_ordered');
    if (($row['dd']['state'] ?? '') !== 'ready') mo_fail('no_dd');
    if ($row['email_now'] === 'microsoft') mo_fail('existing_tenant');
    if (!m365_pax8_ready()) mo_fail('no_pax8');
    $prefix = strtolower(preg_replace('/\s+/', '', (string)($in['prefix'] ?? $row['prefix'])));
    if (!m365_prefix_ok($prefix)) mo_fail('bad_prefix');

    // one press at a time: claim the order under the lock (a second press within 5 minutes is refused)
    $now = time();
    $claim = m365_update($id, function (&$r) use ($now, $prefix, $who) {
        if (($r['pax8']['state'] ?? '') === 'ordered') return 'already_ordered';
        if (($r['pax8']['state'] ?? '') === 'placing' && (int)($r['pax8']['at'] ?? 0) > $now - 300) return 'busy';
        $r['pax8']['state'] = 'placing'; $r['pax8']['at'] = $now; $r['pax8']['by'] = $who; $r['prefix'] = $prefix;
        return '';
    });
    if (empty($claim['ok'])) mo_fail($claim['error']);
    $row = $claim['row'];
    $stop = function ($stage, $why) use ($id, $who) {
        m365_update($id, function (&$r) use ($stage, $why, $who) {
            $r['pax8']['state'] = 'failed'; $r['pax8']['why'] = $why; $r['pax8']['stage'] = $stage;
            m365_add_log($r, $who, 'Pax8 order stopped at ' . $stage . ': ' . $why);
            return '';
        });
        m365_log('pax8 ' . $id . ' stopped at ' . $stage . ': ' . $why);
        mo_fail('pax8_failed', array('stage' => $stage, 'why' => $why));
    };

    @set_time_limit(150);
    // 1. the company in Pax8 (once - a retry reuses it)
    $company = (string)($row['pax8']['company'] ?? '');
    if ($company !== '') {
        /* A second try. If the first one timed out AFTER Pax8 took the order, ordering again would buy it twice - so
           look for a subscription to this product first and stop if there is one. */
        list($cs, $js) = m365_pax8('GET', '/subscriptions?page=0&size=20&companyId=' . rawurlencode($company) . '&productId=' . rawurlencode((string)$plan['pax8']));
        if ($cs < 200 || $cs >= 300) $stop('duplicate', 'Could not check Pax8 for an earlier order (' . $cs . '), so nothing was ordered');
        foreach ((array)($js['content'] ?? array()) as $sx) {
            if (!in_array(strtolower((string)($sx['status'] ?? '')), array('cancelled', 'canceled', 'inactive', 'deleted'), true))
                $stop('duplicate', 'Pax8 already has this product for the company (subscription ' . (string)($sx['id'] ?? '?') . ', ' . (string)($sx['status'] ?? '') . '). Check it in Pax8, then use Mark as ordered');
        }
    }
    if ($company === '') {
        list($c, $j) = m365_pax8('POST', '/companies', m365_pax8_company_body($row));
        $company = (string)($j['id'] ?? '');
        if ($c < 200 || $c >= 300 || $company === '') $stop('company', 'Pax8 would not add the company (' . $c . ($j ? ': ' . m365_pax8_why($j) : '') . ')');
        m365_update($id, function (&$r) use ($company, $who) { $r['pax8']['company'] = $company; m365_add_log($r, $who, 'Added the company in Pax8'); return ''; });
    }
    // 2. the questions Pax8 asks for this product, answered
    list($cq, $jq) = m365_pax8('GET', '/products/' . rawurlencode((string)$plan['pax8']) . '/provision-details');
    if ($cq < 200 || $cq >= 300 || !isset($jq['content'])) $stop('questions', 'Pax8 did not send the order questions (' . $cq . ')');
    $body = m365_pax8_order_body($row, $plan, $company, m365_pax8_answers($row, $prefix, $jq['content']));
    // 3. Pax8 checks it without buying anything
    list($cm, $jm) = m365_pax8('POST', '/orders?isMock=true', $body);
    if ($cm < 200 || $cm >= 300) $stop('check', 'Pax8 found a problem (' . $cm . ($jm ? ': ' . m365_pax8_why($jm) : '') . ')');
    // 4. the real order
    list($co, $jo) = m365_pax8('POST', '/orders', $body);
    $order = (string)($jo['id'] ?? '');
    if ($co < 200 || $co >= 300 || $order === '') $stop('order', 'Pax8 did not take the order (' . $co . ($jo ? ': ' . m365_pax8_why($jo) : '') . ')');
    $subs = array();
    foreach ((array)($jo['lineItems'] ?? array()) as $li) if (!empty($li['subscriptionId'])) $subs[] = (string)$li['subscriptionId'];
    $res = m365_update($id, function (&$r) use ($order, $subs, $who, $prefix) {
        $r['pax8'] = array_merge($r['pax8'], array('state' => 'ordered', 'order' => $order, 'subs' => $subs, 'at' => time(), 'by' => $who, 'why' => '', 'stage' => ''));
        m365_add_log($r, $who, 'Ordered in Pax8 (order ' . $order . ', ' . $prefix . '.onmicrosoft.com)');
        return '';
    });
    m365_log('pax8 ' . $id . ' ORDERED ' . $order . ' by ' . $who);
    $r2 = $res['row'] ?? $row;
    m365_note(':shopping_trolley: Microsoft 365 order ' . m365_tag($r2) . ' placed in Pax8 by ' . mm_esc($who) . ' (Pax8 order ' . mm_esc($order) . '). Next: start the monthly Direct Debit, then set up their users. <' . m365_portal_link($id) . '|Open it>');
    mo_out(array('ok' => true, 'order' => m365_staff($r2)));
}

if ($do === 'startpay') {
    if (!empty($row['cancelled'])) mo_fail('cancelled');
    if (($row['pax8']['state'] ?? '') !== 'ordered') mo_fail('not_ordered');
    if (m365_gc_token() === '') mo_fail('no_gocardless');
    $work = $row;
    list($ok, $why) = m365_pay_start($work, $who);
    if (!$ok) mo_fail($why === 'no_mandate' || $why === 'already' ? $why : 'gc_failed', array('why' => $why));
    $res = m365_update($id, function (&$r) use ($work, $who) {
        $r['pay'] = $work['pay'];
        m365_add_log($r, $who, 'Started the monthly Direct Debit: ' . m365_money($work['pay']['amount']) . ($work['pay']['first'] !== '' ? ', first ' . $work['pay']['first'] : ''));
        return '';
    });
    m365_note(':moneybag: Microsoft 365 order ' . m365_tag($work) . ': monthly Direct Debit of ' . m365_money($work['pay']['amount']) . ' started by ' . mm_esc($who)
        . ($work['pay']['first'] !== '' ? ', first payment ' . $work['pay']['first'] : '') . '.');
    mo_out(array('ok' => true, 'order' => m365_staff($res['row'])));
}

if ($do === 'mark') {
    $what = preg_replace('/[^a-z]/', '', (string)($in['what'] ?? ''));
    $ref = substr(mm_clean((string)($in['ref'] ?? '')), 0, 80);
    if (!in_array($what, array('ordered', 'paid', 'cancel', 'reopen'), true)) mo_fail('bad_what');
    $res = m365_update($id, function (&$r) use ($what, $ref, $who) {
        if ($what === 'ordered') {
            if (($r['pax8']['state'] ?? '') === 'ordered') return 'already_ordered';
            $r['pax8'] = array_merge((array)$r['pax8'], array('state' => 'ordered', 'order' => $ref, 'by' => $who, 'at' => time(), 'hand' => 1, 'why' => ''));
            m365_add_log($r, $who, 'Marked as ordered by hand in Pax8' . ($ref !== '' ? ' (' . $ref . ')' : ''));
        } elseif ($what === 'paid') {
            if (($r['pay']['state'] ?? '') === 'started') return 'already';
            $r['pay'] = array('state' => 'started', 'hand' => 1, 'by' => $who, 'at' => time(), 'amount' => (int)$r['monthly'], 'first' => '', 'sub' => $ref);
            m365_add_log($r, $who, 'Marked monthly payments as set up by hand' . ($ref !== '' ? ' (' . $ref . ')' : ''));
        } elseif ($what === 'cancel') {
            $r['cancelled'] = time();
            m365_add_log($r, $who, 'Cancelled in the portal' . ($ref !== '' ? ': ' . $ref : '') . ' (nothing at Pax8 or GoCardless was changed)');
        } else {
            unset($r['cancelled']);
            m365_add_log($r, $who, 'Reopened');
        }
        return '';
    });
    if (empty($res['ok'])) mo_fail($res['error']);
    mo_out(array('ok' => true, 'order' => m365_staff($res['row'])));
}

mo_fail('bad_action');
