<?php
/**
 * 365 PC Manager - app-facing licensing + telemetry API.
 * The tray app POSTs JSON here. Server-only data store (gitignored).
 *
 *  action=activate {key, machine, name}   -> validates a licence key, binds the machine, returns tier+customer+next
 *  action=checkin  {key, machine, score}  -> records health; returns current tier (so lapsed support downgrades)
 *  action=help     {key, machine, message}-> relays a panic request to Slack (via slack-lead.php webhook file)
 *
 * Data file api/pcm-data.json:
 *  { "customers": { "<KEY>": {name, email, tier, next, created, machines:{<id>:{name,score,verdict,seen}} } } }
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$DATA = __DIR__ . '/pcm-data.json';
$WEBHOOK = __DIR__ . '/slack-webhook.php'; // returns $SLACK_WEBHOOK (server-only, gitignored)

// Safe-maintenance allow-list. The APP holds the real gate: it maps each id to a hard-coded,
// parameter-free, non-destructive routine and ignores anything not in its own switch. The server
// never sends a command string or arguments - only one of these fixed ids. Validating here too
// is defence-in-depth: a bad/unknown id can't even be queued. Nothing here deletes user data,
// changes settings permanently, installs software, or reads personal files. Each runs without
// elevation and without spawning processes or touching the registry (keeps the unsigned binary
// from tripping AV heuristics). Disruptive/admin fixes arrive later with the signed elevated helper.
$PCM_CMDS = array('flushdns','cleartemp','collectlogs');

// Load the DB. A missing file is a legitimately-empty DB; a PRESENT-but-unparseable file is
// NOT - returning empty there and saving would silently wipe every customer. So we throw.
function load($f){
    if (!file_exists($f)) return array('customers'=>array());
    $raw = (string)@file_get_contents($f);
    if ($raw === '') return array('customers'=>array());
    $d = json_decode($raw, true);
    if (!is_array($d)) { http_response_code(503); exit(json_encode(array('ok'=>false,'error'=>'db_unavailable'))); }
    if (!isset($d['customers'])) $d['customers'] = array();
    return $d;
}
// Atomic write (temp + rename) so a crash mid-write can't leave a torn file that load() rejects.
function save($f,$d){
    $tmp = $f . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($d, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) @rename($tmp, $f);
}
function out($a){ echo json_encode($a); exit; }

// Serialise the whole read-modify-write so concurrent check-ins / the SimplyBook callback
// can't lost-update each other. Returns the lock handle (release by fclose).
function db_lock($f){ $lk = @fopen($f . '.lock', 'c'); if ($lk) @flock($lk, LOCK_EX); return $lk; }

$raw = file_get_contents('php://input');
$in = json_decode($raw, true);
if (!is_array($in)) out(array('ok'=>false,'error'=>'bad_request'));

$action  = isset($in['action'])  ? preg_replace('/[^a-z]/','',$in['action']) : '';
$key     = isset($in['key'])      ? strtoupper(preg_replace('/[^A-Za-z0-9\-]/','',$in['key'])) : '';
$machine = isset($in['machine'])  ? preg_replace('/[^a-f0-9]/','',substr($in['machine'],0,32)) : '';

$db_lock = db_lock($DATA); // held until this request exits; serialises read-modify-write
$db = load($DATA);
$now = gmdate('Y-m-d H:i');

if ($action === 'activate') {
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key'));
    $c =& $db['customers'][$key];
    // any valid key binds the machine and registers it for health monitoring; tier decides features
    $tier = (($c['tier'] ?? 'free') === 'pro') ? 'pro' : 'free';
    if (!isset($c['machines'])) $c['machines'] = array();
    if ($machine !== '' && !isset($c['machines'][$machine]) && count($c['machines']) < 25)
        $c['machines'][$machine] = array('name'=>substr((string)($in['name']??''),0,60),'score'=>0,'verdict'=>'','seen'=>$now,'activated'=>$now);
    save($DATA,$db);
    out(array('ok'=>true,'tier'=>$tier,'customer'=>$c['name'] ?? '','next'=>$c['next'] ?? ''));
}

if ($action === 'checkin') {
    $upd = pcm_update_info();   // latest app build (ver/url/sha) - sent to every check-in, keyed or not
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>true,'tier'=>'free') + $upd); // key gone => downgrade
    $c =& $db['customers'][$key];
    $tier = ($c['tier'] ?? 'free');
    if ($machine !== '') {
        if (!isset($c['machines'])) $c['machines'] = array();
        // abuse cap: one key registers a sane number of machines, not unbounded DB/disk growth
        if (!isset($c['machines'][$machine]) && count($c['machines']) >= 25)
            out(array('ok'=>true,'tier'=>$tier) + $upd);
        $c['machines'][$machine] = array_merge($c['machines'][$machine] ?? array(), array(
            'name'=>substr((string)($in['name']??($c['machines'][$machine]['name']??'')),0,60),
            'score'=>intval($in['score']??0), 'verdict'=>substr((string)($in['verdict']??''),0,24), 'seen'=>$now,
            'av'=>substr((string)($in['av']??''),0,8), 'backup'=>!empty($in['backup']),
            'diskpct'=>intval($in['diskpct']??0), 'w10'=>!empty($in['w10']), 'reboot'=>!empty($in['reboot']),
            'ver'=>intval($in['ver']??0),
            'crs'=>substr((string)($in['crs']??''),0,8), 'crst'=>substr((string)($in['crst']??''),0,420),
            'batt'=>max(0,min(100,intval($in['batt']??0))),
            // customer's in-app "let 365 run safe maintenance" consent. Old apps never send it,
            // so it defaults OFF here every check-in - a machine can only be opted IN by v18+.
            'rmaint'=>!empty($in['rmaint'])));
        // opting OUT of remote maintenance clears any queued commands, so a command the customer
        // just revoked can never resurrect and run when they later opt back in.
        if (empty($in['rmaint'])) unset($c['machines'][$machine]['cmdq']);
        // daily score history for the portal trend (one point per day, ~90 days)
        $hd = gmdate('Y-m-d');
        $hist = isset($c['machines'][$machine]['hist']) && is_array($c['machines'][$machine]['hist']) ? $c['machines'][$machine]['hist'] : array();
        $nH = count($hist);
        if ($nH > 0 && $hist[$nH-1][0] === $hd) $hist[$nH-1][1] = intval($in['score']??0);
        else { $hist[] = array($hd, intval($in['score']??0)); if (count($hist) > 90) array_shift($hist); }
        $c['machines'][$machine]['hist'] = $hist;
        unset($c['machines'][$machine]['req_check']);   // this IS a fresh check-in - request satisfied
        // reminder preferences (for the SMS cron): minutes-before + wants-sms
        if (isset($in['remind_min'])) $c['remind_min'] = max(5, min(2880, intval($in['remind_min'])));
        if (isset($in['remind_sms'])) $c['remind_sms'] = !empty($in['remind_sms']);
        save($DATA,$db);
    }
    // ready = the owner has asked this customer to confirm their PC is on and ready to connect
    $ready = (!empty($c['ready_ask']) && empty($c['ready_confirm'])) ? $c['ready_ask'] : '';
    // family view state, so the app's "Shared with ..." card survives reinstalls
    $fam = isset($c['family']['name']) ? (string)$c['family']['name'] : '';
    $famUrl = isset($c['family']['token']) ? 'https://365techies.co.uk/family/?c='.$c['family']['token'] : '';
    out(array('ok'=>true,'tier'=>$tier,'next'=>$c['next'] ?? '','next_ts'=>intval($c['next_ts'] ?? 0),'ready'=>$ready,'fam'=>$fam,'fam_url'=>$famUrl) + $upd);
}

// latest published app build, from the git-deployed manifest (downloads/pcm/version.json).
// Absent/unreadable manifest = no update offered - the app treats missing fields as "up to date".
function pcm_update_info() {
    $f = __DIR__ . '/../downloads/pcm/version.json';
    if (!is_readable($f)) return array();
    $raw = (string)@file_get_contents($f);
    if (substr($raw, 0, 3) === "\xEF\xBB\xBF") $raw = substr($raw, 3);   // tolerate a UTF-8 BOM
    $j = json_decode($raw, true);
    if (!is_array($j) || empty($j['ver']) || empty($j['url']) || empty($j['sha256'])) return array();
    return array('upd_ver'=>intval($j['ver']), 'upd_url'=>(string)$j['url'], 'upd_sha'=>(string)$j['sha256']);
}

if ($action === 'ready') {
    // the customer tapped "my PC is ready to connect" - stamp it + tell the tech on Slack
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key'));
    $c =& $db['customers'][$key];
    $c['ready_confirm'] = $now; unset($c['ready_ask']);
    save($DATA,$db);
    $clean = function($s){ return str_replace(array("\r","\n",'<','>','&'), array(' ',' ','&lt;','&gt;','&amp;'), (string)$s); };
    $cust = $clean(substr((string)($c['name'] ?? '(customer)'),0,60));
    $sent = false;
    if (file_exists($WEBHOOK)) {
        include $WEBHOOK;
        if (!empty($SLACK_WEBHOOK)) {
            $text = ":white_check_mark: *PC ready to connect*\n*".$cust."* confirmed their computer is on and ready for you.\nMachine ".$machine." · key ".$key;
            $ch = curl_init($SLACK_WEBHOOK);
            curl_setopt_array($ch, array(CURLOPT_POST=>true, CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>6,
                CURLOPT_HTTPHEADER=>array('Content-Type: application/json'), CURLOPT_POSTFIELDS=>json_encode(array('text'=>$text))));
            $r = curl_exec($ch); $sent = ($r === 'ok'); curl_close($ch);
        }
    }
    out(array('ok'=>true,'sent'=>$sent));
}

// Portal overview: everything the signed-in customer's dashboard shows. Web sessions present
// an expiring wtoken (minted at sign-in, resolved + slid here); the app may use its key.
/* The customer's own postal address. Saved by them, so David is not chasing it at
   invoicing time. Account-level data belongs to the account holder: a company team
   member is refused, exactly like billing above.
   ⚠ Action names are sanitised to lowercase letters only upstream - 'custaddr' is
   safe, 'cust_addr' or 'setAddr' would silently become something else. */
