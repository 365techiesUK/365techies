<?php
/**
 * Phone numbers on the customer record - shared by pcm.php (the customer's own
 * portal save + overview), pcm-booking.php (the staff contact card) and the
 * test file. No side effects, no closing tag: safe to include anywhere.
 *
 * The customer types whatever they like; we store ONE tidy form per number:
 *   - a UK number we can trust becomes E.164 ("+441202775566", "+447700900123"),
 *     which is exactly what comms-lib's number->name matcher compares against
 *     (tm_number() normalises to the same form), so a text or voicemail from
 *     that number is named the moment it is saved;
 *   - anything else (overseas, extensions, an odd format) is KEPT, tidied and
 *     capped, never rejected - the same rule as postcodes: a refused number is
 *     worse than an odd-looking one, and the customer knows their own number.
 * Fields written: customers[key]['tel'] (landline) and ['mobile'] - both names
 * are already in comms_match_fields(), so nothing else has to learn them.
 */
if (!function_exists('pcm_phone_norm')) {

    /** One number in, one stored form out ('' when blank). */
    function pcm_phone_norm($raw) {
        $s = trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', (string)$raw));
        if ($s === '') return '';
        $n = preg_replace('/[^0-9+]/', '', $s);
        if ($n === '' || $n === '+') return '';
        if (strpos($n, '00') === 0) $n = '+' . substr($n, 2);
        if (preg_match('/^0[1-9]/', $n)) $n = '+44' . substr($n, 1);           // UK national form
        elseif (preg_match('/^44[1-9]\d{8,}$/', $n)) $n = '+' . $n;            // 44... with the + dropped
        if ($n[0] === '+') {
            $digits = substr($n, 1);
            if (ctype_digit($digits) && strlen($digits) >= 10 && strlen($digits) <= 15) return '+' . $digits;
        }
        // Not something we can trust as a dialable E.164 - keep what they typed, tidied.
        $keep = preg_replace('/[^0-9+ ()\-]/', '', $s);
        $keep = trim(preg_replace('/\s{2,}/', ' ', $keep));
        return substr($keep, 0, 24);
    }

    /** What the portal and the staff card are given for one customer record. */
    function pcm_phones_payload($c) {
        $tel = is_array($c) && isset($c['tel']) && is_scalar($c['tel']) ? (string)$c['tel'] : '';
        $mob = is_array($c) && isset($c['mobile']) && is_scalar($c['mobile']) ? (string)$c['mobile'] : '';
        return array('tel'=>$tel, 'mobile'=>$mob,
                     'tel_display'=>pcm_phone_display($tel), 'mobile_display'=>pcm_phone_display($mob));
    }

    /** Stored form -> how a person in the UK writes it. Non-UK forms come back as stored. */
    function pcm_phone_display($stored) {
        $s = (string)$stored;
        if (!preg_match('/^\+44(\d{10})$/', $s, $m)) return $s;
        $d = '0' . $m[1];
        if ($d[1] === '7') return substr($d, 0, 5) . ' ' . substr($d, 5);                               // 07700 900123
        if ($d[1] === '2') return substr($d, 0, 3) . ' ' . substr($d, 3, 4) . ' ' . substr($d, 7);       // 020 7946 0000
        if (preg_match('/^01[1-9]1|^011[1-9]/', $d)) return substr($d, 0, 4) . ' ' . substr($d, 4, 3) . ' ' . substr($d, 7);   // 0113 496 0000
        return substr($d, 0, 5) . ' ' . substr($d, 5);                                                   // 01202 775566
    }
}
