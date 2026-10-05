"""365 Coast Run's music: ACE-Step 1.5 XL (SFT, Apache 2.0 - free commercial use) through the local ComfyUI on GPU 0
(127.0.0.1:8188), with the same settings as Star Run (tools/starrun/gen_music.py) and the fuel-prices advert. Owner, 5 Oct:
"beachy sort of music if we're on the beach" - a track for each place, changing at the checkpoints. Instrumentals only, our
own briefs: no film, composer, band or game is named or imitated. The owner picks the takes by ear; the chosen ones are cut
to 128 kbps for the game (games/coastrun/music/).
    py tools/coastrun/gen_music.py [name[:takes] ...]   -> D:/claude/reels/coastrun-music/<name>-<seed>.mp3
"""
import json, os, random, shutil, sys, time, urllib.request

API = "http://127.0.0.1:8188"
OUT = r"D:\claude\reels\coastrun-music"

BRIEFS = {
    "title": dict(bpm=112, key="F major", dur=60, tags=(
        "Bright feel-good summer driving theme for a seaside road trip. Funky clean electric guitar chords, a slap bass groove, "
        "warm electric piano, shimmering synth brass hits and a catchy soaring saxophone-like synth lead melody over crisp "
        "drums. Sunny, carefree and joyful, a polished retro-modern arcade road music feel. Instrumental.")),
    "bournemouth": dict(bpm=124, key="E major", dur=64, tags=(
        "Upbeat sunny beach driving music. Bright funky clean guitar, bouncy slap bass, steel drums and marimba accents, "
        "sparkling synth pads and a memorable whistle-like lead melody, tight upbeat drums with hand claps. Seaside summer "
        "holiday, sand, sea and palm trees, top down in the sunshine. Happy and energetic. Instrumental, steady groove, loopable.")),
    "purbeck": dict(bpm=132, key="A major", dur=64, tags=(
        "Driving rock fusion for racing through green rolling hills. A soaring melodic lead electric guitar, punchy bass, "
        "Hammond organ stabs, bright synth brass and energetic rock drums. Open countryside, wind in your hair, exciting and "
        "uplifting. Instrumental, steady energy all the way, loopable.")),
    "forest": dict(bpm=110, key="D major", dur=64, tags=(
        "Warm mellow groove for an autumn forest drive. Acoustic and clean electric guitars, a round funky bass, soft Rhodes "
        "electric piano, gentle flute-like synth melody and laid-back drums with shakers. Golden leaves, sunlight through trees, "
        "relaxed but moving. Instrumental, loopable.")),
    "jurassic": dict(bpm=118, key="Bb major", dur=64, tags=(
        "Smooth jazz funk for a golden sunset drive along white cliffs above the sea. Silky saxophone lead melody, warm "
        "electric piano chords, fretless bass, lush strings pad and a smooth groove with brushed hi-hats. Romantic, glowing, "
        "summer evening. Instrumental, loopable.")),
    "harbour": dict(bpm=116, key="C minor", dur=64, tags=(
        "Night-time city pop synthwave for driving along a harbour of lights. Pulsing analogue synth bass, gated reverb drums, "
        "glassy electric piano, warm pads and a catchy bright synth lead. Neon reflections on the water, cool and stylish, "
        "midnight drive. Instrumental, loopable.")),
    "needles": dict(bpm=104, key="G major", dur=64, tags=(
        "Dreamy dawn chillwave for a sunrise coastal drive. Airy shimmering pads, soft plucked synth arpeggios, a gentle "
        "melodic lead, warm sub bass and a relaxed steady beat. Pink sky, calm sea, peaceful and hopeful. Instrumental, loopable.")),
    "goal": dict(bpm=124, key="E major", dur=16, tags=(
        "Short triumphant celebration jingle for finishing a road race. Bright brass fanfare, funky guitar and drum fill, "
        "a big happy final chord with cymbal crash. Instrumental.")),
    "timeup": dict(bpm=96, key="E minor", dur=10, tags=(
        "Short game over sting, descending synth brass and a slowing drum fill, ending softly. Instrumental.")),
}
LYRICS = "[Intro]\n[Instrumental]\n\n[Verse]\n[Instrumental]\n\n[Chorus]\n[Instrumental]\n\n[Outro]\n[Instrumental]"
LOOP_LYRICS = "[Verse]\n[Instrumental]\n\n[Chorus]\n[Instrumental]\n\n[Verse]\n[Instrumental]\n\n[Chorus]\n[Instrumental]"

