# -*- coding: utf-8 -*-
"""Three how-to pages for Techies One 0.24 (15 Nov 2026, owner: "produce the web pages ... as per the Bing keyword
research for the extra features"; "once it's signed ... do all the pages"; wording: "a free alternative for the everyday
jobs", never "a true alternative to Microsoft 365").

  /copy-text-from-a-picture/   image to text: Albums > More > Copy the words in this photo (Windows' own text reader)
  /make-a-video-smaller/       Albums > Make smaller: a smaller copy for WhatsApp or email
  /trim-a-video-on-windows/    Albums > Trim: keep the bits you want, Fast cut or Exact cut

Demand (Bing Keyword Research, 15 Aug - 12 Nov 2026, exact, UK | world): image to text 4,107 | 71,219; compress video
1,518 | 24,941; video trimmer 985 | 12,946. (video editor 10,026 | 134,571 is Clipchamp's search: not chased.)
The scanning page is NOT here on purpose: Scan had not run on a real scanner when these were written.

What each claim rests on (D:\\claude\\techies-one\\RELEASE-0.24.0.md):
  - words: a typed sample letter read in about 2 seconds with one slip in a postcode; handwriting is not promised;
  - smaller: on our own PC a 7-minute, 262 MB phone video (1080p, 60 pictures a second) became 39 MB in 42 seconds; the
    program aims at about 45 MB for WhatsApp and about 14 MB for email (albums-trim.js smallerPlan);
  - trim: Fast cut on 8 real videos from 8 MB to 780 MB took well under a second each; the start of a kept bit moves to
    the video's own key frame; Exact cut re-makes the video and is frame-exact; MP4 and MOV only.
Every picture is the real program on the demo's MADE-UP letter, photos and video (tools/playwright-check/t1-024-shots.mjs).
The download link comes from downloads/t1/version.json.
"""
import json
import os

from new_pages_data import NEW_PAGES


def _download():
    try:
        here = os.path.dirname(os.path.abspath(__file__))
        with open(os.path.join(here, "downloads", "t1", "version.json"), encoding="utf-8") as f:
            v = json.load(f)
        return (v["url"].replace("https://365techies.co.uk", ""), v["ver"], round(v["size"] / 1048576, 1))
    except (OSError, ValueError, KeyError):
        return ("/techies-one-mail/", "", 0)


_DL, _VER, _MB = _download()
_GET = ('<p>Techies One is our free program for Windows 10 and 11: email, photos, letters, sums and scanning in one '
        'window, a free alternative for the everyday jobs. It&rsquo;s signed by 365 Techies Ltd and has no adverts. '
        '<a href="' + _DL + '">Download it</a> (' + (f'version {_VER}, {_MB} MB' if _VER else 'free') + ') and install it. '
        'You don&rsquo;t need to add an email address to use Albums.</p>')
_MADE_UP = ' The letter, photos and video in the pictures are made up.'
_CALL = ('<p>Stuck, or would rather someone did it with you? Ring <strong>01202 775566</strong> or text 07520 615332, '
         'Monday to Friday, 9 to 5. We can connect to your PC and do it with you, anywhere in the UK. We tell you the '
         'price before we start.</p>')
_WHY = ('<p>We&rsquo;re an IT support company in Bournemouth, and this is one of the jobs customers ring us about. '
        'Techies One is signed by 365 Techies Ltd, is in the Microsoft Store, and has no adverts. See '
        '<a href="/techies-one-mail/">everything Techies One does</a>.</p>')


def _fig(name, w, h, alt, cap, wide=True):
    mw = "100%" if wide else "640px"
    return (f'<figure style="margin:1.1rem 0 1.4rem;max-width:{mw}"><img src="/images/{name}.webp" width="{w}" height="{h}" '
            f'alt="{alt}" loading="lazy" decoding="async" style="display:block;width:100%;height:auto;border-radius:12px;'
            f'border:1px solid rgba(125,170,220,.3);box-shadow:0 22px 50px -26px rgba(0,0,0,.8)">'
            f'<figcaption style="font-size:.78rem;color:var(--muted);margin-top:.45rem">{cap}</figcaption></figure>')


