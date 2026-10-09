<?php
// 365 PC Manager's version as people see it (9 Oct 2026). Owner: "can we say version 36.001 or something ... rather than
// all this 37 ... smaller increments". The app keeps a whole build number that only goes up (its updater compares it -
// check-ins send it as "ver"), and from build 37 also sends the name people see as "vn" ("36.1"). The portal and Slack
// show the name: the one the PC reported, else this table, else the build number as it always was ("36").
// Include-only (denied in .htaccess). Add a line here with each release: build => name.
function pcm_vname($ver, $vn = '')
{
    if (is_string($vn) && preg_match('/^\d{1,3}(\.\d{1,3}){0,2}$/', $vn)) return $vn;
    static $names = array(37 => '36.1');
    $v = (int)$ver;
    if ($v <= 0) return '';
    return isset($names[$v]) ? $names[$v] : (string)$v;
}
// a PC's record (as kept in pcm-data.json) -> its name
function pcm_vname_m($m) { return is_array($m) ? pcm_vname($m['ver'] ?? 0, (string)($m['vn'] ?? '')) : ''; }
