<?php
/**
 * EXAMPLE ONLY - copy this to api/pcm-windy-key.php on the SERVER and put the real key in. The real file is gitignored and
 * .htaccess-denied: it must never be committed (this repo is public) and must never be served over HTTP.
 *
 * Where the key comes from: https://api.windy.com/keys -> sign in with the 365 Techies account -> "Create new key" ->
 * product "Webcams API", the FREE plan. (Windy says a new key can take a few minutes to start working.)
 * Used by api/pcm-webcams.php only (365 PC Manager's World webcams). The free plan's rules that matter: show
 * "Webcams provided by windy.com" (the app does), never publish the key (it stays here), and don't put the webcams only in a
 * paid part of the app (they're for everyone).
 *
 * Paste carefully: one line, the key between the quotes. The relay extracts it by pattern rather than including this file.
 */
$WINDY_KEY = 'PUT-THE-REAL-KEY-HERE';