# ================================================================ 1. copy text from a picture (image to text)
NEW_PAGES.append({
    'slug': 'copy-text-from-a-picture',
    'title': 'Copy Text From a Picture on Windows, Free (Image to Text)',
    'metaDesc': 'Turn a photo of a letter, a recipe or a screenshot into text you can paste, free, on your own PC. Step by '
                'step with pictures, for Windows 10 and 11.',
    'ogTitle': 'Copy the text out of a picture, free, on your own PC',
    'crumbName': 'Copy Text From a Picture',
    'eyebrow': '// IMAGE TO TEXT, ON YOUR OWN PC',
    'h1': 'Copy the <em class="grad grad--cyan">text out of a picture</em>, free, without uploading it',
    'lede': 'Got a photo of a letter, a recipe, a sign or a screenshot, and want the words as text you can paste? Our free '
            'Techies One for Windows reads the words in a picture and copies them, using the text reader that is already '
            'part of Windows. The picture never leaves your PC. Here&rsquo;s how, with pictures.',
    'chips': ['Free, no sign-up', 'Nothing is uploaded', 'Windows 10 and 11'],
    'primaryCta': ['Download Techies One, free', _DL], 'secondaryCta': ['See the steps', '#s2'],
    'ctaHead': 'Rather we did it with you?',
    'ctaSub': 'We can connect to your PC and show you. We tell you the price before we start. Call 01202 775566 or text '
              '07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What it does', 'Reads the words in a photo and gives you them as text to paste into a letter or an email.'),
        ('Where it happens', 'On your own PC, with Windows&rsquo; own text reader. Nothing is sent to a website.'),
        ('Reads best', 'Typed or printed words: letters, bills, recipes, screenshots, signs.'),
        ('Reads badly', 'Handwriting, and very small or blurred words.'),
        ('Pictures it takes', 'JPG, PNG, BMP, GIF, TIFF and WebP, and iPhone HEIC photos where Windows can open them.'),
        ('Always check', 'Phone numbers, dates and amounts of money: it can mistake a 1 for an I.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHY NOT A WEBSITE?', 'h2': 'Why do it on your own PC',
         'html': '<p>Search for &ldquo;image to text&rdquo; and you&rsquo;ll find dozens of websites that do it. Every one '
                 'of them needs you to upload the picture first. That&rsquo;s fine for a recipe. It&rsquo;s less fine for '
                 'a bank letter, a hospital appointment or anything with your address and account number on it.</p>'
                 '<p>Windows 10 and 11 already have a text reader built in. Techies One uses it, so the picture is read on '
                 'your own computer and nothing is sent anywhere. There&rsquo;s no sign-up, no limit on how many pictures, '
                 'and no adverts.</p>'
                 '<p><strong>On Windows 11,</strong> the Snipping Tool can also copy text from what&rsquo;s on your screen. '
                 'Techies One does it for any photo in your Pictures, and works on Windows 10 as well.</p>'},
        {'eyebrow': '/02 &mdash; STEP BY STEP', 'h2': 'Copy the words out of a photo with Techies One',
         'html': _GET +
                 '<p><strong>1. Get the picture onto the PC.</strong> A photo taken on your phone can be emailed to '
                 'yourself, or copied over with its cable. A screenshot is already there. Put it anywhere in your '
                 '<strong>Pictures</strong> folder.</p>'
                 '<p><strong>2. Open Albums and select the photo,</strong> so it shows big. Albums is on the bar down the '
                 'left-hand side of Techies One, and shows the photos in your Pictures in date order.</p>'
                 '<p><strong>3. Select More, then Copy the words in this photo&hellip;</strong></p>'
                 + _fig('t1-024-words-1-more-menu', 1440, 900, 'A photo of a typed letter open in Techies One Albums, with '
                        'the More menu showing Copy the words in this photo', 'More, then Copy the words in this '
                        'photo&hellip;' + _MADE_UP) +
                 '<p><strong>4. Read the words through.</strong> A box shows what Windows read. Correct anything that&rsquo;s '
                 'wrong, right there in the box.</p>'
                 + _fig('t1-024-words-2-the-words', 1440, 900, 'Techies One showing the words read from a photo of a letter, '
                        'with a Copy the words button', 'The words, ready to check and copy.' + _MADE_UP) +
                 '<p><strong>5. Select Copy the words.</strong> Then select where you want them, in a letter, an email or '
                 'anywhere else, and press <strong>Ctrl and V</strong> to paste.</p>'},
        {'eyebrow': '/03 &mdash; GETTING A GOOD RESULT', 'h2': 'How to get the words read properly',
         'html': '<ul>'
                 '<li><strong>Take the photo square-on,</strong> not at an angle, with the page flat and filling the '
                 'picture.</li>'
                 '<li><strong>Use good light,</strong> with no shadow of your hand or phone across the page.</li>'
                 '<li><strong>Keep it sharp.</strong> If the words look blurred to you, they will to Windows too.</li>'
                 '<li><strong>Typed words read best.</strong> In our own test, a typed letter was read in about two '
                 'seconds with one slip, in a postcode. Handwriting often doesn&rsquo;t read at all.</li>'
                 '<li><strong>Check the numbers.</strong> A 1 and a capital I, or a 0 and a capital O, are the usual '
                 'mix-ups. Always check phone numbers, dates, account numbers and amounts of money against the photo.</li>'
                 '<li><strong>Other languages:</strong> Windows reads the languages it has installed. Add one in Windows&rsquo; '
                 'own Settings, under Time and language.</li>'
                 '</ul>'},
        {'eyebrow': '/04 &mdash; GOT A SCANNER?', 'h2': 'From paper straight to text',
         'html': '<p>If the words are on paper and you have a scanner, or a printer that scans, Techies One can do both '
                 'steps: in Letters, select <strong>Scan a letter</strong>, then <strong>Copy the words</strong>. A scan is '
                 'flat, sharp and evenly lit, so it usually reads better than a phone photo.</p>'
                 + _fig('t1-024-scan-3-words', 812, 546, 'The words read from a scanned letter in Techies One, with Copy '
                        'the words and Back to the pages buttons', 'The words from a scanned letter.' + _MADE_UP,
                        wide=False)},
        {'eyebrow': '/05 &mdash; HONEST LIMITS', 'h2': 'What it can&rsquo;t do',
         'html': '<ul>'
                 '<li><strong>Handwriting:</strong> not promised. Neat capitals sometimes read; joined-up writing rarely '
                 'does.</li>'
                 '<li><strong>Layout:</strong> you get the words in lines and paragraphs, not the fonts, columns or tables. '
                 'A table comes out as lines of text.</li>'
                 '<li><strong>PDFs:</strong> it reads pictures. For a PDF, take a screenshot of the page, or see our free '
                 '<a href="/techies-pdf/">Techies PDF</a>.</li>'
                 '<li><strong>Mac, iPhone and Android:</strong> it&rsquo;s for Windows 10 and 11 PCs.</li>'
                 '</ul>'},
        {'eyebrow': '/06 &mdash; WHY IT&rsquo;S FREE', 'h2': 'Why we made it free', 'html': _WHY},
        {'eyebrow': '/07 &mdash; RATHER WE HELPED?', 'h2': 'When to call us', 'html': _CALL},
    ],
    'howToName': 'How to copy the text out of a picture on Windows',
    'howToSteps': [
        {'name': 'Put the picture in Pictures', 'text': 'Copy the photo or screenshot into your Pictures folder on the PC.'},
        {'name': 'Open it in Albums', 'text': 'In Techies One, select Albums, then select the photo so it shows big.'},
        {'name': 'Copy the words in this photo', 'text': 'Select More, then Copy the words in this photo.'},
        {'name': 'Check the words', 'text': 'Read the words through and correct any mistakes, especially numbers.'},
        {'name': 'Copy and paste', 'text': 'Select Copy the words, then press Ctrl and V where you want them.'},
    ],
    'faqs': [
        {'q': 'How do I copy text from a picture for free?', 'a': '<p>Open the picture in Albums in our free Techies One for '
              'Windows, select More, then Copy the words in this photo. The words appear as text you can copy and paste.</p>'},
        {'q': 'Is my picture uploaded anywhere?', 'a': '<p>No. The words are read on your own PC by the text reader that is '
              'part of Windows. Nothing is sent to us or to anyone else.</p>'},
        {'q': 'Can it read handwriting?', 'a': '<p>Not reliably. Typed and printed words read well; handwriting often '
              'doesn&rsquo;t read at all.</p>'},
        {'q': 'Does it work on Windows 10?', 'a': '<p>Yes, Windows 10 and Windows 11.</p>'},
        {'q': 'Can it read a screenshot?', 'a': '<p>Yes. Save the screenshot into your Pictures folder and open it in Albums '
              'like any other picture.</p>'},
        {'q': 'Can it read a photo from my iPhone?', 'a': '<p>Yes, once the photo is on the PC. JPG photos always work; '
              'HEIC photos work where Windows itself can open them.</p>'},
        {'q': 'How accurate is it?', 'a': '<p>Good on clear typed words, with the odd slip. Always check numbers, dates and '
              'amounts of money against the picture.</p>'},
        {'q': 'Is there a limit on how many pictures?', 'a': '<p>No. There&rsquo;s no limit and no sign-up.</p>'},
        {'q': 'Does it work on a Mac?', 'a': '<p>No, it&rsquo;s for Windows 10 and 11 PCs.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/how-to-scan-a-document/">how to scan a document</a>, '
                      '<a href="/make-a-video-smaller/">make a video smaller</a>, <a href="/trim-a-video-on-windows/">trim a '
                      'video</a> and <a href="/techies-one-mail/">Techies One</a>.</p>',
})


