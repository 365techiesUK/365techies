<?php
/**
 * 365 PC Manager - owner admin console. Password-gated (server-only secret file).
 * Add customers, generate licence keys, flip on/off support, set next-service date,
 * and see every machine's last health check-in.
 *
 * Setup: create api/pcm-admin-secret.php  ->  <?php $PCM_ADMIN_PASS = 'a-long-passphrase';
 * Visit /api/pcm-admin.php , enter the passphrase.  (gitignored: secret + pcm-data.json)
 */
session_start();
header('X-Robots-Tag: noindex, nofollow');
$SECRET = __DIR__ . '/pcm-admin-secret.php';
$DATA   = __DIR__ . '/pcm-data.json';
if (!file_exists($SECRET)) { http_response_code(503); exit('Not configured: create api/pcm-admin-secret.php'); }
require $SECRET; // $PCM_ADMIN_PASS

// Abort on a present-but-unparseable file rather than returning an empty DB - otherwise a torn
// concurrent read could make the next save() persist an empty set and wipe every customer.
function load($f){
    if (!file_exists($f)) return array('customers'=>array());
    $raw = (string)@file_get_contents($f);
    if ($raw === '') return array('customers'=>array());
    $d = json_decode($raw, true);
    if (!is_array($d)) { http_response_code(503); exit('Customer data is temporarily unavailable - please refresh in a moment.'); }
    if (!isset($d['customers'])) $d['customers'] = array();
    return $d;
}
// atomic write (temp + rename), matching pcm.php, so a crash mid-write can't leave a torn file
function save($f,$d){ $tmp=$f.'.'.getmypid().'.tmp'; if(@file_put_contents($tmp, json_encode($d, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES), LOCK_EX)!==false) @rename($tmp,$f); }
function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES); }
function newkey(){ $a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; $k=''; for($i=0;$i<12;$i++){ $k.=$a[random_int(0,strlen($a)-1)]; if($i==3||$i==7)$k.='-'; } return $k; }

// auth
if (isset($_POST['pass'])) { if (hash_equals($PCM_ADMIN_PASS, $_POST['pass'])) { session_regenerate_id(true); $_SESSION['pcm_ok']=1; } }
if (isset($_GET['logout'])) { session_destroy(); header('Location: pcm-admin.php'); exit; }
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
$CSRF = $_SESSION['csrf'];
// every mutation must carry the CSRF token
if (($_POST['do'] ?? '') !== '' && !hash_equals($CSRF, (string)($_POST['csrf'] ?? ''))) { http_response_code(403); exit('bad token'); }
if (empty($_SESSION['pcm_ok'])) {
    echo '<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>365 PC Manager admin</title>';
    echo '<body style="font-family:system-ui;background:#0b1226;color:#eef;display:grid;place-items:center;height:100vh;margin:0">';
    echo '<form method=post style="background:#0d1530;padding:2rem;border-radius:14px;border:1px solid #2a3b63;min-width:300px">';
    echo '<h2 style="margin:0 0 1rem">365 PC Manager</h2><input type=password name=pass placeholder=Passphrase autofocus style="width:100%;padding:.7rem;border-radius:8px;border:1px solid #2a3b63;background:#0b1226;color:#fff;box-sizing:border-box">';
    echo '<button style="margin-top:1rem;width:100%;padding:.7rem;border:0;border-radius:8px;background:#1d97e3;color:#fff;font-size:1rem;cursor:pointer">Sign in</button></form>';
    exit;
}

// hold the SAME lock pcm.php/pcm-booking use, so admin writes can't lost-update the app's check-ins
$db_lock = @fopen($DATA . '.lock', 'c'); if ($db_lock) @flock($db_lock, LOCK_EX);
$db = load($DATA);
$msg = '';

