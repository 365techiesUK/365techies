"""365 Coast Run's clouds: big fair-weather cumulus painted by FLUX.1 [schnell] (Apache 2.0) through the local ComfyUI (GPU 0),
each on black so the cloud keys out cleanly; the game tints them for each place's light.
    py tools/coastrun/gen_clouds.py [which ...]   -> games/coastrun/bg/cloud<i>.webp (all six by default)
"""
import os, random, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import gen_backdrop as G

TEXT = ("A single huge towering fluffy white cumulus cloud, isolated in the middle of the picture with space all round it, bright "
        "sunlit billowing tops, soft grey flat underside, photographic, crisp detail, on a solid flat pure black background, "
        "nothing else in the picture.")
OUTD = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'games', 'coastrun', 'bg')
G.W, G.H = 1024, 512
which = [int(x) for x in sys.argv[1:]] or list(range(1, 7))
for i in [w - 1 for w in which]:
    for tries in range(8):   # again if the black isn't black, or the cloud runs off the picture
        img = G.render(TEXT, random.randint(1, 2**30), 'coastrun-bg/cloud')
        a = np.asarray(img).astype(np.float32) / 255; lum = a.max(2)
        border = np.concatenate([lum[:6].ravel(), lum[-6:].ravel(), lum[:, :6].ravel(), lum[:, -6:].ravel()])
        if np.median(border) < 0.05 and (lum[:10] > 0.3).mean() < 0.01 and (lum[:, :10] > 0.3).mean() < 0.01 and (lum[:, -10:] > 0.3).mean() < 0.01: break
    lum = a.max(2); al = np.clip((lum - 0.06) / 0.5, 0, 1) ** 0.9   # how much cloud: from the brightness over the black
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]   # (and nothing at the very edges)
    edge = np.minimum.reduce([xx, a.shape[1] - 1 - xx, yy, a.shape[0] - 1 - yy]).astype(np.float32); al *= np.clip(edge / 24, 0, 1)
    col = np.clip(a / np.maximum(al[..., None], 1e-3), 0, 1)   # the colour of the cloud itself (unmixed from the black)
    out = Image.fromarray((np.dstack([col, al]) * 255).astype(np.uint8), 'RGBA')
    out.save(os.path.join(OUTD, 'cloud%d.webp' % (i + 1)), 'WEBP', quality=88, method=6)
    prev = Image.new('RGBA', out.size, (90, 150, 220, 255)); prev.alpha_composite(out); prev.convert('RGB').save(os.path.join(r'D:\claude\reels\coastrun-backdrops', 'cloud%d-preview.png' % (i + 1)))
    print('cloud', i + 1, os.path.getsize(os.path.join(OUTD, 'cloud%d.webp' % (i + 1))) // 1024, 'KB', flush=True)
