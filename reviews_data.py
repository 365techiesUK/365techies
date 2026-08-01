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
 ("Vince Jones", "The service I get with 365 techies is amazing — always on the other end of the phone. The monthly subscription and plans are worth the money… without them I wouldn’t have a working laptop that is bang up to date with all data backed up."),
 ("David Hagner", "I have benefited from the help of the guys at 365 for most of twenty years. They have helped me on so many occasions I can not remember! Their monthly remote checks… 365 offer a fully inclusive service. Thank you."),
 ("Peter Moody", "Excellent service. We have been working with David and Steve for several years now and their attention is still brilliant. Highly recommended."),
 ("Rob Hazell", "Can’t fault the skill and attention the 365 guys give… confidence that things keep ticking over with their regular maintenance access checks, and there on call when other oddities crop up — or I mess things up ;)"),
 ("Free Spirit", "I’m always so grateful for 365’s brilliant service and how you are always able to come to the rescue immediately I have a problem. I have been with you about fifteen years."),
 ("Julie Collins", "Always great service from these guys. I know I can contact them anytime I have a technical problem. I would absolutely recommend them."),
 ("Frederick Woods", "Sorting out a printing problem same day as reported. All is working fine even the day after — really professional service."),
 ("Mary Memmott", "I have been with 365 Techies for many years and have found them always helpful and professional. Long may they continue."),
 ("Anne Lewis", "Always delighted with the support given by David, Steve and Becky. I couldn’t ask for any more."),
 ("Edward Clough", "Always a prompt and first class service, unable to fault."),
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
 ("Dean Robertson", "The guys at 365 listened to my actual needs and tweaked a desktop to the specs I required. It’s a quality Dell machine, with good software included."),
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
 ("Robert Kennard", "Thank you David & Steve for the amazing service on a monthly basis."),
 # VERIFIED 2026-08-01 - complete review. Her own double quotes around
 # "extra mile" are rendered as single quotes because reviews_block wraps every
 # quote in &ldquo;&rdquo;; the words are untouched.
 ("Penny Hanford", "This lovely, friendly family firm are very approachable, dependable and professional. I thank them for going the ‘extra mile’ for me!"),
 # VERIFIED 2026-08-01 - complete review, word for word.
 ("Marianne Gill", "I think that 365 is a first class service. They are always so competent and obliging."),
]

# Checked character-by-character against the live Google profile on 2026-08-01.
# Everything not listed here is inherited and UNVERIFIED - it may be an excerpt
# of unknown fidelity. Add a name here only after reading the live review.
VERIFIED = {
    "Anthony Sloane", "Michael Finch", "Karen Gater", "Valerie Hunt",
    "Penny Hanford", "Marianne Gill", "Peter Moody",
    "Dean Robertson", "John Plumbe", "Terese Lawton", "Eve Day",
}

# WITHDRAWN 2026-08-01 - deliberately NOT published, do not re-add without
# reading the live review first:
#
#   John Holloway  - two different texts were live at once under his name. The
#                    homepage said "Your service and support are unbeatable and
#                    delivered with patience and a smile."; this file said "As
#                    usual your service and support have been immaculate when
#                    required recently. I cannot thank you enough." They share
#                    almost no wording, so at most one can be his. Neither is
#                    published until someone reads his review.
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
