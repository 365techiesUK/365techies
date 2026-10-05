"""365 Coast Run's far panoramas: FLUX.1 [schnell] (Apache 2.0 - free commercial use) through the local ComfyUI on GPU 0
(127.0.0.1:8188). Owner, 5 Oct: the scenery "like OutRun's... revamped, much better quality" - the distant land round each
place painted properly (it was flat shapes in code). Our own briefs of the real Dorset places: no game, film or artist named
or imitated. The land is painted against a plain sky so the sky can be keyed out (the game draws its own sky and clouds).
One seamless 360-degree panorama per place: a first section, two more each painted on from the end of the last, then the gap
back to the start painted in (so there's no join anywhere round).
    py tools/coastrun/gen_backdrop.py [place[:takes] ...]   -> D:/claude/reels/coastrun-backdrops/<place>-<seed>-pano.png
Then: py tools/coastrun/make_backdrop.py <place> <pano.png>  -> games/coastrun/bg/<place>.webp
"""
import io, json, os, random, shutil, sys, time, urllib.request, uuid
from PIL import Image

API = "http://127.0.0.1:8188"
OUT = r"D:\claude\reels\coastrun-backdrops"
W, H, CTX = 2048, 512, 512
STYLE = ("Telephoto view from far away at ground level, a wide panorama of distant English countryside on the south coast of "
         "England, the horizon low in the picture, highly detailed, crisp, rich natural colours, clean light, beautiful matte "
         "painting for a racing game background. Gentle English landscape, no mountains, no people, no cars, no text, no road, "
         "nothing in the foreground.")
DAY = " Daylight. The sky is a solid flat uniform pure magenta colour, like a studio backdrop, with no clouds, no sun, no birds."
DUSK = " Evening light. The sky is a solid flat uniform pure magenta colour, like a studio backdrop, with no clouds, no sun, no birds."
NIGHT = " Night. The sky is a solid flat uniform pure magenta colour, like a studio backdrop, with no stars, no moon, no clouds."
BRIEFS = {
    "bournemouth": "Across a calm turquoise bay to the far shore: low golden sandy cliffs topped with dark pine trees, big cream Victorian seafront hotels and white apartment blocks, a long low pier on iron legs, a wide golden beach below the cliffs with rows of little colourful beach huts. Bright summer midday." + DAY,
    "sandbanks": "Across a sparkling harbour of moored white yachts to a low sandy spit lined with smart modern white houses and pine trees, the green Purbeck hills low on the far side. Bright summer midday." + DAY,
    "christchurch": "Across a reedy harbour with moored boats to the low green shore: red-brick and white houses among big trees, water meadows, a few sailing boats, low wooded hills behind. Bright summer day." + DAY,
    "purbeck": "Rolling green chalk hills and a long ridge, patchwork fields with dark hedgerows, small woods, stone farmhouses, sheep. Bright summer day." + DAY,
    "swanage": "A long green chalk downland ridge falling to white chalk sea cliffs, fields of sheep, a small seaside town of grey stone houses around a bay. Bright summer day." + DAY,
    "forest": "Ancient forest and open heathland: great oaks and beech woods, gorse and purple heather, ponies grazing, gentle low ridges. Warm sunny afternoon." + DAY,
    "jurassic": "Grassy clifftop downs rolling down to pale limestone cliffs and coves on the sea, a long rugged coastline fading into the distance, golden low evening light from the side." + DUSK,
    "weymouth": "Across a broad calm bay to a long sandy beach and a row of elegant cream, pink and pale blue Georgian seafront terraces, a long flat-topped island hill on the far side of the water. Hazy summer afternoon." + DAY,
    "harbour": "A large natural harbour at night: the lights of a town and quayside along the water, warehouses, cranes, moored boats with lights, reflections on the dark water, low hills dotted with house lights behind." + NIGHT,
    "lymington": "Across saltmarsh and a marina with hundreds of white yacht masts to the low wooded shore of an island across the water, a little Georgian town on a hill, warm peach evening light." + DUSK,
    "lyme": "Steep green and grey crumbling sea cliffs, a little old town of colourful houses climbing a valley to the sea, hills behind, soft pink sunset light." + DUSK,
    "portland": "A rugged limestone island seen across the water at dusk: grey quarried cliffs, stone cottages, a long flat-topped hill, cool purple evening light." + DUSK,
    "goldencap": "A dramatic coast of high rounded sea cliffs with golden sandstone tops and grey clay slopes, green fields and hedgerows running up to them, warm golden sunset light." + DUSK,
    "hengistbury": "Twilight over a low heath-covered headland and a wide harbour, the lights of a seaside town across the dark water, faint pink glow low on the horizon." + NIGHT,
    "needles": "White chalk cliffs and green chalk downs rising from the sea, soft pink sunset light on the chalk, the calm sea below." + DUSK,
}

