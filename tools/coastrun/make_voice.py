"""365 Coast Run: your passenger's voice. Kokoro-82M (Apache 2.0) on this PC (it garbles bare exclamations like "Aaah!" or "Wheee!": real words only;
every line checked by transcribing it back with faster-whisper), the owner's chosen voice bf_lily (British).
Every line she says in the game: D:/claude/reels/coastrun-voice/<id>-<n>.wav, then cut to small mp3s for the game
(games/coastrun/voice/<id>-<n>.mp3: the silence trimmed off both ends, levelled to -16 LUFS, a few ms of fade in and out). The game picks
one of each id's takes at random.
    D:/claude/tools/kokoro/venv/Scripts/python.exe tools/coastrun/make_voice.py [ids...]           make (and cut) these lines (all if none)
    D:/claude/tools/kokoro/venv/Scripts/python.exe tools/coastrun/make_voice.py --encode [ids...]  only re-cut the mp3s from the wavs
    D:/claude/tools/kokoro/venv/Scripts/python.exe tools/coastrun/make_voice.py --phon [ids...]    only print the phonemes (check the names)
6 Oct 2026: every mp3 cut until now was SILENT after its first 10 ms - the filter chain ended "afade=t=out:st=0:d=0.01", a fade OUT that
started at 0 (the owner: "she's supposed to talk ... but she doesn't say anything"). Fade in at the start, out at the end, now.
Local names the phonemiser gets wrong are fixed through FIX (Bournemouth BORN-muth, Christchurch CRICE-church: the owner, 5 Oct).
"""
import os, subprocess, sys
import soundfile as sf

KOK = r"D:\claude\tools\kokoro"
RAW = r"D:\claude\reels\coastrun-voice"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "games", "coastrun", "voice")
VOICE, SPEED = "bf_lily", 1.06