if ($action === 'custaddr') {
    $wt = isset($in['wtoken']) ? preg_replace('/[^a-f0-9]/','', (string)$in['wtoken']) : '';
    if ($wt === '') out(array('ok'=>false,'error'=>'expired'));
    $ws = isset($db['websessions'][$wt]) ? $db['websessions'][$wt] : null;
    if ($ws && !empty($ws['forever'])) { $slide = 31536000; $cap = PHP_INT_MAX; }
    else { $slide = ($ws && !empty($ws['long'])) ? 5184000 : 43200; $cap = ($ws && !empty($ws['long'])) ? 7776000 : 86400; }
    $fresh = $ws && intval($ws['ts'] ?? 0) > time() - $slide && ($cap === PHP_INT_MAX || intval($ws['iat'] ?? 0) > time() - $cap);
    if ($fresh && !empty($ws['machine']) && $ws['machine'] !== $machine) $fresh = false;
    if (!$fresh) { if ($ws) { unset($db['websessions'][$wt]); save($DATA,$db); } out(array('ok'=>false,'error'=>'expired')); }
    if (!empty($ws['viewas'])) out(array('ok'=>false,'error'=>'expired'));           // staff impersonation never writes
    if (!empty($ws['member'])) out(array('ok'=>false,'error'=>'ask_your_manager'));  // account data is the director's
    $key = (string)$ws['key'];
    if (!isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key'));

    $clean = function ($v, $max) {
        $s = trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', (string)$v));
        $s = preg_replace('/\s{2,}/', ' ', $s);
        return function_exists('mb_substr') ? mb_substr($s, 0, $max, 'UTF-8') : substr($s, 0, $max);
    };
    $line1 = $clean(isset($in['line1']) ? $in['line1'] : '', 90);
    $line2 = $clean(isset($in['line2']) ? $in['line2'] : '', 90);
    $city  = $clean(isset($in['city'])  ? $in['city']  : '', 60);
    $pc    = strtoupper($clean(isset($in['postcode']) ? $in['postcode'] : '', 12));
    // normalise the space in a UK postcode, but never REJECT one - overseas customers
    // and BFPO exist, and a refused address is worse than an odd-looking one
    $pcSquash = preg_replace('/\s+/', '', $pc);
    if (preg_match('/^([A-Z]{1,2}[0-9][A-Z0-9]?)([0-9][A-Z]{2})$/', $pcSquash, $pm)) $pc = $pm[1] . ' ' . $pm[2];

    if ($line1 === '' && $line2 === '' && $city === '' && $pc === '') {
        unset($db['customers'][$key]['addr']);                                       // cleared on purpose
    } else {
        $db['customers'][$key]['addr'] = array('line1'=>$line1, 'line2'=>$line2, 'city'=>$city,
            'postcode'=>$pc, 'ts'=>time(), 'by'=>'customer');
    }
    /* Phone numbers ride on the same save, under the same lock, WHEN the editor
       sends them (the portal "Your details" card does; the booking step never
       does, so a booking can never blank a number). Stored as customers[key]['tel']
       and ['mobile'] - the names comms-lib already matches inbound texts and
       voicemails against - in the tidy form pcm-phone-lib.php describes. Blank
       clears that one number on purpose; never refused (see the lib). */
    require_once __DIR__ . '/pcm-phone-lib.php';
    $phones = null;
    if (array_key_exists('landline', $in) || array_key_exists('mobile', $in)) {
        $tel = pcm_phone_norm(isset($in['landline']) ? $in['landline'] : '');
        $mob = pcm_phone_norm(isset($in['mobile']) ? $in['mobile'] : '');
        if ($tel === '') unset($db['customers'][$key]['tel']); else $db['customers'][$key]['tel'] = $tel;
        if ($mob === '') unset($db['customers'][$key]['mobile']); else $db['customers'][$key]['mobile'] = $mob;
        $db['customers'][$key]['phones_ts'] = time();
        $db['customers'][$key]['phones_by'] = 'customer';
        $phones = array('tel'=>$tel, 'mobile'=>$mob,
                        'tel_display'=>pcm_phone_display($tel), 'mobile_display'=>pcm_phone_display($mob));
    }
    save($DATA,$db);
    out(array('ok'=>true, 'addr'=>array('line1'=>$line1,'line2'=>$line2,'city'=>$city,'postcode'=>$pc), 'phones'=>$phones));
}

if ($action === 'overview') {
    require_once __DIR__ . '/pcm-phone-lib.php';
    $wt = isset($in['wtoken']) ? preg_replace('/[^a-f0-9]/','', (string)$in['wtoken']) : '';
    $member = '';                     // set only for a company team member's session
    if ($wt !== '') {
        $ws = isset($db['websessions'][$wt]) ? $db['websessions'][$wt] : null;
        // "remember me": forever sessions slide a full year and renew on every visit (an
        // active customer never signs in again; an idle year = re-verify; still revocable
        // server-side and machine-bound). Long = 60d/90d; legacy short = 12h/24h.
        if ($ws && !empty($ws['forever'])) { $slide = 31536000; $cap = PHP_INT_MAX; }
        else { $slide = ($ws && !empty($ws['long'])) ? 5184000 : 43200; $cap = ($ws && !empty($ws['long'])) ? 7776000 : 86400; }
        $fresh = $ws && intval($ws['ts'] ?? 0) > time() - $slide && ($cap === PHP_INT_MAX || intval($ws['iat'] ?? 0) > time() - $cap);
        // soft device binding (like staff tokens): a stolen token replayed from another
        // browser is refused; legacy sessions without a machine field still work
        if ($fresh && !empty($ws['machine']) && $ws['machine'] !== $machine) $fresh = false;
        if (!$fresh) { if ($ws) { unset($db['websessions'][$wt]); save($DATA,$db); } out(array('ok'=>false,'error'=>'expired')); }
        $key = (string)$ws['key'];
        $member = isset($ws['member']) ? strtolower((string)$ws['member']) : '';
        $db['websessions'][$wt]['ts'] = time(); save($DATA,$db);   // sliding, capped by iat
    }
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key'));
    $c = $db['customers'][$key];
    // BUSINESS TEAM SCOPING. A staff member of a company account sees only the
    // computers assigned to them - not a colleague's machine and not a penny of
    // billing. This filter is the enforcement; the portal's UI is only the
    // presentation of it, so it must never be the only thing standing in the way.
    // null = see everything (the director, or a manager they nominated).
    require_once __DIR__ . '/pcm-team-lib.php';
    $visible = team_visible_pcs($c, $member);
    $ms = array();
    foreach ((isset($c['machines']) ? $c['machines'] : array()) as $id => $m) {
        if ($visible !== null && !in_array((string)$id, $visible, true)) continue;
        $avr = strtolower(trim((string)($m['av'] ?? '')));
        // sanitised audit trail for the customer consent ledger: action + outcome + when only.
        // Deliberately omits 'by' (internal staff login) and 'out' (may carry paths/hostnames).
        $log = array();
        if (isset($m['cmdlog']) && is_array($m['cmdlog'])) {
            foreach (array_slice($m['cmdlog'], -6) as $L) {
                $log[] = array('act'=>(string)($L['act'] ?? ''), 'ok'=>!empty($L['ok']),
                    'ts'=>intval(isset($L['done']) ? $L['done'] : (isset($L['ts']) ? $L['ts'] : 0)));
            }
        }
        $ms[] = array('name'=>(string)($m['name'] ?? 'PC'), 'score'=>intval($m['score'] ?? 0),
            'verdict'=>(string)($m['verdict'] ?? ''), 'seen'=>(string)($m['seen'] ?? ''),
            'disk'=>intval($m['diskpct'] ?? 0), 'backup'=>!empty($m['backup']), 'ver'=>intval($m['ver'] ?? 0),
            'fresh'=>!isset($m['diskpct']),
            'id'=>(string)$id, 'batt'=>intval($m['batt'] ?? 0),
            'avon'=>($avr==='on'), 'avoff'=>($avr==='off'), 'w10'=>!empty($m['w10']),
            'reboot'=>!empty($m['reboot']), 'rmaint'=>!empty($m['rmaint']),
            'crs'=>(string)($m['crs'] ?? ''), 'crst'=>(string)($m['crst'] ?? ''),
            'hist'=>isset($m['hist']) && is_array($m['hist']) ? array_slice($m['hist'], -60) : array(),
            'log'=>$log,
            'reps'=>isset($m['reps']) && is_array($m['reps']) ? $m['reps'] : array());
    }
    $fam = isset($c['family']['name']) ? (string)$c['family']['name'] : '';
    // is a Pro plan waiting for the owner to link this self-serve identity?
    $pend = false;
    foreach ($db['customers'] as $c2) if (isset($c2['pending_signin']['link']) && $c2['pending_signin']['link'] === $key) { $pend = true; break; }
    // GoCardless payment summary ONLY for owner-created records. A self-serve sign-in's email
    // is unverified (SimplyBook client accounts can be registered with anyone's email), so an
    // email-keyed payment lookup for those would leak another person's Direct Debit details.
    $ownerMade = (($c['via'] ?? '') !== 'signin');
    // Which support plan this account is on. 'free' is not a plan, it is the 365 Club.
    // Only the owner sets 'business' (pcm-admin) - it is never guessed from the data,
    // because a wrong guess either hides features someone is paying for or shows a
    // home customer a console full of things that do not apply to them.
    $plan = (($c['tier'] ?? 'free') === 'pro') ? (((string)($c['plan'] ?? '') === 'business') ? 'business' : 'home') : 'free';
    // who is looking: '' = the account holder, else a company team member
    $mrec = ($member !== '' && isset($c['org']['members'][$member])) ? $c['org']['members'][$member] : null;
    $role = $member === '' ? 'director' : ((($mrec['role'] ?? 'staff') === 'manager') ? 'manager' : 'staff');
    $teamN = isset($c['org']['members']) && is_array($c['org']['members']) ? count($c['org']['members']) : 0;
    out(array('ok'=>true,
        // a staff member is greeted by their OWN name, not the company's - being
        // called "Acme Ltd" by your own computer's portal is a small thing that
        // makes the whole product feel like it was not built for you
        'name'=>($mrec ? (string)($mrec['name'] ?? '') : (string)($c['name'] ?? '')),
        'tier'=>(($c['tier'] ?? 'free')==='pro'?'pro':'free'),
        'plan'=>$plan, 'role'=>$role, 'member'=>$member,
        'org'=>(string)($c['org']['name'] ?? ''), 'company'=>(string)($c['name'] ?? ''),
        'team'=>$teamN, 'domains'=>array_values((array)($c['org']['domains'] ?? array())),
        'next'=>(string)($c['next'] ?? ''), 'next_ts'=>intval($c['next_ts'] ?? 0),
        // the account holder's postal address - a team member never sees or edits it
        'addr'=>($member === '' && isset($c['addr']) && is_array($c['addr'])) ? array(
            'line1'=>(string)($c['addr']['line1'] ?? ''), 'line2'=>(string)($c['addr']['line2'] ?? ''),
            'city'=>(string)($c['addr']['city'] ?? ''), 'postcode'=>(string)($c['addr']['postcode'] ?? ''),
            // who put it there: 'customer' (they typed it) or 'simplybook' (pulled
            // from their booking record). The card says so, because an address
            // they never typed appearing unexplained invites no correction.
            'src'=>(string)($c['addr']['by'] ?? '')) : null,
        // their landline and mobile, same ownership rule as the address (pcm-phone-lib.php)
        'phones'=>($member === '') ? pcm_phones_payload($c) : null,
        /* Is it worth asking SimplyBook to fill a gap? True only when this record
           is linked to a SimplyBook client and we have not tried in the last week
           (the same cool-down custpull enforces server-side). A plain field read:
           overview never talks to SimplyBook, which is why the address that lived
           only on the booking side was invisible here until now. */
        'sbpull'=>($member === '' && !empty($c['sb_client_id'])
                   && (empty($c['sb_pull_ts']) || (int)$c['sb_pull_ts'] < time() - 604800)),
        'machines'=>$ms, 'fam'=>($member === '' ? $fam : ''), 'pending'=>$pend, 'appreq'=>(string)($c['app_req'] ?? ''),
        // billing is the account holder's business and nobody else's
        'gc'=>($ownerMade && $member === '') ? pcm_gc_summary((string)($c['email'] ?? '')) : null));
}

// GoCardless read-only summary (plan + Direct Debit + last payment) for the portal.
// Feature-flagged on the server-only token file; 10-min cached per email; masked data only.
function pcm_gc_summary($email) {
    $cfg = __DIR__ . '/pcm-gocardless.php';        // server-only: <?php $GC_TOKEN = 'live_....';
    if (!is_readable($cfg) || $email === '') return null;
    include $cfg; if (empty($GC_TOKEN)) return null;
    $ck = __DIR__ . '/pcm-gc-cache.json';
    $cache = @json_decode((string)@file_get_contents($ck), true); if (!is_array($cache)) $cache = array();
    $ek = sha1(strtolower($email));
    if (isset($cache[$ek]) && ($cache[$ek]['ts'] ?? 0) > time() - 600) return $cache[$ek]['data'];
    $gc = function($path) use ($GC_TOKEN) {
        $ch = curl_init('https://api.gocardless.com' . $path);
        curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER=>true, CURLOPT_CONNECTTIMEOUT=>3, CURLOPT_TIMEOUT=>4,
            CURLOPT_HTTPHEADER=>array('Authorization: Bearer ' . $GC_TOKEN, 'GoCardless-Version: 2015-07-06')));
        $r = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        return ($r !== false && $code >= 200 && $code < 300) ? json_decode($r, true) : null;
    };
    $data = null;
    $cust = $gc('/customers?email=' . rawurlencode($email));
    if (is_array($cust) && !empty($cust['customers'][0]['id'])) {
        $cid = $cust['customers'][0]['id'];
        $subs = $gc('/subscriptions?customer=' . rawurlencode($cid) . '&status=active');
        $pays = $gc('/payments?customer=' . rawurlencode($cid) . '&limit=1');
        if (!is_array($subs)) return null;   // transport failure: don't cache a made-up "no plan"
        // sum ALL active subscriptions (some customers pay per-PC on separate plans)
        $tot = 0.0; $names = array(); $nextchg = '';
        foreach ((isset($subs['subscriptions']) ? $subs['subscriptions'] : array()) as $s) {
            $tot += intval($s['amount'] ?? 0) / 100.0;
            $names[] = (string)($s['name'] ?? 'Support plan');
            $nc = !empty($s['upcoming_payments'][0]['charge_date']) ? (string)$s['upcoming_payments'][0]['charge_date'] : '';
            if ($nc !== '' && ($nextchg === '' || $nc < $nextchg)) $nextchg = $nc;
        }
        $p = is_array($pays) && !empty($pays['payments'][0]) ? $pays['payments'][0] : null;
        $data = array(
            'active' => count($names) > 0,
            'amount' => round($tot, 2),
            'name'   => count($names) === 1 ? $names[0] : (count($names) > 1 ? 'Support plans (' . count($names) . ' Direct Debits)' : ''),
            'nextchg'=> $nextchg,
            'lastamt'=> $p ? round(intval($p['amount'] ?? 0) / 100, 2) : 0,
            'lastdate'=> $p ? (string)($p['charge_date'] ?? '') : '',
            'laststatus'=> $p ? (string)($p['status'] ?? '') : '');
    }
    $cache[$ek] = array('ts'=>time(), 'data'=>$data);
    @file_put_contents($ck, json_encode($cache), LOCK_EX);
    return $data;
}

