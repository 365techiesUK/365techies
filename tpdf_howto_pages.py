# -*- coding: utf-8 -*-
"""Three one-job PDF pages: sign a PDF, merge PDFs, make a PDF smaller (27 Oct 2026).

Owner, 27 Oct 2026, after the site pass (seo-research/site-optimise-2026-10-27/FINDINGS.md): "build all of them". Why
these three: Bing UK, 3 months to 24 Oct - merge pdf 22.8K, compress pdf 14.1K, combine pdf 9.9K, how to sign a pdf 811,
add signature to pdf 759; on our own channel "how to sign a pdf document" and "how to combine pdf files into one" are
top YouTube search terms, and the sign-a-PDF Short holds viewers best of all our Shorts (71.8% stayed, Studio 26 Oct).
No page answered them: only /techies-pdf/ (the product page) and /pdf-to-word-without-uploading/. Same shape as that
page: what Windows already does first, then Techies PDF, then the privacy reason not to upload.

Every Techies PDF claim is pinned to techies_pdf_page.FEATS / LIMITS (the released 0.2.0): Add or edit signatures (typed,
drawn or a photo), Text when a form has no boxes, Save keeps the version before; Join PDFs together / the arrows / Join
them into one PDF, originals unchanged; Make a PDF smaller for email / Good for email, Smaller, Smallest / a smaller copy
beside it / the made-up 27 MB -> 1.3 MB / it says so when it can't. A signature is a picture of your signature, not a
certified digital signature.
Microsoft facts, checked 27 Oct 2026: Edge's PDF reader can "Highlight, mark up, add text, and save your changes"
(explore.microsoft.com/edge/features/pdf-reader); Draw is its pen (third-party guides agree; menus vary by version, and
the page says so). Word's Save as PDF "Minimum size (publishing online)" is Word's own option. Gmail's attachment limit is
25 MB. No Edge or Windows tool joins PDFs.
Built by build_extra.build_new_page (which also lists them in the guides index, GUIDE_REGISTRY); imported from build_blog.
"""
import build_extra as _bx
import techies_pdf_page as _tp
import yt_watch as _yt
from pcm_feature_pages_data import _call_us

_STORE = "https://apps.microsoft.com/detail/XPDLXSHHH42Q88?mode=direct"
_WIN_ONLY = '<p>We work on Windows PCs only, not Macs, iPads or iPhones.</p>'


def _short(key, label=None):
    """The job's Short (techies_pdf_page.SHORTS) as a YouTube pop-up button. A re-made one (27 Oct 2026: join, shrink) is
    written hidden with its time, and the old Short it replaces ("was") sits after it: once the new one shows, the CSS
    sibling rule hides the old. The HTML is the same whenever it's built, before or after the day."""
    v = _tp.SHORTS[key]
    if not v.get("was"):
        return _yt.button((v["id"], v["secs"], None, v["name"]), label or "Watch it done in %d seconds" % v["secs"], shape="tall")
    new = _yt.button((v["id"], v["secs"], v["live"], v["name"]), label or "Watch it done in %d seconds" % v["secs"], shape="tall")
    old = _yt.button((v["was"], v["was_secs"], None, v["name"]), "Watch it done in %d seconds" % v["was_secs"], shape="tall")
    return new + old.replace('<a class="ytw"', '<a class="ytw ytw-was"', 1) + '<style>a.ytw:not([hidden])~a.ytw-was{display:none}</style>'


