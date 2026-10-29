<?php
/* "What they want" for a website enquiry or call-back request (29 Oct 2026, owner: "the way that you've given me a
   description what the guy's ... requirements are, what he wants ... could that be actually in the staff portal as well?
   So at least we know what it's all about ... to give them a call back").

   A plain-words brief made from what they typed, on our own server: the job (the first thing that matches), anything
   else they mention, the kit they have, things worth knowing before ringing (tried us already, not confident, where
   they live, their broadband), when they said to call (their own words), our set price where we have one, and what
   to watch for (Apple, scams, a clicking drive). Rules, not an AI: nothing a customer writes leaves our server, and
   the same message always gives the same brief. Include-only (comms-lib.php uses it); the test is CLI-only.

   Prices quoted here are only the ones the owner has set (memory pricing-truth): Virgin Media / Plusnet email moved
   £60 per address (Virgin includes a full PC service), Windows 11 on an older PC £60, gaming tune-up from £65,
   Cyber Essentials help £99 (+ IASME's own fee), remote fixes from £20 quoted first. Never a refund promise. */

function brief_lc($s) { return function_exists('mb_strtolower') ? mb_strtolower((string)$s, 'UTF-8') : strtolower((string)$s); }
function brief_cut($s, $n) {
    $s = trim(preg_replace('/\s+/u', ' ', (string)$s));
    if (function_exists('mb_strlen') ? mb_strlen($s) <= $n : strlen($s) <= $n) return $s;
    $s = function_exists('mb_substr') ? mb_substr($s, 0, $n - 1) : substr($s, 0, $n - 1);
    return rtrim(preg_replace('/\s+\S*$/u', '', $s), " ,;:-") . "\u{2026}";
}
/* The message without the form's journey block ("— journey —" and below) and the internal-test tag. */
function brief_split_journey($body) {
    $body = (string)$body;
    $parts = preg_split('/\n*\s*(?:\x{2014}|--)\s*journey\s*(?:\x{2014}|--)\s*\n?/u', $body, 2);
    $msg = trim(str_replace('[INTERNAL TEST]', '', $parts[0]));
    return array($msg, isset($parts[1]) ? trim($parts[1]) : '');
}
/* "first seen: 2026-10-28 via referral (https://www.bing.com/), landed on /book-service/" -> "Bing, landed on /book-service/" */
function brief_found($journey) {
    if ($journey === '') return '';
    $out = '';
    if (preg_match('/first seen:[^\n]*?via ([^\n(,]+?)(?:\s*\(([^)\s]+)\))?,\s*landed on (\S+)/i', $journey, $m)) {
        $via = trim($m[1]); $ref = isset($m[2]) ? $m[2] : ''; $land = $m[3];
        $host = $ref !== '' ? preg_replace('/^www\./', '', (string)parse_url($ref, PHP_URL_HOST)) : '';
        $names = array('google' => 'Google', 'bing' => 'Bing', 'duckduckgo' => 'DuckDuckGo', 'yahoo' => 'Yahoo', 'facebook' => 'Facebook',
            'instagram' => 'Instagram', 'yell' => 'Yell', 'nextdoor' => 'Nextdoor', 'chatgpt' => 'ChatGPT', 'openai' => 'ChatGPT',
            'perplexity' => 'Perplexity', 'copilot' => 'Copilot', 'youtube' => 'YouTube', 'linkedin' => 'LinkedIn', 'tiktok' => 'TikTok');
        $who = '';
        foreach ($names as $k => $v) { if ($host !== '' && stripos($host, $k) !== false) { $who = $v; break; } }
        if ($who === '') $who = $host !== '' ? $host : (stripos($via, 'direct') !== false ? 'came straight to the site or a search' : $via);
        $out = $who . ($land !== '?' ? ', landed on ' . $land : '');
    }
    if (preg_match('/free tools used:\s*([^\n]+)/i', $journey, $t)) $out .= ($out !== '' ? '; ' : '') . 'used our free tools: ' . trim($t[1]);
    return $out;
}
/* The job rules, in order: the first that matches is "what they want", the rest are "also mentions". Each is
   [key, pattern, headline, offer, warn]. Patterns run on the lower-cased topic + message. */
