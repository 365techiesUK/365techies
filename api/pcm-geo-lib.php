<?php
/*
 * "Where our customers are" - library half (21 Sep 2026).
 *
 * WHY
 * The owner asked which towns our work comes from. Search Console can only say
 * "United Kingdom", GA4 guesses a city from an IP, and a sweep of Slack for
 * postcodes is a privacy mess. The honest source was under our nose: every
 * customer record can carry a postcode (customers[key]['addr']['postcode'],
 * written by the portal's "Your details" card and the booking step). This
 * counts them by postcode DISTRICT - BH21, DT11 - and labels each district
 * with the town people actually say. Counts only; no name, email or address
 * ever leaves the server.
 *
 * Pure functions, no side effects, so pcm-geo-test.php can run them from the
 * CLI. pcm-geo.php is the staff-gated endpoint that feeds them the store.
 *
 * NO closing tag in this file.
 */

/* Postcode district -> the place a local would call it. A wrong label here is
   cosmetic (the district is the key); an absent one falls back to the area. */
function geo_districts() {
    static $d = array(
        'BH1'  => 'Bournemouth town centre / Lansdowne',
        'BH2'  => 'Bournemouth centre / West Cliff',
        'BH3'  => 'Talbot Woods / Winton (south)',
        'BH4'  => 'Westbourne / Branksome Park',
        'BH5'  => 'Boscombe',
        'BH6'  => 'Southbourne / Tuckton',
        'BH7'  => 'Boscombe East / Littledown / Iford',
        'BH8'  => 'Charminster / Queen\'s Park / Throop',
        'BH9'  => 'Winton / Moordown / Redhill',
        'BH10' => 'Kinson / Northbourne / Ensbury Park',
        'BH11' => 'Bearwood / West Howe / Wallisdown',
        'BH12' => 'Parkstone / Branksome / Alderney',
        'BH13' => 'Canford Cliffs / Sandbanks',
        'BH14' => 'Lower Parkstone / Lilliput / Penn Hill',
        'BH15' => 'Poole town / Hamworthy / Oakdale',
        'BH16' => 'Upton / Lytchett / Hamworthy (west)',
        'BH17' => 'Canford Heath / Creekmoor / Waterloo',
        'BH18' => 'Broadstone',
        'BH19' => 'Swanage / Purbeck',
        'BH20' => 'Wareham / Bovington / Wool',
        'BH21' => 'Wimborne / Colehill / Corfe Mullen',
        'BH22' => 'Ferndown / West Moors / West Parley',
        'BH23' => 'Christchurch / Highcliffe / Burton',
        'BH24' => 'Ringwood / St Leonards',
        'BH25' => 'New Milton / Barton on Sea',
        'BH31' => 'Verwood',
        'DT1'  => 'Dorchester',
        'DT2'  => 'Dorchester (villages)',
        'DT3'  => 'Weymouth (north) / Chickerell',
        'DT4'  => 'Weymouth',
        'DT5'  => 'Portland',
        'DT6'  => 'Bridport',
        'DT7'  => 'Lyme Regis / Charmouth',
        'DT8'  => 'Beaminster',
        'DT9'  => 'Sherborne',
        'DT10' => 'Sturminster Newton',
        'DT11' => 'Blandford Forum',
        'SP6'  => 'Fordingbridge',
        'SP7'  => 'Shaftesbury',
        'SP8'  => 'Gillingham (Dorset)',
        'SO40' => 'Totton',
        'SO41' => 'Lymington / Milford on Sea',
        'SO42' => 'Brockenhurst',
        'SO43' => 'Lyndhurst',
        'SO45' => 'Hythe / Waterside',
    );
    return $d;
}
/* Postcode area (the letters) -> a coarse region, for districts not in the table. */
function geo_areas() {
    static $a = array(
        'BH' => 'Bournemouth, Poole and east Dorset', 'DT' => 'Dorset (west)', 'SP' => 'Salisbury area',
        'SO' => 'Southampton / New Forest', 'PO' => 'Portsmouth area', 'BA' => 'Bath / Somerset',
        'TA' => 'Taunton area', 'EX' => 'Exeter area', 'GU' => 'Guildford area', 'RG' => 'Reading area',
    );
    return $a;
}

/* "BH21 1TH" -> "BH21"; "bh211th" -> "BH21"; "BH21" -> "BH21"; anything else -> ''. */
function geo_outward($postcode) {
    $s = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)$postcode));
    if ($s === '') return '';
    if (preg_match('/^([A-Z]{1,2}[0-9][A-Z0-9]?)[0-9][A-Z]{2}$/', $s, $m)) return $m[1];   // full postcode
    if (preg_match('/^[A-Z]{1,2}[0-9][A-Z0-9]?$/', $s)) return $s;                         // outward only
    return '';
}
function geo_area_of($district) {
    return preg_match('/^([A-Z]{1,2})/', (string)$district, $m) ? $m[1] : '';
}
function geo_label($district) {
    $d = geo_districts();
    if (isset($d[$district])) return $d[$district];
    $a = geo_areas(); $area = geo_area_of($district);
    return isset($a[$area]) ? $a[$area] : 'Outside our usual area';
}

/* The tally. Hand it customers[] and get counts back - nothing else.
   plan  = tier 'pro' (on a support plan)
   other = everyone else with a record (free app, one-off jobs)
   Self-serve sign-in identities (via='signin') are not customers and are left
   out of the totals, so coverage is honest about the records that matter. */
function geo_tally($customers) {
    $rows = array(); $byArea = array();
    $total = 0; $with = 0; $bad = 0; $signin = 0; $plan = 0;
    foreach ((array)$customers as $key => $c) {
        if (!is_array($c)) continue;
        if ((string)(isset($c['via']) ? $c['via'] : '') === 'signin') { $signin++; continue; }
        $total++;
        $isPlan = ((string)(isset($c['tier']) ? $c['tier'] : '') === 'pro');
        if ($isPlan) $plan++;
        $pc = (string)(isset($c['addr']['postcode']) ? $c['addr']['postcode'] : '');
        if (trim($pc) === '') continue;
        $dist = geo_outward($pc);
        if ($dist === '') { $bad++; continue; }
        $with++;
        if (!isset($rows[$dist])) $rows[$dist] = array('district' => $dist, 'area' => geo_label($dist), 'total' => 0, 'plan' => 0, 'other' => 0);
        $rows[$dist]['total']++;
        $rows[$dist][$isPlan ? 'plan' : 'other']++;
        $a = geo_area_of($dist);
        if (!isset($byArea[$a])) $byArea[$a] = array('area' => $a, 'label' => geo_label($a . '0') === 'Outside our usual area' ? (isset(geo_areas()[$a]) ? geo_areas()[$a] : 'Other') : geo_label($a . '0'), 'total' => 0);
        $byArea[$a]['total']++;
    }
    $rows = array_values($rows);
    usort($rows, function ($x, $y) { return ($y['total'] - $x['total']) ?: strnatcmp($x['district'], $y['district']); });
    $byArea = array_values($byArea);
    usort($byArea, function ($x, $y) { return ($y['total'] - $x['total']) ?: strcmp($x['area'], $y['area']); });
    return array(
        'customers' => $total, 'on_plan' => $plan, 'with_postcode' => $with,
        'without_postcode' => $total - $with - $bad, 'unreadable_postcode' => $bad,
        'signin_skipped' => $signin, 'districts' => $rows, 'areas' => $byArea,
    );
}