// Portal: "Install the app for me" - the signing-decision demand meter. Stamps the record
// and pings Slack so the team follows up; the button becomes the trigger metric.
if ($action === 'appreq') {
    $wt = isset($in['wtoken']) ? preg_replace('/[^a-f0-9]/','', (string)$in['wtoken']) : '';
    $ws = $wt !== '' && isset($db['websessions'][$wt]) ? $db['websessions'][$wt] : null;
    if (!$ws) out(array('ok'=>false,'error'=>'expired'));
    if (!empty($ws['machine']) && $ws['machine'] !== $machine) out(array('ok'=>false,'error'=>'expired'));
    $key = (string)$ws['key'];
    if (!isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key'));
    $db['customers'][$key]['app_req'] = gmdate('Y-m-d H:i');
    save($DATA,$db);
    $wh = __DIR__ . '/slack-webhook.php';
    $SLACK_WEBHOOK = '';
    if (file_exists($wh)) { ob_start(); include $wh; ob_end_clean(); }
    if (empty($SLACK_WEBHOOK) && file_exists($wh)) {
        $rawWh = (string)@file_get_contents($wh);
        if (preg_match('#https://hooks\.slack\.com/\S+#', $rawWh, $mWh)) $SLACK_WEBHOOK = trim($mWh[0]);
    }
    if (!empty($SLACK_WEBHOOK)) {
        $nm = str_replace(array("\r","\n",'<','>','&'), ' ', (string)($db['customers'][$key]['name'] ?? ''));
        $ch = curl_init($SLACK_WEBHOOK);
        curl_setopt_array($ch, array(CURLOPT_POST=>true, CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>6,
            CURLOPT_HTTPHEADER=>array('Content-Type: application/json'),
            CURLOPT_POSTFIELDS=>json_encode(array('text'=>":arrow_down: *App install request* from portal member *".$nm."* - book them a free health check / remote session to pop 365 PC Manager on. (This counter is the code-signing demand meter.)"))));
        curl_exec($ch); curl_close($ch);
    }
    out(array('ok'=>true));
}

// Portal beta feedback: a signed-in customer's note on the 365 PC Manager preview,
// relayed to Slack (never stored on disk - no PII at rest). Auth mirrors appreq.
if ($action === 'feedback') {
    $wt = isset($in['wtoken']) ? preg_replace('/[^a-f0-9]/','', (string)$in['wtoken']) : '';
    $ws = $wt !== '' && isset($db['websessions'][$wt]) ? $db['websessions'][$wt] : null;
    if (!$ws) out(array('ok'=>false,'error'=>'expired'));
    if (!empty($ws['machine']) && $ws['machine'] !== $machine) out(array('ok'=>false,'error'=>'expired'));
    $key = (string)$ws['key'];
    if (!isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key'));
    $msg = isset($in['text']) ? trim((string)$in['text']) : '';
    $msg = preg_replace('/[^\P{C}\n]/u', '', $msg);   // strip control chars, keep newlines
    $msg = function_exists('mb_substr') ? mb_substr($msg, 0, 1500) : substr($msg, 0, 1500);
    if ($msg === '') out(array('ok'=>false,'error'=>'empty'));
    // rate limit: 20 feedbacks/min site-wide (spam floor)
    $RLF = __DIR__ . '/pcm-fb-rate.json';
    $minb = (int)floor(time()/60);
    $rc = @json_decode((string)@file_get_contents($RLF), true);
    if (!is_array($rc) || (isset($rc['min']) ? $rc['min'] : null) !== $minb) $rc = array('min'=>$minb,'n'=>0);
    if ((isset($rc['n']) ? $rc['n'] : 0) >= 20) out(array('ok'=>false,'error'=>'rate'));
    $rc['n']++; @file_put_contents($RLF, json_encode($rc), LOCK_EX);
    $wh = __DIR__ . '/slack-webhook.php';
    $SLACK_WEBHOOK = '';
    if (file_exists($wh)) { ob_start(); include $wh; ob_end_clean(); }
    if (empty($SLACK_WEBHOOK) && file_exists($wh)) {
        $rawWh = (string)@file_get_contents($wh);
        if (preg_match('#https://hooks\.slack\.com/\S+#', $rawWh, $mWh)) $SLACK_WEBHOOK = trim($mWh[0]);
    }
    if (!empty($SLACK_WEBHOOK)) {
        $esc = function($s){ return str_replace(array('&','<','>'), array('&amp;','&lt;','&gt;'), (string)$s); };
        $nm = str_replace(array("\r","\n"), ' ', (string)($db['customers'][$key]['name'] ?? 'a customer'));
        $mc = isset($in['machine']) ? preg_replace('/[^A-Za-z0-9_\-]/','', (string)$in['machine']) : '';
        $tier = ((($db['customers'][$key]['tier'] ?? 'free')) === 'pro') ? 'Pro' : 'free';
        $txt = ":speech_balloon: *365 PC Manager beta feedback* from *".$esc($nm)."* (".$tier.")"
             . ($mc !== '' ? " \xC2\xB7 machine `".substr($mc,0,12)."`" : "")
             . "\n> ".str_replace("\n", "\n> ", $esc($msg));
        $ch = curl_init($SLACK_WEBHOOK);
        curl_setopt_array($ch, array(CURLOPT_POST=>true, CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>6,
            CURLOPT_HTTPHEADER=>array('Content-Type: application/json'),
            CURLOPT_POSTFIELDS=>json_encode(array('text'=>$txt, 'unfurl_links'=>false))));
        curl_exec($ch); curl_close($ch);
    }
    out(array('ok'=>true));
}

// Family View: with the customer's explicit in-app consent, create (or replace) a share
// token so someone they trust can see a read-only health glance at /family/?c=TOKEN.
// Minimal by design - the page shows health basics only. famstop revokes instantly.
if ($action === 'famshare') {
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key'));
    $fname = trim(mb_substr((string)preg_replace('/[^\p{L}\p{N} \'\-\.]/u','', (string)($in['fname']??'')),0,30));
    if ($fname === '') out(array('ok'=>false,'error'=>'no_name'));
    $fsms = substr(preg_replace('/[^0-9+]/','', (string)($in['fsms']??'')),0,16);
    // a wrong number would text a stranger - insist it at least looks like a UK mobile
    if ($fsms !== '' && !preg_match('/^(07[0-9]{9}|\+?447[0-9]{9})$/', $fsms)) out(array('ok'=>false,'error'=>'bad_mobile'));
    // re-sharing updates name/mobile but KEEPS the existing link working (so a customer can
    // change details - or clear the mobile to stop the texts - without breaking the share)
    $tok = isset($db['customers'][$key]['family']['token']) ? $db['customers'][$key]['family']['token'] : bin2hex(random_bytes(12));
    $db['customers'][$key]['family'] = array('token'=>$tok,'name'=>$fname,'sms'=>$fsms,'created'=>gmdate('Y-m-d'));
    save($DATA,$db);
    out(array('ok'=>true,'url'=>'https://365techies.co.uk/family/?c='.$tok,'name'=>$fname));
}
if ($action === 'famstop') {
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key'));
    unset($db['customers'][$key]['family']);
    save($DATA,$db);
    out(array('ok'=>true));
}

// Verified-Call Shield: the app polls this every minute (registered machines only).
// Read-only - returns the active "we're about to ring you" code set from the admin console.
// No scammer can produce the code, so "the caller will say NNNN" proves it's really us.
if ($action === 'shield') {
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>true));
    $c = $db['customers'][$key];
    // the portal's "run a fresh health check" request rides this same minute-poll
    $req = '';
    $dirty = false;
    if ($machine !== '' && !empty($c['machines'][$machine]['req_check'])) {
        $req = 'checkin';
        unset($db['customers'][$key]['machines'][$machine]['req_check']);
        $dirty = true;
    }
    // Safe-maintenance command delivery. Only ever offered to a machine the customer has
    // opted in (rmaint), and only ids on the server allow-list. We hand out the head of the
    // queue, stamp sent_ts, and leave it queued until the app reports a result (cmdresult) -
    // the app dedupes by id so a re-poll before the result lands won't double-run it.
    $cmd = null;
    if ($machine !== '' && isset($db['customers'][$key]['machines'][$machine])) {
        $mm =& $db['customers'][$key]['machines'][$machine];
        if (!empty($mm['rmaint']) && !empty($mm['cmdq']) && is_array($mm['cmdq'])) {
            $tnow = time();
            $keep = array();
            foreach ($mm['cmdq'] as $q) {
                // whole lifecycle is bounded to 15 min from when staff queued it (by 'ts'), so a
                // command can never linger and run much later - delivered-but-unanswered AND
                // never-picked-up both expire here, with an audit label that says which.
                if (($tnow - intval(isset($q['ts']) ? $q['ts'] : 0)) > 900) {
                    pcm_cmdlog($mm, $q, false, !empty($q['sent']) ? 'delivered - no result within 15 min' : 'expired - PC did not pick it up within 15 min');
                    $dirty = true; continue;
                }
                $keep[] = $q;
            }
            $mm['cmdq'] = array_values($keep);
            foreach ($mm['cmdq'] as $i => $q) {
                if (!in_array($q['act'], $GLOBALS['PCM_CMDS'], true)) continue;   // defence-in-depth
                $sent = intval(isset($q['sent']) ? $q['sent'] : 0);
                if ($sent === 0 || ($tnow - $sent) > 90) {   // fresh, or retry after 90s of silence
                    $mm['cmdq'][$i]['sent'] = $tnow;
                    $cmd = array('id'=>(string)$q['id'], 'act'=>(string)$q['act']);
                    $dirty = true;
                }
                break;   // one in flight at a time
            }
        }
        unset($mm);
    }
    if ($dirty) save($DATA,$db);
    $ts = intval($c['shield_ts'] ?? 0);
    $resp = array('ok'=>true,'req'=>$req);
    if ($cmd) $resp['cmd'] = $cmd;
    if ($ts > 0 && (time() - $ts) < 900 && !empty($c['shield_code'])) {
        $resp['code'] = (string)$c['shield_code']; $resp['ask'] = $ts;
    }
    out($resp);
}

