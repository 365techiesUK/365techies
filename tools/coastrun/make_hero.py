"""One landmark picture (gen_hero.py) made into its hero layer: the sky keyed out (as make_backdrop.py does it), the foreground cut
away at the landmark's foot, the foot and the two sides faded out so it settles on the game's own horizon.
    py tools/coastrun/make_hero.py <place> <png> <foot> [x0 x1] [sea] [desat]   -> games/coastrun/bg/hero-<place>.webp (+ a preview)
foot: how far down the picture the landmark stands (0-1; everything below is cut away); x0 x1: the part across to keep (0-1);
sea: 1 keys the painted sea out too (the landmark then stands on the game's own sea, the sky showing through an arch);
desat: 0-1, how much colour to take out of the light parts (chalk painted gold by a sunset reads as gold)
"""
import os, sys
import numpy as np
from PIL import Image
from make_backdrop import key_sky

def main():
    place, src, foot = sys.argv[1], sys.argv[2], float(sys.argv[3])
    x0, x1 = (float(sys.argv[4]), float(sys.argv[5])) if len(sys.argv) > 5 else (0.0, 1.0)
    sea, desat = len(sys.argv) > 6 and sys.argv[6] == '1', float(sys.argv[7]) if len(sys.argv) > 7 else 0.0
    a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32); h, w, _ = a.shape
    alpha, land = key_sky(a)
    if sea:
        from scipy import ndimage
        R, G, B = a[..., 0], a[..., 1], a[..., 2]
        m = ndimage.binary_opening(((B - R) > 28) & ((G - R) > 8) & ((B + G) > 140), iterations=1)
        alpha = alpha * (1 - ndimage.gaussian_filter(ndimage.binary_dilation(m, iterations=1).astype(np.float32), 0.8))
    if desat > 0:
        lum = a @ np.array([0.3, 0.59, 0.11], np.float32); k = desat * np.clip((lum - 120) / 90, 0, 1)[..., None]
        a = a * (1 - k) + (lum[..., None] * np.array([1.02, 1.0, 0.96], np.float32)) * k
    c0, c1, yb = int(x0 * w), int(x1 * w), int(foot * h)
    top = max(0, int(land[c0:c1].min()) - 6)
    rgba = np.dstack([a, alpha * 255])[top:yb, c0:c1].copy(); hh, ww = rgba.shape[:2]
    fy = np.clip((hh - np.arange(hh)) / (hh * 0.16), 0, 1) ** 1.5   # the foot fades out into the haze
    fx = np.clip(np.minimum(np.arange(ww), ww - 1 - np.arange(ww)) / (ww * 0.1), 0, 1)   # and so do the two sides
    rgba[..., 3] *= fy[:, None] * fx[None, :]
    im = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), 'RGBA')
    if im.width > 1024: im = im.resize((1024, round(im.height * 1024 / im.width)), Image.LANCZOS)
    dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'games', 'coastrun', 'bg', 'hero-' + place + '.webp')
    im.save(dst, 'WEBP', quality=88, method=6)
    prev = Image.new('RGBA', im.size, (120, 170, 220, 255)); prev.alpha_composite(im)
    prev.convert('RGB').save(os.path.join(r'D:\claude\reels\coastrun-heroes', place + '-hero-preview.png'))
    print(place, 'done', im.size, os.path.getsize(dst) // 1024, 'KB')

if __name__ == '__main__':
    main()
