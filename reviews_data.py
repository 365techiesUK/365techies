# -*- coding: utf-8 -*-
"""The customer reviews. ONE source of truth, deliberately.

⚠️ THESE ARE REAL NAMED PEOPLE AND THIS IS PUBLISHED AS Review STRUCTURED DATA
under their names at 5 stars. Get it wrong and you have put words in a real
customer's mouth in public.

THE RULE (this replaces the old "exactly what they wrote", which the file did
not actually honour and which no excerpt can honour):

    A quote must be a CONTIGUOUS, UNALTERED run of what the customer wrote.
    You MAY start late or stop early, but only at a sentence boundary.
    You MAY NOT join non-adjacent text, cut inside a sentence, change
    punctuation, or tidy the grammar.
    If you skip text in the middle, mark it with … - never silently.

WHY THE RULE CHANGED (2026-08-01). The owner read 14 reviews off the live Google
profile. Against that ground truth, three canonical entries broke a rule the
docstring claimed was already being kept:

  Dean Robertson  we published "It's a quality Dell machine." - he wrote
                  "It's a quality Dell machine, with good software included."
                  His comma became our full stop, and a sentence from elsewhere
                  was fused on after it. The live text proves the next sentence
                  is "They installed it and sorted out all the...".
  John Plumbe     we published "...second to none. I was also impressed by how
                  there was no hard sell of a new machine." The live text proves
                  the next sentence begins "I would not hesitate to".
  Terese Lawton   we published "I recommend the monthly fee." - she wrote
                  "I recommend the monthly fee, as nothing is worse than having
                  to traipse...". Again a comma promoted to a full stop.

Each edit only ever made the praise shorter, so nothing was embellished - but a
fragment re-punctuated to look like a whole sentence is not a quotation, and a
substring check cannot see it (our shorter string is contained in theirs). That
is why verify_reviews.py now compares WITH punctuation and asserts adjacency.

AND THE ONE THAT RAN THE OTHER WAY. The hand-maintained homepage was assumed to
be the drifted copy. It was not: for Vince Jones, David Hagner and Rob Hazell
the HOMEPAGE was the faithful transcription and THIS FILE was the tidied one.
The homepage kept the customer's ellipses, David Hagner's exclamation mark, and
the word "access" in Rob Hazell's "regular maintenance access checks", all of
which had been quietly smoothed away here. Those three now carry the homepage
text. Do not assume the generated source is the trustworthy one.

PROVENANCE. VERIFIED holds the names checked character-by-character against the
live profile on 2026-08-01. The rest are inherited and unverified - treat them
as excerpts of unknown fidelity until someone reads the profile. Two names were
withdrawn rather than published unverified; see WITHDRAWN at the bottom.

build_extra.py imports build_local.py, so the shared truth cannot live in either
- hence this file. Both import from here, and so must every reviews_block call:
use pick("Name", ...) rather than retyping a quote. Retyping is what caused all
of the above; build_extra.py had Alan Bevis saying something no other page did.

reviews_block() takes (quote, name); this list is (name, quote). pick() flips
it for you.
"""

