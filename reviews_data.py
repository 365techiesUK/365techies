# -*- coding: utf-8 -*-
"""The customer reviews, verbatim. ONE source of truth, deliberately.

⚠️ THESE ARE REAL NAMED PEOPLE AND THIS IS PUBLISHED AS Review STRUCTURED DATA.
Every quote must be exactly what that customer wrote on the live Google profile.
Do not paraphrase, do not tidy the grammar, do not shorten for layout.

This module exists because there WERE two lists. build_local.py carried its own
separately-typed copy of six of these, and all six had drifted: four silently
truncated, one paraphrased, and John Holloway credited with words sharing only
36% of his actual wording. Attributing invented words to a named customer is
what the UK fake-review rules prohibit, and it is wrong regardless.

build_extra.py imports build_local.py, so the shared truth cannot live in either
- hence this file. Both import from here.

reviews_block() takes (quote, name); this list is (name, quote). Flip at the
call site, never re-type.
"""

REVIEWS = [
 ("John Holloway", "As usual your service and support have been immaculate when required recently. I cannot thank you enough."),
 ("Alan Bevis", "A friendly team, there to help when needed. Nice to know that our laptops are being regularly checked for updates and kept virus free. Worth the monthly fee."),
 ("Vince Jones", "The service I get with 365 techies is amazing — always on the other end of the phone. The monthly subscription and plans are worth the money."),
 ("David Hagner", "I have benefited from the help of the guys at 365 for most of twenty years. They have helped me on so many occasions I can not remember. A fully inclusive service."),
 ("Peter Moody", "Excellent service. We have been working with David and Steve for several years now and their attention is still brilliant. Highly recommended."),
 ("Rob Hazell", "Can't fault the skill and attention the 365 guys give. Confidence that things keep ticking over with their regular maintenance checks."),
 ("Free Spirit", "I'm always so grateful for 365's brilliant service and how you are always able to come to the rescue immediately I have a problem. I have been with you about fifteen years."),
 ("Julie Collins", "Always great service from these guys. I know I can contact them anytime I have a technical problem. I would absolutely recommend them."),
 ("Frederick Woods", "Sorting out a printing problem same day as reported. All is working fine even the day after — really professional service."),
 ("Mary Memmott", "I have been with 365 Techies for many years and have found them always helpful and professional. Long may they continue."),
 ("Anne Lewis", "Always delighted with the support given by David, Steve and Becky. I couldn't ask for any more."),
 ("Edward Clough", "Always a prompt and first class service, unable to fault."),
 ("Cordelia Cutler", "Thanks for coming to my rescue once again. You still keep my computer system in perfect order. Many, many thanks."),
 ("John Ridd", "Efficient and helpful people."),
 ("Heather", "I have trusted 365 with my IT support since 2001 and cannot recommend them highly enough. I've lost count of the number of PCs, tablets, laptops I've bought from them. Living 60 miles away has not been a problem either."),
 ("Maureen Drake", "After a quick phone call they log in to my computer and quickly sort me out. It's good to know who you can trust and rely on these days. A very fair company indeed."),
 ("JAR Accountants", "These guys look after my IT requirements at reasonable cost. They are less patronising than most and explain things in plain English, rather than gobbledygook."),
 ("Vicky Bailey", "Within 20 minutes of my phone call to Steve he came to my home with a compatible keyboard and mouse free of charge! I am blown away by their helpfulness."),
 ("Eve Day", "You can tell they are honest people who know exactly what they are doing. My laptop now works like a dream. They went above and beyond."),
 ("Emmanuel O", "I took my laptop to 365 and within a day the problem was rectified and I paid half the amount of money I expected. They are honest, upfront and swift."),
 ("Dean Robertson", "The guys at 365 listened to my actual needs and tweaked a desktop to the specs I required. It's a quality Dell machine. A brilliant machine at a very good price — you get a personal service here."),
 ("John Plumbe", "Even though the computer itself could not be saved, all my data was retrieved for a very reasonable price and customer service was second to none. I was also impressed by how there was no hard sell of a new machine."),
 ("Sheila Cutler", "365 came to my rescue again and built me a new computer to my specifications for an extremely reasonable price. Thank you David and Steve."),
 ("Valerie Hunt", "We have been so lucky to have Stephen & David looking after our computers. Nothing is too much trouble and quite frankly we wonder how we would manage without them."),
 ("Roger Eede", "They were very obliging and booked me in for a remote session later that morning. Whatever it was they put their finger on it and sorted it out. Great service."),
 ("Judith Kent", "David and Steve have been at the end of a phone to sort out any computer problems for over 10 years."),
 ("Andrew Willis", "Always there when you need help and support with any problems. Hard to imagine what I'd do without them — can't believe you could get a better standard of service."),
 ("Julian Barker", "A credit to the moral, support-over-profit mentality I witnessed which should be evident in all businesses, big or small."),
 ("Sarah Austin", "Always a professional service, a great source of knowledgeable advice and very reasonably priced. 365 Computers look after all my business and home computing needs."),
 ("Anthony Sloane", "I have unfailingly received prompt and courteous service from both David and Steve. I would recommend them to anyone who has a computer problem."),
 ("Terese Lawton", "David and Steven have been so helpful, caring and polite irrespective of the problem I may have with my laptop. I recommend the monthly fee."),
 ("Alison Knight", "Quite simply an excellent service! Thank you to all the team."),
 ("Reg Portwaine", "I've used their services for years and have always been impressed with their knowledge and skill. They've never been beaten by any problem. Friendly and super efficient sums them up."),
 ("Hardie", "A first class service to a technological emergency. Highly recommended."),
 ("Karen Gater", "Courteous and prompt service offered. Will definitely be my choice of support when needed again."),
 ("Michael Finch", "Service is one on one with people who know what they are talking about and also what they are selling!"),
 ("Robert Kennard", "Thank you David & Steve for the amazing service on a monthly basis."),
]
