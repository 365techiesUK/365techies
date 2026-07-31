<?php
/**
 * Textmagic SMS library — shared send/balance helpers for 365 Techies.
 *
 * SECURITY: the API key is NOT in this file and NOT in git (the repo is PUBLIC).
 * It lives in api/tm-key.php on the server only (gitignored + .htaccess-denied):
 *
 *     <?php
 *     $TM_USERNAME = '365techies';
 *     $TM_KEY      = 'your-api-v2-key-here';
 *
 * Credentials are extracted BY PATTERN rather than require()'d, so a stray
 * second "<?php" or odd formatting from a File Manager paste cannot cause a
 * fatal error — the exact gotcha that broke the VRM token file once already.
 *
 * COST + ABUSE SAFETY (every send costs real money, so these are not optional):
 *   - hard site-wide rate limit, tracked in tm-rate.json
 *   - a daily send ceiling, so a loop bug cannot drain the account overnight
 *   - recipients normalised to E.164 and validated before anything is sent
 *   - $TM_DRYRUN lets you exercise the whole path without spending a penny
 *
 * CONSENT: this library is deliberately dumb about policy. It sends what it is
 * told to. Anything that texts a CUSTOMER must be either (a) human-initiated,
 * or (b) a service message to someone who gave us their number for that purpose
 * (a booking, a job). Do NOT wire it to bulk/marketing sends without checking
 * PECR consent first — see the note in tm-send.php.
 */

