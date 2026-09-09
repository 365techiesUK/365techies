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

/* ---- guarantees -------------------------------------------------------------------
   The rules, as the owner set them on 9 Sep 2026:
     Dell laptops and PCs sold by us: FIVE years from us for customers on a support plan,
     TWELVE months for customers who are not. (Other makes: no guarantee line yet.)
     Drives: the MAKER's guarantee - usually "N years or X TB written, whichever first" -
     so the line carries the years, the TBW rating where we have verified it, how much the
     drive has written so far, and the end date when we know the purchase date.
   A guarantee line is only ever printed from a verified table entry; a drive we have not
   verified gets no line, not a guess. */

/** "1TB", "500GB", "250GB"... from a measured size, for the TBW table. */
function pcm_asset_cap_label($sizeGB) {
    $g = (float)$sizeGB;
    foreach (array(array(100, 135, '128GB'), array(215, 262, '250GB'), array(430, 525, '500GB'), array(880, 1050, '1TB'),
                   array(1750, 2100, '2TB'), array(3500, 4200, '4TB'), array(7000, 8400, '8TB')) as $t)
        if ($g >= $t[0] && $g <= $t[1]) return $t[2];
    return '';
}

/**
 * The maker's terms for the drives we fit. Only rows marked verified print; the rest are
 * here so enabling one is a flag flip after reading the maker's page. Sources are dated.
 */
function pcm_asset_drive_terms($model, $sizeGB) {
    $m = strtoupper((string)$model);
    $cap = pcm_asset_cap_label($sizeGB);
    $T = array(
        // Crucial P3 Plus - warranty wording verified on crucial.com/ssd/p3-plus 2026-09-09: "5 years from
        // the original date of purchase or before writing the maximum total bytes written (TBW) as
        // published in the product datasheet ... whichever comes first". The datasheet itself could not
        // be read from here that day, so the TBW figures stay UNVERIFIED and the line names the
        // condition without a number until they are (flip tbw_verified after reading the datasheet).
        array('re' => '/CT\d+P3PSSD8|P3 PLUS/', 'maker' => 'Crucial', 'name' => 'P3 Plus', 'years' => 5,
              'tbw' => array('500GB' => 110, '1TB' => 220, '2TB' => 440, '4TB' => 800), 'verified' => true, 'tbw_verified' => false),
        // Samsung 990 PRO - "5-Year Limited Warranty or 600 TBW" (1TB) / "1200 TBW" (2TB), samsung.com/uk 2026-09-09
        array('re' => '/990 PRO|MZ-V9P/', 'maker' => 'Samsung', 'name' => '990 PRO', 'years' => 5,
              'tbw' => array('1TB' => 600, '2TB' => 1200, '4TB' => 2400), 'verified' => true, 'tbw_verified' => true),
        // ---- below: NOT yet verified on the maker's page from here - no line prints until they are ----
        array('re' => '/CT\d+P3SSD8/', 'maker' => 'Crucial', 'name' => 'P3', 'years' => 5, 'tbw' => array('500GB' => 110, '1TB' => 220, '2TB' => 440, '4TB' => 800), 'verified' => false),
        array('re' => '/CT\d+MX500/', 'maker' => 'Crucial', 'name' => 'MX500', 'years' => 5, 'tbw' => array('250GB' => 100, '500GB' => 180, '1TB' => 360, '2TB' => 700), 'verified' => false),
        array('re' => '/CT\d+BX500/', 'maker' => 'Crucial', 'name' => 'BX500', 'years' => 3, 'tbw' => array(), 'verified' => false),
        array('re' => '/980 PRO|MZ-V8P/', 'maker' => 'Samsung', 'name' => '980 PRO', 'years' => 5, 'tbw' => array('500GB' => 300, '1TB' => 600, '2TB' => 1200), 'verified' => false),
        array('re' => '/870 EVO|MZ-77E/', 'maker' => 'Samsung', 'name' => '870 EVO', 'years' => 5, 'tbw' => array('500GB' => 300, '1TB' => 600, '2TB' => 1200, '4TB' => 2400), 'verified' => false),
        array('re' => '/SN580|WDS\d+G3B0E/', 'maker' => 'WD', 'name' => 'Blue SN580', 'years' => 5, 'tbw' => array('500GB' => 300, '1TB' => 600, '2TB' => 900), 'verified' => false),
        array('re' => '/NV2|SNV2S/', 'maker' => 'Kingston', 'name' => 'NV2', 'years' => 3, 'tbw' => array('500GB' => 160, '1TB' => 320, '2TB' => 640), 'verified' => false),
    );
    foreach ($T as $t) {
        if (!preg_match($t['re'], $m)) continue;
        if (empty($t['verified'])) return null;
        $hasCond = is_array($t['tbw']) && count($t['tbw']) > 0;                 // the maker states a bytes-written condition
        $tbw = (!empty($t['tbw_verified']) && $cap !== '' && isset($t['tbw'][$cap])) ? (int)$t['tbw'][$cap] : null;
        return array('maker' => $t['maker'], 'name' => $t['name'], 'years' => (int)$t['years'], 'tbw' => $tbw, 'tbw_cond' => $hasCond, 'cap' => $cap);
    }
    return null;
}

