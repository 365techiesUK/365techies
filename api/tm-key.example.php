<?php
/**
 * EXAMPLE ONLY — copy this to api/tm-key.php on the SERVER and put the real
 * values in. The real file is gitignored and .htaccess-denied: it must never
 * be committed (this repo is public) and must never be served over HTTP.
 *
 * Where the values come from: Textmagic → Settings → API → API v2 keys.
 *   $TM_USERNAME = the "Username" column (for 365 Techies: 365techies)
 *   $TM_KEY      = the API key itself (shown once when created)
 *
 * Paste carefully: do not add a second "<?php" line. The library extracts these
 * by pattern rather than including the file, so formatting slips are survivable,
 * but a clean file is still best.
 */
$TM_USERNAME = '365techies';
$TM_KEY      = 'PUT-THE-REAL-API-KEY-HERE';
