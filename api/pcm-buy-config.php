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
// 11 Oct 2026: the Lemon Squeezy product "365 PC Manager - Unlock everything (12 months)" (id 1430686), made in TEST MODE.
// checkout[custom][install] carries the PC's anonymous id into the order (meta.custom_data). When the store goes live, check
// the live product's checkout link is this same one - if Lemon Squeezy gives the live copy a new link, put that here.
$BUY_URL = 'https://365techies.lemonsqueezy.com/checkout/buy/fba7bdf3-7140-4601-84ab-94621a072a7b?checkout[custom][install]={id}';
// Owner, 11 Oct 2026: "go with $19.99 a year" - a 12-month key for up to 3 PCs that simply ends (no renewal), one price
// worldwide in US dollars with tax included. The Lemon Squeezy product must say the same. The app shows 40 characters at most.
$BUY_PRICE = 'US$19.99 for 1 year - does not renew';
// 11 Oct 2026 (owner: "yes build 1, and do $9.99 for those countries"). $BUY_USD adds what the price comes to in the
// buyer's own money where the European Central Bank has a rate ("US$19.99 (about €17) a year, no renewal") - shown only:
// Lemon Squeezy charges in US dollars. The lower price, in pcm-plus-lib.php PLUS_LOW_PRICE's countries, is Lemon Squeezy's
// discount code FAIRPRICE ($10.00 off this product) already filled in by the checkout link. The code must exist in Lemon
// Squeezy - in test mode AND again in live mode (they are kept apart) - or those buyers would see US$19.99 at checkout.
$BUY_USD = '19.99';
$BUY_LOW_USD = '9.99';
$BUY_LOW_PRICE = 'US$9.99 for 1 year - does not renew';
$BUY_LOW_CODE = 'FAIRPRICE';
$BUY_PROVIDER = 'lemonsqueezy';
// Lemon Squeezy (owner's choice, 8 Oct 2026): which variants are lifetime keys - "12345:life, 67890:year". A variant not
// listed gets a key for a year (a subscription's key then follows its renewals).
$LS_VARIANTS = '';
