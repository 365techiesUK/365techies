"""365 Coast Run (revamp WS3, 29 Oct 2026): packs the mood LUTs (.cube files, from make_luts.py or hand-tuned in an editor) into the
one picture the game reads, games/coastrun/lut/moods.png.

Layout: each mood is a strip 33*33 wide and 33 high - blue picks the 33-pixel slice (left to right), red runs across a slice and
green down it - and the moods are stacked top to bottom in MOODS order (day, warm, golden, dusk, night): 1089 x 165, 8-bit RGB,
no colour profile. world3d.js samples two neighbouring slices and mixes them (a 3D lookup from a 2D picture, as WebGL1-era
LUT passes did), and mixes two moods while one place fades into the next.

    py tools/coastrun/cube2png.py [--check]   (--check: reads the picture back and reports the worst 8-bit rounding)
"""
import os
import sys
import numpy as np
from PIL import Image
from make_luts import MOODS, OUTD, N

HERE = os.path.dirname(os.path.abspath(__file__))
PNG = os.path.normpath(os.path.join(HERE, '..', '..', 'games', 'coastrun', 'lut', 'moods.png'))


def read_cube(path):
    size, rows = None, []
    with open(path) as f:
        for line in f:
            s = line.strip()
            if not s or s.startswith('#'):
                continue
            if s.startswith('LUT_3D_SIZE'):
                size = int(s.split()[1]); continue
            if s[0].isalpha():
                continue
            rows.append([float(x) for x in s.split()[:3]])
    a = np.array(rows, dtype=np.float64)
    if size != N or a.shape[0] != N ** 3:
        raise SystemExit('%s: expected a %d-point cube, got size %s with %d rows' % (path, N, size, a.shape[0]))
    return a.reshape(N, N, N, 3)   # [blue][green][red] (red changes fastest in a .cube)


def main():
    img = np.zeros((N * len(MOODS), N * N, 3), dtype=np.float64)
    for m, name in enumerate(MOODS):
        cube = read_cube(os.path.join(OUTD, name + '.cube'))
        for b in range(N):
            img[m * N:(m + 1) * N, b * N:(b + 1) * N] = cube[b]   # rows: green, columns: red
    out = np.clip(np.round(img * 255), 0, 255).astype(np.uint8)
    os.makedirs(os.path.dirname(PNG), exist_ok=True)
    Image.fromarray(out, 'RGB').save(PNG, optimize=True)
    print(PNG, os.path.getsize(PNG), 'bytes')
    if '--check' in sys.argv:
        back = np.asarray(Image.open(PNG).convert('RGB'), dtype=np.float64) / 255
        print('worst rounding: %.4f (half a level is %.4f)' % (np.abs(back - img).max(), 0.5 / 255))


if __name__ == '__main__':
    main()