def _box(place, h3, body, pic, alt):
    """The Techies PDF download box, as on /pdf-to-word-without-uploading/, with this job's picture."""
    rel = _tp.REL
    return (f'<div class="pfa" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:1.3rem;align-items:center;margin:.4rem 0 0;padding:1.2rem 1.3rem;'
            f'border-radius:18px;border:1px solid rgba(29,151,227,.42);background:linear-gradient(135deg,rgba(29,151,227,.10),rgba(255,255,255,.02))">'
            f'<div><p class="mono" style="margin:0 0 .4rem;font-size:.72rem;letter-spacing:.08em;color:var(--cyan-soft)">FREE &middot; WINDOWS 10 &amp; 11 &middot; NOTHING UPLOADED</p>'
            f'<h3 style="margin:0 0 .5rem;font-size:1.25rem;line-height:1.25">{h3}</h3>'
            f'<p style="margin:0">{body}</p>'
            f'<p style="margin:1rem 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:.6rem"><a class="button primary" href="{rel["path"]}" download data-tph-dl="{place}" style="text-decoration:none">Download Techies PDF free &#8595;</a>'
            f'<a class="ms-store-badge" href="{_STORE}" aria-label="Download Techies PDF from the Microsoft Store" style="display:inline-block">'
            f'<img src="/images/ms-store-badge-en-gb-dark.svg" alt="Download from the Microsoft Store" width="161" height="44" loading="lazy" style="display:block;height:3.4rem;width:auto"></a></p>'
            f'<p style="margin:.8rem 0 0"><a class="dh-link" href="/techies-pdf/">Everything it does &#8594;</a></p>'
            f'<p style="margin:.7rem 0 0;font-size:.82rem;color:var(--muted)">On the Microsoft Store, checked by Microsoft. Version {rel["ver"]}, {_tp.MB}, '
            f'digitally signed by 365 Techies Ltd. Made by us, a family IT firm in Bournemouth since 1995.</p></div>'
            f'<figure style="margin:0"><div style="border-radius:12px;overflow:hidden;border:1px solid rgba(125,170,220,.3);box-shadow:0 22px 50px -26px rgba(0,0,0,.8);background:#f4f3f3">'
            f'{_tp.shot(pic, alt)}</div>'
            f'<figcaption style="font-size:.72rem;color:var(--muted);margin-top:.4rem">The real program, with a made-up document.</figcaption></figure></div>'
            f'<style>@media (max-width:820px){{.pfa{{grid-template-columns:1fr!important}}}} .pfa figure img{{display:block;width:100%;height:auto}}</style>'
            f'<script>(function(){{var a=document.querySelectorAll("[data-tph-dl]");for(var i=0;i<a.length;i++)a[i].addEventListener("click",function(){{'
            f'try{{if(typeof window.gtag==="function")window.gtag("event","tpdf_download_click",{{page:location.pathname,place:this.getAttribute("data-tph-dl")}});}}catch(e){{}}}});}})();</script>')


_PRIVATE = ('<p>The free &ldquo;sign&rdquo;, &ldquo;merge&rdquo; and &ldquo;compress PDF&rdquo; websites mostly work. But every one of them means uploading '
            'your file to someone else&rsquo;s computer, often abroad, and the PDFs people need to send are often the private ones: bank statements, '
            'payslips, medical and solicitors&rsquo; letters, a passport form, a scan of a driving licence.</p>'
            '<p>For anything private, read the website&rsquo;s privacy policy before you upload, or do the job on your own PC instead, where the file '
            'never leaves it.</p>')