// mutations
if (($_POST['do'] ?? '') === 'add') {
    $name = trim(substr((string)($_POST['name']??''),0,60));
    if ($name !== '') {
        $key = newkey();
        $db['customers'][$key] = array('name'=>$name,'email'=>trim(substr((string)($_POST['email']??''),0,120)),
            'tier'=> (($_POST['tier']??'pro')==='pro'?'pro':'free'), 'next'=>trim(substr((string)($_POST['next']??''),0,40)),
            'created'=>gmdate('Y-m-d'), 'machines'=>array());
        save($DATA,$db); $msg = "Added {$name} — activation key: {$key}";
    }
}
if (($_POST['do'] ?? '') === 'tier') {
    $k=$_POST['key']??''; if (isset($db['customers'][$k])) { $db['customers'][$k]['tier'] = ($db['customers'][$k]['tier']==='pro'?'free':'pro'); save($DATA,$db); $msg="Updated {$db['customers'][$k]['name']} → {$db['customers'][$k]['tier']}"; }
}
if (($_POST['do'] ?? '') === 'next') {
    $k=$_POST['key']??''; if (isset($db['customers'][$k])) { $db['customers'][$k]['next']=trim(substr((string)($_POST['next']??''),0,40)); save($DATA,$db); $msg="Next-service date updated."; }
}
if (($_POST['do'] ?? '') === 'del') {
    $k=$_POST['key']??''; if (isset($db['customers'][$k])) { $n=$db['customers'][$k]['name']; unset($db['customers'][$k]); save($DATA,$db); $msg="Removed {$n}."; }
}
// approve a signed-in booking account as this Pro customer: promote the booking identity's
// record to Pro (that's the record the customer's app holds a key for), copy the customer's
// details onto it, and retire the old manual record so it stops re-matching.
if (($_POST['do'] ?? '') === 'approve') {
    $orig=$_POST['key']??''; $link=$_POST['link']??'';
    if (isset($db['customers'][$orig]) && isset($db['customers'][$link]) && $orig!==$link) {
        $o = $db['customers'][$orig];
        $db['customers'][$link]['tier']='pro';
        if (!empty($o['name'])) $db['customers'][$link]['name']=$o['name'];
        if (empty($db['customers'][$link]['next']) && !empty($o['next'])) { $db['customers'][$link]['next']=$o['next']; if(!empty($o['next_ts'])) $db['customers'][$link]['next_ts']=$o['next_ts']; }
        $db['customers'][$orig]['tier']='free'; $db['customers'][$orig]['email']=''; $db['customers'][$orig]['merged_into']=$link;
        unset($db['customers'][$orig]['pending_signin']);
        save($DATA,$db); $msg="Approved — {$db['customers'][$link]['name']} is now on support in the app.";
    }
}
if (($_POST['do'] ?? '') === 'dismiss') {
    $k=$_POST['key']??''; if (isset($db['customers'][$k])) { unset($db['customers'][$k]['pending_signin']); save($DATA,$db); $msg="Sign-in request dismissed."; }
}
// ask a customer's app to show a "confirm your PC is ready to connect" prompt (clears any old confirm)
if (($_POST['do'] ?? '') === 'readyask') {
    $k=$_POST['key']??''; if (isset($db['customers'][$k])) { $db['customers'][$k]['ready_ask']=gmdate('Y-m-d H:i'); unset($db['customers'][$k]['ready_confirm']); save($DATA,$db); $msg="Asked {$db['customers'][$k]['name']} to confirm their PC is ready — they'll see it in the app."; }
}
if (($_POST['do'] ?? '') === 'readyclear') {
    $k=$_POST['key']??''; if (isset($db['customers'][$k])) { unset($db['customers'][$k]['ready_ask']); unset($db['customers'][$k]['ready_confirm']); save($DATA,$db); $msg="Cleared."; }
}
if (($_POST['do'] ?? '') === 'famstop') {
    $k=$_POST['key']??''; if (isset($db['customers'][$k])) { unset($db['customers'][$k]['family']); save($DATA,$db); $msg="Family view revoked for {$db['customers'][$k]['name']}."; }
}
// Verified-Call Shield: about to ring this customer? Generate a one-off code their app
// shows them within a minute - "the caller will say code NNNN". Valid 15 minutes.
if (($_POST['do'] ?? '') === 'shield') {
    $k=$_POST['key']??''; if (isset($db['customers'][$k])) {
        $code = (string)random_int(1000, 9999);
        $db['customers'][$k]['shield_code'] = $code;
        $db['customers'][$k]['shield_ts'] = time();
        save($DATA,$db);
        $msg = "📞 Code {$code} set for {$db['customers'][$k]['name']} — give their app up to a minute to show it (it only appears while their PC is on with the app running). When they answer, SAY CODE {$code} to them FIRST — never ask them to read it to you. Valid 15 min.";
    }
}

