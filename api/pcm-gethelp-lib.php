<?php
/*
 * The 365 Get Help browser add-on (Chrome Web Store, 2 Oct 2026): "Ring me back" from any web page.
 * Used by pcm-gethelp.php. Built on the free Virgin email tools' library (pcm-mailmove-lib.php): the same UK phone
 * check, name cleaning, day's rate counter (the one sha1-named store) and #365-job-tracker webhook.
 *
 * The card's first line, "Get Help button: please ring <name> on <phone>", is what pcm-leadchase-lib.php lc_lead()
 * knows it by (kind callback, label "Get Help button"), so it reaches the lead reminders and the portal's inbox
 * (comms-lib.php comms_lead_from_post) like every other call-back. Change the line and both must change with it.
 *
 * The page the customer was on is sent ONLY when they tick "Tell 365 which page I'm on", and only its address without
 * the ?query or #part (those can carry sign-in links and codes). The card shows it as code, not a link, so nobody here
 * opens a scam page by accident.
 *
 * FUNCTIONS ONLY: nothing prints or runs on its own (.htaccess denies it too). Include at TOP-LEVEL scope.
 * Tested by pcm-gethelp-test.php (CLI only). NO closing tag in this file.
 */

if (!function_exists('gh_what')) {

// What's wrong: the add-on's four choices. Anything else reads as "Something else".
function gh_whats() {
    return array('scary' => 'A scary warning or pop-up', 'scammed' => 'I think I have been scammed',
                 'broken' => 'Something is not working', 'other' => 'Something else');
}
function gh_what($v) {
    $w = gh_whats();
    $v = is_scalar($v) ? strtolower(trim((string)$v)) : '';
    return isset($w[$v]) ? $v : 'other';
}

// The page they were on: an http(s) address without its ?query or #part, at most 300 characters; '' when it is not one.
function gh_page($v) {
    if (!is_scalar($v)) return '';
    $v = trim((string)$v);
    if ($v === '' || strlen($v) > 2000 || !preg_match('#^https?://[^\s/?\#]+[^\s]*$#i', $v)) return '';
    $v = preg_replace('/[?#].*$/s', '', $v);
    if (!preg_match('#^(https?)://([^\s/?\#@]+)(/[^\s]*)?$#i', $v, $m)) return '';
    $host = strtolower($m[2]);
    if (!preg_match('/^[a-z0-9.\-]+(:\d{1,5})?$/', $host)) return '';
    $out = strtolower($m[1]) . '://' . $host . (isset($m[3]) ? $m[3] : '');
    return strlen($out) > 300 ? substr($out, 0, 300) : $out;
}

// A short message, one line, at most 500 characters (mm_clean folds new lines into spaces).
function gh_message($v) {
    $v = mm_clean($v);
    if (mm_len($v) > 500) $v = preg_match('/^.{0,500}/us', $v, $m) ? rtrim($m[0]) . '...' : '';
    return $v;
}

/* The Slack card (Block Kit + a plain-text fallback). $f: name, phone, what, message, page, ver. */
function gh_card($f, $now = null) {
    $w = gh_whats();
    $what = isset($w[$f['what']]) ? $w[$f['what']] : $w['other'];
    $fields = array(
        array('type' => 'mrkdwn', 'text' => "*Name:*\n" . mm_esc($f['name'])),
        array('type' => 'mrkdwn', 'text' => "*Phone:*\n" . mm_esc($f['phone'])),
        array('type' => 'mrkdwn', 'text' => "*Needs help with:*\n" . mm_esc($what)),
    );
    // the page as code: Slack does not make it a link, so a scam page is never one click away
    if ($f['page'] !== '') $fields[] = array('type' => 'mrkdwn', 'text' => "*Page they were on:*\n`" . str_replace('`', "'", mm_esc($f['page'])) . '`');
    $blocks = array(
        array('type' => 'header', 'text' => array('type' => 'plain_text', 'text' => "\xF0\x9F\x86\x98 Get Help button: please ring back", 'emoji' => true)),
        array('type' => 'section', 'fields' => $fields),
    );
    if ($f['message'] !== '') $blocks[] = array('type' => 'section', 'text' => array('type' => 'mrkdwn', 'text' => "*Message:*\n>" . mm_esc($f['message'])));
    $note = 'They pressed *Ring me back* in the 365 Get Help add-on in their browser.';
    if ($f['what'] === 'scary' || $f['what'] === 'scammed')
        $note .= ' *Possible scam:* ask whether they rang a number, paid anything, gave a code or let anyone onto the PC.';
    $blocks[] = array('type' => 'section', 'text' => array('type' => 'mrkdwn', 'text' => $note));
    $tz = new DateTimeZone('Europe/London');
    $when = (new DateTime('@' . ($now === null ? time() : $now)))->setTimezone($tz)->format('H:i, D j M');
    $blocks[] = array('type' => 'context', 'elements' => array(array('type' => 'mrkdwn', 'text' => 'via the 365 Get Help add-on' . ($f['ver'] !== '' ? ' v' . mm_esc($f['ver']) : '') . ' · ' . $when)));
    return array('text' => 'Get Help button: please ring ' . mm_esc($f['name']) . ' on ' . mm_esc($f['phone']), 'blocks' => $blocks, 'unfurl_links' => false);
}

// CORS for the add-on: it calls from chrome-extension://<its id> (Edge, Brave and Chrome alike) with no special
// permissions, so the reply must allow that origin. Our own site needs no header. Returns the origin to allow, or ''.
function gh_cors_origin($origin) {
    $origin = (string)$origin;
    return preg_match('#^chrome-extension://[a-p]{32}$#', $origin) ? $origin : '';
}

}
