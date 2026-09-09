<?php
/**
 * The asset register, read from the books.
 *
 * "How old is this computer?" and "how old is this drive?" have a true answer only
 * where we sold them: the date on the QuickBooks invoice. Invoices name the MODEL
 * (never a serial), and most home customers have exactly one machine, so a match is
 * honest when it is unambiguous and refused when it is not:
 *
 *   PC     the customer's invoice line naming this model (family + number, e.g.
 *          "Latitude 3520"). Accepted when the customer has one machine, or exactly
 *          one machine of this model. Several of the same model = staff decide.
 *   drive  an invoice line that is a drive (SSD / NVMe / hard drive) whose capacity
 *          matches the fitted drive's marketing size (932 GB measured = "1TB"); or,
 *          for a machine with one drive, an unsized drive line on the PC's own
 *          invoice - the drive fitted with it.
 *
 * Everything here is READ-ONLY against QuickBooks (the same customer lookup and
 * token discipline as pcm-myinvoices.php) with its own 24-hour cache, so a report
 * upload never costs more than one QuickBooks query. The matcher is pure and is
 * pinned by pcm-asset-test.php. Nothing is ever guessed: no match = no line.
 */
if (!function_exists('pcm_asset_match')) {

/** "2 years 6 months", "8 months", "3 weeks", or "days" - between an ISO date and now. */
function pcm_asset_age($dateIso, $nowTs = null) {
    $ts = strtotime((string)$dateIso . ' 12:00:00 UTC');
    if ($ts === false || $ts <= 0) return '';
    $now = $nowTs !== null ? (int)$nowTs : time();
    if ($ts > $now + 86400) return '';
    $a = new DateTime('@' . $ts); $b = new DateTime('@' . max($ts, $now));
    $d = $a->diff($b);
    if ($d->y >= 1) return $d->y . ' year' . ($d->y > 1 ? 's' : '') . ($d->m ? ' ' . $d->m . ' month' . ($d->m > 1 ? 's' : '') : '');
    if ($d->m >= 1) return $d->m . ' month' . ($d->m > 1 ? 's' : '');
    $w = (int)floor($d->days / 7);
    return $w >= 1 ? $w . ' week' . ($w > 1 ? 's' : '') : 'days';
}

/** The capacity labels an invoice would carry for a measured size (932 GB measured = "1TB"). */
function pcm_asset_size_labels($sizeGB) {
    $g = (float)$sizeGB;
    $table = array(
        array(100, 135,  array('120gb', '128gb')),
        array(215, 262,  array('240gb', '250gb', '256gb')),
        array(430, 525,  array('480gb', '500gb', '512gb')),
        array(880, 1050, array('960gb', '1tb', '1000gb', '1024gb')),
        array(1750, 2100, array('2tb', '2000gb', '2048gb')),
        array(3500, 4200, array('4tb', '4000gb')),
        array(7000, 8400, array('8tb', '8000gb')),
    );
    foreach ($table as $t) if ($g >= $t[0] && $g <= $t[1]) return $t[2];
    return array();
}

/** Lower-case, "1 TB" -> "1tb", punctuation to spaces, one space between words. */
function pcm_asset_norm($s) {
    $s = strtolower((string)$s);
    $s = preg_replace('/(\d)\s+(tb|gb)\b/', '$1$2', $s);
    $s = preg_replace('/[^a-z0-9]+/', ' ', $s);
    return trim(preg_replace('/\s+/', ' ', $s));
}

/** The words that identify a PC model on an invoice line. */
function pcm_asset_model_keys($model) {
    $n = pcm_asset_norm($model);
    if ($n === '') return null;
    $brands = array('dell', 'hp', 'hewlett', 'packard', 'lenovo', 'acer', 'asus', 'apple', 'microsoft', 'msi', 'samsung',
                    'toshiba', 'fujitsu', 'huawei', 'lg', 'sony', 'medion', 'razer', 'alienware', 'inc', 'ltd', 'corporation');
    $brand = ''; $family = ''; $number = '';
    foreach (explode(' ', $n) as $w) {
        if (in_array($w, $brands, true)) { if ($brand === '' && $w !== 'inc' && $w !== 'ltd' && $w !== 'corporation') $brand = $w; continue; }
        if ($family === '' && !preg_match('/\d/', $w)) { $family = $w; continue; }
        if ($family !== '' && $number === '' && preg_match('/\d{3,}/', $w)) { $number = $w; break; }
    }
    return array('full' => $n, 'brand' => $brand, 'family' => $family, 'number' => $number);
}

function pcm_asset_has_word($lineNorm, $w) { return $w !== '' && strpos(' ' . $lineNorm . ' ', ' ' . $w . ' ') !== false; }

/** Does this (normalised) invoice line name the PC? */
function pcm_asset_line_has_pc($lineNorm, $keys) {
    if (!is_array($keys)) return false;
    if ($keys['full'] !== '' && strpos(' ' . $lineNorm . ' ', ' ' . $keys['full'] . ' ') !== false) return true;
    if ($keys['family'] === '' || !pcm_asset_has_word($lineNorm, $keys['family'])) return false;
    if ($keys['number'] !== '') return pcm_asset_has_word($lineNorm, $keys['number']);
    return $keys['brand'] === '' || pcm_asset_has_word($lineNorm, $keys['brand']);
}

function pcm_asset_line_is_drive($lineNorm) {
    return (bool)preg_match('/\b(ssd|nvme|m 2|hard drive|hard disk|hdd|solid state)\b/', $lineNorm);
}

/**
 * The pure matcher.
 * @param array  $invoices        [ ['date'=>'YYYY-MM-DD', 'num'=>'1187', 'lines'=>['Dell Latitude 3520 ...', ...]], ... ]
 * @param string $model           the machine's make + model as the report saw it
 * @param array  $drives          [ ['model'=>'CT1000P3PSSD8', 'sizeGB'=>932], ... ] fixed drives only
 * @param int    $machineCount    machines on the customer's record
 * @param int    $sameModelCount  machines on the record whose stored model matches this one (incl. this one)
 */
function pcm_asset_match($invoices, $model, $drives, $machineCount, $sameModelCount, $nowTs = null) {
    $out = array('pc' => null, 'drives' => array(), 'why' => '');
    if (!is_array($invoices) || !$invoices) { $out['why'] = 'no_invoices'; return $out; }
    $keys = pcm_asset_model_keys($model);
    usort($invoices, function ($a, $b) { return strcmp((string)(isset($b['date']) ? $b['date'] : ''), (string)(isset($a['date']) ? $a['date'] : '')); });
    $unambiguous = ((int)$machineCount <= 1) || ((int)$sameModelCount === 1);
    $hit = null;
    if ($keys) {
        foreach ($invoices as $inv) {
            foreach ((array)(isset($inv['lines']) ? $inv['lines'] : array()) as $ln) {
                if (pcm_asset_line_has_pc(pcm_asset_norm($ln), $keys)) { $hit = array('date' => (string)$inv['date'], 'num' => (string)$inv['num'], 'line' => trim((string)$ln)); break 2; }
            }
        }
    }
    if ($hit) {
        if ($unambiguous) $out['pc'] = $hit + array('age' => pcm_asset_age($hit['date'], $nowTs));
        else $out['why'] = 'ambiguous_pc';
    } else {
        $out['why'] = $keys ? 'no_pc_line' : 'no_model';
    }
    foreach ((array)$drives as $d) {
        if (!is_array($d)) continue;
        $labels = pcm_asset_size_labels(isset($d['sizeGB']) ? $d['sizeGB'] : 0);
        $dh = null; $fallback = null;
        foreach ($invoices as $inv) {
            foreach ((array)(isset($inv['lines']) ? $inv['lines'] : array()) as $ln) {
                $n = pcm_asset_norm($ln);
                if (!pcm_asset_line_is_drive($n)) continue;
                foreach ($labels as $lb) {
                    if (strpos(' ' . $n . ' ', ' ' . $lb . ' ') !== false || strpos($n, $lb) !== false) { $dh = array('date' => (string)$inv['date'], 'num' => (string)$inv['num'], 'line' => trim((string)$ln)); break 3; }
                }
                // an unsized drive line on the PC's own invoice: the drive fitted with it
                if (!$fallback && $out['pc'] && (string)$inv['num'] === (string)$out['pc']['num'] && !preg_match('/\d+(tb|gb)\b/', $n))
                    $fallback = array('date' => (string)$inv['date'], 'num' => (string)$inv['num'], 'line' => trim((string)$ln));
            }
        }
        if (!$dh && $fallback && count($drives) === 1) $dh = $fallback;
        if ($dh && $unambiguous) {
            $out['drives'][] = array('model' => (string)(isset($d['model']) ? $d['model'] : ''), 'sizeGB' => (int)(isset($d['sizeGB']) ? $d['sizeGB'] : 0))
                             + $dh + array('age' => pcm_asset_age($dh['date'], $nowTs));
        }
    }
    return $out;
}

/**
 * The customer's invoices with their line text, from QuickBooks, read-only, cached a day.
 * Mirrors pcm-myinvoices.php's identity chain: OUR record's email -> the biller's map
 * (read, never written) -> PrimaryEmailAddr fallback -> WHERE CustomerRef = id.
 */
function pcm_asset_invoices($email, $ttl = 86400) {
    $BASE = __DIR__;
    $CFG = $BASE . '/pcm-quickbooks.php'; $TOKENF = $BASE . '/pcm-qbo-token.json';
    $STATEF = $BASE . '/pcm-invoice-state.json'; $LOCKF = $BASE . '/pcm-invoice.lock';
    $CACHEF = $BASE . '/pcm-asset-cache.json'; $MINORVERSION = '70';
    $email = strtolower(trim((string)$email));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) return array('ok' => false, 'why' => 'no_email', 'invoices' => array());
    $ck = sha1($email);
    $all = @json_decode((string)@file_get_contents($CACHEF), true); if (!is_array($all)) $all = array();
    $hit = isset($all[$ck]) && is_array($all[$ck]) ? $all[$ck] : null;
    if ($hit && (time() - (int)(isset($hit['ts']) ? $hit['ts'] : 0)) < (int)$ttl) return array('ok' => true, 'invoices' => (array)$hit['rows'], 'cached' => true, 'why' => (string)(isset($hit['why']) ? $hit['why'] : ''));
    if (!is_readable($CFG)) return array('ok' => false, 'why' => 'not_configured', 'invoices' => array());
    require_once $BASE . '/pcm-qbo-lib.php';
    require $CFG;
    if (empty($QBO_CLIENT_ID) || empty($QBO_CLIENT_SECRET) || empty($QBO_REALM_ID)) return array('ok' => false, 'why' => 'not_configured', 'invoices' => array());
    $API_BASE = qbo_lib_base(isset($QBO_ENV) ? $QBO_ENV : '');
    $CUSTKEY = qbo_lib_custkey($email, $QBO_REALM_ID);
    // the token refresh ROTATES the refresh token: never race the biller or the staff button
    $lock = @fopen($LOCKF, 'c');
    if (!$lock || !@flock($lock, LOCK_EX | LOCK_NB)) return array('ok' => false, 'why' => 'busy', 'invoices' => $hit ? (array)$hit['rows'] : array());
    $tok = qbo_lib_token($TOKENF, $QBO_CLIENT_ID, $QBO_CLIENT_SECRET);
    @flock($lock, LOCK_UN); @fclose($lock);
    if (!empty($tok['err']) || empty($tok['access_token'])) return array('ok' => false, 'why' => 'no_token', 'invoices' => array());
    $access = $tok['access_token'];
    $state = @json_decode((string)@file_get_contents($STATEF), true);
    $qboId = (is_array($state) && !empty($state['cust'][$CUSTKEY])) ? (string)$state['cust'][$CUSTKEY] : '';
    if ($qboId === '') {
        $q = "select Id from Customer where PrimaryEmailAddr = '" . qbo_lib_qesc($email) . "'";
        $res = qbo_lib_api('GET', '/query?query=' . rawurlencode($q), null, $access, $API_BASE, $QBO_REALM_ID, $MINORVERSION);
        if (qbo_lib_ok($res) && !empty($res['json']['QueryResponse']['Customer'][0]['Id'])) $qboId = (string)$res['json']['QueryResponse']['Customer'][0]['Id'];
    }
    $rows = array(); $why = '';
    if ($qboId === '' || !preg_match('/^\d+$/', $qboId)) {
        $why = 'no_qbo_customer';
    } else {
        $q = "select * from Invoice where CustomerRef = '" . qbo_lib_qesc($qboId) . "' orderby TxnDate desc maxresults 100";
        $res = qbo_lib_api('GET', '/query?query=' . rawurlencode($q), null, $access, $API_BASE, $QBO_REALM_ID, $MINORVERSION);
        if (!qbo_lib_ok($res)) return array('ok' => false, 'why' => 'qbo_error', 'invoices' => $hit ? (array)$hit['rows'] : array());
        $list = isset($res['json']['QueryResponse']['Invoice']) && is_array($res['json']['QueryResponse']['Invoice']) ? $res['json']['QueryResponse']['Invoice'] : array();
        foreach ($list as $inv) {
            if (!is_array($inv) || (string)(isset($inv['CustomerRef']['value']) ? $inv['CustomerRef']['value'] : '') !== $qboId) continue;
            if (!qbo_lib_invoice_ready($inv)) continue;   // a half-finished draft is not a sale yet
            $lines = array();
            foreach ((array)(isset($inv['Line']) ? $inv['Line'] : array()) as $L) {
                if (!is_array($L)) continue;
                $t = trim((string)(isset($L['Description']) ? $L['Description'] : '') . ' ' . (string)(isset($L['SalesItemLineDetail']['ItemRef']['name']) ? $L['SalesItemLineDetail']['ItemRef']['name'] : ''));
                if ($t !== '') $lines[] = substr(preg_replace('/[\x00-\x1F\x7F]+/', ' ', $t), 0, 200);
            }
            $rows[] = array('date' => (string)(isset($inv['TxnDate']) ? $inv['TxnDate'] : ''), 'num' => (string)(isset($inv['DocNumber']) ? $inv['DocNumber'] : ''), 'lines' => $lines);
        }
    }
    $all[$ck] = array('ts' => time(), 'rows' => $rows, 'why' => $why);
    if (count($all) > 400) { uasort($all, function ($a, $b) { return (int)$b['ts'] - (int)$a['ts']; }); $all = array_slice($all, 0, 400, true); }
    $tmp = $CACHEF . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($all), LOCK_EX) !== false) @rename($tmp, $CACHEF);
    return array('ok' => true, 'invoices' => $rows, 'why' => $why);
}