// authed SOS screenshot viewer: streams api/pcm-sos-<keyhash>-<machine>.jpg (direct access denied)
if (isset($_GET['shot'])) {
    $m = preg_replace('/[^a-f0-9\-]/','', substr((string)$_GET['shot'],0,48));
    $f = __DIR__ . '/pcm-sos-' . $m . '.jpg';
    if ($m !== '' && strpos($m,'-') !== false && is_readable($f)) { header('Content-Type: image/jpeg'); header('Cache-Control: no-store'); readfile($f); }
    else { http_response_code(404); echo 'no screenshot'; }
    exit;
}

if ($db_lock) { @flock($db_lock, LOCK_UN); @fclose($db_lock); } // mutations done; render from memory
$cust = $db['customers'] ?? array();
// counts + build the proactive "needs a call" list
$pcs=0; $active=0; $today=gmdate('Y-m-d'); $calls=array();
foreach($cust as $key=>$c){
    foreach(($c['machines']??array()) as $id=>$m){
        $pcs++; if(substr($m['seen']??'',0,10)===$today)$active++;
        $reasons=array();
        if(($m['av']??'')==='OFF') $reasons[]='antivirus OFF';
        if(isset($m['backup']) && !$m['backup']) $reasons[]='no backup';
        if(intval($m['diskpct']??0)>=92) $reasons[]='disk '.$m['diskpct'].'% full';
        if(intval($m['score']??100)<55) $reasons[]='health '.$m['score'].'%';
        if(!empty($m['w10']) && ($c['tier']??'free')!=='pro') $reasons[]='still on Windows 10';
        if($reasons){
            $sev = (($m['av']??'')==='OFF'?100:0) + ((isset($m['backup'])&&!$m['backup'])?40:0) + (100-intval($m['score']??100));
            $calls[]=array('name'=>$c['name']??'','email'=>$c['email']??'','tier'=>$c['tier']??'free','pc'=>$m['name']?:$id,'why'=>implode(', ',$reasons),'sev'=>$sev,'seen'=>$m['seen']??'');
        }
    }
}
usort($calls, function($a,$b){ return $b['sev']-$a['sev']; });
// pending sign-in approvals: Pro records a booking account matched by email but was NOT auto-granted
$pendings=array();
foreach($cust as $key=>$c){
    if(!empty($c['pending_signin']) && is_array($c['pending_signin'])){
        $ps=$c['pending_signin']; $link=$ps['link']??'';
        if($link!=='' && isset($cust[$link])) // only if the booking identity record still exists
            $pendings[]=array('orig'=>$key,'name'=>$c['name']??'','email'=>$c['email']??($ps['email']??''),'link'=>$link,'sbname'=>$ps['sbname']??'','ts'=>$ps['ts']??'');
    }
}
?><!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>365 PC Manager — customers</title><style>
:root{color-scheme:dark}body{font-family:system-ui,Segoe UI,sans-serif;background:#0b1226;color:#eef2f8;margin:0;padding:1.5rem}
a{color:#86b6e8}h1{font-size:1.3rem;margin:0}.top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1rem}
.kpis{display:flex;gap:1rem;flex-wrap:wrap;margin:.5rem 0 1.4rem}.kpi{background:#0d1530;border:1px solid #2a3b63;border-radius:12px;padding:.8rem 1.2rem;min-width:110px}
.kpi b{font-size:1.5rem;display:block}.kpi span{color:#9fb5d3;font-size:.8rem}
.msg{background:#0e2a17;border:1px solid #1e7a3a;color:#c6f6d5;padding:.7rem 1rem;border-radius:10px;margin-bottom:1rem;font-family:ui-monospace,monospace;font-size:.85rem}
form.inline{display:inline}input,select,button{font:inherit}input,select{background:#0b1226;color:#fff;border:1px solid #2a3b63;border-radius:8px;padding:.5rem}
button{background:#1d97e3;color:#fff;border:0;border-radius:8px;padding:.5rem .9rem;cursor:pointer}button.ghost{background:#22304f}button.warn{background:#7a2b2b}
table{width:100%;border-collapse:collapse;margin-top:.5rem}th,td{text-align:left;padding:.6rem .5rem;border-bottom:1px solid #1c2748;font-size:.9rem;vertical-align:top}
th{color:#9fb5d3;font-weight:600;font-size:.75rem;text-transform:uppercase;letter-spacing:.04em}
.key{font-family:ui-monospace,monospace;background:#0d1530;padding:.15rem .4rem;border-radius:6px;border:1px solid #2a3b63}
.pill{padding:.15rem .5rem;border-radius:99px;font-size:.72rem}.pro{background:rgba(0,206,27,.16);color:#39d353}.free{background:#22304f;color:#9fb5d3}
.mach{color:#9fb5d3;font-size:.8rem;margin-top:.3rem}.dot{display:inline-block;width:8px;height:8px;border-radius:99px;margin-right:.3rem}
.add{background:#0d1530;border:1px solid #2a3b63;border-radius:14px;padding:1rem 1.2rem;margin-bottom:1.5rem;display:grid;grid-template-columns:1fr 1fr auto auto auto;gap:.7rem;align-items:end}
.add label{display:block;font-size:.75rem;color:#9fb5d3;margin-bottom:.2rem}
@media(max-width:720px){.add{grid-template-columns:1fr 1fr}}
</style></head><body>
<div class=top><h1>365 PC Manager — customers</h1><a href="?logout=1">Sign out</a></div>
<div class=kpis>
 <div class=kpi><b><?=count($cust)?></b><span>customers</span></div>
 <div class=kpi><b><?=$pcs?></b><span>machines</span></div>
 <div class=kpi><b style="color:#39d353"><?=$active?></b><span>checked in today</span></div>
</div>
<?php if($msg) echo '<div class=msg>'.h($msg).'</div>'; ?>
<?php if($pendings): ?>
<div style="background:#0d1a2e;border:1px solid #2a5b8f;border-radius:14px;padding:1rem 1.2rem;margin-bottom:1.5rem">
  <h2 style="margin:0 0 .3rem;font-size:1rem;color:#86b6e8">&#128273; Sign-in requests &mdash; <?=count($pendings)?> to confirm</h2>
  <p style="color:#9fb5d3;font-size:.82rem;margin:0 0 .6rem">Someone signed into the app with a booking account whose email matches one of your <strong>Pro</strong> customers. Approving switches their app to support mode. Only approve if you recognise them as that customer.</p>
  <table style="margin-top:0"><thead><tr><th>Signed in as</th><th>Matches your Pro customer</th><th>When</th><th></th></tr></thead><tbody>
  <?php foreach($pendings as $pn): ?>
    <tr>
      <td><strong><?=h($pn['sbname']?:$pn['email'])?></strong><div class=mach><?=h($pn['email'])?></div></td>
      <td><?=h($pn['name'])?></td>
      <td class=mach><?=h($pn['ts'])?></td>
      <td style="white-space:nowrap">
        <form method=post class=inline><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=approve><input type=hidden name=key value="<?=h($pn['orig'])?>"><input type=hidden name=link value="<?=h($pn['link'])?>"><button>&#10003; Approve as Pro</button></form>
        <form method=post class=inline onsubmit="return confirm('Dismiss this sign-in request? They keep free booking access.')"><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=dismiss><input type=hidden name=key value="<?=h($pn['orig'])?>"><button class=ghost>dismiss</button></form>
      </td>
    </tr>
  <?php endforeach; ?>
  </tbody></table>
</div>
<?php endif; ?>
<?php if($calls): ?>
<div style="background:#1a0e0e;border:1px solid #7a3b2b;border-radius:14px;padding:1rem 1.2rem;margin-bottom:1.5rem">
  <h2 style="margin:0 0 .6rem;font-size:1rem;color:#ffb4a2">&#9742; Worth a call today &mdash; <?=count($calls)?> machine(s) flagged something</h2>
  <table style="margin-top:0"><thead><tr><th>Customer</th><th>Plan</th><th>Machine</th><th>Why</th><th></th></tr></thead><tbody>
  <?php foreach($calls as $ca): ?>
    <tr>
      <td><strong><?=h($ca['name'])?></strong><?php if($ca['email'])echo '<div class=mach>'.h($ca['email']).'</div>';?></td>
      <td><span class="pill <?=$ca['tier']==='pro'?'pro':'free'?>"><?=$ca['tier']==='pro'?'On support':'Free'?></span></td>
      <td><?=h($ca['pc'])?></td>
      <td style="color:#ffb4a2"><?=h($ca['why'])?></td>
      <td><?php if($ca['email'])echo '<a href="mailto:'.h($ca['email']).'?subject=Your%20PC%20flagged%20something">email</a>';?></td>
    </tr>
  <?php endforeach; ?>
  </tbody></table>
  <p style="color:#c99;font-size:.78rem;margin:.6rem 0 0">Free-tier machines here are warm upsell leads &mdash; a quick call fixing the flag is the natural way into a support plan.</p>
</div>
<?php endif; ?>
<form method=post class=add>
  <div><label>Customer / business name</label><input name=name required placeholder="e.g. Mrs Wilson"></div>
  <div><label>Email (optional)</label><input name=email type=email placeholder="name@example.com"></div>
  <div><label>On support?</label><select name=tier><option value=pro>Pro (on support)</option><option value=free>Free</option></select></div>
  <div><label>Next service (optional)</label><input name=next placeholder="Fri 28 Aug 2026"></div>
  <div><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=add><button>+ Add &amp; make key</button></div>
</form>
<table><thead><tr><th>Customer</th><th>Key</th><th>Plan</th><th>Next service</th><th>Machines &amp; health</th><th></th></tr></thead><tbody>
<?php foreach($cust as $key=>$c): if(!empty($c['merged_into'])) continue; /* retired after approval */ ?>
<tr>
  <td><strong><?=h($c['name'])?></strong><?php if(!empty($c['via']) && $c['via']==='signin')echo ' <span class="pill free" style="font-size:.66rem">signed in</span>'; if(!empty($c['email']))echo '<div class=mach>'.h($c['email']).'</div>';?><div class=mach>since <?=h($c['created']??'')?></div></td>
  <td><span class=key><?=h($key)?></span>
    <div class=mach style="margin-top:.45rem">Activation link (send to customer):</div>
    <div style="display:flex;gap:.3rem;margin-top:.2rem;align-items:center">
      <input class=alink readonly value="365pcm://activate/<?=h($key)?>" onfocus="this.select()" style="width:190px;font-family:ui-monospace,monospace;font-size:.7rem;padding:.25rem .4rem">
      <button type=button class="ghost copybtn" data-link="365pcm://activate/<?=h($key)?>" style="padding:.3rem .6rem;font-size:.75rem">Copy</button>
      <?php if(!empty($c['email'])): ?><a class=ghost style="padding:.3rem .6rem;font-size:.75rem;text-decoration:none;border-radius:8px" href="mailto:<?=h($c['email'])?>?subject=<?=rawurlencode('Activate 365 PC Manager on your PC')?>&body=<?=rawurlencode("Hi,\n\nClick this link on the PC you'd like on support and it'll activate 365 PC Manager for you:\n\n365pcm://activate/".$key."\n\n(If nothing happens, open 365 PC Manager, go to Help & Shop, tap \"Go on support / enter key\" and paste this code: ".$key.")\n\nThanks,\n365 Techies · 01202 775566")?>">Email</a><?php endif; ?>
    </div>
  </td>
  <td><span class="pill <?=($c['tier']??'free')==='pro'?'pro':'free'?>"><?=($c['tier']??'free')==='pro'?'On support':'Free'?></span></td>
  <td>
    <form method=post class=inline><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=next><input type=hidden name=key value="<?=h($key)?>">
    <input name=next value="<?=h($c['next']??'')?>" style="width:130px" placeholder="—"><button class=ghost>save</button></form>
  </td>
  <td>
    <?php $ms=$c['machines']??array(); if(!$ms) echo '<span class=mach>none activated yet</span>';
      $latestVer=0; $vj=@json_decode((string)@file_get_contents(__DIR__.'/../downloads/pcm/version.json'),true); if(is_array($vj)) $latestVer=intval($vj['ver']??0);
      foreach($ms as $id=>$m){ $sc=intval($m['score']??0); $col=$sc>=80?'#39d353':($sc>=55?'#e0b341':'#e8637e');
        $seen=$m['seen']??''; $fresh=substr($seen,0,10)===$today;
        $mv=intval($m['ver']??0);
        $vchip = $mv>0 ? ' · <span style="opacity:.75;color:'.(($latestVer>0&&$mv<$latestVer)?'#e0b341':'#8fa3bd').'">app v'.$mv.(($latestVer>0&&$mv<$latestVer)?' (v'.$latestVer.' out - updates itself)':'').'</span>' : '';
        $kh = substr(hash('sha256', $key), 0, 12);
        $shotLink = (!empty($m['shot']) && is_readable(__DIR__.'/pcm-sos-'.$kh.'-'.$id.'.jpg')) ? ' · <a href="pcm-admin.php?shot='.h($kh.'-'.$id).'" target=_blank style="color:#1d97e3">📸 their screen ('.h($m['shot']).')</a>' : '';
        echo '<div class=mach><span class=dot style="background:'.$col.'"></span><strong style="color:#eef">'.h($m['name']?:$id).'</strong> — '.$sc.'% '.h($m['verdict']??'').' <span style="opacity:.6">· seen '.h($seen).($fresh?' ✓':'').(!empty($m['help'])?' · 🆘 '.h($m['help']):'').'</span>'.$vchip.$shotLink.'</div>';
      } ?>
  </td>
  <td style="white-space:nowrap">
    <form method=post class=inline><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=tier><input type=hidden name=key value="<?=h($key)?>"><button class=ghost><?=($c['tier']??'free')==='pro'?'→ Free':'→ Support'?></button></form>
    <?php if(!empty($c['ready_confirm'])): ?>
      <span class="pill pro" title="confirmed <?=h($c['ready_confirm'])?>">✓ ready</span>
      <form method=post class=inline><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=readyclear><input type=hidden name=key value="<?=h($key)?>"><button class=ghost>clear</button></form>
    <?php elseif(!empty($c['ready_ask'])): ?>
      <span class="pill free" title="asked <?=h($c['ready_ask'])?>">…awaiting</span>
    <?php else: ?>
      <form method=post class=inline><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=readyask><input type=hidden name=key value="<?=h($key)?>"><button class=ghost title="Ask their app to confirm the PC is on and ready to connect">📶 ready?</button></form>
    <?php endif; ?>
    <?php if (!empty($c['family']['name'])): ?>
      <span class="pill free" title="family view active since <?=h($c['family']['created']??'')?>">👪 <?=h($c['family']['name'])?></span>
      <form method=post class=inline onsubmit="return confirm('Revoke family view? Their share link stops working immediately.')"><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=famstop><input type=hidden name=key value="<?=h($key)?>"><button class=ghost>revoke</button></form>
    <?php endif; ?>
    <?php $shOn = intval($c['shield_ts']??0) > 0 && (time()-intval($c['shield_ts']??0)) < 900; ?>
    <form method=post class=inline><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=shield><input type=hidden name=key value="<?=h($key)?>"><button class=ghost title="About to ring them? Their app will say to expect a caller with this code - proves it's really us"><?= $shOn ? '📞 code '.h($c['shield_code']??'') : '📞 verify call' ?></button></form>
    <form method=post class=inline onsubmit="return confirm('Remove this customer and all their machines?')"><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=del><input type=hidden name=key value="<?=h($key)?>"><button class=warn>×</button></form>
  </td>
</tr>
<?php endforeach; if(!$cust) echo '<tr><td colspan=6 style="color:#9fb5d3;padding:2rem;text-align:center">No customers yet — add your first above.</td></tr>'; ?>
</tbody></table>
<p style="color:#9fb5d3;font-size:.8rem;margin-top:1.5rem">Easiest way to put a customer on support: copy their <strong>activation link</strong> above and send it (email button, or paste into a Splashtop chat / text). They click it on their PC and 365 PC Manager activates itself. Or they can open <em>Help &amp; Shop</em> in the app, tap <em>Go on support / enter key</em>, and paste the key. Toggle a customer to Free and their app quietly drops back to free mode on its next check-in.</p>
<script>
document.querySelectorAll('.copybtn').forEach(function(b){
  b.addEventListener('click', function(){
    var t = b.getAttribute('data-link');
    if (navigator.clipboard) { navigator.clipboard.writeText(t).then(function(){ b.textContent='Copied!'; setTimeout(function(){ b.textContent='Copy'; }, 1400); }); }
  });
});
</script>
</body></html>
