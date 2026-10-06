"""365 Coast Run's landmarks, painted large: one picture per place of its landmark alone, for the hero layer in world3d.js
(it swings into view as each stage begins and stays ahead, off to one side, as OutRun's landmark backdrops did). Owner,
6 Oct, "carry on with the scenery passes"; the critic: landmarks should fill 15-25% of the frame, with a reveal.
FLUX.1 [schnell] (Apache 2.0) through the local ComfyUI on GPU 0, the same as gen_backdrop.py: our own briefs of the real Dorset
places, no game, film or artist named or imitated, painted against a magenta sky that's keyed out.
    py tools/coastrun/gen_hero.py [place[:takes] ...]   -> D:/claude/reels/coastrun-heroes/<place>-<seed>.png
Then: py tools/coastrun/make_hero.py <place> <png>    -> games/coastrun/bg/hero-<place>.webp
"""
import os, random, sys, time
import gen_backdrop as gb

gb.W, gb.H = 1536, 768
OUT = r"D:\claude\reels\coastrun-heroes"
STYLE = ("A beautiful detailed matte painting for a racing game background, telephoto view from about a kilometre away, crisp, "
         "rich natural colours, gentle atmospheric haze, no people, no cars, no text, no road, nothing in the foreground.")
SKY = {"day": " Daylight. The sky is a solid flat uniform pure magenta colour, like a studio backdrop, with no clouds, no sun, no birds.",
       "dusk": " Warm evening light. The sky is a solid flat uniform pure magenta colour, like a studio backdrop, with no clouds, no sun, no birds.",
       "night": " Night, the landmark lit up. The sky is a solid flat uniform pure magenta colour, like a studio backdrop, with no stars, no moon, no clouds."}
BIG = " It stands large in the middle of the picture, filling most of its height, and the {base} runs right out to the bottom edge."
HERO = {   # place: (the landmark, what it stands on, the light) - each place's own light, as the game paints it
    "bournemouth": ("Seen from far across a wide calm blue bay: a long low green ridge of hills running along the far shore and ending at the sea in white chalk cliffs, with two or three white chalk stacks standing in the sea off the point; in front of the hills, at the water's edge, a long low sandy spit with white houses and dark pine trees", "calm blue sea", "day"),
    "sandbanks": ("A small wooded island in a harbour, a little castellated grey stone castle with towers at its water's edge among tall dark pine trees", "calm blue harbour water", "day"),
    "christchurch": ("A great old grey stone priory church, very long, with a tall square tower with battlements at its west end, rising above the trees and red roofs of a little town", "green water meadow", "day"),
    "purbeck": ("A ruined grey stone castle with a tall broken keep and jagged walls on top of a steep conical green hill, standing in a gap between two long green chalk ridges", "green fields", "day"),
    "swanage": ("Tall white chalk sea stacks standing in a turquoise sea just off the end of a white chalk headland topped with green grass", "turquoise sea", "day"),
    "forest": ("A huge ancient spreading oak tree standing alone on open heathland with purple heather and yellow gorse, a few wild ponies grazing", "heath", "day"),
    "jurassic": ("A great natural arch of pale cream limestone standing in the sea at the end of a long ridge of pale cream rock with a green grassy top, the turquoise sea showing through the arch, warm golden late afternoon sun lighting the pale rock", "calm turquoise sea", "day"),
    "weymouth": ("A tall ornate Victorian seafront clock tower, painted in bright colours, standing on a wide promenade in front of a row of elegant Georgian seafront terraces", "golden sandy beach", "day"),
    "harbour": ("A huge white car ferry with a plain white hull with no writing, no name and no logos, all its decks lit up, moored at a quay beside tall cranes and warehouses with lights", "dark harbour water with reflections", "night"),
    "lymington": ("A flat low-lying English harbour town at dusk with no hills: a long quay of red brick Georgian houses and shops along the water's edge, one church tower with a small white cupola rising above the roofs, and in front of the quay a marina packed with white yachts and a forest of masts", "marina water", "dusk"),
    "lyme": ("A small English seaside town at sunset: rows of pastel-painted cottages stepping up a gentle green hillside, with no castle, no tower, no fortress and no battlements anywhere. In front, a long low grey stone harbour arm curves out into the calm sea in a gentle hook, little fishing boats moored inside its curve", "calm sea", "dusk"),
    "portland": ("A tall red and white striped lighthouse on the rocky limestone tip of an island, a white stone obelisk beside it on the rocks", "rocky shore and sea", "dusk"),
    "goldencap": ("A huge rounded hill on the coast, its top a flat green grassy summit; its seaward face a sheer cliff with a thin band of bright golden-yellow sandstone just below the green summit, and long grey crumbling clay slopes patched with green scrub falling below it to the beach", "shingle beach and sea", "day"),
    "hengistbury": ("Seen from the beach a little way off: a low flat-topped headland covered in dark heather and gorse, its seaward end a cliff of layered orange-brown sand and ironstone, a long groyne of big pale rocks running out into the sea from its foot, a shingle beach, glowing warm evening sunlight on the cliff", "sea and shingle beach", "dusk"),
    "needles": ("Seen from a boat out at sea: the white chalk tip of an island with a green grassy top, and running out from it in a straight line three separate low jagged white chalk rocks rising straight out of the water like broken teeth, and at the end of the line, standing on the sea at the foot of the last rock, a short round red and white striped lighthouse about as tall as the rocks", "open sea", "dusk"),
}

def take(place, seed):
    what, base, light = HERO[place]; t0 = time.time()
    img = gb.render(what + "." + BIG.format(base=base) + " " + STYLE + SKY[light], seed, "coastrun-hero/%s-%d" % (place, seed))
    os.makedirs(OUT, exist_ok=True); dst = os.path.join(OUT, "%s-%d.png" % (place, seed)); img.save(dst)
    print("%-12s seed %-10d %3.0f s -> %s" % (place, seed, time.time() - t0, dst), flush=True)

if __name__ == "__main__":
    for j in sys.argv[1:] or list(HERO):
        place, _, n = j.partition(":")
        for _ in range(int(n or 1)): take(place, random.randint(1, 2**30))
