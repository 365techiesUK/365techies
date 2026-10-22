"""365 Coast Run: the police radio in the Getaway (22 Oct 2026; the owner heard it over his own run and liked the pace: "put that into it,
and I'll play it"). The script is D:/claude/coastrun-revamp/voices/police-script.json (triggers -> variants -> lines [WHO, "(style)",
"text"]; cast CONTROL = P1, SARGE = P2, PC = P3, the young officer Dobbs); each line's best take is C:/claude-voices/round4/picked/
<trigger>-<v>-<l>-<P#>.wav, and its radio version (the squelch, the line through the radio, the beep, -16 LUFS) round4/work/<same>-radio.wav.
This cuts every line the game uses (all but copdown_own: the copdown event doesn't say what the police car hit) to a small mono mp3,
games/coastrun/radio/<trigger>-<v>-<l>.mp3 (22.05 kHz, 32 kbps: the radio band stops at 3.4 kHz, so nothing is lost), and writes the
table the game reads, games/coastrun/radio/radio.json: for each trigger its exchanges, each line [WHO, "text", seconds].
Every mp3 is MEASURED once cut (volumedetect, and its length against the wav's): a voice set in this game once shipped silent because
of a fade (make_voice.py, 6 Oct) - a file that's there proves nothing, so a quiet, short or changed one stops the build.
    py tools/coastrun/make_radio.py              cut them all (from the -radio.wav versions)
    py tools/coastrun/make_radio.py --rebuild    first make the radio versions afresh from the picked takes (the same recipe as
                                                 C:/claude-voices/pick_police_play.py), into round4/work
"""
import json, os, re, subprocess, sys

SCRIPT = "D:/claude/coastrun-revamp/voices/police-script.json"
R4 = "C:/claude-voices/round4"
OUT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "games", "coastrun", "radio"))
SKIP = {"copdown_own"}
TAG = {"CONTROL": "CONTROL", "SARGE": "SARGE", "PC": "DOBBS"}   # (the caption's name for each: the young PC is Dobbs)
RATE, KBPS = 22050, 32

# the radio recipe (pick_police_play.py): trimmed, 300-3400 Hz, squeezed, soft-clipped, 16 kHz; a squelch before, a beep after, -16 LUFS
TRIM = "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse"
RADIO = ("highpass=f=300,highpass=f=300,lowpass=f=3400,lowpass=f=3400,"
         "acompressor=threshold=0.08:ratio=6:attack=4:release=60:makeup=3,asoftclip=type=tanh,aresample=16000")


def ff(args):
    subprocess.run(["ffmpeg", "-v", "error", "-y"] + args, check=True)


def radio_wav(name):   # the radio version of one picked take (squelch + line + beep), as pick_police_play.py makes it
    W = R4 + "/work"; SQ, BEEP = W + "/squelch.wav", W + "/beep.wav"
    if not os.path.exists(SQ):
        ff(["-f", "lavfi", "-i", "anoisesrc=d=0.16:c=white:a=0.5:seed=5", "-af", "highpass=f=900,lowpass=f=4200,afade=t=in:d=0.01,afade=t=out:st=0.06:d=0.10,volume=0.35", "-ar", "48000", "-ac", "2", SQ])
    if not os.path.exists(BEEP):
        ff(["-f", "lavfi", "-i", "sine=f=1750:d=0.07", "-af", "afade=t=in:d=0.005,afade=t=out:st=0.05:d=0.02,volume=0.18", "-ar", "48000", "-ac", "2", BEEP])
    dry, wet = "%s/%s-dry.wav" % (W, name), "%s/%s-radio.wav" % (W, name)
    ff(["-i", "%s/picked/%s.wav" % (R4, name), "-af", TRIM + "," + RADIO, dry])
    ff(["-i", SQ, "-i", dry, "-i", BEEP, "-filter_complex",
        "[1]aresample=48000,pan=stereo|c0=c0|c1=c0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[v];[0][v][2]concat=n=3:v=0:a=1[a]",
        "-map", "[a]", "-ar", "48000", "-ac", "2", wet])
    return wet