// Append a finished command to the machine's capped audit log. $mm is a reference into $db.
function pcm_cmdlog(&$mm, $q, $ok, $outText) {
    if (!isset($mm['cmdlog']) || !is_array($mm['cmdlog'])) $mm['cmdlog'] = array();
    $mm['cmdlog'][] = array(
        'id'   => (string)(isset($q['id']) ? $q['id'] : ''),
        'act'  => (string)(isset($q['act']) ? $q['act'] : ''),
        'by'   => (string)(isset($q['by']) ? $q['by'] : ''),
        'ts'   => intval(isset($q['ts']) ? $q['ts'] : 0),
        'done' => time(),
        'ok'   => $ok ? 1 : 0,
        'out'  => substr((string)$outText, 0, 300));
    while (count($mm['cmdlog']) > 20) array_shift($mm['cmdlog']);
}

// app: report the outcome of a safe-maintenance command it just ran (key+machine authed).
if ($action === 'cmdresult') {
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key'));
    if ($machine === '' || !isset($db['customers'][$key]['machines'][$machine])) out(array('ok'=>false,'error'=>'unknown_machine'));
    $cid = preg_replace('/[^a-f0-9]/','', substr((string)($in['id'] ?? ''), 0, 32));
    if ($cid === '') out(array('ok'=>false,'error'=>'bad_request'));
    $mm =& $db['customers'][$key]['machines'][$machine];
    $ok = !empty($in['ok']);
    $outText = substr((string)($in['out'] ?? ''), 0, 300);
    $q = null; $keep = array();
    foreach ((isset($mm['cmdq']) && is_array($mm['cmdq']) ? $mm['cmdq'] : array()) as $row) {
        if ($q === null && (string)$row['id'] === $cid) { $q = $row; continue; }
        $keep[] = $row;
    }
    if ($q === null) out(array('ok'=>true,'dup'=>true));   // already logged / unknown id - idempotent
    $mm['cmdq'] = array_values($keep);
    pcm_cmdlog($mm, $q, $ok, $outText);
    unset($mm);
    save($DATA,$db);
    out(array('ok'=>true));
}

