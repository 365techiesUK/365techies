<?php
/*
 * The customer book (6 Oct 2026). Owner: "we want it so we could search for customers there, and bring up their
 * details, and also be able to edit their contact details in the portal. At the moment there's no way to search for
 * any particular customer apart from their bookings ... mobile numbers, telephone numbers, the company details".
 *
 * A customer's details live in four places, none of them a customer list:
 *   - the job list (pcm-jobs.json): every "New job in" card, from Slack or the portal's New customer;
 *   - the PC Manager records (pcm-data.json customers): the app's licences, with the numbers and address the customer
 *     typed in their own portal;
 *   - SimplyBook's clients: everyone who booked;
 *   - and this book (pcm-custbook.json): what staff have edited.
 * The search reads all four and folds the rows that are plainly the same person into one: the same email, the same
 * phone number, the same SimplyBook client. Two Smiths with nothing in common stay two Smiths - never a name match.
 *
 * Edits are saved HERE, not into the sources. SimplyBook's client edit is documented to replace rather than merge and
 * can wipe fields its API cannot read (pcm-sbclient-canary.php has never been signed off), the PC Manager numbers are
 * the customer's own, and a job is a record of what was written up at the time. So the book is laid over the top:
 * a field staff have set wins, a field they have cleared stays clear, anything else comes from the sources in the order
 * the customer's own portal > the newest job > the booking record. The texts inbox names callers from the book too.
 *
 * Library only: pure functions plus the store's locked read-modify-write. NO closing tag in this file.
 */

if (!function_exists('pcm_phone_norm')) require_once __DIR__ . '/pcm-phone-lib.php';

define('CB_STORE', __DIR__ . '/pcm-custbook.json');
define('CB_FIELDS', 'name,company,email,phone,mobile,address,postcode,website,note');

function cb_fields() { return explode(',', CB_FIELDS); }

/* ---------------------------------------------------------------- tidying */
function cb_str($s, $max) {
    $s = trim(preg_replace('/\s+/u', ' ', preg_replace('/[\x00-\x1F\x7F]+/', ' ', (string)$s)));
    $s = str_replace('*', '', $s);
    return function_exists('mb_substr') ? mb_substr($s, 0, $max) : substr($s, 0, $max);
}
function cb_email($s) {
    $e = strtolower(trim((string)$s));
    return ($e !== '' && filter_var($e, FILTER_VALIDATE_EMAIL)) ? $e : '';
}
/* A number we can key on: only one we trust as dialable (E.164). An odd one is kept for display, never used to join. */
function cb_phone_key($s) {
    $n = pcm_phone_norm($s);
    return ($n !== '' && preg_match('/^\+\d{10,15}$/', $n)) ? $n : '';
}
function cb_phone_show($s) {
    $n = pcm_phone_norm($s);
    return $n === '' ? '' : pcm_phone_display($n);
}
function cb_postcode($s) {
    $p = strtoupper(cb_str($s, 12));
    if (preg_match('/^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/', str_replace(' ', '', $p), $m)) return $m[1] . ' ' . $m[2];
    return $p;
}
/* "8 Copsewood Avenue, Bournemouth BH8 9NG" + "BH8 9NG" -> "8 Copsewood Avenue, Bournemouth" */
function cb_addr_strip($addr, $pc) {
    $a = cb_str($addr, 200);
    if ($pc !== '') {
        $re = '/[\s,]*' . str_replace('\ ', '\s*', preg_quote($pc, '/')) . '\s*$/i';
        $a = trim(preg_replace($re, '', $a), " ,");
    }
    return $a;
}
function cb_web($s) {
    return preg_replace('#/$#', '', preg_replace('#^https?://#i', '', cb_str($s, 120)));
}

/* ---------------------------------------------------------------- the sources -> rows
   One row per source record, in one shape:
   src (job|pcm|sb|book), id, ts (when it last mattered), the contact fields, and the keys that join it to others. */
