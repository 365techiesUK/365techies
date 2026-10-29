"""365 Coast Run's five mood LUTs (revamp WS3, 29 Oct 2026): our own colour grades, worked out with numpy - no photographs, no
library or bought LUTs. Each is a 33-point .cube (the usual interchange format: DaVinci Resolve and most editors open it, so a
mood can be hand-tuned later and packed again with cube2png.py).

Where a LUT sits in the picture (world3d.js GRADE_NEW): the frame is tone mapped (Neutral) and turned into screen colour, the
place's own saturation, contrast, tint and shadow lift are applied, and THEN the mood LUT. So a LUT holds what the old grade did
for every place alike - its vibrance, S-curve, the calmer greens and the cool-shadow / warm-highlight tone - plus the mood:

  day     midday on the coast: clean whites, a richer sea and sky, a breath of warmth in the highlights
  warm    a late afternoon (the forest, Weymouth): golden highlights, softer blacks
  golden  the low sun (Durdle Door, Golden Cap, Lyme, the Needles): amber light against lilac-blue shade
  dusk    after sunset (Portland, Hengistbury): rose mid-tones, violet shade, peach where the light still is
  night   Poole Quay, the local run after dark: navy shade you can still read on a phone, warm lamps kept rich

The grass is NOT taken down here beyond the old grade's own green pull: the WS2 fix round already made the fields 15% less
saturated (groundNew()), and the critic asked for that to be done once.

    py tools/coastrun/make_luts.py      -> tools/coastrun/lut/<mood>.cube
    py tools/coastrun/cube2png.py       -> games/coastrun/lut/moods.png (the five packed in one strip picture)
"""
import os
import numpy as np

N = 33
HERE = os.path.dirname(os.path.abspath(__file__))
OUTD = os.path.join(HERE, 'lut')
MOODS = ['day', 'warm', 'golden', 'dusk', 'night']   # (the order world3d.js's MOODS reads them in: one row of moods.png each)
LW = np.array([0.299, 0.587, 0.114])


def luma(c):
    return c @ LW


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    return a + (b - a) * t


def classic(c, vib, curve):
    """The old GRADE's steps that every place shared (vibrance, the S-curve, the green pull, cool shadows / warm highlights),
    exactly as its shader did them, so the new look starts from the same colours."""
    l = luma(c)[..., None]
    sp = (c.max(-1) - c.min(-1))[..., None]
    vk = 1 + vib * (1 - np.clip(sp * 2, 0, 1)) * np.clip((np.maximum(c[..., 1:2], c[..., 2:3]) - c[..., 0:1]) * 6, 0, 1) * smooth(0.08, 0.3, l)
    c = mix(l, c, vk)
    c = np.clip(c, 0, 1)
    c = mix(c, c * c * (3 - 2 * c), curve)
    L2 = luma(c)[..., None]
    gr = np.clip((c[..., 1:2] - np.maximum(c[..., 0:1], c[..., 2:3])) * 5, 0, 1)
    c = mix(c, np.broadcast_to(L2, c.shape), gr * 0.22)
    c = c + ((1 - L2) ** 2 * np.array([-0.012, 0.006, 0.022]) + L2 ** 2 * np.array([0.026, 0.01, -0.014]))
    return c


def hue(c):
    """Hue in 0..1 (0 red, 1/3 green, 2/3 blue) and saturation (max - min)."""
    mx = c.max(-1); mn = c.min(-1); d = mx - mn + 1e-9
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6
    return h, mx - mn


def band(h, centre, width):
    """A soft weight round one hue (wrapping round the colour wheel)."""
    d = np.abs(((h - centre + 0.5) % 1) - 0.5)
    return smooth(width, width * 0.35, d)


def sat_by_hue(c, centre, width, k):
    h, s = hue(c)
    w = (band(h, centre, width) * smooth(0.02, 0.12, s))[..., None]
    l = luma(c)[..., None]
    return mix(l, c, 1 + k * w)


def split(c, shade, light, k=1.0):
    l = luma(np.clip(c, 0, 1))[..., None]
    return c + k * ((1 - l) ** 2 * np.array(shade) + l ** 2 * np.array(light))


def shoulder(c, at=0.86):
    """A soft roll-off above `at`, so bright skies and white cliffs keep their detail instead of clipping flat."""
    over = np.maximum(c - at, 0)
    return np.minimum(c, at) + over / (1 + over / (1 - at) * 0.6)


def contrast(c, k, pivot=0.45):
    return (c - pivot) * k + pivot


