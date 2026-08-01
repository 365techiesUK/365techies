# -*- coding: utf-8 -*-
"""The old WordPress URLs Google is still showing, and the temporary sitemap
that asks it to look again.

WHY THIS FILE EXISTS
--------------------
The site moved from WordPress to this static build on 2026-06-16. Every URL
below 301s correctly to a real page (verified), none of them is in sitemap.xml,
and nothing on the site links to them. Google simply has not finished
consolidating - which is normal, and it is already visibly happening: the GSC
daily chart steps on 9-10 July (impressions 990 -> 1,674, average position
21.6 -> 16.1) about three and a half weeks after the redirects went live.

Submitting a sitemap that lists the OLD urls is the one accelerant Google
actually endorses for a site move: it invites a recrawl of exactly the
addresses that need to see a 301, on a domain whose crawl budget is small
because its link profile is small.

⚠️ THIS FILE IS TEMPORARY AND MUST BE DELETED. A permanent sitemap of
redirecting URLs is a permanent invitation to keep them indexed - the opposite
of the goal. build_blog.py FAILS THE BUILD after EXPIRES so it cannot be
forgotten, which is the only reliable way to make a temporary thing temporary.

⚠️ NOT in robots.txt and NOT in sitemap.xml, deliberately. It is submitted by
hand in Search Console as a separate sitemap so its coverage can be watched
independently - the number of these URLs still indexed IS the progress metric.

The impressions are from the 3-month GSC export on 2026-08-01 and are recorded
only so the next reader can judge whether any of it was ever worth chasing.
Honest answer at the time: mostly not - these are small Dorset town queries at
positions 13-65, and the block is roughly half pre-migration traffic from when
these URLs WERE the live site.
"""

# Delete this file, its build block, and the submitted sitemap on this date.
EXPIRES = "2026-12-16"

# (path, impressions in the 3 months to 2026-07-29)
LEGACY = [
    ('/computer-repair-near-me-service-support-bournemouth/'       ,  4197),   # pos 40.03
    ('/about-us/'                                                  ,  4113),   # pos 52.11
    ('/computer-repair-near-me-service-support-blandford-forum/'   ,  2072),   # pos 16.35
    ('/computer-repair-near-me-service-support-weymouth/'          ,  1930),   # pos 18.09
    ('/computer-repair-near-me-service-support-bridport/'          ,  1758),   # pos 41
    ('/computer-repair-near-me-service-support-poole/'             ,  1591),   # pos 35.63
    ('/it-support-near-me-computer-repair-support-and-servicing/'  ,  1400),   # pos 36.33
    ('/computer-repair-near-me-service-support-boscombe/'          ,  1312),   # pos 45.5
    ('/computer-repair-near-me-service-support-west-moors/'        ,  1127),   # pos 26.43
    ('/computer-repair-near-me-service-support-dorchester/'        ,  1127),   # pos 21.16
    ('/computer-repair-near-me-service-support-sherborne/'         ,  1046),   # pos 17.27
    ('/computer-repair-near-me-service-support-wimborne-minster/'  ,   859),   # pos 13.08
    ('/computer-repair-near-me-service-support-gillingham/'        ,   612),   # pos 34.18
    ('/computer-repair-near-me-service-support-swanage/'           ,   526),   # pos 45.94
    ('/computer-repair-near-me-service-support-ferndown/'          ,   498),   # pos 24.25
    ('/computer-repair-near-me-service-support-corfe-mullen/'      ,   451),   # pos 52.85
    ('/computer-repair-near-me-service-support-lyme-regis/'        ,   434),   # pos 35.94
    ('/computer-repair-near-me-service-support-portland/'          ,   367),   # pos 22.91
    ('/computer-repair-near-me-service-support-sturminster-newton/',   361),   # pos 19.23
    ('/computer-repair-near-me-service-support-beaminster/'        ,   359),   # pos 35.74
    ('/computer-repair-near-me-service-support-canford-heath/'     ,   326),   # pos 64.58
    ('/computer-repair-near-me-service-support-wareham/'           ,   297),   # pos 26.71
    ('/computer-repair-near-me-service-support-verwood/'           ,   294),   # pos 14.05
    ('/computer-repair-near-me-service-support-shaftesbury/'       ,   279),   # pos 14.52
    ('/computer-repair-near-me-service-support-st-ives/'           ,   189),   # pos 18.76
    ('/computer-repair-near-me-service-support-wyke-regis/'        ,   181),   # pos 52.01
    ('/computer-repair-near-me-service-support-wool/'              ,   170),   # pos 43.31
    ('/computer-repair-near-me-service-support-west-parley/'       ,   100),   # pos 48.61
    ('/computer-repair-near-me-service-support-upton/'             ,    81),   # pos 34.77
    ('/computer-repair-near-me-service-support-colehill/'          ,    77),   # pos 50.62
    ('/computer-repair-near-me-service-support-chickerell/'        ,    43),   # pos 53.79
    ('/computer-repair-near-me-service-support-lychett-matravers/' ,    26),   # pos 27.38
    ('/support/'                                                   ,    15),   # pos 5.4
]