function cb_row($src, $id, $ts, $f, $extra = array()) {
    $r = array('src' => $src, 'id' => (string)$id, 'ts' => (int)$ts);
    foreach (cb_fields() as $k) $r[$k] = isset($f[$k]) ? (string)$f[$k] : '';
    return array_merge($r, $extra);
}
function cb_rows_from_jobs($jobs) {
    $out = array();
    foreach ((array)$jobs as $j) {
        if (!is_array($j) || !isset($j['id'])) continue;   // a dismissed job ("not a job") still carries real contact details
        $pc = cb_postcode(isset($j['postcode']) ? $j['postcode'] : '');
        $out[] = cb_row('job', $j['id'], isset($j['ts']) ? $j['ts'] : 0, array(
            'name' => cb_str(isset($j['name']) ? $j['name'] : '', 90), 'company' => cb_str(isset($j['company']) ? $j['company'] : '', 90),
            'email' => cb_email(isset($j['email']) ? $j['email'] : ''),
            'phone' => (string)(isset($j['phone']) ? $j['phone'] : ''), 'mobile' => (string)(isset($j['mobile']) ? $j['mobile'] : ''),
            'address' => cb_addr_strip(isset($j['addr']) ? $j['addr'] : '', $pc), 'postcode' => $pc,
            'website' => cb_web(isset($j['website']) ? $j['website'] : ''),
        ), array('desc' => cb_str(isset($j['desc']) ? $j['desc'] : '', 160), 'status' => (string)(isset($j['status']) ? $j['status'] : ''),
                 'amount' => (float)(isset($j['amount']) ? $j['amount'] : 0),
                 'invoice' => (string)(!empty($j['invoice_no']) ? $j['invoice_no'] : (!empty($j['invoice_doc']) ? $j['invoice_doc'] : ''))));
    }
    return $out;
}
/* PC Manager records: the opaque id the licence table uses (never the key), the numbers and address the customer
   keeps in their portal, and the SimplyBook client the app's sign-in verified. */
function cb_rows_from_pcm($customers) {
    $out = array();
    foreach ((array)$customers as $k => $c) {
        if (!is_array($c) || !empty($c['merged_into'])) continue;
        $seen = 0;
        foreach ((isset($c['machines']) && is_array($c['machines']) ? $c['machines'] : array()) as $m) {
            $t = isset($m['seen']) ? strtotime($m['seen'] . ' UTC') : 0; if ($t > $seen) $seen = $t;
        }
        $a = isset($c['addr']) && is_array($c['addr']) ? $c['addr'] : array();
        $line = implode(', ', array_filter(array(isset($a['line1']) ? $a['line1'] : '', isset($a['line2']) ? $a['line2'] : '', isset($a['city']) ? $a['city'] : ''), 'strlen'));
        $email = cb_email(isset($c['email']) ? $c['email'] : '');
        if ($email === '') $email = cb_email(isset($c['sb_email']) ? $c['sb_email'] : '');
        $out[] = cb_row('pcm', substr(sha1('365cid|' . $k), 0, 12), $seen, array(
            'name' => cb_str(isset($c['name']) && $c['name'] !== '' ? $c['name'] : (isset($c['sb_name']) ? $c['sb_name'] : ''), 90),
            'email' => $email, 'phone' => (string)(isset($c['tel']) ? $c['tel'] : ''),
            'mobile' => (string)(isset($c['mobile']) ? $c['mobile'] : ''),
            'address' => cb_str($line, 200), 'postcode' => cb_postcode(isset($a['postcode']) ? $a['postcode'] : ''),
        ), array('sb' => (int)(isset($c['sb_client_id']) ? $c['sb_client_id'] : 0),
                 'tier' => ((isset($c['tier']) && $c['tier'] === 'pro') ? 'pro' : 'free'),
                 'sbphone' => (string)(isset($c['sb_phone']) ? $c['sb_phone'] : '')));
    }
    return $out;
}
/* SimplyBook clients as getClientList / getClient return them. */
function cb_rows_from_sb($clients) {
    $out = array();
    foreach ((array)$clients as $c) {
        if (!is_array($c) || empty($c['id'])) continue;
        $pc = cb_postcode(isset($c['zip']) ? $c['zip'] : '');
        $line = implode(', ', array_filter(array(isset($c['address1']) ? $c['address1'] : '', isset($c['address2']) ? $c['address2'] : '', isset($c['city']) ? $c['city'] : ''), 'strlen'));
        $out[] = cb_row('sb', (int)$c['id'], 0, array(
            'name' => cb_str(isset($c['name']) ? $c['name'] : '', 90), 'email' => cb_email(isset($c['email']) ? $c['email'] : ''),
            'phone' => (string)(isset($c['phone']) ? $c['phone'] : ''), 'address' => cb_str($line, 200), 'postcode' => $pc,
        ), array('sb' => (int)$c['id']));
    }
    return $out;
}
function cb_rows_from_book($book) {
    $out = array();
    foreach ((isset($book['people']) && is_array($book['people']) ? $book['people'] : array()) as $id => $p) {
        if (!is_array($p) || !empty($p['merged_into'])) continue;
        $out[] = cb_row('book', $id, isset($p['updated']) ? $p['updated'] : 0, $p,
            array('links' => isset($p['links']) && is_array($p['links']) ? $p['links'] : array(),
                  'clear' => isset($p['clear']) && is_array($p['clear']) ? $p['clear'] : array(),
                  'sb' => (int)(isset($p['links']['sb']) ? $p['links']['sb'] : 0)));
    }
    return $out;
}