HERO = {   # each place's landmark, painted large in the middle of the first section (1/6 of the way round: world3d.js keeps it ahead)
    "bournemouth": "a long Victorian pier on slender iron legs reaching far out into the bay, a white domed pavilion at its end",
    "sandbanks": "a small wooded island in the harbour with a little castellated stone castle among tall pine trees at its water's edge",
    "christchurch": "a great old grey stone priory church with a very tall square tower with battlements, rising above the trees",
    "purbeck": "a ruined grey stone castle with a tall broken keep on top of a steep conical green hill, in a gap in the chalk ridge",
    "swanage": "tall white chalk sea stacks standing in the turquoise sea just off the end of a white chalk headland",
    "forest": "a huge ancient spreading oak tree standing alone on the open heath, wild ponies grazing beneath it",
    "jurassic": "a great natural limestone rock arch standing in the sea at the end of a long rocky ridge, a curving cove of pale shingle beside it",
    "weymouth": "a long flat-topped rocky island across the bay, joined to the land by a long curving shingle bank",
    "harbour": "a huge white cross-channel ferry, all its decks lit, moored at the quay beside tall cranes",
    "lymington": "a marina packed with hundreds of white yacht masts in front of a little Georgian town on a hill with a church tower",
    "lyme": "a long curving old stone harbour wall sheltering little fishing boats, the town's colourful houses behind",
    "portland": "a tall red and white striped lighthouse on the rocky tip of the island, a white stone obelisk beside it",
    "goldencap": "the tallest cliff on the coast, a huge rounded sea cliff with a glowing golden sandstone top and a flat green summit",
    "needles": "a row of three tall jagged white chalk sea stacks running out to sea in a line from the white cliffs, a red and white striped lighthouse at the end of the row",
}

def call(path, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None, headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=60))

def upload(img):   # a PNG (transparent where it's to be painted) into ComfyUI's input folder
    b = io.BytesIO(); img.save(b, "PNG"); name = "cr-" + uuid.uuid4().hex[:10] + ".png"; bd = "----crbg" + uuid.uuid4().hex
    body = ("--%s\r\nContent-Disposition: form-data; name=\"image\"; filename=\"%s\"\r\nContent-Type: image/png\r\n\r\n" % (bd, name)).encode() + b.getvalue() + ("\r\n--%s\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n--%s--\r\n" % (bd, bd)).encode()
    req = urllib.request.Request(API + "/upload/image", data=body, headers={"Content-Type": "multipart/form-data; boundary=" + bd})
    return json.load(urllib.request.urlopen(req, timeout=60))["name"]