# ============================================================ 1. Sign a PDF
SIGN = {
    'slug': 'how-to-sign-a-pdf',
    'title': 'How to Sign a PDF on Windows Without Printing It',
    'metaDesc': 'Sign a PDF form on your Windows PC without printing or scanning it: free in Microsoft Edge or Techies PDF, with nothing uploaded. Typed, drawn or photo.',
    'ogTitle': 'How to sign a PDF without printing it',
    'crumbName': 'Sign a PDF',
    'eyebrow': '// SIGN A PDF, ON YOUR OWN PC',
    'h1': 'Sign a PDF <em class="grad grad--cyan">without printing it</em>',
    'lede': 'A form arrives by email: fill it in, sign it, send it back. The old way is print, sign, scan and email, which is no good without a printer. Here&rsquo;s how to fill in and sign a PDF on your Windows PC instead, free, with the file never leaving your computer.',
    'chips': ['No printer needed', 'Free on Windows 11 and 10', 'Nothing uploaded'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Show me the steps', '#s1'],
    'ctaHead': 'Still stuck with a form?',
    'ctaSub': 'We set it up on your Windows PC while you watch, and show you how to sign the next one yourself. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Already on your PC', 'Microsoft Edge opens PDFs. Type into the form&rsquo;s boxes, use <strong>Draw</strong> to sign with the mouse or a finger, and <strong>Add text</strong> for your name and the date.'),
        ('Neatest result', 'Our free Techies PDF: a typed, drawn or photographed signature, placed on the line and sized to fit.'),
        ('Is it accepted?', 'For most everyday forms, yes. Some documents, such as a will, must still be signed on paper. If in doubt, ask whoever sent it.'),
        ('What it is', 'A picture of your signature on the page, not a certified digital signature.'),
        ('Your original', 'Save a copy, so the blank form is still there if you need to start again.'),
        ('Uploading', 'Not needed for any of this. Both ways work on your own PC.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; START HERE', 'h2': 'Which way is right for you',
         'html': '<ul>'
                 '<li><strong>You just need it done, now:</strong> Microsoft Edge is already on every Windows PC and can sign a PDF with a drawn signature (next section).</li>'
                 '<li><strong>You want it to look neat,</strong> or you sign forms often: our free <a href="/techies-pdf/">Techies PDF</a> keeps your signature, typed, drawn or from a photo, and puts it on the line at the right size (section 3).</li>'
                 '<li><strong>The form has no boxes to type in</strong> (it was scanned, say): both ways can put words anywhere on the page.</li>'
                 '<li><strong>It must be &ldquo;digitally signed&rdquo;</strong> with a certificate, or signed in front of a witness: that&rsquo;s a different thing (section 5).</li>'
                 '</ul>'},
        {'eyebrow': '/02 &mdash; ALREADY ON YOUR PC', 'h2': 'Sign a PDF in Microsoft Edge',
         'html': '<ol>'
                 '<li>Right-click the PDF, choose <strong>Open with</strong>, then <strong>Microsoft Edge</strong>. (On many PCs a PDF opens in Edge anyway.)</li>'
                 '<li>If the form has boxes, click in each one and type. Tick boxes work too.</li>'
                 '<li>To sign, choose <strong>Draw</strong> on the toolbar at the top (the pen), pick a dark colour, and sign on the line with the mouse, a touchpad, a pen or your finger on a touch screen.</li>'
                 '<li>For your printed name and the date where there are no boxes, choose <strong>Add text</strong>, click where it should go, and type.</li>'
                 '<li>Choose <strong>Save as</strong> at the top right and give it a new name, so the blank form is kept too.</li>'
                 '</ol>'
                 '<p>Two honest limits. A signature drawn with a mouse looks shaky, and once drawn it can&rsquo;t be moved or resized: rub it out with <strong>Erase</strong> and try again. And Edge&rsquo;s buttons move about a little between versions, so yours may look slightly different.</p>'},
        {'eyebrow': '/03 &mdash; THE NEATER WAY, FREE', 'h2': 'Sign a PDF with Techies PDF',
         'html': '<p>We made <a href="/techies-pdf/">Techies PDF</a> for the PDF jobs our customers ring us about, and signing forms is the one that comes up most. It&rsquo;s free, it runs on your Windows PC and it doesn&rsquo;t send your files anywhere.</p>'
                 '<ol>'
                 '<li>Open Techies PDF, press <strong>Open a PDF</strong> and choose the form (or drop it onto the window).</li>'
                 '<li>Click in the boxes and type. If it has no boxes, <strong>Text</strong> puts words anywhere on the page.</li>'
                 '<li>Press <strong>Add or edit signatures</strong>: type your name in a handwriting style, draw it with the mouse or a finger, or use a photo of your signature.</li>'
                 '<li>Put it on the line and make it bigger or smaller to fit.</li>'
                 '<li>Press <strong>Save</strong>. The version before is kept on your PC too, in case you need it back.</li>'
                 '</ol>'
                 '<p style="margin:.2rem 0 0">' + _short('sign') + '</p>'
                 + _box('sign_pdf', 'Techies PDF: fill in and sign a PDF, on your PC',
                        'Type into the form, add your signature, put it on the line and press <b>Save</b>. It also joins, shrinks and fixes PDFs, all on your computer.',
                        'sign', 'A club membership form filled in and signed in Techies PDF, with the signature on the signature line (a made-up sample)')},
        {'eyebrow': '/04 &mdash; A SIGNATURE THAT LOOKS LIKE YOURS', 'h2': 'Use a photo of your real signature',
         'html': '<p>A drawn-with-the-mouse signature rarely looks like the real thing. A photo of your own does, and you only make it once:</p>'
                 '<ol>'
                 '<li>Sign a sheet of plain white paper with a dark pen, a little bigger than usual.</li>'
                 '<li>Photograph it with your phone in good light, straight on, with no shadow across it, and get the photo onto your PC (by email to yourself is fine, or <a href="/phone-link-android/">Phone Link</a> on an Android phone).</li>'
                 '<li>In Techies PDF, choose the photo when you add a signature. It keeps it for next time.</li>'
                 '</ol>'
                 '<p>Keep that photo somewhere private on your PC, not in a shared folder or your email&rsquo;s sent items: it&rsquo;s your signature.</p>'},
        {'eyebrow': '/05 &mdash; WILL THEY ACCEPT IT?', 'h2': 'Is a signature on a PDF accepted?',
         'html': '<p>For most everyday paperwork, yes: a membership or consent form, a tenancy form, a letter of authority, a school trip slip. In the UK an electronic signature is generally accepted for documents like these, and the person who sent the form decides what they&rsquo;ll take.</p>'
                 '<ul>'
                 '<li><strong>Some documents must be signed on paper,</strong> such as a will, and some must be signed in front of a witness. If the form says &ldquo;sign in ink&rdquo; or asks for a witness, do that.</li>'
                 '<li><strong>A certified &ldquo;digital signature&rdquo;</strong> is a different thing: a signature backed by a certificate, used by some businesses and solicitors. Edge and Techies PDF both put a picture of your signature on the page, which is what most forms want, not a certified one.</li>'
                 '<li><strong>Not sure?</strong> Ask whoever sent you the form. It takes one email and saves sending it twice.</li>'
                 '</ul>'},
        {'eyebrow': '/06 &mdash; SENDING IT BACK', 'h2': 'Before you send it back',
         'html': '<ul>'
                 '<li><strong>Open the saved copy</strong> and check every box, the signature and the date are there. It&rsquo;s the saved file they&rsquo;ll get, not what was on the screen.</li>'
                 '<li><strong>Attach the saved copy</strong> to your reply, not the blank one you were sent: they&rsquo;re easy to mix up in Downloads.</li>'
                 '<li><strong>Too big to email?</strong> Forms with photos in can be. <a href="/how-to-make-a-pdf-smaller/">Make the PDF smaller</a> first.</li>'
                 '<li><strong>Several forms to send as one?</strong> <a href="/how-to-merge-pdf-files/">Merge them into one PDF</a>.</li>'
                 '</ul>'},
        {'eyebrow': '/07 &mdash; YOUR PRIVACY', 'h2': 'Why not just use a &ldquo;sign PDF&rdquo; website?',
         'html': _PRIVATE},
        {'eyebrow': '/08 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _call_us('If a form won&rsquo;t take your typing, the signature won&rsquo;t sit right, or you&rsquo;d rather someone did the first one with you on your Windows PC, we can help.')
                 + _WIN_ONLY},
    ],
    'howToName': 'How to sign a PDF on Windows without printing it',
    'howToSteps': [
        {'name': 'Open the PDF', 'text': 'Open the form in Microsoft Edge (right-click, Open with, Microsoft Edge) or in the free Techies PDF program.'},
        {'name': 'Fill in the boxes', 'text': 'Click in each box and type. If the form has no boxes, use Add text in Edge or Text in Techies PDF.'},
        {'name': 'Add your signature', 'text': 'In Edge choose Draw and sign with the mouse or a finger. In Techies PDF press Add or edit signatures and type, draw or use a photo of your signature, then place it on the line.'},
        {'name': 'Save a copy and send it', 'text': 'Save it under a new name, open the saved copy to check it, then attach that copy to your reply.'},
    ],
    'faqs': [
        {'q': 'How do I sign a PDF for free on Windows?', 'a': '<p>Open it in Microsoft Edge, which comes with Windows, and use Draw to sign with the mouse or a finger, then Save as. For a neater signature that you can move and resize, or one made from a photo of your real signature, use our free Techies PDF program.</p>'},
        {'q': 'Can I sign a PDF without printing it?', 'a': '<p>Yes. Edge and Techies PDF both let you fill in and sign a PDF on screen and save it, ready to email back. No printer or scanner needed.</p>'},
        {'q': 'Why can&rsquo;t I type into the form?', 'a': '<p>The PDF has no boxes to type in, usually because it was scanned or made from a picture. Use Add text in Edge, or Text in Techies PDF, to put your words anywhere on the page.</p>'},
        {'q': 'Is a signature on a PDF legally accepted?', 'a': '<p>For most everyday forms in the UK, yes. Some documents, such as a will, still have to be signed on paper, and some need a witness. If you&rsquo;re unsure, ask whoever sent you the form.</p>'},
        {'q': 'Can I sign a PDF in Adobe Acrobat Reader?', 'a': '<p>Yes: if you already have Adobe&rsquo;s free Acrobat Reader, its Fill &amp; Sign tool does the same job. You don&rsquo;t need it, though: Edge is already on your PC, and Techies PDF is free.</p>'},
        {'q': 'Are free sign-a-PDF websites safe?', 'a': '<p>Many work, but they all mean uploading your form, with your name, address and signature on it, to someone else&rsquo;s computer. For anything private, sign it on your own PC instead.</p>'},
    ],
    'crossLinksHtml': '<p>Related help: <a href="/techies-pdf/">Techies PDF, our free PDF program</a>, <a href="/how-to-merge-pdf-files/">merge PDFs into one</a>, <a href="/how-to-make-a-pdf-smaller/">make a PDF smaller</a>, <a href="/pdf-to-word-without-uploading/">PDF to Word without uploading</a> and <a href="/remote-support/">remote help</a>.</p>',
}

