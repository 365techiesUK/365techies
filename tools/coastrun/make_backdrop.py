"""One painted 360-degree panorama (gen_backdrop.py) made into a place's far backdrop: the sky keyed out (the game draws its own
sky), only the distant band kept (the foreground cut away), laid out like art.js's backdrop (1152 x 132 units round, the horizon
26 units from the bottom) so world3d.js can wrap it round in place of the painted shapes.
    py tools/coastrun/make_backdrop.py <place> <pano.png> [coast|land] [band]   -> games/coastrun/bg/<place>.webp (+ a preview)
band: how deep the kept strip runs below the land's top, as a share of the picture's height (default 0.3)
"""
import sys, os
import numpy as np
from PIL import Image

UNITS_W, UNITS_H, HZ_FROM_TOP = 1152, 132, 106
PX = 5   # pixels a unit across the finished panorama

def key_sky(a, spikes=False):   # spikes: keep a tall thin landmark (a lighthouse) standing far above the land round it
    """alpha 0 for the sky: the sky is the smooth region joined to the top edge - grown down from the top until it meets an
    edge (land has texture and outlines; a painted sky has none). Returns (alpha, the row the land starts in each column)"""
    from scipy import ndimage
    h, w, _ = a.shape
    g = ndimage.gaussian_filter(a, (1.2, 1.2, 0))
    gy = np.abs(np.diff(g, axis=0, append=g[-1:])).max(2); gx = np.abs(np.diff(g, axis=1, append=g[:, -1:])).max(2)
    edge = np.maximum(gx, gy) > 3.2
    edge = ndimage.binary_dilation(edge, iterations=1)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    pink = ((R - G) > 28) & ((B - G) > 10)   # the painted sky's magenta and its pinks (no Dorset land is that colour): always sky-side
    if spikes: pink &= (B - G) > 0.55 * (R - G)   # (magenta is as blue as it is red; a lighthouse's red band is not)
    free = ~edge | pink
    lab, n = ndimage.label(free)
    top = set(np.unique(lab[0])) - {0}
    sky = np.isin(lab, list(top))
    sky |= ndimage.binary_dilation(sky, iterations=2) & edge   # the thin edge line round the sky goes with it (no halo)
    land = np.argmin(sky, axis=0); land[sky.all(axis=0)] = h   # the first row in each column that isn't sky
    pad = np.pad(land, 30, mode='wrap'); med = np.array([np.median(pad[i:i + 61]) for i in range(len(land))])
    if not spikes: land = np.maximum(land, (med - 40).astype(np.int32))   # no thin spikes far above the land round them
    land = np.minimum(land, (med + 60).astype(np.int32))   # nor sky dipping deep into it (a leak down a smooth slope)
    sm = np.convolve(np.pad(land, 3, mode='wrap'), np.ones(7) / 7, mode='valid')
    land = np.minimum(land, (sm + 2).astype(np.int32))
    ys = np.arange(h)[:, None]
    al = np.clip((ys - land[None, :] + 1.5) / 3.0, 0, 1)
    al[ndimage.binary_dilation(pink, iterations=1)] = 0   # any of the painted sky's magenta left inside the land (a window in a ruin): see-through
    return al, land

def key_sea(a, alpha, land, depth):
    """the open sea keyed out too (the game has its own): each column, down from where the land starts, the first run of four
    sea-blue rows is the shore; nothing kept below it. Returns the shore row per column (-1 where none: all land)"""
    h, w, _ = a.shape; R, G, B = a[..., 0], a[..., 1], a[..., 2]
    sea = ((B - R) > 28) & ((G - R) > 8) & ((B + G) > 140)
    run = np.zeros_like(sea, dtype=np.int32)
    for y in range(h - 1, -1, -1): run[y] = (run[y + 1] + 1) * sea[y] if y + 1 < h else sea[y]
    shore = np.full(w, -1, np.int32)
    for x in range(w):
        y0 = land[x]
        if y0 >= h: continue
        ys = np.nonzero(run[y0:min(h, y0 + depth), x] >= 12)[0]
        if len(ys): shore[x] = y0 + ys[0]
    ys = np.arange(h)[:, None]
    cut = np.where(shore >= 0, shore, h)
    return alpha * np.clip((cut[None, :] - ys + 0.5) / 2.0, 0, 1), shore