def graph(text, seed, prefix, src=None):
    g = {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "flux1-schnell-fp8.safetensors"}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["1", 1], "text": text}},
        "3": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["2", 0]}},
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "SaveImage", "inputs": {"images": ["6", 0], "filename_prefix": prefix}},
    }
    if src is None:
        g["4"] = {"class_type": "EmptySD3LatentImage", "inputs": {"width": W, "height": H, "batch_size": 1}}
        g["5"] = {"class_type": "KSampler", "inputs": {"model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["4", 0], "seed": seed, "steps": 4, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1}}
    else:   # painted on from what's already there: the transparent part only
        g["8"] = {"class_type": "LoadImage", "inputs": {"image": src}}
        g["9"] = {"class_type": "InpaintModelConditioning", "inputs": {"positive": ["2", 0], "negative": ["3", 0], "vae": ["1", 2], "pixels": ["8", 0], "mask": ["8", 1], "noise_mask": True}}
        g["5"] = {"class_type": "KSampler", "inputs": {"model": ["1", 0], "positive": ["9", 0], "negative": ["9", 1], "latent_image": ["9", 2], "seed": seed, "steps": 4, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1}}
    return g

def render(text, seed, prefix, src=None):
    pid = call("/prompt", {"prompt": graph(text, seed, prefix, src)})["prompt_id"]; t0 = time.time()
    while True:
        time.sleep(1.5); hist = call("/history/" + pid)
        if pid in hist:
            st = hist[pid].get("status", {})
            if st.get("status_str") == "error": raise SystemExit("ComfyUI error: " + json.dumps(st.get("messages", []))[:1500])
            for node in hist[pid]["outputs"].values():
                for a in node.get("images", []): return Image.open(os.path.join("D:/ComfyUI/output", a.get("subfolder", ""), a["filename"])).convert("RGB")
        if time.time() - t0 > 600: raise SystemExit("timed out")

FEATHER = 160   # the last stretch of what's known is painted over again too, fading in, so the new part grows out of it with no step
def known(left, right=None):   # a canvas: what we have at the ends, transparent in between
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0)); L = left.convert("RGBA")
    al = L.getchannel("A"); px = al.load()
    for x in range(L.width - FEATHER, L.width):
        v = int(255 * (L.width - x) / FEATHER)
        for y in range(H): px[x, y] = v
    L.putalpha(al); c.paste(L, (0, 0))
    if right is not None:
        Rr = right.convert("RGBA"); al = Rr.getchannel("A"); px = al.load()
        for x in range(FEATHER):
            v = int(255 * x / FEATHER)
            for y in range(H): px[x, y] = v
        Rr.putalpha(al); c.paste(Rr, (W - Rr.width, 0))
    return upload(c)

def pano(place, seed):
    t0 = time.time(); text = BRIEFS[place] + " " + STYLE; pre = "coastrun-bg/%s-%d" % (place, seed)
    a = render(BRIEFS[place] + (" In the middle of the picture, large and clearly visible: " + HERO[place] + "." if place in HERO else "") + " " + STYLE, seed, pre)
    b = render(text, seed + 1, pre, known(a.crop((W - CTX, 0, W, H))))
    c = render(text, seed + 2, pre, known(b.crop((W - CTX, 0, W, H))))
    d = render(text, seed + 3, pre, known(c.crop((W - CTX, 0, W, H)), a.crop((0, 0, CTX, H))))   # the gap back to the start
    import numpy as np
    A, B, C, D = (np.asarray(x).astype(np.float32) for x in (a, b, c, d)); F = FEATHER; r = np.linspace(0, 1, F)[None, :, None]
    def add(P, nxt):   # the next section joined on, the repainted stretch crossfaded over the end of what's there
        P[:, -F:] = P[:, -F:] * (1 - r) + nxt[:, :F] * r; return np.concatenate([P, nxt[:, F:]], 1)
    P = add(A.copy(), B[:, CTX - F:]); P = add(P, C[:, CTX - F:]); P = add(P, D[:, CTX - F:W - CTX + F])
    tail = P[:, -F:].copy(); P = P[:, :-F]; P[:, :F] = tail * (1 - r) + P[:, :F] * r   # round the back to the start
    P = Image.fromarray(np.clip(P, 0, 255).astype(np.uint8))
    os.makedirs(OUT, exist_ok=True); dst = os.path.join(OUT, "%s-%d-pano.png" % (place, seed)); P.save(dst)
    print("%-12s seed %-10d %3.0f s  %dx%d -> %s" % (place, seed, time.time() - t0, P.width, P.height, dst), flush=True)
    return dst

if __name__ == "__main__":
    for j in sys.argv[1:] or list(BRIEFS):
        place, _, n = j.partition(":")
        for _ in range(int(n or 1)): pano(place, random.randint(1, 2**30))
