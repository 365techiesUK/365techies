<?php
/**
 * "Job done" email - the message a one-off customer gets the moment a remote fix, tune-up or repair is
 * finished: what we did, in their words, and the one honest next step (a support plan, rolling monthly,
 * cancel any time). This is the highest-value email the July email audit identified and the cheapest
 * route to a plan: a person who has just been helped, offered the plan by the people who helped them.
 *
 * Pure parts here (build the text + HTML); pcm-jobs.php action=done validates, sends and records.
 * Prices come from PRICES below and nowhere else - keep them equal to the plan pages. No review ask,
 * no discount that has not been agreed, no phone number in the subject.
 */
if (!defined('PCM_JOBMAIL_LIB')) {
    define('PCM_JOBMAIL_LIB', 1);

define('JD_SITE', 'https://365techies.co.uk');
define('JD_PRICES', array('home' => '18.25', 'home_m365' => '23.10', 'business' => '24.38'));   // equal to the plan pages, always

function jd_first($name) {
    $n = trim(preg_replace('/\s+/', ' ', (string)$name));
    if ($n === '') return 'there';
    $f = explode(' ', $n)[0];
    if (preg_match('/^(mr|mrs|ms|miss|dr|prof)\.?$/i', $f) && strpos($n, ' ') !== false) return $n;   // "Mrs Wilson" stays whole
    return $f;
}

/** Lines of "what we did": newline- or array-separated, trimmed, capped, no HTML. */
function jd_lines($did, $max = 8) {
    $arr = is_array($did) ? $did : preg_split('/\r?\n/', (string)$did);
    $out = array();
    foreach ($arr as $l) {
        $l = trim(preg_replace('/\s+/', ' ', strip_tags((string)$l)));
        $l = ltrim($l, "-*•· ");
        if ($l === '') continue;
        $out[] = mb_substr($l, 0, 160);
        if (count($out) >= $max) break;
    }
    return $out;
}

function jd_esc($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

/**
 * Build the email. $plan = 'home' | 'business'. $amount = agreed price (0 = not mentioned).
 * Returns array(subject, text, html).
 */
function jd_build($name, $did, $amount = 0.0, $plan = 'home', $now = null) {
    $first = jd_first($name);
    $lines = jd_lines($did);
    $biz   = ($plan === 'business');
    $amount = round((float)$amount, 2);
    $plansUrl = JD_SITE . ($biz ? '/business-it-support-plans/' : '/monthly-it-support/');
    $appUrl   = JD_SITE . '/free-pc-health-check/';
    $price    = $biz ? ('from £' . JD_PRICES['business'] . ' a month per computer') : ('£' . JD_PRICES['home'] . ' a month per computer');
    $subject  = 'Your computer is sorted - here is what we did';

    // ---- plain text
    $t = "Hi " . $first . ",\n\n";
    $t .= "That's done. Here is what we did today:\n\n";
    foreach ($lines as $l) $t .= "  - " . $l . "\n";
    if (!$lines) $t .= "  - The job we agreed on the phone.\n";
    $t .= "\n";
    if ($amount > 0) $t .= "Agreed price: £" . number_format($amount, 2) . ". Your invoice follows separately.\n\n";
    $t .= "Keep it this way\n";
    $t .= "Most problems we fix come back because nobody is watching. On a 365 support plan your computer gets a full service every six weeks - Windows, driver and app updates applied and checked, security and backup looked at, drives read for wear - and you get a written Service Report each time. "
        . ($biz ? "Business plans start at £" . JD_PRICES['business'] . " a month per computer, and the reports double as evidence for your insurer or bank." : "Home plans are " . $price . ", or £" . JD_PRICES['home_m365'] . " with Microsoft 365 included.")
        . " Rolling monthly, no lock-in, cancel whenever you like.\n\n";
    $t .= "See the plans: " . $plansUrl . "\n";
    $t .= "Or start with the free 365 PC Manager app, which watches the basics for you: " . $appUrl . "\n\n";
    $t .= "Anything not right after today? Reply to this email or ring 01202 775566 and we will look again.\n\n";
    $t .= "365 Techies\n01202 775566 - help@365techies.co.uk\n" . JD_SITE . "\n";

    // ---- html (light, table-based, one column: the same shape as the invite and confirmation emails)
    $li = '';
    foreach ($lines as $l) $li .= '<li style="margin:0 0 6px">' . jd_esc($l) . '</li>';
    if ($li === '') $li = '<li>The job we agreed on the phone.</li>';
    $h  = '<!doctype html><html><body style="margin:0;padding:0;background:#f3f6fb;font-family:Segoe UI,Arial,sans-serif;color:#17233b">';
    $h .= '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6fb"><tr><td align="center" style="padding:24px 12px">';
    $h .= '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dfe6f2">';
    $h .= '<tr><td style="background:#070d22;padding:18px 26px;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:.04em">365 TECHIES <span style="font-weight:400;color:#9fb5d3">&middot; job done</span></td></tr>';
    $h .= '<tr><td style="padding:26px 26px 6px;font-size:16px;line-height:1.55">Hi ' . jd_esc($first) . ',<br><br>That&rsquo;s done. Here is what we did today:</td></tr>';
    $h .= '<tr><td style="padding:6px 26px 6px"><ul style="margin:0;padding:0 0 0 20px;font-size:15px;line-height:1.5">' . $li . '</ul></td></tr>';
    if ($amount > 0) $h .= '<tr><td style="padding:10px 26px 4px;font-size:14px;color:#4a5876">Agreed price: <b style="color:#17233b">&pound;' . number_format($amount, 2) . '</b>. Your invoice follows separately.</td></tr>';
    $h .= '<tr><td style="padding:18px 26px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef6ff;border:1px solid #cfe1fb;border-radius:12px"><tr><td style="padding:18px 20px">';
    $h .= '<div style="font-size:17px;font-weight:700;margin:0 0 6px">Keep it this way</div>';
    $h .= '<div style="font-size:14.5px;line-height:1.55;color:#2c3a58">Most problems we fix come back because nobody is watching. On a 365 support plan your computer gets a <b>full service every six weeks</b> &mdash; Windows, driver and app updates applied and checked, security and backup looked at, drives read for wear &mdash; and a <b>written Service Report</b> each time. '
        . ($biz ? 'Business plans start at <b>&pound;' . JD_PRICES['business'] . ' a month per computer</b>, and the reports double as evidence for your insurer or bank.' : 'Home plans are <b>' . str_replace('£', '&pound;', $price) . '</b>, or &pound;' . JD_PRICES['home_m365'] . ' with Microsoft 365 included.')
        . ' Rolling monthly, no lock-in, cancel whenever you like.</div>';
    $h .= '<div style="margin:14px 0 0"><a href="' . $plansUrl . '" style="display:inline-block;background:#1d97e3;color:#ffffff;text-decoration:none;font-weight:700;padding:11px 18px;border-radius:9px;font-size:14.5px">See the plans &rarr;</a> '
        . '<a href="' . $appUrl . '" style="display:inline-block;color:#1d5fa0;text-decoration:none;font-weight:600;padding:11px 12px;font-size:14.5px">Start with the free app</a></div>';
    $h .= '</td></tr></table></td></tr>';
    $h .= '<tr><td style="padding:18px 26px 6px;font-size:14.5px;line-height:1.55">Anything not right after today? Reply to this email or ring <a href="tel:+441202775566" style="color:#1d5fa0">01202 775566</a> and we will look again.</td></tr>';
    $h .= '<tr><td style="padding:14px 26px 24px;font-size:13px;line-height:1.6;color:#6a7894">365 Techies &middot; 01202 775566 &middot; <a href="mailto:help@365techies.co.uk" style="color:#1d5fa0">help@365techies.co.uk</a> &middot; <a href="' . JD_SITE . '/" style="color:#1d5fa0">365techies.co.uk</a></td></tr>';
    $h .= '</table></td></tr></table></body></html>';
    return array($subject, $t, $h);
}

/**
 * Send text+HTML through the same route as the plan-invite email (pcm-smtp.php on the server, PHP mail() as a
 * fallback). A copy of inv_mail() rather than an include, because pcm-invite.php is an endpoint that runs on include.
 */
function jd_mail($to, $subject, $text, $html) {
    $to = strtolower(trim((string)$to));
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
    $subject = trim(preg_replace('/[\r\n\x00-\x1F]+/', ' ', (string)$subject));
    $bnd = 'j365' . bin2hex(random_bytes(8));
    $ctype = 'Content-Type: multipart/alternative; boundary="' . $bnd . '"';
    $payload = '--' . $bnd . "\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n" . $text
             . "\r\n--" . $bnd . "\r\nContent-Type: text/html; charset=UTF-8\r\n"
             . "Content-Transfer-Encoding: base64\r\n\r\n"
             . chunk_split(base64_encode($html), 76, "\r\n")
             . '--' . $bnd . "--\r\n";
    $cfg = __DIR__ . '/pcm-smtp.php';
    if (is_readable($cfg)) {
        include $cfg;
        if (!empty($SMTP_HOST) && !empty($SMTP_USER) && !empty($SMTP_PASS)) {
            $env = !empty($SMTP_FROM) ? $SMTP_FROM : $SMTP_USER;
            $port = !empty($SMTP_PORT) ? intval($SMTP_PORT) : 465;
            $fp = @stream_socket_client('ssl://' . $SMTP_HOST . ':' . $port, $en, $es, 8);
            if ($fp) {
                stream_set_timeout($fp, 10);
                $dead = false;
                $say = function ($cmd) use ($fp, &$dead) {
                    if ($dead) return '';
                    if ($cmd !== null) fwrite($fp, $cmd . "\r\n");
                    $line = ''; $n = 0;
                    while (($l = fgets($fp, 512)) !== false) {
                        $md = stream_get_meta_data($fp);
                        if (!empty($md['timed_out'])) { $dead = true; return ''; }
                        $line = $l;
                        if (strlen($l) < 4 || $l[3] !== '-') break;
                        if (++$n > 50) break;
                    }
                    $md = stream_get_meta_data($fp);
                    if (!empty($md['timed_out'])) { $dead = true; return ''; }
                    return $line;
                };
                $ok = true; $say(null);
                $ok = $ok && strpos($say('EHLO 365techies.co.uk'), '250') === 0;
                $ok = $ok && strpos($say('AUTH LOGIN'), '334') === 0;
                $ok = $ok && strpos($say(base64_encode($SMTP_USER)), '334') === 0;
                $ok = $ok && strpos($say(base64_encode($SMTP_PASS)), '235') === 0;
                $ok = $ok && strpos($say('MAIL FROM:<' . $env . '>'), '250') === 0;
                $ok = $ok && strpos($say('RCPT TO:<' . $to . '>'), '250') === 0;
                $ok = $ok && strpos($say('DATA'), '354') === 0;
                if ($ok) {
                    $msg = 'Date: ' . date('r') . "\r\n"
                         . 'Message-ID: <' . bin2hex(random_bytes(8)) . '.' . time() . "@365techies.co.uk>\r\n"
                         . 'From: 365 Techies <info@365techies.co.uk>' . "\r\n"
                         . 'Reply-To: 365 Techies <info@365techies.co.uk>' . "\r\n"
                         . 'To: <' . $to . ">\r\n"
                         . 'Subject: ' . $subject . "\r\n"
                         . "MIME-Version: 1.0\r\n" . $ctype . "\r\n\r\n"
                         . preg_replace('/^\./m', '..', $payload) . "\r\n.";
                    $ok = strpos($say($msg), '250') === 0;
                }
                if (!$dead) @fwrite($fp, "QUIT\r\n");
                fclose($fp);
                if ($ok) return true;
            }
        }
    }
    $hdr = "From: 365 Techies <info@365techies.co.uk>\r\nReply-To: info@365techies.co.uk\r\nMIME-Version: 1.0\r\n" . $ctype;
    return @mail($to, $subject, $payload, $hdr, '-finfo@365techies.co.uk');
}

}  // PCM_JOBMAIL_LIB
