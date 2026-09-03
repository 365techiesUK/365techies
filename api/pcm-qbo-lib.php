<?php
/**
 * QuickBooks Online primitives, shared. No side effects on include, no closing
 * tag, every dependency passed in rather than read from a global - so it can be
 * unit-tested and cannot surprise a caller.
 *
 * ⚠ THE TWO WRITERS STILL CARRY THEIR OWN COPIES. `pcm-invoice.php` is the live
 * monthly biller and `pcm-qbo.php` is the staff invoice button; both were
 * working against the real 365 Techies books before this file existed, neither
 * has a committed test, and refactoring a live financial path to share code with
 * a read-only feature would risk the billing run for no gain. So: this file is
 * the CANONICAL copy for anything new, and the moment either writer is touched
 * for its own reasons it should adopt these functions. Until then, a change here
 * must be checked against both.
 *
 * The one thing that MUST NOT diverge is qbo_lib_custkey(): it is the key of the
 * email -> QuickBooks customer id map in pcm-invoice-state.json. Derive it
 * differently in one caller and you get silent duplicate QuickBooks customers,
 * or worse, one customer's id handed to another.
 */
if (!function_exists('qbo_lib_custkey')) {

    /**
     * Key for the email -> QBO customer id map.
     * ⚠ NAMESPACED BY COMPANY (realm). Keyed on the email alone, an id cached
     * from one company (a sandbox, say) would be handed straight to another;
     * ids are small per-company integers, so the collision resolves to a real
     * but DIFFERENT person rather than erroring. Identical to the derivation in
     * pcm-invoice.php and pcm-qbo.php - change one, change all three.
     */
    function qbo_lib_custkey($email, $realmId) {
        return sha1(strtolower(trim((string)$email)) . '|' . (string)$realmId);
    }

    /** Live QuickBooks base URL for the configured environment. */
    function qbo_lib_base($env) {
        return ((string)$env === 'sandbox')
            ? 'https://sandbox-quickbooks.api.intuit.com'
            : 'https://quickbooks.api.intuit.com';
    }

    /**
     * A usable access token, refreshing when the cached one is near expiry.
     *
     * ⚠ INTUIT ROTATES THE REFRESH TOKEN ON EVERY REFRESH - the old one dies
     * immediately. The new one MUST be persisted or the monthly invoicing
     * silently stops working, and nobody finds out until an invoice is missing.
     * Callers that can run concurrently with the biller must hold
     * pcm-invoice.lock across this call.
     *
     * Returns the token array, or array('err' => ...) - never throws.
     */
    function qbo_lib_token($tokenFile, $clientId, $clientSecret) {
        $t = @json_decode((string)@file_get_contents($tokenFile), true);
        if (!is_array($t) || empty($t['refresh_token'])) return array('err' => 'no_token');
        if (!empty($t['access_token']) && (isset($t['expires_at']) ? $t['expires_at'] : 0) > time() + 120) return $t;
        $ch = curl_init('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer');
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
            CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 20,
            CURLOPT_HTTPHEADER => array('Accept: application/json', 'Content-Type: application/x-www-form-urlencoded',
                'Authorization: Basic ' . base64_encode($clientId . ':' . $clientSecret)),
            CURLOPT_POSTFIELDS => http_build_query(array('grant_type' => 'refresh_token', 'refresh_token' => $t['refresh_token']))));
        $r = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        $j = json_decode((string)$r, true);
        if ($code < 200 || $code >= 300 || empty($j['access_token']) || empty($j['refresh_token']))
            return array('err' => 'refresh_failed', 'code' => $code);
        $t = array('access_token' => $j['access_token'], 'refresh_token' => $j['refresh_token'],
                   'expires_at' => time() + intval(isset($j['expires_in']) ? $j['expires_in'] : 3600),
                   'saved' => gmdate('c'));
        $tmp = $tokenFile . '.' . getmypid() . '.tmp';
        if (@file_put_contents($tmp, json_encode($t), LOCK_EX) !== false) @rename($tmp, $tokenFile);
        return $t;
    }

    /**
     * One QuickBooks API call. $accept lets a caller ask for a PDF instead of
     * JSON; the raw body is always returned, so a binary response is intact.
     */
    function qbo_lib_api($method, $path, $body, $access, $apiBase, $realmId, $minorVersion = '70', $accept = 'application/json') {
        $url = $apiBase . '/v3/company/' . rawurlencode((string)$realmId) . $path
             . (strpos($path, '?') === false ? '?' : '&') . 'minorversion=' . $minorVersion;
        $ch = curl_init($url);
        $h = array('Accept: ' . $accept, 'Authorization: Bearer ' . $access);
        if ($body !== null) $h[] = 'Content-Type: application/json';
        curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 25, CURLOPT_HTTPHEADER => $h));
        if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        $r = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        return array('code' => $code, 'json' => json_decode((string)$r, true), 'raw' => (string)$r);
    }

    function qbo_lib_ok($res) { return isset($res['code']) && $res['code'] >= 200 && $res['code'] < 300; }

    /**
     * Escape a value for a QuickBooks query string literal. Their query language
     * is SQL-like and takes single-quoted literals, so an apostrophe in an email
     * or name would otherwise end the literal.
     */
    function qbo_lib_qesc($v) {
        return str_replace(array('\\', "'"), array('\\\\', "\\'"), (string)$v);
    }

    /**
     * Is this invoice finished enough to show the customer?
     *
     * ⚠ QUICKBOOKS HAS NO DRAFT FLAG. The Invoice entity carries only
     * EmailStatus (NotSet | NeedToSend | EmailSent) and PrintStatus
     * (NotSet | NeedToPrint | PrintComplete); there is no TxnStatus and nothing
     * that says "still being written". So this cannot be exact, and pretending
     * otherwise would be worse than the problem it solves.
     *
     * Filtering on EmailStatus alone is the obvious idea and it is WRONG here:
     * our own monthly per-PC run creates invoices through the API and
     * deliberately never emails them (GoCardless collects), so they sit at
     * NotSet for ever. That rule would permanently hide exactly the invoices
     * customers most need to see.
     *
     * So: a settling window. An invoice is shown once it carries positive
     * evidence of having been issued - emailed, printed, or with money already
     * against it - or once it has simply been sitting in the books longer than
     * $settleHours, which is the window in which a half-finished one gets
     * finished or deleted.
     */
    function qbo_lib_invoice_ready($inv, $settleHours = 24, $nowTs = null) {
        if (!is_array($inv)) return false;
        $email = (string)(isset($inv['EmailStatus']) ? $inv['EmailStatus'] : '');
        $print = (string)(isset($inv['PrintStatus']) ? $inv['PrintStatus'] : '');
        if ($email === 'EmailSent' || $print === 'PrintComplete') return true;
        $total   = (float)(isset($inv['TotalAmt']) ? $inv['TotalAmt'] : 0);
        $balance = (float)(isset($inv['Balance']) ? $inv['Balance'] : 0);
        if ($total > 0.005 && $balance < $total - 0.005) return true;   // money has moved against it
        $created = (string)(isset($inv['MetaData']['CreateTime']) ? $inv['MetaData']['CreateTime'] : '');
        if ($created === '') return true;   // no timestamp to judge by: show it rather than hide a real invoice
        $ts = strtotime($created);
        if ($ts === false) return true;
        $now = $nowTs !== null ? $nowTs : time();
        return $ts <= $now - ((int)$settleHours * 3600);
    }

    /**
     * One QuickBooks invoice -> the handful of fields a CUSTOMER may see.
     * Deliberately a whitelist: a QuickBooks invoice object carries private
     * notes, internal memos, item-level costs and our own bookkeeping, none of
     * which belongs in a customer's browser.
     *
     * `status` is derived here rather than read from QuickBooks, which has no
     * single "is it paid" field: Balance is what is still owed.
     */
    function qbo_lib_invoice_public($inv, $todayIso = null) {
        if (!is_array($inv)) return null;
        $id = (string)(isset($inv['Id']) ? $inv['Id'] : '');
        if ($id === '') return null;
        $total   = round((float)(isset($inv['TotalAmt']) ? $inv['TotalAmt'] : 0), 2);
        $balance = round((float)(isset($inv['Balance']) ? $inv['Balance'] : 0), 2);
        $date    = (string)(isset($inv['TxnDate']) ? $inv['TxnDate'] : '');
        $due     = (string)(isset($inv['DueDate']) ? $inv['DueDate'] : '');
        $today   = $todayIso !== null ? $todayIso : gmdate('Y-m-d');
        if ($balance <= 0.005)          $status = 'paid';
        elseif ($due !== '' && $due < $today) $status = 'overdue';
        else                             $status = 'due';
        // A voided invoice keeps its number but nets to zero; saying "paid"
        // about one the customer never owed would be a lie.
        if ($total <= 0.005 && $balance <= 0.005) $status = 'void';
        return array(
            'id' => $id,
            'number' => (string)(isset($inv['DocNumber']) ? $inv['DocNumber'] : ''),
            'date' => $date,
            'due' => $due,
            'total' => $total,
            'balance' => $balance,
            'status' => $status,
        );
    }
}
