<?php
/*
 * 365 PC Manager v36 - which country this PC is in, for Music > Radio (owner, 7 Oct 2026: "different radio stations
 * depending what country it's in"). Radio stations license their streams for listeners in their own country (music
 * licensing is territorial - PPL/PRS in the UK, SoundExchange and the PROs in the US), so the app lists only the stations
 * of the country the PC is in: the rule TuneIn and Radio Garden have followed for UK listeners since the 2019 High Court
 * ruling (Warner Music & Sony Music v TuneIn).
 * The caller's address is looked up in our own table (pcm-geoip-lib.php, DB-IP Lite) and NOTHING is stored or logged.
 * GET -> {"cc":"GB"}   ("" when the address isn't known; the app then uses Windows' own country setting). The app asks
 * at most once a day. Deploys WITH PC Manager v36.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/pcm-geoip-lib.php';
echo json_encode(array('cc' => geo_cc(isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '')));
