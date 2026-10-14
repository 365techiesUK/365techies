# -*- coding: utf-8 -*-
"""A turntable video of one machine -> its photos and a drag-to-turn 360 view (14 Oct 2026, the refurbished Dells online).

    py shop_spin.py latitude-5520-01 "D:/claude/shop-kit/intake/5520 a/DJI_0001.MP4"
    py shop_spin.py latitude-5520-01 video.mp4 --start 1.2 --period 29.4 --crop 0,60,3840,2160

Owner: "I've got it so I can put them on the turntable and video them, and then you get all the pictures". From ONE
video this makes, in images/shop/<id>/:
  spin_00.webp .. spin_35.webp  one full turn, a frame every 10 degrees, for the page's 360 view (1400 px wide)
  1.webp .. 5.webp              photos for the gallery and Google: front, front-left, side, back, other side (1600 px)

How long one turn takes is measured from the video itself: each moment is compared with the moments a little later,
and the delay at which the picture comes back to the same view is the turn (a full turn only - the start is the first
moment, so start the video with the front to camera, or give --start). Measured, not assumed: if the video holds less
than one clear turn it says so and stops. --period overrides the measurement; --crop takes a box from the full frame.
Frames are fresh pictures, so nothing from the camera (GPS, settings) goes with them. Then put the photo names it prints
in the machine's row in shop_stock.py; shop_pages.py finds the 360 frames by itself.
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image

FRAMES = 36
SPIN_W, SPIN_H = 1400, 787          # the same size as the Latitude 5520 spin on /dell-hardware/
PHOTO_W = 1600
STILLS = (0, 4, 9, 18, 27)          # front, 40 degrees, side, back, other side
ANALYSE_FPS = 10
ANALYSE_W = 96


def probe(video):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration",
                          "-of", "json", video], capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    st = j["streams"][0]
    return float(j["format"]["duration"]), int(st["width"]), int(st["height"])


def small_frames(video, w, h):
    """The whole video at ANALYSE_FPS, tiny and grey: enough to see when the view repeats."""
    sh = max(2, int(round(ANALYSE_W * h / w / 2)) * 2)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vf", "fps=%d,scale=%d:%d,format=gray" % (ANALYSE_FPS, ANALYSE_W, sh),
                          "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    n = len(raw) // (ANALYSE_W * sh)
    a = np.frombuffer(raw[: n * ANALYSE_W * sh], dtype=np.uint8).reshape(n, sh, ANALYSE_W).astype(np.float32)
    return a


def measure_period(frames, min_s=4.0):
    """Seconds for one full turn: the delay at which the picture best repeats itself (averaged over every start), or None.
    The first strong dip below the typical difference after min_s wins - a laptop looks much the same front and back at
    a glance, so the deepest dip is not trusted on its own."""
    n = len(frames)
    if n < ANALYSE_FPS * (min_s + 1):
        return None, None
    f = frames - frames.mean(axis=(1, 2), keepdims=True)
    lags = range(int(min_s * ANALYSE_FPS), n - ANALYSE_FPS)
    d = []
    for L in lags:
        diff = f[:-L] - f[L:]
        d.append(float(np.sqrt((diff ** 2).mean())))
    d = np.array(d)
    if len(d) < 3:
        return None, None
    typical = float(np.median(d))
    best = int(np.argmin(d))
    # the earliest local minimum that is nearly as good as the best one = one turn (the best may be two turns)
    for i in range(1, len(d) - 1):
        if d[i] <= d[i - 1] and d[i] <= d[i + 1] and d[i] <= d[best] * 1.15 and d[i] < typical * 0.6:
            best = i
            break
    quality = d[best] / typical if typical else 1.0
    if quality > 0.6:          # nothing repeats: no full turn in the video
        return None, quality
    return (best + lags.start) / ANALYSE_FPS, quality


def grab(video, t, path, size, crop):
    vf = []
    if crop:
        x, y, w, h = crop
        vf.append("crop=%d:%d:%d:%d" % (w, h, x, y))
    vf.append("scale=%d:%d:force_original_aspect_ratio=decrease" % size)
    tmp = path + ".png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "%.3f" % t, "-i", video, "-frames:v", "1", "-vf", ",".join(vf), tmp], check=True)
    with Image.open(tmp) as im:
        im = im.convert("RGB")
        if im.size != size and size[1] < 10000:
            bg = Image.new("RGB", size, (255, 255, 255))
            bg.paste(im, ((size[0] - im.width) // 2, (size[1] - im.height) // 2))
            im = bg
        im.save(path, "WEBP", quality=80, method=6)
    os.remove(tmp)


def make(unit_id, video, start=0.0, period=None, crop=None, base=None):
    base = base or os.path.dirname(os.path.abspath(__file__))
    dur, w, h = probe(video)
    if period is None:
        period, q = measure_period(small_frames(video, w, h))
        if period is None:
            raise SystemExit("*** no full turn found in %s (%.1f s long). Film at least one whole turn, or give --period. ***" % (video, dur))
        print("  one turn = %.1f s (match %.2f, lower is surer)" % (period, q))
    if start + period > dur + 0.05:
        raise SystemExit("*** the video is %.1f s; a turn of %.1f s from %.1f s doesn't fit ***" % (dur, period, start))
    out = os.path.join(base, "images", "shop", unit_id)
    os.makedirs(out, exist_ok=True)
    for k in range(FRAMES):
        grab(video, start + period * k / FRAMES, os.path.join(out, "spin_%02d.webp" % k), (SPIN_W, SPIN_H), crop)
    aspect = (crop[3] / crop[2]) if crop else (h / w)
    photo = (PHOTO_W, int(round(PHOTO_W * aspect)))
    names = []
    for n, k in enumerate(STILLS, 1):
        name = "%d.webp" % n
        grab(video, start + period * k / FRAMES, os.path.join(out, name), photo, crop)
        names.append(name)
    print("  images/shop/%s/: spin_00..spin_%02d (%dx%d) and %d photos (%dx%d)" % (unit_id, FRAMES - 1, SPIN_W, SPIN_H, len(names), photo[0], photo[1]))
    print('photos=[%s]' % ", ".join('"%s"' % x for x in names))
    return {"period": period, "photos": names}


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("unit_id")
    ap.add_argument("video")
    ap.add_argument("--start", type=float, default=0.0, help="seconds in where the front faces the camera")
    ap.add_argument("--period", type=float, help="seconds for one full turn (measured if left out)")
    ap.add_argument("--crop", help="x,y,w,h box from the full frame")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    make(a.unit_id, a.video, a.start, a.period, tuple(int(v) for v in a.crop.split(",")) if a.crop else None)
