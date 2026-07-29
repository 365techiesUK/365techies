<?php
/**
 * Shared business-team rules. Pure functions and one list - NO output, NO side
 * effects, safe to require from anywhere.
 *
 * This exists as its own file because pcm-booking.php's sign-in path needs these
 * rules BEFORE it decides whether to create a SimplyBook client, and requiring
 * pcm-team.php would execute an endpoint. See pcm-team.php for the model.
 */

// Free/public mail providers. A company domain must be a domain the COMPANY
// controls - registering one of these would auto-admit anyone on earth. This is
// the single most important list in the team feature: one typo ("outlook.com")
// without it would hand a customer's account to the entire internet.
// Deliberately generous - a false refusal costs one phone call, a false
// acceptance costs a customer's account.
$PUBLIC_DOMAINS = array(
    'gmail.com','googlemail.com','outlook.com','outlook.co.uk','hotmail.com','hotmail.co.uk','live.com','live.co.uk',
    'msn.com','yahoo.com','yahoo.co.uk','ymail.com','aol.com','aol.co.uk','icloud.com','me.com','mac.com',
    'btinternet.com','btopenworld.com','talktalk.net','talk21.com','sky.com','virginmedia.com','ntlworld.com',
    'blueyonder.co.uk','plus.net','plusnet.com','tiscali.co.uk','orange.net','wanadoo.co.uk',
    'freeserve.co.uk','proton.me','protonmail.com','pm.me','gmx.com','gmx.co.uk','mail.com','zoho.com',
    'yandex.com','fastmail.com','fastmail.fm','hushmail.com','inbox.com','rocketmail.com','o2.co.uk',
    'ee.co.uk','vodafone.co.uk','three.co.uk','tesco.net','virgin.net','supanet.com','googlemail.co.uk',
    // our own domain: 365 staff sign in through the allow-list, never as a customer's employee
    '365techies.co.uk','365computers.com'
);

/**
 * Validate a domain for use as a company domain. Returns the cleaned domain, or
 * '' if it must be refused.
 */
if (!function_exists('team_domain_ok')) {
function team_domain_ok($d, $publicList){
    $d = strtolower(trim((string)$d));
    $d = preg_replace('/^@+/', '', $d);
    if ($d === '' || strlen($d) > 80) return '';
    if (!preg_match('/^[a-z0-9]([a-z0-9\-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]*[a-z0-9])?)+$/', $d)) return '';
    if (in_array($d, $publicList, true)) return '';
    return $d;
}}

/**
 * Find the org a signing-in email belongs to.
 * Returns array(orgKey, emailLower, isNewMember) or null.
 *
 * An existing member is matched on their exact address whatever domain it is on
 * (a director may add a contractor on a different domain). Otherwise the
 * company's registered domain admits them, but ONLY while that company is on a
 * live support plan - a lapsed account must not keep auto-admitting people.
 */
if (!function_exists('team_find_org')) {
function team_find_org(&$db, $email, $publicList){
    $email = strtolower(trim((string)$email));
    if ($email === '' || strpos($email, '@') === false) return null;
    if (empty($db['customers']) || !is_array($db['customers'])) return null;
    foreach ($db['customers'] as $k => $c) {
        if (empty($c['org']['members']) || !is_array($c['org']['members'])) continue;
        if (isset($c['org']['members'][$email])) return array($k, $email, false);
    }
    $at = strrchr($email, '@');
    $dom = $at === false ? '' : strtolower(substr($at, 1));
    if ($dom === '' || in_array($dom, $publicList, true)) return null;
    foreach ($db['customers'] as $k => $c) {
        if (empty($c['org']['domains']) || !is_array($c['org']['domains'])) continue;
        foreach ($c['org']['domains'] as $d) {
            if (strtolower((string)$d) !== $dom) continue;
            if ((($c['tier'] ?? 'free') !== 'pro')) return null;
            return array($k, $email, true);
        }
    }
    return null;
}}

/**
 * The machine ids a signed-in person may see, or null for "everything".
 * A staff member sees only the computers assigned to them - the owner's
 * decision, and the one that survives an employee asking what their boss can
 * see about them.
 */
if (!function_exists('team_visible_pcs')) {
function team_visible_pcs($c, $memberEmail){
    if ($memberEmail === '') return null;                       // the account holder
    $m = isset($c['org']['members'][$memberEmail]) ? $c['org']['members'][$memberEmail] : null;
    if (!$m) return array();                                     // removed mid-session: show nothing
    if ((($m['role'] ?? 'staff') === 'manager')) return null;
    $pcs = isset($m['pcs']) && is_array($m['pcs']) ? $m['pcs'] : array();
    return array_values(array_filter(array_map('strval', $pcs)));
}}