/* ---------------------------------------------------------------- who is the same person
   The keys a row joins on: its email, its trusted numbers, its SimplyBook client, and - for a book record - the
   emails, numbers and client it was saved with (so a corrected email still finds the old jobs). */
function cb_keys($r) {
    $k = array();
    if ($r['email'] !== '') $k[] = 'e:' . $r['email'];
    foreach (array('phone', 'mobile') as $f) { $n = cb_phone_key($r[$f]); if ($n !== '') $k[] = 'p:' . $n; }
    if (!empty($r['sb'])) $k[] = 's:' . (int)$r['sb'];
    if ($r['src'] === 'book') {
        $k[] = 'b:' . $r['id'];
        $L = isset($r['links']) ? $r['links'] : array();
        foreach ((isset($L['emails']) ? (array)$L['emails'] : array()) as $e) { $e = cb_email($e); if ($e !== '') $k[] = 'e:' . $e; }
        foreach ((isset($L['phones']) ? (array)$L['phones'] : array()) as $p) { $p = cb_phone_key($p); if ($p !== '') $k[] = 'p:' . $p; }
        foreach ((isset($L['jobs']) ? (array)$L['jobs'] : array()) as $jid) $k[] = 'j:' . $jid;
    }
    if ($r['src'] === 'job') $k[] = 'j:' . $r['id'];
    if ($r['src'] === 'pcm') $k[] = 'k:' . $r['id'];
    return array_values(array_unique($k));
}
/* Union-find over the keys. Returns the clusters as lists of row indexes. */
function cb_cluster($rows) {
    $parent = array();
    $find = function ($x) use (&$parent, &$find) { while ($parent[$x] !== $x) { $parent[$x] = $parent[$parent[$x]]; $x = $parent[$x]; } return $x; };
    $owner = array();
    foreach ($rows as $i => $r) {
        $parent[$i] = $i;
        foreach (cb_keys($r) as $key) {
            if (!isset($owner[$key])) { $owner[$key] = $i; continue; }
            $a = $find($i); $b = $find($owner[$key]);
            if ($a !== $b) $parent[$a] = $b;
        }
    }
    $groups = array();
    foreach ($rows as $i => $r) $groups[$find($i)][] = $i;
    return array_values($groups);
}