# ============================================================ 2. Merge PDFs
MERGE = {
    'slug': 'how-to-merge-pdf-files',
    'title': 'How to Merge PDF Files Into One on Windows, Free',
    'metaDesc': 'Merge (combine) PDF files into one on your Windows PC, free and without uploading them. Put them in order, join them, and the originals stay as they were.',
    'ogTitle': 'How to merge PDFs into one, without uploading them',
    'crumbName': 'Merge PDF Files',
    'eyebrow': '// MERGE PDFS, ON YOUR OWN PC',
    'h1': 'Merge PDFs <em class="grad grad--cyan">into one</em>, on your PC',
    'lede': 'An insurer wants your certificate, schedule and MOT &ldquo;as one PDF&rdquo;, or a job application wants your CV and references in a single file. Windows can open PDFs but can&rsquo;t join them by itself. Here&rsquo;s how to merge them into one on your own Windows PC, free, without uploading them anywhere.',
    'chips': ['Free on Windows 11 and 10', 'Nothing uploaded', 'Originals kept'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Show me the steps', '#s2'],
    'ctaHead': 'Rather we did it with you?',
    'ctaSub': 'We set it up on your Windows PC while you watch, and do the first one together. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Can Windows do it?', 'Not by itself. Edge and Windows open PDFs but don&rsquo;t join them.'),
        ('Free, on your PC', 'Our Techies PDF: choose the PDFs, put them in order, press <strong>Join them into one PDF</strong>.'),
        ('Merge or combine?', 'The same job. Some programs say merge, some combine, some join.'),
        ('Your originals', 'Left exactly as they were. You get a new, joined PDF.'),
        ('Photos of letters?', 'Turn them into a PDF first, then join that with the rest.'),
        ('Too big to email after?', 'Make the joined PDF smaller before you send it.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; START HERE', 'h2': 'Can Windows merge PDFs by itself?',
         'html': '<p>No. Windows and Microsoft Edge open, read and print PDFs, and Edge can add a few words, but neither has a button to join two PDFs into one. You need a program or a website that does it.</p>'
                 '<ul>'
                 '<li><strong>Our free <a href="/techies-pdf/">Techies PDF</a></strong> does it on your PC, with nothing uploaded (next section).</li>'
                 '<li><strong>The &ldquo;merge PDF&rdquo; websites</strong> work too, but each means uploading every file to someone else&rsquo;s computer, which matters for bank statements, payslips and ID (section 5).</li>'
                 '<li><strong>Paid PDF programs</strong> join PDFs as well. There&rsquo;s no need to pay for this one job.</li>'
                 '</ul>'},
        {'eyebrow': '/02 &mdash; FREE, ON YOUR PC', 'h2': 'Merge PDFs with Techies PDF',
         'html': '<ol>'
                 '<li>Open Techies PDF and press <strong>Join PDFs together</strong>.</li>'
                 '<li>Choose the PDFs, or drop them onto the window from File Explorer or your Downloads.</li>'
                 '<li>Put them in order with the arrows. The one at the top comes first.</li>'
                 '<li>Press <strong>Join them into one PDF</strong> and choose where to save it, with a name you&rsquo;ll recognise, such as <em>Car insurance documents</em>.</li>'
                 '</ol>'
                 '<p>The PDFs you started with aren&rsquo;t changed: you get one new PDF with all their pages, in your order.</p>'
                 '<p style="margin:.2rem 0 0">' + _short('join') + '</p>'
                 + _box('merge_pdf', 'Techies PDF: join PDFs into one, on your PC',
                        'Choose the PDFs, put them in order and press <b>Join them into one PDF</b>. It also signs, splits, shrinks and fixes PDFs, all on your computer.',
                        'join', 'Join PDFs together: a car insurance certificate, a schedule and an MOT certificate in order, with Join them into one PDF (made-up samples)')},
        {'eyebrow': '/03 &mdash; GET IT RIGHT FIRST TIME', 'h2': 'Before you join them',
         'html': '<ul>'
                 '<li><strong>A page upside down</strong> or on its side? Put it right first with <strong>Turn, move or take out pages</strong> in Techies PDF, then join. It&rsquo;s a scanner&rsquo;s favourite trick.</li>'
                 '<li><strong>Blank pages</strong> from a double-sided scan? Take them out the same way, so the joined PDF isn&rsquo;t padded with empty pages.</li>'
                 '<li><strong>Letters or receipts photographed on a phone?</strong> Turn the photos into a PDF first with <strong>Turn photos into a PDF</strong>, then join that with the rest.</li>'
                 '<li><strong>Only some pages wanted</strong> from a long PDF? Save just those with <strong>Take pages out into a new PDF</strong>, then join the short one.</li>'
                 '<li><strong>Name the files</strong> before you start (1 Certificate, 2 Schedule, 3 MOT) and the order is obvious when you choose them.</li>'
                 '</ul>'},
        {'eyebrow': '/04 &mdash; AFTER JOINING', 'h2': 'Joined PDF too big to email?',
         'html': '<p>Join five scanned documents and the result can be bigger than your email will send: Gmail stops at 25 MB, and many others at around 20 MB. Photos and scans take the room, so they shrink well. See <a href="/how-to-make-a-pdf-smaller/">how to make a PDF smaller</a>: in Techies PDF it&rsquo;s <strong>Make a PDF smaller for email</strong>, and our made-up PDF of holiday photos went from 27 MB to 1.3 MB.</p>'
                 '<p>Open the joined PDF once before you send it and scroll through: every page there, in the right order, the right way up.</p>'},
        {'eyebrow': '/05 &mdash; YOUR PRIVACY', 'h2': 'Why not just use a &ldquo;merge PDF&rdquo; website?',
         'html': _PRIVATE},
        {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _call_us('If the pages won&rsquo;t come out in the right order, a PDF won&rsquo;t open, or you&rsquo;d rather someone did it with you on your Windows PC, we can help.')
                 + _WIN_ONLY},
    ],
    'howToName': 'How to merge PDF files into one on Windows without uploading them',
    'howToSteps': [
        {'name': 'Open Techies PDF', 'text': 'Open the free Techies PDF program on your Windows PC and press Join PDFs together.'},
        {'name': 'Choose the PDFs', 'text': 'Choose the PDFs you want to join, or drop them onto the window.'},
        {'name': 'Put them in order', 'text': 'Use the arrows to put them in order. The one at the top comes first.'},
        {'name': 'Join and save', 'text': 'Press Join them into one PDF and choose where to save it. The PDFs you started with are not changed.'},
    ],
    'faqs': [
        {'q': 'How do I combine PDF files into one for free?', 'a': '<p>Use a free program such as our Techies PDF on your Windows PC: press Join PDFs together, choose the PDFs, put them in order and press Join them into one PDF. Nothing is uploaded and the originals are kept.</p>'},
        {'q': 'Can Windows merge PDFs without extra software?', 'a': '<p>No. Windows and Microsoft Edge can open and print PDFs, but neither can join them into one. You need a program, or a website that you upload the files to.</p>'},
        {'q': 'Is merging PDFs the same as combining them?', 'a': '<p>Yes. Merge, combine and join all mean putting several PDFs into one file, one after another, in the order you choose.</p>'},
        {'q': 'Will merging change my original PDFs?', 'a': '<p>Not in Techies PDF: it saves a new PDF and leaves the ones you started with as they were.</p>'},
        {'q': 'Can I add photos to the merged PDF?', 'a': '<p>Turn the photos into a PDF first with Turn photos into a PDF, then join that PDF with the others. iPhone photos (HEIC) need turning into JPG first.</p>'},
        {'q': 'Are merge-PDF websites safe?', 'a': '<p>Many work, but every file goes to someone else&rsquo;s computer. For bank statements, payslips or ID, join them on your own PC instead.</p>'},
    ],
    'crossLinksHtml': '<p>Related help: <a href="/techies-pdf/">Techies PDF, our free PDF program</a>, <a href="/how-to-sign-a-pdf/">sign a PDF without printing it</a>, <a href="/how-to-make-a-pdf-smaller/">make a PDF smaller</a>, <a href="/pdf-to-word-without-uploading/">PDF to Word without uploading</a> and <a href="/remote-support/">remote help</a>.</p>',
}