/** ISO date + N years. */
function pcm_asset_add_years($dateIso, $years) {
    $ts = strtotime((string)$dateIso . ' 12:00:00 UTC');
    if ($ts === false) return '';
    return date('Y-m-d', strtotime('+' . (int)$years . ' years', $ts));
}
/** "2 years 6 months left" or "ended 14 March 2025". */
function pcm_asset_left($toIso, $nowTs = null) {
    $now = $nowTs !== null ? (int)$nowTs : time();
    $to = strtotime((string)$toIso . ' 12:00:00 UTC');
    if ($to === false) return '';
    if ($to < $now) return 'ended ' . date('j F Y', $to);
    $left = pcm_asset_age(date('Y-m-d', $now), $to);   // age() counts forward from the first date
    return ($left === '' || $left === 'days') ? 'ends ' . date('j F Y', $to) : $left . ' left';
}

/** The PC's guarantee line, or null when the rules do not apply. */
function pcm_asset_pc_guarantee($pcDate, $model, $onSupport, $nowTs = null) {
    $keys = pcm_asset_model_keys($model);
    if (!$keys || $keys['brand'] !== 'dell') return null;                 // the rule is written for Dell machines we sold
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$pcDate)) return null;
    $years = $onSupport ? 5 : 1;
    $to = pcm_asset_add_years($pcDate, $years);
    if ($to === '') return null;
    $left = pcm_asset_left($to, $nowTs);
    $text = $onSupport
        ? '365 Techies 5-year guarantee to ' . date('j F Y', strtotime($to . ' 12:00:00 UTC')) . ' - ' . $left . ', while you are on a support plan'
        : '365 Techies 12-month guarantee ' . (strpos($left, 'ended') === 0 ? '(' . $left . ')' : 'to ' . date('j F Y', strtotime($to . ' 12:00:00 UTC')) . ' - ' . $left) . '; customers on a support plan have five years';
    return array('years' => $years, 'from' => (string)$pcDate, 'to' => $to, 'basis' => $onSupport ? 'support' : 'no_support', 'text' => $text);
}

/** The drive's maker's-terms line: terms + bytes written so far + end date when the purchase date is known. */
function pcm_asset_drive_terms_text($terms, $purchaseIso, $tbwWritten, $nowTs = null) {
    if (!is_array($terms)) return '';
    $t = "Maker's guarantee: " . $terms['years'] . ' year' . ($terms['years'] > 1 ? 's' : '');
    if (!empty($terms['tbw'])) $t .= ' or ' . $terms['tbw'] . ' TB written, whichever first';
    elseif (!empty($terms['tbw_cond'])) $t .= " or the drive's rated bytes written, whichever first";
    else $t .= ' from purchase';
    if ($tbwWritten !== null && $tbwWritten !== '' && (float)$tbwWritten >= 0) {
        $w = (float)$tbwWritten;
        $t .= ' - ' . ($w >= 1 ? round($w, 1) . ' TB' : round($w * 1000) . ' GB') . ' written so far';
        if (!empty($terms['tbw'])) $t .= ' (' . max(0, min(100, (int)round(100 * $w / (float)$terms['tbw']))) . '% of the rating)';
    }
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$purchaseIso)) {
        $to = pcm_asset_add_years($purchaseIso, $terms['years']);
        if ($to !== '') { $left = pcm_asset_left($to, $nowTs); $t .= ' - ' . (strpos($left, 'ended') === 0 ? $left : 'to ' . date('j F Y', strtotime($to . ' 12:00:00 UTC'))); }
    }
    return $t;
}

/**
 * For one machine on one customer record: fetch, count, match, then the guarantee lines.
 * Returns the asset block pcm.php stores on the machine and hands to the service-report email.
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
    // the PC's guarantee (support status decides the term)
    $onSupport = ((string)(isset($cust['tier']) ? $cust['tier'] : '') === 'pro');
    if ($m['pc']) $m['pc']['guarantee'] = pcm_asset_pc_guarantee($m['pc']['date'], $model, $onSupport);
    // the maker's terms per drive, matched or not (terms do not need an invoice; the end date does)
    $m['terms'] = array();
    foreach ((array)$drives as $d) {
        if (!is_array($d) || empty($d['model'])) continue;
        $terms = pcm_asset_drive_terms($d['model'], isset($d['sizeGB']) ? $d['sizeGB'] : 0);
        if (!$terms) continue;
        $bought = '';
        foreach ($m['drives'] as $md) if ((string)$md['model'] === (string)$d['model']) { $bought = (string)$md['date']; break; }
        $m['terms'][] = array('model' => (string)$d['model'], 'maker' => $terms['maker'], 'name' => $terms['name'], 'years' => $terms['years'], 'tbw' => $terms['tbw'],
                              'text' => pcm_asset_drive_terms_text($terms, $bought, isset($d['tbw']) ? $d['tbw'] : null));
    }
    $m['computed'] = time();
    return $m;
}

} // function_exists guard