/* ---------------------------------------------------------------- one person, as shown
   Each field: the book's if staff set it (or cleared it), else the customer's own portal, else the newest job, else
   the booking record. 'from' says which, so the card can show where a value came from. */
function cb_person($rows, $idx) {
    $book = null; $pcm = array(); $jobs = array(); $sb = array();
    foreach ($idx as $i) {
        $r = $rows[$i];
        if ($r['src'] === 'book') { if ($book === null || $r['ts'] > $book['ts']) $book = $r; }
        elseif ($r['src'] === 'pcm') $pcm[] = $r;
        elseif ($r['src'] === 'job') $jobs[] = $r;
        elseif ($r['src'] === 'sb') $sb[] = $r;
    }
    usort($jobs, function ($a, $b) { return $b['ts'] - $a['ts']; });
    usort($pcm, function ($a, $b) { return $b['ts'] - $a['ts']; });
    $order = array_merge($pcm, $jobs, $sb);
    $p = array(); $from = array();
    // the mobile before the phone: a "contact number" that is really the mobile is skipped for the phone box, so an
    // older landline still shows
    $calc = array_merge(array_diff(cb_fields(), array('phone')), array('phone'));
    foreach ($calc as $f) {
        $p[$f] = ''; $from[$f] = '';
        if ($book !== null && (in_array($f, $book['clear'], true) || $book[$f] !== '')) { $p[$f] = $book[$f]; $from[$f] = $book[$f] !== '' ? 'book' : ''; continue; }
        if ($f === 'note') continue;
        $mk = $f === 'phone' ? cb_phone_key($p['mobile']) : '';
        foreach ($order as $r) {
            if ($r[$f] === '') continue;
            if ($mk !== '' && cb_phone_key($r[$f]) === $mk) continue;
            $p[$f] = $r[$f]; $from[$f] = $r['src']; break;
        }
    }
    // no mobile, but the one number we have IS a UK mobile: show it as the mobile (that is the one a text reaches)
    $mobCleared = $book !== null && in_array('mobile', $book['clear'], true);
    if ($p['mobile'] === '' && !$mobCleared && $from['phone'] !== 'book' && strpos(cb_phone_key($p['phone']), '+447') === 0) {
        $p['mobile'] = $p['phone']; $from['mobile'] = $from['phone']; $p['phone'] = ''; $from['phone'] = '';
    }
    $p = array_merge(array_flip(cb_fields()), $p); $from = array_merge(array_flip(cb_fields()), $from);   // field order as listed
    foreach (array('phone', 'mobile') as $f) if ($p[$f] !== '') { $s = cb_phone_show($p[$f]); if ($s !== '') $p[$f] = $s; }
    $names = array();
    foreach ($idx as $i) { $n = $rows[$i]['name']; if ($n !== '' && strcasecmp($n, $p['name']) !== 0) $names[strtolower($n)] = $n; }
    $sbId = 0; foreach ($idx as $i) if (!empty($rows[$i]['sb'])) { $sbId = (int)$rows[$i]['sb']; break; }
    $tier = ''; foreach ($pcm as $r) { if ($r['tier'] === 'pro') { $tier = 'pro'; break; } $tier = 'free'; }
    $last = 0; foreach ($idx as $i) if ($rows[$i]['ts'] > $last) $last = $rows[$i]['ts'];
    return array('ref' => cb_ref($rows, $idx), 'fields' => $p, 'from' => $from, 'aka' => array_values(array_slice($names, 0, 5)),
        'jobs' => count($jobs), 'booked' => count($sb) > 0 || $sbId > 0, 'sb' => $sbId, 'pcm' => $tier, 'edited' => $book !== null,
        'last' => $last);
}
/* The handle the portal uses to come back to this person: the book record once there is one, else the strongest key. */
function cb_ref($rows, $idx) {
    $best = ''; $rank = array('b' => 0, 's' => 1, 'e' => 2, 'k' => 3, 'p' => 4, 'j' => 5);
    foreach ($idx as $i) foreach (cb_keys($rows[$i]) as $k) {
        $t = $k[0];
        if (!isset($rank[$t])) continue;
        if ($best === '' || $rank[$t] < $rank[$best[0]] || ($rank[$t] === $rank[$best[0]] && strcmp($k, $best) < 0)) $best = $k;
    }
    return $best;
}
/* The cluster a ref names (the indexes of every row in it), or null. */
function cb_cluster_for($rows, $ref) {
    foreach (cb_cluster($rows) as $g) foreach ($g as $i) if (in_array($ref, cb_keys($rows[$i]), true)) return $g;
    return null;
}

