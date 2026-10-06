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
    "sandbanks": ("Brownsea Castle seen from across the harbour water: a castellated country house of pale grey and cream stone with square towers and battlements, tall windows, standing at the water's edge of a low green island, a white crenellated gatehouse and little quay on the shore in front, dark green trees and a few pines behind, no pink, no turrets on spires", "calm blue harbour water", "day"),   # (owner, 6 Oct, from photographs: the old one was pink with many towers)
    "christchurch": ("A great old grey stone priory church, very long, with a tall square tower with battlements at its west end, rising above the trees and red roofs of a little town", "green water meadow", "day"),
    "purbeck": ("A ruined grey stone castle with a tall broken keep and jagged walls on top of a steep conical green hill, standing in a gap between two long green chalk ridges", "green fields", "day"),
    "swanage": ("Seen side-on from far across a calm blue bay: a long white chalk headland with a flat green grassy top running out into the sea from green downs, its white cliffs sheer to the water, ending in a natural arch and then two tall white chalk stacks standing in the sea just off its tip, one tall and one small", "calm blue sea", "day"),
    "forest": ("A huge ancient spreading oak tree standing alone on open heathland with purple heather and yellow gorse, a few wild ponies grazing", "heath", "day"),
    "jurassic": ("Durdle Door seen from the clifftop to one side: a long narrow ridge of grey-brown limestone running straight out into the sea from the foot of tall chalk cliffs, its rock layers tilted almost upright in stripes, green turf along the top of its landward part, rising to a crest and then dropping to a natural arch at its seaward end with the sea showing through the arch, a curving shingle beach in a cove beside it", "turquoise sea and shingle beach", "day"),   # (the old one: a squat white free-standing arch)
    "weymouth": ("A tall ornate Victorian seafront clock tower, painted in bright colours, standing on a wide promenade in front of a row of elegant Georgian seafront terraces", "golden sandy beach", "day"),
    "harbour": ("A huge white car ferry with a plain white hull with no writing, no name and no logos, all its decks lit up, moored at a quay beside tall cranes and warehouses with lights", "dark harbour water with reflections", "night"),
    "lymington": ("A flat low-lying English harbour town at dusk with no hills: a long quay of red brick Georgian houses and shops along the water's edge, one church tower with a small white cupola rising above the roofs, and in front of the quay a marina packed with white yachts and a forest of masts", "marina water", "dusk"),
    "lyme": ("Lyme Regis from the sea: a little town of white, cream and pastel houses climbing a steep green wooded hillside above a beach, and in front a long curving grey stone harbour wall sweeping out into the sea in an arc with small boats moored inside it, green hills rising behind, no castle, no tower, no fortress", "harbour water", "dusk"),   # (the old one had a tower on the hill)
    "portland": ("Portland Bill lighthouse seen from inland across flat ground: one tall plain white round tapering tower with ONE single broad red band painted around its lower middle and white above and below it, a black iron railed gallery near the top and a white lantern with a small dome, low flat-roofed white keepers' buildings with a low white wall at its foot, standing on flat pale grey limestone ledges at the low tip of a flat headland, a short white stone obelisk on the ledges beside it, the open sea beyond, no other towers, no clock, no buildings in the distance", "flat pale grey limestone ledges", "dusk"),   # (owner, 6 Oct: the old picture, many stripes on boulders, read as Big Ben from afar)
    "goldencap": ("Golden Cap from along the beach: a great coastal cliff with a broad flat grassy summit, its top part a sheer cliff face of bright golden-orange sandstone glowing in the sun, above long grey crumbling clay slopes and landslips running down to the shingle beach, green fields along its flat top", "shingle beach and sea", "day"),   # (the old one: a rounded green dome with a pale face)
    "hengistbury": ("Seen from the beach a little way off: a low flat-topped headland covered in dark heather and gorse, its seaward end a cliff of layered orange-brown sand and ironstone, a long groyne of big pale rocks running out into the sea from its foot, a shingle beach, glowing warm evening sunlight on the cliff", "sea and shingle beach", "dusk"),
    "needles": ("The Needles seen from a boat out at sea: the bright white chalk cliffs of the western tip of an island with a green grassy top, ending in a line of three sharp white chalk stacks standing in the sea one behind another, and on the outermost stack a white lighthouse with a broad red band around it", "calm sea", "day"),   # (the old one painted the headland reddish brown)
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