REVIEWS = [
 ("Alan Bevis", "A friendly team, there to help when needed. Nice to know that our laptops are being regularly checked for updates and kept virus free. Worth the monthly fee."),
 # VERIFIED 2026-08-03, then FIXED 2026-08-13 when a fresh pull of Google's own
 # API text put it through tools_check_reviews.py for the first time.
 #
 # ⚠️ The 2026-08-03 note claimed the mid-quote ellipsis was fine because "it
 # marks a real skip, which is exactly what an ellipsis is for". That was
 # WRONG, and it is the same mistake made hours earlier in David Butcher's
 # quote. He wrote "...worth the money as I know I have the backup and the
 # common sense, without them I wouldn't have...". Dropping the middle put an
 # ellipsis where he had no break at all, ending a sentence he never ended -
 # a CUT MID-SENTENCE, which the headline rule forbids outright. An ellipsis
 # legitimises a skip BETWEEN sentences, never one inside one.
 #
 # Now his first two sentences, complete and unaltered, which costs nothing:
 # the monthly-plan endorsement was the reason to quote him and it survives.
 ("Vince Jones", "The service I get with 365 techies is amazing always on the other end of the phone. The monthly subscription and plans are worth the money as I know I have the backup and the common sense, without them I wouldn’t have a working laptop that is bang up to date with all data backed up."),
 # ⚠️ SUSPECTED CUT MID-SENTENCE, unverified - do not treat as sound. "Their
 # monthly remote checks…" is not a sentence he ended; the ellipsis almost
 # certainly sits inside one, which is the defect proved in Vince Jones's quote
 # on 2026-08-13. It cannot be fixed without his full text: he is not among the
 # 5 the Places API returns, so it needs a profile paste. Until then this is
 # the weakest quote on the site - if one has to be pulled, pull this.
 ("David Hagner", "I have benefited from the help of the guys at 365 for most of twenty years. They have helped me on so many occasions I can not remember! Their monthly remote checks… 365 offer a fully inclusive service. Thank you."),
 # ⚠️ REPLACED 2026-08-13 - the SECOND rewrite in two days (see David Butcher).
 # He posted a fresh review "yesterday"; Google allows one per person per
 # business, so this supersedes what he wrote before:
 #   "Excellent service. We have been working with David and Steve for several
 #    years now and their attention is still brilliant. Highly recommended."
 # That text was on TEN pages including the hand-maintained homepage, which
 # build_blog.py hard-fails on if it drifts from this file - index.html was
 # edited in the same commit.
 #
 # Published COMPLETE and verbatim, including the clumsy parenthetical. It is
 # how he speaks, it is not a typo, and stopping early would have cost the best
 # line in it - that regular checks are WHY his issues are rare, which is the
 # monthly plan proving itself in a customer's own words.
 ("Peter Moody", "We have asked Steve and David from 365 to help us with computing for many years now and found their service and responses to be brilliant. When we have had issues (which because they regularly check us issues are rare) they are perfect. Highly recommend 365."),
 # NEW 2026-08-13, from the owner's screenshot of the live reply screen
 # ("yesterday", 5 stars). Genuinely new - he was not published before.
 # COMPLETE and verbatim, which is why it has no full stop at the end: he
 # didn't write one. Adding it would be tidying, and publishing the whole
 # review makes tools_check_reviews.py return "exact - word for word" rather
 # than merely contiguous. Google shows him lowercase as "mark lemon"; the
 # checker now matches names case-insensitively so this can read properly.
 # RESTORED 2026-08-13 after 12 days withdrawn. Read off the live profile in the
 # owner's Chrome ("Edited a month ago") and it is word for word what this file
 # always held - the suspicion that the homepage version was the true one was
 # wrong. Complete and verbatim. See the WITHDRAWN note at the bottom.
 ("John Holloway", "As usual your service and support have been immaculate when required recently. I cannot thank you enough."),
 ("Mark Lemon", "These guys at 365 have been keeping me going for over 14 years. No need to search for someone new as they must be number one. Always sorted any problems I’ve had and very quickly. First class"),
 # NEW 2026-08-13, owner's screenshot of the live reply screen ("yesterday",
 # 5 stars). Genuinely new, not a rewrite. Complete and verbatim.
 # Worth noting: she is the FIRST customer to reach for the "MOT" framing
 # unprompted, which is the same metaphor the Service Pass tool already uses
 # for its report - evidence the language lands with the people it is for.
 # Her quote marks around MOT are hers; canonical_chars folds ‘ ’ to ' so the
 # typographic form here still verifies against whatever Google returns.
 # NEW 2026-08-13, owner's screenshot of the live reply screen ("2 days ago",
 # 5 stars). Genuinely new. Complete and verbatim.
 #
 # The & is stored raw, matching Valerie Hunt and Robert Kennard, and
 # canonical_chars folds & to "and" so it still verifies. NOTE for whoever
 # touches the render path: these quotes reach the HTML as a bare & rather than
 # &amp;. That is technically invalid HTML5, but harmless here and left alone
 # deliberately - every instance is "& " followed by a space, which no browser
 # can mistake for an entity reference, and none of them land inside JSON-LD
 # (checked: no ld+json block contains one, so no structured data is at risk).
 # Escape it at the render layer if ever fixed, never by editing these quotes.
 ("David Young", "Thank you David & Steve for the usual service and sorting out the problem I told you about. Excellent work as usual."),
 # NEW 2026-08-13, owner's screenshot of the live reply screen ("2 weeks ago",
 # 5 stars). Genuinely new. Complete and verbatim - short, but John Ridd's is
 # shorter still, and a real short review beats a padded one. Google shows him
 # lowercase as "andy carapiet"; the checker matches names case-insensitively
 # since 2026-08-13, so publishing him properly capitalised still verifies.
 ("Andy Carapiet", "Absolutely first class service. Highly recommend."),
 ("Rosemary Allen", "365 Techies have given my PC its regular ‘MOT’ for many years now. Not only that, but if I have any problems, however small, David and Steve are always there at the other end of the phone to answer my questions and reassure me."),
 # ⚠️ SUSPECTED CUT MID-SENTENCE, unverified - same defect as David Hagner
 # above. "the 365 guys give…" is mid-sentence, not a break he made. Needs his
 # full text from a profile paste before it can be trusted or repaired.
 ("Rob Hazell", "Can’t fault the skill and attention the 365 guys give… confidence that things keep ticking over with their regular maintenance access checks, and there on call when other oddities crop up — or I mess things up ;)"),
 # VERIFIED 2026-08-03 against Google's own API text. ⚠️ We had lowercased
 # his capital "Brilliant" AND silently fixed his typo ("anow bout" ->
 # "about"). Both are tidying, which the rule forbids. Now stopped at the
 # sentence boundary before the typo: contiguous, unaltered, and it does not
 # print a typo under his name either.
 ("Free Spirit", "I’m always so grateful for 365’s Brilliant service and how you are always able to come to the rescue immediately I have a problem."),
 ("Julie Collins", "Always great service from these guys. I know I can contact them anytime I have a technical problem. I would absolutely recommend them."),
 # ⚠️ FIXED 2026-08-13 from the live profile. What we published had FOUR edits
 # stacked on one short review: his comma promoted to a full stop, an em-dash
 # inserted, his capital "Service" lowercased, and - worst - his typo silently
 # corrected. Now a contiguous run of his second line only, which sidesteps the
 # typo entirely rather than either printing it or fixing it (the Free Spirit
 # precedent). His sign-off "Woodsy." is dropped by stopping early, which is
 # allowed. ➜ His first line still needs a character-exact read before it can
 # ever be quoted: it was legible only in a screenshot, and the one word in
 # question is precisely the one that must not be guessed.
 ("Frederick Woods", "All is working fine even the day after, really professional Service."),
 ("Mary Memmott", "I have been with 365 Techies for many years and have found them always helpful and professional. Long may they continue."),
 ("Anne Lewis", "Always delighted with the support given by David, Steve and Becky. I couldn’t ask for any more."),
 # ⚠️ FIXED 2026-08-13 from the live profile (owner's Chrome, GBP reviews panel).
 # He wrote it in BLOCK CAPITALS and with no comma: we had lowercased the whole
 # thing AND inserted a comma he never typed. Both are tidying. Caps are how he
 # said it - same principle that preserved Free Spirit's capital "Brilliant".
 ("Edward Clough", "ALWAYS A PROMPT AND FIRST CLASS SERVICE UNABLE TO FAULT."),
 ("Cordelia Cutler", "Thanks for coming to my rescue once again. You still keep my computer system in perfect order. Many, many thanks."),
 ("John Ridd", "Efficient and helpful people."),
 ("Heather", "I have trusted 365 with my IT support since 2001 and cannot recommend them highly enough. I’ve lost count of the number of PCs, tablets, laptops I’ve bought from them. Living 60 miles away has not been a problem either."),
 ("Maureen Drake", "After a quick phone call they log in to my computer and quickly sort me out. It’s good to know who you can trust and rely on these days. A very fair company indeed."),
 ("JAR Accountants", "These guys look after my IT requirements at reasonable cost. They are less patronising than most and explain things in plain English, rather than gobbledygook."),
 # VERIFIED 2026-08-01 - contiguous run from the start of her review; only the
 # closing "Thank you." now restored, so this is her complete review.
 ("Karen Gater", "Courteous and prompt service offered. Will definitely be my choice of support when needed again. Thank you."),
 # VERIFIED 2026-08-01 - starts at her second sentence, clean boundary.
 ("Eve Day", "You can tell they are honest people who know exactly what they are doing. My laptop now works like a dream. They went above and beyond."),
 ("Emmanuel O", "I took my laptop to 365 and within a day the problem was rectified and I paid half the amount of money I expected. They are honest, upfront and swift."),
 # VERIFIED 2026-08-01 - was "It's a quality Dell machine." + a stitched-on
 # third sentence. Comma clause restored, stitch removed. Contiguous now.
 ("Dean Robertson", "The guys at 365 listened to my actual needs and tweaked a desktop to the specs I required. It’s a quality Dell machine, with good software included. They installed it and sorted out all the data transfer too."),
 # VERIFIED 2026-08-01 - the second sentence was not the sentence that follows
 # (live shows "I would not hesitate to"), so it has been dropped.
 ("John Plumbe", "Even though the computer itself could not be saved, all my data was retrieved for a very reasonable price and customer service was second to none."),
 ("Sheila Cutler", "365 came to my rescue again and built me a new computer to my specifications for an extremely reasonable price. Thank you David and Steve."),
 # VERIFIED 2026-08-01 - contiguous from the start, stops at a clean boundary.
 ("Valerie Hunt", "We have been so lucky to have Stephen & David looking after our computers. Nothing is too much trouble and quite frankly we wonder how we would manage without them."),
 ("Roger Eede", "They were very obliging and booked me in for a remote session later that morning. Whatever it was they put their finger on it and sorted it out. Great service."),
 ("Judith Kent", "David and Steve have been at the end of a phone to sort out any computer problems for over 10 years."),
 ("Andrew Willis", "Always there when you need help and support with any problems. Hard to imagine what I’d do without them — can’t believe you could get a better standard of service."),
 ("Julian Barker", "A credit to the moral, support-over-profit mentality I witnessed which should be evident in all businesses, big or small."),
 ("Sarah Austin", "Always a professional service, a great source of knowledgeable advice and very reasonably priced. 365 Computers look after all my business and home computing needs."),
 # VERIFIED 2026-08-01 - complete review, word for word.
 ("Anthony Sloane", "I have unfailingly received prompt and courteous service from both David and Steve. I would recommend them to anyone who has a computer problem."),
 # VERIFIED 2026-08-01 - starts at her second sentence; the trailing clause
 # "as nothing is worse than having to traipse..." is cut off by Google, so the
 # sentence we used to publish ("I recommend the monthly fee.") is gone.
 ("Terese Lawton", "David and Steven have been so helpful, caring and polite irrespective of the problem I may have with my laptop."),
 ("Alison Knight", "Quite simply an excellent service! Thank you to all the team."),
 ("Reg Portwaine", "I’ve used their services for years and have always been impressed with their knowledge and skill. They’ve never been beaten by any problem. Friendly and super efficient sums them up."),
 ("Hardie", "A first class service to a technological emergency. Highly recommended."),
 # VERIFIED 2026-08-01 - complete review, word for word.
 ("Michael Finch", "Service is one on one with people who know what they are talking about and also what they are selling!"),
 # ⚠️ FIXED 2026-08-13 - he ended with no full stop and we had added one.
 # Google shows him as "robert thomas kennard"; case-insensitive name matching
 # will NOT bridge that, so a profile paste will report him UNUSED until the
 # name here is reconciled. Left as-is pending the owner's call on which name
 # to display.
 ("Robert Kennard", "Thank you David & Steve for the amazing service on a monthly basis"),
 # VERIFIED 2026-08-01 - complete review. ⚠️ Her DOUBLE quotes around "extra
 # mile" are hers and stay double, even though reviews_block wraps the whole
 # quote in &ldquo;&rdquo; and British style would nest single inside double.
 # They were changed to single on the first pass and tools_check_reviews.py
 # caught it: typography is still text, and this file's rule is her words.
 ("Penny Hanford", "This lovely, friendly family firm are very approachable, dependable and professional. I thank them for going the “extra mile” for me!"),
 # VERIFIED 2026-08-01 - complete review, word for word.
 # ⚠️ REPLACED 2026-08-13, NOT a second entry. He rewrote his review (owner's
 # screenshot of the live reply screen, timestamped "3 hours ago"), and Google
 # allows only ONE review per person per business - so the 2026-08-03 text
 # below is what he WROTE THEN, not what stands under his name now:
 #   "Been using 365 for a number of years while living close to their
 #    premises. I'd had a couple of bad experiences with other companies so
 #    tried them. Exceptional service. Now I have moved, everything done
 #    remotely. David has patience when I don't understand and Steve does an
 #    excellent job on servicing."
 # It was live on /reviews/ and /server-network-support/. Keeping it would have
 # published words he has since replaced, and the next profile paste would have
 # flagged it BROKEN with no obvious cause.
 #
 # ⚠️ TWO GOOGLE SOURCES DISAGREE ABOUT THIS REVIEW (2026-08-13). The owner's
 # GBP reply screen shows the text below, timestamped "3 hours ago". The Places
 # API still returns his ORIGINAL review, tagged "5 years ago". Going with the
 # reply screen because it is the business's own management view of live state,
 # and because the API is demonstrably stale here: the 5 reviews it returns are
 # the identical set verified on 2026-08-03, and it shows NONE of the five new
 # reviews added on 2026-08-13 despite the profile carrying 54 ratings. That is
 # a cached "most relevant" subset, not current data.
 # ➜ Re-pull the API in a week. If it still shows the old text, stop and ask
 #   the owner to re-open the review before trusting either version.
 #
 # Starts at his THIRD sentence, because his first says "375 Techies Ltd" (his
 # typo). The rule forbids tidying it and we will not print a typo under his
 # name - same call as Free Spirit's "anow bout". From there it runs unbroken
 # to the end of his review.
 #
 # ⚠️ FIXED 2026-08-13, hours after first publishing it. The first version
 # skipped his "When I have had problems..." sentence and marked the gap with …
 # - but to do that it replaced the full stop HE wrote after "condition" with
 # an ellipsis, which is exactly the altered-terminator edit rule 2 forbids.
 # tools_check_reviews.py caught it as CUT MID-SENTENCE. No skip is needed at
 # all: starting late and running to the end is contiguous, keeps every
 # terminator he used, and keeps his closing recommendation. His own "..." is
 # safe to carry because canonical_chars folds … and ... together.
 ("David Butcher", "Their service has been excellent. I use computers all the time but am useless in the way the things work. Steve at 365 built my latest laptop which has been faultless for several years now. The monthly maintenance call means it’s kept in great condition. When I have had problems... normally down to me, their response time to sort it again is excellent. I highly recommend this excellent company."),
 ("Marianne Gill", "I think that 365 is a first class service. They are always so competent and obliging."),
]

