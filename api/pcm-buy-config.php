<?php
/*
 * The paid app abroad - "Unlock everything" (pcm-plus-lib.php). Read as DATA by plus_config() (never run); denied as a URL.
 * Nothing secret here. The PRICES are not here either: they are in api/pcm-buy-prices.php, server-only (gitignored,
 * .htaccess-denied, never deployed), because this file is public on GitHub (29 Oct 2026, owner: "move the prices off
 * GitHub"). plus_config() reads that file first; its lines are $BUY_PRICE, $BUY_USD, $BUY_LOW_USD, $BUY_LOW_PRICE,
 * $BUY_LOW_CODE, $UK_GBP and $UK_PRICE. Without it nothing is on sale. Payment companies' secrets have their own
 * server-only files too.
 *
 * To stop sales at once without a deploy: create api/pcm-buy.off on the server.
 */
// SWITCHED ON 12 Oct 2026 (owner: "go ahead and put it live"), after a PayPal sandbox sale + refund passed on the live site.
$BUY_ON = true;
// 12 Oct 2026: Lemon Squeezy declined the store, so the Buy button opens OUR buy page, which takes the payment with PayPal
// (pcm-plus-pp-lib.php). The page reads the price (pcm-buy-prices.php) and the countries below; PayPal's keys are in api/pcm-paypal-key.php
// (server-only, the owner's). (Was the Lemon Squeezy checkout, product 1430686.)
$BUY_URL = 'https://365techies.co.uk/pc-manager-buy/?install={id}';
// The price (and the lower one in pcm-plus-lib.php PLUS_LOW_PRICE's countries): api/pcm-buy-prices.php, server-only.
$BUY_PROVIDER = 'paypal';
// PayPal (12 Oct 2026): 365 Techies Ltd is the seller, so sell only where a small seller has no sales tax or VAT to register
// for - each of these has a registration threshold far above our sales (US states about $100,000 or 200 sales a year each,
// Canada C$30,000, Australia A$75,000, New Zealand NZ$60,000, Norway NOK 50,000, Japan 10 million yen, Singapore S$100,000
// plus S$1 million worldwide; Hong Kong has none). NOT the EU: it taxes a non-EU seller's software from the FIRST sale. Not
// Switzerland (CHF 100,000 counts our WHOLE turnover). Check this list with the accountant; add a country only after that.
$PP_COUNTRIES = 'US,CA,AU,NZ,NO,JP,SG,HK';
// 13 Oct 2026 (owner: "Build it all for release 37"): the same key IN THE UK, for a PC that is not
// on one of our support plans - "service it yourself", offered BESIDE the plans (the app shows both), never instead of them,
// and never to a PC linked to a customer. We sell it ourselves and PayPal takes it in pounds (365 Techies Ltd is not VAT
// registered, so nothing is added - the accountant to confirm these sales just count toward the turnover threshold).
//   $BUY_UK = 'off'   nothing changes: UK PCs are offered our plans, the buy page says so, the legal pages don't mention it
//             'page'  the buy page sells it to a UK PC (so the owner can buy one and refund it) - the app is not offered it
//             'on'    the app offers it too, beside the plans (build 39 on; older builds keep showing the plans alone)
// Its price ($UK_GBP, $UK_PRICE) is in api/pcm-buy-prices.php, server-only.
$BUY_UK = 'on';
// 13 Oct 2026 (owner: "Yes, automatic"): every NEW UK install that isn't linked to a customer gets the free month once -
// first seen by its check-ins on or after this date (installs already counted before it are left to staff, as before).
// '' = off. Our own PCs are never given one.
$TRIAL_AUTO_UK_FROM = '2026-10-13';
// 18 Oct 2026 (owner: "extend it so it's for the people abroad as well"; "new installs from today"): the same automatic free
// month for a NEW install outside the UK (never in a country we can't sell to at all). Software only there: no report
// look-over abroad (owner's choice). '' = off.
$TRIAL_AUTO_ABROAD_FROM = '2026-10-18';
// FastSpring (12 Oct 2026, owner: "take it over and do it"): a merchant of record - IT is the seller and pays the VAT / sales
// tax - so it sells everywhere PayPal does not (never the UK or the no-sale countries). pcm-plus-fs-lib.php has the rules.
// The popup checkout: "365techies.test.onfastspring.com/popup-365techies" while TESTING (pretend money - the app offers
// nothing there yet); take out ".test" to go LIVE, once FastSpring has activated the store (contract, payout, tax details).
// The products' ids in FastSpring: the full price, and the lower one where PLUS_LOW_PRICE (pcm-plus-lib.php) applies.
// ⛔ 13 Oct 2026: FastSpring DECLINED the store ("the product type you are offering is not one that FastSpring is licensed to
// process transactions for") - like Lemon Squeezy, Paddle and Polar. Disconnected: no storefront, so nothing points at its
// test checkout and a PC outside $PP_COUNTRIES is offered nothing (the free app). Its code stays, dormant. (Was
// '365techies.test.onfastspring.com/popup-365techies'.)
$FS_STOREFRONT = '';
$FS_PRODUCT = 'unlock-everything';
$FS_PRODUCT_LOW = 'unlock-everything-low';
// Lemon Squeezy (owner's choice, 8 Oct 2026): which variants are lifetime keys - "12345:life, 67890:year". A variant not
// listed gets a key for a year (a subscription's key then follows its renewals).
$LS_VARIANTS = '';
