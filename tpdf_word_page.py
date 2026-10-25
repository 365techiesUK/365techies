# -*- coding: utf-8 -*-
"""/pdf-to-word-without-uploading/ - turn a PDF into a Word document on your own Windows PC (25 Oct 2026).

Owner, 25 Oct 2026 (after the Search Console read the same day): "PDF to Word page" - the freeze on new pages ended
that day. Why this one: our own Search Console says one-job pages with a free tool earn and general guides don't, and
Techies PDF 0.2.0 (signed, live 22 Oct) does this job on the PC. The honest angle is privacy: "pdf to word" is a
crowded search, so this page answers the person who doesn't want to upload a bank letter to a converter website. It
leads with Word itself where they have it, because that keeps the layout and our app doesn't.

Every claim about Techies PDF is pinned to the RELEASED 0.2.0 (tpdf/wordfile.py, tpdf/server.py, static/app.js):
  - start screen button "Turn a PDF into a Word document" ("Get its words into Word, to change them."), then Choose the
    PDF, then "Save as a Word document";
  - the words only: a Word paragraph per line, a page break per page; layout, pictures and fonts aren't kept, and the
    window says so;
  - scans: "Read the words in the scanned pages" - Windows' own text reader (OCR), on the PC; it needs checking; a few
    PCs don't have the reader yet and the app offers to add it.
Microsoft Word facts from Microsoft's "Opening PDFs in Word" (support.microsoft.com/en-gb/word/opening-pdfs-in-word,
read 25 Oct 2026): Word makes a copy, converts it and attempts to match the layout; the original PDF is kept; works best
with files that are mostly text; a page of mostly charts or graphics may come in as one picture; its list of elements
known to be problematic; Word for Microsoft 365, 2024, 2021, 2019 and 2016.
Built by build_extra.build_new_page (which also lists it in the guides index, GUIDE_REGISTRY); imported from build_blog.
"""
import build_extra as _bx
import techies_pdf_page as _tp
from pcm_feature_pages_data import _call_us

SLUG = "pdf-to-word-without-uploading"
_MS = '<a href="https://support.microsoft.com/en-gb/word/opening-pdfs-in-word" rel="noopener" target="_blank">Microsoft</a>'
_STORE = "https://apps.microsoft.com/detail/XPDLXSHHH42Q88?mode=direct"
_ALT = ("Techies PDF turning a PDF into a Word document: a made-up insurance letter&rsquo;s words, with Save as a Word document "
        "and a note that the layout, pictures and fonts aren&rsquo;t kept")


def _box():
    rel = _tp.REL
    return (f'<div class="pfa" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:1.3rem;align-items:center;margin:.4rem 0 0;padding:1.2rem 1.3rem;'
            f'border-radius:18px;border:1px solid rgba(29,151,227,.42);background:linear-gradient(135deg,rgba(29,151,227,.10),rgba(255,255,255,.02))">'
            f'<div><p class="mono" style="margin:0 0 .4rem;font-size:.72rem;letter-spacing:.08em;color:var(--cyan-soft)">FREE &middot; WINDOWS 10 &amp; 11 &middot; NOTHING UPLOADED</p>'
            f'<h3 style="margin:0 0 .5rem;font-size:1.25rem;line-height:1.25">Techies PDF: a PDF&rsquo;s words into Word, on your PC</h3>'
            f'<p style="margin:0">Press <b>Turn a PDF into a Word document</b>, choose the PDF, then <b>Save as a Word document</b>. A scan? It reads the words '
            f'first with Windows&rsquo; own text reader. It also signs, joins, shrinks and fixes PDFs, all on your computer.</p>'
            f'<p style="margin:1rem 0 0;display:flex;flex-wrap:wrap;gap:.6rem"><a class="button primary" href="{rel["path"]}" download data-tpw-dl style="text-decoration:none">Download Techies PDF free &#8595;</a>'
            f'<a class="button secondary" href="/techies-pdf/" style="text-decoration:none">Everything it does</a></p>'
            f'<p style="margin:.7rem 0 0;font-size:.82rem;color:var(--muted)">Version {rel["ver"]}, {_tp.MB}, digitally signed by 365 Techies Ltd. Also on the '
            f'<a href="{_STORE}">Microsoft Store</a>. Made by us, a family IT firm in Bournemouth since 1995.</p></div>'
            f'<figure style="margin:0"><div style="border-radius:12px;overflow:hidden;border:1px solid rgba(125,170,220,.3);box-shadow:0 22px 50px -26px rgba(0,0,0,.8);background:#f4f3f3">'
            f'{_tp.shot("word", _ALT)}</div>'
            f'<figcaption style="font-size:.72rem;color:var(--muted);margin-top:.4rem">The real program, with a made-up letter.</figcaption></figure></div>'
            f'<style>@media (max-width:820px){{.pfa{{grid-template-columns:1fr!important}}}} .pfa figure img{{display:block;width:100%;height:auto}}</style>'
            f'<script>(function(){{var a=document.querySelectorAll("[data-tpw-dl]");for(var i=0;i<a.length;i++)a[i].addEventListener("click",function(){{'
            f'try{{if(typeof window.gtag==="function")window.gtag("event","tpdf_download_click",{{page:location.pathname,place:"pdf_to_word"}});}}catch(e){{}}}});}})();</script>')