/**
 * For one machine on one customer record: fetch, count, match. Returns the asset block
 * pcm.php stores on the machine and hands to the service-report email.
 */
function pcm_asset_for_machine($cust, $machineId, $model, $drives) {
    $email = (string)(isset($cust['email']) ? $cust['email'] : '');
    $machines = isset($cust['machines']) && is_array($cust['machines']) ? $cust['machines'] : array();
    $mc = max(1, count($machines));
    $keys = pcm_asset_model_keys($model);
    $same = 0;
    foreach ($machines as $mid => $m) {
        $mm = (string)(isset($m['model']) ? $m['model'] : '');
        if ($mid === $machineId) { $same++; continue; }
        $mk = pcm_asset_model_keys($mm);
        if ($keys && $mk && $mk['family'] === $keys['family'] && $mk['number'] === $keys['number']) $same++;
    }
    $inv = pcm_asset_invoices($email);
    $m = pcm_asset_match($inv['invoices'], $model, $drives, $mc, $same);
    $m['source'] = (string)(isset($inv['why']) && $inv['why'] !== '' ? $inv['why'] : (empty($inv['ok']) ? 'unavailable' : 'quickbooks'));
    $m['invoices_seen'] = count($inv['invoices']);
    $m['computed'] = time();
    return $m;
}

} // function_exists guard