// app: upload a plain-text diagnostic bundle produced by the collectlogs command (key+machine authed).
// Text only, size-capped, one current bundle per machine. No personal files are ever gathered.
if ($action === 'logup') {
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key'));
    if ($machine === '' || !isset($db['customers'][$key]['machines'][$machine])) out(array('ok'=>false,'error'=>'unknown_machine'));
    $b = base64_decode(substr((string)($in['txt'] ?? ''), 0, 400000), true);
    if ($b === false || strlen($b) < 20 || strlen($b) > 260000) out(array('ok'=>false,'error'=>'bad_bundle'));
    // must be OUR diagnostics format (like reportup sniffs for <html>), and strip control bytes so
    // a tampered client can't smuggle markup/binary into text a staff panel later displays.
    if (strncmp($b, '365 PC Manager', 14) !== 0) out(array('ok'=>false,'error'=>'bad_bundle'));
    $b = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', (string)$b);
    $kh = substr(hash('sha256', $key), 0, 12);
    $lts = time();
    $prev = isset($db['customers'][$key]['machines'][$machine]['logf']) ? (string)$db['customers'][$key]['machines'][$machine]['logf'] : '';
    if (@file_put_contents(__DIR__ . '/pcm-log-' . $kh . '-' . $machine . '-' . $lts . '.txt', $b, LOCK_EX) === false) out(array('ok'=>false,'error'=>'store_failed'));
    if ($prev !== '' && preg_match('/^pcm-log-[a-f0-9]{12}-[a-f0-9]{1,32}-\d+\.txt$/', $prev)) @unlink(__DIR__ . '/' . $prev);
    $db['customers'][$key]['machines'][$machine]['logf'] = 'pcm-log-' . $kh . '-' . $machine . '-' . $lts . '.txt';
    $db['customers'][$key]['machines'][$machine]['logts'] = $lts;
    save($DATA,$db);
    out(array('ok'=>true));
}

