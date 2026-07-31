<?php
/**
 * Text messages — staff console (send now + scheduled/recurring reminders).
 *
 * Deliberately a SEPARATE page from pcm-admin.php rather than another panel
 * inside it: pcm-admin.php is the busiest working file in the api/ folder and
 * this feature spends money, so it gets its own blast radius. It shares the
 * same session gate (plain session_start(), default PHPSESSID - do NOT set a
 * custom session_name(), that silently reads a different cookie).
 *
 * Consent note kept in view of whoever uses this: texting a customer about a
 * job or a service they have signed up to is a service message and fine.
 * Marketing blasts are not - they need prior consent and an opt-out.
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
@session_start();
header('X-Robots-Tag: noindex, nofollow');

if (empty($_SESSION['pcm_ok'])) {
    http_response_code(403);
    exit('Not signed in. Sign in at pcm-admin.php first, then come back.');
}

require_once __DIR__ . '/tm-lib.php';

$msg = ''; $err = '';
$DOWS = array(1 => 'Monday', 2 => 'Tuesday', 3 => 'Wednesday', 4 => 'Thursday',
              5 => 'Friday', 6 => 'Saturday', 7 => 'Sunday');

/* ---------------- actions ---------------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $do = isset($_POST['do']) ? $_POST['do'] : '';

    if ($do === 'sendnow') {
        $to = isset($_POST['to']) ? $_POST['to'] : '';
        $tx = isset($_POST['text']) ? trim((string)$_POST['text']) : '';
        $r = tm_send($to, $tx, 'admin-manual');
        if (!empty($r['ok'])) $msg = 'Sent to ' . htmlspecialchars(tm_number($to)) . '.';
        else $err = 'Not sent: ' . htmlspecialchars(isset($r['error']) ? $r['error'] : 'unknown');
    }

    if ($do === 'add') {
        $to = tm_number(isset($_POST['to']) ? $_POST['to'] : '');
        $tx = trim((string)(isset($_POST['text']) ? $_POST['text'] : ''));
        $lb = trim((string)(isset($_POST['label']) ? $_POST['label'] : ''));
        $fq = isset($_POST['freq']) ? $_POST['freq'] : 'weekly';
        if ($to === '')            $err = 'That number does not look like a UK number.';
        else if (!tm_is_mobile($to)) $err = 'That is not a mobile number, so a text cannot reach it.';
        else if ($tx === '')       $err = 'Add the message you want sending.';
        else {
            $rows = tm_sched_load();
            $s = array(
                'id'      => substr(bin2hex(random_bytes(6)), 0, 8),
                'to'      => $to,
                'label'   => $lb !== '' ? $lb : 'Reminder',
                'text'    => $tx,
                'freq'    => in_array($fq, array('weekly', 'monthly'), true) ? $fq : 'weekly',
                'dow'     => max(1, min(7, (int)(isset($_POST['dow']) ? $_POST['dow'] : 5))),
                'dom'     => max(1, min(28, (int)(isset($_POST['dom']) ? $_POST['dom'] : 1))),
                'hour'    => max(TM_SCHED_MIN_HOUR, min(TM_SCHED_MAX_HOUR, (int)(isset($_POST['hour']) ? $_POST['hour'] : 9))),
                'min'     => (int)(isset($_POST['min']) ? $_POST['min'] : 0),
                'optout'  => !empty($_POST['optout']),
                'active'  => true,
                'created' => time(), 'last' => 0, 'count' => 0,
            );
            $s['next'] = tm_next_due($s, time());
            $rows[] = $s;
            tm_sched_save($rows);
            $msg = 'Reminder saved. First send: ' . date('D j M, g:ia', $s['next']) . '.';
        }
    }

    if ($do === 'toggle' || $do === 'del' || $do === 'test') {
        $id = isset($_POST['id']) ? (string)$_POST['id'] : '';
        $rows = tm_sched_load(); $out = array();
        foreach ($rows as $s) {
            if ($s['id'] === $id) {
                if ($do === 'del') { $msg = 'Reminder deleted.'; continue; }
                if ($do === 'toggle') {
                    $s['active'] = empty($s['active']);
                    if ($s['active']) $s['next'] = tm_next_due($s, time());
                    $msg = $s['active'] ? 'Reminder switched on.' : 'Reminder paused.';
                }
                if ($do === 'test') {
                    $r = tm_send($s['to'], $s['text'], 'sched-test:' . $s['id']);
                    $msg = !empty($r['ok']) ? 'Test text sent.' : '';
                    if (empty($r['ok'])) $err = 'Test failed: ' . htmlspecialchars($r['error']);
                }
            }
            $out[] = $s;
        }
        tm_sched_save($out);
    }
}

$bal   = tm_balance();
$rows  = tm_sched_load();
/* cron heartbeat - is the scheduler actually alive? */
$beat  = is_file(__DIR__ . '/tm-beat.json')
       ? json_decode((string)@file_get_contents(__DIR__ . '/tm-beat.json'), true) : null;