def main():
    place, src = sys.argv[1], sys.argv[2]; coast = len(sys.argv) > 3 and sys.argv[3] == 'coast'; band = float(sys.argv[4]) if len(sys.argv) > 4 else 0.3
    a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32); h, w, _ = a.shape
    alpha, land = key_sky(a)
    top = max(0, int(np.percentile(land, 1)) - 4); base = min(h, int(np.percentile(land, 50) + band * h))
    shore = np.full(w, -1)
    if coast: alpha, shore = key_sea(a, alpha, land, int(band * h) + 40)
    if coast and (shore >= 0).mean() > 0.1:   # a coast: the sea's edge (the shore) goes on the horizon, so the far land sits on the game's sea
        sl = int(np.median(shore[shore >= 0])); base = min(h, sl + 6); print('  coast: shore at', sl, 'in', round((shore >= 0).mean() * 100), '% of columns')
    rgba = np.dstack([a, alpha * 255])[top:base]
    Wf, Hf, hz = UNITS_W * PX, UNITS_H * PX, HZ_FROM_TOP * PX
    im = Image.fromarray(rgba.astype(np.uint8), 'RGBA'); sh = int(round(im.height * Wf / im.width))
    im = np.asarray(im.resize((Wf, sh), Image.LANCZOS)).astype(np.float32)
    out = np.zeros((Hf, Wf, 4), np.float32); y0 = hz + 4 - sh
    ys0 = max(0, y0); out[ys0:hz + 4] = im[ys0 - y0:]
    fade = max(6, int(sh * 0.22)); ramp = np.clip((hz + 4 - np.arange(Hf)) / fade, 0, 1)   # the band's foot fades out into the haze (no hard edge, no streaks)
    out[..., 3] *= ramp[:, None]
    img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')
    dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'games', 'coastrun', 'bg', place + '.webp')
    img.save(dst, 'WEBP', quality=86, method=6)
    prev = Image.new('RGBA', img.size, (120, 170, 220, 255)); prev.alpha_composite(img)
    prev.convert('RGB').resize((Wf // 3, Hf // 3)).save(os.path.join(r'D:\claude\reels\coastrun-backdrops', place + '-preview.png'))
    print(place, 'done', os.path.getsize(dst) // 1024, 'KB, land band', base - top, 'px of', h)

PICKS = {   # the chosen take for each place (D:/claude/reels/coastrun-backdrops/<place>-<seed>-pano.png), and its band depth; each has its landmark 1/6 of the way round
    'bournemouth': (436670547, 0.12),
    'sandbanks': (935983446, 0.12),
    'christchurch': (943340658, 0.15),
    'purbeck': (13763272, 0.3),
    'swanage': (201279254, 0.15),
    'forest': (78200180, 0.3),
    'jurassic': (947871746, 0.15),
    'weymouth': (1006136986, 0.12),
    'harbour': (989773644, 0.15),
    'lymington': (613986090, 0.12),
    'lyme': (937294852, 0.15),
    'portland': (328354902, 0.12),
    'goldencap': (380569735, 0.15),
    'needles': (995715464, 0.14) }

if __name__ == '__main__':
    if sys.argv[1:] == ['all']:   # every place from its chosen take
        for pl, (seed, band) in PICKS.items():
            sys.argv = ['', pl, r'D:/claude/reels/coastrun-backdrops/%s-%d-pano.png' % (pl, seed), 'land', str(band)]; main()
    else: main()