// app: a freshly generated service/health report - store a portal copy (per machine, capped)
if ($action === 'reportup') {
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key'));
    if ($machine === '' || !isset($db['customers'][$key]['machines'][$machine])) out(array('ok'=>false,'error'=>'unknown_machine'));
    $b = base64_decode(substr((string)($in['html'] ?? ''), 0, 600000), true);
    if ($b === false || strlen($b) < 500 || strlen($b) > 420000) out(array('ok'=>false,'error'=>'bad_report'));
    if (stripos(substr($b, 0, 200), '<html') === false && stripos(substr($b, 0, 200), '<!doctype') === false) out(array('ok'=>false,'error'=>'bad_report'));
    $kh = substr(hash('sha256', $key), 0, 12);
    $rts = time();
    if (@file_put_contents(__DIR__ . '/pcm-rep-' . $kh . '-' . $machine . '-' . $rts . '.html', $b, LOCK_EX) === false) out(array('ok'=>false,'error'=>'store_failed'));
    $reps = isset($db['customers'][$key]['machines'][$machine]['reps']) && is_array($db['customers'][$key]['machines'][$machine]['reps']) ? $db['customers'][$key]['machines'][$machine]['reps'] : array();
    $reps[] = $rts;
    while (count($reps) > 12) { $old = array_shift($reps); @unlink(__DIR__ . '/pcm-rep-' . $kh . '-' . $machine . '-' . $old . '.html'); }
    $db['customers'][$key]['machines'][$machine]['reps'] = $reps;
    save($DATA,$db);
    out(array('ok'=>true));
}

