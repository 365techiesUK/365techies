<?php
/*
 * IP address -> country, from DB-IP's free "IP to Country Lite" table (https://db-ip.com, CC BY 4.0; credited on
 * the privacy page). 1 Oct 2026, for counting 365 PC Manager installs by country (pcm-installs-lib.php).
 *
 * The tables (api/geoip/geo4.bin, geo6.bin, built by tools/geoip_build.py) are sorted fixed-width records - a range
 * start then a two-letter country - searched with a handful of small reads, never loaded whole. The address is used
 * for the lookup and nothing else: no caller stores it.
 *
 * geo_cc('86.163.78.248') -> 'GB';  an unknown, private or reserved address -> ''.
 * Include-only (.htaccess denies it as a URL). NO closing tag in this file.
 */
function geo_cc($ip, $dir = null) {
    $dir = $dir === null ? __DIR__ . '/geoip' : $dir;
    $bin = @inet_pton(trim((string)$ip));
    if ($bin === false || $bin === null) return '';
    if (strlen($bin) === 16) {
        // an IPv4 address carried in IPv6 (::ffff:a.b.c.d) is looked up as IPv4
        if (substr($bin, 0, 12) === str_repeat("\0", 10) . "\xff\xff") { $bin = substr($bin, 12); $file = $dir . '/geo4.bin'; $w = 4; }
        else { $bin = substr($bin, 0, 8); $file = $dir . '/geo6.bin'; $w = 8; }
    } else { $file = $dir . '/geo4.bin'; $w = 4; }
    $rec = $w + 2;
    $size = @filesize($file);
    if (!$size || $size % $rec !== 0) return '';
    $h = @fopen($file, 'rb');
    if (!$h) return '';
    // the last record whose start <= the address (big-endian bytes compare in numeric order)
    $lo = 0; $hi = (int)($size / $rec) - 1; $found = -1;
    while ($lo <= $hi) {
        $mid = ($lo + $hi) >> 1;
        fseek($h, $mid * $rec);
        $start = fread($h, $w);
        if (strcmp($start, $bin) <= 0) { $found = $mid; $lo = $mid + 1; } else { $hi = $mid - 1; }
    }
    $cc = '';
    if ($found >= 0) { fseek($h, $found * $rec + $w); $cc = (string)fread($h, 2); }
    fclose($h);
    return preg_match('/^[A-Z]{2}$/', $cc) ? $cc : '';
}
