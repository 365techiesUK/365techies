<?php
/*
 * The paid app abroad - "Unlock everything" (pcm-plus-lib.php). Read as DATA by plus_config() (never run); denied as a URL.
 * Nothing secret here: a checkout link and a price are public the moment a buyer sees them. The payment company's webhook
 * secret, when there is one, goes in its own server-only file - never here.
 *
 * SWITCHED OFF (8 Oct 2026) until the owner says go. To switch on: the owner picks the payment company and the price;
 * $BUY_URL = their checkout link ("{id}" is replaced with the install's anonymous id), $BUY_PRICE = the price as it should
 * read beside the button, $BUY_ON = true; deploy. To stop it at once without a deploy: create api/pcm-buy.off on the server.
 */
$BUY_ON = false;
$BUY_URL = '';
// Owner, 11 Oct 2026: "go with $19.99 a year" - a 12-month key for up to 3 PCs that simply ends (no renewal), one price
// worldwide in US dollars with tax included. The Lemon Squeezy product must say the same. The app shows 40 characters at most.
$BUY_PRICE = 'US$19.99 for 1 year - does not renew';
$BUY_PROVIDER = '';
// Lemon Squeezy (owner's choice, 8 Oct 2026): which variants are lifetime keys - "12345:life, 67890:year". A variant not
// listed gets a key for a year (a subscription's key then follows its renewals).
$LS_VARIANTS = '';