$beatAge = (is_array($beat) && !empty($beat['t'])) ? (time() - (int)$beat['t']) : null;
$log   = is_file(__DIR__ . '/tm-log.json') ? json_decode((string)@file_get_contents(__DIR__ . '/tm-log.json'), true) : array();
if (!is_array($log)) $log = array();
$log   = array_slice($log, -12);
usort($rows, function ($a, $b) { return (int)($a['next'] ?? 0) <=> (int)($b['next'] ?? 0); });
$h = function ($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); };
?><!doctype html><html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>365 PC Manager — text messages</title><style>
:root{color-scheme:dark}body{font-family:system-ui,Segoe UI,sans-serif;background:#0b1226;color:#eef2f8;margin:0;padding:1.5rem}
a{color:#86b6e8}h1{font-size:1.3rem;margin:0}.top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1rem}
.kpis{display:flex;gap:1rem;flex-wrap:wrap;margin:.5rem 0 1.4rem}.kpi{background:#0d1530;border:1px solid #2a3b63;border-radius:12px;padding:.8rem 1.2rem;min-width:110px}
.kpi b{font-size:1.5rem;display:block}.kpi span{color:#9fb5d3;font-size:.8rem}
.msg{background:#0e2a17;border:1px solid #1e7a3a;color:#c6f6d5;padding:.7rem 1rem;border-radius:10px;margin-bottom:1rem;font-size:.9rem}
.err{background:#2a0e0e;border:1px solid #7a2b2b;color:#f6c6c6;padding:.7rem 1rem;border-radius:10px;margin-bottom:1rem;font-size:.9rem}
input,select,button,textarea{font:inherit}input,select,textarea{background:#0b1226;color:#fff;border:1px solid #2a3b63;border-radius:8px;padding:.5rem;width:100%;box-sizing:border-box}
textarea{min-height:5.2rem;resize:vertical}
button{background:#1d97e3;color:#fff;border:0;border-radius:8px;padding:.55rem .9rem;cursor:pointer;width:auto}
button.ghost{background:#22304f}button.warn{background:#7a2b2b}
.card{background:#0d1530;border:1px solid #2a3b63;border-radius:14px;padding:1.1rem 1.2rem;margin-bottom:1.4rem}
.card h2{margin:0 0 .8rem;font-size:1rem;color:#86b6e8}
.grid{display:grid;gap:.7rem;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));align-items:end}
label{display:block;font-size:.75rem;color:#9fb5d3;margin-bottom:.2rem}
table{width:100%;border-collapse:collapse;margin-top:.4rem}th,td{text-align:left;padding:.6rem .5rem;border-bottom:1px solid #1c2748;font-size:.88rem;vertical-align:top}
th{color:#9fb5d3;font-weight:600;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em}
.pill{padding:.15rem .5rem;border-radius:99px;font-size:.72rem}.on{background:rgba(0,206,27,.16);color:#39d353}.off{background:#22304f;color:#9fb5d3}
.note{color:#9fb5d3;font-size:.8rem;line-height:1.55;margin:.5rem 0 0}
.mono{font-family:ui-monospace,monospace;font-size:.8rem}
form.inline{display:inline}
</style></head><body>
<div class=top><h1>Text messages</h1><a href="pcm-admin.php">&larr; Back to customers</a></div>

<?php if ($msg): ?><div class=msg><?=$h($msg)?></div><?php endif; ?>
<?php if ($err): ?><div class=err><?=$err?></div><?php endif; ?>

<div class=kpis>
  <div class=kpi><b><?= !empty($bal['ok']) ? '&pound;' . $h($bal['balanceText']) : '&mdash;' ?></b><span>Textmagic credit</span></div>
  <div class=kpi><b><?=count(array_filter($rows, function($r){return !empty($r['active']);}))?></b><span>active reminders</span></div>
  <div class=kpi><b><?=count($rows)?></b><span>total reminders</span></div>
</div>
<?php if (empty($bal['ok'])): ?>
  <div class=err>Textmagic is not answering (<?=$h($bal['error'])?>). Check <span class=mono>api/pcm-textmagic.php</span> holds a valid API v2 key.</div>
<?php endif; ?>

<?php
/* Cron health. 15-minute schedule, so anything past ~35 minutes means it has
   stopped - and a stopped cron means reminders silently never arrive. */
if ($beatAge === null): ?>
  <div class=err><strong>The scheduler has never run.</strong> Reminders will not send until the cron is set up
    (SiteGround &rarr; Site Tools &rarr; Devs &rarr; Cron Jobs, every 15 minutes:
    <span class=mono>php /home/customer/www/365techies.co.uk/public_html/api/tm-cron.php</span>),
    or you press <a href="tm-cron.php" target="_blank" rel="noopener">Run it now</a>.</div>
<?php elseif ($beatAge > 2100): ?>
  <div class=err><strong>The scheduler has stopped.</strong> Last run
    <?=$h($beatAge > 86400 ? round($beatAge/86400) . ' day(s)' : round($beatAge/60) . ' minute(s)')?> ago &mdash;
    it should run every 15 minutes. Reminders are not being sent. Check the cron job in SiteGround.</div>
<?php else: ?>
  <div class=msg>Scheduler is running &mdash; last check <?=$h($beatAge < 90 ? 'just now' : round($beatAge/60) . ' minute(s) ago')?><?=
    !empty($beat['via']) ? ' (' . $h($beat['via']) . ')' : '' ?>.</div>
<?php endif; ?>

<div class=card>
  <h2>&#9993; Send a text now</h2>
  <form method=post>
    <input type=hidden name=do value=sendnow>
    <div class=grid>
      <div style="grid-column:span 2"><label>Mobile number</label><input name=to placeholder="07520 615332" required></div>
      <div><label>&nbsp;</label><button type=submit>Send</button></div>
    </div>
    <div style="margin-top:.7rem"><label>Message</label><textarea name=text maxlength=600 required placeholder="Hi, your laptop is ready to collect - 365 Techies, 01202 775566"></textarea></div>
  </form>
  <p class=note>Goes to UK mobiles only &mdash; a landline is refused rather than charged for. Fine for service messages (a job, a booking, a reply). Not for marketing: that needs consent and an opt-out.</p>
</div>

<div class=card>
  <h2>&#128197; Schedule a recurring reminder</h2>
  <form method=post>
    <input type=hidden name=do value=add>
    <div class=grid>
      <div><label>Mobile number</label><input name=to placeholder="07…" required></div>
      <div><label>Who / what for</label><input name=label placeholder="Mrs Smith — backup"></div>
      <div><label>Repeat</label>
        <select name=freq id=freq onchange="document.getElementById('wk').style.display=this.value==='weekly'?'':'none';document.getElementById('mo').style.display=this.value==='monthly'?'':'none';">
          <option value=weekly>Every week</option><option value=monthly>Every month</option>
        </select></div>
      <div id=wk><label>Day</label><select name=dow>
        <?php foreach ($DOWS as $n => $nm): ?><option value="<?=$n?>"<?=$n==5?' selected':''?>><?=$nm?></option><?php endforeach; ?>
      </select></div>
      <div id=mo style="display:none"><label>Day of month</label><select name=dom>
        <?php for ($i=1;$i<=28;$i++): ?><option value="<?=$i?>"><?=$i?></option><?php endfor; ?>
      </select></div>
      <div><label>Time</label>
        <select name=hour>
          <?php for ($i=TM_SCHED_MIN_HOUR;$i<=TM_SCHED_MAX_HOUR;$i++): ?>
            <option value="<?=$i?>"<?=$i==9?' selected':''?>><?=sprintf('%02d:00',$i)?></option>
          <?php endfor; ?>
        </select></div>
    </div>
    <div style="margin-top:.7rem"><label>Message</label><textarea name=text maxlength=500 required placeholder="Time to plug your backup drive in — leave it connected for an hour or so. 365 Techies"></textarea></div>
    <div style="margin-top:.6rem"><label style="display:flex;gap:.5rem;align-items:center;font-size:.85rem;color:#eef2f8">
      <input type=checkbox name=optout value=1 checked style="width:auto"> Add &ldquo;to stop these reminders just let us know&rdquo; to the end
    </label></div>
    <div style="margin-top:.8rem"><button type=submit>Save reminder</button></div>
  </form>
  <p class=note>Only sends between <?=TM_SCHED_MIN_HOUR?>:00 and <?=TM_SCHED_MAX_HOUR?>:00. If a send is missed by more than 6 hours it is skipped rather than arriving late &mdash; a Friday backup nudge landing on Sunday is worse than none.</p>
</div>

<div class=card>
  <h2>&#128203; Scheduled reminders</h2>
  <?php if (!$rows): ?>
    <p class=note>Nothing scheduled yet.</p>
  <?php else: ?>
  <table>
    <tr><th>Who</th><th>When</th><th>Next</th><th>Sent</th><th>Message</th><th></th></tr>
    <?php foreach ($rows as $s):
      $when = ($s['freq'] === 'monthly')
        ? ('Day ' . (int)$s['dom'] . ' monthly, ' . sprintf('%02d:00', (int)$s['hour']))
        : ($DOWS[(int)$s['dow']] . 's, ' . sprintf('%02d:00', (int)$s['hour'])); ?>
    <tr>
      <td><?=$h($s['label'])?><div class="mono" style="color:#9fb5d3"><?=$h($s['to'])?></div></td>
      <td><?=$h($when)?></td>
      <td><?= !empty($s['active']) && !empty($s['next']) ? $h(date('D j M, g:ia', $s['next'])) : '<span class="pill off">paused</span>' ?></td>
      <td><?=(int)($s['count'] ?? 0)?></td>
      <td style="max-width:22rem;color:#9fb5d3"><?=$h(mb_strimwidth((string)$s['text'], 0, 90, '…'))?></td>
      <td style="white-space:nowrap">
        <form class=inline method=post onsubmit="return confirm('Send this text now as a test?')">
          <input type=hidden name=do value=test><input type=hidden name=id value="<?=$h($s['id'])?>">
          <button class=ghost type=submit>Test</button></form>
        <form class=inline method=post>
          <input type=hidden name=do value=toggle><input type=hidden name=id value="<?=$h($s['id'])?>">
          <button class=ghost type=submit><?= !empty($s['active']) ? 'Pause' : 'Resume' ?></button></form>
        <form class=inline method=post onsubmit="return confirm('Delete this reminder?')">
          <input type=hidden name=do value=del><input type=hidden name=id value="<?=$h($s['id'])?>">
          <button class=warn type=submit>Delete</button></form>
      </td>
    </tr>
    <?php endforeach; ?>
  </table>
  <?php endif; ?>
  <p class=note style="margin-top:.9rem">Sending happens on a cron every 15 minutes
    (<span class=mono>php .../api/tm-cron.php</span>). <a href="tm-cron.php" target="_blank" rel="noopener">Run it now</a> to test.</p>
</div>

<div class=card>
  <h2>&#128220; Recent sends</h2>
  <?php if (!$log): ?><p class=note>Nothing sent yet.</p><?php else: ?>
  <table>
    <tr><th>When</th><th>To</th><th>Why</th><th>Result</th></tr>
    <?php foreach (array_reverse($log) as $l): ?>
    <tr><td class=mono><?=$h(date('j M, H:i', (int)$l['t']))?></td>
        <td class=mono><?=$h($l['to'])?></td>
        <td><?=$h($l['ref'])?></td>
        <td><?=$h($l['status'])?></td></tr>
    <?php endforeach; ?>
  </table>
  <?php endif; ?>
  <p class=note>Numbers are part-masked and message text is never stored.</p>
</div>
</body></html>