# ============================================================ 3. Make a PDF smaller
SHRINK = {
    'slug': 'how-to-make-a-pdf-smaller',
    'title': 'PDF Too Big to Email? Make It Smaller, Free on Windows',
    'metaDesc': 'PDF too big to email? Make it smaller on your Windows PC, free and without uploading it: compress the photos and scans in it, or save it smaller from Word.',
    'ogTitle': 'PDF too big to email? Make it smaller, on your own PC',
    'crumbName': 'Make a PDF Smaller',
    'eyebrow': '// PDF TOO BIG TO EMAIL?',
    'h1': 'PDF too big to email? Make it <em class="grad grad--cyan">smaller</em>',
    'lede': 'You press Send and the email bounces back: the attachment is too big. Almost always the PDF is full of photos or scans, and those can be made much smaller without spoiling them. Here&rsquo;s how to do it on your own Windows PC, free, without uploading the file anywhere.',
    'chips': ['Free on Windows 11 and 10', 'Nothing uploaded', 'Original kept'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Show me the steps', '#s2'],
    'ctaHead': 'Still too big to send?',
    'ctaSub': 'We sort it on your Windows PC while you watch, and set up an easier way to send big files. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Why it&rsquo;s big', 'Photos and scans. A PDF that&rsquo;s mostly words is usually small already.'),
        ('Email limits', 'Gmail sends up to 25 MB; many others stop at around 20 MB.'),
        ('Free, on your PC', 'Techies PDF: <strong>Make a PDF smaller for email</strong>, then <strong>Good for email</strong>. A smaller copy is saved beside it.'),
        ('Made it in Word?', 'Save as PDF again with <strong>Minimum size (publishing online)</strong>.'),
        ('Scanning it?', 'Scan at 150 to 200 dpi, in greyscale or black and white for letters.'),
        ('Still too big', 'Send a OneDrive or Google Drive link instead of the file.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHY IT&rsquo;S BIG', 'h2': 'Why is my PDF so big?',
         'html': '<p>Words take almost no room in a PDF. A ten-page letter is usually well under 1 MB. What makes a PDF big is pictures: photos from a phone, and scans, which are photos of pages. A scanner set to its best quality can make one page 5 MB, and a few phone photos in a PDF can come to 20 MB or more.</p>'
                 '<p>That&rsquo;s why the email bounces. <strong>Gmail</strong> sends attachments up to <strong>25 MB</strong> in total, and many other email services stop at around <strong>20 MB</strong>. Some offices take less. So the job is to make the pictures inside the PDF smaller, which hardly shows on screen or on paper.</p>'},
        {'eyebrow': '/02 &mdash; FREE, ON YOUR PC', 'h2': 'Make a PDF smaller with Techies PDF',
         'html': '<ol>'
                 '<li>Open Techies PDF and press <strong>Make a PDF smaller for email</strong>.</li>'
                 '<li>Choose the PDF.</li>'
                 '<li>Start with <strong>Good for email</strong>: pictures stay clear and sharp. If it&rsquo;s still too big, try <strong>Smaller</strong>, then <strong>Smallest</strong>.</li>'
                 '<li>Press <strong>Make it smaller</strong>. A smaller copy is saved beside the original, and it tells you how much smaller it is.</li>'
                 '</ol>'
                 '<p>Our made-up PDF of five holiday photos went from 27 MB to 1.3 MB. Your original stays exactly as it was. And if a PDF can&rsquo;t be made any smaller (one that&rsquo;s mostly words, say), it tells you so, rather than handing you a bigger one.</p>'
                 '<p style="margin:.2rem 0 0">' + _short('shrink') + '</p>'
                 + _box('shrink_pdf', 'Techies PDF: make a PDF smaller for email, on your PC',
                        'Choose the PDF, pick <b>Good for email</b> and press <b>Make it smaller</b>. It also signs, joins and fixes PDFs, all on your computer.',
                        'shrink', 'Make a PDF smaller for email: a 27 MB PDF of holiday photos made 1.3 MB, 95% smaller, with the choices Good for email, Smaller and Smallest (a made-up sample)')},
        {'eyebrow': '/03 &mdash; MADE IT IN WORD?', 'h2': 'Made the PDF yourself in Word? Save it smaller',
         'html': '<p>If the PDF came from your own Word document, you don&rsquo;t need to shrink it: make it again, smaller.</p>'
                 '<ol>'
                 '<li>Open the document in Word and choose <strong>File</strong>, then <strong>Save As</strong> (or <strong>Save a Copy</strong>).</li>'
                 '<li>Under the file name, choose <strong>PDF</strong> as the type.</li>'
                 '<li>Next to <strong>Optimise for</strong>, choose <strong>Minimum size (publishing online)</strong>.</li>'
                 '<li>Press <strong>Save</strong>.</li>'
                 '</ol>'
                 '<p>The photos in it are saved at a lower quality that still looks fine on screen. Keep the standard setting for anything that will be professionally printed.</p>'},
        {'eyebrow': '/04 &mdash; SCANNING IT?', 'h2': 'Scanning it? Set the scanner for email',
         'html': '<ul>'
                 '<li><strong>Resolution 150 to 200 dpi</strong> is plenty for a letter or a form. 300 dpi for small print. 600 dpi makes huge files for no benefit on screen.</li>'
                 '<li><strong>Greyscale, or black and white,</strong> for anything that&rsquo;s just words. Colour is three times the size.</li>'
                 '<li><strong>One PDF, not one per page,</strong> if your scanner asks: easier to send, and the same size.</li>'
                 '</ul>'
                 '<p>In Windows&rsquo; own Scan app these settings are under <strong>Show more</strong>; printer makers&rsquo; scanning apps have the same choices under similar names. Already scanned it big? Shrink it as in section 2: scans come down the most.</p>'},
        {'eyebrow': '/05 &mdash; STILL TOO BIG?', 'h2': 'Still too big? Send a link, or split it',
         'html': '<ul>'
                 '<li><strong>Send a link instead of the file.</strong> Put the PDF in OneDrive (it comes with Windows and Microsoft 365) or Google Drive, choose <strong>Share</strong>, copy the link and paste it into your email. The other person opens it from there.</li>'
                 '<li><strong>Split it into two emails.</strong> In Techies PDF, <strong>Take pages out into a new PDF</strong> saves pages 1 to 10 as one PDF and 11 to 20 as another.</li>'
                 '<li><strong>Zipping it hardly helps.</strong> A PDF is already packed tight, so a zip file of it is about the same size, and some offices block zip files anyway.</li>'
                 '</ul>'},
        {'eyebrow': '/06 &mdash; YOUR PRIVACY', 'h2': 'Why not just use a &ldquo;compress PDF&rdquo; website?',
         'html': _PRIVATE},
        {'eyebrow': '/07 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _call_us('If it still won&rsquo;t send, or your email keeps bouncing files that should be fine, we can find out why and sort it on your Windows PC.')
                 + _WIN_ONLY},
    ],
    'howToName': 'How to make a PDF smaller to email it, on Windows',
    'howToSteps': [
        {'name': 'Open Techies PDF', 'text': 'In the free Techies PDF program press Make a PDF smaller for email and choose the PDF.'},
        {'name': 'Pick a setting', 'text': 'Start with Good for email, which keeps pictures clear. Try Smaller or Smallest only if it is still too big.'},
        {'name': 'Make it smaller', 'text': 'Press Make it smaller. A smaller copy is saved beside the original, which is not changed.'},
        {'name': 'Still too big? Send a link', 'text': 'Put the PDF in OneDrive or Google Drive, choose Share, and email the link instead of the file.'},
    ],
    'faqs': [
        {'q': 'How do I make a PDF smaller for free?', 'a': '<p>On a Windows PC, open our free Techies PDF program, press Make a PDF smaller for email, choose the PDF and press Make it smaller. It works on your PC, with nothing uploaded, and keeps the original.</p>'},
        {'q': 'Why is my PDF file so big?', 'a': '<p>Almost always because of photos or scans in it. Words take very little room; pictures take a lot, especially scans made at a high resolution.</p>'},
        {'q': 'What size of attachment can I email?', 'a': '<p>Gmail sends up to 25 MB in total. Many other email services stop at around 20 MB, and some offices accept less. Bigger than that, send a OneDrive or Google Drive link instead.</p>'},
        {'q': 'Will making a PDF smaller make it blurry?', 'a': '<p>With Good for email, pictures stay clear and sharp on screen and on paper. Smaller and Smallest go further, and photos can look a little softer, so check the copy before you send it.</p>'},
        {'q': 'Does zipping a PDF make it smaller?', 'a': '<p>Hardly at all. A PDF is already compressed, so the zip file is about the same size. Shrink the pictures in it instead, or send a link.</p>'},
        {'q': 'Can I make a PDF smaller without uploading it?', 'a': '<p>Yes. Techies PDF does it on your own PC. The compress-PDF websites all need the file uploaded first.</p>'},
    ],
    'crossLinksHtml': '<p>Related help: <a href="/techies-pdf/">Techies PDF, our free PDF program</a>, <a href="/how-to-merge-pdf-files/">merge PDFs into one</a>, <a href="/how-to-sign-a-pdf/">sign a PDF without printing it</a>, <a href="/onedrive-full-cant-send-email/">OneDrive full and can&rsquo;t send email</a> and <a href="/remote-support/">remote help</a>.</p>',
}

PAGES = [SIGN, MERGE, SHRINK]
for _p in PAGES:
    _bx.build_new_page(_p)