# ================================================================ 2. make a video smaller
NEW_PAGES.append({
    'slug': 'make-a-video-smaller',
    'title': 'Make a Video Smaller to Send by WhatsApp or Email, Free',
    'metaDesc': 'Video too big to send? Make a smaller copy for WhatsApp or email, free, on your own Windows PC. Nothing is '
                'uploaded and your original is kept. Step by step.',
    'ogTitle': 'Make a video smaller to send, free, on your own PC',
    'crumbName': 'Make a Video Smaller',
    'eyebrow': '// VIDEO TOO BIG TO SEND?',
    'h1': 'Make a <em class="grad grad--cyan">video smaller</em> so it will send',
    'lede': 'A few minutes of video from a modern phone is hundreds of megabytes: too big for an email, and often too big '
            'for WhatsApp. Our free Techies One for Windows makes a smaller copy on your own PC, sized to go through, and '
            'leaves your original exactly as it was. Here&rsquo;s how.',
    'chips': ['Free, no sign-up', 'Your original is kept', 'Nothing is uploaded'],
    'primaryCta': ['Download Techies One, free', _DL], 'secondaryCta': ['See the steps', '#s2'],
    'ctaHead': 'Rather we did it with you?',
    'ctaSub': 'We can connect to your PC and show you. We tell you the price before we start. Call 01202 775566 or text '
              '07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What it does', 'Makes a smaller copy of a video, so it goes through WhatsApp or email.'),
        ('Your original', 'Never changed. The smaller one is a new file beside it, with &ldquo;smaller&rdquo; in its name.'),
        ('Where it happens', 'On your own PC. The video isn&rsquo;t uploaded to a website.'),
        ('How long', 'On our PC, a 7-minute phone video took 42 seconds. Older PCs take longer.'),
        ('Videos it takes', 'MP4 and MOV, which is what phones and cameras make.'),
        ('The trade', 'Smaller means a softer picture. The sound is kept as it is.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHY IT WON&rsquo;T SEND', 'h2': 'Why your video is too big',
         'html': '<p>Phones now film in full HD or 4K, often at 60 pictures a second. That looks lovely and makes very big '
                 'files: a few minutes can pass 200 MB. Most email providers stop an attachment at around 20 to 25 MB, and '
                 'WhatsApp makes a big video smaller itself, or refuses it.</p>'
                 '<p>There are two ways round it. <strong>Make the video smaller,</strong> which this page is about: the '
                 'picture is a little softer, and it sends like any other. Or <strong>send a link</strong> to the full-size '
                 'video, which Techies One can also do from your own OneDrive with <strong>Share a link</strong>.</p>'},
        {'eyebrow': '/02 &mdash; STEP BY STEP', 'h2': 'Make a smaller copy with Techies One',
         'html': _GET +
                 '<p><strong>1. Open Albums and select the video,</strong> so it shows big. Albums is on the bar down the '
                 'left-hand side, and shows the photos and videos in your Pictures and Videos folders.</p>'
                 + _fig('t1-024-video-1-viewer', 1440, 900, 'A video open in Techies One Albums, with Trim and Make smaller '
                        'buttons under it', 'A video open in Albums: Trim&hellip; and Make smaller&hellip; are under it.'
                        + _MADE_UP) +
                 '<p><strong>2. Select Make smaller&hellip;</strong> Techies One tells you how big the video is and how '
                 'long, and offers the sizes that make sense for it: <strong>For WhatsApp</strong>, <strong>For '
                 'email</strong>, or a sharper one. Each shows about how big the copy will be.</p>'
                 + _fig('t1-024-video-2-smaller-choices', 1440, 900, 'Make this video smaller in Techies One: the size of '
                        'the video, and a choice sized for email', 'The choices, each with its size. This one was already '
                        'small enough for WhatsApp, so only the email size is offered.' + _MADE_UP) +
                 '<p><strong>3. Choose one and wait.</strong> A bar shows how far it has got. Keep Techies One open until it '
                 'says it has finished.</p>'
                 '<p><strong>4. Send the copy.</strong> It&rsquo;s saved beside your original with &ldquo;smaller&rdquo; in '
                 'its name, and shows in Albums. Select it, then <strong>Send&hellip;</strong> for email or WhatsApp.</p>'},
        {'eyebrow': '/03 &mdash; WHAT TO EXPECT', 'h2': 'How small, how long, how good',
         'html': '<ul>'
                 '<li><strong>How small:</strong> the email size aims at about 14 MB, and the WhatsApp size at about 45 MB. '
                 'On our own PC, a 7-minute phone video of 262 MB became 39 MB.</li>'
                 '<li><strong>How long it takes:</strong> that video took 42 seconds on our PC, which has a fast graphics '
                 'card. An older laptop will take several times longer.</li>'
                 '<li><strong>How it looks:</strong> the smaller the copy, the softer the picture. For a clip watched on a '
                 'phone, most people won&rsquo;t notice.</li>'
                 '<li><strong>The sound</strong> is copied exactly as it was.</li>'
                 '<li><strong>Very long videos:</strong> if even a small picture wouldn&rsquo;t fit, Techies One says so. '
                 '<a href="/trim-a-video-on-windows/">Trim it</a> to the part you want first, or send a link.</li>'
                 '</ul>'},
        {'eyebrow': '/04 &mdash; HONEST LIMITS', 'h2': 'What it can&rsquo;t do',
         'html': '<ul>'
                 '<li><strong>Old or unusual videos:</strong> it takes MP4 and MOV files. Old camcorder files (AVI, MPG, '
                 'WMV) aren&rsquo;t supported.</li>'
                 '<li><strong>Some PCs:</strong> it uses the video parts built into Windows and your graphics chip. On a '
                 'PC that can&rsquo;t do it, Techies One tells you, and offers to send the video as a link instead.</li>'
                 '<li><strong>Videos kept only online</strong> in OneDrive need opening first, so they&rsquo;re on the PC.</li>'
                 '<li><strong>Mac, iPhone and Android:</strong> it&rsquo;s for Windows 10 and 11 PCs.</li>'
                 '</ul>'},
        {'eyebrow': '/05 &mdash; WHY IT&rsquo;S FREE', 'h2': 'Why we made it free', 'html': _WHY},
        {'eyebrow': '/06 &mdash; RATHER WE HELPED?', 'h2': 'When to call us', 'html': _CALL},
    ],
    'howToName': 'How to make a video smaller to send by WhatsApp or email',
    'howToSteps': [
        {'name': 'Open the video in Albums', 'text': 'In Techies One, select Albums, then select the video so it shows big.'},
        {'name': 'Select Make smaller', 'text': 'Select Make smaller, under the video.'},
        {'name': 'Choose a size', 'text': 'Choose For WhatsApp or For email. Each shows about how big the copy will be.'},
        {'name': 'Wait for it to finish', 'text': 'Keep Techies One open while the bar fills. Your original is not changed.'},
        {'name': 'Send the copy', 'text': 'Select the smaller copy in Albums, then Send, for email or WhatsApp.'},
    ],
    'faqs': [
        {'q': 'How do I make a video smaller for free?', 'a': '<p>Open the video in Albums in our free Techies One for '
              'Windows and select Make smaller. It makes a smaller copy on your own PC and keeps the original.</p>'},
        {'q': 'How do I send a video that is too big for email?', 'a': '<p>Make a smaller copy sized for email, about 14 MB, '
              'or send a link to the full-size video from your own OneDrive. Techies One does both.</p>'},
        {'q': 'Is my video uploaded anywhere?', 'a': '<p>No. The smaller copy is made on your own PC.</p>'},
        {'q': 'Will it change my original video?', 'a': '<p>No. The smaller one is a new file, with &ldquo;smaller&rdquo; in '
              'its name. Your original stays exactly as it was.</p>'},
        {'q': 'Does making it smaller lose quality?', 'a': '<p>Yes, a little: the picture is softer. The sound is kept as it '
              'is.</p>'},
        {'q': 'How long does it take?', 'a': '<p>On our PC a 7-minute phone video took 42 seconds. An older PC will take '
              'longer.</p>'},
        {'q': 'Which video files does it take?', 'a': '<p>MP4 and MOV files, which is what phones and most cameras '
              'make.</p>'},
        {'q': 'Does it work on a Mac?', 'a': '<p>No, it&rsquo;s for Windows 10 and 11 PCs.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/trim-a-video-on-windows/">trim a video</a>, '
                      '<a href="/copy-text-from-a-picture/">copy text from a picture</a> and '
                      '<a href="/techies-one-mail/">Techies One</a>.</p>',
})