def mood(c, name):
    if name == 'day':
        c = classic(c, 0.22, 0.28)              # (WS3 fix round: a firmer S-curve than the old grade's 0.18 - midday had read flat and hazy)
        c = sat_by_hue(c, 0.56, 0.12, 0.10)    # the sea and the sky a little richer (cyan to blue)
        c = sat_by_hue(c, 0.07, 0.07, 0.05)    # sand, brick and skin a touch warmer
        l = luma(np.clip(c, 0, 1))[..., None]
        sh = smooth(0.03, 0.16, l) * (1 - smooth(0.22, 0.6, l))   # the shade's tones (not the blacks themselves: they stay black)
        c = c * (1 - 0.08 * (1 - smooth(0.12, 0.55, l))) + sh * np.array([-0.006, 0.0, 0.032])   # the shade deeper and cooler: hard sunlight against blue-sky shade
        hi = smooth(0.45, 0.92, l)
        c = c * (1 + 0.05 * hi) + hi * np.array([0.022, 0.009, -0.012])   # a warmer, brighter shoulder where the sun falls
        c = split(c, [-0.006, 0.0, 0.012], [0.012, 0.006, -0.004])
        c = contrast(c, 1.05, 0.42)             # and a little more contrast round the mid-tones
        c = shoulder(c, 0.88)
    elif name == 'warm':
        c = classic(c, 0.22, 0.18)
        c = c * np.array([1.025, 1.0, 0.955])
        c = split(c, [0.004, 0.002, 0.014], [0.03, 0.016, -0.018])
        c = sat_by_hue(c, 0.58, 0.1, 0.05)
        c = shoulder(c, 0.86)
    elif name == 'golden':
        c = classic(c, 0.22, 0.18)
        h, s = hue(np.clip(c, 0, 1))
        blue = (band(h, 0.6, 0.12) * smooth(0.12, 0.3, s))[..., None]   # (WS3 fix round: the sea and sky's saturated blues keep out of the lilac shade - the sea had gone lavender)
        l = luma(np.clip(c, 0, 1))[..., None]
        c = c * mix(mix(np.array([0.97, 0.985, 1.05]), np.array([1.0, 1.0, 1.0]), blue), np.array([1.06, 1.0, 0.88]), smooth(0.18, 0.8, l))   # the warmth in the light only: the shade cools
        c = c + (1 - blue) * ((1 - l) ** 2 * np.array([-0.004, 0.0, 0.03])) + l ** 2 * np.array([0.04, 0.016, -0.026])   # lilac-blue in the shade, amber in the light
        c = c + blue * (1 - l) * np.array([-0.02, 0.012, 0.004])   # a deep blue-teal sea against the orange light
        c = sat_by_hue(c, 0.06, 0.08, 0.10)    # the oranges and the low sun on the cliffs richer
        c = sat_by_hue(c, 0.62, 0.1, 0.06)
        h2, s2 = hue(np.clip(c, 0, 1))
        mg = (band(h2, 0.8, 0.14) * smooth(0.06, 0.18, s2))[..., None]   # the sea under an orange sky comes out magenta-lilac (its blue lit orange):
        lm = luma(np.clip(c, 0, 1))[..., None]                           # turned to a deep blue-teal of the same brightness, so it sets off the light
        c = mix(c, lm * np.array([0.42, 1.04, 1.62]), 0.78 * mg)
        c = contrast(c, 1.04)
        c = shoulder(c, 0.84)
    elif name == 'dusk':
        c = classic(c, 0.1, 0.08)
        h, s = hue(np.clip(c, 0, 1))
        l = luma(np.clip(c, 0, 1))[..., None]
        grey = smooth(0.15, 0.06, s)[..., None]   # near-neutral: road, stone, concrete
        vd = (band(h, 0.72, 0.12) * smooth(0.06, 0.14, s))[..., None] * smooth(0.36, 0.16, l)   # (WS3 fix round) dark violets: the asphalt lit by a violet sky
        k = 1 - 0.6 * np.maximum(grey, vd)      # the violet shade tint at 40% for them, so roads stay grey-blue tarmac under a pink sky, not violet paint
        c = c * mix(np.array([1.0, 1.0, 1.0]), np.array([1.03, 0.975, 1.02]), k)
        c = split(c, np.array([0.016, -0.008, 0.05]) * k, [0.04, 0.012, -0.006])   # violet shade, peach light
        lv = luma(np.clip(c, 0, 1))[..., None]
        slate = (lv * 1.45 + 0.03) * np.array([0.9, 0.95, 1.16])
        c = mix(c, slate, 0.7 * vd)             # those darks mostly slate: a grey-blue a shade lighter, the violet only a hint
        c = c + np.array([0.012, -0.006, 0.006]) * (4 * luma(np.clip(c, 0, 1)) * (1 - luma(np.clip(c, 0, 1))))[..., None] * k   # rose mid-tones
        c = contrast(c, 1.03, 0.4)
        c = shoulder(c, 0.84)
    elif name == 'night':
        c = classic(c, 0.1, 0.08)
        l = luma(np.clip(c, 0, 1))[..., None]
        c = mix(l, c, 0.86 + 0.24 * smooth(0.35, 0.8, l))   # the dim mid-tones calmer (night vision), the lamps still rich
        c = split(c, [-0.006, 0.008, 0.04], [0.03, 0.01, -0.02])
        c = c + np.array([0.0, 0.006, 0.018]) * (1 - smooth(0.0, 0.25, l))   # the blacks lifted to navy: still readable on a phone outdoors
        c = shoulder(c, 0.82)
    return np.clip(c, 0, 1)


def cube_grid():
    v = np.linspace(0, 1, N)
    b, g, r = np.meshgrid(v, v, v, indexing='ij')   # .cube order: red changes fastest, then green, then blue
    return np.stack([r, g, b], -1)


def main():
    os.makedirs(OUTD, exist_ok=True)
    grid = cube_grid()
    for name in MOODS:
        out = mood(grid.copy(), name)
        p = os.path.join(OUTD, name + '.cube')
        with open(p, 'w', newline='\n') as f:
            f.write('# 365 Coast Run mood LUT "%s" (tools/coastrun/make_luts.py, our own)\n' % name)
            f.write('TITLE "coastrun-%s"\nLUT_3D_SIZE %d\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n' % (name, N))
            for row in out.reshape(-1, 3):
                f.write('%.6f %.6f %.6f\n' % tuple(row))
        print(p)


if __name__ == '__main__':
    main()
