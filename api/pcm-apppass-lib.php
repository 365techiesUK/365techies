<?php
/*
 * 365 PC Manager - app sign-in password reset, the pure part (the action is `staffapppass` in
 * pcm-booking.php). The app's "Sign in with your booking account" checks email + password against
 * SimplyBook, so a customer who cannot remember that password cannot be signed in at the visit
 * any other way. Staff reset it from the diary; the new one is read off the screen and typed
 * into the app there and then, so it has to be easy to say and type: two local words and three
 * digits, capitals where a word starts, no lookalike symbols. The customer can change it any
 * time on the booking page. Include-only, no side effects.
 */
if (!function_exists('apppass_words')) {

function apppass_words() {
    return array('Beach', 'Pier', 'Sunny', 'Sandy', 'Cliff', 'Harbour', 'Wave', 'Tide', 'Shell', 'Gull',
                 'Boat', 'Ferry', 'Kite', 'Surf', 'Dune', 'Coast', 'Bay', 'Reef', 'Anchor', 'Sail',
                 'Breeze', 'Cloud', 'Pebble', 'Rock', 'Chine', 'Garden', 'Bridge', 'Castle', 'Forest', 'Heath',
                 'Meadow', 'River', 'Bourne', 'Poole', 'Quay', 'Sandbanks', 'Purbeck', 'Studland', 'Swanage', 'Lulworth',
                 'Hengist', 'Boscombe', 'Alum', 'Branksome', 'Canford', 'Kinson', 'Winton', 'Moordown');
}

/** Word-Word-NNN, the two words always different. About two million combinations: enough
 *  against SimplyBook's own login throttle for a password meant to be changed, and short
 *  enough to type on a customer's keyboard first time. */
function apppass_generate() {
    $w = apppass_words(); $n = count($w);
    $a = $w[random_int(0, $n - 1)];
    do { $b = $w[random_int(0, $n - 1)]; } while ($b === $a);
    return $a . '-' . $b . '-' . random_int(100, 999);
}

/** The shape apppass_generate() produces - used by the test and as a guard before anything is shown. */
function apppass_ok($pw) {
    if (!preg_match('/^([A-Z][a-z]+)-([A-Z][a-z]+)-[0-9]{3}$/', (string)$pw, $m)) return false;
    return $m[1] !== $m[2] && in_array($m[1], apppass_words(), true) && in_array($m[2], apppass_words(), true);
}

}
