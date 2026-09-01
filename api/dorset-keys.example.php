<?php
/*
 * Template for api/dorset-keys.php — the server-only credentials behind the
 * Bournemouth365 Portal endpoints.
 *
 * Copy this to dorset-keys.php ON THE SERVER and fill in the values. The real
 * file is gitignored AND .htaccess-denied; this example is committed so the
 * shape is documented and a fresh server can be set up without guesswork.
 *
 * Every value is optional. A missing key does not break the portal: that
 * layer reports "not configured" and the rest carry on. That is deliberate —
 * a half-provisioned server should degrade one layer, not the whole map.
 *
 * WHERE EACH ONE COMES FROM:
 *   BODS_API_KEY        data.bus-data.dft.gov.uk -> account page.
 *   NH_API_KEY          developer.data.nationalhighways.co.uk -> Profile ->
 *                       Subscriptions -> primary key. Take Road and Lane
 *                       Closures v2.0; v1.0 was RETIRED on 11 June 2025 and
 *                       receives no new data.
 *   CDSE_CLIENT_ID      dataspace.copernicus.eu -> account settings ->
 *   CDSE_CLIENT_SECRET  OAuth clients -> Create. The secret is shown ONCE.
 *
 * NO closing tag in this file.
 */

$BODS_API_KEY       = '';
$NH_API_KEY         = '';
$CDSE_CLIENT_ID     = '';
$CDSE_CLIENT_SECRET = '';