if (!defined('TM_LIB')) {
    define('TM_LIB', 1);

    $TM_RATE_PER_MIN = 6;      // burst ceiling
    $TM_RATE_PER_DAY = 60;     // daily ceiling - a runaway loop stops here
    $TM_DRYRUN       = false;  // true = validate + log, never call the API

    /** Read credentials from the server-only key file. Returns [user, key] or ['','']. */
    function tm_creds() {
        $f = __DIR__ . '/tm-key.php';
        if (!is_file($f)) return array('', '');
        $src = (string)@file_get_contents($f);
        $u = preg_match('/\$TM_USERNAME\s*=\s*[\'"]([^\'"]+)[\'"]/', $src, $m1) ? $m1[1] : '';
        $k = preg_match('/\$TM_KEY\s*=\s*[\'"]([^\'"]+)[\'"]/', $src, $m2) ? $m2[1] : '';
        return array($u, $k);
    }

    function tm_configured() { list($u, $k) = tm_creds(); return $u !== '' && $k !== ''; }

    /**
     * Normalise a UK number to E.164. Returns '' if it cannot be trusted.
     * Deliberately conservative: we would rather refuse than text a stranger.
     */
    function tm_number($raw) {
        $n = preg_replace('/[^0-9+]/', '', (string)$raw);
        if ($n === '') return '';
        if (strpos($n, '00') === 0)  $n = '+' . substr($n, 2);
        if (strpos($n, '07') === 0)  $n = '+44' . substr($n, 1);   // UK mobile
        if (strpos($n, '447') === 0) $n = '+' . $n;
        if (strpos($n, '01') === 0 || strpos($n, '02') === 0) $n = '+44' . substr($n, 1);
        if ($n[0] !== '+') return '';
        $digits = preg_replace('/\D/', '', $n);
        if (strlen($digits) < 10 || strlen($digits) > 15) return '';
        return '+' . $digits;
    }

    /** True when the number is a UK mobile (the only kind an SMS can reach). */
    function tm_is_mobile($e164) { return (bool)preg_match('/^\+447\d{9}$/', $e164); }

    /** Rate limiter. Returns '' when allowed, or a reason string when blocked. */
    function tm_rate_check($n = 1) {
        global $TM_RATE_PER_MIN, $TM_RATE_PER_DAY;
        $f = __DIR__ . '/tm-rate.json';
        $now = time(); $min = (int)floor($now / 60); $day = date('Y-m-d', $now);
        $r = array('min' => $min, 'minCount' => 0, 'day' => $day, 'dayCount' => 0);
        if (is_file($f)) { $j = json_decode((string)@file_get_contents($f), true); if (is_array($j)) $r = $j + $r; }
        if (($r['min'] ?? 0) !== $min)   { $r['min'] = $min; $r['minCount'] = 0; }
        if (($r['day'] ?? '') !== $day)  { $r['day'] = $day; $r['dayCount'] = 0; }
        if ($r['minCount'] + $n > $TM_RATE_PER_MIN) return 'rate-minute';
        if ($r['dayCount'] + $n > $TM_RATE_PER_DAY) return 'rate-day';
        $r['minCount'] += $n; $r['dayCount'] += $n;
        $tmp = $f . '.tmp';
        if (@file_put_contents($tmp, json_encode($r)) !== false) @rename($tmp, $f);
        return '';
    }

    /**
     * Send one SMS. Returns array(ok=>bool, error=>string, id=>int, dry=>bool).
     * $text is trimmed to 700 chars (Textmagic splits long messages into parts,
     * and each part is charged - so this is a cost guard, not a technical limit).
     */
    function tm_send($to, $text, $reference = '') {
        global $TM_DRYRUN;
        list($user, $key) = tm_creds();
        if ($user === '' || $key === '') return array('ok' => false, 'error' => 'not-configured');

        $num = tm_number($to);
        if ($num === '')            return array('ok' => false, 'error' => 'bad-number');
        if (!tm_is_mobile($num))    return array('ok' => false, 'error' => 'not-a-mobile');

        $text = trim((string)$text);
        if ($text === '')           return array('ok' => false, 'error' => 'empty-text');
        if (strlen($text) > 700)    $text = substr($text, 0, 697) . '...';

        $blocked = tm_rate_check(1);
        if ($blocked !== '')        return array('ok' => false, 'error' => $blocked);

        if ($TM_DRYRUN) {
            tm_log($num, $reference, 'dry-run', 0);
            return array('ok' => true, 'dry' => true, 'id' => 0, 'error' => '');
        }

        $ch = curl_init('https://rest.textmagic.com/api/v2/messages');
        curl_setopt_array($ch, array(
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query(array('text' => $text, 'phones' => $num)),
            CURLOPT_HTTPHEADER     => array('X-TM-Username: ' . $user, 'X-TM-Key: ' . $key),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_PROTOCOLS      => CURLPROTO_HTTPS,
        ));
        $body = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $j = json_decode((string)$body, true);
        if ($code >= 200 && $code < 300) {
            $id = isset($j['id']) ? (int)$j['id'] : 0;
            tm_log($num, $reference, 'sent', $id);
            return array('ok' => true, 'id' => $id, 'error' => '');
        }
        // never echo the response verbatim - it can contain account detail
        $err = 'http-' . $code;
        if (is_array($j) && isset($j['message'])) $err .= ': ' . substr((string)$j['message'], 0, 120);
        tm_log($num, $reference, 'fail ' . $err, 0);
        return array('ok' => false, 'error' => $err);
    }

    /** Account balance - the cheapest possible "are the credentials right?" test. */
    function tm_balance() {
        list($user, $key) = tm_creds();
        if ($user === '' || $key === '') return array('ok' => false, 'error' => 'not-configured');
        $ch = curl_init('https://rest.textmagic.com/api/v2/user');
        curl_setopt_array($ch, array(
            CURLOPT_HTTPHEADER     => array('X-TM-Username: ' . $user, 'X-TM-Key: ' . $key),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_PROTOCOLS      => CURLPROTO_HTTPS,
        ));
        $body = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $j = json_decode((string)$body, true);
        if ($code >= 200 && $code < 300 && is_array($j)) {
            return array('ok' => true, 'error' => '',
                         'balance'  => isset($j['balance']) ? $j['balance'] : null,
                         'currency' => isset($j['currency']['id']) ? $j['currency']['id'] : '',
                         'username' => isset($j['username']) ? $j['username'] : '');
        }
        return array('ok' => false, 'error' => 'http-' . $code);
    }

    /**
     * Audit trail. Records THAT a message went out, never its content -
     * message bodies can carry customer detail and this file is on disk.
     * Last 300 entries only.
     */
    function tm_log($num, $reference, $status, $id) {
        $f = __DIR__ . '/tm-log.json';
        $rows = array();
        if (is_file($f)) { $j = json_decode((string)@file_get_contents($f), true); if (is_array($j)) $rows = $j; }
        // store the number partially masked - enough to trace, not a contact list
        $masked = strlen($num) > 6 ? substr($num, 0, 6) . str_repeat('*', max(0, strlen($num) - 8)) . substr($num, -2) : '***';
        $rows[] = array('t' => time(), 'to' => $masked, 'ref' => substr((string)$reference, 0, 40),
                        'status' => substr((string)$status, 0, 60), 'id' => (int)$id);
        if (count($rows) > 300) $rows = array_slice($rows, -300);
        $tmp = $f . '.tmp';
        if (@file_put_contents($tmp, json_encode($rows)) !== false) @rename($tmp, $f);
    }
}