// portal: ask a machine for a fresh health check (the app's minute-poll picks it up)
if ($action === 'runcheck') {
    $wt = isset($in['wtoken']) ? preg_replace('/[^a-f0-9]/','', (string)$in['wtoken']) : '';
    $ws = $wt !== '' && isset($db['websessions'][$wt]) ? $db['websessions'][$wt] : null;
    if (!$ws) out(array('ok'=>false,'error'=>'expired'));
    if (!empty($ws['machine']) && $ws['machine'] !== $machine) out(array('ok'=>false,'error'=>'expired'));
    $key = (string)$ws['key'];
    $mid2 = preg_replace('/[^a-f0-9]/','', substr((string)($in['pc'] ?? ''), 0, 32));
    if (!isset($db['customers'][$key]['machines'][$mid2])) out(array('ok'=>false,'error'=>'unknown_machine'));
    $db['customers'][$key]['machines'][$mid2]['req_check'] = time();
    save($DATA,$db);
    out(array('ok'=>true));
}

// portal: fetch one of MY OWN reports (wtoken-authed POST; the page opens it as a blob)
if ($action === 'reportget') {
    $wt = isset($in['wtoken']) ? preg_replace('/[^a-f0-9]/','', (string)$in['wtoken']) : '';
    $ws = $wt !== '' && isset($db['websessions'][$wt]) ? $db['websessions'][$wt] : null;
    if (!$ws) out(array('ok'=>false,'error'=>'expired'));
    if (!empty($ws['machine']) && $ws['machine'] !== $machine) out(array('ok'=>false,'error'=>'expired'));
    $key = (string)$ws['key'];
    $mid2 = preg_replace('/[^a-f0-9]/','', substr((string)($in['pc'] ?? ''), 0, 32));
    $rts = intval($in['ts'] ?? 0);
    $reps = isset($db['customers'][$key]['machines'][$mid2]['reps']) ? $db['customers'][$key]['machines'][$mid2]['reps'] : array();
    if (!in_array($rts, array_map('intval', $reps), true)) out(array('ok'=>false,'error'=>'not_found'));
    $kh = substr(hash('sha256', $key), 0, 12);
    $f = __DIR__ . '/pcm-rep-' . $kh . '-' . $mid2 . '-' . $rts . '.html';
    if (!is_readable($f)) out(array('ok'=>false,'error'=>'not_found'));
    out(array('ok'=>true, 'html'=>base64_encode((string)file_get_contents($f))));
}