# Checked character-by-character against the live Google profile on 2026-08-01.
# Everything not listed here is inherited and UNVERIFIED - it may be an excerpt
# of unknown fidelity. Add a name here only after reading the live review.
VERIFIED = {
    # verified against the owner's paste of the live profile, 2026-08-01
    "Anthony Sloane", "Michael Finch", "Karen Gater", "Valerie Hunt",
    "Penny Hanford", "Marianne Gill", "Peter Moody",
    "Dean Robertson", "John Plumbe", "Terese Lawton", "Eve Day",
    # verified against GOOGLE'S OWN API text, 2026-08-03 - the strongest
    # provenance available, because it is Google's copy of the review
    "Alan Bevis", "Vince Jones", "Free Spirit",
    # ⚠️ David Butcher REWROTE his review on 2026-08-13, so the 2026-08-03 API
    # verification no longer covers the text we publish. Re-verified against the
    # owner's screenshot of the live reply screen that same day - good
    # provenance (it is Google's own rendering) but NOT API text. Re-check him
    # on the next profile paste.
    "David Butcher",
    # verified against the owner's screenshots of the live reply screen,
    # 2026-08-13, and re-checked with tools_check_reviews.py
    "Peter Moody", "Mark Lemon", "Rosemary Allen", "David Young",
    "Andy Carapiet",
}

