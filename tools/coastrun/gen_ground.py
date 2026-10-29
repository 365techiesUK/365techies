"""365 Coast Run's ground detail (revamp WS2, 22 Oct 2026): our own texture, worked out with seeded numpy, for the land's shader in
world3d.js. Two things in one picture, each read at its own scale:
  red, green, blue = one field, corner to corner - the shader lays it into each field of the patchwork (88 x 64 m, turned and
          mirrored field by field):  red   = the mower's stripes running one way, blue = the other way (a lawn-striped meadow);
                                     green = the field's own lusher and thinner patches, a worn gateway in one corner, and the
                                             darker, rougher grass along its hedges (the hedge bases);
  alpha = a fine grain of grass blades and soil, repeating every 4.5 m (as the old painted grain did), for the land near the road.
    py tools/coastrun/gen_ground.py   -> games/coastrun/tex/ground-512.webp (desktop) and ground-256.webp (phones)
"""
import os
import numpy as np
from PIL import Image
from gen_road import spectral, blur, smooth, OUTD

N = 512


def field(rng):
    v, u = np.mgrid[0:N, 0:N].astype(np.float64)
    u = (u + 0.5) / N; v = (v + 0.5) / N
    # the mower's stripes: 30 one way (2.9 m each), 22 the other, each a soft-edged band, the line wandering a little as a mower's does
    wob_u = blur(spectral(rng, N, N, 1, 4, 1.4), 6) * 0.0018; wob_v = blur(spectral(rng, N, N, 1, 4, 1.4), 6) * 0.0022
    su = 0.5 + 0.5 * np.tanh(3.2 * np.sin((u + wob_u) * 30 * np.pi))
    sv = 0.5 + 0.5 * np.tanh(3.2 * np.sin((v + wob_v) * 22 * np.pi))
    head = smooth(0.0, 0.035, np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v)))   # (the headland round the edge, mown the other way)
    su = 0.5 + (su - 0.5) * head; sv = 0.5 + (sv - 0.5) * head
    # the field's own patches: lusher and thinner ground over 5-30 m
    g = 0.62 + 0.11 * spectral(rng, N, N, 2, 18, 1.1) + 0.04 * spectral(rng, N, N, 12, 60, 0.8)
    # the hedge bases: 2-6 m of darker, rougher grass along each side, its inner edge ragged
    edge_m = np.minimum(np.minimum(u, 1 - u) * 88, np.minimum(v, 1 - v) * 64)          # metres to the field's edge
    rag = np.clip(1.5 * spectral(rng, N, N, 6, 40, 0.9), -2.2, 3.0)
    base = smooth(4.5 + rag, 1.0, edge_m)
    g = g * (1 - 0.55 * base) + 0.1 * base * (0.5 + 0.5 * spectral(rng, N, N, 30, 120, 0.4))
    # a gateway in one corner: the grass worn to mud where the tractors turn in
    gate = np.exp(-(((u - 0.06) * 88) ** 2 + ((v - 0.0) * 64) ** 2) / 60.0) * smooth(-0.8, 1.0, spectral(rng, N, N, 8, 60, 0.6))
    g = g * (1 - 0.45 * gate) + 0.85 * 0.45 * gate
    return np.clip(su, 0, 1), np.clip(g, 0, 1), np.clip(sv, 0, 1)


def grain(rng):
    """Blades of grass and grains of soil, short strokes leaning every way: pale (it multiplies the land's own colour), repeating."""
    a = np.full((N, N), 0.86)
    a += 0.05 * spectral(rng, N, N, 8, 60, 0.6)
    for _ in range(9000):
        x, y = rng.random() * N, rng.random() * N
        L = 4 + rng.random() * 9; lean = (rng.random() - 0.5) * 0.9; l = 0.62 + rng.random() * 0.38
        for t in np.linspace(0, 1, int(L * 1.5)):
            px, py = int(x + lean * L * t) % N, int(y - L * t) % N
            a[py, px] = a[py, px] * 0.35 + l * 0.65
    a = blur(a, 0.45)
    a += 0.03 * spectral(rng, N, N, 120, 256, 0.0)
    return np.clip(a, 0, 1)


def save(rgb, a, size, q, qa):
    img = Image.fromarray((np.dstack(list(rgb) + [a]) * 255 + 0.5).astype(np.uint8), 'RGBA')
    if size != N: img = img.resize((size, size), Image.LANCZOS)
    p = os.path.join(OUTD, 'ground-%d.webp' % size)
    img.save(p, 'WEBP', quality=q, alpha_quality=qa, method=6)
    back = np.asarray(Image.open(p).convert('RGBA')).astype(np.float32); src = np.asarray(img).astype(np.float32)
    err = np.abs(back - src).mean(axis=(0, 1))
    print('ground-%d.webp' % size, os.path.getsize(p) // 1024, 'KB', 'mean error r %.1f g %.1f b %.1f a %.1f (of 255)' % tuple(err), flush=True)


if __name__ == '__main__':
    os.makedirs(OUTD, exist_ok=True)
    rng = np.random.default_rng(1365)
    rgb, a = field(rng), grain(rng)
    save(rgb, a, 512, 80, 45)
    save(rgb, a, 256, 85, 55)
