<?php
/*
 * PC Manager's free month - the "free look-over" Slack card and the tidy-up (9 Oct 2026). Used by pcm-lookover.php;
 * here so its test (pcm-lookover-test.php) can check the card against the inbox's lead reader (lc_lead) without a request.
 * Include-only (.htaccess denies it as a URL). Needs pcm-mailmove-lib.php (mm_esc). NO closing tag in this file.
 */
if (!defined('LO_DAYS')) define('LO_DAYS', 120);

// the Slack card (Block Kit + plain fallback). Its first line is what lc_lead recognises - keep the two in step.
function lo_card($f, $id, $until, $now = null) {
    $fields = array(
        array('type' => 'mrkdwn', 'text' => "*Name:*\n" . mm_esc($f['name'])),
        array('type' => 'mrkdwn', 'text' => "*Email:*\n" . mm_esc($f['email'])),
    );
    if ($f['phone'] !== '') $fields[] = array('type' => 'mrkdwn', 'text' => "*Phone:*\n" . mm_esc($f['phone']));
    $fields[] = array('type' => 'mrkdwn', 'text' => "*Report:*\n" . ($f['kind'] === 'service' ? 'Full service' : 'Health check'));
    if ($f['cc'] !== '') $fields[] = array('type' => 'mrkdwn', 'text' => "*Country:*\n" . mm_esc($f['cc']));
    if ($until) $fields[] = array('type' => 'mrkdwn', 'text' => "*Free month ends:*\n" . gmdate('j M Y', (int)$until));
    $blocks = array(
        array('type' => 'header', 'text' => array('type' => 'plain_text', 'text' => "\xF0\x9F\x93\x8B Report look-over: please email back", 'emoji' => true)),
        array('type' => 'section', 'fields' => $fields),
        array('type' => 'section', 'text' => array('type' => 'mrkdwn', 'text' => 'They are on a *free month of PC Manager* and asked a techie to look over their report, free, and email them. '
            . '<https://365techies.co.uk/portal/#lookover=' . $id . '|Open the report> (staff sign-in).')),
    );
    $tz = new DateTimeZone('Europe/London');
    $when = (new DateTime('@' . ($now === null ? time() : $now)))->setTimezone($tz)->format('H:i, D j M');
    $blocks[] = array('type' => 'context', 'elements' => array(array('type' => 'mrkdwn', 'text' => 'via PC Manager' . ($f['ver'] !== '' ? ' v' . mm_esc($f['ver']) : '') . " \xC2\xB7 " . $when)));
    return array('text' => 'Report look-over: please email ' . mm_esc($f['name']) . ' at ' . mm_esc($f['email']), 'blocks' => $blocks, 'unfurl_links' => false);
}
// reports older than LO_DAYS go
function lo_tidy($dir, $now) {
    foreach ((array)@glob(rtrim($dir, '/\\') . '/*.json') as $f) {
        $m = @json_decode((string)@file_get_contents($f), true);
        if (is_array($m) && (int)($m['at'] ?? 0) > 0 && (int)$m['at'] < $now - LO_DAYS * 86400) { @unlink($f); @unlink(substr($f, 0, -5) . '.html'); }
    }
}