# WITHDRAWN 2026-08-01 - deliberately NOT published, do not re-add without
# reading the live review first:
#
#   John Holloway  - RESOLVED 2026-08-13 and RESTORED to the list above; kept
#                    here only as the record. Two texts were live at once and
#                    the standing guess was that the HOMEPAGE version ("Your
#                    service and support are unbeatable and delivered with
#                    patience and a smile.") was the true one. That guess was
#                    WRONG. Read off the live profile in the owner's own Chrome,
#                    his review - marked "Edited a month ago" - is word for word
#                    the version THIS FILE held. The homepage text appears
#                    nowhere on his review and must never be republished.
#   Vicky Bailey   - every word we published sits past Google's "...More" cut,
#                    so none of it is checkable, and the visible part is not the
#                    endorsement we presented: she describes an unrequested
#                    Vista-to-Windows-10 upgrade, then "However, when I got it
#                    home the keyboard and mouse would" [cut]. We published only
#                    the rescue that followed. Faithful words, misleading shape.
#
#   Fiona Gowenlock is a genuinely negative review and is correctly absent. A
#   business need not republish criticism in its own testimonials, and every
#   review section links out to the live profile where hers is visible. Leave it.

BY_NAME = dict(REVIEWS)


def pick(*names):
    """Return [(quote, name), ...] ready for reviews_block(), from canonical.

    Always use this instead of typing a quote into a build file. Retyping is
    exactly how build_extra.py ended up shipping Alan Bevis a sentence that
    appeared nowhere else on the site.
    """
    out = []
    for n in names:
        if n not in BY_NAME:
            raise SystemExit(
                "reviews_data.pick(): no review for %r.\n"
                "  If you just withdrew it, pick a different name - do not\n"
                "  paste the old text back in. Available: %s"
                % (n, ", ".join(sorted(BY_NAME)))
            )
        out.append((BY_NAME[n], n))
    return out
