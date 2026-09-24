// src/ui/next-button.js — the NEXT LEVEL button, shared by all five summary cards.
//
// Kept apart from progress-store.js on purpose: that file's claim is that it owns browser
// STORAGE and nothing else, and adding DOM to it would make the claim false. This file owns
// the one DOM behaviour, so the five cards cannot drift into five slightly different versions.
//
// WHY IT CLICKS THE PICKER'S ROW INSTEAD OF NAVIGATING. Some levels are a live switch and some
// are a page load (the harbour mouth and the stunt stage each have their own world mesh). That
// decision already lives in ui/levels.js and the picker row already honours it. Clicking the
// row means this button cannot get out of step with it. A display:none button still takes a
// programmatic click, which the CHOOSE LEVEL buttons already rely on.

import { next, title } from './progress-store.js';

/**
 * Show or hide a card's NEXT button for a finished run.
 *   btn     the card's [data-a=next] button
 *   id      the campaign id of the level just played
 *   won     what the MODE decided - a lost run offers no NEXT, PLAY AGAIN is the useful action
 * Hidden also when there is no next level, so the last level of the campaign simply offers
 * nothing rather than a dead button.
 */
export function setNext(btn, id, won) {
  if (!btn) return;
  const nxt = won ? next(id) : null;
  btn.hidden = !nxt;
  if (nxt) {
    btn.dataset.go = nxt;
    btn.textContent = `NEXT: ${title(nxt)}`;
  } else {
    delete btn.dataset.go;
  }
}

/** Go to the level a NEXT button names, by clicking the picker's own row for it. */
export function goNext(btn) {
  const id = btn && btn.dataset.go;
  if (!id) return false;
  const row = document.querySelector(`#tmode [data-m="${id}"]`);
  if (!row) return false;
  row.click();
  return true;
}