if ($action === 'help') {
    // only registered machines can raise a help request (stops anonymous relay abuse)
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key','sent'=>false));
    // optional SOS screenshot (user-previewed + consented in the app): base64 JPEG,
    // validated + size-capped, one per key+machine (overwrite = self-rotating; the key-hash
    // in the filename stops one key overwriting another customer's screenshot), rate-limited,
    // never web-served directly (.htaccess denies pcm-sos-*) - staff view via the authed admin.
    $shot = false;
    if (!empty($in['shot']) && $machine !== '' && isset($db['customers'][$key]['machines'][$machine])) {
        $okRate = true;   // max 6 screenshot writes per key per hour
        $rl = intval($db['customers'][$key]['shot_hr'] ?? 0);
        $rlN = intval($db['customers'][$key]['shot_n'] ?? 0);
        $hr = intval(time() / 3600);
        if ($rl !== $hr) { $rlN = 0; }
        if ($rlN >= 6) $okRate = false;
        if ($okRate) {
            $b = base64_decode(substr((string)$in['shot'], 0, 900000), true);
            if ($b !== false && strlen($b) > 1000 && strlen($b) < 650000 && substr($b, 0, 3) === "\xFF\xD8\xFF") {
                $kh = substr(hash('sha256', $key), 0, 12);
                if (@file_put_contents(__DIR__ . '/pcm-sos-' . $kh . '-' . $machine . '.jpg', $b, LOCK_EX) !== false) {
                    $shot = true;
                    $db['customers'][$key]['shot_hr'] = $hr;
                    $db['customers'][$key]['shot_n'] = $rlN + 1;
                }
            }
        }
    }
    // relay to Slack; degrade gracefully if webhook file is absent.
    // escaping < > & neutralises all Slack link / mention / command syntax in webhook text.
    $clean = function($s){ return str_replace(array("\r","\n",'<','>','&'), array(' ',' ','&lt;','&gt;','&amp;'), (string)$s); };
    $cust = $clean(substr((string)($in['customer']??''),0,60));
    $msg  = $clean(substr((string)($in['message']??''),0,600));
    $score= intval($in['score']??0);
    $text = ":rotating_light: *PC Manager help request*\n*".($cust!==''?$cust:'(registered)')."* — health {$score}%\n".$msg
          .($shot ? "\n:camera: they attached a picture of their screen — view it in the PCM admin console" : "")
          ."\nMachine ".$machine." · key ".$key;
    $sent = false;
    if (true) {
        // buffered loader: the webhook file may be plain-URL format - a bare include would
        // echo it into the response (leak) and leave $SLACK_WEBHOOK unset (silent send fail)
        $SLACK_WEBHOOK = '';
        if (file_exists($WEBHOOK)) { ob_start(); include $WEBHOOK; ob_end_clean(); }
        if (empty($SLACK_WEBHOOK) && file_exists($WEBHOOK)) {
            $rawWh = (string)@file_get_contents($WEBHOOK);
            if (preg_match('#https://hooks\.slack\.com/\S+#', $rawWh, $mWh)) $SLACK_WEBHOOK = trim($mWh[0]);
        }
        if (!empty($SLACK_WEBHOOK)) {
            $ch = curl_init($SLACK_WEBHOOK);
            curl_setopt_array($ch, array(CURLOPT_POST=>true, CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>6,
                CURLOPT_HTTPHEADER=>array('Content-Type: application/json'),
                CURLOPT_POSTFIELDS=>json_encode(array('text'=>$text))));
            $r = curl_exec($ch); $sent = ($r === 'ok'); curl_close($ch);
        }
    }
    // also stamp the machine's last help ping (+ screenshot marker) for the admin view
    if ($key!=='' && isset($db['customers'][$key]['machines'][$machine])) {
        $db['customers'][$key]['machines'][$machine]['help'] = $now;
        if ($shot) $db['customers'][$key]['machines'][$machine]['shot'] = $now;
        save($DATA,$db);
    }
    out(array('ok'=>true,'sent'=>$sent));
}

out(array('ok'=>false,'error'=>'unknown_action'));