PAGE = {
    'slug': SLUG,
    'title': 'PDF to Word Without Uploading: Free on Windows | 365 Techies',
    'metaDesc': 'Turn a PDF into a Word document on your own Windows PC, free, without uploading it to a converter website. With Word, without it, and for scans.',
    'ogTitle': 'Turn a PDF into Word without uploading it anywhere',
    'crumbName': 'PDF to Word Without Uploading',
    'eyebrow': '// PDF TO WORD, ON YOUR OWN PC',
    'h1': 'Turn a PDF into <em class="grad grad--cyan">Word</em>, without uploading it',
    'lede': 'You need to change a letter, a form or a CV that you only have as a PDF. Search for &ldquo;PDF to Word&rdquo; and every answer wants you to upload it to a website first, which isn&rsquo;t great for a bank letter or anything from the doctor. Here are the free ways to do it on your own Windows PC, where the file never leaves it.',
    'chips': ['Nothing uploaded', 'Free', 'Windows specialists since 1995'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['No Word? Use our free app', '#s3'],
    'ctaHead': 'Still stuck with a PDF?', 'ctaSub': 'We sort it on your Windows PC while you watch. We work on Windows PCs only, not Macs. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Have Microsoft Word?', 'Open the PDF in Word: File, then Open. Word makes a converted copy and tries to keep the layout.'),
        ('No Word?', 'Our free Techies PDF saves a PDF&rsquo;s words as a Word document, on your PC. The words only, not the layout.'),
        ('A scanned letter', 'A scan is a picture of words. Techies PDF reads them first with Windows&rsquo; own text reader, on your PC.'),
        ('Your original', 'Kept either way. You always get a new Word file.'),
        ('Converter websites', 'They mean uploading the file to someone else&rsquo;s computer. Fine for a menu; think twice for a bank letter.'),
        ('Only need to sign or fill it in?', 'You may not need Word at all: Techies PDF does those to the PDF itself.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; START HERE', 'h2': 'Which way is right for you',
         'html': '<ul>'
                 '<li><strong>You have Microsoft Word</strong> (it comes with Microsoft 365): open the PDF in Word. It keeps the layout best (next section).</li>'
                 '<li><strong>You don&rsquo;t have Word:</strong> our free <a href="/techies-pdf/">Techies PDF</a> puts the PDF&rsquo;s words into a Word document you can change. It&rsquo;s the words only, not the layout (section 3).</li>'
                 '<li><strong>It&rsquo;s a scan</strong> or a photo of a letter: the words are a picture, so something has to read them first (section 4).</li>'
                 '<li><strong>You only need to sign it, fill it in or fix one date:</strong> you may not need Word at all (section 6).</li>'
                 '</ul>'
                 '<p>Whichever you choose, your original PDF is kept. You get a new Word file alongside it.</p>'},
        {'eyebrow': '/02 &mdash; IF YOU HAVE WORD', 'h2': 'Open the PDF in Microsoft Word',
         'html': '<ol>'
                 '<li>Open <strong>Word</strong>.</li>'
                 '<li>Choose <strong>File</strong>, then <strong>Open</strong>, and pick the PDF.</li>'
                 '<li>Word says it will turn the PDF into a Word document. Choose <strong>OK</strong>.</li>'
                 '<li>Make your changes, then <strong>File</strong>, <strong>Save as</strong>, and save it as a Word document, or as a PDF again.</li>'
                 '</ol>'
                 '<p>Microsoft explains what happens: Word makes a copy of the PDF, converts it and tries to match the original layout, and your original PDF is kept. It works best with documents that are mostly words. A page that is mostly charts or pictures may come in as one picture, and some things are known to come out wrong, including tables with spaced-out cells, page borders and colours, footnotes that run over more than one page, and comments (' + _MS + '). Check it before you send it.</p>'
                 '<p>Microsoft lists this for Word for Microsoft 365, Word 2024, 2021, 2019 and 2016. Word on your PC does the job itself: you don&rsquo;t upload the PDF to a website.</p>'},
        {'eyebrow': '/03 &mdash; NO WORD? USE OUR FREE APP', 'h2': 'No Word? Get the words into a Word document with Techies PDF',
         'html': '<p>We made <a href="/techies-pdf/">Techies PDF</a> for the PDF jobs our customers ring us about, and it&rsquo;s free. It runs on your Windows PC and doesn&rsquo;t send your files anywhere.</p>'
                 '<ol>'
                 '<li>Open Techies PDF and press <strong>Turn a PDF into a Word document</strong>.</li>'
                 '<li>Choose the PDF.</li>'
                 '<li>Press <strong>Save as a Word document</strong> and choose where to save it.</li>'
                 '</ol>'
                 '<p><strong>What you get:</strong> the PDF&rsquo;s words, a line in Word for each line of the PDF and a new page for each page. The layout, pictures and fonts aren&rsquo;t kept, and the program tells you so. It&rsquo;s right for getting the words of a letter back so you can change them, rather than for copying a glossy leaflet.</p>'
                 '<p>The file opens in Microsoft Word, in our free <a href="/techies-one-mail/">Techies One</a>, or in any program that opens Word documents.</p>'
                 + _box()},
        {'eyebrow': '/04 &mdash; A SCANNED LETTER', 'h2': 'When the PDF is a scan',
         'html': '<p>If you can&rsquo;t select the words in the PDF with your mouse, it&rsquo;s probably a scan or a photo of the page. The words are a picture, so there&rsquo;s nothing to put in Word until something reads them.</p>'
                 '<p>In Techies PDF, when the pages are pictures, press <strong>Read the words in the scanned pages</strong>. Windows&rsquo; own text reader reads them on your computer, so the letter is never sent anywhere. Then save them as a Word document as above.</p>'
                 '<p>Two honest warnings. Windows reads scans well but not perfectly, so check names, numbers and dates afterwards. And a few PCs don&rsquo;t have Windows&rsquo; text reader yet: the program offers to add it.</p>'},
        {'eyebrow': '/05 &mdash; YOUR PRIVACY', 'h2': 'Why not just use a converter website?',
         'html': '<p>The free &ldquo;PDF to Word&rdquo; websites mostly work. But every one of them means uploading your file to someone else&rsquo;s computer, and the PDFs people want to change are often the private ones: bank and pension letters, medical letters, solicitors&rsquo; letters, a CV with your address and phone number, a scan of an ID.</p>'
                 '<p>The same goes for putting it in Google Drive and opening it with Google Docs: it works, but the file is uploaded to Google first.</p>'
                 '<p>For anything private, read the website&rsquo;s privacy policy before you upload it, or do it on your own PC instead, where it never leaves.</p>'},
        {'eyebrow': '/06 &mdash; YOU MAY NOT NEED WORD', 'h2': 'Only need to sign it, fill it in or fix one thing?',
         'html': '<p>Turning a PDF into Word is the long way round for a lot of jobs. Techies PDF does these to the PDF itself, on your PC:</p>'
                 '<ul>'
                 '<li><strong>Fill in a form and sign it</strong>, and save it ready to send back.</li>'
                 '<li><strong>Change a word, a date or a name</strong>: cover the old words and type the new ones, saved as a new copy.</li>'
                 '<li><strong>Join PDFs together</strong>, take pages out, or turn upside-down pages the right way up.</li>'
                 '<li><strong>Make a PDF smaller</strong> so it fits in an email.</li>'
                 '</ul>'
                 '<p><a href="/techies-pdf/">See everything Techies PDF does</a>, with real pictures of each job.</p>'},
        {'eyebrow': '/07 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _call_us('If the document still won&rsquo;t come out right, or you&rsquo;d just rather someone did it with you on your Windows PC, we can help.')
                 + '<p>We work on Windows PCs only, not Macs, iPads or iPhones.</p>'},
    ],
    'howToName': 'How to turn a PDF into a Word document on Windows without uploading it',
    'howToSteps': [
        {'name': 'With Microsoft Word: open the PDF', 'text': 'In Word choose File, then Open, pick the PDF and choose OK when Word says it will convert it. Word makes a converted copy and keeps your original.'},
        {'name': 'Without Word: open Techies PDF', 'text': 'In the free Techies PDF program press Turn a PDF into a Word document and choose the PDF.'},
        {'name': 'Read a scan first', 'text': 'If the pages are scans, press Read the words in the scanned pages. Windows reads them on your PC. Check names, numbers and dates.'},
        {'name': 'Save the Word document', 'text': 'Press Save as a Word document and choose where to save it. You get the words, a line for each line and a page for each page; the layout and pictures are not kept.'},
    ],
    'faqs': [
        {'q': 'How do I convert a PDF to Word for free?', 'a': '<p>If you have Microsoft Word, open the PDF in Word with File, then Open: it converts it for you. If you don&rsquo;t, our free Techies PDF program for Windows puts a PDF&rsquo;s words into a Word document on your PC, without uploading it.</p>'},
        {'q': 'Can I convert a PDF to Word without uploading it?', 'a': '<p>Yes. Word on your PC converts it itself, and Techies PDF does the job on your computer too. The converter websites and Google Docs both need the file uploaded first.</p>'},
        {'q': 'Will the Word document look the same as the PDF?', 'a': '<p>Not always. Microsoft says Word tries to match the layout but some things, such as some tables, page borders and footnotes, can come out differently, and a page of charts may come in as a picture. Techies PDF keeps the words only, not the layout, pictures or fonts.</p>'},
        {'q': 'How do I turn a scanned PDF into Word?', 'a': '<p>A scan is a picture of the words, so they have to be read first. In Techies PDF, press Read the words in the scanned pages: Windows&rsquo; own text reader reads them on your PC, then you can save them as a Word document. Check names, numbers and dates afterwards.</p>'},
        {'q': 'Are online PDF to Word converters safe?', 'a': '<p>Many work, but they all mean uploading your document to someone else&rsquo;s computer. For bank, medical or legal letters, read the site&rsquo;s privacy policy first, or convert it on your own PC instead.</p>'},
        {'q': 'Does it work on a Mac or an iPad?', 'a': '<p>Techies PDF is for Windows 10 and 11, and we help with Windows PCs only, not Macs, iPads or iPhones.</p>'},
    ],
    'crossLinksHtml': '<p>Related help: <a href="/techies-pdf/">Techies PDF, our free PDF program</a>, <a href="/heic-photos-wont-open-on-windows/">phone photos that won&rsquo;t open</a>, <a href="/how-to-take-a-screenshot/">taking a screenshot</a> and <a href="/remote-support/">remote help</a>.</p>',
}

_bx.build_new_page(PAGE)
