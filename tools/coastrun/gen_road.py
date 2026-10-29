"""365 Coast Run's asphalt (revamp WS2, 22 Oct 2026): our own texture, worked out with seeded numpy - no photograph, no library art.
The road is drawn in the road's own space: across = the road's full width (14 m, both edge zones), along = 14 m, repeating along the
road and mirrored at its sides (the new look runs the asphalt out over the plain verge strip, and the mirror carries the edge on).
    py tools/coastrun/gen_road.py   -> games/coastrun/tex/road-1024.webp (desktop) and road-512.webp (phones: its own mix, make(phone=True))

One grey picture: the asphalt's colour - dark binder, lighter stones, cracks, sealed repairs, the polished tyre tracks and the oily
strip down each lane, a dusty crumbling edge outside the edge lines. It doubles as the surface's height (the stones are the light and
proud bits, the cracks the dark deep ones): on the bigger screens world3d.js works a fine bumpy surface out of it, and its shine
(roughness) from it and from where the tyre tracks run. (A height of its own in the alpha cost 300 KB more: noise doesn't squeeze.)
The lane lines and edge lines are not in it: the shader paints them in exactly today's places (hazard dashes, double lines, worn paint).
Lanes: centres at 1/6, 1/2, 5/6 of the width; the tyres' tracks either side of each (0.09, 0.25, 0.41, 0.59, 0.75, 0.91), as the old
canvas had them, so the darker tracks sit where the traffic runs.
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUTD = os.path.join(HERE, '..', '..', 'games', 'coastrun', 'tex')
N = 1024                      # pixels across (and along): 14 m each way, 13.7 mm a pixel
M_PER = 14.0 / N
TRACKS = [0.09, 0.25, 0.41, 0.59, 0.75, 0.91]
LANES = [1 / 6, 1 / 2, 5 / 6]


def spectral(rng, n, m, fmin, fmax, beta, aniso=(1.0, 1.0)):
    """Noise that repeats exactly over the picture (made in frequency space): features between fmin and fmax cycles a picture,
    stronger at the low end by f^-beta; aniso stretches it (along, across) - (3, 1) makes streaks along the road. Mean 0, sd 1."""
    ky = np.fft.fftfreq(n)[:, None] * n / aniso[0]
    kx = np.fft.rfftfreq(m)[None, :] * m / aniso[1]
    k = np.hypot(kx, ky)
    amp = np.where((k >= fmin) & (k <= fmax), (k + 1e-6) ** (-beta), 0.0)
    ph = rng.standard_normal(k.shape) + 1j * rng.standard_normal(k.shape)
    f = np.fft.irfft2(amp * ph, s=(n, m))
    return (f - f.mean()) / (f.std() + 1e-9)


def blur(a, px):
    """A soft blur that wraps round the picture's edges (so it still repeats)."""
    if px <= 0: return a
    n, m = a.shape
    ky = np.fft.fftfreq(n)[:, None]; kx = np.fft.rfftfreq(m)[None, :]
    g = np.exp(-2 * (np.pi * px) ** 2 * (kx ** 2 + ky ** 2))
    return np.fft.irfft2(np.fft.rfft2(a) * g, s=(n, m))


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def stroke(canvas, pts, width, strength, wrap_v=True):
    """A soft line through pts (x across, y along, in pixels) added into canvas: each pixel near a segment gets strength by its
    distance (a gaussian across the line); along the road it wraps, so a crack running off the end comes back at the start."""
    n, m = canvas.shape
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        lo_x, hi_x = int(min(x0, x1) - 3 * width - 2), int(max(x0, x1) + 3 * width + 2)
        lo_y, hi_y = int(min(y0, y1) - 3 * width - 2), int(max(y0, y1) + 3 * width + 2)
        ys = np.arange(lo_y, hi_y + 1); xs = np.arange(max(0, lo_x), min(m - 1, hi_x) + 1)
        if not len(xs): continue
        Y, X = np.meshgrid(ys, xs, indexing='ij')
        dx, dy = x1 - x0, y1 - y0; L2 = dx * dx + dy * dy + 1e-9
        t = np.clip(((X - x0) * dx + (Y - y0) * dy) / L2, 0, 1)
        d = np.hypot(X - (x0 + t * dx), Y - (y0 + t * dy))
        v = strength * np.exp(-(d / max(0.35, width)) ** 2)
        yy = ys % n if wrap_v else np.clip(ys, 0, n - 1)
        for j, row in enumerate(yy):
            canvas[row, xs] = np.maximum(canvas[row, xs], v[j])