/* ---------------------------------------------------------------- search
   Words in any order, each found somewhere in the row; a run of digits (6+) is matched as a phone number, so
   "07700 900123", "07700900123" and "+447700900123" all find the same customer. */
function cb_matches($r, $q) {
    $q = trim((string)$q);
    if ($q === '') return false;
    $digits = preg_replace('/\D/', '', $q);
    if (strlen($digits) >= 6 && !preg_match('/[a-z@]/i', $q)) {
        foreach (array('phone', 'mobile') as $f) {
            $d = preg_replace('/\D/', '', (string)$r[$f]);
            if ($d === '') continue;
            $n = cb_phone_key($r[$f]); $nat = $n !== '' && strpos($n, '+44') === 0 ? '0' . substr($n, 3) : $d;
            $qn = strpos($digits, '44') === 0 && strlen($digits) >= 12 ? '0' . substr($digits, 2) : $digits;
            if (strpos($nat, $qn) !== false || strpos($d, $digits) !== false) return true;
        }
        return false;
    }
    $hay = strtolower(implode(' | ', array($r['name'], $r['company'], $r['email'], $r['address'], $r['postcode'], str_replace(' ', '', $r['postcode']), $r['website'])));
    foreach (preg_split('/\s+/', strtolower($q)) as $w) if ($w !== '' && strpos($hay, $w) === false) return false;
    return true;
}
function cb_search($rows, $q, $limit = 25) {
    $hit = array();
    foreach ($rows as $i => $r) if (cb_matches($r, $q)) $hit[$i] = true;
    if (!$hit) return array();
    $out = array();
    foreach (cb_cluster($rows) as $g) {
        $any = false; foreach ($g as $i) if (isset($hit[$i])) { $any = true; break; }
        if ($any) $out[] = cb_person($rows, $g);
    }
    usort($out, function ($a, $b) { return $b['last'] - $a['last']; });
    return array_slice($out, 0, $limit);
}
/* The jobs of one person, newest first, as the card lists them. */
function cb_jobs_of($rows, $idx, $limit = 12) {
    $j = array();
    foreach ($idx as $i) if ($rows[$i]['src'] === 'job') $j[] = $rows[$i];
    usort($j, function ($a, $b) { return $b['ts'] - $a['ts']; });
    $out = array();
    foreach (array_slice($j, 0, $limit) as $r)
        $out[] = array('id' => $r['id'], 'ts' => $r['ts'], 'desc' => $r['desc'], 'status' => $r['status'], 'amount' => $r['amount'], 'invoice' => $r['invoice'], 'name' => $r['name']);
    return $out;
}

/* ---------------------------------------------------------------- saving
   What staff typed, tidied and checked. Errors keyed by field, in plain words. */
