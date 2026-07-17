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

function load($f){ return file_exists($f) ? (json_decode((string)@file_get_contents($f), true) ?: array('customers'=>array())) : array('customers'=>array()); }
function save($f,$d){ @file_put_contents($f, json_encode($d, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES), LOCK_EX); }
function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES); }
function newkey(){ $a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; $k=''; for($i=0;$i<12;$i++){ $k.=$a[random_int(0,strlen($a)-1)]; if($i==3||$i==7)$k.='-'; } return $k; }

// auth
if (isset($_POST['pass'])) { if (hash_equals($PCM_ADMIN_PASS, $_POST['pass'])) $_SESSION['pcm_ok']=1; }
if (isset($_GET['logout'])) { session_destroy(); header('Location: pcm-admin.php'); exit; }
if (empty($_SESSION['pcm_ok'])) {
    echo '<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>365 PC Manager admin</title>';
    echo '<body style="font-family:system-ui;background:#0b1226;color:#eef;display:grid;place-items:center;height:100vh;margin:0">';
    echo '<form method=post style="background:#0d1530;padding:2rem;border-radius:14px;border:1px solid #2a3b63;min-width:300px">';
    echo '<h2 style="margin:0 0 1rem">365 PC Manager</h2><input type=password name=pass placeholder=Passphrase autofocus style="width:100%;padding:.7rem;border-radius:8px;border:1px solid #2a3b63;background:#0b1226;color:#fff;box-sizing:border-box">';
    echo '<button style="margin-top:1rem;width:100%;padding:.7rem;border:0;border-radius:8px;background:#1d97e3;color:#fff;font-size:1rem;cursor:pointer">Sign in</button></form>';
    exit;
}

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

$cust = $db['customers'] ?? array();
// counts
$pcs=0; $active=0; $today=gmdate('Y-m-d');
foreach($cust as $c){ foreach(($c['machines']??array()) as $m){ $pcs++; if(substr($m['seen']??'',0,10)===$today)$active++; } }
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
<form method=post class=add>
  <div><label>Customer / business name</label><input name=name required placeholder="e.g. Mrs Wilson"></div>
  <div><label>Email (optional)</label><input name=email type=email placeholder="name@example.com"></div>
  <div><label>On support?</label><select name=tier><option value=pro>Pro (on support)</option><option value=free>Free</option></select></div>
  <div><label>Next service (optional)</label><input name=next placeholder="Fri 28 Aug 2026"></div>
  <div><input type=hidden name=do value=add><button>+ Add &amp; make key</button></div>
</form>
<table><thead><tr><th>Customer</th><th>Key</th><th>Plan</th><th>Next service</th><th>Machines &amp; health</th><th></th></tr></thead><tbody>
<?php foreach($cust as $key=>$c): ?>
<tr>
  <td><strong><?=h($c['name'])?></strong><?php if(!empty($c['email']))echo '<div class=mach>'.h($c['email']).'</div>';?><div class=mach>since <?=h($c['created']??'')?></div></td>
  <td><span class=key><?=h($key)?></span></td>
  <td><span class="pill <?=($c['tier']??'free')==='pro'?'pro':'free'?>"><?=($c['tier']??'free')==='pro'?'On support':'Free'?></span></td>
  <td>
    <form method=post class=inline><input type=hidden name=do value=next><input type=hidden name=key value="<?=h($key)?>">
    <input name=next value="<?=h($c['next']??'')?>" style="width:130px" placeholder="—"><button class=ghost>save</button></form>
  </td>
  <td>
    <?php $ms=$c['machines']??array(); if(!$ms) echo '<span class=mach>none activated yet</span>';
      foreach($ms as $id=>$m){ $sc=intval($m['score']??0); $col=$sc>=80?'#39d353':($sc>=55?'#e0b341':'#e8637e');
        $seen=$m['seen']??''; $fresh=substr($seen,0,10)===$today;
        echo '<div class=mach><span class=dot style="background:'.$col.'"></span><strong style="color:#eef">'.h($m['name']?:$id).'</strong> — '.$sc.'% '.h($m['verdict']??'').' <span style="opacity:.6">· seen '.h($seen).($fresh?' ✓':'').(!empty($m['help'])?' · 🆘 '.h($m['help']):'').'</span></div>';
      } ?>
  </td>
  <td style="white-space:nowrap">
    <form method=post class=inline><input type=hidden name=do value=tier><input type=hidden name=key value="<?=h($key)?>"><button class=ghost><?=($c['tier']??'free')==='pro'?'→ Free':'→ Support'?></button></form>
    <form method=post class=inline onsubmit="return confirm('Remove <?=h($c['name'])?>?')"><input type=hidden name=do value=del><input type=hidden name=key value="<?=h($key)?>"><button class=warn>×</button></form>
  </td>
</tr>
<?php endforeach; if(!$cust) echo '<tr><td colspan=6 style="color:#9fb5d3;padding:2rem;text-align:center">No customers yet — add your first above.</td></tr>'; ?>
</tbody></table>
<p style="color:#9fb5d3;font-size:.8rem;margin-top:1.5rem">Give the activation key to a customer when they go on support (during a Splashtop session is easiest). They tap <em>Activate 365 support</em> in the app and enter it. Toggle a customer to Free and their app quietly drops back to free mode on its next check-in.</p>
</body></html>