def crack(rng, start, heading, steps, step_px, wander):
    """A crack's path: a wandering walk (its heading drifts, with the odd sharp kink)."""
    x, y = start; a = heading; pts = [(x, y)]
    for _ in range(steps):
        a += rng.normal(0, wander) + (rng.normal(0, 0.6) if rng.random() < 0.08 else 0)
        x += np.sin(a) * step_px; y += np.cos(a) * step_px
        pts.append((x, y))
    return pts


def make(seed=365, phone=False):
    """phone: the 512 picture's own mix (WS2 fix round) - drawn without the fine bumps, its metre-wide swells and the blotchy oily strips
    read as blue water stains, so the swells are halved and the oily strip runs on evenly, darker and duller. The dice are thrown the same
    either way, so the desktop picture is unchanged."""
    rng = np.random.default_rng(seed)
    u = (np.arange(N) + 0.5) / N
    U = np.broadcast_to(u[None, :], (N, N))

    # ---- the aggregate: stones in dark binder. A chip is 6-14 mm (about a pixel), so most of it is fine grain; a scatter of bigger
    # stones (2-4 cm) reads at the chase camera's distance
    fine = spectral(rng, N, N, 120, 512, 0.0)                   # chip-sized grain
    mid = spectral(rng, N, N, 30, 160, 0.6)                     # clusters of chips
    stones = (fine * 0.6 + mid * 0.6)
    stone_mask = smooth(0.2, 1.6, stones)                       # where a stone shows at the surface
    big = np.zeros((N, N))
    for _ in range(3500):                                       # the larger stones: little rounded blobs, each its own shade
        cx, cy, r = rng.random() * N, rng.random() * N, 0.8 + rng.random() ** 2 * 1.8
        xs = np.arange(int(cx - r - 1), int(cx + r + 2)); ys = np.arange(int(cy - r - 1), int(cy + r + 2))
        X, Y = np.meshgrid(xs, ys); d = np.hypot((X - cx) / (r * (0.8 + 0.4 * rng.random())), (Y - cy) / r)
        v = np.clip(1.15 - d, 0, 1) * (0.5 + 0.5 * rng.random())
        big[Y % N, X % N] = np.maximum(big[Y % N, X % N], v)
    big_mask = np.clip(big * 1.6, 0, 1)

    alb = 0.42 + 0.10 * stone_mask + 0.025 * fine + 0.13 * big_mask * (0.6 + 0.4 * spectral(rng, N, N, 200, 512, 0.0).clip(-1, 1))

    # ---- the surface's own variation over a metre or three (the shader adds the long-range age and repairs in world space)
    macro = spectral(rng, N, N, 2, 14, 1.2)
    alb += (0.0175 if phone else 0.035) * macro
    streak = spectral(rng, N, N, 3, 40, 1.0, aniso=(4.0, 1.0))  # the paver's streaks, along the road
    alb += 0.018 * streak

    # ---- the tyres' tracks: polished smooth and darker (rubber), the oily strip down the middle of each lane
    wob = blur(spectral(rng, N, N, 1, 8, 1.0), 6) * 0.004       # (the tracks wander a little)
    track = np.zeros((N, N))
    for c in TRACKS:
        d = np.abs(U - c - wob) * 14.0                          # metres from the track's middle
        track = np.maximum(track, np.exp(-(d / 0.26) ** 2))
    track *= 0.75 + 0.25 * smooth(-1, 1, spectral(rng, N, N, 2, 12, 1.0))
    oil = np.zeros((N, N))
    for c in LANES:
        d = np.abs(U - c - wob * 1.5) * 14.0
        oil = np.maximum(oil, np.exp(-(d / 0.42) ** 2))
    patchy = smooth(-0.6, 1.2, spectral(rng, N, N, 3, 30, 0.8, aniso=(2.5, 1.0)))
    oil *= 0.75 + 0.25 * patchy if phone else patchy
    alb = alb * (1 - 0.13 * track) - (0.03 if phone else 0.035) * oil

    # ---- the edge zones: outside the edge lines (the outer 0.9 m each side) the surface is older, dusty and breaking up
    edge = np.maximum(smooth(0.065, 0.01, U), smooth(0.935, 0.99, U))
    dust = smooth(-0.5, 1.5, spectral(rng, N, N, 6, 90, 0.7))
    alb += edge * (0.07 * dust + 0.04)
    loose = (spectral(rng, N, N, 150, 512, 0.0) > 1.2).astype(float) * edge
    alb += 0.12 * loose

    # ---- cracks: long ones down the edges and between the tracks, a few across, and one patch of crazing in a wheel track
    cr = np.zeros((N, N))
    for x0 in [0.035, 0.33, 0.67, 0.962]:
        p = crack(rng, (x0 * N + rng.normal(0, 6), rng.random() * N), rng.normal(0, 0.1), 35 + int(rng.random() * 55), 5.0, 0.14)
        stroke(cr, p, 0.6 + rng.random() * 0.4, 0.75 + 0.2 * rng.random())
        for q in range(len(p) // 20):                           # the hair cracks off it
            k = int(rng.random() * len(p))
            stroke(cr, crack(rng, p[k], np.pi / 2 * (1 if rng.random() < 0.5 else -1) + rng.normal(0, 0.4), 3 + int(rng.random() * 6), 4.0, 0.3), 0.45, 0.45)
    for _ in range(3):                                          # across the road (a cold winter's)
        x0 = rng.random() * 0.4 + (0.05 if rng.random() < 0.5 else 0.55)
        stroke(cr, crack(rng, (x0 * N, rng.random() * N), np.pi / 2 + rng.normal(0, 0.15), 12 + int(rng.random() * 20), 6.0, 0.15), 0.6, 0.8)
    # crazing: a cell pattern of fine cracks over about 2 m of the left lane's outer track
    cx, cy = 0.09 * N, 0.62 * N
    seeds = np.stack([cx + rng.normal(0, 38, 60), cy + rng.normal(0, 70, 60)], 1)
    ys = np.arange(int(cy - 190), int(cy + 190)); xs = np.arange(int(cx - 80), int(cx + 80))
    X, Y = np.meshgrid(xs, ys)
    d = np.sort(np.hypot(X[..., None] - seeds[:, 0], Y[..., None] - seeds[:, 1]), axis=2)
    lines = np.exp(-((d[..., 1] - d[..., 0]) / 0.9) ** 2) * smooth(160, 40, np.hypot((X - cx) * 1.8, Y - cy))
    craze = np.zeros((N, N)); craze[ys[:, None] % N, np.clip(xs, 0, N - 1)[None, :]] = lines * 0.7
    cr = np.maximum(cr, craze)
    cr = np.maximum(cr, blur(cr, 1.2) * 0.6)                    # (a little spall round each)
    alb = alb * (1 - 0.62 * cr)

    # ---- repairs: a trench reinstated across the left lane, a square patch in the right lane - newer, darker, finer, a sealed seam round each
    seam = np.zeros((N, N)); inside = np.zeros((N, N))
    for (x0, x1, y0, y1) in [(0.035, 0.36, 0.18, 0.27), (0.70, 0.86, 0.71, 0.80)]:
        X0, X1, Y0, Y1 = x0 * N, x1 * N, y0 * N, y1 * N
        Xg, Yg = np.meshgrid(np.arange(N), np.arange(N))
        dx = np.minimum(Xg - X0, X1 - Xg); dy = np.minimum(Yg - Y0, Y1 - Yg)
        ragged = 2.5 * blur(spectral(rng, N, N, 20, 120, 0.5), 1.0)   # (a hand-cut edge, not a ruler's)
        ins = smooth(-1.0, 1.0, np.minimum(dx, dy) + ragged)
        inside = np.maximum(inside, ins)
        seam = np.maximum(seam, np.exp(-((np.minimum(dx, dy) + ragged) / 1.8) ** 2) * (np.minimum(dx, dy) + ragged > -4))
    fine2 = spectral(rng, N, N, 200, 512, 0.0)
    alb = alb * (1 - inside) + inside * (0.385 + 0.035 * fine2 + (0.015 if phone else 0.03) * macro)
    alb = alb * (1 - 0.32 * seam)

    # ---- the joints where the lanes were laid side by side (under the lane lines; they show in the gaps between the dashes)
    for c in [1 / 3, 2 / 3]:
        j = np.exp(-((U - c) * N / 0.9) ** 2)
        alb *= 1 - 0.18 * j

    return np.clip(alb, 0.02, 0.98)


def save(alb, size, q):
    img = Image.fromarray((alb * 255 + 0.5).astype(np.uint8), 'L')
    if size != N: img = img.resize((size, size), Image.LANCZOS)
    p = os.path.join(OUTD, 'road-%d.webp' % size)
    img.save(p, 'WEBP', quality=q, method=6)
    back = np.asarray(Image.open(p).convert('L')).astype(np.float32)
    print('road-%d.webp' % size, os.path.getsize(p) // 1024, 'KB', 'mean error %.1f (of 255)' % np.abs(back - np.asarray(img).astype(np.float32)).mean(), flush=True)
    return p


if __name__ == '__main__':
    os.makedirs(OUTD, exist_ok=True)
    save(make(), 1024, 60)
    save(make(phone=True), 512, 70)