function brief_rules() {
    return array(
        array('virgin', '/(virgin|virginmedia|ntlworld|blueyonder)[^.\n]{0,80}(e-?mail|address)|(e-?mail|address)[^.\n]{0,80}(virgin|virginmedia|ntlworld|blueyonder)/u',
              'Move their Virgin Media email address', 'Virgin Media email moved for them: £60 per address, and it includes a full PC service.', ''),
        array('plusnet', '/plusnet[^.\n]{0,80}(e-?mail|address)|(e-?mail|address)[^.\n]{0,80}plusnet/u',
              'Move their Plusnet email address', 'Plusnet email moved for them: £60 per address.', ''),
        array('ispmail', '/\b(btinternet|bt|sky|talktalk|aol|tiscali|o2|orange|freeserve)\b[^.\n]{0,60}e-?mail[^.\n]{0,60}(move|moving|chang|keep|leav|switch|new|transfer)|(move|moving|chang|keep|leav|switch|transfer)[^.\n]{0,60}\b(btinternet|bt|sky|talktalk|aol|tiscali)\b[^.\n]{0,30}e-?mail/u',
              'Move their email address to a new provider', 'No set price for this provider — quote it first (£60 is Virgin Media and Plusnet).', ''),
        array('scam', '/(scam|scammer|fraud|hacked|hacker|remote access|anydesk|teamviewer|ultraviewer|cold.?call|pretend|bank (called|rang|phoned)|gave (them|him|her) (access|my)|took control)/u',
              'Possible scam or hacked account', '', 'Scam: never promise they’ll get money back.'),
        array('virus', '/(virus|malware|pop-?ups?|adware|ransom|infected)/u', 'Virus or pop-ups', 'Remote fix: from £20, quoted before we start.', ''),
        array('win11', '/(windows ?11|win ?11|windows ?10[^.\n]{0,40}(support|end|stop|finish))/u',
              'Windows 11 upgrade', 'Windows 11 on an older-processor PC: £60, agreed first.', ''),
        array('data', '/(lost (all )?(of )?(my |our |the )?(files|photos|pictures|documents|data|work)|data recovery|recover (my|our|the|some)|deleted (files|photos|pictures)|hard ?drive[^.\n]{0,30}(died|dead|failed|click|not (work|recogn))|clicking)/u',
              'Lost files or a failed drive', '', ''),
        array('net', '/((wi-?fi|internet|broadband|router|connection)[^.\n]{0,60}(slow|drop|down|not work|keeps|stopp|won\'?t|problem|issue|cut)|(no|lost|losing|poor|weak) (internet|wi-?fi|signal|connection))/u',
              'Internet or Wi-Fi problem', '', ''),
        array('slow', '/(slow|freez|crash|blue screen|bsod|won\'?t (start|boot|turn on|load)|not (starting|booting|turning on)|keeps restart|restarting)/u',
              'PC slow, crashing or not starting', 'Remote fix: from £20, quoted before we start.', ''),
        array('locked', '/(locked out|forgot(ten)? (my |the )?password|can\'?t (log|sign) ?in|cannot (log|sign) ?in|password reset|two.?(factor|step)|verification code|authenticator)/u',
              'Locked out of an account', '', ''),
        array('email', '/(e-?mail|outlook)[^.\n]{0,50}(not work|stopp|won\'?t|can\'?t|cannot|problem|issue|missing|disappear|not (send|receiv|com))/u',
              'Email not working', 'Remote fix: from £20, quoted before we start.', ''),
        array('printer', '/(printer|scanner|\bprint(ing)?\b)/u', 'Printer or scanner problem', 'Remote fix: from £20, quoted before we start.', ''),
        array('newpc', '/((buy|get|need|want|looking for|recommend|choos|replac|set ?up|setting up)\w*[^.\n]{0,25}\bnew (laptop|computer|pc|desktop|machine)|replac\w* (my |the |our |this )?(laptop|computer|pc|desktop|machine)|buy(ing)? a (laptop|computer|pc)|recommend a (laptop|computer|pc))/u',
              'A new computer — choosing or setting one up', '', ''),
        array('gaming', '/(gaming|graphics card|\bfps\b|steam)/u', 'Gaming PC tune-up', 'Gaming PC tune-up: from £65, confirmed before we start.', ''),
        array('ce', '/cyber essentials/u', 'Cyber Essentials', 'Cyber Essentials help: £99 (no VAT), plus IASME’s own fee, which they pay.', ''),
        array('m365', '/(microsoft 365|office 365|\bm365\b|microsoft office|office (licen|subscri|install))/u', 'Microsoft 365 or Office', '', ''),
        array('backup', '/(back ?up|backup)/u', 'Backups', '', ''),
        array('web', '/(website|web site|domain name|web hosting)/u', 'A website or domain', '', ''),
        array('plan', '/(support plan|monthly (support|plan)|maintenance|regular (check|service)|ongoing support)/u', 'Ongoing support / a support plan', '', ''),
    );
}
function brief_devices($t) {
    $map = array(
        array('/\bwindows\b[^.\n]{0,12}\b(pc|computer|desktop)\b|\b(pc|desktop)\b/u', 'Windows PC'),
        array('/\blaptop\b/u', 'laptop'),
        array('/\boutlook\b/u', 'Outlook'),
        array('/\bipad\b/u', 'iPad'),
        array('/\biphone\b/u', 'iPhone'),
        array('/\bmacbook\b|\bimac\b|\bmac\b/u', 'Mac'),
        array('/\bandroid\b|\bsamsung (phone|galaxy|tablet)\b|\bgalaxy\b/u', 'Android'),
        array('/\bchromebook\b/u', 'Chromebook'),
    );
    $out = array();
    foreach ($map as $x) if (preg_match($x[0], $t)) $out[] = $x[1];
    return $out;
}
function brief_town($t) {
    $towns = array('Mudeford', 'Highcliffe', 'Christchurch', 'Southbourne', 'Boscombe', 'Westbourne', 'Bournemouth', 'Poole', 'Parkstone', 'Broadstone',
        'Canford', 'Hamworthy', 'Sandbanks', 'Lilliput', 'Upton', 'Creekmoor', 'Oakdale', 'Kinson', 'Bearwood', 'Northbourne', 'Moordown', 'Winton',
        'Charminster', 'Throop', 'Castle Lane', 'Littledown', 'Iford', 'Tuckton', 'Pokesdown', 'Queens Park', 'Talbot Woods', 'Ferndown', 'West Moors',
        'Wimborne', 'Colehill', 'Corfe Mullen', 'Merley', 'Verwood', 'St Leonards', 'St Ives', 'Ringwood', 'Burton', 'Bransgore', 'Sopley', 'Hinton',
        'New Milton', 'Barton on Sea', 'Milford on Sea', 'Lymington', 'Wareham', 'Swanage', 'Purbeck', 'Sturminster', 'Blandford', 'Fordingbridge');
    foreach ($towns as $tw) if (preg_match('/\b' . preg_quote(brief_lc($tw), '/') . '\b/u', $t)) return $tw;
    if (preg_match('/\b(bh\d{1,2})\s*\d[a-z]{2}\b/u', $t, $m) || preg_match('/\b(bh\d{1,2})\b/u', $t, $m)) return strtoupper($m[1]);
    return '';
}
function brief_broadband($t) {
    $isp = '(sky|bt|virgin media|virgin|talktalk|ee|plusnet|vodafone|shell energy|now broadband|hyperoptic|zen|community fibre|toob|truespeed|cuckoo|giganet|trooli|wightfibre)';
    if (preg_match('/\b' . $isp . '\b[^.\n]{0,40}\bbroadband\b/u', $t, $m) || preg_match('/\bbroadband\b[^.\n]{0,30}\b(?:with|from|is|through|by)\s+' . $isp . '\b/u', $t, $m)) {
        $k = $m[1];
        $nice = array('sky' => 'Sky', 'bt' => 'BT', 'virgin' => 'Virgin Media', 'virgin media' => 'Virgin Media', 'talktalk' => 'TalkTalk', 'ee' => 'EE',
            'plusnet' => 'Plusnet', 'vodafone' => 'Vodafone', 'shell energy' => 'Shell Energy', 'now broadband' => 'NOW', 'hyperoptic' => 'Hyperoptic',
            'zen' => 'Zen', 'community fibre' => 'Community Fibre', 'toob' => 'Toob', 'truespeed' => 'Truespeed', 'cuckoo' => 'Cuckoo', 'giganet' => 'Giganet',
            'trooli' => 'Trooli', 'wightfibre' => 'WightFibre');
        return $nice[$k] ?? ucfirst($k);
    }
    return '';
}
/* Their own sentence about when to ring, if they wrote one. */
function brief_when($msg) {
    $sentences = preg_split('/(?<=[.!?])\s+|\n+/u', $msg);
    foreach ($sentences as $s) {
        $l = brief_lc($s);
        if (preg_match('/(availab|best time|call me|ring me|phone me|contact me|mornings?\b|afternoons?\b|evenings?\b|weekends?\b|after \d|before \d|between \d|answerphone|answer ?machine|answering machine|out (at|until|all)|at work|working (hours|days)|not in (on|until))/u', $l))
            return brief_cut($s, 220);
    }
    return '';
}
/* The brief for one inbox item (comms-lib's web item fields: label, topic, body, company). */
function comms_lead_brief(array $w) {
    $label = (string)($w['label'] ?? ''); $topic = trim((string)($w['topic'] ?? '')); $company = trim((string)($w['company'] ?? ''));
    list($msg, $journey) = brief_split_journey((string)($w['body'] ?? ''));
    $t = brief_lc($topic . "\n" . $msg);
    $b = array('need' => '', 'also' => array(), 'urgent' => false, 'facts' => array(), 'when' => '', 'offer' => '', 'warn' => array(), 'found' => brief_found($journey));

    // the request types that say what they are by themselves
    if ($label === 'Unfinished booking') {
        $b['need'] = 'Started booking online but didn’t finish';
        if ($topic !== '') $b['facts'][] = $topic;
    } elseif ($label === 'Email move call-back') {
        $b['need'] = 'Stuck moving their Virgin Media email in PC Manager — wants us to do it';
        $b['offer'] = 'Virgin Media email moved for them: £60 per address, and it includes a full PC service.';
    } elseif ($label === 'Report look-over') {
        $b['need'] = 'Wants a free look-over of their PC Manager report — they asked for an email back';
    } elseif ($label === 'Get Help button') {
        $b['need'] = 'Pressed Get Help in their browser — wants a call back';
    } elseif (preg_match('/ order$/', $label)) {
        $b['need'] = 'Ordered ' . preg_replace('/ order$/', '', $label) . ' on the website — set it up and ring them';
    }

    // what they mention first leads (a scam always does); the rest are "also mentions"
    $hits = array(); $found = array();
    foreach (brief_rules() as $i => $r) {
        if (!preg_match($r[1], $t, $pm, PREG_OFFSET_CAPTURE)) continue;
        if ($r[0] === 'ispmail' && (in_array('virgin', $hits, true) || in_array('plusnet', $hits, true))) continue;
        $hits[] = $r[0];
        $found[] = array($r[0] === 'scam' ? -1 : $pm[0][1], $i, $r);
    }
    usort($found, function ($a, $b) { return $a[0] === $b[0] ? $a[1] - $b[1] : $a[0] - $b[0]; });
    foreach ($found as $f) {
        $r = $f[2];
        if ($b['need'] === '') { $b['need'] = $r[2]; if ($b['offer'] === '') $b['offer'] = $r[3]; }
        elseif ($r[2] !== $b['need']) $b['also'][] = $r[2];
        if ($r[4] !== '') $b['warn'][] = $r[4];
    }
    if (in_array('virgin', $hits, true) && preg_match('/\bgmail\b/u', $t)) $b['need'] .= ' to Gmail';
    if (in_array('data', $hits, true) && preg_match('/click/u', $t)) $b['warn'][] = 'A clicking drive: ask them to leave it switched off until we have it.';
    if ($b['need'] === '') {
        $first = preg_split('/(?<=[.!?])\s+|\n+/u', $msg, 2);
        $b['need'] = $topic !== '' && $first[0] !== '' ? $topic . ': ' . brief_cut($first[0], 110) : ($topic !== '' ? $topic : ($first[0] !== '' ? brief_cut($first[0], 140) : 'No details given — ring and ask'));
    }
    $b['also'] = array_values(array_unique(array_slice($b['also'], 0, 3)));

    $b['urgent'] = (bool)preg_match('/(urgent|asap|a\.s\.a\.p|as soon as possible|emergency|immediately|right away|desperate|today if)/u', $t);
    if (preg_match('/(left (a |you a |an? )?(message|voicemail|answerphone)|tried (to )?(call|ring|phone|contact|get hold)|no (reply|response|reaction|answer)|haven\'?t heard|not heard back|still waiting|rang (you|earlier|this morning|yesterday)|called (you|earlier|yesterday))/u', $t))
        $b['facts'][] = 'Says they’ve already tried to reach us — ring them first';
    $kit = brief_devices($t);
    if ($kit) $b['facts'][] = 'Uses: ' . implode(', ', $kit);
    $bb = brief_broadband($t);
    if ($bb !== '') $b['facts'][] = 'Broadband: ' . $bb;
    foreach (preg_split('/(?<=[.!?])\s+|\n+/u', $t) as $s) {
        if (preg_match('/(literate|technical|tech.?savvy|techy|confident|good with (computers|technology|tech|it)|computer savvy)/u', $s)
            && preg_match('/(\bnot\b|no longer|n\'t|\bnever\b|struggl|isn\'?t|wasn\'?t)/u', $s)) { $b['facts'][] = 'Not confident with computers — go gently'; break; }
        if (preg_match('/(computer ?illiterate|technophobe|hopeless with|useless with|not (very )?good with)/u', $s)) { $b['facts'][] = 'Not confident with computers — go gently'; break; }
    }
    if ($company !== '') $b['facts'][] = 'Business: ' . $company;
    elseif (preg_match('/\b(my business|our business|our company|our office|my company|small business|our staff|my staff|employees)\b/u', $t)) $b['facts'][] = 'A business';
    $town = brief_town($t);
    if ($town !== '') $b['facts'][] = 'Area: ' . $town;
    $b['when'] = brief_when($msg);

    $apple = array_values(array_intersect($kit, array('iPad', 'iPhone', 'Mac')));
    if ($apple) array_unshift($b['warn'], 'Mentions ' . implode(' and ', $apple) . ' — we don’t support Apple, so say up front that part is theirs.');
    $b['warn'] = array_values(array_unique($b['warn']));
    return $b;
}
