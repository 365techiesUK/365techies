"""365 Coast Run: your passenger's voice. Kokoro-82M (Apache 2.0) on this PC (it garbles bare exclamations like "Aaah!" or "Wheee!": real words only;
every line checked by transcribing it back with faster-whisper), the owner's chosen voice bf_lily (British).
Every line she says in the game, made in one go: D:/claude/reels/coastrun-voice/<id>-<n>.wav, then cut to small mp3s for
the game (games/coastrun/voice/<id>-<n>.mp3, trimmed, levelled). The game picks one of each id's takes at random.
    D:/claude/tools/kokoro/venv/Scripts/python.exe tools/coastrun/make_voice.py
"""
import os, subprocess, sys
import numpy as np, soundfile as sf
sys.path.insert(0, r"D:\claude\tools\kokoro")
from kokoro_onnx import Kokoro

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
}

def main():
    os.makedirs(RAW, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    npz = os.path.join(KOK, "model", "voices.npz")
    k = Kokoro(os.path.join(KOK, "model", "model.onnx"), npz)
    only = set(sys.argv[1:])
    for vid, texts in LINES.items():
        if only and vid not in only: continue
        for n, text in enumerate(texts):
            wav = os.path.join(RAW, "%s-%d.wav" % (vid, n))
            samples, rate = k.create(text, voice=VOICE, speed=SPEED, lang="en-gb")
            sf.write(wav, samples, rate)
            mp3 = os.path.join(OUT, "%s-%d.mp3" % (vid, n))
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", wav, "-af",
                            "silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_threshold=-45dB:stop_duration=0.15,"
                            "loudnorm=I=-15:TP=-1.5:LRA=7,afade=t=out:st=0:d=0.01", "-ar", "24000", "-ac", "1", "-b:a", "48k", mp3], check=True)
            print("%-7s %d  %4.2fs  %s" % (vid, n, len(samples) / rate, text), flush=True)

if __name__ == "__main__":
    main()