def level(path):   # (mean dB, peak dB, seconds) of the decoded sound - the decoder honours the mp3's own start padding note
    p = subprocess.run(["ffmpeg", "-v", "info", "-nostats", "-i", path, "-ac", "1", "-af", "volumedetect", "-f", "s16le", "-"],
                       capture_output=True, check=True)
    err = p.stderr.decode("utf-8", "replace")
    mean = float(re.search(r"mean_volume: (-?[\d.]+|-inf) dB", err).group(1).replace("-inf", "-200"))
    peak = float(re.search(r"max_volume: (-?[\d.]+|-inf) dB", err).group(1).replace("-inf", "-200"))
    rate = int(re.search(r"Audio: \w+.*?, (\d+) Hz", err).group(1))
    return mean, peak, len(p.stdout) / 2 / rate


def main():
    rebuild = "--rebuild" in sys.argv
    S = json.load(open(SCRIPT, encoding="utf-8"))
    os.makedirs(OUT, exist_ok=True)
    table, rows, bad, total = {}, [], [], 0
    for trig, T in S["triggers"].items():
        if trig in SKIP: continue
        table[trig] = []
        for vi, var in enumerate(T["variants"], 1):
            ex = []
            for li, (who, _style, text) in enumerate(var, 1):
                src = "%s-%d-%d-%s" % (trig, vi, li, S["cast"][who])
                wav = radio_wav(src) if rebuild else "%s/work/%s-radio.wav" % (R4, src)
                if not os.path.exists(wav): bad.append("%s: no radio wav (%s) - try --rebuild" % (src, wav)); continue
                mp3 = os.path.join(OUT, "%s-%d-%d.mp3" % (trig, vi, li))
                # mono (the radio wav is the same on both sides), 22.05 kHz, 32 kbps CBR; no tags - just the sound
                ff(["-i", wav, "-ac", "1", "-ar", str(RATE), "-c:a", "libmp3lame", "-b:a", "%dk" % KBPS, "-map_metadata", "-1",
                    "-id3v2_version", "0", "-write_id3v1", "0", mp3])
                m0, p0, d0 = level(wav); m1, p1, d1 = level(mp3); kb = os.path.getsize(mp3) / 1024; total += os.path.getsize(mp3)
                ok = m1 > -35 and p1 > -10 and abs(m1 - m0) < 1.5 and abs(d1 - d0) < 0.08
                if not ok: bad.append("%s: mean %.1f dB (wav %.1f), peak %.1f dB, %.3f s (wav %.3f s)" % (os.path.basename(mp3), m1, m0, p1, d1, d0))
                rows.append("%-22s %5.1f KB  %5.2f s  mean %6.1f dB  peak %5.1f dB  (wav mean %6.1f, %5.2f s)%s" % (
                    os.path.basename(mp3), kb, d1, m1, p1, m0, d0, "" if ok else "   <-- BAD"))
                ex.append([TAG[who], text, round(d1, 3)])
            table[trig].append(ex)
    print("\n".join(rows))
    print("%d files, %.0f KB in all" % (len(rows), total / 1024))
    if bad:
        print("FAILED:\n  " + "\n  ".join(bad)); sys.exit(1)
    J = {"about": "365 Coast Run - the Getaway's police radio (tools/coastrun/make_radio.py, from police-script.json, 22 Oct 2026). "
                  "t: trigger -> exchanges (the variants, played in turn) -> lines [who, words, seconds]; line l of variant v is <trigger>-<v>-<l>.mp3.",
         "t": table}
    with open(os.path.join(OUT, "radio.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(J, f, ensure_ascii=False, separators=(",", ":")); f.write("\n")
    print("TABLE", os.path.join(OUT, "radio.json"))


if __name__ == "__main__":
    main()