def call(path, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None, headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=60))

def workflow(name, b, seed, prefix):
    lyr = LYRICS if name in ("goal", "timeup") else LOOP_LYRICS
    return {
        "104": {"class_type": "UNETLoader", "inputs": {"unet_name": "acestep_v1.5_xl_sft_bf16.safetensors", "weight_dtype": "default"}},
        "78": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["104", 0], "shift": 3}},
        "105": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "qwen_0.6b_ace15.safetensors", "clip_name2": "qwen_1.7b_ace15.safetensors", "type": "ace", "device": "default"}},
        "106": {"class_type": "VAELoader", "inputs": {"vae_name": "ace_1.5_vae.safetensors"}},
        "94": {"class_type": "TextEncodeAceStepAudio1.5", "inputs": {
            "clip": ["105", 0], "tags": b["tags"], "lyrics": lyr, "seed": seed, "bpm": b["bpm"], "duration": float(b["dur"]),
            "timesignature": "4", "language": "en", "keyscale": b["key"], "generate_audio_codes": True,
            "cfg_scale": 2.0, "temperature": 0.85, "top_p": 0.9, "top_k": 0, "min_p": 0.0}},
        "47": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["94", 0]}},
        "98": {"class_type": "EmptyAceStep1.5LatentAudio", "inputs": {"seconds": float(b["dur"]), "batch_size": 1}},
        "3": {"class_type": "KSampler", "inputs": {"model": ["78", 0], "positive": ["94", 0], "negative": ["47", 0], "latent_image": ["98", 0],
                                                   "seed": seed, "steps": 50, "cfg": 7, "sampler_name": "euler", "scheduler": "simple", "denoise": 1}},
        "18": {"class_type": "VAEDecodeAudio", "inputs": {"samples": ["3", 0], "vae": ["106", 0]}},
        "107": {"class_type": "SaveAudioMP3", "inputs": {"audio": ["18", 0], "filename_prefix": prefix, "quality": "V0"}},
    }

def run(name, seed):
    pid = call("/prompt", {"prompt": workflow(name, BRIEFS[name], seed, "coastrun/%s-%d" % (name, seed))})["prompt_id"]
    t0 = time.time()
    while True:
        time.sleep(2)
        h = call("/history/" + pid)
        if pid in h:
            st = h[pid].get("status", {})
            if st.get("status_str") == "error":
                raise SystemExit("ComfyUI error: " + json.dumps(st.get("messages", []))[:1500])
            for node in h[pid]["outputs"].values():
                for a in node.get("audio", []):
                    src = os.path.join("D:/ComfyUI/output", a.get("subfolder", ""), a["filename"])
                    os.makedirs(OUT, exist_ok=True)
                    dst = os.path.join(OUT, "%s-%d.mp3" % (name, seed))
                    shutil.copyfile(src, dst)
                    print("%-8s seed %-10d %3.0f s  -> %s" % (name, seed, time.time() - t0, dst), flush=True)
                    return dst
        if time.time() - t0 > 900: raise SystemExit("timed out")

jobs = sys.argv[1:] or ["bournemouth:2", "title:2", "purbeck:2", "forest:2", "jurassic:2", "harbour:2", "needles:2", "goal:2", "timeup:2"]
for j in jobs:
    name, _, n = j.partition(":")
    for _ in range(int(n or 1)):
        run(name, random.randint(1, 2**31))
print("done", flush=True)