function cb_read($raw) {
    $raw = is_array($raw) ? $raw : array();
    $g = function ($k) use ($raw) { return isset($raw[$k]) && is_scalar($raw[$k]) ? (string)$raw[$k] : ''; };
    $v = array('name' => cb_str($g('name'), 90), 'company' => cb_str($g('company'), 90), 'email' => strtolower(cb_str($g('email'), 120)),
        'phone' => cb_str($g('phone'), 30), 'mobile' => cb_str($g('mobile'), 30), 'address' => cb_str($g('address'), 200),
        'postcode' => cb_postcode($g('postcode')), 'website' => cb_web($g('website')),
        'note' => function_exists('mb_substr') ? mb_substr(trim(str_replace(array("\r\n", "\r"), "\n", preg_replace('/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]+/', ' ', $g('note')))), 0, 600) : substr(trim($g('note')), 0, 600));
    $e = array();
    if ($v['name'] === '' && $v['company'] === '') $e['name'] = "Please put a name (or the company).";
    if ($v['email'] !== '' && !filter_var($v['email'], FILTER_VALIDATE_EMAIL)) $e['email'] = "That doesn't look like an email address.";
    foreach (array('phone' => 'landline', 'mobile' => 'mobile') as $f => $w)
        if ($v[$f] !== '' && strlen(preg_replace('/\D/', '', $v[$f])) < 9) $e[$f] = "That " . $w . " number looks too short.";
    if ($v['website'] !== '' && !preg_match('#^[a-z0-9.-]+\.[a-z]{2,}(/\S*)?$#i', $v['website'])) $e['website'] = "That doesn't look like a website address (e.g. www.example.co.uk).";
    foreach (array('phone', 'mobile') as $f) { $n = pcm_phone_norm($v[$f]); if ($n !== '') $v[$f] = $n; }   // stored the way the texts inbox matches numbers
    return array($v, $e);
}
/* Save $v for the person whose rows are $idx. Updates their book record (the newest, if there are several - the
   others are folded into it), else makes one. The record keeps every email, number, SimplyBook client and job it has
   been joined to, so it goes on finding them after a correction. Pure: returns the new book and the record id. */
function cb_save_into($book, $rows, $idx, $v, $who, $now) {
    if (!isset($book['people']) || !is_array($book['people'])) $book['people'] = array();
    $book0 = $book;
    $shown = cb_person($rows, $idx);
    $ids = array(); foreach ($idx as $i) if ($rows[$i]['src'] === 'book') $ids[$rows[$i]['id']] = $rows[$i]['ts'];
    arsort($ids);
    $id = $ids ? (string)key($ids) : '';
    if ($id === '') { do { $id = 'C' . substr(bin2hex(random_bytes(6)), 0, 10); } while (isset($book['people'][$id])); }
    $rec = isset($book['people'][$id]) && is_array($book['people'][$id]) ? $book['people'][$id] : array('created' => $now, 'by' => $who, 'links' => array());
    $L = isset($rec['links']) && is_array($rec['links']) ? $rec['links'] : array();
    $L += array('emails' => array(), 'phones' => array(), 'jobs' => array(), 'sb' => 0);
    foreach ($idx as $i) {
        $r = $rows[$i];
        if ($r['email'] !== '') $L['emails'][] = $r['email'];
        foreach (array('phone', 'mobile') as $f) { $n = cb_phone_key($r[$f]); if ($n !== '') $L['phones'][] = $n; }
        if ($r['src'] === 'job') $L['jobs'][] = $r['id'];
        if (!empty($r['sb']) && empty($L['sb'])) $L['sb'] = (int)$r['sb'];
        if ($r['src'] === 'book' && $r['id'] !== $id && isset($book['people'][$r['id']])) {
            $book['people'][$r['id']]['merged_into'] = $id;
            foreach (array('emails', 'phones', 'jobs') as $lk) if (!empty($r['links'][$lk])) $L[$lk] = array_merge($L[$lk], (array)$r['links'][$lk]);
        }
    }
    if ($v['email'] !== '') $L['emails'][] = $v['email'];
    foreach (array('phone', 'mobile') as $f) { $n = cb_phone_key($v[$f]); if ($n !== '') $L['phones'][] = $n; }
    foreach (array('emails', 'phones', 'jobs') as $lk) $L[$lk] = array_values(array_slice(array_unique($L[$lk]), -40));
    /* Only what staff CHANGED is laid over the sources. A field they left as shown stays the sources' - so the next
       job's new mobile still comes through - and one they emptied is remembered as cleared, or a source would bring
       it straight back. */
    $clear = isset($rec['clear']) && is_array($rec['clear']) ? $rec['clear'] : array();
    $changed = array();
    foreach (cb_fields() as $f) {
        $before = (string)$shown['fields'][$f];
        if ($f === 'phone' || $f === 'mobile') $before = cb_phone_key($before) !== '' ? cb_phone_key($before) : $before;
        if (!isset($rec[$f])) $rec[$f] = '';
        if ($v[$f] === $before) continue;
        $changed[] = $f;
        $rec[$f] = $v[$f];
        $clear = array_values(array_diff($clear, array($f)));
        if ($v[$f] === '') $clear[] = $f;
    }
    $rec['clear'] = array_values(array_unique($clear));
    if (!$changed && !$ids) return array($book0, '', array());   // nothing to remember: no record made
    $rec['links'] = $L; $rec['updated'] = $now; $rec['updated_by'] = $who;
    $h = isset($rec['history']) && is_array($rec['history']) ? $rec['history'] : array();
    if ($changed) $h[] = array('at' => $now, 'by' => $who, 'fields' => $changed);
    $rec['history'] = array_slice($h, -20);
    $book['people'][$id] = $rec;
    return array($book, $id, $changed);
}