LINES = {
    "go": ["Let's go!", "Here we go!"],
    "drift": ["Ooh, drift round the bends for me!", "Show me a drift!"],
    "near": ["Squeeze past the traffic!", "Get really close to those cars!"],
    "pass": ["Overtake those cars!", "Can you pass them all?"],
    "coins": ["Grab the coins!", "Ooh, collect those coins!"],
    "clean": ["Careful now, don't hit anything!", "Nice and smooth, okay?"],
    "speed": ["Faster! Faster!", "Put your foot down!"],
    "air": ["Make us fly over the hill!", "Ooh, jump the next hill!"],
    "slip": ["Tuck in behind a car!", "Follow that car, nice and close!"],
    "left": ["Go left! Let's go left!", "Left, please!"],
    "right": ["Go right! Let's go right!", "Right, please!"],
    "great": ["Wow, amazing!", "You're brilliant!", "That was so cool!"],
    "good": ["Nice one!", "Lovely!"],
    "fail": ["Oh well, never mind.", "So close!"],
    "yay": ["Thank you!", "Yes! That way!"],
    "aww": ["Oh. Okay.", "Oh, never mind."],
    "crash": ["Oh no!", "Careful!"],
    "bump": ["Watch out!", "Oh dear!"],
    "close": ["That was close!", "Phew, that was tight!"],
    "wow": ["Amazing!", "Ooh, nice drift!"],
    "wheee": ["We're flying!", "Up we go!"],
    "check": ["Yay, more time!", "Checkpoint!"],
    "goal": ["We made it!", "We did it! That was amazing!"],
    "hurry": ["Hurry! We're running out of time!"],
    "timeup": ["Oh no, we ran out of time."],
    # 6 Oct (owner: "maybe she can do more ... look at the OutRun game"): more of her
    "nitro": ["Whoa! Hold on!", "Here we go, hold tight!", "Ooh, that's quick!"],
    "spin": ["Ooh, smoky!", "Look at that smoke!"],
    "bye": ["Bye bye!", "See you later!", "Too slow!"],
    "chat": ["I love this road!", "Isn't the sea lovely today?", "This is the life!", "I could do this all day!", "What a day for it!"],
    "love": ["I love you!", "Best day ever!"],
    "sulk": ["Hmph. Fine.", "Oh, you're hopeless!"],
}
# what she says arriving at each place (the stage's key): she knows where she is
PLACES = {
    "winton": "Winton! Look at all the shops.", "charminster": "Charminster! I love the cafes here.", "kinson": "Kinson! Nearly out of town now.",
    "muscliff": "Muscliff! Look, the river.", "littledown": "Littledown! The leisure centre's just there.", "towerpark": "Tower Park! Fancy a film later?",
    "bearcross": "Bear Cross! Mind the roundabout.", "hurn": "Hurn! Look at the planes!", "christchurch": "Christchurch! Look at the Priory.",
    "harbour": "Poole Quay! Look at all the boats.", "wimborne": "Wimborne! Look at the Minster.", "ferndown": "Ferndown! Nearly there.",
    "highcliffe": "Highcliffe! Look, the castle.", "hengistbury": "Hengistbury Head! What a sunset.", "wareham": "Wareham! I love the quay here.",
    "wool": "This is Wool! The Tank Museum's just there.", "purbeck": "Corfe Castle! Isn't it amazing?", "weymouth": "Weymouth! Look at the beach.",
    "jurassic": "Durdle Door! Look at the arch!", "swanage": "Swanage! Look, the pier.", "portland": "Portland! Look, Chesil Beach.",
    "lyme": "Lyme Regis! Look at the Cobb.", "kimmeridge": "Kimmeridge! Look at those cliffs.", "sandbanks": "Sandbanks! Look at those houses!",
    "lymington": "Lymington! Look at all the boats.", "forest": "The New Forest! Watch out for ponies.", "needles": "The Isle of Wight! Look, the Needles!",
}
for key, text in PLACES.items(): LINES["at-" + key] = [text]
# how the locals say them (the phonemiser's own first): Bournemouth BORN-muth, Christchurch CRICE-church, Muscliff MUS-cliff, Wareham WAIR-um, Lymington LIM-ington
FIX = {"bˈɔːnɛməθ": "bˈɔːnməθ", "kɹˈɪsttʃɜːtʃ": "kɹˈaɪstʃɜːtʃ", "mˈʌslɪf": "mˈʌsklɪf", "wˈeəhəm": "wˈeəɹəm", "lˈaɪmɪŋtən": "lˈɪmɪŋtən"}   # (+ MUS-cliff, WAIR-um, LIM-ington: checked 6 Oct)

def cut(wav, mp3):   # the silence off both ends, levelled, a few ms of fade in and (via areverse) out
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", wav, "-af",
                    "silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_threshold=-45dB:stop_duration=0.15,"
                    "loudnorm=I=-16:TP=-1.5:LRA=7,afade=t=in:st=0:d=0.005,areverse,afade=t=in:st=0:d=0.03,areverse",
                    "-ar", "24000", "-ac", "1", "-b:a", "64k", mp3], check=True)

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    encode, phon = "--encode" in sys.argv, "--phon" in sys.argv
    os.makedirs(RAW, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    k = tok = None
    if not encode:
        sys.path.insert(0, KOK)
        from kokoro_onnx import Kokoro
        from kokoro_onnx.tokenizer import Tokenizer
        tok = Tokenizer()
        if not phon: k = Kokoro(os.path.join(KOK, "model", "model.onnx"), os.path.join(KOK, "model", "voices.npz"))
    for vid, texts in LINES.items():
        if args and vid not in args: continue
        for n, text in enumerate(texts):
            wav = os.path.join(RAW, "%s-%d.wav" % (vid, n)); mp3 = os.path.join(OUT, "%s-%d.mp3" % (vid, n))
            if not encode:
                ph = tok.phonemize(text, "en-gb")
                for a, b in FIX.items(): ph = ph.replace(a, b)
                if phon: print("%-15s %d  %s  |  %s" % (vid, n, text, ph)); continue
                samples, rate = k.create(ph, voice=VOICE, speed=SPEED, lang="en-gb", is_phonemes=True)
                sf.write(wav, samples, rate)
            cut(wav, mp3)
            print("%-15s %d  %s" % (vid, n, text), flush=True)

if __name__ == "__main__":
    main()
