<?php
/**
 * TEMPLATE. Copy this to api/pcm-feeds-keys.php on the SERVER ONLY (SiteGround
 * File Manager is fine) and paste your keys in. The real file is gitignored and
 * denied by .htaccess, so it must never appear in the repo - this repo is public.
 *
 * Read by regex, not require(), so formatting cannot break it. One key per line
 * in this exact shape:
 *
 *   $NAME = 'value';
 *
 * A key you leave out simply means that feed stays off, and its tile stays
 * badged SAMPLE in the portal. Nothing breaks.
 *
 * ---------------------------------------------------------------------------
 * ADMIRALTY_KEY - tides
 *   Sign up: https://admiraltyapi.portal.azure-api.net/
 *   Take the FREE "UK Tidal API - Discovery" tier to start: 607 UK stations,
 *   today plus 6 days, 10,000 calls a month, renewable yearly. Foundation
 *   (£144/yr) and Premium (£360/yr) only matter if you need tidal streams,
 *   longer range or history.
 *   The key is the "Ocp-Apim-Subscription-Key" (primary key) on your profile.
 *   LICENCE: the attribution line is a condition of use and the portal renders
 *   it on the tile. Do not remove it.
 *   Poole Harbour's station id is worth noting down once you are in - the
 *   station list is at /uktidalapi/api/V1/Stations.
 *
 * METOFFICE_KEY - weather, UV, wind, and the input to our sunset score
 *   Sign up: https://datahub.metoffice.gov.uk/
 *   Take the free Site Specific plan: ~360 calls a day, which at a 20-minute
 *   cache per location is plenty for a handful of customers.
 *   The key is the "apikey" value for your Site Specific subscription.
 *
 * NOT NEEDED: space weather and aurora. NOAA's feeds are public domain and
 * keyless, which is why that tile is already live.
 *
 * NOT AVAILABLE: lightning. The free community networks prohibit commercial
 * use and explicitly forbid storm-warning use, so it needs a paid commercial
 * feed. Do not wire a free one in.
 * ---------------------------------------------------------------------------
 */

$ADMIRALTY_KEY = '';
$METOFFICE_KEY = '';