/* ---------------------------------------------------------------- the store
   pcm-custbook.json, denied over HTTP in .htaccess (the pcm-data rule), read-modify-written under its own lock. */
function cb_book_read($file = null) {
    $d = @json_decode((string)@file_get_contents($file !== null ? $file : CB_STORE), true);
    if (!is_array($d)) $d = array();
    if (!isset($d['people']) || !is_array($d['people'])) $d['people'] = array();
    return $d;
}
function cb_book_locked($fn, $file = null) {
    $f = $file !== null ? $file : CB_STORE;
    $h = @fopen($f . '.lock', 'c');
    if (!$h || !flock($h, LOCK_EX)) { if ($h) fclose($h); return array('ok' => false, 'error' => 'busy'); }
    $data = cb_book_read($f);
    $r = $fn($data);
    if (isset($r['data'])) {
        $tmp = $f . '.' . getmypid() . '.tmp';
        $j = json_encode($r['data'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($j !== false && @file_put_contents($tmp, $j, LOCK_EX) !== false) @rename($tmp, $f); else { @unlink($tmp); $r = array('ok' => false, 'error' => 'store'); }
    }
    flock($h, LOCK_UN); fclose($h);
    return $r;
}
/* For the texts inbox: number -> the name staff gave that customer (comms_names_with_jobs shape). Only where staff
   set a name (or a company): every number the record has joined, plus the ones typed into it. A record staff never
   renamed adds nothing - the jobs already name those numbers. */
function cb_book_names($file = null) {
    $out = array();
    foreach (cb_book_read($file)['people'] as $p) {
        if (!is_array($p) || !empty($p['merged_into'])) continue;
        $nm = cb_str(isset($p['name']) && $p['name'] !== '' ? $p['name'] : (isset($p['company']) ? $p['company'] : ''), 60);
        if ($nm === '') continue;
        $nums = isset($p['links']['phones']) ? (array)$p['links']['phones'] : array();
        foreach (array('mobile', 'phone') as $f) $nums[] = isset($p[$f]) ? $p[$f] : '';
        foreach ($nums as $raw) { $n = cb_phone_key($raw); if ($n !== '') $out[$n] = array('name' => $nm, 'src' => 'book'); }
    }
    return $out;
}