# ================================================================ 3. trim a video
NEW_PAGES.append({
    'slug': 'trim-a-video-on-windows',
    'title': 'Trim a Video on Windows, Free: Keep Only the Bits You Want',
    'metaDesc': 'Cut the start, the end or the middle out of a video, free, on Windows 10 and 11. No sign-up, nothing '
                'uploaded, and your original is kept. Step by step with pictures.',
    'ogTitle': 'Trim a video on Windows, free, with no sign-up',
    'crumbName': 'Trim a Video',
    'eyebrow': '// A SIMPLE VIDEO TRIMMER FOR WINDOWS',
    'h1': 'Trim a <em class="grad grad--cyan">video</em> down to the bits you want',
    'lede': 'Most videos need one thing: the dull start and the wobbly end cut off. Our free Techies One for Windows shows '
            'the video as a strip of pictures, you mark the bits to keep, and it saves them as a new video. No timeline to '
            'learn, no sign-up, and your original is never changed.',
    'chips': ['Free, no sign-up', 'Keep several bits', 'Your original is kept'],
    'primaryCta': ['Download Techies One, free', _DL], 'secondaryCta': ['See the steps', '#s2'],
    'ctaHead': 'Rather we did it with you?',
    'ctaSub': 'We can connect to your PC and show you. We tell you the price before we start. Call 01202 775566 or text '
              '07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What it does', 'Keeps the bits of a video you mark, and leaves the rest out.'),
        ('Fast cut', 'Copies the video as it is. Nothing is re-made, so no quality is lost and it takes moments.'),
        ('Exact cut', 'Cuts on the very picture you chose. It re-makes the video, so it takes longer.'),
        ('Several bits', 'Keep one bit, or several: they are joined into one video.'),
        ('Your original', 'Never changed. The trimmed one is a new file, with &ldquo;trimmed&rdquo; in its name.'),
        ('Videos it takes', 'MP4 and MOV, which is what phones and cameras make.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; DO YOU NEED A VIDEO EDITOR?', 'h2': 'Trimming isn&rsquo;t editing',
         'html': '<p>A full video editor has timelines, tracks, transitions and effects, and takes an evening to learn. '
                 'Windows comes with one, Clipchamp, which asks you to sign in before you start.</p>'
                 '<p>If all you want is the good part of a video, on its own, you don&rsquo;t need any of that. Techies '
                 'One&rsquo;s trim is one screen: a strip of pictures from your video and two handles to drag.</p>'},
        {'eyebrow': '/02 &mdash; STEP BY STEP', 'h2': 'Trim a video with Techies One',
         'html': _GET +
                 '<p><strong>1. Open Albums and select the video,</strong> so it shows big, then select '
                 '<strong>Trim&hellip;</strong> under it.</p>'
                 + _fig('t1-024-video-1-viewer', 1440, 900, 'A video open in Techies One Albums, with a Trim button under '
                        'it', 'A video open in Albums, with Trim&hellip; under it.' + _MADE_UP) +
                 '<p><strong>2. Mark the bit to keep.</strong> The strip under the video shows it from start to finish. '
                 'Drag the two blue ends inwards to keep the middle. Or play the video, stop where the good bit begins and '
                 'select <strong>Start the bit here</strong>, then do the same with <strong>End the bit here</strong>.</p>'
                 + _fig('t1-024-video-3-trim', 1440, 900, 'The trim screen in Techies One: the video, a strip of pictures '
                        'from it with a handle at each end, and buttons for Start the bit here, End the bit here, Keep '
                        'another bit, Fast cut and Exact cut', 'The trim screen: the strip, the handles, and Fast cut or '
                        'Exact cut.' + _MADE_UP) +
                 '<p><strong>3. Want more than one bit?</strong> Select <strong>Keep another bit</strong> and mark that one '
                 'too. The bits are joined, in order, into one video.</p>'
                 '<p><strong>4. Check it.</strong> <strong>Play what you&rsquo;re keeping</strong> plays only the bits '
                 'you&rsquo;ve marked.</p>'
                 '<p><strong>5. Select Save a trimmed copy.</strong> It&rsquo;s saved beside your original with '
                 '&ldquo;trimmed&rdquo; in its name, and shows in Albums.</p>'},
        {'eyebrow': '/03 &mdash; FAST OR EXACT', 'h2': 'Fast cut and Exact cut: which to choose',
         'html': '<p><strong>Fast cut</strong> copies your video exactly as it is, leaving out what you don&rsquo;t want. '
                 'Nothing is re-made, so there&rsquo;s no loss of quality at all, and it&rsquo;s done almost at once: in '
                 'our tests, videos up to 780 MB were trimmed in well under a second. The catch is that a video can only '
                 'be started cleanly at certain pictures, which come every few seconds. So with Fast cut, the start of '
                 'your bit moves back a little to the nearest one. The screen shows you where.</p>'
                 '<p><strong>Exact cut</strong> starts and ends on the very picture you chose. To do that it re-makes the '
                 'video, which takes longer: from seconds to a few minutes, with the length of the bit and the speed of the PC.</p>'
                 '<p>Start with Fast cut. If the start is a second or two earlier than you wanted and it matters, use '
                 'Exact cut.</p>'},
        {'eyebrow': '/04 &mdash; HONEST LIMITS', 'h2': 'What it can&rsquo;t do',
         'html': '<ul>'
                 '<li><strong>It trims; it doesn&rsquo;t edit.</strong> No titles, music, transitions or joining two '
                 'different videos. For a film of your photos with music, Albums has <strong>Make a film</strong>.</li>'
                 '<li><strong>Old or unusual videos:</strong> MP4 and MOV only. Old camcorder files (AVI, MPG, WMV) '
                 'aren&rsquo;t supported.</li>'
                 '<li><strong>Exact cut on some PCs:</strong> it uses the video parts built into Windows and your '
                 'graphics chip. If your PC can&rsquo;t, Fast cut still works.</li>'
                 '<li><strong>Mac, iPhone and Android:</strong> it&rsquo;s for Windows 10 and 11 PCs.</li>'
                 '</ul>'
                 '<p>Trimmed it and it&rsquo;s still too big to send? <a href="/make-a-video-smaller/">Make it '
                 'smaller</a>.</p>'},
        {'eyebrow': '/05 &mdash; WHY IT&rsquo;S FREE', 'h2': 'Why we made it free', 'html': _WHY},
        {'eyebrow': '/06 &mdash; RATHER WE HELPED?', 'h2': 'When to call us', 'html': _CALL},
    ],
    'howToName': 'How to trim a video on Windows',
    'howToSteps': [
        {'name': 'Open the video in Albums', 'text': 'In Techies One, select Albums, select the video, then select Trim.'},
        {'name': 'Mark the bit to keep', 'text': 'Drag the two blue ends of the strip inwards, or use Start the bit here and '
                                                 'End the bit here while the video plays.'},
        {'name': 'Add another bit if you want', 'text': 'Select Keep another bit to keep more than one part.'},
        {'name': 'Check it', 'text': 'Select Play what you are keeping.'},
        {'name': 'Save a trimmed copy', 'text': 'Select Save a trimmed copy. Your original is not changed.'},
    ],
    'faqs': [
        {'q': 'How do I trim a video on Windows for free?', 'a': '<p>Open the video in Albums in our free Techies One, select '
              'Trim, drag the ends of the strip to the bit you want, then Save a trimmed copy.</p>'},
        {'q': 'Does trimming lose quality?', 'a': '<p>Not with Fast cut: the video is copied as it is. Exact cut re-makes '
              'the video, at a quality close to the original.</p>'},
        {'q': 'Can I cut a bit out of the middle?', 'a': '<p>Yes. Keep the part before it and the part after it as two bits, '
              'with Keep another bit, and they&rsquo;re joined into one video.</p>'},
        {'q': 'Will it change my original video?', 'a': '<p>No. The trimmed one is a new file with &ldquo;trimmed&rdquo; in '
              'its name.</p>'},
        {'q': 'Do I need to sign in or make an account?', 'a': '<p>No. There&rsquo;s no account, and the video isn&rsquo;t '
              'uploaded anywhere.</p>'},
        {'q': 'Why did the start move back a little?', 'a': '<p>Fast cut can only start at certain pictures in the video, '
              'which come every few seconds. Use Exact cut to start on the very picture you chose.</p>'},
        {'q': 'Which video files does it take?', 'a': '<p>MP4 and MOV files, which is what phones and most cameras '
              'make.</p>'},
        {'q': 'Does it work on Windows 10?', 'a': '<p>Yes, Windows 10 and Windows 11.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/make-a-video-smaller/">make a video smaller</a>, '
                      '<a href="/copy-text-from-a-picture/">copy text from a picture</a> and '
                      '<a href="/techies-one-mail/">Techies One</a>.</p>',
})
