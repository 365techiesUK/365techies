#!/usr/bin/env python3
"""Render the social share card for /mobile-signal-check/ (1200x630 JPEG).

Static by design: the page is a static file, so its og:image cannot change per
share. That is fine - the READING travels in the share text, which is what a
feed actually shows. This card just has to look like something worth tapping.

    py make_sigcheck_og.py     -> writes og-mobile-signal-check.jpg

No network name anywhere on it. Never add one.
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG, PANEL, INK, MUTED = (11, 16, 32), (20, 27, 46), (230, 237, 243), (157, 179, 207)
GREEN, AMBER, RED, CYAN = (63, 185, 80), (210, 153, 34), (248, 81, 73), (108, 196, 245)


def font(size, bold=False):
    for cand in (["C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"]
                 + ["C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"]):
        try:
            return ImageFont.truetype(cand, size)
        except OSError:
            continue
    return ImageFont.load_default()


img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# soft radial-ish glow top-right, drawn as concentric ellipses
for i in range(18, 0, -1):
    a = int(8 + i * 1.2)
    glow = Image.new("RGB", (W, H), BG)
    ImageDraw.Draw(glow).ellipse([700 - i * 40, -300 - i * 30, 1500 + i * 40, 500 + i * 30],
                                 fill=(11 + a // 3, 16 + a // 2, 32 + a))
    img = Image.blend(img, glow, 0.08)
d = ImageDraw.Draw(img)

# grid dots (the map motif)
for gx in range(60, W, 60):
    for gy in range(60, H, 60):
        d.ellipse([gx - 2, gy - 2, gx + 2, gy + 2], fill=(36, 69, 111))

# eyebrow + headline
d.text((70, 78), "// YOUR PHONE  ·  RIGHT WHERE YOU STAND  ·  FREE", font=font(26), fill=CYAN)
d.text((70, 128), "How good is your", font=font(70, True), fill=INK)
d.text((70, 208), "mobile signal here?", font=font(70, True), fill=INK)
d.text((70, 300), "Ten seconds. See how your area compares —", font=font(34), fill=MUTED)
d.text((70, 344), "and help build a real map of Bournemouth.", font=font(34), fill=MUTED)

# a "reading" panel, like the page shows
px, py, pw, ph = 70, 420, 1060, 140
d.rounded_rectangle([px, py, px + pw, py + ph], radius=22, fill=PANEL, outline=(60, 90, 130))
# three coloured squares = the map cells
for i, c in enumerate([GREEN, AMBER, GREEN, RED, GREEN, GREEN, AMBER]):
    x = px + 30 + i * 62
    d.rounded_rectangle([x, py + 34, x + 48, py + 82], radius=8, fill=c)
d.text((px + 500, py + 34), "Great for working  ·  Fine for calls  ·  Struggles", font=font(30), fill=INK)
d.text((px + 500, py + 80), "365techies.co.uk/mobile-signal-check", font=font(30, True), fill=CYAN)

img.save("og-mobile-signal-check.jpg", "JPEG", quality=88, optimize=True)
print("wrote og-mobile-signal-check.jpg")
