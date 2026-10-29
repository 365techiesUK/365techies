/* 365 Star Run - the rules (rebuilt 27 Oct 2026 as a cinematic chapter game in the spirit of the 90s space shooters; reworked
 * the same day after the owner played it: faster, speed control, enemies that come AT you and shoot, free flight round an
 * enemy warship). Our own name, ships, places and story. No drawing here, so the tests run it in node (engine.test.mjs).
 * The makeover (27 Oct, late; from a review panel - D:\claude\starrun-review\4-critic.md): medals on each chapter's own score;
 * the stick IS the ship in the valley; the ship follows faster and gates draw you in; every enemy burst glows first; hits tell
 * you what and where; fighters never ram (a near miss scores); divers, a V of three, fly-bys; the Gaoler in three beats (a wall
 * of fire, mines, a charging beam); Harbourlight Control on the radio; a shorter, busier opening.
 * 28 Oct: the warship on a SET PATH (the attack circuit, a figure of eight round her; free flight is a setting); flying and aiming
 * apart on a controller; thrust on the trigger; the shock bomb.
 * 28 Oct 2026 (v18), the owner: the valley "quite simple" - more detail, more routes, "going up and down", tighter squeezes, longer and faster;
 * the thrust "basic ... it just doesn't feel right"; no guns under the warship. Now: a valley that drops into a deep gorge and climbs out over
 * the open desert, two forks, squeezes, rockfalls, buttes; a real THROTTLE (it pulls like a car and holds, past the sound barrier); her belly
 * guns and a KEEL GUN that runs along a track under her to follow you.
 * 60 steps a second; the screen is 400 x 300 game units; the world is x right, y up, z ahead.
 *
 * Two ways of flying, one ship (the Lancer), seen from behind (or from its cockpit - a setting; the rules are the same):
 *   RAIL (chapter 1, THE VALLEY) - a long winding canyon route (Catmull-Rom through points, measured by distance). The ship
 *       flies down it and follows the cursor across and up the canyon; W (or RT) is the throttle, S brakes,
 *       Q / E barrel-roll (a quick sideways dodge that shrugs off fire). Gates, arches, pillars, a rock tunnel, a canyon split
 *       by a ridge (left: harder, double points; right: the guns), squadrons that fly in head-on, hold in front of you
 *       firing, then break over you, heavy fighters with missiles, rim guns - and the WARDEN, a gunship boss with parts.
 *   FREE (chapter 2, STRIKE THE WARSHIP) - fly anywhere round an enemy warship: the cursor near the middle of the screen
 *       only aims; push it out towards the edge and the ship turns that way. Its turrets fire lasers and flak, fighters
 *       dogfight you (head-on runs, then they break away and come round again), its main gun shells your carrier. Knock out
 *       the four shield generators, then the bridge - and watch her go up.
 * Steering (input.ctrl, from starrun.js): the MOUSE cursor (in the valley the ship follows it; in free flight its middle
 * aims and its edge turns), MOUSE-AIM (free flight with the pointer locked: move the mouse where you want to go and the ship
 * flies there - the camera looks where you point), a CONTROLLER or the keys (the stick turns the ship; the gunsight sits on
 * its nose). In free flight the THRUSTER FLIP (R / Y) brakes hard, swings the nose up and over and comes out the way you came;
 * braking tightens your turn. Where a ridge splits the valley, steering and the camera centre on the channel you chose.
 * Shots are aimed at the screen (the cursor, or the gunsight) and resolve a few steps later against what is under it (pick),
 * as in a light-gun game; hold the rocket button to LOCK up to six targets and let go to fire a homing salvo.
 * Losing every shield costs a ship and puts you back at the last checkpoint with fresh shields; no ships = game over.
 * Each chapter: a briefing, then a tally (accuracy, time, no damage) and a medal. The valley ends with the CLIMB TO SPACE: you
 * leave the canyon and climb (boost to climb faster) until the sky goes black. Shields slowly recharge when you keep out of
 * trouble for a while.
 * The game reports what happened in world.events (sounds, {say}) and world.fx (where things happened, for the picture). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SREngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var GW = 400, GH = 300, CX = 200, CY = 132, FOCAL = 250, NEAR = 1.2;
  var AIM = { x0: 14, x1: 386, y0: 18, y1: 236 };
  var SHOT_T = 6, BACK = 26, UP = 7, ARENA = 3000, FLIP = 54, REACH = 0.85;
  var SPEEDS = {   // eFire: how long enemies wait between shots (x); bolt: their laser's speed; err: how far off they aim in free flight; rerr: in the
    // valley (a bolt at a ship that sits still hits about 15 / 30 / 50 % of the time); calm: steps clear of trouble before shields recharge,
    // then one every regen; shell: steps between her main gun's shells at your carrier; (v20) tell: how long a gun glows (and you hear it) before
    // it fires; hpDart / hpHeavy: hits to bring down a Shrike / an Anvil (v26: a Shrike takes 2 on Gentle, 3 on Classic and Fast - chips that set it burning, then the kill)
    1: { name: 'Gentle', shields: 10, lives: 5, assist: 11, keys: 4.4, fireGap: 7, rockets: 8, pace: 0.85, eFire: 1.5, eCount: 0.75, bolt: 4.2, err: 7, rerr: 5.4, aggr: 0.75, hitR: 2.8, hold: 1.35, regen: 180, calm: 240, shell: 540, bombs: 4, tell: 30, hpDart: 2, hpHeavy: 3 },
    2: { name: 'Classic', shields: 8, lives: 3, assist: 8, keys: 4.8, fireGap: 7, rockets: 6, pace: 1, eFire: 0.9, eCount: 1, bolt: 5.6, err: 3.6, rerr: 5.2, aggr: 1, hitR: 3.3, hold: 1, regen: 300, calm: 240, shell: 420, bombs: 3, tell: 24, hpDart: 3, hpHeavy: 5 },
    3: { name: 'Fast', shields: 7, lives: 3, assist: 6, keys: 5.2, fireGap: 7, rockets: 5, pace: 1.15, eFire: 0.7, eCount: 1.3, bolt: 6.4, err: 2.6, rerr: 5, aggr: 1.25, hitR: 3.6, hold: 0.8, regen: 480, calm: 360, shell: 380, bombs: 2, tell: 18, hpDart: 3, hpHeavy: 6 }
  };
  var PTS = { dart: 1000, heavy: 2500, drone: 250, turret: 400, gate: 100, missile: 100, wpart: 1500, wardenDown: 15000, gen: 3000, bridge: 20000, gun: 5000, clean: 10000, salvo: 500, close: 250, mine: 250, carrierLost: 15000, bunker: 800, allGuns: 5000, ace: 4000, keel: 6000, squeeze: 500, farm: 5000, rescue: 5000, pack: 1500, toy: 1000, howler: 1500, fetch: 500, sonic: 60, deflect: 250, graze: 50, rock: 150, bigRock: 400, boulder: 300, mpart: 2500, millstone: 20000, outran: 8000 };
  // (v32, 29 Oct: the enemy are now the CURLY PACK - cockapoo fighters: YAPPERS (darts), FLUFFBALLS (heavies), HOWLERS, FETCHERS, PACK LEADERS.)
  // Names (27 Oct makeover): you are GULL ONE in the Lancer, from the carrier HARBOURLIGHT; the enemy are the ROOKS - SHRIKE fighters (darts),
  // ANVIL heavies, the GAOLER gunship (called the warden in the code). Our own; checked against other games and films.
  // gold: the chapter's score for a gold medal at each speed (silver at 70 %), set from the balance bot (starrun-review/bal4.mjs, four seeds, auto-aim Strong; v20: two-hit fighters, the longer Gaoler, the chain that waits in quiet stretches) - a perfect shot that
  // never dodges gets gold at Gentle and mostly silver at Classic and Fast: there, gold needs you to dodge as well.
  var CHAPTERS = [
    { n: 1, id: 'valley', name: 'THE VALLEY', mode: 'rail', gold: { 1: 370000, 2: 520000, 3: 600000 }, par: 250,
      goal: ['CHASE THE MAGPIE - THRUST TO CLOSE ON HIM', 'TWO FORKS, PACK SQUADRONS - AND THE GAOLER GUNSHIP'], why: 'THE MAGPIE HAS NOODLE DOODLES. CHASE HIM DOWN THE VALLEY.',
      say: 'Race the red valley. Your ship follows the cursor: hold W for thrust - as long as you like - S brakes, Q and E roll out of trouble. Dive into the gorge, climb out over the mesas, pick a way at the forks - the Curly Pack is waiting, and at the end, the Gaoler gunship.' },
    { n: 2, id: 'warship', name: 'STRIKE THE WARSHIP', mode: 'rail', gold: { 1: 130000, 2: 165000, 3: 215000 }, goldFree: { 1: 60000, 2: 80000, 3: 85000 }, par: 200,
      goal: ['ATTACK RUNS ROUND HER - FIRST SILENCE HER MAIN GUN', 'THEN HER FOUR SHIELD GENERATORS, THEN THE BRIDGE'], why: 'NOODLE DOODLES IS IN HER BRIG - AND HER GUN CAN REACH HARBOURLIGHT.',
      say: 'Strike the warship. Your attack runs take you round her: along her back, then down each side. Her main gun is shelling your carrier, Harbourlight: silence it first. Then knock out her four shield generators, and destroy the bridge.' },
    // (28 Oct, chapter 3) THE SHOALS: on rails through a field of broken rock round a dead moon - the edge, the drift, a hollowed-out quarry with
    // a fork, the Magpie leading you through the scatter - then the MILLSTONE, a Rook mining barge that throws rocks; then outrun its blast
    { n: 3, id: 'shoals', name: 'THE SHOALS', mode: 'rail', gold: { 1: 150000, 2: 205000, 3: 240000 }, par: 230,
      goal: ['AFTER THE MAGPIE, THROUGH THE ROCKS AND THE QUARRY', 'THEN THE MILLSTONE - FREE HER, OUTRUN ITS BLAST'], why: 'THE MAGPIE HAS HER AGAIN. AFTER HIM, THROUGH THE SHOALS.',
      say: 'The Shoals. Shoot the small rocks, steer round the big ones - fly into one and you are gone. Through the quarry, after the Magpie, then the Millstone: shoot its arms when they glow, find the gap in its cutter, hit its reactor - then full thrust.' }
  ];
  // the radio: Harbourlight Control talking to you, as captions (pri: a more urgent line can cut in; others wait their turn)
  var RADIO = {
    v_start: [1, 'GULL ONE, THIS IS SANDERLING. HOLD THRUST TO GO FASTER - RAIDERS AHEAD.'], v_first: [1, 'TWO YAPPERS HEAD-ON. SHOOT THEM DOWN!'],
    v_narrows: [1, 'SQUEEZES AND ROCKFALLS. HOLD THE MIDDLE, HOP THE ROCKS.'], v_ambush: [1, 'GUNS ON THE RIMS, AND MORE YAPPERS.'],
    v_guns: [2, 'GUNS ON THE RIMS AND WALLS - SHOOT THEM OUT!'], v_gun1: [1, 'GUN DOWN! THEY PAY WELL - GET THEM ALL.'],
    v_tunnel: [1, 'THE TUNNEL CLIMBS. KEEP IT STEADY.'], v_divide: [1, 'PICK A SIDE: LEFT IS TIGHT, RIGHT HAS GUNS.'],
    v_squad: [1, 'THE PACK BURNED THESE WOODS. SQUADRONS INBOUND - THRUST THROUGH THE GAPS.'], v_boss: [2, 'SOMETHING BIG OUT ON THE SALT PAN. HOLD STEADY.'],
    g_spawn: [3, 'THE GAOLER! HIT ITS GUN PODS - WHEN THEY GLOW, BEFORE THEY FIRE.'], g_curtain: [2, 'A WALL OF FIRE - FLY FOR THE GAP!'], g_pods: [3, 'PODS GONE! SHOOT ITS MINES - ITS ENGINES OPEN SOON.'],
    g_mines: [2, 'MINES! SHOOT THEM OR STEER ROUND.'], g_core: [3, 'ENGINES OUT - HIT THE CORE WHEN IT OPENS!'], g_beam: [2, 'IT IS CHARGING - MOVE!'], g_down: [3, 'THE GAOLER IS RUNNING - AND BURNING! GREAT SHOOTING.'],
    g_away: [3, 'THE GAOLER GOT AWAY. NEXT TIME.'],
    // (v22) the other side, intercepted: [pri, words, who] - shown in red, with who is speaking
    mg_on: [3, 'STAY STILL, GULL ONE. THIS WILL NOT TAKE LONG.', 'MAGPIE'], mg_by: [2, 'WHAT? WHERE DID YOU GO?', 'MAGPIE'], mg_down: [3, 'NO - NOT LIKE THIS!', 'MAGPIE'],
    mg_gone: [2, 'ANOTHER DAY, GULL ONE. ANOTHER DAY.', 'MAGPIE'], ga_pods: [2, 'YOU WILL PAY FOR THAT, LITTLE BIRD!', 'GAOLER'], ga_beaten: [2, 'THIS IS NOT OVER, GULL ONE. NOT OVER!', 'GAOLER'],
    rk_squad: [1, 'THERE HE IS - ALL FIGHTERS, TAKE HIM!', 'PACK LEADER'], rk_bridge: [2, 'ALL GUNS! PROTECT THE BRIDGE!', 'PACK BRIDGE'],
    // (chapter 3) the Shoals
    s_start: [1, 'GULL ONE, SANDERLING. THE SHOALS - SHOOT THE SMALL ROCKS, STEER ROUND THE BIG ONES.'], s_drift: [1, 'THE DRIFT. THOSE ROCKS ARE MOVING - WATCH YOUR SIDES.'],
    s_quarry: [1, 'A HOLLOW ROCK - THEY HAVE BEEN MINING IT. IN YOU GO. MIND THE WALLS.'], s_fork: [1, 'TWO WAYS OUT. THE SHAFT IS TIGHT; THE CONVEYOR IS GUARDED.'],
    s_scatter: [2, 'THE MAGPIE IS AHEAD OF YOU - AND HE KNOWS THESE ROCKS.'], s_mill: [3, 'THE MILLSTONE - A MINING BARGE. IT THROWS ROCKS: SHOOT ITS ARMS WHEN THEY GLOW!'],
    s_cutter: [2, 'ARMS GONE! WATCH ITS CUTTER - FIND THE GAP!'], s_reactor: [3, 'CUTTER DOWN - ITS REACTOR IS OPEN. NOW!'],
    s_under: [3, 'IT IS GOING CRITICAL - FLY UNDER IT, THEN FULL THRUST!'], s_run: [3, 'FULL THRUST, GULL ONE - DO NOT LOOK BACK!'],
    s_outran: [2, 'YOU OUTRAN IT! WHAT A SIGHT.'], s_caught: [2, 'IT CAUGHT YOU - HOLD ON!'],
    mg_back: [3, 'MISSED ME, GULL ONE? FOLLOW ME IF YOU CAN!', 'MAGPIE'], mg_back2: [3, 'YOU GOT LUCKY LAST TIME. NOT IN HERE.', 'MAGPIE'],
    mg_gone3: [2, 'MY ROCKS, GULL ONE. MY RULES. LATER!', 'MAGPIE'], mg_down3: [3, 'NOT AGAIN! NOT IN MY OWN ROCKS!', 'MAGPIE'],
    rk_mill: [2, 'GRIND HIM INTO GRAVEL!', 'PACK MILLSTONE'], w_run: [3, 'HER SHIELDS ARE DOWN - WE ARE BRINGING YOU ROUND FOR A RUN AT HER BRIDGE. HOLD ON!'], climb: [3, 'CLIMB, GULL ONE. HARBOURLIGHT IS WAITING.'],
    w_start: [3, 'SANDERLING, GULL ONE. HER MAIN GUN IS ON US - SILENCE IT FIRST!'], w_turn_mouse: [2, 'POINT THE MOUSE WHERE YOU WANT TO GO.'], w_turn_pad: [2, 'LEFT STICK TURNS. HOLD LT FOR A TIGHT TURN.'],
    w_turn_keys: [2, 'ARROWS TURN. HOLD S FOR A TIGHT TURN.'], w_turn_touch: [2, 'DRAG TO TURN. BRAKE FOR A TIGHT TURN.'], w_gens: [1, 'GENERATORS ARE ON HER OUTRIGGERS - THE GREEN ONES.'],
    w_flip: [1, 'OVERSHOT? R - OR Y - FLIPS YOU ROUND.'], w_path: [2, 'WE WILL TAKE YOU ROUND HER - YOU AIM AND SHOOT.'],
    w_spine: [1, 'ALONG HER BACK - THE MAIN GUN, THEN THE BRIDGE.'], w_port: [2, 'HER LEFT SIDE - TWO GENERATORS, ON YOUR LEFT!'], w_star: [2, 'HER RIGHT SIDE - TWO GENERATORS, ON YOUR RIGHT!'],
    w_bridge2: [2, 'HER BACK AGAIN - HIT THAT BRIDGE!'], w_fighters: [2, 'FIGHTERS LAUNCHING FROM HER HANGAR.'], w_carrier: [2, 'WE ARE TAKING HITS, GULL ONE!'], w_gun: [3, 'MAIN GUN SILENCED. THANK YOU, GULL ONE!'],
    w_gen: [2, 'GENERATOR DOWN. KEEP AT IT.'], w_shields: [3, 'HER SHIELDS ARE DOWN - GO FOR THE BRIDGE!'], w_bridge: [3, 'SHE IS BREAKING UP - GREAT WORK!'], w_back: [2, 'COME BACK ROUND, GULL ONE.'],
    w_lost: [3, 'HARBOURLIGHT IS HIT BADLY - WE ARE PULLING BACK!'],
    missile: [2, 'MISSILE ON YOU - ROLL!'], last: [3, 'LAST SHIELD! KEEP CLEAR AND IT WILL RECHARGE.'], gates5: [1, 'FIVE GATES IN A ROW - NICE FLYING.'], close: [1, 'TOO CLOSE, GULL ONE!'],
    w_belly: [1, 'UNDER HER BELLY - HER HANGAR AND THE GUNS UNDERNEATH.'], w_strafe: [1, 'STRAFING RUNS - ACROSS HER BACK, THEN UNDER HER.'],
    ace_on: [3, 'THE MAGPIE IS ON YOUR TAIL! BRAKE - LET HIM OVERSHOOT!'], ace_by: [2, 'HE OVERSHOT - NOW YOU ARE ON HIS TAIL!'], ace_down: [3, 'THE MAGPIE IS DOWN! GREAT SHOOTING.'],
    ace_gone: [1, 'THE MAGPIE GOT AWAY.'],
    pk_lead: [1, 'THE ONE WITH THE GOLD COLLAR LEADS THEM - DOWN HIM AND THE REST SCATTER.'], pk_broken: [1, 'PACK BROKEN - LOOK AT THEM RUN!'],
    pk_howl: [2, 'A HOWLER - IT SHIELDS THE WHOLE PACK. TAKE IT OUT FIRST!'], pk_howldown: [1, 'HOWLER DOWN - THEIR SHIELDS ARE GONE.'],
    pk_fetch: [2, 'FETCHERS - THEY THROW BALLS. SHOOT THEM, OR ROLL AND BAT THEM BACK!'], pk_fur: [2, 'A FLUFFBALL - THAT FUR SOAKS UP LASERS. ROCKETS, OR HIT IT AS IT TURNS!'],
    pk_treat: [1, 'A TREAT - FLY THROUGH IT!'], pk_toy: [1, 'ONE OF NOODLE DOODLES SQUEAKY TOYS - GRAB IT!'],
    st_go: [3, 'GET AFTER HIM, GULL ONE - HE HAS NOODLE DOODLES, AND OUR DOCKING CODE IS ON HER TAG!'], st_mag1: [2, 'SUCH A SHINY TAG. FINDERS KEEPERS, GULL ONE!', 'MAGPIE'],
    st_close: [1, 'YOU ARE RIGHT ON HIS TAIL - KEEP THE THRUST ON!'], st_far: [1, 'HE IS PULLING AWAY - THRUST, GULL ONE!'], st_mag2: [1, 'CATCH ME IF YOU CAN!', 'MAGPIE'],
    st_hand: [3, 'HE HAS HANDED HER TO THE GAOLER - SHE IS IN ITS CAGE!'], st_gaol: [2, 'A LITTLE ONE FOR MY CAGE.', 'GAOLER'],
    st_up: [3, 'IT IS TAKING HER UP TO THE WARSHIP - FOLLOW IT UP!'], st_brig: [2, 'NOODLE DOODLES IS IN HER BRIG. BRING THAT SHIP DOWN AND WE GET HER BACK.'],
    st_esc: [3, 'THE MAGPIE - HE HAS GOT HER AGAIN! HE IS RUNNING FOR THE SHOALS!'], st_mag3: [2, 'TOO SLOW, GULL ONE. SHE LIKES IT WITH ME.', 'MAGPIE'],
    st_shoals: [2, 'HE IS IN THE ROCKS AHEAD WITH HER - STAY ON HIM!'], st_mill: [3, 'HE HAS LEFT HER WITH THE MILLSTONE - IT HAS HER POD IN ITS CLAW!'],
    st_free: [3, 'SHE IS FREE - HER POD IS DRIFTING AHEAD OF YOU. GO GET HER!'], st_got: [3, 'YOU GOT HER! NOODLE DOODLES IS SAFE!'],
    st_lost3: [2, 'SHE IS STILL OUT THERE, GULL ONE. WE WILL FIND HER.'], v_farm: [2, 'THE PACK IS HITTING A FARM OUT THERE - DRIVE THEM OFF IT!'], v_saved: [2, 'THE FARM IS SAFE. THEY WILL NOT FORGET THAT, GULL ONE.'], v_farmlost: [1, 'TOO LATE FOR THAT FARM.'], v_drop: [2, 'THE DROP - DIVE INTO THE GORGE!'], v_forkA: [1, 'A FORK: LEFT IS A SLOT, TIGHT. RIGHT IS THE RIVER.'],
    v_mesa: [2, 'GREEN COUNTRY, GULL ONE. WEAVE THROUGH THE ROCKS - GUNS ON THE TOPS.'], v_plunge: [2, 'DOWN INTO PINE CANYON - DIVE!'], sonic: [1, 'THROUGH THE SOUND BARRIER, GULL ONE!'],
    w_keel: [3, 'A KEEL GUN UNDER HER - IT FOLLOWS YOU. TAKE IT OUT!'], w_keel_down: [3, 'KEEL GUN DOWN! NICE WORK.'], hunt: [2, 'THEY ARE RUNNING FOR HER HANGAR - AFTER THEM!'], w_down: [3, 'SHE IS GONE! GREAT WORK, GULL ONE - COME HOME.']
  };
  // the enemy warship (chapter 2), bow towards +z: boxes she is made of (for crashes), where her guns, shield generators,
  // main gun, bridge and hangar are. sr3d.js builds her model round the same numbers.
  var WARSHIP_BASE = {
    boxes: [[-70, -36, -450, 70, 24, 380], [-46, -26, 380, 46, 14, 540], [-42, 24, -320, 42, 48, 200], [-20, 24, 205, 20, 96, 275], [-62, -30, -540, 62, 20, -450],
      [70, -9, -222, 174, 9, -178], [-174, -9, -222, -70, 9, -178], [70, -9, 98, 174, 9, 142], [-174, -9, 98, -70, 9, 142],
      [174, -46, -216, 206, 46, -184], [-206, -46, -216, -174, 46, -184], [174, -46, 104, 206, 46, 136], [-206, -46, 104, -174, 46, 136],
      [-16, -41, -420, 16, -36, 340],   // (v18: the keel under her, carrying her keel gun's track)
      [2, -38, 428, 76, 26, 516], [-76, -38, 428, -2, 26, 516], [2, -38, -534, 76, 26, -446], [-76, -38, -534, -2, 26, -446]],   // (v35) the knuckles at either end of the BONE she is now
    turrets: [[-30, 52, -260, 0, 1, 0, 'flak'], [30, 52, -260, 0, 1, 0, 'laser'], [-30, 52, -110, 0, 1, 0, 'laser'], [30, 52, -110, 0, 1, 0, 'flak'], [-30, 52, 60, 0, 1, 0, 'flak'], [30, 52, 60, 0, 1, 0, 'laser'], [0, 52, 165, 0, 1, 0, 'flak'],
      [-73, 0, -360, -1, 0, 0, 'laser'], [73, 0, -360, 1, 0, 0, 'laser'], [-73, 0, 300, -1, 0, 0, 'flak'], [73, 0, 300, 1, 0, 0, 'flak'],
      [-40, -39, -150, 0, -1, 0, 'laser'], [40, -39, -150, 0, -1, 0, 'flak'], [-40, -39, 180, 0, -1, 0, 'flak'], [40, -39, 180, 0, -1, 0, 'laser'],
      [-52, -39, -330, 0, -1, 0, 'flak'], [52, -39, -330, 0, -1, 0, 'laser'], [-52, -39, 40, 0, -1, 0, 'laser'], [52, -39, 40, 0, -1, 0, 'flak']],   // (v18: four more under her)
    gens: [[190, 0, -200], [-190, 0, -200], [190, 0, 120], [-190, 0, 120]],
    bridge: [0, 86, 278], gun: [0, 58, -40], hangar: [0, -38, -20], carrier: [1700, -260, 1900],
    keel: [-400, 330], keelY: -60   // (v18, the owner: "there should be guns underneath ... a gun thing that follows you": a gun on a track along her keel)
  };
  // (27 Oct night, the owner: "the main ship needs to be bigger") she is laid out in the numbers above, then all of it is made WS_K times
  // bigger - her hull, where her guns, generators, main gun and bridge sit. Your carrier stays where it was. sr3d builds her model from
  // WARSHIP_BASE and scales it the same.
  var WS_K = 1.5, WARSHIP = (function (D, k) {
    var sc = function (p) { return p.map(function (v) { return v * k; }); };
    return { boxes: D.boxes.map(sc), turrets: D.turrets.map(function (t) { return [t[0] * k, t[1] * k, t[2] * k, t[3], t[4], t[5], t[6]]; }), gens: D.gens.map(sc),
      bridge: sc(D.bridge), gun: sc(D.gun), hangar: sc(D.hangar), carrier: D.carrier, keel: sc(D.keel), keelY: D.keelY * k };
  })(WARSHIP_BASE, WS_K);

  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function spoken(lines) { return lines.map(function (l) { return l[0].toLowerCase() + ' ' + l[1]; }).join(', '); }
  function titleCase(s) { return s.toLowerCase().replace(/(^| )([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  function wrapA(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  // ---------------------------------------------------------------- rails: smooth routes measured by distance
  function catmull(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t, o = [0, 0, 0];
    for (var i = 0; i < 3; i++) o[i] = 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3);
    return o;
  }
  function d3(a, b) { var x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return Math.sqrt(x * x + y * y + z * z); }
  function makeRail(pts, loop) {
    var n = pts.length, S = [], len = 0, prev = null, segs = loop ? n : n - 1, i, k;
    for (i = 0; i < segs; i++) {
      var p0 = pts[loop ? (i - 1 + n) % n : Math.max(0, i - 1)], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[loop ? (i + 2) % n : Math.min(n - 1, i + 2)];
      for (k = 0; k < 24; k++) { var q = catmull(p0, p1, p2, p3, k / 24); if (prev) len += d3(prev, q); S.push([q[0], q[1], q[2], len]); prev = q; }
    }
    var last = loop ? S[0] : pts[n - 1]; len += d3(prev, last); S.push([last[0], last[1], last[2], len]);
    return { S: S, len: len, loop: !!loop, pts: pts };
  }
  var RP = [0, 0, 0];
  function railPos(R, s, out) {
    var S = R.S, lo = 0, hi = S.length - 1;
    out = out || [0, 0, 0];
    if (R.loop) s = ((s % R.len) + R.len) % R.len;
    else if (s < 0 || s > R.len) {   // past either end of an open route: carry straight on
      var e0 = s < 0 ? S[0] : S[hi - 1], e1 = s < 0 ? S[1] : S[hi], base = s < 0 ? e0 : e1, k = (s < 0 ? s : s - R.len) / ((e1[3] - e0[3]) || 1);
      out[0] = base[0] + (e1[0] - e0[0]) * k; out[1] = base[1] + (e1[1] - e0[1]) * k; out[2] = base[2] + (e1[2] - e0[2]) * k;
      return out;
    }
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (S[m][3] <= s) lo = m; else hi = m; }
    var a = S[lo], b = S[hi], f = (s - a[3]) / ((b[3] - a[3]) || 1);
    out[0] = a[0] + (b[0] - a[0]) * f; out[1] = a[1] + (b[1] - a[1]) * f; out[2] = a[2] + (b[2] - a[2]) * f;
    return out;
  }
  function frame(R, s) {   // the frame at a distance: position, forward / right / up, heading and climb
    var p = railPos(R, s - 1.5, [0, 0, 0]), q = railPos(R, s + 1.5, RP);
    var fx = q[0] - p[0], fy = q[1] - p[1], fz = q[2] - p[2], l = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
    fx /= l; fy /= l; fz /= l;
    var hl = Math.sqrt(fz * fz + fx * fx) || 1, rx = fz / hl, rz = -fx / hl;   // right = up x forward, kept level
    var ux = fy * rz, uy = fz * rx - fx * rz, uz = -fy * rx;                   // up = forward x right
    var c = railPos(R, s, [0, 0, 0]);
    return { x: c[0], y: c[1], z: c[2], fx: fx, fy: fy, fz: fz, rx: rx, ry: 0, rz: rz, ux: ux, uy: uy, uz: uz, yaw: Math.atan2(fx, fz), pitch: Math.atan2(fy, hl) };
  }
  function bankAt(R, s) { var a = frame(R, s - 24).yaw, b = frame(R, s + 24).yaw; return clamp(wrapA(b - a) / 48 * 26, -0.55, 0.55); }
  function local(F, ox, oy, fwd) {   // rail-local offsets -> world
    fwd = fwd || 0;
    return { x: F.x + F.rx * ox + F.ux * oy + F.fx * fwd, y: F.y + F.ry * ox + F.uy * oy + F.fy * fwd, z: F.z + F.rz * ox + F.uz * oy + F.fz * fwd };
  }
  function dirOf(yaw, pitch) { var cp = Math.cos(pitch); return { x: Math.sin(yaw) * cp, y: Math.sin(pitch), z: Math.cos(yaw) * cp }; }

  // ---------------------------------------------------------------- the camera: world -> camera space -> screen
  function newCam() { return { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, cy: 1, sy: 0, cp: 1, sp: 0, cr: 1, sr: 0 }; }
  function camTrig(c) { c.cy = Math.cos(c.yaw); c.sy = Math.sin(c.yaw); c.cp = Math.cos(c.pitch); c.sp = Math.sin(c.pitch); c.cr = Math.cos(c.roll); c.sr = Math.sin(c.roll); }
  function view(W, x, y, z, out) {
    var c = W.cam, dx = x - c.x, dy = y - c.y, dz = z - c.z;
    var x1 = dx * c.cy - dz * c.sy, z1 = dx * c.sy + dz * c.cy;
    var y2 = dy * c.cp - z1 * c.sp, z2 = dy * c.sp + z1 * c.cp;
    out = out || [0, 0, 0];
    out[0] = x1 * c.cr - y2 * c.sr; out[1] = x1 * c.sr + y2 * c.cr; out[2] = z2;
    return out;
  }
  var TMP = [0, 0, 0];
  function project(W, x, y, z) {
    view(W, x, y, z, TMP);
    if (TMP[2] < NEAR) return null;
    var f = W.focal || FOCAL;
    return { x: CX + TMP[0] / TMP[2] * f, y: CY - TMP[1] / TMP[2] * f, z: TMP[2] };
  }

  // ---------------------------------------------------------------- a new game
  function newWorld(speed, seed, chapter, opts) {
    if (!SPEEDS[speed]) speed = 1;
    if (seed == null) seed = (Math.random() * 4294967296) >>> 0;
    opts = opts || {};
    var sp = SPEEDS[speed];
    var W = {
      speed: speed, sp: sp, seed: seed, rnd: rng(seed), t: 0, score: 0, shields: sp.shields, lives: sp.lives, chap: 0, stage: 1,
      phase: 'brief', phaseT: 0, mode: 'rail', view: opts.view === 'cockpit' ? 'cockpit' : 'chase', warshipFree: opts.warship === 'free',
      aim: { x: CX, y: CY, vx: 0, vy: 0 }, cam: newCam(), focal: FOCAL, touchA: null,
      rail: null, s: 0, pace: 3, paceMul: 1, v: 0, pk: 0.3, gauge: 1, gaugeLock: false, boosting: false, braking: false,
      ox: 0, oy: 0, vox: 0, voy: 0, roll: 0, bank: 0, rollT: 0, rollDir: 1, rollCD: 0, yawRate: 0, pitchRate: 0, oob: false, lane: 0,
      ctrl: 'mouse', steerMode: 'cursor', aimYaw: 0, aimPitch: 0, flipT: 0, flipCD: 0, flipOut: 0, flipP0: 0, flipOffY: 0, flipOffP: 0, _in: {}, ascending: false, alt: 0, calm: 0,
      ship: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, vx: 0, vy: 0, vz: 0 },
      objs: [], eshots: [], shots: [], rockets: [], locks: [], altHeld: 0, salvo: null,
      fx: [], events: [], banner: null, tally: [], gap: 0, rk: 0, rkSide: 1,
      chain: 0, chainT: 0, mult: 1, ms: null, ct: 0, cue: [], checkpoint: 0, checkpoints: [], scrapeT: 0,
      warden: null, carrier: null, gensLeft: 0, finale: 0, hitT: 0, crashT: 0, shake: 0, freeze: 0, over: false, demo: false, done: false, results: [],
      score0: 0, radio: null, radioCD: 0, mercyT: 0, hurtFrom: null, slowT: 0, tallyHint: '', volleys: 0, volleyHit: 0,
      helm: { x: CX, y: CY, vx: 0, vy: 0 }, aimOff: { x: 0, y: 0 }, split: false, boostK: 0, brakeK: 0, bombs: 0, bombT: 0, bombsLive: []
    };
    W.introOn = !!opts.intro;   // (v31) the opening scene, before the first briefing - the real game asks for it; tests and tools do not
    camTrig(W.cam);
    startChapter(W, clamp((chapter || 1) - 1, 0, CHAPTERS.length - 1));
    return W;
  }
  function say(W, t) { W.events.push({ say: t }); }
  function banner(W, text, sub, dur, small) { W.banner = { text: text, sub: sub || '', t: 0, dur: dur || 150, small: !!small }; }   // small: one line high up, off the action
  function radio(W, id) {   // a line from SANDERLING, Harbourlight's controller (the owner's choice, 28 Oct): a caption for a few seconds; one at a time, a more urgent one can cut in
    var R = RADIO[id]; if (!R || W.demo) return;
    if (W.radio && W.radioCD > 0 && R[0] <= W.radio.pri) return;
    W.radio = { id: id, text: R[1], pri: R[0], t: 0, dur: 210, who: R[2] || '' }; W.radioCD = 360;
    W.events.push('radio'); say(W, (R[2] ? titleCase(R[2]) : 'Sanderling') + ': ' + R[1].toLowerCase());
  }
  function radioLater(W, id, steps) { var Q = W.radioQ = W.radioQ || []; Q.push({ at: W.t + steps, id: id }); Q.sort(function (a, b) { return a.at - b.at; }); }   // (v31: kept in time order)   // (v22) a reply, after the line before it
  function radioQueue(W) {
    var Q = W.radioQ; if (!Q || !Q.length || Q[0].at > W.t || (W.radio && W.radio.t < W.radio.dur - 30)) return;
    var q = Q.shift(), R = RADIO[q.id]; if (!R || W.phase !== 'play') return;
    W.radio = null; W.radioCD = 0; radio(W, q.id);
  }
  function setPhase(W, p) { W.phase = p; W.phaseT = 0; }
  function fx(W, e) { W.fx.push(e); if (W.fx.length > 400) W.fx.splice(0, W.fx.length - 400); }
  function chapter(W) { return CHAPTERS[W.chap]; }
  function shakeIt(W, k) { W.shake = Math.min(1, W.shake + k); }

  function startChapter(W, i) {
    var C = CHAPTERS[i];
    W.chap = i; W.stage = C.n; W.mode = C.id === 'warship' && W.warshipFree ? 'free' : C.mode; W.pk = 0.3; W.checkpoint = 0; W.ct = 0; W.finale = 0; W.esc = null; W.wideCam = null; W.look = 0; W.lookP = 0; W.rushT = 0; W.wsBuilt = false; W.ascending = false; W.alt = 0;   // (the warship: a set path, or free flight - a setting)
    W.score0 = W.score; W.lives0 = W.lives; W.mill = null; W.outrun = null; W.radio = null; W.radioCD = 0; W.radioQ = []; W.tallyHint = ''; W.bombUsed = false; W.locked = false;   // (the medal is judged on this chapter's score alone)
    W.bombs = W.sp.bombs;
    W.ms = { shots: 0, hits: 0, kills: 0, lost: 0, gates: 0, gatesAll: 0, drones: 0, dronesAll: 0, turrets: 0, turretsAll: 0, gens: 0, salvos: 0, warden: 0, gun: 0, pk: {} };
    W.cpMs = { gates: 0, gatesAll: 0, turrets: 0, turretsAll: 0 }; W.waveT = 140; W.waveN = 0;
    W.objs = [];
    build(W);
    setPhase(W, 'brief'); storyInit(W);
    if (i === 0 && W.introOn && !W.introDone) { W.introDone = true; setPhase(W, 'logo'); W.events.push('logo'); }   // (v33) the title first, then the theft
    W.events.push('brief'); say(W, 'Chapter ' + C.n + ': ' + titleCase(C.name) + '. ' + C.say + ' Press fire when you are ready.');
  }
  function build(W, from) {   // the chapter's route or arena, obstacles and timetable (from = a checkpoint to start at)
    var C = chapter(W), ms = W.ms, ga = ms.gatesAll, da = ms.dronesAll, ta = ms.turretsAll;
    W.rnd = rng(W.seed + W.chap * 7919);
    W.eshots = []; W.shots = []; W.rockets = []; W.locks = []; W.altHeld = 0; W.salvo = null; W.banner = null; W.tally = []; W.bombsLive = []; W.bombT = 0;
    W.ox = 0; W.oy = 0; W.vox = 0; W.voy = 0; W.roll = 0; W.bank = 0; W.scrapeT = 0; W.rollT = 0; W.rollCD = 0; W.gauge = 1; W.gaugeLock = false; W.keyThr = 0; W.sonic = false; W.supT = 0; W.mach = 0;
    W.rk = W.sp.rockets; W.warden = null; W.paceMul = 1; W.yawRate = 0; W.pitchRate = 0; W.lane = 0; W.flipT = 0; W.flipCD = 0; W.flipOut = 0; W.mercyT = 0; W.hurtFrom = null; W.slowT = 0;
    if (C.id === 'valley') {
      W.objs = []; W.cue = [];
      buildValley(W);
      if (from) { ms.gatesAll = ga; ms.dronesAll = da; ms.turretsAll = ta; }
      if (from != null && W.cpMs) { ms.gates = W.cpMs.gates; ms.gatesAll = W.cpMs.gatesAll; ms.turrets = W.cpMs.turrets; ms.turretsAll = W.cpMs.turretsAll; }   // (v20: as they were at the checkpoint)
      W.s = Math.max(from || 0, 60); W.v = W.pace * W.pk;
      W.objs = W.objs.filter(function (o) { return o.rs == null || o.rs > W.s + 60; });
      W.cue = W.cue.filter(function (c) { return c.at > W.s + 1; });
    } else if (C.id === 'shoals') { W.objs = []; W.cue = []; buildShoals(W); W.s = 60; W.v = W.pace * W.pk; }
    else buildWarship(W);
    place(W); camera(W, true);
  }

  // ---------------------------------------------------------------- chapter 1: the valley
  function secVal(k, table) {   // a value that changes section by section, blended across each boundary
    for (var i = table.length - 1; i > 0; i--) if (k >= table[i][0] - 0.012) { var f = smooth(table[i][0] - 0.012, table[i][0] + 0.012, k); return table[i - 1][1] + (table[i][1] - table[i - 1][1]) * f; }
    return table[0][1];
  }
  // the valley (28 Oct, v18; the owner: "seems quite simple ... a lot more detail ... different routes and going up and down, down into the valley,
  // and then ... you go up ... rocks ... tighter squeezes"; and longer, and faster). A journey now: the run-in; THE NARROWS (squeezes, rockfalls to
  // hop); THE DROP, a dry waterfall into a deep gorge with a river at the bottom and the first FORK (a tight slot, or the river and its guns); the
  // TUNNEL, climbing through the rock; out of the canyon altogether onto the open desert among THE MESAS (your own way through, guns on the tops);
  // THE PLUNGE back in; THE DIVIDE (the second fork); the squadrons over a floor that rises and falls; the basin and the Gaoler; the break-out.
  // The land is laid out by distance ahead (f = z / 260, the route's control points): how deep the floor lies, how wide the canyon is, where it
  // squeezes. The route rides above the floor - it lags behind it over a drop (you fly out over the edge, then dive) and leads it up a climb.
  var VN = 170;
  var VSEC = { lesson: 0, narrows: 9 / VN, drop: 21.4 / VN, gorge: 23 / VN, tunnel: 43 / VN, rise: 56 / VN, mesa: 61 / VN, plunge: 85.5 / VN, divide: 89 / VN, squad: 108 / VN, boss: 135 / VN, out: 160 / VN };
  // how far below the ordinary canyon floor the floor lies (the plateau is 70 above that floor; -69 is level with it: no walls at all)
  var DEEP = [[0, 0], [9, 0], [21.45, 22], [21.8, 168], [30, 158], [37, 150], [47, 150], [56, 40], [61.5, -69], [85.6, -69], [86.2, -62], [87.1, 58], [89, 50], [108, 30], [112, 0], [116.5, 58], [121, 12], [126, 66], [131, 18], [135, 0]];
  var WID = [[0, 140], [7.5, 140], [9.5, 96], [20.5, 96], [22, 112], [28.4, 112], [29.4, 172], [37.2, 172], [38.4, 112], [42.6, 112], [43.6, 74], [55.5, 74], [58.5, 150], [61.5, 340], [82.5, 340], [85, 150], [86.5, 116], [89, 116], [89.6, 236], [107.4, 236], [108.4, 150], [134.5, 150], [136, 196]];
  var BEND = [[0, 60], [7.5, 60], [9.5, 112], [20.5, 112], [22.5, 80], [28, 80], [29.5, 34], [37, 34], [38.5, 88], [42.5, 88], [43.5, 30], [55.5, 30], [58, 50], [61.5, 90], [82, 90], [85, 50], [89, 60], [107, 60], [108.5, 96], [134, 96], [136, 44], [159, 44], [161, 70]];
  var SQZ = [[13.6, 0.5, 48], [18.2, 0.45, 44], [27.6, 0.5, 50], [40.4, 0.45, 50], [114.6, 0.45, 52], [120.3, 0.5, 46], [131.6, 0.4, 44]];   // SQUEEZES: where, half their length, how wide
  function keyed(T, f) { for (var i = 1; i < T.length; i++) if (f < T[i][0]) { var a = T[i - 1], b = T[i]; return a[1] + (b[1] - a[1]) * smooth(a[0], b[0], f); } return T[T.length - 1][1]; }
  function sqzAt(f) { var w = 1e9; for (var i = 0; i < SQZ.length; i++) { var q = SQZ[i], d = Math.abs(f - q[0]) - q[1]; if (d < 0.5) w = Math.min(w, q[2] + (1 - smooth(0.5, 0, d)) * 400); } return w; }
  function sAtZ(R, z) {   // the distance along a route at which it reaches a distance ahead
    var S = R.S, lo = 0, hi = S.length - 1;
    if (z <= S[0][2]) return 0; if (z >= S[hi][2]) return R.len;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (S[m][2] <= z) lo = m; else hi = m; }
    var a = S[lo], b = S[hi]; return a[3] + (b[3] - a[3]) * (z - a[2]) / ((b[2] - a[2]) || 1);
  }
  function buildValley(W) {
    var r = W.rnd, pts = [], ground = [], n = VN, i;
    var deepAt = function (f) { return keyed(DEEP, f); }, liftAt = function (f) { return 10 * smooth(60, 62.5, f) * (1 - smooth(85, 86.5, f)); };   // (over the open desert the route flies a little higher)
    for (i = 0; i < n; i++) {   // a winding valley: easy, then tight bends; straighter through the forks, the tunnel and the boss's basin; sweeping over the desert
      var k = i / n, bend = keyed(BEND, i);
      var x = bend * Math.sin(i * 0.47 + 0.6) + bend * 0.52 * Math.sin(i * 1.13 + 2) + (r() - 0.5) * 16;
      var y = 16 * Math.sin(i * 0.29), rd = Math.min(deepAt(i), deepAt(i - 0.8) + 8, deepAt(i + 0.8) + 8);   // (rd: the route stays above every floor near it)
      ground.push(y);   // the land's own height (the plateau is 56 above it, the ordinary canyon floor 14 below; the route climbs away from it at the end)
      pts.push([x, y - rd + liftAt(i) + (k > VSEC.out ? Math.pow((k - VSEC.out) / (1 - VSEC.out), 2) * 170 : 0), i * 260]);
    }
    var gAt = function (z) { var f = clamp(z / 260, 0, n - 1), j = Math.min(n - 2, Math.floor(f)), t = f - j, a = ground[Math.max(0, j - 1)], b = ground[j], c = ground[j + 1], d = ground[Math.min(n - 1, j + 2)];
      return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t); };
    var floorW = function (z) { return gAt(z) - 14 - deepAt(z / 260); };   // the canyon floor's height in the world
    W.rail = makeRail(pts, false);
    for (var pass = 0; pass < 4; pass++) {   // where the curve between points sags too near the floor (the bottom of a dive), lift the points there
      var lifted = false, SS = W.rail.S;
      for (i = 1; i < n - 1; i++) {
        var worst = -99;
        for (var q = -14; q <= 14; q++) { var sp2 = SS[clamp(i * 24 + q, 0, SS.length - 1)]; worst = Math.max(worst, floorW(sp2[2]) - sp2[1]); }
        if (worst > -14) { pts[i][1] += worst + 14.5; lifted = true; }
      }
      if (!lifted) break;
      W.rail = makeRail(pts, false);
    }
    W.pace = 3.5 * W.sp.pace;
    var Rl = W.rail, tmp = [0, 0, 0], fz = function (s2) { return railPos(Rl, s2, tmp)[2] / 260; }, sAtF = function (f) { return sAtZ(Rl, f * 260); };
    var at = function (k2) { return sAtF(k2 * n); }, sec = {};   // (a section's start, as a distance along the route)
    Object.keys(VSEC).forEach(function (k2) { sec[k2] = at(VSEC[k2]); });
    var T0 = sec.tunnel + 320, T1 = sec.rise - 260, RG = [];
    function ridgeDef(f0, f1, xf, w, top, tags) { var g = { s0: sAtF(f0), s1: sAtF(f1), x: xf, w: w, top: top, tags: tags }; RG.push(g); return g; }
    // the first fork, in the gorge: a tall fin of rock - the left-hand slot pinches twice; the right-hand channel is the river's
    var FA = ridgeDef(29.6, 37, function (s2) { var f = fz(s2); return -20 + 5 * Math.sin(s2 / 210) - 9 * Math.exp(-Math.pow((f - 31.4) / 0.35, 2)) - 9 * Math.exp(-Math.pow((f - 34.6) / 0.35, 2)); }, 15, 150, ['< SLOT X2', 'RIVER >']);
    var DV = ridgeDef(91, 106.4, function (s2) { return 7 * Math.sin(s2 / 240); }, 17, 0, ['< TIGHT X2', 'GUNS >']);   // the divide, as it was
    W.valley = {
      width: function (s2) { var f = fz(s2), w = keyed(WID, f); if (f > 9.5 && f < 20.5) w += 9 * Math.sin(s2 / 300); w = Math.min(w, sqzAt(f)); if (f > 160) w += (f - 160) / 10 * 180; return w; },
      floorAt: function (s2) { var p = railPos(Rl, s2, tmp), y = p[1]; return floorW(p[2]) - y; },   // (below the route: the floor, the rim - as offsets from the route)
      rimAt: function (s2) { var p = railPos(Rl, s2, tmp), y = p[1]; return gAt(p[2]) + 56 - y; },
      wallAt: function (s2) { return 70 + deepAt(fz(s2)); },   // (how high the walls stand)
      openAt: function (s2) { var f = fz(s2); return smooth(60, 62.5, f) * (1 - smooth(84.5, 85.6, f)); },   // (out on the open desert)
      lean: function (s2, h) { return 0.16 * Math.min(h, Math.max(0, deepAt(fz(s2)))); },   // (the gorge's dark inner walls lean back as they rise)
      fz: fz, sAtF: sAtF, sec: sec, floorW: floorW, deepAt: deepAt,
      wall: 70, floor: -14, tunnel: [T0, T1], roof: 22,
      ridges: RG,
      ridge: function (s2) {   // the rock that splits the canyon in two: its middle (across) and half-width, or null
        for (var j = 0; j < RG.length; j++) { var g = RG[j]; if (s2 >= g.s0 && s2 <= g.s1) return { x: g.x(s2), w: g.w * Math.min(smooth(g.s0, g.s0 + 160, s2), 1 - smooth(g.s1 - 160, g.s1, s2)), top: g.top }; }
        return null;
      },
      spanAt: function (s2, m) { for (var j = 0; j < RG.length; j++) { var g = RG[j]; if (s2 > g.s0 - m && s2 < g.s1 + m) return g; } return null; },
      ridgeSpan: [DV.s0, DV.s1],
      squeezes: SQZ.map(function (q) { return { s0: sAtF(q[0] - q[1]), s1: sAtF(q[0] + q[1]), w: q[2] }; }),
      river: [[sAtF(23.4), sAtF(29.3)], [sAtF(37.3), sAtF(42.9)]],   // (a river down the gorge: the renderer's)
      ground: gAt
    };
    var V = W.valley, s, hw;
    function gate(s2, lx, ly, bonus) { W.objs.push({ k: 'gate', rs: s2, lx: lx, ly: ly, gr: 9, bonus: bonus || 1, alive: true, r: 0 }); }   // (v20: counted as you pass it - only on your side of a fork)
    function drone(s2, lx, ly, armed) { W.objs.push({ k: 'drone', rs: s2, lx: lx, ly: ly, r: 3.6, hp: 1, alive: true, bob: r() * 6, armed: !!armed, fireT: 60 + r() * 120, burst: 0 }); W.ms.dronesAll++; }
    // the guns (28 Oct, the owner: "focus on shooting the things on the top of the valley and on the sides"): RIM GUNS up on a pylon right at the
    // lip, where you can see them from down in the canyon; BUNKERS set into the canyon walls, half way up, beside you as you pass (in the deep
    // gorge, where the rim is out of sight, only bunkers - higher up its walls); GUNS on the tops of the buttes out on the desert
    function bunker(s2, side, hi) { var h = 28 + r() * 14 + (hi ? r() * 22 : 0); W.objs.push({ k: 'turret', mount: 'wall', rs: s2, lx: side * (V.width(s2) / 2 + 3 + V.lean(s2, h)), ly: V.floorAt(s2) + h, side: side, r: 6.5, hp: 3, alive: true, fireT: 40 + r() * 90, burst: 0 }); }
    function turret(s2, side) { if (V.wallAt(s2) > 86) { bunker(s2, side, V.wallAt(s2) > 115); return; } W.objs.push({ k: 'turret', mount: 'rim', rs: s2, lx: side * (V.width(s2) / 2 + 18), ly: V.rimAt(s2) + 4, side: side, r: 6.5, hp: 2, alive: true, fireT: 30 + r() * 90, burst: 0 }); }   // (where the rim is too high to see from the floor, a bunker instead - no gun shoots at you from out of sight)
    function arch(s2, lx, aw, y0) { W.objs.push({ k: 'arch', rs: s2, lx: lx || 0, ly: 0, aw: aw || 999, y0: y0 != null ? y0 : 1 + r() * 4, alive: true, r: 0 }); }
    function pillar(s2, lx) { W.objs.push({ k: 'pillar', rs: s2, lx: lx, ly: 0, pr: 6 + r() * 3, fl: V.floorAt(s2), alive: true, r: 0 }); }
    // ROCKFALLS: a heap of fallen boulders across the floor (or part of it) - hop over it; skim it low for points
    function rockfall(f2, lx, w, h) { var s2 = sAtF(f2); W.objs.push({ k: 'rockfall', rs: s2, lx: lx, ly: V.floorAt(s2), w: w, h: h, alive: true, r: 0 }); }
    // the desert's BUTTES: a tower of layered rock standing on the plain - round it, or over a low one
    function butte(s2, lx, pr, bh, gun) {
      var fl = V.floorAt(s2); W.objs.push({ k: 'butte', rs: s2, lx: lx, ly: fl, pr: pr, bh: bh, v: Math.floor(r() * 4), alive: true, r: 0 });
      if (gun) { W.objs.push({ k: 'turret', mount: 'rim', top: true, rs: s2, lx: lx, ly: fl + bh + 2, side: lx < 0 ? -1 : 1, r: 6.5, hp: 2, alive: true, fireT: 30 + r() * 90, burst: 0 }); }
    }
    function natArch(s2, lx, span, h) { var fl = V.floorAt(s2); W.objs.push({ k: 'natarch', rs: s2, lx: lx, ly: fl, span: span, h: h, alive: true, r: 0 }); gate(s2, lx, fl + h * 0.42, 3); }   // a rock arch on the plain, a gold gate under it
    var clear = function (s2, m) { return !V.squeezes.some(function (q) { return s2 > q.s0 - m && s2 < q.s1 + m; }) && !W.objs.some(function (o) { return (o.k === 'rockfall' || o.k === 'natarch') && Math.abs(o.rs - s2) < m; }); };
    var chan = function (s2, side) { var R2 = V.ridge(s2) || { x: 0, w: 0 }, half = V.width(s2) / 2; return side < 0 ? { c: (R2.x - R2.w - half) / 2, w: (R2.x - R2.w + half) / 2 } : { c: (R2.x + R2.w + half) / 2, w: (half - R2.x - R2.w) / 2 }; };
    // the run-in: gates and drones, wide and easy - and the first pair of fighters, head-on, about 8 seconds in
    for (s = 620; s < sec.narrows; s += 360 + r() * 140) { hw = V.width(s) / 2; gate(s, (r() * 2 - 1) * hw * 0.35, 2 + r() * 12); if (r() < 0.7) drone(s + 170, (r() * 2 - 1) * hw * 0.5, 4 + r() * 14, false); }
    cue(W, 1500, 'headon', 2); W.cue[W.cue.length - 1].radio = 'v_first';
    // THE NARROWS: arches and pillars, two SQUEEZES (the walls close in - the second has a rock bridge over it, a gold gate under: a keyhole), ROCKFALLS
    rockfall(11.6, 0, 999, 11); rockfall(16.2, -22, 64, 13); rockfall(20, 20, 60, 12);
    for (s = sec.narrows + 300; s < sec.drop - 260; s += 250 + r() * 110) {
      if (!clear(s, 130)) continue;
      hw = V.width(s) / 2 - 12;
      if (r() < 0.45) arch(s); else pillar(s, (r() * 2 - 1) * hw * 0.8);
      if (r() < 0.35) gate(s + 125, (r() * 2 - 1) * hw * 0.6, r() * 8);
      if (r() < 0.25) drone(s + 70, (r() * 2 - 1) * hw * 0.6, 6 + r() * 10, true);
    }
    var kq = V.squeezes[1], km = (kq.s0 + kq.s1) / 2; arch(km, 0, 999, 5); gate(km + 3, 0, -5, 3);
    turret(sec.narrows + 700, -1); bunker(sec.narrows + 1250, 1); turret(sec.narrows + 1800, 1); bunker(sec.narrows + 2500, -1);
    cue(W, sec.narrows + 350, 'headon', 2);
    // THE DROP: the floor falls away - a dry waterfall - and the route dives after it, into the gorge: gold gates down the dive
    [21.95, 22.4, 22.8].forEach(function (f2, j) { gate(sAtF(f2), (r() * 2 - 1) * 12, 4 - j * 3, 2); });
    // THE GORGE: deep and winding, a river at the bottom, bunkers set high in its dark walls; Shrikes head-on, then diving down into it
    for (s = sec.gorge + 500, i = 0; s < sec.tunnel - 300; s += 460 + r() * 160, i++) { if (V.spanAt(s, 80)) continue; bunker(s, i % 2 ? 1 : -1, true); }
    for (s = sec.gorge + 300; s < sec.tunnel - 200; s += 380 + r() * 200) { if (V.spanAt(s, 140) || !clear(s, 120)) continue; hw = V.width(s) / 2 - 12; if (r() < 0.55) gate(s, (r() * 2 - 1) * hw * 0.5, r() * 10); else drone(s, (r() * 2 - 1) * hw * 0.5, 6 + r() * 10, r() < 0.5); }
    rockfall(41.3, 0, 999, 10);
    cue(W, sec.gorge + 250, 'headon', 3); cue(W, FA.s1 + 150, 'dive', 3); cue(W, FA.s1 + 900, 'fetch', 2);
    // the first FORK: left, the slot (gold gates, double points; it pinches twice; a rock bridge to duck under); right, the river - bunkers and fighters
    var sm = (FA.s0 + FA.s1) / 2;
    for (s = FA.s0 + 260; s < FA.s1 - 160; s += 210 + r() * 70) {
      var Lc = chan(s, -1), Rc = chan(s, 1);
      gate(s, Lc.c + (r() * 2 - 1) * Lc.w * 0.25, Math.abs(s - sm) < 90 ? -5 : r() * 8, 2);
      if (r() < 0.45) drone(s + 100, Rc.c + (r() * 2 - 1) * Rc.w * 0.5, 6 + r() * 10, true);
    }
    arch(sm, chan(sm, -1).c, chan(sm, -1).w + 3, 4);
    for (s = FA.s0 + 400; s < FA.s1 - 200; s += 520) bunker(s, 1, true);
    W.cue.push({ at: FA.s0 + 500, wave: 'headon', n: 2, lx: chan(FA.s0 + 1200, 1).c, spread: 14 });
    // the tunnel: pillars of rock to weave round, gates, drones, in the dark - climbing all the way
    for (s = T0 + 260; s < T1 - 200; s += 280 + r() * 120) { hw = V.width(s) / 2 - 10; var pl = r() < 0.5; if (pl) pillar(s, (r() * 2 - 1) * hw * 0.7); else gate(s, (r() * 2 - 1) * hw * 0.5, r() * 6); if (pl || r() < 0.4) drone(s + 140, (r() * 2 - 1) * hw * 0.5, 3 + r() * 6, false); }   // (v20: no bare run of pillars)
    [0, 1].forEach(function (j) { drone(T1 + 60 + j * 150, (j ? 1 : -1) * 18, 10 + j * 6, j === 1); });   // (and two at its mouth)
    // THE RISE: out of the tunnel, still climbing - the floor comes up and the walls sink until you are out on top
    cue(W, sec.rise + 200, 'headon', 3); turret(sec.rise + 700, -1); turret(sec.rise + 1000, 1);
    for (s = sec.rise + 300; s < sec.mesa - 100; s += 300) gate(s, (r() * 2 - 1) * 20, 4 + r() * 10);
    // THE MESAS: the open desert, low among buttes and spires - your own way through. Guns on some of the butte tops; rock arches with a gold gate
    // under each; Shrikes from every side. At the end two buttes funnel you back to the middle for the plunge.
    var m0 = sec.mesa + 300, m1 = sec.plunge - 700, side2 = 1;
    [0.22, 0.5, 0.78].forEach(function (q) { natArch(m0 + (m1 - m0) * q, (r() * 2 - 1) * 40, 52 + r() * 10, 36 + r() * 8); });
    for (s = m0; s < m1; s += 400 + r() * 220) {
      if (!clear(s, 190)) continue;
      side2 = -side2; var w2 = V.width(s) / 2 - 20, pr = 16 + r() * 18;
      butte(s, side2 * (26 + r() * (w2 - 46)), pr, 46 + r() * 90, r() < 0.45);
      if (r() < 0.5) pillar(s + 170 + r() * 60, -side2 * (20 + r() * 60));
      if (r() < 0.4) drone(s + 120, (r() * 2 - 1) * 60, 6 + r() * 16, true);
    }
    butte(m1 + 260, -92, 30, 120, false); butte(m1 + 300, 92, 30, 110, true);
    // (v28, 29 Oct; the owner: "a village or farm the Rooks are attacking, which you could save for bonus points") A FARM beside the way through,
    // Rook raiders hovering over it, firing down. Shoot all of them before you pass and it is saved; leave one and it burns. Beside the lane, so you
    // never fly into it: the raiders are where you can reach them.
    W.farm = null;
    for (var fs2 = m0 + 1500; fs2 < m1 - 500 && !W.farm; fs2 += 160) {
      var fsd = fs2 % 320 < 160 ? 1 : -1, fhw = V.width(fs2) / 2;
      if (W.objs.some(function (o) { return (o.k === 'butte' || o.k === 'natarch' || o.k === 'pillar') && Math.abs(o.rs - fs2) < 260 && o.lx * fsd > fhw - 70; })) continue;
      W.farm = { k: 'farm', rs: fs2, lx: fsd * (fhw + 75), ly: V.floorAt(fs2), side: fsd, alive: true, r: 0, done: false, raiders: [] };
      W.objs.push(W.farm);
      [-70, -24, 24, 70].forEach(function (dz, j) {
        W.farm.raiders.push({ k: 'drone', raid: true, rs: fs2 + dz, lx: fsd * (fhw + 26 + r() * 40), ly: V.floorAt(fs2) + 40 + r() * 14, r: 5.4, hp: 2, alive: true, bob: r() * 6, armed: j % 2 === 0, fireT: 90 + r() * 120, burst: 0 });
        W.ms.dronesAll++;
      });
      W.farm.raiders.forEach(function (o) { W.objs.push(o); });
      W.cue.push({ at: fs2 - 1150, say: ['A FARM UNDER ATTACK', 'DRIVE THE PACK OFF'], small: true, radio: 'v_farm' });
    }
    [[400, 'vee', 3], [1200, 'pass', 3], [2000, 'howl', 4], [2800, 'heavy', 1], [3600, 'pass', 4], [4400, 'fetch', 2], [5200, 'headon', 4]].forEach(function (w) { cue(W, sec.mesa + w[0], w[1], w[2]); });
    // THE PLUNGE: a crack opens in the desert and you dive back into the canyon - gold gates down it
    [86.6, 87.25, 87.8].forEach(function (f2, j) { gate(sAtF(f2), (r() * 2 - 1) * 12, 6 - j * 4, 2); });
    // THE DIVIDE: the left-hand channel is tight, with double-points gates; the right-hand one has the guns
    for (s = DV.s0 + 280; s < DV.s1 - 150; s += 230 + r() * 90) {
      var L2 = chan(s, -1), Rt = chan(s, 1), roll = r();
      if (roll < 0.4) arch(s, L2.c, L2.w + 3, 1 + r() * 3);
      else if (roll < 0.7) pillar(s, L2.c + (r() * 2 - 1) * L2.w * 0.4);
      gate(s + 115, L2.c + (r() * 2 - 1) * L2.w * 0.35, r() * 10, 2);
      if (r() < 0.4) drone(s + 60, L2.c, 6 + r() * 8, false);
      if (r() < 0.55) { if (r() < 0.35) bunker(s + 40, 1); else turret(s, 1); }   // (the right-hand channel: guns on its rim and in its wall)
      if (r() < 0.3) drone(s + 90, Rt.c + (r() * 2 - 1) * Rt.w * 0.5, 8 + r() * 10, true);
    }
    W.cue.push({ at: DV.s0 + 1400, wave: 'headon', n: 3, lane: true, spread: 12 }); cue(W, DV.s0 + 2600, 'pass', 2);   // (v20: in whichever channel you took)
    [0, 1, 2].forEach(function (j) { var sj = DV.s0 + 1150 + j * 120, Lj = chan(sj, -1); drone(sj, Lj.c + (j - 1) * Lj.w * 0.3, 8 + j * 5, j === 1); });
    // the squadrons: wave after wave - head-on, a V of three, divers from above, heavy fighters with missiles - over a floor that rises and falls,
    // with squeezes and rockfalls between (an arch just after a rockfall: up, then down). Every wave starts inside the section.
    var q0 = sec.squad;
    [[300, 'pass', 3], [900, 'vee', 3], [1600, 'howl', 4], [2200, 'dive', 3], [2800, 'heavy', 1], [3400, 'fetch', 3], [4000, 'headon', 4], [4600, 'howl', 4], [5200, 'heavy', 1], [5800, 'cross', 3], [6300, 'fetch', 2]].forEach(function (w) { cue(W, q0 + w[0], w[1], w[2]); });
    [[110.7, 0, 999, 10], [119.2, 24, 70, 12], [126.5, -22, 70, 12], [133, 0, 999, 10]].forEach(function (q) { rockfall(q[0], q[1], q[2], q[3]); arch(sAtF(q[0]) + 170, 0, 999, 2 + r() * 3); });
    for (s = q0 + 400; s < sec.boss - 200; s += 600 + r() * 300) { if (!clear(s, 160)) continue; if (r() < 0.6) turret(s, r() < 0.5 ? -1 : 1); else gate(s, (r() * 2 - 1) * V.width(s) * 0.25, r() * 12); }
    for (s = q0 + 900, i = 0; s < sec.boss - 400; s += 1300 + r() * 300, i++) bunker(s, i % 2 ? -1 : 1);
    // the Gaoler
    W.cue.push({ at: sec.boss + 150, boss: true });
    W.cue.push({ at: 360, say: ['THE VALLEY', 'HOLD W FOR THRUST  -  S BRAKES'], tip: 'thrust', radio: 'v_start' }, { at: sec.narrows, say: ['THE NARROWS', 'SQUEEZES AND ROCKFALLS'], cp: true, radio: 'v_narrows' },
      { at: sec.narrows + 450, radio: 'v_guns' }, { at: sec.drop - 120, say: ['THE DROP', 'DOWN INTO THE GREEN GORGE'], cp: true, radio: 'v_drop' },
      { at: FA.s0 - 700, say: ['THE FORK', 'LEFT A SLOT - RIGHT THE RIVER'], small: true, radio: 'v_forkA' }, { at: sec.tunnel, say: ['THE TUNNEL', 'IT CLIMBS - KEEP IT STEADY'], cp: true, radio: 'v_tunnel' },
      { at: sec.mesa - 200, say: ['THE HIGHLANDS', 'OPEN COUNTRY - FIND YOUR WAY THROUGH'], cp: true, radio: 'v_mesa' }, { at: sec.plunge, say: ['THE PLUNGE', 'DOWN INTO PINE CANYON'], small: true, radio: 'v_plunge' },
      { at: sec.divide, say: ['THE DIVIDE', 'PICK A SIDE'], cp: true, small: true, radio: 'v_divide' }, { at: sec.squad, say: ['THE BURNT WOODS', 'SQUADRONS INBOUND'], cp: true, radio: 'v_squad' },
      { at: sec.boss, say: ['THE SALT PAN', 'SOMETHING BIG IS COMING'], cp: true, radio: 'v_boss' }, { at: sec.out + 250, ascent: true });
    W.checkpoints = [0, sec.narrows, sec.drop - 120, sec.tunnel, sec.mesa - 200, sec.divide, sec.squad, sec.boss];
    {   // (v32) Noodle Doodles' SQUEAKY TOYS, dropped along the valley: one down the fork's tight left-hand slot, one low in the tunnel, one under a rock arch
      var toyAt = function (s2, lx, ly) { W.objs.push({ k: 'toy', rs: s2, lx: lx, ly: ly, alive: true, r: 0, t: 0, x: 0, y: 0, z: 0 }); };
      var sF = (FA.s0 + FA.s1) / 2, RF = V.ridge(sF) || { x: 0, w: 0 }; toyAt(sF, (-V.width(sF) / 2 + RF.x - RF.w) / 2, V.floorAt(sF) + 9);
      var sT = (T0 + T1) / 2; toyAt(sT, V.width(sT) / 2 * 0.5, V.floorAt(sT) + 6);
      var na = W.objs.filter(function (o) { return o.k === 'natarch'; })[1]; if (na) toyAt(na.rs + 40, na.lx, na.ly + na.h * 0.3);
      W.ms.toysAll = 3;
    }
    W.cue.sort(function (a, b) { return a.at - b.at; });
  }
  // (v20b) a gold run's share of the chapter's score at each checkpoint of the valley, and at each of her generators going down - from the test
  // pilot's runs (starrun-review/pace10.mjs), the same at every speed to within a few points
  var PACE = { valley: [0, 0.017, 0.072, 0.205, 0.259, 0.462, 0.56, 0.884], warship: [0, 0.135, 0.197, 0.268, 0.402], shoals: [0, 0.079, 0.232, 0.521, 0.632] };
  function goldPace(W, f) {
    if (!(f > 0)) return; var C = chapter(W), GL = W.mode === 'free' && C.goldFree ? C.goldFree : C.gold, gold = GL[W.speed] || GL[2];
    W.paceNote = { d: Math.round((W.score - W.score0 - gold * f) / 10) * 10, t: 0 };
  }
  // ---------------------------------------------------------------- chapter 3: THE SHOALS (28 Oct)
  // A route through broken rock, by distance like the valley. The lane is space's (a box round the path), except inside the QUARRY - a hollowed
  // asteroid: a tube whose walls you scrape (and grind into), with a fork near its far end (a rock between two shafts). ASTEROIDS: big, can't be
  // shot - fly into one and you are gone. ROCKS: smaller, shot to pieces (a big one splits); some drift across the lane. Guns sit on asteroids.
  var SSEC = { edge: 0, drift: 0.13, quarry: 0.33, scatter: 0.56, mill: 0.7, out: 0.97 };
  function buildShoals(W) {
    var r = W.rnd, L = 34000, n = Math.round(L / 320), pts = [], i;
    var tubeF = [0.385, 0.545], forkF = [0.475, 0.538];
    for (i = 0; i <= n; i++) {
      var f = i / n, calm = f > tubeF[0] - 0.03 && f < tubeF[1] + 0.02 ? 0.25 : 1;   // (straighter inside the quarry: its walls follow the route)
      pts.push([(250 * Math.sin(i * 0.105) + 120 * Math.sin(i * 0.27 + 1)) * calm, (110 * Math.sin(i * 0.07 + 2) + 50 * Math.sin(i * 0.19)) * calm, i * 320]);
    }
    W.rail = makeRail(pts, false); W.pace = 3.6 * W.sp.pace;
    var Rl = W.rail, sec = {}; Object.keys(SSEC).forEach(function (k) { sec[k] = SSEC[k] * Rl.len; });
    var T0 = tubeF[0] * Rl.len, T1 = tubeF[1] * Rl.len, F0 = forkF[0] * Rl.len, F1 = forkF[1] * Rl.len;
    var tubeAt = function (s2) {   // the quarry's tunnel: its radius here (0 outside it) - a narrow mouth, a cavern, two shafts out
      if (s2 < T0 || s2 > T1) return 0; var u = (s2 - T0) / (T1 - T0);
      return 54 + 46 * smooth(0.06, 0.2, u) * (1 - smooth(0.5, 0.6, u)) + 8 * smooth(0.6, 0.7, u) * (1 - smooth(0.94, 1, u)) + 4 * Math.sin(s2 / 90);
    };
    var RG = [{ s0: F0, s1: F1, x: function (s2) { return -8 + 4 * Math.sin(s2 / 160); }, w: 9, top: 0, tags: ['< SHAFT X2', 'CONVEYOR >'] }];
    W.valley = {
      space: true, shoals: true, sec: sec, len: Rl.len, tube: [T0, T1],
      width: function (s2) { var t = tubeAt(s2); return t ? t * 2 : 164; },
      tubeAt: tubeAt, wall: 0, floor: -48, tunnel: [-1e9, -1e9], roof: 99, squeezes: [], river: [],
      ridges: RG, ridgeSpan: [F0, F1],
      ridge: function (s2) { var g = RG[0]; if (s2 >= g.s0 && s2 <= g.s1) return { x: g.x(s2), w: g.w * Math.min(smooth(g.s0, g.s0 + 160, s2), 1 - smooth(g.s1 - 160, g.s1, s2)), top: 0 }; return null; },
      spanAt: function (s2, m) { var g = RG[0]; return s2 > g.s0 - m && s2 < g.s1 + m ? g : null; },
      ground: function () { return 0; }
    };
    var V = W.valley, s;
    function gate(s2, lx, ly, bonus) { W.objs.push({ k: 'gate', rs: s2, lx: lx, ly: ly, gr: 9, bonus: bonus || 1, alive: true, r: 0 }); }
    function drone(s2, lx, ly, armed) { W.objs.push({ k: 'drone', rs: s2, lx: lx, ly: ly, r: 3.6, hp: 1, alive: true, bob: r() * 6, armed: !!armed, fireT: 60 + r() * 120, burst: 0 }); W.ms.dronesAll++; }
    function rock(s2, lx, ly, rr, drift) { var o = { k: 'rock', rs: s2, lx: lx, ly: ly, r: rr, hp: rr < 6 ? 1 : rr < 9 ? 2 : 4, alive: true, spin: r() * 6, v: Math.floor(r() * 4) }; if (drift) { o.vlx = drift; o.vly = (r() - 0.5) * 0.3; } W.objs.push(o); return o; }
    function asteroid(s2, lx, ly, rr) { W.objs.push({ k: 'asteroid', rs: s2, lx: lx, ly: ly, r: rr, alive: true, spin: r() * 6, v: Math.floor(r() * 4) }); }
    function rockGun(s2, lx, ly, rr) {   // a gun on an asteroid: the rock beside the lane, the gun on its near face
      asteroid(s2, lx, ly, rr); var sd = lx < 0 ? 1 : -1;
      W.objs.push({ k: 'turret', mount: 'rock', rs: s2, lx: lx + sd * (rr - 2), ly: ly + 4, side: -sd, r: 6.5, hp: 2, alive: true, fireT: 40 + r() * 90, burst: 0 });
    }
    function wallGun(s2, ang) { var t = tubeAt(s2) - 4; W.objs.push({ k: 'turret', mount: 'wall', rs: s2, lx: Math.cos(ang) * t, ly: Math.sin(ang) * t, side: Math.cos(ang) < 0 ? -1 : 1, r: 6.5, hp: 3, alive: true, fireT: 40 + r() * 90, burst: 0 }); }
    var side = function () { return r() < 0.5 ? -1 : 1; };
    // THE EDGE: sparse rock, a few to break, gates to learn the lane; the first Shrikes
    for (s = 900; s < sec.drift; s += 260 + r() * 160) {
      var k = r();
      if (k < 0.45) rock(s, (r() * 2 - 1) * 40, (r() * 2 - 1) * 24, 3.5 + r() * 4);
      else if (k < 0.7) gate(s, (r() * 2 - 1) * 30, (r() * 2 - 1) * 16);
      else if (k < 0.85) drone(s, (r() * 2 - 1) * 40, (r() * 2 - 1) * 20, false);
      if (r() < 0.35) asteroid(s + 120, side() * (75 + r() * 60), (r() * 2 - 1) * 40, 18 + r() * 22);
    }
    cue(W, sec.drift * 0.45, 'headon', 2); cue(W, sec.drift * 0.8, 'pass', 3);
    // THE DRIFT: rocks crossing the lane, big ones blocking half of it, guns on the asteroids
    for (s = sec.drift + 300; s < sec.quarry - 500; s += 200 + r() * 130) {
      var k2 = r(), sd2 = side();
      if (k2 < 0.38) rock(s, -sd2 * (70 + r() * 30), (r() * 2 - 1) * 26, 4 + r() * 7, sd2 * (0.45 + r() * 0.6));   // (drifting across)
      else if (k2 < 0.58) rock(s, (r() * 2 - 1) * 45, (r() * 2 - 1) * 26, 3.5 + r() * 6);
      else if (k2 < 0.72) asteroid(s, sd2 * (22 + r() * 22), (r() * 2 - 1) * 12, 20 + r() * 12);   // (half the lane: steer round it)
      else if (k2 < 0.84) rockGun(s, sd2 * (88 + r() * 30), (r() * 2 - 1) * 30, 22 + r() * 10);
      else gate(s, (r() * 2 - 1) * 30, (r() * 2 - 1) * 18);
      if (r() < 0.5) asteroid(s + 90, side() * (90 + r() * 90), (r() * 2 - 1) * 70, 20 + r() * 30);
    }
    [[0.06, 'vee', 3], [0.36, 'howl', 4], [0.62, 'fetch', 3], [0.85, 'heavy', 1]].forEach(function (w) { cue(W, sec.drift + (sec.quarry - sec.drift) * w[0], w[1], w[2]); });
    // THE QUARRY: a huge rock looming, in through its mouth, a cavern lit by their mining rigs (guns on its walls, drones), then the fork
    for (s = T0 + 300; s < F0 - 200; s += 230 + r() * 110) {
      var u0 = r();
      if (u0 < 0.35) wallGun(s, r() * 6.283);
      else if (u0 < 0.6) drone(s, (r() * 2 - 1) * 30, (r() * 2 - 1) * 24, r() < 0.4);
      else if (u0 < 0.8) gate(s, (r() * 2 - 1) * 26, (r() * 2 - 1) * 20);
      else rock(s, (r() * 2 - 1) * 30, (r() * 2 - 1) * 20, 3.5 + r() * 3);
    }
    cue(W, T0 + (F0 - T0) * 0.45, 'headon', 3);
    for (s = F0 + 260; s < F1 - 150; s += 250 + r() * 80) {   // the fork: left, the tight shaft (double gates); right, the conveyor (guns, Shrikes)
      var Rg = V.ridge(s) || { x: 0, w: 0 }, half = tubeAt(s), lc = (Rg.x - Rg.w - half) / 2, rc = (Rg.x + Rg.w + half) / 2;
      gate(s + 90, lc + (r() * 2 - 1) * 5, (r() * 2 - 1) * 14, 2);
      if (r() < 0.6) wallGun(s, r() < 0.5 ? -0.25 : 0.25);   // (the conveyor's side: right)
      if (r() < 0.3) drone(s + 140, rc, (r() * 2 - 1) * 18, true);
    }
    W.cue.push({ at: F0 + 500, wave: 'headon', n: 3, lane: true, spread: 10 });
    // THE SCATTER: the densest rock - and the Magpie, leading you through it
    for (s = sec.scatter + 200; s < sec.mill - 300; s += 170 + r() * 110) {
      var k3 = r();
      if (k3 < 0.3) asteroid(s, side() * (18 + r() * 26), (r() * 2 - 1) * 16, 18 + r() * 14);
      else if (k3 < 0.62) rock(s, (r() * 2 - 1) * 50, (r() * 2 - 1) * 28, 3.5 + r() * 7, r() < 0.4 ? side() * (0.3 + r() * 0.5) : 0);
      else if (k3 < 0.74) rockGun(s, side() * (85 + r() * 30), (r() * 2 - 1) * 30, 22 + r() * 10);
      else if (k3 < 0.84) gate(s, (r() * 2 - 1) * 30, (r() * 2 - 1) * 18);
      asteroid(s + 80, side() * (95 + r() * 100), (r() * 2 - 1) * 80, 22 + r() * 34);
    }
    [[0.3, 30, -14], [0.6, -36, 18], [0.9, 0, -22]].forEach(function (q) { W.cue.push({ at: q[0] < 0.5 ? sec.drift + (sec.quarry - sec.drift) * q[0] * 2 : sec.scatter + (sec.mill - sec.scatter) * (q[0] - 0.5), toy: true, lx: q[1], ly: q[2] }); }); W.ms.toysAll = 3;   // (v32) her toys, drifting in the rocks
    W.cue.push({ at: sec.scatter + 150, wave: 'magpie', n: 1 }); cue(W, sec.scatter + (sec.mill - sec.scatter) * 0.55, 'pass', 3);
    // THE MILLSTONE, then out (the chapter ends when you have outrun its blast)
    W.cue.push({ at: sec.mill, boss2: true });
    W.cue.push({ at: 360, say: ['THE SHOALS', 'SHOOT THE SMALL ROCKS - STEER ROUND THE BIG ONES'], radio: 's_start' },
      { at: sec.drift, say: ['THE DRIFT', 'ROCKS ON THE MOVE'], cp: true, radio: 's_drift' },
      { at: sec.quarry, say: ['THE QUARRY', 'IN THROUGH THE ROCK - MIND THE WALLS'], cp: true, radio: 's_quarry' },
      { at: F0 - 700, say: ['THE FORK', 'LEFT THE SHAFT - RIGHT THE CONVEYOR'], small: true, radio: 's_fork' },
      { at: sec.scatter, say: ['THE SCATTER', 'AFTER THE MAGPIE'], cp: true, radio: 's_scatter' },
      { at: sec.mill - 400, say: ['THE MILLSTONE', 'SOMETHING BIG IS GRINDING AHEAD'], cp: true });
    W.checkpoints = [0, sec.drift, sec.quarry, sec.scatter, sec.mill - 400];
    W.cue.sort(function (a, b) { return a.at - b.at; });
  }
  // THE MILLSTONE: a Rook mining barge across the lane ahead of you. Three beats, each with a clock:
  // 1, its two TRACTOR ARMS throw asteroids at you - an arm can only be hurt while it glows, before a throw (shoot the rock it throws, or dodge);
  // 2, its CUTTER sweeps a wall of fire up and down the lane with a gap that moves - it can only be hurt while it spins up;
  // 3, its REACTOR charges, then opens. Down: it stops dead, you fly UNDER it, it blows - and its blast chases you: full thrust.
  function spawnMillstone(W) {
    var tuf = W.speed > 1, o = { k: 'millstone', beh: 'boss2', st: 'arrive', t: 0, rs: W.s + 1000, lx: 0, ly: 5, r: 0, alive: true, life: 60 * 90, parts: [], x: 0, y: 0, z: 0, beat: 1, cycT: 140, armN: 0, gapS: 1 };
    [['armL', -62, 2, -42, tuf ? 12 : 9], ['armR', 62, 2, -42, tuf ? 12 : 9], ['cutter', 0, -31, -40, tuf ? 24 : 16], ['reactor', 0, 10, -33, tuf ? 36 : 24]].forEach(function (p) {   // (v25: where the rebuilt model has them - the claws, the saw, the wheel's hub; dz < 0 is towards you)
      var q = { k: 'mpart', name: p[0], parent: o, dx: p[1], dy: p[2], dz: p[3], hp: p[4], max: p[4], r: p[0] === 'cutter' ? 14 : 12, alive: true, shielded: true, x: 0, y: 0, z: 0, tell: 0 };
      o.parts.push(q); W.objs.push(q);
    });
    W.objs.push(o); W.mill = o; o.t0 = W.ct;
    banner(W, 'THE MILLSTONE', 'SHOOT ITS ARMS AS THEY GLOW - THEN ITS CUTTER, THEN ITS REACTOR', 180); W.events.push('bark');   // (v36) a big dog's bark W.events.push('warden');
    say(W, 'The Millstone. Shoot its arms as they glow, then its cutter, then its reactor.'); radio(W, 's_mill'); radioLater(W, 'rk_mill', 240);
  }
  function millstoneStep(W, o) {
    var P = o.parts, px = o.x, py = o.y, pz = o.z, arms = P.filter(function (q) { return q.alive && q.name.indexOf('arm') === 0; }), cut = P[2], rea = P[3], ease = 0.6 + 0.4 * W.sp.eFire;
    o.t++;
    P.forEach(function (q) { if (q.tell > 0) q.tell--; });
    if (o.st === 'arrive') { var rel = o.rs - W.s; o.rs = W.s + rel - 3; if (rel <= 150) { o.st = 'fight'; o.t = 0; } W.paceMul += (0.5 - W.paceMul) * 0.02; }
    else if (o.st === 'fight') {
      W.paceMul += (0.5 - W.paceMul) * 0.02;
      o.rs = W.s + 150 + Math.sin(o.t * 0.009) * 18; o.lx = Math.sin(o.t * 0.01) * 22; o.ly = 5 + Math.sin(o.t * 0.017) * 6;   // (v25: in front of you now, not above - the rebuilt one is taller)
      if (W.phase === 'play' && o.beat === 1 && arms.length) {   // the arms take turns: a glow (now it can be hurt), then the throw
        if (--o.cycT === 70) { var a = arms[o.armN++ % arms.length]; a.tell = 70; o.armNow = a; W.events.push('charge'); }
        if (o.cycT <= 0) {
          o.cycT = Math.round(200 * ease); var A = o.armNow && o.armNow.alive ? o.armNow : arms[0];
          W.objs.push({ k: 'boulder', rs: o.rs + A.dz, lx: o.lx + A.dx, ly: o.ly + A.dy, tx: W.ox, ty: W.oy, r: 7.5, hp: W.speed > 1 ? 3 : 2, alive: true, spin: W.rnd() * 6, v: Math.floor(W.rnd() * 4), t: 0 });
          W.events.push({ sfx: 'mine', pan: pan(W, o), d: dist(W, o) });
        }
        arms.forEach(function (q) { q.shielded = !(q.tell > 0); });
      } else if (W.phase === 'play' && o.beat === 2 && cut.alive) {   // the cutter: spin up (it can be hurt), then a wall of fire with a gap - high, then low
        if (--o.cycT === 60) { cut.tell = 60; W.events.push('charge'); }
        cut.shielded = !(cut.tell > 0);
        if (o.cycT <= 0) {
          o.cycT = Math.round(230 * ease); o.gapS = -o.gapS; var C = corridor(W), vol = ++W.volleys, gap = o.gapS < 0 ? 0 : 4;
          for (var j = 0; j < 6; j++) if (j !== gap && j !== gap + 1) fireBolt(W, cut, cut.x, cut.y, cut.z, true, { x: clamp(W.ox, C.c - C.x + 6, C.c + C.x - 6), y: clamp(W.oy + (j - 2.5) * 9, C.y0, C.y1), mute: j > 1, volley: vol });
        }
      } else if (W.phase === 'play' && o.beat === 3) {   // the reactor: charge (shielded), open
        o.cycT--;
        if (o.cst === 'charge') { rea.tell = o.cycT; if (o.cycT <= 0) { o.cst = 'open'; o.cycT = 160; rea.shielded = false; W.events.push('open'); } }
        else if (o.cst === 'open') { if (o.cycT <= 0) { o.cst = 'wait'; o.cycT = 90; rea.shielded = true; } }
        else if (o.cycT <= 0) { o.cst = 'charge'; o.cycT = 70; rea.shielded = true; W.events.push('charge'); }
      }
      if (--o.life <= 0 && W.phase === 'play') { o.st = 'dying'; o.t = 0; radio(W, 's_under'); }   // (out of time: it goes critical anyway - no points for it)
    } else if (o.st === 'dying') {   // stopped dead and going critical: you fly under it; once you are past, it blows
      W.paceMul += (1 - W.paceMul) * 0.03; o.ly += (80 - o.ly) * 0.045;
      if (o.t % 9 === 0) fx(W, { k: 'boom', x: o.x + (W.rnd() - 0.5) * 120, y: o.y + (W.rnd() - 0.5) * 30, z: o.z + (W.rnd() - 0.5) * 60, c: 'warden', big: o.t % 36 === 0 });
      if (W.s > o.rs + 60 && !o.blowT) o.blowT = o.t + 70;
      if (o.blowT && o.t >= o.blowT) {
        o.alive = false; o.parts.forEach(function (q) { q.alive = false; }); W.mill = null;
        fx(W, { k: 'msblow', x: o.x, y: o.y, z: o.z }); W.events.push('bigboom'); W.events.push('bigboom2'); shakeIt(W, 0.9);
        W.outrun = { front: o.rs, t: 0, caught: false }; banner(W, 'FULL THRUST!', 'OUTRUN THE BLAST', 160); radio(W, 's_run'); storyEvent(W, 'free');
      }
    }
    var F = frame(W.rail, o.rs), p = local(F, o.lx, o.ly);
    o.x = p.x; o.y = p.y; o.z = p.z; o.vx = o.x - px; o.vy = o.y - py; o.vz = o.z - pz; o.yaw = F.yaw; o.pitch = F.pitch; o.roll = o.st === 'dying' ? Math.sin(o.t * 0.03) * 0.15 : 0;
    o.parts.forEach(function (q) { var Q = local(F, o.lx + q.dx, o.ly + q.dy, q.dz); q.x = Q.x; q.y = Q.y; q.z = Q.z; q.vx = o.vx; q.vy = o.vy; q.vz = o.vz; });
  }
  function boulderStep(W, o) {   // a rock the Millstone threw: at where you were, a little homing; shoot it to pieces or get out of its way
    o.t++; o.rs += W.v - 2.2; o.spin += 0.05;   // (v25: it used to drift only part of the way across - now it arrives where it was aimed, in about 0.8 s)
    var left = Math.max(1, (o.rs - W.s) / 2.2); o.tx += (W.ox - o.tx) * 0.008; o.ty += (W.oy - o.ty) * 0.008; o.lx += (o.tx - o.lx) / left; o.ly += (o.ty - o.ly) / left;
    if (o.rs <= W.s) {
      o.alive = false;
      if (Math.hypot(W.ox - o.lx, W.oy - o.ly) < o.r + 3) { boom(W, o, 'rock', 14); W.ms.rockHits = (W.ms.rockHits || 0) + 1; hurt(W, 'hit', o, 'ROCK'); }
    }
  }
  function outrunStep(W) {   // its blast front, racing down the route after you - faster than you cruise, about as fast as full thrust
    var Q = W.outrun; Q.t++;
    Q.front += W.pace * (1.75 + Q.t * 0.0012);
    if (!Q.caught && Q.front >= W.s - 8) {
      Q.caught = true; W.ms.caught = 1; W.shields = Math.max(1, W.shields - 3); W.hitT = 40; shakeIt(W, 1); W.events.push('crash'); fx(W, { k: 'hit' });
      W.hurtFrom = { cause: 'BLAST', t: 60, x: null }; banner(W, 'CAUGHT IN THE BLAST', '', 120, true); radio(W, 's_caught');
    }
    if (Q.t > 600 || W.s >= W.rail.len - 2) {
      if (!Q.caught) { var b = PTS.outran; W.score += b; W.ms.pk.outran = b; banner(W, 'YOU OUTRAN IT!', '+' + num(b), 140); radio(W, 's_outran'); }
      W.outrun = null; chapterDone(W);
    }
  }
  function cue(W, at, wave, n) { W.cue.push({ at: at, wave: wave, n: Math.max(1, Math.round(n * W.sp.eCount + 0.3)) }); }

  // ---------------------------------------------------------------- chapter 2: the warship
  // THE ATTACK CIRCUIT (28 Oct, the owner: free flight round her was "too difficult, too confusing"): a set path round her that loops
  // until she is done. You steer a little inside it, aim and shoot.
  // The set path round her (27 Oct night, the owner: more flying round her, more time on each target, and "not constantly repeating the
  // same one"): three different laps, one after another, each from J - high behind her stern, heading for her bow - and back into it.
  // A, the classic: along her back (main gun, bridge), down her left side past both generators, round her stern, her back again, her right side.
  // B, the belly run: under her (her hangar, the guns underneath), up her right side against the way she faces - each generator head-on -
  //   round her stern, along her back, then her left side the same way. C, the strafing runs: across her back on a slant, low over her
  //   main gun; round her bow; back under her belly on the other slant (a corkscrew round her was tried: she was out of view most of it).
  //   All three keep clear of her hull - the test checks; A and B pass the generators about 105-120 away. They are one long loop, so nothing jumps between laps; W.lapAt says where each starts.
  //   (engine terms: x right, y up, z towards her bow; designed with starrun-review/route-design.mjs)
  var LAPS0 = [
    [[0, 250, -1350], [0, 192, -570], [0, 178, -90], [0, 248, 405], [0, 225, 1140], [-225, 90, 1395], [-540, -12, 840], [-385, -15, 262], [-520, -20, -38], [-385, -15, -210], [-450, 15, -900], [-195, 180, -1500],
      [0, 250, -1350], [0, 192, -570], [0, 178, -90], [0, 248, 405], [0, 225, 1140], [225, 90, 1395], [540, -12, 840], [385, -15, 262], [520, -20, -38], [385, -15, -210], [450, 15, -900], [195, 180, -1500]],
    [[0, 250, -1350], [0, 120, -1130], [0, -70, -935], [0, -150, -620], [0, -158, 0], [0, -130, 760], [170, -60, 1230], [530, 0, 1000], [385, -15, 330], [430, -25, 40], [385, -15, -150], [470, 30, -760], [260, 200, -1260],
      [0, 250, -1350], [0, 192, -570], [0, 178, -90], [0, 248, 405], [0, 225, 1140], [-170, 90, 1400], [-530, 0, 1000], [-385, -15, 330], [-430, -25, 40], [-385, -15, -150], [-470, 30, -760], [-260, 200, -1260]],
    [[0, 250, -1350], [250, 210, -1050], [330, 180, -640], [170, 160, -330], [0, 150, -60], [-170, 165, 220], [-300, 200, 520], [-330, 150, 900], [-150, -40, 1220],
      [150, -150, 1050], [260, -150, 700], [60, -160, 350], [-150, -160, 0], [-330, -150, -350], [-420, -40, -700], [-400, 60, -1100], [-195, 180, -1500]]];
  var LAPS = [LAPS0[0], LAPS0[2], LAPS0[1]];   // (v20, the panel: the strafing runs second - most players never reached them)
  var CIRCUIT = [].concat.apply([], LAPS);
  // Control's call-outs, by control point: [where, what] - her back, her left side, her right side, her belly, the corkscrew
  var LAP_MARKS = [[0, 'w_spine'], [5, 'w_port'], [12, 'w_spine'], [17, 'w_star'], [23, 'w_strafe'], [32, 'w_belly'], [41, 'w_belly'], [47, 'w_star'], [54, 'w_spine'], [59, 'w_port']];
  var SPACE_LANE = { space: true, width: function () { return 164; }, wall: 0, floor: -48, tunnel: [-1e9, -1e9], roof: 99, ridge: function () { return null; }, ridgeSpan: null, ground: function () { return 0; } };
  function buildWarship(W) {
    var r = W.rnd, D = WARSHIP, path = W.mode === 'rail';
    W.rail = path ? makeRail(CIRCUIT, true) : null; W.valley = path ? SPACE_LANE : W.valley;
    if (path) {   // where each lap starts, and where Control calls out what is coming (makeRail samples 24 points a segment)
      var at = function (n) { return W.rail.S[n * 24][3]; }, n0 = 0;
      W.lapAt = LAPS.map(function (l) { var a = at(n0); n0 += l.length; return a; });
      W.lapMarks = LAP_MARKS.map(function (m) { return { at: at(m[0]) + 40, id: m[1] }; });
      W.lapN = 1; W.lapKind = 0;
    }
    if (!W.wsBuilt) {   // a fresh warship (a retry keeps her damage)
      W.wsBuilt = true;
      W.objs = [];
      var hpG = path ? 26 : 32, hpGun = path ? 34 : 40, hpB = path ? 50 : 60;   // (on the set path you pass each one a few seconds at a time)
      D.turrets.forEach(function (t, i) { W.objs.push({ k: 'turret', free: true, x: t[0], y: t[1], z: t[2], nx: t[3], ny: t[4], nz: t[5], kind: t[6], r: 7.5, hp: 3, alive: true, fireT: 40 + i * 13 + r() * 60, burst: 0 }); });
      D.gens.forEach(function (g, i) { W.objs.push({ k: 'gen', free: true, x: g[0], y: g[1], z: g[2], r: 12 * WS_K, hp: hpG, max: hpG, alive: true, n: i }); });   // (her big targets are as big as she is now)
      W.objs.push({ k: 'gun', free: true, x: D.gun[0], y: D.gun[1], z: D.gun[2], r: 12 * WS_K, hp: hpGun, max: hpGun, alive: true, fireT: 300 });
      W.objs.push({ k: 'bridge', free: true, x: D.bridge[0], y: D.bridge[1], z: D.bridge[2], r: 15 * WS_K, hp: hpB, max: hpB, alive: true, shielded: true });
      W.objs.push({ k: 'keel', free: true, x: 0, y: D.keelY, z: (D.keel[0] + D.keel[1]) / 2, z0: D.keel[0], z1: D.keel[1], vz: 0, r: 13, hp: 12, max: 12, alive: true, fireT: 90, burst: 0, nx: 0, ny: -1, nz: 0 });   // (her keel gun, on its track)
      W.gensLeft = 4; W.carrier = { x: D.carrier[0], y: D.carrier[1], z: D.carrier[2], hp: 100 };
      W.ct = 0;
      // the first 20 seconds are yours: learn to turn, go for the main gun; then the fighters come
      W.cue = [{ at: 100, say: ['STRIKE THE WARSHIP', 'SILENCE HER MAIN GUN FIRST'], radio: 'w_start' }, { at: 420, radio: 'w_turn' }, { at: 800, radio: 'w_gens' },
        { at: 1200, wave: 'fighters', n: 3, ahead: true }, { at: 1500, radio: 'w_flip' }, { at: 2000, wave: 'fighters', n: 3, radio: 'w_fighters' },
        { at: 2700, wave: 'heavyf', n: 2 }, { at: 3400, wave: 'fighters', n: 4, ahead: true }, { at: 4100, wave: 'heavyf', n: 2 }, { at: 4800, wave: 'fighters', n: 4 }];
      if (path)   // on the path: waves of fighters in formations - head-on, a V, divers from above, crossing, heavies - every few seconds
        W.cue = [{ at: 100, say: ['STRIKE THE WARSHIP', 'SILENCE HER MAIN GUN FIRST'], radio: 'w_start' }, { at: 400, radio: 'w_path' },
          { at: 700, wave: 'pass', n: 3 }, { at: 1250, wave: 'vee', n: 3 }, { at: 1800, wave: 'pass', n: 3 }, { at: 2350, wave: 'dive', n: 3 }, { at: 2900, wave: 'heavy', n: 1 },
          { at: 1550, wave: 'howl', n: 4 }, { at: 3450, wave: 'pass', n: 4 }, { at: 3700, wave: 'fetch', n: 2 }, { at: 4000, wave: 'cross', n: 3 }, { at: 4550, wave: 'headon', n: 3 }];
      if (path) { [[1000, 24, 10], [2600, -30, -12], [4300, 0, 20]].forEach(function (q) { W.cue.push({ at: q[0], toy: true, lx: q[1], ly: q[2] }); }); W.cue.sort(function (a, b) { return a.at - b.at; }); W.ms.toysAll = 3; }   // (v32) her toys, floating free round the warship
      W.cue.forEach(function (c) { if (c.n) c.n = Math.max(1, Math.round(c.n * W.sp.eCount + 0.3)); });
    }
    var S = W.ship;
    if (path) { W.s = 0; W.ox = 0; W.oy = 0; W.pace = 3.3 * W.sp.pace; W.v = W.pace * W.pk; W.lapPrev = 0; place(W); }
    else {   // free flight: out beyond her stern, heading in
      S.x = -460; S.y = 170; S.z = -1550; S.yaw = Math.atan2(-S.x * 0.6, -S.z); S.pitch = -0.08; S.roll = 0; S.vx = 0; S.vy = 0; S.vz = 0;
      W.aimYaw = S.yaw; W.aimPitch = S.pitch;
      W.pace = 3.6 * W.sp.pace; W.v = W.pace * W.pk; W.oob = false; W.s = 0;
    }
    W.checkpoints = [0];
  }

  // ---------------------------------------------------------------- enemies
  function spawnWave(W, beh, n, extra) {
    var r = W.rnd, i, o;
    extra = extra || {};
    if (W.mode === 'free') {
      var up = W.objs.filter(function (q) { return q.alive && (q.k === 'dart' || q.k === 'heavy'); }).length;
      n = Math.min(n, 6 - up); if (n <= 0) return;   // never more than six fighters up at once
      for (i = 0; i < n; i++) W.objs.push(fighter(W, beh === 'heavyf' ? 'heavy' : 'dart', i, n, extra.ahead));
      banner(W, beh === 'heavyf' ? 'FLUFFBALLS - FUR SHIELDS' : extra.ahead ? 'YAPPERS AHEAD' : 'YAPPERS LAUNCHING', '', 90, true); W.events.push('alarm');
      return;
    }
    var got = [];
    var hw = W.valley.width(W.s + 600) / 2, base = extra.lane ? (laneAt(W, W.s + 760) || { c: 0 }).c : extra.lx != null ? extra.lx : (r() * 2 - 1) * hw * 0.25, spread = extra.spread || 21, lead = null;
    if (beh === 'vee') n = 3;   // a V of three: the leader fires; when it is time, the two on the wings peel off one after the other
    for (i = 0; i < n; i++) {
      var side = i === 0 ? 0 : (i % 2 ? -1 : 1) * Math.ceil(i / 2);
      if (beh === 'headon') o = railFoe(W, 'dart', 'headon', W.s + 760 + Math.abs(side) * 34, base + side * spread, 14 + Math.abs(side) * 5, i);
      else if (beh === 'vee') {
        o = railFoe(W, 'dart', 'headon', W.s + 760 + Math.abs(side) * 30, base + side * 25, 16 + Math.abs(side) * 7, i);
        if (i === 0) { lead = o; o.lead = true; } else { o.quiet = lead; o.holdT = lead.holdT + i * 20; o.peelOnly = true; }
      } else if (beh === 'dive') {   // high above and ahead, they dive at you, fire on the way down, then pull up over you with a roll
        o = railFoe(W, 'dart', 'dive', W.s + 400 + i * 40, base + side * 26, 90, i); o.st = 'dive'; o.wait = i * 20; o.ly0 = 10 + r() * 10;
      } else if (beh === 'pass') {   // a FLY-THROUGH: from far down the lane straight at you, firing, then a stream of them roaring past down one side
        if (i === 0) extra.side = extra.side || (r() < 0.5 ? -1 : 1);
        o = railFoe(W, 'dart', 'pass', W.s + 900 + i * 110, base + side * 30, 14 + r() * 10, i); o.st = 'pass'; o.wait = i * 22; o.side = extra.side; o.fireT = 6 + r() * 24;   // (they are only in range a second or so: they open up quickly)
        o.dxs = [0, 6, 3, 9][i % 4]; o.dys = [0, 7, -3, 11][i % 4];   // (each a little apart in the stream)
      } else if (beh === 'ace') {   // the MAGPIE, their ace: in behind you, firing - brake and he overshoots; then you are after him
        if (i) continue;
        o = railFoe(W, 'dart', 'ace', W.s - 64, W.ox, W.oy + 6, 0); o.st = 'tail'; o.ace = true; o.hp = 5; o.r = 15; o.fireT = 60; radio(W, 'mg_on'); radioLater(W, 'ace_on', 150);
      } else if (beh === 'magpie') {   // (chapter 3) the Magpie, back - out in front, leading you through the rocks; get him before he gets away
        if (i) continue;
        o = railFoe(W, 'dart', 'flee', W.s + 300, 0, 10, 0); o.st = 'flee'; o.ace = true; o.hp = W.speed > 1 ? 8 : 6; o.r = 15; o.fleeT = 1500; storyEvent(W, 'mill');
        var won2 = W.results.some(function (rr) { return rr.chap === 2 && (rr.feats || []).indexOf('magpie') >= 0; }); radio(W, won2 ? 'mg_back2' : 'mg_back'); radioLater(W, 's_scatter', 170);
      } else if (beh === 'hunt') {   // a few of them running from you, down the path ahead: after them
        o = railFoe(W, 'dart', 'flee', W.s + 260 + i * 70, base + side * 34, 8 + i * 9, i); o.st = 'flee'; o.fleeT = 1100 + i * 60; if (!i) radio(W, 'hunt');
      } else if (beh === 'heavy') o = railFoe(W, 'heavy', 'headon', W.s + 820 + i * 60, base + (i ? 1 : -1) * 36 * Math.min(1, n - 1), 18, i);
      else if (beh === 'howl') {   // (v32) a HOWLER hangs back behind its pack; every few seconds it howls - and every one of them near it is shielded
        if (i === 0) { o = railFoe(W, 'dart', 'headon', W.s + 860, base, 34, 0); o.role = 'howl'; o.hold = 255; o.hp = (W.sp.hpDart || 1) + 2; o.howlT = 110; o.holdT = Math.round(o.holdT * 1.8); W.ms.howlersAll = (W.ms.howlersAll || 0) + 1; }
        else o = railFoe(W, 'dart', 'headon', W.s + 760 + Math.abs(side) * 34, base + side * spread, 14 + Math.abs(side) * 5, i);
      } else if (beh === 'fetch') {   // (v32) FETCHERS: they hold in front of you and throw balls - shoot them, dodge them, or roll and bat them back
        o = railFoe(W, 'dart', 'headon', W.s + 780 + i * 40, base + side * 32, 18 + i * 4, i); o.role = 'fetch'; o.hold = 150 + i * 14; o.fireT = 50 + i * 40;
      }
      else o = railFoe(W, 'dart', 'cross', 0, (r() < 0.5 ? -1 : 1) * (hw + 70), 42 + i * 7, i);
      if (beh === 'cross') { o.lx0 = o.lx; o.wait = i * 26; o.dist = 200 + r() * 80; }
      W.objs.push(o); got.push(o);
    }
    if (got.length >= 3 && beh !== 'howl' && beh !== 'ace' && beh !== 'magpie' && beh !== 'hunt') {   // (v32) a PACK: its leader wears the gold collar - down it and the rest scatter
      var pk = (W.packN = (W.packN || 0) + 1), L0 = got[0]; L0.packLead = true; L0.hp += 1; got.forEach(function (q) { q.pack = pk; });
      if (!W.leadSaid) { W.leadSaid = true; radioLater(W, 'pk_lead', 90); }
    }
    banner(W, beh === 'howl' ? 'A HOWLER AND ITS PACK' : beh === 'fetch' ? 'FETCHERS - BALLS INCOMING' : beh === 'heavy' ? 'FLUFFBALL' + (n > 1 ? 'S' : '') : beh === 'cross' ? 'YAPPERS CROSSING' : beh === 'dive' ? 'YAPPERS ABOVE!' : beh === 'vee' ? 'YAPPERS IN A V' : beh === 'pass' ? 'YAPPERS - HEAD-ON!' : beh === 'ace' ? 'THE MAGPIE - ON YOUR TAIL!' : beh === 'hunt' ? 'THEY ARE RUNNING - AFTER THEM!' : beh === 'magpie' ? 'THE MAGPIE - AFTER HIM!' : 'YAPPERS AHEAD', '', 90, true); W.events.push('alarm');
  }
  function railFoe(W, k, beh, rs, lx, ly, i) {
    var r = W.rnd, heavy = k === 'heavy';
    return { k: k, beh: beh, st: 'in', t: 0, rs: rs, lx: lx, ly: ly, lx0: lx, ly0: ly, slot: i, wob: r() * 6, r: heavy ? 18 : 13.5, hp: heavy ? W.sp.hpHeavy || 3 : W.sp.hpDart || 1, alive: true, wait: 0, counts: true, v: r() < 0.5 ? 0 : 1,
      hold: (heavy ? 135 : 100) + i * 12, holdT: Math.round(((heavy ? 330 : 150) + r() * 90) * W.sp.hold), fireT: 40 + r() * 70, burst: 0, mslT: 120 + r() * 80,
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, roll: 0 };
  }
  function fighter(W, k, i, n, ahead) {   // free flight: from her hangar, or straight at you from ahead
    var r = W.rnd, S = W.ship, heavy = k === 'heavy', o = { k: k, free: true, st: 'arrive', t: 0, r: heavy ? 18 : 13.5, v: r() < 0.5 ? 0 : 1, hp: heavy ? W.sp.hpHeavy || 3 : W.sp.hpDart || 1, alive: true, wait: i * 12, counts: true,
      spd: (heavy ? 3.4 : 4.3) * Math.sqrt(W.sp.aggr), turn: (heavy ? 0.026 : 0.038) * W.sp.aggr, fireT: 30 + r() * 60, burst: 0, mslT: 150 + r() * 100, vx: 0, vy: 0, vz: 0, roll: 0, bt: 0 };
    if (ahead) {   // head-on: in front of you, coming your way
      var f = dirOf(S.yaw, S.pitch), side = (i - (n - 1) / 2) * 30;
      o.x = S.x + f.x * 950 + Math.cos(S.yaw) * side; o.y = S.y + f.y * 950 + (i % 2) * 14; o.z = S.z + f.z * 950 - Math.sin(S.yaw) * side;
      o.yaw = wrapA(S.yaw + Math.PI); o.pitch = -S.pitch; o.st = 'engage';
    } else { var H = WARSHIP.hangar; o.x = H[0] + (i - (n - 1) / 2) * 16; o.y = H[1] - 8; o.z = H[2] + i * 10; o.yaw = r() * 6.28; o.pitch = -0.6; }
    return o;
  }
  function spawnWarden(W) {   // the Gaoler (the warden in the code): three beats - its gun pods, then its engines, then its core
    var o = { k: 'warden', beh: 'boss', st: 'arrive', t: 0, rs: W.s + 700, lx: 0, ly: 30, r: 0, alive: true, fireT: 90, mslT: 200, life: 60 * 75, parts: [], x: 0, y: 0, z: 0,
      beat: 1, cycT: 150, mineT: 120, sag: 0, beam: null, gapS: 1 };
    // (v20) half as big again and nearer (a third of the picture); its parts with it - the picture scales its model the same (sr3d WARDEN_K)
    var tuf = W.speed > 1;   // (Classic and Fast: tougher pods and core - a fight of about 35-45 s, not 12)
    [['gunL', -36, -9.6, -9.6, tuf ? 20 : 12, tuf], ['gunR', 36, -9.6, -9.6, tuf ? 20 : 12, tuf], ['engL', -52.5, 9.6, 28.5, 14, true], ['engR', 52.5, 9.6, 28.5, 14, true], ['core', 0, -16.5, -15, tuf ? 45 : 33, true]].forEach(function (p) {
      var q = { k: 'wpart', name: p[0], parent: o, dx: p[1], dy: p[2], dz: p[3], hp: p[4], max: p[4], r: p[0] === 'core' ? 15 : 12, alive: true, shielded: p[5], x: 0, y: 0, z: 0, burst: 0, fireT: 60, tell: 0 };
      o.parts.push(q); W.objs.push(q);
    });
    W.objs.push(o); W.warden = o; o.t0 = W.ct;
    banner(W, 'THE GAOLER', W.speed > 1 ? 'HIT ITS GUN PODS AS THEY GLOW - THEN ENGINES, THEN CORE' : 'SHOOT ITS GUN PODS, THEN ITS ENGINES, THEN THE CORE', 180); W.events.push('bark'); W.events.push('warden');
    say(W, 'The Gaoler gunship. Shoot out its gun pods, then its engines, then the core.'); radio(W, 'g_spawn');
  }

  // ---------------------------------------------------------------- enemy shots: lasers you can see coming, missiles, flak
  function railOf(o) {   // where a shooter is in the valley's terms, and how it is moving
    if (o.k === 'wpart' || o.k === 'mpart') { var P = o.parent; return { s: P.rs + o.dz, x: P.lx + o.dx, y: P.ly + o.dy, vs: P.vs || 0, vx: P.vlx || 0, vy: P.vly || 0 }; }
    return { s: o.rs, x: o.lx, y: o.ly + (o.k === 'turret' && o.mount !== 'wall' ? 3 : 0), vs: o.vs || 0, vx: o.vlx || 0, vy: o.vly || 0 };
  }
  function fireBolt(W, o, sx, sy, sz, big, to) {   // to: {x, y} - dead straight at that point across the valley (the Gaoler's wall of fire and its beam)
    if (W.phase !== 'play' || W.eshots.length > 70) return;
    var spd = W.sp.bolt * (big ? 0.8 : 1), ef = 0.4 + W.rnd() * 0.8, e = W.sp.err * ef, a = W.rnd() * 6.28;
    if (!to && W.mercyT > 0 && W.rnd() < 0.3) return;   // on your last shield they ease off for a few seconds
    if (to) e = 0;
    var from = { ox: sx, oy: sy, oz: sz }, b;
    if (W.mode === 'rail' && o.rs != null || o.k === 'wpart' || o.k === 'mpart') {
      // aim where you will be when it gets there (solved exactly: |D + V T| = speed x T), then a little off. (Until 27 Oct this was two rough
      // guesses, and a gun off to the side aimed far ahead of you - the rim guns all but never hit.)
      var Q = railOf(o), Dx = W.s - Q.s, Dy = (to ? to.x : W.ox) - Q.x, Dz = (to ? to.y : W.oy) - Q.y, Vx = W.v - Q.vs, Vy = (to ? 0 : W.vox) - Q.vx, Vz = (to ? 0 : W.voy) - Q.vy;
      var qa = Vx * Vx + Vy * Vy + Vz * Vz - spd * spd, qb = 2 * (Dx * Vx + Dy * Vy + Dz * Vz), qc = Dx * Dx + Dy * Dy + Dz * Dz, T = Math.sqrt(qc) / spd, disc = qb * qb - 4 * qa * qc;
      if (Math.abs(qa) > 1e-9 && disc >= 0) { var r1 = (-qb - Math.sqrt(disc)) / (2 * qa), r2 = (-qb + Math.sqrt(disc)) / (2 * qa), lo = Math.min(r1, r2), hi = Math.max(r1, r2); if (lo > 0) T = lo; else if (hi > 0) T = hi; }
      var rx = Dx + Vx * T, ry = Dy + Vy * T, rz = Dz + Vz * T, d;
      if (!to) e = W.sp.rerr * ef * (o.k === 'turret' ? 1.3 : 1);   // (the valley's own aim; the rim guns a little less sure than a fighter in front of you)
      ry += Math.cos(a) * e; rz += Math.sin(a) * e; d = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
      b = { k: 'bolt', rail: true, rs: Q.s, lx: Q.x, ly: Q.y, vs: Q.vs + rx / d * spd, vlx: Q.vx + ry / d * spd, vly: Q.vy + rz / d * spd, x: sx, y: sy, z: sz, vx: 0, vy: 0, vz: 0, t: 0, life: 220, big: !!big };
    } else {
      var S = W.ship, ovx = o.vx || 0, ovy = o.vy || 0, ovz = o.vz || 0;
      if (o.k === 'turret' && o.free && W.mode === 'rail' && !to) e = W.sp.rerr * ef * 1.3;   // (her guns, on the attack circuit: about as sure as the valley's rim guns)
      var dx = S.x - sx, dy = S.y - sy, dz = S.z - sz, d2 = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1, T2 = d2 / spd;
      dx += (S.vx - ovx) * T2 + Math.cos(a) * e; dy += (S.vy - ovy) * T2 + Math.sin(a) * e; dz += (S.vz - ovz) * T2;
      d2 = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      b = { k: 'bolt', x: sx, y: sy, z: sz, vx: ovx + dx / d2 * spd, vy: ovy + dy / d2 * spd, vz: ovz + dz / d2 * spd, t: 0, life: 220, big: !!big };
    }
    b.ox = from.ox; b.oy = from.oy; b.oz = from.oz; b.src = o.k + (o.beh ? ':' + o.beh : ''); b.so = o; if (to && to.volley) b.volley = to.volley; W.eshots.push(b);   // (where it came from: the panel points you that way when it hits)
    if (!(to && to.mute)) { W.events.push({ sfx: 'elaser', pan: pan(W, { x: sx, y: sy, z: sz }) }); fx(W, { k: 'emuzzle', x: sx, y: sy, z: sz }); }
  }
  function fireMissile(W, o, sx, sy, sz) {
    if (W.phase !== 'play') return;
    var S = W.ship, dx = S.x - sx, dy = S.y - sy, dz = S.z - sz, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    W.eshots.push({ k: 'missile', x: sx, y: sy, z: sz, vx: (o.vx || 0) + dx / d * 1.5, vy: (o.vy || 0) + dy / d * 1.5 + 0.5, vz: (o.vz || 0) + dz / d * 1.5, t: 0, life: 420, homing: true, r: 2.8, alive: true, ox: sx, oy: sy, oz: sz });
    W.events.push('mwarn'); W.events.push({ sfx: 'rocket', pan: pan(W, { x: sx, y: sy, z: sz }) }); radio(W, 'missile');
  }
  function howlStep(W, o) {   // (v32) the Howler: a long glow (it throws its head back), then the howl - a ring of light, and every fighter near it shielded
    if (o.howlTell > 0) { o.tell = o.howlTell; if (--o.howlTell === 0) {
      W.objs.forEach(function (f) { if (f !== o && f.alive && (f.k === 'dart' || f.k === 'heavy') && f.rs != null && Math.abs(f.rs - o.rs) < 340) { f.shieldT = 300; f.shieldBy = o; } });
      fx(W, { k: 'howl', x: o.x, y: o.y, z: o.z }); W.events.push({ sfx: 'howl', pan: pan(W, o) }); if (!W.howlSaid) { W.howlSaid = true; radio(W, 'pk_howl'); }
    } return; }
    if (--o.howlT <= 0) { o.howlT = 220 * W.sp.eFire; o.howlTell = 44; W.events.push({ sfx: 'warn', tell: true, pan: pan(W, o) }); }
  }
  function fireBall(W, o) {   // (v32) a Fetcher's ball: lobbed to where you will be in a second or so - it bounces along the canyon floor
    if (W.phase !== 'play') return;
    var S = W.ship, T = 66, g = W.valley.space ? 0 : 0.03, sx = o.x, sy = o.y - 2, sz = o.z;
    var tx = S.x + S.vx * T, ty = S.y + S.vy * T, tz = S.z + S.vz * T;
    W.eshots.push({ k: 'missile', ball: true, x: sx, y: sy, z: sz, vx: (tx - sx) / T, vy: (ty - sy) / T + g * T / 2, vz: (tz - sz) / T, g: g, t: 0, life: 200, homing: false, r: 3.8, alive: true, ox: sx, oy: sy, oz: sz, so: o });
    W.events.push({ sfx: 'chip', pan: pan(W, o), d: dist(W, o) }); if (!W.fetchSaid) { W.fetchSaid = true; radio(W, 'pk_fetch'); }
  }
  function packBroken(W, o) {   // (v32) the leader down: the rest of its pack panic and scatter - and it drops a treat
    var rest = W.objs.filter(function (q) { return q.pack === o.pack && q.alive && q !== o; });
    rest.forEach(function (q) { q.scared = true; q.st = 'scat'; q.side = q.lx >= o.lx ? 1 : -1; q.burst = 0; q.tell = 0; });
    if (rest.length) { var v = add(W, PTS.pack, null); W.ms.packs = (W.ms.packs || 0) + 1; fx(W, { k: 'note', text: 'PACK BROKEN +' + v, x: o.x, y: o.y + 6, z: o.z }); W.events.push('bonus'); if (!W.brokeSaid) { W.brokeSaid = true; radio(W, 'pk_broken'); } }
    if (W.mode === 'rail') { var kinds = ['spread', 'rockets', 'bubble']; W.objs.push({ k: 'treat', rs: o.rs, lx: o.lx, ly: o.ly, kind: kinds[(W.treatN = (W.treatN || 0) + 1) % 3], alive: true, r: 0, t: 0, x: o.x, y: o.y, z: o.z }); if (!W.treatSaid) { W.treatSaid = true; radioLater(W, 'pk_treat', 40); } }
  }
  function pickupStep(W, o) {   // (v32) a dog treat (drifts to you a little) or a squeaky toy (stays put: you have to fly to it) - fly through it
    o.t = (o.t || 0) + 1; var rel = o.rs - W.s;
    if (o.k === 'treat' && rel < 170) { o.lx += (W.ox - o.lx) * 0.05; o.ly += (W.oy - o.ly) * 0.05; }
    var F = frame(W.rail, o.rs), p = local(F, o.lx, o.ly); o.x = p.x; o.y = p.y; o.z = p.z;
    if (Math.abs(rel) < 7 && Math.abs(o.lx - W.ox) < (o.k === 'toy' ? 9 : 11) && Math.abs(o.ly - W.oy) < (o.k === 'toy' ? 9 : 11)) {
      o.alive = false; var S = W.ship;
      if (o.k === 'toy') { W.ms.toys = (W.ms.toys || 0) + 1; var v = add(W, PTS.toy, null); W.ms.toyPts = (W.ms.toyPts || 0) + v; fx(W, { k: 'note', text: 'SQUEAKY TOY ' + W.ms.toys + ' OF ' + W.ms.toysAll + ' +' + v, x: S.x, y: S.y + 6, z: S.z + 40 }); W.events.push('squeak'); W.events.push('yip'); }
      else {
        if (o.kind === 'spread') W.power = { k: 'spread', t: 1200 };
        else if (o.kind === 'rockets') { W.rk = W.sp.rockets; W.bombs = Math.min(W.sp.bombs + 1, W.bombs + 1); }
        else { W.shields = Math.min(W.sp.shields, W.shields + 2); W.graceT = Math.max(W.graceT || 0, 200); }
        fx(W, { k: 'note', text: o.kind === 'spread' ? 'TREAT - SPREAD LASER!' : o.kind === 'rockets' ? 'TREAT - ROCKETS AND A BOMB!' : 'TREAT - SHIELD BUBBLE!', x: S.x, y: S.y + 6, z: S.z + 40 }); W.events.push('treat');
      }
      return;
    }
    if (rel < -40 || o.t > 2400) o.alive = false;
  }
  function spawnToy(W, q) { W.objs.push({ k: 'toy', rs: W.s + 560, lx: q.lx || 0, ly: q.ly || 0, alive: true, r: 0, t: 0, x: 0, y: 0, z: 0 }); radio(W, 'pk_toy'); }
  function fireFlak(W, o) {
    if (W.phase !== 'play') return;
    var S = W.ship, sx = o.x + o.nx * 5, sy = o.y + o.ny * 5, sz = o.z + o.nz * 5, spd = 5.5;
    var dx = S.x - sx, dy = S.y - sy, dz = S.z - sz, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1, T = d / spd, e = W.sp.err * 2.5;
    dx += S.vx * T + (W.rnd() - 0.5) * e; dy += S.vy * T + (W.rnd() - 0.5) * e; dz += S.vz * T + (W.rnd() - 0.5) * e; d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    W.eshots.push({ k: 'flak', x: sx, y: sy, z: sz, vx: dx / d * spd, vy: dy / d * spd, vz: dz / d * spd, t: 0, life: Math.round(T + 4 + W.rnd() * 8), ox: sx, oy: sy, oz: sz });
    W.events.push({ sfx: 'chip', pan: pan(W, o), d: dist(W, o) });
  }
  function deflected(W, b) {   // (v20b) a roll timed right (its first 8 steps): the laser goes back where it came from
    if (W.rollT < 18 || b.big) return;
    var o = b.so, v = PTS.deflect * W.mult, S = W.ship; W.score += v; addChain(W); W.ms.deflects = (W.ms.deflects || 0) + 1;
    fx(W, { k: 'note', text: 'DEFLECT +' + v, x: S.x, y: S.y + 6, z: S.z + 30 }); W.events.push('deflect');
    if (o && o.alive && o.r && !o.shielded && o.k !== 'warden') { hitObj(W, o, 1); fx(W, { k: 'ping', x: o.x, y: o.y, z: o.z, c: 'shield' }); }
  }
  function grazed(W, b) {   // (v20b) a laser past you, close - inside about twice its hit distance: nerve pays (not the Gaoler's walls)
    if (b.grazed || b.volley || W.grazeT > 0 || W.phase !== 'play' || W.graceT > 0) return;
    b.grazed = true; W.grazeT = 20; var v = PTS.graze * W.mult, S = W.ship; W.score += v; addChain(W); W.ms.grazes = (W.ms.grazes || 0) + 1;
    fx(W, { k: 'note', text: 'GRAZE +' + v, x: S.x, y: S.y + 4, z: S.z + 26 }); W.events.push({ sfx: 'flyby', vol: 0.3 });
  }
  function eshotsStep(W) {
    if (W.grazeT > 0) W.grazeT--;
    var S = W.ship, R = W.sp.hitR, rolling = W.rollT > 0, list = W.eshots;
    for (var i = list.length - 1; i >= 0; i--) {
      if (W.eshots !== list) return;   // (a ship was lost: the shots are gone)
      var b = list[i];
      if (!b) continue;
      if (b.k === 'shell') { b.t++; b.x += b.vx; b.y += b.vy; b.z += b.vz; continue; }   // her shells for your carrier (warshipStep lands them)
      if (b.rail) {   // a laser in the valley: moved, and tested against you, in the valley's terms
        b.t++; b.rs += b.vs; b.lx += b.vlx; b.ly += b.vly;
        var G = frame(W.rail, b.rs), q0 = local(G, b.lx, b.ly); b.vx = q0.x - b.x; b.vy = q0.y - b.y; b.vz = q0.z - b.z; b.x = q0.x; b.y = q0.y; b.z = q0.z;
        var ax = b.rs - b.vs - (W.s - W.v), ay = b.lx - b.vlx - (W.ox - W.vox), az = b.ly - b.vly - (W.oy - W.voy), bx = b.rs - W.s, by = b.lx - W.ox, bz = b.ly - W.oy;
        var gx = bx - ax, gy = by - ay, gz = bz - az, g2 = gx * gx + gy * gy + gz * gz, uu = g2 ? clamp(-(ax * gx + ay * gy + az * gz) / g2, 0, 1) : 0;
        var hx = ax + gx * uu, hy = ay + gy * uu, hz = az + gz * uu;
        if (Math.sqrt(hx * hx + hy * hy + hz * hz) < R * (b.big ? 1.6 : 1)) {
          W.eshots.splice(i, 1);
          if (b.volley && b.volley === W.volleyHit) continue;   // (a wall of fire or a beam costs one shield at most)
          if (rolling) { fx(W, { k: 'deflect', x: S.x, y: S.y, z: S.z }); W.events.push('shielded'); deflected(W, b); } else { if (b.volley) W.volleyHit = b.volley; hurt(W, 'hit', b, 'LASER'); }
          continue;
        }
        if (!rolling && uu > 0 && uu < 1 && Math.sqrt(hx * hx + hy * hy + hz * hz) < R * 2.2) grazed(W, b);
        if (b.t > b.life || bx < -60) W.eshots.splice(i, 1);
        continue;
      }
      var px = b.x - (S.x - S.vx), py = b.y - (S.y - S.vy), pz = b.z - (S.z - S.vz);   // where it was, against where you were
      b.t++;
      if (b.k === 'missile') {
        if (!b.alive) { W.eshots.splice(i, 1); continue; }
        if (b.ball) { b.vy -= b.g; if (b.g && W.valley.floorW) { var fb = W.valley.floorW(b.z) + 3.8; if (b.y + b.vy < fb) { b.vy = Math.abs(b.vy) * 0.72; if (Math.abs(b.vy) > 0.3) W.events.push({ sfx: 'chip', pan: pan(W, b), d: dist(W, b) }); } } }   // (v32) lobbed; it bounces
        else if (rolling && Math.abs(b.x - S.x) + Math.abs(b.y - S.y) + Math.abs(b.z - S.z) < 140) b.homing = false;   // a roll shakes it off
        var spd = 2.3 + W.v * 0.9, dx = S.x - b.x, dy = S.y - b.y, dz = S.z - b.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1, k = b.homing ? 0.07 : 0;
        b.vx += (dx / d * spd - b.vx) * k; b.vy += (dy / d * spd - b.vy) * k; b.vz += (dz / d * spd - b.vz) * k;
        if (b.t % 2 === 0 && !b.ball) fx(W, { k: 'smoke', x: b.x, y: b.y, z: b.z });
      }
      b.x += b.vx; b.y += b.vy; b.z += b.vz;
      var cx = b.x - S.x, cy = b.y - S.y, cz = b.z - S.z;
      if (b.k === 'flak') {
        var fd = Math.sqrt(cx * cx + cy * cy + cz * cz);
        if (b.t >= b.life || fd < 13) {   // the shell bursts: close enough and it hurts
          W.eshots.splice(i, 1); fx(W, { k: 'flak', x: b.x, y: b.y, z: b.z }); if (fd < 260) W.events.push({ sfx: 'flak', pan: pan(W, b), d: dist(W, b) });
          if (fd < 14 && !rolling) hurt(W, 'hit', b, 'FLAK'); else if (fd < 40) shakeIt(W, 0.15);
        }
        continue;
      }
      // the closest the shot came to you this step (a segment against your ship)
      var ex = cx - px, ey = cy - py, ez = cz - pz, L2 = ex * ex + ey * ey + ez * ez, u = L2 ? clamp(-(px * ex + py * ey + pz * ez) / L2, 0, 1) : 0;
      var qx = px + ex * u, qy = py + ey * u, qz = pz + ez * u, near = Math.sqrt(qx * qx + qy * qy + qz * qz);
      if (near < (b.k === 'missile' ? 4.5 : R) * (b.big ? 1.6 : 1)) {
        W.eshots.splice(i, 1);
        if (rolling) { fx(W, { k: 'deflect', x: S.x + qx, y: S.y + qy, z: S.z + qz }); W.events.push('shielded'); if (b.k !== 'missile') deflected(W, b);
          if (b.ball) { var bv = PTS.fetch * W.mult; W.score += bv; addChain(W); fx(W, { k: 'note', text: 'BATTED BACK +' + bv, x: S.x, y: S.y + 6, z: S.z + 30 }); if (b.so && b.so.alive) hitObj(W, b.so, 3); }   // (v32) batted straight back at the Fetcher
          continue; }
        if (b.k === 'missile') fx(W, { k: 'boom', x: b.x, y: b.y, z: b.z, c: 'missile' });
        hurt(W, 'hit', b, b.ball ? 'BALL' : b.k === 'missile' ? 'MISSILE' : 'LASER'); continue;
      }
      if (b.k === 'bolt' && !rolling && u > 0 && u < 1 && near < R * 2.2) grazed(W, b);
      if (b.t > b.life || (W.mode === 'rail' && W.camF && (cx * W.camF.x + cy * W.camF.y + cz * W.camF.z) < -60)) W.eshots.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- the enemies' moves
  function railEnemyStep(W, o) {
    if (o.beh === 'boss') { wardenStep(W, o); return; }
    if (o.beh === 'boss2') { millstoneStep(W, o); return; }
    if (o.wait > 0) { o.wait--; return; }
    o.t++;
    var px = o.x, py = o.y, pz = o.z, rel = o.rs - W.s, sp = W.sp, hw = W.valley.width(o.rs) / 2, prs = o.rs, plx = o.lx, ply = o.ly;
    if (o.brT > 0 && o.st !== 'hold') o.brT--;
    if (o.shieldT > 0) o.shieldT--;
    if (o.scared) {   // (v32) its leader is down: it runs for it, out over the side
      o.rs += W.v + 2.6; o.lx += o.side * 2.3; o.ly += 0.8; if (Math.abs(o.lx) > hw + 170 || o.ly > 150) o.alive = false;
    } else if (o.st === 'over') {   // breaking over you (from a hold, or pulling up out of a dive), with a roll as it goes by
      o.rs = W.s + rel - 4.2; o.ly += o.beh === 'dive' ? 1.2 : 0.7;
      if (!o.flew && rel < 30) { o.flew = true; if (!o.brT) { o.brT = 36; o.brD = o.lx > W.ox ? 1 : -1; } W.events.push({ sfx: 'flyby', pan: pan(W, o), d: dist(W, o) }); }
      if (rel < -40) o.alive = false;
    } else if (o.beh === 'headon') {   // in from ahead, hold in front of you firing, then break over you or peel away over the rim
      if (o.st === 'in') { o.rs = W.s + rel - 3 * Math.sqrt(sp.aggr); if (rel <= o.hold) { o.st = 'hold'; o.t = 0; } }
      else if (o.st === 'hold') {
        o.rs = W.s + o.hold + Math.sin(o.t * 0.04 + o.wob) * 16;
        if (o.brT > 0) o.brT--; else if (W.rnd() < 0.006) { o.brT = 36; o.brD = W.rnd() < 0.5 ? -1 : 1; o.lx0 = clamp(o.lx0 + o.brD * 22, -hw + 16, hw - 16); }   // a jink: a barrel roll and a sidestep
        o.lx = clamp(o.lx0 + Math.sin(o.t * 0.027 + o.wob) * 26, -hw + 12, hw - 12); o.ly = o.ly0 + Math.sin(o.t * 0.05 + o.wob) * 7;
        if (o.t > o.holdT) { o.st = o.peelOnly || W.rnd() >= 0.6 ? 'peel' : 'over'; o.side = o.lx > 0 ? 1 : -1; if (o.st === 'peel') { o.brT = 36; o.brD = o.side; } }
      } else { o.rs += W.v - 0.6; o.lx += o.side * 1.9; o.ly += 0.9; if (o.ly > 90) o.alive = false; }
      if ((o.st === 'in' || o.st === 'hold' || rel > 60) && !(o.quiet && o.quiet.alive)) shoot(W, o, rel);   // (in a V only the leader fires - until it is shot down)
    } else if (o.beh === 'dive') {   // from high above and ahead: down at you, firing on the way, then up and over
      var k = clamp(o.t / 80, 0, 1), e2 = k * k * (3 - 2 * k), far = 400 + o.slot * 40;
      o.rs = W.s + far - (far - 140) * e2; o.ly = 90 + (o.ly0 - 90) * e2; o.lx = clamp(o.lx0 + Math.sin(o.t * 0.05 + o.wob) * 6, -hw + 12, hw - 12);
      if (o.t > 26) shoot(W, o, o.rs - W.s);
      if (o.t >= 80) { o.st = 'over'; o.burst = 0; o.tell = 0; }
    } else if (o.st === 'pass') {   // the FLY-THROUGH: down the lane at you, firing, then faster and faster onto a line just beside your view -
      // and past on its side, knife-edge, so you see all of it go by close (the camera turns a little to follow it: lookAt)
      o.rs -= (3 + 5 * smooth(300, 80, rel)) * Math.sqrt(sp.aggr);   // (steady while far, so you can shoot it; a rush at the end)
      if (rel > 0) { var cl = camLocal(W), tx = cl.x + o.side * (15 + o.dxs); if (rel > 160 && (tx > hw - 12 || tx < -hw + 12)) { o.side = -o.side; tx = cl.x + o.side * (15 + o.dxs); } o.tx = clamp(tx, -hw + 10, hw - 10); o.ty = cl.y + (cl.roof ? -4 : 2 + o.dys); }   // (then held: it does not chase your view past you)
      var kp = smooth(320, 60, rel);
      o.lx = o.lx0 + (o.tx - o.lx0) * kp + Math.sin(o.t * 0.06 + o.wob) * 8 * (1 - kp); o.ly = o.ly0 + (o.ty - o.ly0) * kp;
      if (rel > 90) shoot(W, o, rel);
      if (!o.flew && rel < 40) { o.flew = true; W.events.push({ sfx: 'flyby', pan: pan(W, o), d: dist(W, o) }); shakeIt(W, 0.22); W.rushT = 34; }
      if (rel < -90) o.alive = false;
    } else if (o.st === 'tail') {   // the Magpie behind you (out of sight behind the camera), firing; brake and he overshoots - or in the end he does anyway
      o.rs = W.s - 64 + Math.sin(o.t * 0.05) * 6;
      o.lx += (W.ox + Math.sin(o.t * 0.031) * 14 - o.lx) * 0.05; o.ly += (W.oy + 6 - o.ly) * 0.05;
      if (W.braking) o.brakeT = (o.brakeT || 0) + 1;
      if (W.phase === 'play' && o.t > 90) {   // (two shots at a time, then a pause; v20: none in his first 1.5 s, and each pair warned - a glow and a whine)
        if (o.burst > 0) burstStep(W, o, 7, function () { fireBolt(W, o, o.x, o.y, o.z); });
        else if (--o.fireT <= 0) { o.burst = 2; o.tell = W.sp.tell; o.fireT = 85 * W.sp.eFire; W.events.push({ sfx: 'warn', tell: true, pan: 0 }); }
      }
      if (o.brakeT > 24 || o.t > 540) { o.st = 'by'; o.t = 0; radio(W, 'mg_by'); var cb = camLocal(W); o.side = o.lx > cb.x ? 1 : -1; o.burst = 0; }
    } else if (o.st === 'by') {   // the Magpie overshooting: past you, close, knife-edge - and out in front
      o.rs += W.v + 5;   // (your speed and more: he goes by you, whatever you do)
      var cy2 = camLocal(W); o.lx += (cy2.x + o.side * 16 - o.lx) * 0.15; o.ly += (cy2.y + 3 - o.ly) * 0.15;
      if (!o.flew && rel > -30) { o.flew = true; W.events.push({ sfx: 'flyby', pan: pan(W, o), d: dist(W, o) }); shakeIt(W, 0.25); W.rushT = 34; }
      if (rel > 200) { o.st = 'flee'; o.t = 0; o.lx0 = o.lx; o.ly0 = o.ly; o.fleeT = 1300; radio(W, 'ace_by'); }
    } else if (o.st === 'flee') {   // running from you down the path, weaving and rolling: get it before it gets away
      var want = 230 + Math.sin(o.t * 0.013 + o.wob) * 60;
      o.rs += W.v + clamp((want - rel) * 0.02, -1.5, 1.5) + (o.t > o.fleeT ? 4 : 0);   // (keeping ahead of you)
      o.lx = clamp(o.lx0 * 0.4 + Math.sin(o.t * 0.021 + o.wob) * 46, -hw + 12, hw - 12); o.ly = o.ly0 * 0.4 + Math.sin(o.t * 0.017 + o.wob * 2) * 22 + (o.t > o.fleeT ? (o.t - o.fleeT) * 0.8 : 0);
      if (!o.brT && W.rnd() < 0.005) { o.brT = 36; o.brD = W.rnd() < 0.5 ? -1 : 1; }   // (a jink now and then)
      if (rel > 1000) { o.alive = false; if (o.ace) { radio(W, chapter(W).id === 'shoals' ? 'mg_gone3' : 'mg_gone'); radioLater(W, 'ace_gone', 160); } }
    } else if (o.beh === 'cross') {
      o.rs = W.s + o.dist + Math.sin(o.t * 0.03) * 20;
      o.lx = o.lx0 + (o.lx0 < 0 ? 1 : -1) * o.t * 1.9 * Math.sqrt(sp.aggr); o.ly = o.ly0 + Math.sin(o.t * 0.06 + o.wob) * 10;
      if (Math.abs(o.lx) > hw + 140) o.alive = false;
      if (Math.abs(o.lx) < hw) shoot(W, o, rel);
    }
    if (W.valley.spanAt && o.st !== 'over' && o.st !== 'peel' && o.beh !== 'cross') {   // (v18) at a fork, a fighter down at your level keeps to your channel - never inside the rock
      var LnF = laneAt(W, o.rs); if (LnF && W.lane && o.ly < 60) o.lx = clamp(o.lx, LnF.c - LnF.w + 4, LnF.c + LnF.w - 4);
    }
    var F = frame(W.rail, o.rs), p = local(F, o.lx, o.ly);
    o.x = p.x; o.y = p.y; o.z = p.z; o.vs = o.rs - prs; o.vlx = o.lx - plx; o.vly = o.ly - ply;
    if (o.t > 1) {
      o.vx = o.x - px; o.vy = o.y - py; o.vz = o.z - pz;
      if (o.st === 'pass' || o.st === 'by') { var ke = o.st === 'by' ? smooth(-90, -35, rel) : smooth(320, 140, rel); o.roll += (o.side * 1.4 * ke - o.roll) * 0.1; }   // knife-edge as it goes by
      else { var lat = o.st === 'peel' ? o.side : o.beh === 'cross' ? (o.lx0 < 0 ? 1 : -1) : Math.cos(o.t * 0.027 + o.wob); o.roll += (clamp(-lat * (o.k === 'heavy' ? 0.35 : 0.7), -1, 1) - o.roll) * 0.08; }   // (an Anvil banks half as far: it is heavy)
    }
    o.face = o.st === 'in' || o.st === 'hold' || o.st === 'over' || o.st === 'dive' || o.st === 'pass';   // (it faces you while it attacks; the Magpie and the runners fly away from you)
    // it goes by close: a near miss, not a crash (fighters never ram you) - points, a whoosh and a shake
    if (o.counts && !o.rammed && Math.abs(o.rs - W.s) < 6 && Math.abs(o.lx - W.ox) < o.r * 1.2 && Math.abs(o.ly - W.oy) < o.r) { o.rammed = true; closeCall(W, o); }
  }
  function lookAt(W) {   // a fighter going by close: the chase camera turns a little to follow it, then settles (27 Oct night: "close-ups").
    // Round the warship, otherwise: it turns a little towards her nearest big target as you pass, so it stays in view longer.
    var want = 0, wantP = 0, best = 1e9, cl = camLocal(W);
    if (W.phase === 'play') for (var i = 0; i < W.objs.length; i++) {
      var o = W.objs[i]; if (!o.alive || (o.st !== 'pass' && o.st !== 'by') || o.wait > 0) continue;
      var r = o.rs - W.s + BACK; if (r < -5 || r > 200 || r >= best) continue;
      best = r; want = clamp(Math.atan2(o.lx - cl.x, Math.max(20, r)) * 0.45, -0.22, 0.22);
    }
    if (best > 1e8 && W.rail.loop && W.phase === 'play' && !W.finale) {
      var F = frame(W.rail, W.s), S = W.ship, P = null, td = 650 * 650;
      W.objs.forEach(function (q) { if (!q.alive || !(q.k === 'gen' || q.k === 'gun' || (q.k === 'bridge' && !q.shielded))) return; var dx = q.x - S.x, dy = q.y - S.y, dz = q.z - S.z, d2 = dx * dx + dy * dy + dz * dz; if (d2 < td && dx * F.fx + dy * F.fy + dz * F.fz > 0) { td = d2; P = q; } });
      if (P) { var ex = P.x - S.x, ey = P.y - S.y, ez = P.z - S.z, fw = Math.max(80, ex * F.fx + ey * F.fy + ez * F.fz); want = clamp(Math.atan2(ex * F.rx + ez * F.rz, fw) * 0.55, -0.22, 0.22); wantP = clamp(Math.atan2(ex * F.ux + ey * F.uy + ez * F.uz, fw) * 0.45, -0.15, 0.06); }   // (hardly ever up: that would push your ship off the bottom of the screen)
    }
    W.look = (W.look || 0) + (want - (W.look || 0)) * (best < 1e8 ? 0.06 : 0.025); W.lookP = (W.lookP || 0) + (wantP - (W.lookP || 0)) * 0.025;
  }
  function cineCam(W) {   // the finale's two shots: ahead of your ship looking back past it at her; then wide, her in the middle
    var S = W.ship, Ef = W.esc, f = W.finale;
    if (f < 170) {
      var fw = dirOf(S.yaw, S.pitch), rx = Math.cos(S.yaw), rz = -Math.sin(S.yaw);
      return { x: S.x + fw.x * 75 + rx * 30, y: S.y + fw.y * 75 + 14, z: S.z + fw.z * 75 + rz * 30, lx: S.x - Ef.x * 220, ly: S.y - Ef.y * 220 - 30, lz: S.z - Ef.z * 220, cut: f === 31 };
    }
    if (!W.wideCam) { var c = Math.cos(1.2), sn = Math.sin(1.2), px = Ef.x * c - Ef.z * sn, pz = Ef.x * sn + Ef.z * c, h = Math.sqrt(px * px + pz * pz) || 1; W.wideCam = { x: px / h * 1650, y: 400, z: pz / h * 1650, dx: -pz / h, dz: px / h }; }
    var Wc = W.wideCam, d = (f - 170) * 0.9;   // (a slow drift sideways)
    if (W.story && W.story.escCam && f >= 205 && f < 300) return W.story.escCam;   // (v31) the Magpie bursting out of her hangar with Noodle Doodles
    return { x: Wc.x + Wc.dx * d, y: Wc.y + d * 0.1, z: Wc.z + Wc.dz * d, lx: 0, ly: -30, lz: 0, cut: f === 170 || f === 300 };
  }
  function camLocal(W) {   // where your view is in the lane (across, up), as camera() places it - fighters that fly past aim to miss it closely, never to go through it
    var V = W.valley, roof = !V.space && V.tunnel && W.s > V.tunnel[0] - 120 && W.s < V.tunnel[1] + 40;
    if (W.view === 'cockpit') return { x: W.ox, y: W.oy + 1.2, roof: roof };
    var Cc = corridor(W), mid = (Cc.y0 + Cc.y1) / 2;
    return { x: Cc.c + (W.ox - Cc.c) * 0.6, y: mid + (W.oy - mid) * 0.85 + UP + 1 + (V.space ? 1.5 : 0), roof: roof };
  }
  function closeCall(W, o) {
    if (W.phase !== 'play') return;
    addChain(W); var v = PTS.close * W.mult; W.score += v;
    fx(W, { k: 'note', text: 'CLOSE CALL +' + v, x: o.x, y: o.y, z: o.z }); W.events.push({ sfx: 'flyby', pan: pan(W, o), d: dist(W, o) }); W.events.push('close'); shakeIt(W, 0.3);
    if (!o.brT) { o.brT = 36; o.brD = o.lx != null ? (o.lx > W.ox ? 1 : -1) : 1; }
    radio(W, 'close');
  }
  function tellOn(W, o, n) {   // (v20) a gun starts to glow before it fires - and you hear it: a warning, panned to it, at most one every 15 steps
    o.tell = n;
    if (W.t - (W.warnT || -99) >= 15) { var p = project(W, o.x, o.y, o.z); if (p && p.z < 700) { W.warnT = W.t; W.events.push({ sfx: 'warn', tell: true, pan: clamp((p.x - CX) / CX, -1, 1) * 0.7 }); } }
  }
  function burstStep(W, o, every, fire) {   // a burst under way: first the gun glows (o.tell - you can see who is about to fire), then the shots
    if (o.tell > 0) { o.tell--; return; }
    if (W.t % every === 0) { o.burst--; fire(); }
  }
  function shoot(W, o, rel) {   // lasers in bursts of two or three; heavy fighters add a missile now and then
    if (rel < 30 || rel > 560 || W.phase !== 'play') return;
    if (o.role === 'howl') { howlStep(W, o); return; }   // (v32) a Howler doesn't shoot: it howls
    if (o.role === 'fetch') { if (o.ballT > 0) { o.tell = o.ballT; if (--o.ballT === 0) fireBall(W, o); } else if (--o.fireT <= 0) { o.fireT = 150 * W.sp.eFire * (0.8 + W.rnd() * 0.4); o.ballT = W.sp.tell + 6; tellOn(W, o, o.ballT); } return; }
    if (o.burst > 0) { burstStep(W, o, 6, function () { fireBolt(W, o, o.x, o.y - 1, o.z); }); return; }
    if (--o.fireT <= 0) { o.burst = o.k === 'heavy' ? 3 : 2; tellOn(W, o, W.sp.tell); o.fireT = (o.k === 'heavy' ? 120 : 165) * W.sp.eFire * (0.7 + W.rnd() * 0.6); }
    if (o.k === 'heavy' && --o.mslT <= 0) { o.mslT = 260 * W.sp.eFire; fireMissile(W, o, o.x, o.y, o.z); }
  }
  function wardenStep(W, o) {   // the Gaoler sways in front of you while the canyon slows, in three beats:
    // 1, its gun pods: every few seconds they glow, then a wall of fire across the lane with one gap in it (fly for the gap, or roll);
    // 2, the pods gone: it sags and drops mines down the lane, its engines fire missiles; 3, the engines gone: its core charges (a glow),
    // fires a beam down the lane at where you were, then opens for two seconds - hit it then.
    var hw = W.valley.width(o.rs) / 2, px = o.x, py = o.y, pz = o.z, prs = o.rs, plx = o.lx, ply = o.ly, P = o.parts, core = P[4], ease = 0.6 + 0.4 * W.sp.eFire;
    o.t++;
    if (o.st === 'arrive') { var rel = o.rs - W.s; o.rs = W.s + rel - 2.4; if (rel <= 115) { o.st = 'fight'; o.t = 0; } W.paceMul += (0.5 - W.paceMul) * 0.02; }
    else if (o.st === 'fight') {
      W.paceMul += (0.5 - W.paceMul) * 0.02;
      o.sag += ((o.beat > 1 ? 1 : 0) - o.sag) * 0.02;
      o.rs = W.s + 110 + Math.sin(o.t * 0.011) * 20;
      o.lx = Math.sin(o.t * 0.012) * Math.max(0, Math.min(hw - 72, 40)); o.ly = 34 + Math.sin(o.t * 0.021) * 10 - o.sag * 9;
      var pods = P.filter(function (q) { return q.alive && q.name.indexOf('gun') === 0; }), engs = P.filter(function (q) { return q.alive && q.name.indexOf('eng') === 0; });
      P.forEach(function (q) { if (q.tell > 0 && q !== core) q.tell--; });
      // (v20) Classic and Fast: its gun pods can only be hurt while they glow, before each wall of fire - and then twice over (hitObj). No lock
      // box on a shielded pod: you wait for the glow. Gentle: they can be hit any time, as before.
      if (o.beat === 1 && W.speed > 1) pods.forEach(function (g) { g.shielded = !(g.tell > 0); });
      if (W.phase === 'play' && o.beat === 1 && pods.length) {   // the wall of fire
        o.cycT--;
        if (o.cycT === 60) { pods.forEach(function (g) { g.tell = 60; }); W.events.push('charge'); }
        if (o.cycT <= 0) {
          o.cycT = Math.round(240 * ease); o.walls = (o.walls || 0) + 1; if (o.walls === 1) radio(W, 'g_curtain');
          // six places across the lane, 10 apart, one of them on you; one other is left open - the gap. It costs one shield at most.
          o.gapS = -o.gapS;   // (v20: the gap swaps sides each wall - left of you, then right)
          var C = corridor(W), cx = clamp(W.ox, C.c - C.x + 25, C.c + C.x - 25), gap = o.gapS < 0 ? Math.floor(W.rnd() * 2) : 4 + Math.floor(W.rnd() * 2), vol = ++W.volleys;
          for (var j = 0; j < 6; j++) if (j !== gap) { var g = pods[j % pods.length]; fireBolt(W, g, g.x, g.y, g.z, true, { x: cx + (j - 2) * 10, y: W.oy, mute: j > 1, volley: vol }); }
        }
      } else if (W.phase === 'play' && o.beat === 2) {   // mines down the lane
        if (o.engT > 0) {   // (v20) its engines stay shielded for a while: dodge and shoot its mines first; they glow for the last second
          if (--o.engT <= 60) engs.forEach(function (q) { q.tell = o.engT; });
          if (o.engT <= 0) { engs.forEach(function (q) { q.shielded = false; q.tell = 0; }); banner(W, 'ITS ENGINES ARE OPEN', 'SHOOT THEM', 110, true); W.events.push('open'); }
        }
        if (--o.mineT <= 0) {
          o.mineT = Math.round(210 * ease); o.drops = (o.drops || 0) + 1; if (o.drops === 1) radio(W, 'g_mines');
          var C2 = corridor(W);
          for (var m = -1; m <= 1; m++) W.objs.push({ k: 'mine', rs: o.rs - 10, vs: W.v * 0.55, lx: clamp(W.ox + m * 17 + (W.rnd() - 0.5) * 6, C2.c - C2.x + 6, C2.c + C2.x - 6), ly: clamp(W.oy + (W.rnd() - 0.5) * 8, C2.y0 + 3, C2.y1 - 3), r: 4.2, hp: 2, alive: true, spin: W.rnd() * 6 });
          W.events.push({ sfx: 'mine', pan: pan(W, o), d: dist(W, o) });
        }
        if (--o.mslT <= 0 && engs.length) { o.mslT = Math.round(200 * W.sp.eFire); var en = engs[Math.floor(W.rnd() * engs.length)]; fireMissile(W, o, en.x, en.y, en.z); }
      } else if (W.phase === 'play' && o.beat === 3) {   // the core: charge, beam, open
        o.cycT--;
        if (o.cst === 'charge') { core.tell = o.cycT; if (o.cycT <= 0) { o.cst = 'beam'; o.cycT = 30; } }
        else if (o.cst === 'beam') { if (o.cycT === 29) o.vol = ++W.volleys; if (o.cycT % 3 === 0) fireBolt(W, core, core.x, core.y, core.z, true, { x: o.beamX, y: o.beamY, mute: o.cycT % 9 !== 0, volley: o.vol }); if (o.cycT <= 0) { o.cst = 'open'; o.cycT = 150; core.shielded = false; W.events.push('open'); } }
        else if (o.cycT <= 0) { o.cst = 'charge'; o.cycT = 60; core.shielded = true; o.beamX = W.ox; o.beamY = W.oy; W.events.push('charge'); o.beams = (o.beams || 0) + 1; if (o.beams === 1) radio(W, 'g_beam'); }
      }
      if (W.phase === 'play' && o.beat !== 2 && --o.mslT <= 0) { o.mslT = Math.round(260 * W.sp.eFire); fireMissile(W, o, o.x, o.y - 6, o.z); }
      if (--o.life <= 0 && W.phase === 'play') { o.st = 'flee'; banner(W, 'THE GAOLER GOT AWAY', '', 140); say(W, 'The Gaoler got away.'); radio(W, 'g_away'); climbSoon(W); }
    } else {   // away: it got away from you - or (v20) beaten, limping off burning and blowing apart, out of the basin (it is not finished: a later chapter)
      var bt = o.st === 'beaten';
      o.rs += W.v + (bt ? 0.6 + o.t * 0.012 : 5); o.ly += bt ? -0.12 + o.t * 0.0035 : 1.2; W.paceMul += (1 - W.paceMul) * 0.03;   // (beaten: it stays in sight a few seconds, sinking a little, then labours up and away)
      if (bt) {
        o.lx += Math.sin(o.t * 0.05) * 0.7;
        if (o.t % 8 === 0) fx(W, { k: 'boom', x: o.x + (W.rnd() - 0.5) * 60, y: o.y + (W.rnd() - 0.3) * 24, z: o.z + (W.rnd() - 0.5) * 30, c: 'warden', big: o.t % 32 === 0 });
        if (o.t % 32 === 0) W.events.push({ sfx: 'boom', pan: pan(W, o), d: dist(W, o) });
      }
      if (o.rs - W.s > 1400) { o.alive = false; o.parts.forEach(function (q) { q.alive = false; }); W.warden = null; }
    }
    var F = frame(W.rail, o.rs), p = local(F, o.lx, o.ly);
    o.x = p.x; o.y = p.y; o.z = p.z; o.vx = o.x - px; o.vy = o.y - py; o.vz = o.z - pz; o.vs = o.rs - prs; o.vlx = o.lx - plx; o.vly = o.ly - ply; o.yaw = F.yaw; o.pitch = F.pitch; o.roll = -clamp((o.x - px) * F.rx + (o.z - pz) * F.rz, -1, 1) * 0.25 + (o.st === 'beaten' ? Math.sin(o.t * 0.04) * 0.35 + 0.2 : 0);
    o.parts.forEach(function (q) { var P = local(F, o.lx + q.dx, o.ly + q.dy, q.dz); q.x = P.x; q.y = P.y; q.z = P.z; q.vx = o.vx; q.vy = o.vy; q.vz = o.vz; });
  }
  function fighterStep(W, o) {   // free flight: come at you, fire on the way in, break away, come round again
    if (o.wait > 0) { o.wait--; return; }
    o.t++;
    var S = W.ship, dx = S.x - o.x, dy = S.y - o.y, dz = S.z - o.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1, tx, ty, tz;
    if (o.st === 'arrive') { tx = S.x; ty = S.y; tz = S.z; if (o.t > 70 && d < 900) o.st = 'engage'; }
    else if (o.st === 'engage') {
      var lead = Math.min(40, d / 7); tx = S.x + S.vx * lead; ty = S.y + S.vy * lead; tz = S.z + S.vz * lead;
      if (d < 75) {   // breaking away past you: a roll, a whoosh as it goes by
        o.st = 'break'; o.bt = 70 + W.rnd() * 50; if (W.rnd() < 0.5) { o.brT = 36; o.brD = W.rnd() < 0.5 ? -1 : 1; } var ax = -dx / d + (W.rnd() - 0.5), ay = 0.5 + W.rnd() * 0.5, az = -dz / d + (W.rnd() - 0.5), al = Math.sqrt(ax * ax + ay * ay + az * az); o.bx = ax / al; o.by = ay / al; o.bz = az / al;
        if (d < 60) W.events.push({ sfx: 'flyby', pan: pan(W, o), d: dist(W, o) });
      }
    } else { tx = o.x + o.bx * 500; ty = o.y + o.by * 500; tz = o.z + o.bz * 500; if (--o.bt <= 0) o.st = 'engage'; }
    var wy = Math.atan2(tx - o.x, tz - o.z), wp = Math.atan2(ty - o.y, Math.sqrt((tx - o.x) * (tx - o.x) + (tz - o.z) * (tz - o.z)));
    if (o.brT > 0) o.brT--;
    var dyaw = clamp(wrapA(wy - o.yaw), -o.turn, o.turn), dp = clamp(wp - o.pitch, -o.turn, o.turn);
    o.yaw = wrapA(o.yaw + dyaw); o.pitch = clamp(o.pitch + dp, -1.2, 1.2); o.roll += (clamp(-dyaw * 30, -1.1, 1.1) - o.roll) * 0.1;
    var f = dirOf(o.yaw, o.pitch); o.vx = f.x * o.spd; o.vy = f.y * o.spd; o.vz = f.z * o.spd;
    o.x += o.vx; o.y += o.vy; o.z += o.vz;
    pushOut(o, 4);
    // fire when you are in front of it
    var ang = Math.acos(clamp((f.x * dx + f.y * dy + f.z * dz) / d, -1, 1));
    if (o.st === 'engage' && d < 620 && ang < 0.3 && W.phase === 'play') {
      if (o.burst > 0) burstStep(W, o, 6, function () { fireBolt(W, o, o.x, o.y, o.z); });
      else if (--o.fireT <= 0) { o.burst = o.k === 'heavy' ? 3 : 2; tellOn(W, o, W.sp.tell); o.fireT = (o.k === 'heavy' ? 100 : 120) * W.sp.eFire * (0.7 + W.rnd() * 0.6); }
      if (o.k === 'heavy' && --o.mslT <= 0) { o.mslT = 280 * W.sp.eFire; fireMissile(W, o, o.x, o.y, o.z); }
    }
    if (o.nearT > 0) o.nearT--;
    if (o.counts && d < 12 && !o.nearT && W.phase === 'play') { o.nearT = 90; closeCall(W, o); if (o.st !== 'break') { o.st = 'break'; o.bt = 60; o.bx = -dx / d; o.by = 0.6; o.bz = -dz / d; } }   // (fighters never ram you: a near miss)
  }
  function warshipStep(W) {   // her turrets and main gun
    var S = W.ship;
    if (W.carrier && W.carrier.hitT > 0) W.carrier.hitT--;
    for (var i = 0; i < W.objs.length; i++) {
      var o = W.objs[i];
      if (!o.alive || !o.free) continue;
      if (o.k === 'turret') {
        var dx = S.x - o.x, dy = S.y - o.y, dz = S.z - o.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz), face = (dx * o.nx + dy * o.ny + dz * o.nz) / (d || 1);
        o.aimX = dx / (d || 1); o.aimY = dy / (d || 1); o.aimZ = dz / (d || 1);
        if (d > (W.mode === 'rail' ? 620 : 760) || face < -0.15 || W.phase !== 'play') continue;
        if (o.burst > 0) burstStep(W, o, o.kind === 'flak' ? 9 : 6, function () { if (o.kind === 'flak') fireFlak(W, o); else fireBolt(W, o, o.x + o.nx * 6, o.y + o.ny * 6, o.z + o.nz * 6); });
        else if ((o.fireT -= W.runHot ? 1.7 : 1) <= 0) { o.burst = o.kind === 'flak' ? 2 : 3; tellOn(W, o, W.sp.tell); o.fireT = (o.kind === 'flak' ? 190 : 170) * W.sp.eFire * (W.mode === 'rail' && o.ny >= 0 ? 1.4 : 1) * (0.7 + W.rnd() * 0.6); }   // (the guns under her fire at the full rate: she guards her belly)
      } else if (o.k === 'keel') {   // the KEEL GUN: when you are under her it runs along its track to stay level with you, swings round and fires heavy bolts
        var kx = S.x - o.x, ky = S.y - o.y, kz = S.z - o.z, kd = Math.sqrt(kx * kx + ky * ky + kz * kz) || 1, under = S.y < WARSHIP.boxes[0][1] - 4 && Math.abs(S.x) < 280 && S.z > o.z0 - 600 && S.z < o.z1 + 600 && W.phase === 'play';
        o.aimX = kx / kd; o.aimY = ky / kd; o.aimZ = kz / kd;
        var want = under ? clamp(S.z + (S.vz || 0) * 110, o.z0, o.z1) : o.z, top = 4.4 * Math.sqrt(W.sp.aggr);   // (it runs ahead of you, turned back at you, firing - where you can see it; thrust and you catch it)
        o.vz += clamp((want - o.z) * 0.02 - o.vz * 0.12, -0.35, 0.35); o.vz = clamp(o.vz, -top, top); if (!under) o.vz *= 0.9;
        o.z = clamp(o.z + o.vz, o.z0, o.z1); o.run = Math.abs(o.vz);
        if (!under) { o.burst = 0; continue; }
        if (!o.awake) { o.awake = true; radio(W, 'w_keel'); W.events.push('alarm'); o.fireT = 70; }
        if (kd > 700 || ky > 0) continue;
        if (o.burst > 0) burstStep(W, o, 7, function () { fireBolt(W, o, o.x, o.y - 6, o.z, true); });
        else if (--o.fireT <= 0) { o.burst = 4; o.tell = 30; o.fireT = 120 * W.sp.eFire * (0.8 + W.rnd() * 0.4); }   // (a long glow first: you can see it charge)
      } else if (o.k === 'gun' && W.carrier && !W.carrier.lost && W.phase === 'play' && --o.fireT <= 0) {   // a shell for your carrier, far off
        o.fireT = W.sp.shell; var C = W.carrier, cx = C.x - o.x, cy = C.y - o.y, cz = C.z - o.z, cd = Math.sqrt(cx * cx + cy * cy + cz * cz);
        W.eshots.push({ k: 'shell', x: o.x, y: o.y + 6, z: o.z, vx: cx / cd * 9, vy: cy / cd * 9, vz: cz / cd * 9, t: 0, life: Math.round(cd / 9) });
        fx(W, { k: 'muzzle', x: o.x, y: o.y + 8, z: o.z }); W.events.push({ sfx: 'bigboom2', pan: pan(W, o), d: dist(W, o) }); shakeIt(W, 0.12);
      }
    }
    for (var j = W.eshots.length - 1; j >= 0; j--) {   // her shells landing on your carrier
      var sh = W.eshots[j];
      if (sh.k !== 'shell' || sh.t < sh.life) continue;
      W.eshots.splice(j, 1);
      if (!W.carrier || W.carrier.lost || W.phase !== 'play') continue;
      var was = W.carrier.hp; W.carrier.hp = Math.max(0, W.carrier.hp - 6); W.carrier.hitT = 120; fx(W, { k: 'boom', x: sh.x, y: sh.y, z: sh.z, c: 'carrier' });
      if (W.carrier.hp <= 0) {   // she pulls back, badly hurt: it costs you points, not a ship
        W.carrier.lost = true; var lossV = Math.min(PTS.carrierLost, W.score - W.score0); W.score -= Math.max(0, lossV);
        banner(W, 'HARBOURLIGHT IS PULLING BACK', '-' + num(PTS.carrierLost), 170); radio(W, 'w_lost'); W.events.push('alarm');
      } else if ((was > 70 && W.carrier.hp <= 70) || (was > 40 && W.carrier.hp <= 40) || (was > 20 && W.carrier.hp <= 20)) radio(W, 'w_carrier');   // (on the panel up top, not across the middle of the fight)
    }
  }

  // ---------------------------------------------------------------- aiming, firing, hits
  function steer(W, input) {
    var a = W.aim, tx = null, ty = null, sp = W.sp;
    var ctrl = input.ctrl || (input.touch ? 'touch' : input.mouseX == null ? 'keys' : 'mouse');
    W.ctrl = ctrl;
    W.steerMode = W.mode !== 'free' ? 'cursor' : ctrl === 'mouseaim' ? 'aim' : ctrl === 'pad' || ctrl === 'keys' ? 'stick' : 'cursor';
    if (W.steerMode === 'aim') {   // mouse-aim: the mouse moves where you want to go; the gunsight is set on the nose after the camera moves
      if (input.mdx) W.aimYaw = wrapA(W.aimYaw + input.mdx * 0.0024);
      if (input.mdy) W.aimPitch = clamp(W.aimPitch - input.mdy * 0.0024, -1.15, 1.15);
      return;
    }
    // FLYING and AIMING apart (28 Oct, the owner: "you can't fly one way and shoot another"). In the valley your ship flies towards the HELM point;
    // the crosshair (W.aim) is where you shoot. With a controller the left stick moves the helm and the right stick moves the crosshair away from
    // it (let go and it sits on your heading again); with the mouse in Separate mode the arrow keys fly and the mouse aims. Otherwise (Together,
    // a tablet) the helm simply follows the crosshair, as before.
    var h = W.helm, split = W.split = !!input.split && W.mode === 'rail';
    if (W.steerMode === 'stick') { aimOffset(W, input); return; }   // (free flight: the stick or the keys turn the ship in flyFree; the right stick aims off the nose)
    if (ctrl === 'pad') {   // the left stick moves your ship progressively: push and it gathers speed across the canyon, let go and it eases to a stop where it is
      helmMove(W, input.sx || 0, input.sy || 0, input.padQuick);
      if (split) { aimOffset(W, input); a.vx = clamp(h.x + W.aimOff.x, AIM.x0, AIM.x1) - a.x; a.vy = clamp(h.y + W.aimOff.y, AIM.y0, AIM.y1) - a.y; a.x += a.vx; a.y += a.vy; }
      else { a.vx = h.x - a.x; a.vy = h.y - a.y; a.x = h.x; a.y = h.y; }
      return;
    }
    if (split && ctrl === 'mouse') helmMove(W, (input.right ? 1 : 0) - (input.left ? 1 : 0), (input.down ? 1 : 0) - (input.up ? 1 : 0), false);   // the keys fly; the mouse aims (below)
    if (ctrl === 'mouseaim' && W.mode === 'rail') { a.vx = (input.mdx || 0) * 0.35; a.vy = (input.mdy || 0) * 0.35; a.x = clamp(a.x + a.vx, AIM.x0, AIM.x1); a.y = clamp(a.y + a.vy, AIM.y0, AIM.y1); return; }
    if (input.touch && input.tx != null) {
      var A = W.touchA || (W.touchA = { fx: input.tx, fy: input.ty, ax: a.x, ay: a.y });
      tx = A.ax + (input.tx - A.fx) * 1.6; ty = A.ay + (input.ty - A.fy) * 1.6;
      var cx = clamp(tx, AIM.x0, AIM.x1), cy = clamp(ty, AIM.y0, AIM.y1);
      if (cx !== tx) A.fx = input.tx - (cx - A.ax) / 1.6;
      if (cy !== ty) A.fy = input.ty - (cy - A.ay) / 1.6;
      tx = cx; ty = cy;
    } else W.touchA = null;
    if (tx == null && input.mouseX != null) { tx = clamp(input.mouseX, AIM.x0, AIM.x1); ty = clamp(input.mouseY == null ? a.y : input.mouseY, AIM.y0, AIM.y1); }
    if (tx != null) { var nx = a.x + (tx - a.x) * 0.6, ny = a.y + (ty - a.y) * 0.6; a.vx = nx - a.x; a.vy = ny - a.y; a.x = nx; a.y = ny; }
    else {
      var kx = (input.right ? 1 : 0) - (input.left ? 1 : 0), ky = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      a.vx = kx ? clamp(a.vx + kx * 0.6, -sp.keys, sp.keys) : a.vx * 0.55; a.vy = ky ? clamp(a.vy + ky * 0.6, -sp.keys, sp.keys) : a.vy * 0.55;
      if (Math.abs(a.vx) < 0.02) a.vx = 0; if (Math.abs(a.vy) < 0.02) a.vy = 0;
      a.x = clamp(a.x + a.vx, AIM.x0, AIM.x1); a.y = clamp(a.y + a.vy, AIM.y0, AIM.y1);
      if (W.mode === 'free' && !kx && !ky) { a.x += (CX - a.x) * 0.06; a.y += ((AIM.y0 + AIM.y1) / 2 - a.y) * 0.06; }   // keys let go: the ship levels out
    }
    if (!(split && ctrl === 'mouse')) { h.x = a.x; h.y = a.y; h.vx = a.vx; h.vy = a.vy; }   // (together: you fly where you aim)
  }
  function helmMove(W, sx, sy, quick) {   // the helm (where your ship flies) moved progressively: it gathers speed, and slows quicker than it speeds up - no long drift
    var h = W.helm, vmax = quick ? 9 : 7.5, tvx = sx * vmax, tvy = sy * vmax * 0.85;
    var ease = function (v, t) { var slowing = Math.abs(t) < Math.abs(v) || t * v < 0, n = v + (t - v) * (quick ? 0.25 : slowing ? 0.2 : 0.09); return !t && Math.abs(n) < 0.05 ? 0 : n; };
    h.vx = ease(h.vx, tvx); h.vy = ease(h.vy, tvy);
    var px = clamp(h.x + h.vx, AIM.x0, AIM.x1), py = clamp(h.y + h.vy, AIM.y0, AIM.y1);
    if (px !== h.x + h.vx) h.vx = 0; if (py !== h.y + h.vy) h.vy = 0;   // (at the edge: stopped, not pressed against it)
    h.x = px; h.y = py;
  }
  function aimOffset(W, input) {   // the right stick: the crosshair pushed away from your heading (the valley) or your nose (free flight); let go and it comes back
    var o = W.aimOff, tx = (input.ax || 0) * 170, ty = (input.ay || 0) * 105;
    o.x += (tx - o.x) * 0.3; o.y += (ty - o.y) * 0.3;
    if (!input.ax && Math.abs(o.x) < 0.3) o.x = 0; if (!input.ay && Math.abs(o.y) < 0.3) o.y = 0;
  }
  function helmUnit(W) {   // the helm as -1..1 across and up the screen, like aimUnit
    var h = W.helm;
    return [clamp((h.x - CX) / (CX - AIM.x0), -1, 1), clamp((h.y - (AIM.y0 + AIM.y1) / 2) / ((AIM.y1 - AIM.y0) / 2), -1, 1)];
  }
  function trigger(W, input) {
    if (W.gap > 0) W.gap--;
    if (!(input.fire || input.tap)) return;
    if (W.gap > 0 && !(input.tap && W.gap <= W.sp.fireGap - 3)) return;
    W.gap = W.sp.fireGap;
    var P = aimPoint(W); W.shots.push({ x: P.x, y: P.y, t: 0, tgt: autoPick(W, P.x, P.y, W.autoR) }); W.ms.shots++; W.events.push('laser');   // (tgt: auto-aim's lock)
  }
  // AUTO-AIM (27 Oct, the owner: "it needs some auto-targeting"): each shot locks on the best target near the crosshair when it is fired - nearest
  // the crosshair, nearer ones and missiles first - and the bolt flies to it. W.autoR is how near (screen units; 0 = off), from the Auto-aim setting.
  // (v26, 29 Oct; the owner: they "just blow up really quickly" - shot down as specks the moment they appeared) a fighter can only be hit once
  // it is inside FOE_REACH (depth in view): they come in, big, and the fight happens close. Rockets and the shock bomb are not limited.
  var FOE_REACH = 340;
  function beyondReach(W, o, p) { if (o.k !== 'dart' && o.k !== 'heavy') return false; p = p || project(W, o.x, o.y, o.z); return !p || p.z > FOE_REACH; }
  function autoPick(W, x, y, R, skip) {
    if (!(R > 0)) return null;
    var best = null, bs = 1e9, f = W.focal || FOCAL, n = W.objs.length;
    for (var i = 0; i < n + W.eshots.length; i++) {
      var o = i < n ? W.objs[i] : W.eshots[i - n];
      if (!o.alive || !o.r || o.wait > 0 || o.shielded || o.x == null || (skip && skip.indexOf(o) >= 0)) continue;
      var p = project(W, o.x, o.y, o.z); if (!p || p.z > 900 || p.z < 6 || beyondReach(W, o, p) || p.x < AIM.x0 - 12 || p.x > AIM.x1 + 12 || p.y < 0 || p.y > GH) continue;
      var d = Math.max(0, Math.sqrt((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y)) - o.r * f / p.z); if (d > R) continue;
      var sc = d + p.z * 0.03 - (o.k === 'missile' ? 25 : 0);
      if (sc < bs) { bs = sc; best = o; }
    }
    return best;
  }
  function aimPoint(W) {   // where your shots go: the cursor or gunsight; with mouse-aim, the guns converge on the dot when it is near the sight
    var d = W.aimDot;
    if (d && W.steerMode === 'aim' && Math.hypot(d.x - W.aim.x, d.y - W.aim.y) < 40) return d;
    return W.aim;
  }
  function pick(W, x, y, extra, skip) {
    var best = null, bz = 1e9, pad = W.sp.assist + (extra || 0) + (W.ctrl === 'pad' ? 5 : 0) + (W.mode === 'free' && W.steerMode !== 'cursor' ? 9 : 0), f = W.focal || FOCAL, i, o, p, rr, n = W.objs.length;
    for (i = 0; i < n + W.eshots.length; i++) {
      o = i < n ? W.objs[i] : W.eshots[i - n];
      if (!o.alive || !o.r || o.wait > 0 || (skip && skip.indexOf(o) >= 0)) continue;
      p = project(W, o.x, o.y, o.z);
      if (!p || p.z > 1400 || beyondReach(W, o, p)) continue;
      rr = o.r * f / p.z + pad;
      if ((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) <= rr * rr && p.z < bz) { best = o; bz = p.z; }
    }
    return best;
  }
  function shots(W) {
    for (var i = W.shots.length - 1; i >= 0; i--) {
      var s = W.shots[i];
      if (++s.t < SHOT_T) continue;
      W.shots.splice(i, 1);
      if (W.phase !== 'play') continue;
      var gun = W.mode === 'free' && W.steerMode !== 'cursor', G = gun ? aimPoint(W) : s, sx = G.x, sy = G.y;   // (from the guns on the nose: what is in the sight now)
      var o = s.tgt && s.tgt.alive && !s.tgt.shielded && !beyondReach(W, s.tgt) ? s.tgt : pick(W, sx, sy);   // (auto-aim's lock, or what is under the sight)
      if (o) {   // a hit: a mark round the sight (gold for a kill) and a tick
        W.ms.hits++; var hp0 = o.hp, down = hitObj(W, o, 1);
        fx(W, { k: 'hitmark', sx: sx, sy: sy, kill: !!down, big: !!down && (o.k === 'heavy' || o.k === 'turret' || o.k === 'wpart' || o.k === 'gen' || o.k === 'gun' || o.k === 'bridge' || o.k === 'keel'), chip: !down && (hp0 == null || o.hp < hp0) });
        if (!o.shielded) W.events.push('tick');
      } else fx(W, { k: 'miss', sx: sx, sy: sy });
      if (W.power && W.power.k === 'spread') [-28, 28].forEach(function (dx) { var o2 = pick(W, sx + dx, sy + 4, 0, o ? [o] : null); if (o2) { var d2 = hitObj(W, o2, 1); fx(W, { k: 'hitmark', sx: sx + dx, sy: sy + 4, kill: !!d2 }); } });   // (v32) the spread laser treat
    }
  }
  function addChain(W) { W.chain++; W.chainT = 150; var m = 1 + Math.min(3, Math.floor(W.chain / 5)); if (m > W.mult) { W.mult = m; W.events.push('chain'); fx(W, { k: 'chain', m: m }); } }
  var CAT = { rock: 'rocks', boulder: 'rocks', mpart: 'millstone', gate: 'gates', dart: 'fighters', heavy: 'fighters', turret: 'guns', drone: 'drones', mine: 'mines', missile: 'mines', wpart: 'gaoler', gen: 'gens', gun: 'gun', keel: 'keel', bridge: 'bridge' };
  function add(W, n, o) { addChain(W); var v = n * W.mult; W.score += v; if (o) { fx(W, { k: 'pts', x: o.x, y: o.y, z: o.z, v: v }); var ct = CAT[o.k]; if (ct && W.ms.pk) W.ms.pk[ct] = (W.ms.pk[ct] || 0) + v; } return v; }
  var TGT = { dart: 1, heavy: 1, drone: 1, turret: 1, mine: 1, wpart: 1, gen: 1, gun: 1, bridge: 1, keel: 1, gate: 1, rock: 1, boulder: 1, mpart: 1 };
  function targetsNear(W) {   // (v20) anything to shoot (or fly through) near enough: while there isn't, your chain's clock stands still
    var S = W.ship;
    for (var i = 0; i < W.objs.length; i++) {
      var o = W.objs[i]; if (!o.alive || o.wait > 0 || !TGT[o.k] || o.passed) continue;
      if (o.rs != null && !o.free) { var rel = o.rs - W.s; if (rel > -20 && rel < 900) return true; }
      else if (o.x != null && Math.abs(o.x - S.x) + Math.abs(o.y - S.y) + Math.abs(o.z - S.z) < 1500) return true;
    }
    return false;
  }
  function boom(W, o, c, n, big) { fx(W, { k: 'boom', x: o.x, y: o.y, z: o.z, c: c, n: n || 14, big: !!big, mount: typeof big === 'string' ? big : null, side: o.side, r: o.r }); }
  function dist(W, o) { var S = W.ship; return Math.sqrt((o.x - S.x) * (o.x - S.x) + (o.y - S.y) * (o.y - S.y) + (o.z - S.z) * (o.z - S.z)); }   // (v20: how far off a sound is)
  function pan(W, o) { var p = project(W, o.x, o.y, o.z); return p ? clamp((p.x - CX) / CX, -1, 1) * 0.7 : 0; }
  function nearShake(W, o, k) { var S = W.ship, d = Math.abs(o.x - S.x) + Math.abs(o.y - S.y) + Math.abs(o.z - S.z); shakeIt(W, Math.max(0.12, d < 400 ? k * (1 - d / 400) : 0)); }
  function hitStop(W, n) { if (W.freezeCD > 0) return; W.freeze = Math.max(W.freeze, n); W.freezeCD = 18; }
  function damageIt(W, o, dmg, c) { o.hp -= dmg; if (o.hp > 0) { o.hurtAt = W.t; fx(W, { k: 'ping', x: o.x, y: o.y, z: o.z, c: c }); W.events.push('chip'); return false; } return true; }
  function hitObj(W, o, dmg) {   // true when it went down
    dmg = dmg || 1;
    switch (o.k) {
      case 'dart': case 'heavy':
        if (o.shieldT > 0) { if (dmg >= 3) { o.shieldT = 0; fx(W, { k: 'ping', x: o.x, y: o.y, z: o.z, c: 'shield' }); } else { fx(W, { k: 'ping', x: o.x, y: o.y, z: o.z, c: 'shield' }); W.events.push('shielded'); return false; } }   // (v32) a Howler's shield: rockets break it
        if (o.k === 'heavy' && dmg < 3 && (o.st === 'in' || o.st === 'hold')) { o.fur = (o.fur || 0) + 1; if (o.fur % 3) { fx(W, { k: 'ping', x: o.x, y: o.y, z: o.z, c: 'shield' }); W.events.push('shielded'); if (!W.furSaid) { W.furSaid = true; radio(W, 'pk_fur'); } return false; } }   // (v32) a Fluffball's fur: lasers mostly soak in while it faces you
        if (!damageIt(W, o, dmg, o.k)) return false;
        o.alive = false; o.killed = true; W.ms.kills++; add(W, PTS[o.k], o);
        if (o.role === 'howl') { W.ms.howlers = (W.ms.howlers || 0) + 1; add(W, PTS.howler, o); W.objs.forEach(function (f) { if (f.shieldBy === o) f.shieldT = 0; }); fx(W, { k: 'note', text: 'HOWLER DOWN - SHIELDS DOWN', x: o.x, y: o.y + 6, z: o.z }); radio(W, 'pk_howldown'); }
        if (o.packLead) packBroken(W, o);
        if (o.ace) { add(W, PTS.ace, o); banner(W, 'THE MAGPIE IS DOWN!', '+' + num(PTS.ace), 150); radio(W, chapter(W).id === 'shoals' ? 'mg_down3' : 'mg_down'); radioLater(W, 'ace_down', 110); W.ms.ace = 1; } boom(W, o, o.k, 22, true); nearShake(W, o, 0.35); W.events.push({ sfx: o.k === 'heavy' ? 'bigboom2' : 'boom', pan: pan(W, o), d: dist(W, o) }); W.events.push({ sfx: 'wreck', pan: pan(W, o), d: dist(W, o), delay: 0.9 });   // (v26: its wreck burns on for about a second before it goes)
        hitStop(W, o.k === 'heavy' ? 5 : 3); return true;   // (a kill: the world holds still for a beat)
      case 'rock': case 'boulder': {   // (chapter 3) rock: shot to pieces - a big one splits in two or three
        if (!damageIt(W, o, dmg, 'rock')) return false;
        o.alive = false; W.ms.rocks = (W.ms.rocks || 0) + 1; add(W, o.k === 'boulder' ? PTS.boulder : o.r > 7 ? PTS.bigRock : PTS.rock, o); boom(W, o, 'rock', 12); W.events.push({ sfx: 'crack', pan: pan(W, o), d: dist(W, o) });
        if (o.k === 'rock' && o.r > 7) for (var sp2 = 0, nsp = o.r > 10 ? 3 : 2; sp2 < nsp; sp2++) { var an = W.rnd() * 6.283; W.objs.push({ k: 'rock', rs: o.rs + 6, lx: o.lx, ly: o.ly, r: 3 + W.rnd() * 1.5, hp: 1, alive: true, spin: W.rnd() * 6, v: Math.floor(W.rnd() * 4), vlx: Math.cos(an) * 0.5, vly: Math.sin(an) * 0.5 }); }
        return true;
      }
      case 'mpart': {   // (chapter 3) the Millstone's arms, cutter, reactor
        var M = o.parent;
        if (o.shielded) { fx(W, { k: 'ping', x: o.x, y: o.y, z: o.z, c: 'shield' }); W.events.push('shielded'); return false; }
        if (!damageIt(W, o, dmg, 'warden')) return false;
        o.alive = false; add(W, PTS.mpart, o); boom(W, o, 'warden', 22, true); W.events.push('bigboom2'); W.freeze = 3; shakeIt(W, 0.45); fx(W, { k: 'wpartoff', name: o.name, x: o.x, y: o.y, z: o.z, vx: o.vx, vy: o.vy, vz: o.vz });
        if (o.name.indexOf('arm') === 0 && !M.parts.some(function (q) { return q.alive && q.name.indexOf('arm') === 0; })) {
          M.beat = 2; M.cycT = 120; banner(W, 'ITS ARMS ARE GONE', 'NOW ITS CUTTER - FIND THE GAP', 140, true); radio(W, 's_cutter');
        } else if (o.name === 'cutter') { M.beat = 3; M.cst = 'wait'; M.cycT = 60; banner(W, 'ITS CUTTER IS DOWN', 'HIT THE REACTOR WHEN IT OPENS', 140, true); radio(W, 's_reactor'); }
        else if (o.name === 'reactor') {
          W.ms.mill = 1; W.ms.millT = W.ct - (M.t0 || W.ct); W.score += PTS.millstone; W.ms.pk.millstone = (W.ms.pk.millstone || 0) + PTS.millstone; W.freeze = 8; shakeIt(W, 1);
          M.st = 'dying'; M.t = 0; fx(W, { k: 'boom', x: M.x, y: M.y, z: M.z, c: 'warden', big: true, huge: true }); W.events.push('bigboom');
          banner(W, 'THE MILLSTONE IS FINISHED', '+' + num(PTS.millstone) + ' - IT IS GOING CRITICAL', 170, true); radio(W, 's_under');
        }
        return true;
      }
      case 'missile': o.alive = false; add(W, PTS.missile, o); boom(W, o, 'missile', 10); W.events.push({ sfx: 'pop', pan: pan(W, o), d: dist(W, o) }); return true;
      case 'drone': if (o.raid && !damageIt(W, o, dmg, 'drone')) return false; o.hp = 0; o.alive = false; W.ms.drones++;   // (v28: the farm's raiders take two hits) add(W, PTS.drone, o); boom(W, o, 'drone', 12); W.events.push({ sfx: 'pop', pan: pan(W, o), d: dist(W, o) }); return true;
      case 'mine':
        if (!damageIt(W, o, dmg, 'turret')) return false;
        o.alive = false; add(W, PTS.mine, o); boom(W, o, 'missile', 14); W.events.push({ sfx: 'pop', pan: pan(W, o), d: dist(W, o) }); return true;
      case 'turret':
        if (!damageIt(W, o, dmg, 'turret')) return false;
        o.alive = false; W.ms.turrets++; add(W, o.mount === 'wall' ? PTS.bunker : PTS.turret, o); boom(W, o, 'turret', 16, o.mount || true); nearShake(W, o, 0.3); W.events.push({ sfx: 'turret', pan: pan(W, o), d: dist(W, o) }); hitStop(W, 4);
        if (o.rs != null && !o.tallied) { o.tallied = true; W.ms.turretsAll++; }   // (v20: counted when it is shot, or when you pass it on your side of a fork)
        if (W.mode === 'rail' && W.ms.turrets === 1) radio(W, 'v_gun1');
        return true;
      case 'wpart': {
        var P = o.parent, isEng = function (q) { return q.alive && q.name.indexOf('eng') === 0; }, isPod = function (q) { return q.alive && q.name.indexOf('gun') === 0; };
        if (o.shielded) { fx(W, { k: 'ping', x: o.x, y: o.y, z: o.z, c: 'shield' }); W.events.push('shielded'); return false; }
        if (o.tell > 0 && o.name.indexOf('gun') === 0) dmg *= 2;   // (v20) a gun pod while it glows: twice the damage - the risky shot pays
        if (!damageIt(W, o, dmg, 'warden')) return false;
        o.alive = false; add(W, PTS.wpart, o); boom(W, o, 'warden', 18, true); W.events.push('bigboom2'); W.freeze = 3; shakeIt(W, 0.4); fx(W, { k: 'wpartoff', name: o.name, x: o.x, y: o.y, z: o.z, vx: o.vx, vy: o.vy, vz: o.vz });
        if (o.name === 'core') {   // the Gaoler goes down: a moment of slow motion, a fireball to fly through, then the climb
          // (v20, the panel: beaten, not killed - it limps off burning, blowing apart, and is back in a later chapter)
          P.parts.forEach(function (q) { q.alive = false; }); P.st = 'beaten'; W.ms.gaolerT = P.t0 != null ? W.ct - P.t0 : 0; P.t = 0; W.ms.warden = 1;
          W.score += PTS.wardenDown; W.ms.pk.gaoler = (W.ms.pk.gaoler || 0) + PTS.wardenDown; fx(W, { k: 'boom', x: P.x, y: P.y, z: P.z, c: 'warden', big: true, huge: true }); W.events.push('bigboom'); W.freeze = 8; shakeIt(W, 1);
          W.slowT = 90; W.paceMul = 0.3; climbSoon(W);
          banner(W, 'THE GAOLER IS BEATEN', '+' + num(PTS.wardenDown) + ' - AND RUNNING', 170, true);   // (one line, high: you watch it go) say(W, 'The Gaoler is beaten - and running!'); radio(W, 'g_down'); radioLater(W, 'ga_beaten', 200);
        } else if (o.name.indexOf('gun') === 0 && !P.parts.some(isPod)) {   // beat 2: the engines' shields drop; it sags and starts dropping mines
          P.beat = 2; P.mineT = 70; P.mslT = 150; P.engT = W.speed > 1 ? 420 : 240;   // (v20: its engines open after a while - mines first)
          banner(W, 'ITS GUN PODS ARE GONE', 'SHOOT ITS MINES - ITS ENGINES OPEN SOON', 140, true); say(W, 'Its gun pods are gone. Shoot its mines; its engines open soon.'); radio(W, 'g_pods'); radioLater(W, 'ga_pods', 230);
        } else if (o.name.indexOf('eng') === 0 && !P.parts.some(isEng)) {   // beat 3: the core
          P.beat = 3; P.cst = 'wait'; P.cycT = 60;   // (v20: a moment, then it charges, fires its beam - and opens)
          banner(W, 'ITS ENGINES ARE OUT', 'HIT THE CORE WHEN IT OPENS', 150, true); say(W, 'Its engines are out. Hit the core when it opens.'); radio(W, 'g_core');
        }
        return true;
      }
      case 'gen':
        if (!damageIt(W, o, dmg, 'gen')) return false;
        o.alive = false; W.ms.gens++; W.gensLeft--; add(W, PTS.gen, o); boom(W, o, 'gen', 28, true); W.events.push('bigboom'); W.freeze = 4; nearShake(W, o, 0.7);
        W.checkpoint = W.ms.gens; goldPace(W, PACE.warship[W.ms.gens]);
        if (W.gensLeft > 0) { banner(W, 'SHIELD GENERATOR DOWN', (4 - W.gensLeft) + ' OF 4', 140); say(W, 'Shield generator down. ' + W.gensLeft + ' to go.'); radio(W, 'w_gen'); }
        else {
          W.objs.forEach(function (q) { if (q.k === 'bridge') q.shielded = false; });
          banner(W, 'HER SHIELDS ARE DOWN', 'FINAL RUN - HER BRIDGE', 200); say(W, 'Her shields are down. A final run at her bridge!'); W.events.push('bark'); radio(W, W.mode === 'rail' ? 'w_run' : 'w_shields'); radioLater(W, 'rk_bridge', 260);
          W.cue.push({ at: W.ct + 60, wave: 'fighters', n: Math.round(4 * W.sp.eCount + 0.3) }); W.cue.sort(function (a, b) { return a.at - b.at; });
        }
        return true;
      case 'keel':
        if (!damageIt(W, o, dmg, 'turret')) return false;
        o.alive = false; W.ms.keel = 1; add(W, PTS.keel, o); boom(W, o, 'gen', 24, true); W.events.push('bigboom2'); W.freeze = 4; nearShake(W, o, 0.6);
        banner(W, 'KEEL GUN DOWN', '+' + num(PTS.keel), 130, true); radio(W, 'w_keel_down'); return true;
      case 'gun':
        if (!damageIt(W, o, dmg, 'gen')) return false;
        o.alive = false; W.ms.gun = 1; add(W, PTS.gun, o); boom(W, o, 'gen', 26, true); W.events.push('bigboom2'); W.freeze = 4; nearShake(W, o, 0.6);
        banner(W, 'THE MAIN GUN IS SILENCED', '+' + num(PTS.gun), 140); say(W, 'The main gun is silenced.'); radio(W, 'w_gun'); return true;
      case 'bridge':
        if (o.shielded) { fx(W, { k: 'ping', x: o.x, y: o.y, z: o.z, c: 'shield' }); W.events.push('shielded'); return false; }
        if (!damageIt(W, o, dmg, 'gen')) return false;
        o.alive = false; add(W, PTS.bridge, o); boom(W, o, 'gen', 34, true); W.events.push('bigboom'); W.freeze = 10; shakeIt(W, 1);
        W.finale = 1; banner(W, 'THE BRIDGE IS DESTROYED', 'SHE IS BREAKING UP', 220); say(W, 'The bridge is destroyed! She is breaking up.'); radio(W, 'w_bridge');
        return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- the SHOCK BOMB (B, 28 Oct): flung at the crosshair, it bursts there (or on the thing under it)
  // and blasts everything round it - fighters, guns, mines, missiles, their lasers. A few each chapter, one more at each checkpoint.
  function screenRay(W, sx, sy, dist) {   // the point a distance ahead of the camera under a screen point (the camera's own sum, backwards)
    var c = W.cam, f = W.focal || FOCAL, X = (sx - CX) / f * dist, Y = (CY - sy) / f * dist;
    var x1 = X * c.cr + Y * c.sr, y2 = -X * c.sr + Y * c.cr, dy = y2 * c.cp + dist * c.sp, z1 = -y2 * c.sp + dist * c.cp;
    return { x: c.x + x1 * c.cy + z1 * c.sy, y: c.y + dy, z: c.z - x1 * c.sy + z1 * c.cy };
  }
  function bombInput(W, input) {
    if (W.bombT > 0) W.bombT--;
    if (!input.bomb || W.phase !== 'play' || W.bombT > 0) return;
    if (W.bombs <= 0) { W.events.push('empty'); return; }
    var P = aimPoint(W), o = pick(W, P.x, P.y, 8), S = W.ship, BT = 28, T = o && o.x != null ? { x: o.x + (o.vx || 0) * BT, y: o.y + (o.vy || 0) * BT, z: o.z + (o.vz || 0) * BT } : screenRay(W, P.x, P.y, 230);
    if (!(o && o.x != null)) { T.x += (S.vx || 0) * BT; T.y += (S.vy || 0) * BT; T.z += (S.vz || 0) * BT; }   // (v18: it leads a moving target, and is thrown with your own speed - at full thrust it used to land behind you)
    W.bombs--; W.bombT = 24; W.bombUsed = true;
    W.bombsLive.push({ x: S.x, y: S.y - 1, z: S.z, x0: S.x, y0: S.y - 1, z0: S.z, tx: T.x, ty: T.y, tz: T.z, t: 0, T: 28 });
    W.events.push('bomb'); shakeIt(W, 0.15);
  }
  function bombStep(W) {
    for (var i = W.bombsLive.length - 1; i >= 0; i--) {
      var b = W.bombsLive[i]; b.t++;
      var k = b.t / b.T, arc = Math.sin(Math.PI * k) * 8;
      b.x = b.x0 + (b.tx - b.x0) * k; b.y = b.y0 + (b.ty - b.y0) * k + arc; b.z = b.z0 + (b.tz - b.z0) * k;
      if (b.t >= b.T || W.phase !== 'play') { W.bombsLive.splice(i, 1); if (W.phase === 'play') blast(W, b.x, b.y, b.z); }
    }
  }
  function blast(W, x, y, z) {   // the shock bomb bursts: everything within reach of it goes (a boss part takes a heavy blow)
    var R = 80, n = 0;
    fx(W, { k: 'shockbomb', x: x, y: y, z: z, r: R }); W.events.push('bigboom'); W.freeze = Math.max(W.freeze, 4); shakeIt(W, 0.7);
    W.objs.slice().forEach(function (o) {
      if (!o.alive || !o.r || o.wait > 0 || o.shielded || o.k === 'gate' || o.k === 'gen' || o.k === 'bridge' || o.x == null) return;
      var d = Math.sqrt((o.x - x) * (o.x - x) + (o.y - y) * (o.y - y) + (o.z - z) * (o.z - z));
      if (d < R + o.r && hitObj(W, o, o.k === 'wpart' ? 6 : 9)) n++;
    });
    W.eshots = W.eshots.filter(function (b) { var d = Math.sqrt((b.x - x) * (b.x - x) + (b.y - y) * (b.y - y) + (b.z - z) * (b.z - z)); if (d < R && b.k !== 'shell') { if (b.k === 'missile' && b.alive) n++; return false; } return true; });
    if (n >= 3) banner(W, 'SHOCK BOMB X' + n, '', 70, true);
  }

  // ---------------------------------------------------------------- rockets: tap for one; hold to lock up to six, let go to fire them all
  function rocketsInput(W, input) {
    if (input.alt && W.phase === 'play') {
      W.altHeld++;
      if (W.altHeld > 5 && W.altHeld % 5 === 0 && W.locks.length < Math.min(6, W.rk)) {
        var full = lockFull(W), o = autoPick(W, W.aim.x, W.aim.y, W.autoR ? W.autoR + 15 : 0, full) || pick(W, W.aim.x, W.aim.y, 10, full);   // (auto-aim sweeps wider)
        if (o && o.k !== 'missile' && !o.shielded) { W.locks.push(o); W.locked = true; W.events.push(W.locks.length >= Math.min(6, W.rk) ? 'lockon' : { sfx: 'lock', n: W.locks.length }); fx(W, { k: 'lock', n: W.locks.length }); }
      }
    } else if (W.altHeld) {
      if (W.locks.length) salvoFire(W);
      else if (W.altHeld <= 14) fireRocket(W, null, 0);
      W.altHeld = 0;
    }
    W.locks = W.locks.filter(function (q) { return q.alive; });
  }
  function lockFull(W) {   // (v20) what can take no more locks: a small thing once locked; a big one once it has a lock for every 3 of its hit points
    return W.locks.filter(function (o) { var n = 0; W.locks.forEach(function (q) { if (q === o) n++; }); return o.k === 'dart' || o.k === 'drone' || o.k === 'mine' || o.k === 'missile' || n >= Math.ceil((o.hp || 1) / 3); });
  }
  function salvoFire(W) {
    var n = W.locks.length, u = W.locks.filter(function (q, i) { return W.locks.indexOf(q) === i; }).length;
    W.salvo = { n: n, u: u, t: 0, targets: W.locks.slice() };
    W.locks.forEach(function (o, i) { fireRocket(W, o, i * 4); });
    W.locks = [];
    if (n > 1) banner(W, 'SALVO X' + n, '', 60, true);
  }
  function fireRocket(W, target, delay) {
    if (W.rk <= 0) { W.events.push('empty'); return; }
    W.rk--; W.rkSide = -W.rkSide;
    var t = target || pick(W, W.aim.x, W.aim.y, 6);
    if (!t) { var best = null, bd = 90 * 90; W.objs.forEach(function (q) { if (!q.alive || !q.r || q.wait > 0 || q.shielded) return; var p = project(W, q.x, q.y, q.z); if (!p || p.z > 800) return; var dd = (p.x - W.aim.x) * (p.x - W.aim.x) + (p.y - W.aim.y) * (p.y - W.aim.y); if (dd < bd) { bd = dd; best = q; } }); t = best; }
    var S = W.ship, F = W.camF || { x: 0, y: 0, z: 1 }, R = W.camR || { x: 1, y: 0, z: 0 }, side = W.rkSide;
    W.rockets.push({ x: S.x + R.x * side * 5, y: S.y - 1.5, z: S.z + R.z * side * 5, vx: S.vx + F.x * 1.4, vy: S.vy + F.y * 1.4 + 0.25, vz: S.vz + F.z * 1.4, t: 0, delay: delay || 0, target: t, side: side });
    if (!delay) W.events.push({ sfx: 'rocket', pan: side * 0.5 });
  }
  function rocketStep(W) {
    for (var i = W.rockets.length - 1; i >= 0; i--) {
      var r = W.rockets[i], S = W.ship;
      if (r.delay > 0) { r.delay--; r.x = S.x; r.y = S.y - 1.5; r.z = S.z; r.vx = S.vx; r.vy = S.vy; r.vz = S.vz; if (!r.delay) W.events.push({ sfx: 'rocket', pan: r.side * 0.5 }); continue; }
      r.t++;
      if (r.target && !r.target.alive) r.target = null;
      var spd = Math.min(8, 2.6 + r.t * 0.14) + W.v, tx, ty, tz;
      if (r.target) { tx = r.target.x - r.x; ty = r.target.y - r.y; tz = r.target.z - r.z; } else { tx = r.vx; ty = r.vy; tz = r.vz; }
      var d = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1, k = r.t < 6 ? 0.08 : 0.2;
      r.vx += (tx / d * spd - r.vx) * k; r.vy += (ty / d * spd - r.vy) * k; r.vz += (tz / d * spd - r.vz) * k;
      r.x += r.vx; r.y += r.vy; r.z += r.vz;
      if (r.t % 2 === 0) fx(W, { k: 'smoke', x: r.x, y: r.y, z: r.z });
      var hit = r.target && d < (r.target.r || 4) + 3;
      if (hit || r.t > 280 || W.phase !== 'play') {
        W.rockets.splice(i, 1);
        if (hit && W.phase === 'play') {
          fx(W, { k: 'rocketboom', x: r.x, y: r.y, z: r.z }); W.events.push({ sfx: 'bigboom2', pan: pan(W, r), d: dist(W, r) });
          hitObj(W, r.target, 3);
          W.eshots.forEach(function (p) { if (p.k === 'missile' && p.alive && Math.abs(p.x - r.x) < 16 && Math.abs(p.y - r.y) < 16 && Math.abs(p.z - r.z) < 16) hitObj(W, p); });
          W.objs.forEach(function (o) { if (o !== r.target && o.alive && o.r && !(o.wait > 0) && (o.k === 'dart' || o.k === 'drone' || o.k === 'mine') && Math.abs(o.x - r.x) < 15 && Math.abs(o.y - r.y) < 15 && Math.abs(o.z - r.z) < 15) hitObj(W, o, 3); });
        }
      }
    }
    if (W.salvo) {   // a salvo where every rocket got its target: a bonus
      var sv = W.salvo; sv.t++;
      if (sv.u >= 2 && sv.targets.every(function (q) { return !q.alive; })) { var b = PTS.salvo * sv.u * sv.u; W.score += b; W.ms.salvos++; banner(W, 'SALVO BONUS', '+' + num(b), 90, true); W.events.push('bonus'); W.salvo = null; }
      else if (sv.t > 360) W.salvo = null;
    }
  }

  function hurt(W, why, src, cause) {   // src: the shot (where it came from, for the panel's red wedge); cause: LASER, FLAK, MISSILE, ROCK, HULL, MINE
    if (W.phase !== 'play' || W.finale > 0 || W.graceT > 0) return;   // (while the warship breaks up you are clear of it all; and a new ship's grace)
    W.shields--; W.ms.lost++; W.hitT = 40; W.calm = 0; if (why === 'crash') W.crashT = 24;
    W.mult = Math.max(1, W.mult - 1); W.chain = (W.mult - 1) * 5; W.chainT = W.mult > 1 ? 150 : 0;   // a hit costs one step of your chain, not all of it
    shakeIt(W, why === 'crash' ? 0.8 : 0.55); W.freeze = Math.max(W.freeze, 2);
    W.hurtFrom = { cause: cause || (why === 'crash' ? 'ROCK' : 'LASER'), t: 60, src: src && src.src, x: src ? (src.ox != null ? src.ox : src.x) : null, y: src ? (src.oy != null ? src.oy : src.y) : null, z: src ? (src.oz != null ? src.oz : src.z) : null };
    W.events.push(why === 'crash' ? 'crash' : 'hit'); fx(W, { k: why === 'crash' ? 'crash' : 'hit' });
    if (W.shields <= 0) lose(W, 'SHIP LOST');
    else if (W.shields === 1) { say(W, 'Last shield!'); W.mercyT = 360; radio(W, 'last'); }   // (they ease off for six seconds)
  }
  function crashOut(W) {
    if (W.phase !== 'play' || W.finale > 0 || W.graceT > 0 || W.noCrash) return;   // (noCrash: the picture-taking scripts only)
    var S = W.ship; W.ms.lost++; W.ms.crashes = (W.ms.crashes || 0) + 1; W.ms.rockHits = (W.ms.rockHits || 0) + 1;
    boom(W, { x: S.x, y: S.y, z: S.z + 2 }, 'rock', 14); W.events.push('crash'); W.hurtFrom = { cause: 'ROCK', t: 60, x: null };
    lose(W, 'YOU HIT THE ROCK');
  }
  function lose(W, head) {   // a ship gone (or the carrier): (v20b) you carry on from where you were, or game over
    W.lives--; W.shields = 0; W.eshots = []; W.shots = []; W.rockets = []; W.locks = []; shakeIt(W, 1);
    fx(W, { k: 'lost', x: W.ship.x, y: W.ship.y, z: W.ship.z, view: W.view });
    if (W.lives <= 0) { setPhase(W, 'dead'); banner(W, head, 'GAME OVER', 220); W.events.push('dead'); say(W, titleCase(head) + '. That was your last ship. Game over.'); }
    else { setPhase(W, 'retry'); banner(W, head, W.lives + (W.lives > 1 ? ' SHIPS LEFT' : ' SHIP LEFT'), 150); W.events.push('dead'); say(W, titleCase(head) + '. Carry on from here. ' + W.lives + (W.lives > 1 ? ' ships' : ' ship') + ' left.'); }
  }

  // ---------------------------------------------------------------- flying
  function farSide(W, o) {   // (v20) is it across the ridge from you, at a fork?
    var R = W.valley.ridge ? W.valley.ridge(o.rs) : null; if (!R || !(R.w > 1)) return false;
    var mine = W.lane || (W.ox >= R.x ? 1 : -1); return (o.lx - R.x) * mine < 0;
  }
  function laneAt(W, s) {   // round a ridge that splits the valley (a fork): the channel you are taking - its middle and half-width (else null)
    var V = W.valley, G = V.spanAt ? V.spanAt(s, 380) : null;
    if (!G) return null;
    var k = Math.min(smooth(G.s0 - 380, G.s0 + 40, s), 1 - smooth(G.s1 - 40, G.s1 + 380, s));
    var R = V.ridge(clamp(s, G.s0 + 170, G.s1 - 170)), half = V.width(s) / 2, side = W.lane || (W.ox < R.x * k ? -1 : 1);
    var c = side < 0 ? (R.x - R.w - half) / 2 : (R.x + R.w + half) / 2, w = side < 0 ? (R.x - R.w + half) / 2 : (half - R.x - R.w) / 2;   // (the two channels need not be the same width)
    return { c: c * k, w: (half - 7) + (w - 7 - (half - 7)) * k, side: side };
  }
  function corridor(W) {   // where you can steer: the middle (across) and how far either side of it, and the lowest and highest you can fly
    if (W.valley.space) {   // (the attack circuit: a box round the path - never as far as her hull; chapter 3's quarry: a box inside its tunnel)
      var tr = W.valley.tubeAt ? W.valley.tubeAt(W.s) : 0;
      if (!tr) return { x: 60, c: 0, y0: -36, y1: 36 };
      var Lq = laneAt(W, W.s), bq = tr * 0.66; return { x: Lq ? Lq.w * 0.8 : bq, c: Lq ? Lq.c : 0, y0: -bq, y1: bq };
    }
    var V = W.valley, hw = V.width(W.s) / 2 - 7, inT = W.s > V.tunnel[0] - 40 && W.s < V.tunnel[1] + 20, Ln = laneAt(W, W.s), fl = V.floorAt ? V.floorAt(W.s) : V.floor, op = V.openAt ? V.openAt(W.s) : 0;
    // (the floor below you, wherever the route is; out on the open desert you can fly lower, and higher; in the tunnel the roof is 36 above its floor)
    return { x: Ln ? Ln.w : hw, c: Ln ? Ln.c : 0, y0: Math.max(fl, -14 - 10 * op) + 4, y1: inT ? fl + 29 : V.sec && W.s > V.sec.out ? 64 : 32 + 10 * op, fl: fl };
  }
  function aimUnit(W) {   // the cursor as -1..1 across and up the screen (up = -1)
    var a = W.aim;
    return [clamp((a.x - CX) / (CX - AIM.x0), -1, 1), clamp((a.y - (AIM.y0 + AIM.y1) / 2) / ((AIM.y1 - AIM.y0) / 2), -1, 1)];
  }
  var THRUST = 1.45, MACH1 = 1.62;   // full thrust: your cruise x 2.45; the speed of sound: cruise x 1.62
  function throttle(W, input, free) {   // (28 Oct, v18, the owner: the thrust "basic ... it just doesn't feel right ... like a driving game, when you go faster,
    // it's more fun") a THROTTLE now, not a boost that runs out: RT (or W) pulls you up to speed the way a car does - hard at first, easing off as you
    // near the top, nearly two and a half times your cruise - and holds it for as long as you like. Let go and you coast back down; LT (or S) brakes.
    // Through the speed of sound there is a bang and a cone of vapour, and while you stay supersonic a bonus ticks up. The W key opens the throttle
    // over a third of a second, like a squeezed trigger.
    var thr = free ? 0 : input.thr != null ? input.thr : input.boost ? 1 : 0, brk = free ? 0 : input.brk != null ? input.brk : input.brake ? 1 : 0;
    if (!free && input.thr == null) { W.keyThr = input.boost ? Math.min(1, (W.keyThr || 0) + 0.05) : 0; thr = W.keyThr; }
    var want = thr > 0.04 ? thr : 0, brake = brk > 0.04 ? brk : 0;
    W.boostK += (want - W.boostK) * 0.2; W.brakeK += (brake - W.brakeK) * 0.2;   // (the lever's own travel)
    var was = W.boosting; W.boosting = W.boostK > 0.15 && W.brakeK < 0.15; W.braking = W.brakeK > 0.15;
    if (W.boosting && !was) { W.events.push('boost'); shakeIt(W, 0.1); }
    if (W.braking && !W.wasBraking) W.events.push('brake');
    W.wasBraking = W.braking; W.gaugeLock = false;
    W.gauge = Math.min(1, W.gauge + 1 / 220);   // (the gauge is the thruster flip's now - free flight)
    if (W.flipOut > 0) W.flipOut--;
    W.pk += ((free ? 0.3 : 1) - W.pk) * 0.03;
    var cruise = W.pace * W.pk * W.paceMul, top = cruise * (1 + THRUST * W.boostK), low = cruise * (1 - 0.65 * W.brakeK), v = W.v;
    if (W.flipT > 0) v += (cruise * 0.3 - v) * 0.09;
    else if (W.flipOut > 0) v += (cruise * 1.55 - v) * 0.09;
    else if (W.brakeK > 0.05 && v > low) v += (low - v) * 0.1;   // the brakes bite
    else if (v < top) { var room = clamp((cruise * (1 + THRUST) - v) / (cruise * THRUST), 0, 1); v = Math.min(top, v + Math.max(v < cruise ? (cruise - v) * 0.05 : 0, cruise * 0.022 * W.boostK * (0.3 + 0.7 * room))); }   // (pulling: strongest low down)
    else v += (top - v) * (W.slowT > 0 ? 0.09 : W.paceMul < 0.95 || v > cruise * (1 + THRUST) + 0.2 ? 0.03 : 0.014);   // coasting back down (it carries)
    W.v = v;
    var sk = W.pace ? clamp((v / W.pace - 1) / THRUST, -1, 1) : 0;   // how fast, as a share of full thrust
    if (W.boomK > 0) W.boomK = Math.max(0, W.boomK - 1 / 18);
    W.focal += ((FOCAL - 46 * Math.max(0, sk) + 22 * W.brakeK - 34 * (W.rushT || 0) / 34 - 24 * (W.boomK || 0)) - W.focal) * 0.08;   // (the view widens with your speed itself; rushT: a fighter just went by)
    W.mach = W.pace ? v / (W.pace * MACH1) : 0;
    if (!free && W.phase === 'play' && !W.esc) {
      if (!W.sonic && W.mach >= 1) { W.sonic = true; W.boomK = 1; fx(W, { k: 'sonic', x: W.ship.x, y: W.ship.y, z: W.ship.z }); W.events.push('sonic'); shakeIt(W, 0.45); if (!W.sonicSaid) { W.sonicSaid = true; radio(W, 'sonic'); } }
      else if (W.sonic && W.mach < 0.97) { W.sonic = false; fx(W, { k: 'subsonic' }); }
      if (W.sonic && ++W.supT % 30 === 0) { var sv = PTS.sonic * W.mult; W.score += sv; W.ms.sonic = (W.ms.sonic || 0) + 30; W.ms.pk.sonic = (W.ms.pk.sonic || 0) + sv; fx(W, { k: 'sonicpts', v: sv }); }
    } else if (W.sonic && (free || W.esc)) { W.sonic = false; fx(W, { k: 'subsonic' }); }
  }
  function flipInput(W, input) {   // the thruster flip (free flight): a third of the gauge
    if (W.flipCD > 0) W.flipCD--;
    if (W.mode !== 'free' || !input.flip || W.flipT || W.flipCD || W.phase !== 'play') return;
    if (W.gauge < 0.3) { W.events.push('empty'); return; }
    var S = W.ship;
    W.gauge -= 0.3; W.flipT = FLIP; W.flipCD = FLIP + 36; W.flipOut = 0; W.flipP0 = S.pitch; W.flipOffY = wrapA(W.aimYaw - S.yaw); W.flipOffP = W.aimPitch - S.pitch;
    W.events.push('flip'); fx(W, { k: 'flip', x: S.x, y: S.y, z: S.z }); shakeIt(W, 0.2);
  }
  function rollInput(W, input) {
    if (W.rollCD > 0) W.rollCD--;
    if (W.rollT > 0) W.rollT--;
    var dir = input.rollL ? -1 : input.rollR ? 1 : input.roll ? (W.vox < -0.05 || W.yawRate < -0.004 ? -1 : 1) : 0;
    if (dir && !W.rollT && !W.rollCD && W.phase === 'play') { W.rollT = 26; W.rollDir = dir; W.rollCD = 46; W.events.push('roll'); }
  }
  function flyRail(W, free) {   // free: only cruising (the briefing, the tally) - nothing to hit
    var C = corridor(W), u = helmUnit(W), s0 = W.s, V = W.valley, S = W.ship, px = S.x, py = S.y, pz = S.z;
    W.s += W.v;
    var Gs = V.spanAt ? V.spanAt(W.s, 380) : null, Ln = laneAt(W, W.s); if (!Ln) W.lane = 0; else if (!W.lane && Gs && W.s > Gs.s0 - 60) W.lane = Ln.side;   // the channel is yours once you reach the ridge
    // where the cursor (or stick) sends you: the screen's edge is 85 % of the way to the wall, not the wall itself
    var tx = free ? C.c : C.c + u[0] * C.x * REACH, ty = free ? (C.y0 + C.y1) / 2 : C.y0 + (C.y1 - C.y0) * (0.5 - u[1] * 0.5);
    if (!free) {   // a gate just ahead and you are nearly lined up: it draws you in
      for (var gi = 0; gi < W.objs.length; gi++) {
        var go = W.objs[gi];
        if (go.k !== 'gate' || go.passed || !go.alive || go.rs <= W.s || go.rs - W.s > 160) continue;
        if (Math.hypot(tx - go.lx, ty - go.ly) < go.gr * 2.2) { tx += (go.lx - tx) * 0.3; ty += (go.ly - ty) * 0.3; }
        break;
      }
    }
    var nx = W.ox + (tx - W.ox) * 0.2, ny = W.oy + (ty - W.oy) * 0.2;   // (the ship follows quickly: most of the way in a quarter of a second)
    if (W.rollT > 0) nx += W.rollDir * 1.5 * Math.sin(W.rollT / 26 * Math.PI);   // the roll throws you sideways
    nx = clamp(nx, C.c - C.x - 4, C.c + C.x + 4); ny = clamp(ny, C.y0, Math.max(C.y1, W.oy - 1));
    W.vox = nx - W.ox; W.voy = ny - W.oy; W.ox = nx; W.oy = ny;
    W.roll += (clamp(-W.vox * 0.3, -0.9, 0.9) - W.roll) * 0.14;   // (a model's roll: negative = right wing down)
    W.bank += (bankAt(W.rail, W.s + 20) - W.bank) * 0.05;
    place(W);
    S.vx = S.x - px; S.vy = S.y - py; S.vz = S.z - pz;
    if (free) return;
    var hw = V.space ? 1e9 : V.width(W.s) / 2 - 3.5, R = V.ridge(W.s), scr = 0, walls = !V.wallAt || V.wallAt(W.s) > 10, fl = V.floorAt ? V.floorAt(W.s) : V.floor;   // (in space there are no walls to scrape)
    if (W.scrapeT > 0) W.scrapeT--;
    // the walls, the ridges at the forks, the tunnel's roof: scrape one and you are pushed off it (a shield, then a moment's grace). (Out on the open
    // desert there are no walls: the edge of where you may fly only holds you.)
    if (Math.abs(W.ox) > hw) { if (walls) scr = 1; W.ox = Math.sign(W.ox) * (hw - 3); }
    if (R && R.w > 1 && Math.abs(W.ox - R.x) < R.w + 2.6) { scr = 1; W.ox = R.x + (W.ox >= R.x ? 1 : -1) * (R.w + 4); }
    if (W.s > V.tunnel[0] && W.s < V.tunnel[1] && W.oy > fl + 32.5) { scr = 1; W.oy = fl + 30; }
    if (V.tubeAt) { var trq = V.tubeAt(W.s), rq = Math.hypot(W.ox, W.oy); if (trq && rq > trq - 5) { scr = 1; var kq = (trq - 7) / rq; W.ox *= kq; W.oy *= kq; } }   // (chapter 3: the quarry's walls)
    if (scr) W.grindT = (W.grindT || 0) + 1; else if (W.grindT > 0) W.grindT = Math.max(0, W.grindT - 3);
    if (scr && W.grindT > 48) { crashOut(W); return; }   // (v20b) grinding along the rock: you have hit it
    if (scr && !W.scrapeT) { W.scrapeT = 50; fx(W, { k: 'scrape', x: S.x, y: S.y, z: S.z }); hurt(W, 'crash', null, 'ROCK'); }
    if (V.squeezes) V.squeezes.forEach(function (q) {   // a SQUEEZE threaded without touching the walls: points
      if (s0 < q.s0 && W.s >= q.s0) { q.on = true; q.hit = false; }
      if (q.on && scr) q.hit = true;
      if (q.on && W.s >= q.s1) { q.on = false; if (!q.hit) { W.ms.thread = (W.ms.thread || 0) + 1; var qv = add(W, PTS.squeeze, null); fx(W, { k: 'note', text: 'THREADED IT +' + qv, x: S.x, y: S.y + 5, z: S.z + 40 }); W.events.push('gate'); } }
    });
    if (W.farm && !W.farm.done && chapter(W).id === 'valley') farmStep(W);
    for (var bi = 0; bi < W.objs.length; bi++) {   // the desert's buttes: fly into one (unless you are over a low one) and you are thrown off it
      var bt = W.objs[bi];
      if (bt.k !== 'butte' || !bt.alive || Math.abs(W.s - bt.rs) > bt.pr + 3 || W.oy > bt.ly + bt.bh + 2) continue;
      var bds = W.s - bt.rs;
      if (Math.hypot(bds, W.ox - bt.lx) < bt.pr + 2.5) {
        W.ox = bt.lx + (W.ox >= bt.lx ? 1 : -1) * Math.sqrt(Math.max(0, (bt.pr + 4) * (bt.pr + 4) - bds * bds));
        crashOut(W);
      }
    }
    for (var i = 0; i < W.objs.length; i++) {   // the gates, arches, pillars and mines you pass this step
      var o = W.objs[i];
      if (!o.alive || o.passed || o.rs == null || o.beh || o.k === 'wpart' || o.rs <= s0 || o.rs > W.s) continue;
      if (o.k === 'gate' || o.k === 'turret') {   // (v20) the other side of a fork is not yours to count, or to miss
        var far = farSide(W, o);
        if (o.k === 'turret') { if (!o.tallied) { o.tallied = true; if (!far) W.ms.turretsAll++; } continue; }
        if (far) { o.passed = 2; continue; }
        W.ms.gatesAll++;
      }
      if (o.k === 'gate') {
        if (Math.hypot(W.ox - o.lx, W.oy - o.ly) < o.gr) { o.passed = 1; W.ms.gates++; W.gateRun = (W.gateRun || 0) + 1; add(W, PTS.gate * (1 + W.ms.gates % 5) * o.bonus, o); W.events.push('gate'); fx(W, { k: 'gate', x: o.x, y: o.y, z: o.z }); if (W.gateRun % 5 === 0) radio(W, 'gates5'); }
        else { o.passed = -1; W.gateRun = 0; W.events.push('miss'); fx(W, { k: 'gatemiss', x: o.x, y: o.y, z: o.z }); }
      } else if (o.k === 'arch') { o.passed = 1; if (Math.abs(W.ox - o.lx) < o.aw && W.oy > o.y0 - 2.4) crashOut(W); }
      else if (o.k === 'pillar') { o.passed = 1; if (Math.abs(W.ox - o.lx) < o.pr + 2.6) crashOut(W); }
      else if (o.k === 'rockfall') {   // over the rocks, or into them; skimming them low scores
        o.passed = 1; var rtop = o.ly + o.h;
        if (Math.abs(W.ox - o.lx) < o.w / 2 + 2) {
          if (W.oy < rtop + 1.5) crashOut(W);
          else if (W.oy < rtop + 8) { var lv = add(W, PTS.close, null); fx(W, { k: 'note', text: 'LOW PASS +' + lv, x: S.x, y: S.y + 5, z: S.z + 40 }); }
        }
      } else if (o.k === 'natarch') {   // a rock arch on the desert: its legs, its top
        o.passed = 1; var adx = Math.abs(W.ox - o.lx);
        if (Math.abs(adx - o.span / 2) < 7 || (adx < o.span / 2 && W.oy > o.ly + o.h - 5)) crashOut(W);
      }
      else if (o.k === 'asteroid') { o.passed = 1; if (Math.hypot(W.ox - o.lx, W.oy - o.ly) < o.r * 0.92 + 2) crashOut(W); }   // (chapter 3: into an asteroid - you are gone)
      else if (o.k === 'rock') { o.passed = 1; if (Math.hypot(W.ox - o.lx, W.oy - o.ly) < o.r + 2.5) { if (o.r > 8.5) crashOut(W); else { o.alive = false; boom(W, o, 'rock', 12); W.ms.rockHits = (W.ms.rockHits || 0) + 1; hurt(W, 'crash', o, 'ROCK'); } } }
      else if (o.k === 'mine') { o.passed = 1; if (Math.hypot(W.ox - o.lx, W.oy - o.ly) < 7.5) { o.alive = false; boom(W, o, 'missile', 14, true); if (W.rollT > 0) W.events.push('shielded'); else hurt(W, 'crash', o, 'MINE'); } }
    }
  }
  function boxHit(x, y, z, pad) {   // inside one of the warship's boxes? the box, or null
    var B = WARSHIP.boxes;
    for (var i = 0; i < B.length; i++) { var b = B[i]; if (x > b[0] - pad && x < b[3] + pad && y > b[1] - pad && y < b[4] + pad && z > b[2] - pad && z < b[5] + pad) return b; }
    return null;
  }
  function pushOut(o, pad) {   // out of the warship by the shortest way: [depth, axis, sign], or null
    var b = boxHit(o.x, o.y, o.z, pad); if (!b) return null;
    var c = [[o.x - (b[0] - pad), 0, -1], [(b[3] + pad) - o.x, 0, 1], [o.y - (b[1] - pad), 1, -1], [(b[4] + pad) - o.y, 1, 1], [o.z - (b[2] - pad), 2, -1], [(b[5] + pad) - o.z, 2, 1]].sort(function (a, b2) { return a[0] - b2[0]; })[0];
    if (c[1] === 0) o.x += c[2] * (c[0] + 0.5); else if (c[1] === 1) o.y += c[2] * (c[0] + 0.5); else o.z += c[2] * (c[0] + 0.5);
    return c;
  }
  function flyFree(W, free) {   // the stick turns the ship; mouse-aim flies it towards where you point; the mouse cursor's edge turns it
    var S = W.ship, u = aimUnit(W), dzn = 0.3, k = 1 + 0.9 * W.brakeK - 0.3 * W.boostK, inp = W._in || {}, md = W.steerMode, maxY = 0.045 * k, maxP = 0.036 * k, wantYaw = 0, wantPitch = 0, ease = 0.18;
    if (!free && md === 'aim') { wantYaw = clamp(wrapA(W.aimYaw - S.yaw) * 0.2, -maxY, maxY); wantPitch = clamp((W.aimPitch - S.pitch) * 0.2, -maxP, maxP); }   // (the nose catches up with the mouse in about half a second)
    else if (!free && md === 'stick') {   // a controller or the keys: a turn that builds up and rolls out (smooth), unless the Quick setting is on
      var sx = W.ctrl === 'pad' ? inp.sx || 0 : (inp.right ? 1 : 0) - (inp.left ? 1 : 0), sy = W.ctrl === 'pad' ? inp.sy || 0 : (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
      if (!inp.padQuick) { maxY = 0.036 * k; maxP = 0.029 * k; ease = 0.075; }
      wantYaw = sx * maxY; wantPitch = -sy * maxP;
    } else if (!free) {
      var tx = Math.sign(u[0]) * Math.pow(Math.max(0, Math.abs(u[0]) - dzn) / (1 - dzn), 1.3), ty = Math.sign(u[1]) * Math.pow(Math.max(0, Math.abs(u[1]) - dzn) / (1 - dzn), 1.3);
      wantYaw = tx * 0.032 * k; wantPitch = -ty * 0.025 * k;
    }
    var d = Math.sqrt(S.x * S.x + S.y * S.y + S.z * S.z);
    if (d > ARENA || Math.abs(S.y) > 1100) {   // too far out (or too high, or too low): the ship turns back
      wantYaw = clamp(wrapA(Math.atan2(-S.x, -S.z) - S.yaw) * 0.05, -0.035, 0.035); wantPitch = clamp((Math.atan2(-S.y, Math.sqrt(S.x * S.x + S.z * S.z)) - S.pitch) * 0.05, -0.02, 0.02);
      if (!W.oob && W.phase === 'play') { W.oob = true; banner(W, 'TURNING BACK - STAY NEAR THE WARSHIP', '', 100, true); radio(W, 'w_back'); }
    } else if (d < ARENA - 200 && Math.abs(S.y) < 900) W.oob = false;
    if (W.flipT > 0) {   // the thruster flip: nose up and over, round to face the way you came (the same climb, the other way)
      var f0 = 1 - W.flipT / FLIP, f1 = 1 - (W.flipT - 1) / FLIP, e1 = smooth(0, 1, f1), dYaw = Math.PI * (e1 - smooth(0, 1, f0));
      W.flipT--; if (!W.flipT) W.flipOut = 45;
      S.yaw = wrapA(S.yaw + dYaw); S.pitch = clamp(W.flipP0 * (1 - 2 * e1) + Math.sin(Math.PI * f1) * 0.9, -1.2, 1.2);
      W.aimYaw = wrapA(S.yaw + W.flipOffY); W.aimPitch = clamp(S.pitch + W.flipOffP, -1.15, 1.15); W.yawRate = 0; W.pitchRate = 0;
    } else {
      W.yawRate += (wantYaw - W.yawRate) * ease; W.pitchRate += (wantPitch - W.pitchRate) * ease;
      S.yaw = wrapA(S.yaw + W.yawRate); S.pitch = clamp(S.pitch + W.pitchRate, -1.2, 1.2);
    }
    if (md !== 'aim') { W.aimYaw = S.yaw; W.aimPitch = S.pitch; }
    var f = dirOf(S.yaw, S.pitch), rx = Math.cos(S.yaw), rz = -Math.sin(S.yaw), dash = W.rollT > 0 ? W.rollDir * 1.4 * Math.sin(W.rollT / 26 * Math.PI) : 0;
    S.vx = f.x * W.v + rx * dash; S.vy = f.y * W.v; S.vz = f.z * W.v + rz * dash;
    S.x += S.vx; S.y += S.vy; S.z += S.vz;
    W.roll += (clamp(-W.yawRate * 26, -1.1, 1.1) - W.roll) * 0.12;
    S.roll = W.roll + (W.flipT > 0 ? Math.sin(Math.PI * (1 - W.flipT / FLIP)) * 0.6 : 0); W.bank = 0;
    if (W.scrapeT > 0) W.scrapeT--;
    if (!free && W.phase === 'play') {   // into her hull
      var hit = pushOut(S, 3);
      if (hit) { if (!W.scrapeT) { W.scrapeT = 40; fx(W, { k: 'scrape', x: S.x, y: S.y, z: S.z }); hurt(W, 'crash', null, 'HULL'); } if (hit[1] === 1) S.pitch = clamp(hit[2] * 0.35, -1.2, 1.2); else S.yaw = wrapA(S.yaw + 0.5); }
    }
  }
  function place(W) {   // world positions of everything that sits on the route (gates, arches, drones, guns), and your ship
    if (W.mode !== 'rail' || W.ascending) return;
    var F = frame(W.rail, W.s), p = local(F, W.ox, W.oy), S = W.ship;
    S.x = p.x; S.y = p.y; S.z = p.z; S.yaw = F.yaw + W.vox * 0.05;
    S.roll = W.roll - W.bank * 0.9; S.pitch = F.pitch + clamp(W.voy * 0.12, -0.35, 0.35);
    for (var i = 0; i < W.objs.length; i++) {
      var o = W.objs[i];
      if (o.rs == null || o.beh || o.k === 'wpart' || o.k === 'mpart') continue;
      if (o.placed && (o.rs < W.s - 120 || o.rs > W.s + 2600)) continue;   // far off: placed once, then left alone
      var ly = o.k === 'drone' ? o.ly + Math.sin(W.t * 0.05 + o.bob) * 2.5 : o.ly;
      var G = frame(W.rail, o.rs), q = local(G, o.lx, ly);
      o.x = q.x; o.y = q.y; o.z = q.z; o.yaw = G.yaw; o.pitch = G.pitch; o.placed = true;
    }
  }
  function camera(W, snap) {
    var c = W.cam, u = W.mode === 'rail' ? helmUnit(W) : aimUnit(W), k = snap ? 1 : 0.12, kp = snap ? 1 : 0.3, S = W.ship, cock = W.view === 'cockpit';
    var tx, ty, tz, tyaw, tpitch, troll, F;
    if ((W.phase === 'logo' || W.phase === 'intro' || W.phase === 'reunion') && W.story && W.story.cam) {   // (v31) the story's scenes: the camera where the scene puts it
      var Qs = W.story.cam; tx = Qs.x; ty = Qs.y; tz = Qs.z; var sx2 = Qs.lx - tx, sy2 = Qs.ly - ty, sz2 = Qs.lz - tz; tyaw = Math.atan2(sx2, sz2); tpitch = Math.atan2(sy2, Math.sqrt(sx2 * sx2 + sz2 * sz2)); troll = 0;
      k = 1; kp = 1;   // (the scenes' own paths are smooth: no lag)
    } else if (W.phase === 'brief') {   // the briefing: a slow swing round your ship
      var a = W.mode === 'rail' ? 2.3 - W.phaseT * 0.0075 : 0.45 + Math.min(W.phaseT, 420) * 0.0064, R = W.mode === 'rail' ? 30 : 26, rise = 5 + Math.min(W.phaseT, 420) * 0.012;
      var sf = dirOf(S.yaw, 0), srx = Math.cos(S.yaw), srz = -Math.sin(S.yaw), ox = Math.sin(a) * R, oz = Math.cos(a) * R;
      var p0 = { x: S.x + srx * ox + sf.x * oz, y: S.y + rise, z: S.z + srz * ox + sf.z * oz }, dx = S.x - p0.x, dy = S.y - p0.y, dz = S.z - p0.z;
      tx = p0.x; ty = p0.y; tz = p0.z; tyaw = Math.atan2(dx, dz); tpitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)); troll = 0;
      if (W.phaseT < 2) { k = 1; kp = 1; }
    } else if (W.esc && W.finale > 30) {   // the finale: cut ahead of your ship looking back at her; then a wide shot of her going up
      var Q = cineCam(W); tx = Q.x; ty = Q.y; tz = Q.z;
      var lx = Q.lx - tx, ly = Q.ly - ty, lz = Q.lz - tz; tyaw = Math.atan2(lx, lz); tpitch = Math.atan2(ly, Math.sqrt(lx * lx + lz * lz)); troll = 0;
      k = Q.cut ? 1 : 0.1; kp = Q.cut ? 1 : 0.2;
    } else if (W.mode === 'rail' && !W.ascending) {
      var back = BACK + clamp(W.v / (W.pace || 1) - 1, 0, 1.6) * 7, Cc = corridor(W), mid = (Cc.y0 + Cc.y1) / 2;
      if (cock) { F = frame(W.rail, W.s); var L = frame(W.rail, W.s + 40), q = local(F, W.ox, W.oy + 1.2); tx = q.x; ty = q.y; tz = q.z; tyaw = L.yaw + u[0] * 0.08; tpitch = L.pitch - u[1] * 0.05; troll = W.bank - W.roll * 0.45; kp = 1; }
      else {   // (your ship sits in the lower third of the screen, so fighters coming down the lane are not hidden behind it)
        var B = frame(W.rail, W.s - back), A = frame(W.rail, W.s + 40), p = local(B, Cc.c + (W.ox - Cc.c) * 0.6, mid + (W.oy - mid) * 0.85 + UP + 1 + (W.valley.space ? 1.5 : 0));
        lookAt(W);
        tx = p.x; ty = p.y; tz = p.z; tyaw = A.yaw + W.look; tpitch = A.pitch - 0.05 + W.lookP; troll = W.bank * 0.6 - W.roll * 0.18;
      }
    } else {
      var look = W.steerMode === 'aim' && !cock, ly2 = look ? W.aimYaw : S.yaw, lp = look ? W.aimPitch : S.pitch;   // with mouse-aim the camera looks where you point
      var f = dirOf(ly2, lp), up = dirOf(ly2, lp + Math.PI / 2), bk = cock ? 0 : BACK + clamp(W.v / (W.pace || 1) - 1, 0, 1.6) * 7, hi = cock ? 1.2 : UP;
      tx = S.x - f.x * bk + up.x * hi; ty = S.y - f.y * bk + up.y * hi; tz = S.z - f.z * bk + up.z * hi;
      var lean = W.steerMode === 'cursor' ? 1 : 0;
      tyaw = ly2 + u[0] * 0.06 * lean; tpitch = lp - (cock ? 0 : look ? 0.06 : W.ascending ? 0.45 : 0.1) - u[1] * 0.04 * lean; troll = -W.roll * (cock ? 0.9 : look ? 0.2 : 0.35);   // (on the climb it looks down a little: the valley falling away)
      if (cock) { kp = 1; k = 0.5; } else if (look) k = 0.25;
    }
    c.x += (tx - c.x) * kp; c.y += (ty - c.y) * kp; c.z += (tz - c.z) * kp;
    c.yaw = wrapA(c.yaw + wrapA(tyaw - c.yaw) * k); c.pitch += (tpitch - c.pitch) * k;
    if (W.rollT > 0 && cock && W.phase === 'play') c.roll = troll + W.rollDir * (1 - W.rollT / 26) * Math.PI * 2;   // in the cockpit the world spins round you
    else c.roll += wrapA(troll - c.roll) * k;
    camTrig(c);
    W.camF = { x: c.sy * c.cp, y: c.sp, z: c.cy * c.cp }; W.camR = { x: c.cy, y: 0, z: -c.sy };
  }
  function gunsight(W) {   // free flight with the stick or mouse-aim: the guns fire along the nose - the sight sits where it points
    if (W.mode !== 'free' || W.steerMode === 'cursor') { W.aimDot = null; return; }
    var S = W.ship, f = dirOf(S.yaw, S.pitch), p = project(W, S.x + f.x * 420, S.y + f.y * 420, S.z + f.z * 420);
    if (p) { W.aim.x = clamp(p.x, AIM.x0, AIM.x1); W.aim.y = clamp(p.y, AIM.y0, AIM.y1); } else { W.aim.x = CX; W.aim.y = CY; }
    if (W.steerMode === 'stick' && (W.aimOff.x || W.aimOff.y)) { W.aim.x = clamp(W.aim.x + W.aimOff.x, AIM.x0, AIM.x1); W.aim.y = clamp(W.aim.y + W.aimOff.y, AIM.y0, AIM.y1); }   // (the right stick aims off the nose)
    var g = dirOf(W.aimYaw, W.aimPitch), q = W.steerMode === 'aim' ? project(W, S.x + g.x * 420, S.y + g.y * 420, S.z + g.z * 420) : null;
    W.aimDot = q ? { x: q.x, y: q.y } : null;
  }

  // ---------------------------------------------------------------- chapter flow
  function play(W, input) {
    W.ct++;
    if (++W.calm >= W.sp.calm && (W.calm - W.sp.calm) % W.sp.regen === 0 && W.shields > 0 && W.shields < W.sp.shields) { W.shields++; W.events.push('shieldup'); fx(W, { k: 'shieldup' }); }
    if (W.mercyT > 0) W.mercyT--;
    if (W.slowT > 0) { W.slowT--; W.paceMul = 0.3; }   // (the Gaoler going down: a moment of slow motion)
    if (W.rushT > 0) W.rushT--;
    if (W.esc) { throttle(W, {}, true); escapeFly(W); }
    else {
      throttle(W, input, false); rollInput(W, input); flipInput(W, input);
      if (W.mode === 'rail') flyRail(W, false); else flyFree(W, false);
    }
    if (W.mode === 'rail' && W.rail.loop && !W.finale) {   // round her: near a generator, her main gun or the open bridge the path slows, so you have time to hit it
      var Sh = W.ship, slow = W.objs.some(function (o) { if (!o.alive || !(o.k === 'gen' || o.k === 'gun' || (o.k === 'bridge' && !o.shielded))) return false; var dx = o.x - Sh.x, dy = o.y - Sh.y, dz = o.z - Sh.z; return dx * dx + dy * dy + dz * dz < 520 * 520 && dx * Sh.vx + dy * Sh.vy + dz * Sh.vz > -40 * W.v; });
      var br = !W.gensLeft && W.objs.find(function (o) { return o.k === 'bridge' && o.alive && !o.shielded; }), bd = br ? Math.sqrt((br.x - Sh.x) * (br.x - Sh.x) + (br.y - Sh.y) * (br.y - Sh.y) + (br.z - Sh.z) * (br.z - Sh.z)) : 1e9;
      W.runHot = bd < 900;   // (v20b) the bridge run: hurried round to it while far, slowed right down near it - and her guns go wild
      if (br && W.runHot && !W.runSaid) { W.runSaid = true; banner(W, 'FINAL RUN', 'HER BRIDGE - EVERYTHING ON IT', 120, true); W.events.push('alarm'); }
      if (br && bd > 1300) W.runSaid = false;
      W.paceMul += ((br ? (bd > 1100 ? 1.7 : bd < 600 ? 0.45 : 0.8) : slow ? 0.6 : 1) - W.paceMul) * 0.03;
    }
    var key = W.mode === 'rail' && !W.rail.loop ? W.s : W.ct;   // (the valley: by distance; the warship's circuit loops: by time)
    if (W.rail && W.rail.loop && W.lapMarks) {   // once a lap, Control says what is coming - while there is something there to hit
      var L = W.rail.len, a0 = W.lapPrev || 0, a1 = W.s % L, gl = function (side) { return W.objs.some(function (o) { return o.k === 'gen' && o.alive && o.x * side > 0; }); };
      if (W.lapAt && !W.finale) W.lapAt.forEach(function (s0, n) { if (n ? a0 < s0 && s0 <= a1 : a1 < a0) lapStart(W, n); });   // (a1 < a0: round to the first lap again)
      W.lapMarks.forEach(function (m) {
        if (!(a0 < m.at && m.at <= a1)) return;
        if (m.id === 'w_belly' || m.id === 'w_strafe') radio(W, m.id);
        else if (m.id === 'w_port' && gl(-1)) radio(W, 'w_port'); else if (m.id === 'w_star' && gl(1)) radio(W, 'w_star');
        else if (m.id === 'w_spine' && W.objs.some(function (o) { return (o.k === 'gun' || (o.k === 'bridge' && !o.shielded)) && o.alive; })) radio(W, W.gensLeft ? 'w_spine' : 'w_bridge2');
      });
      W.lapPrev = a1;
    }
    while (W.cue.length && W.cue[0].at <= key && W.phase === 'play') {
      var q = W.cue.shift();
      if (q.cp) { W.checkpoint = q.at; goldPace(W, (PACE[chapter(W).id] || [])[W.checkpoints.indexOf(q.at)]); W.cpMs = { gates: W.ms.gates, gatesAll: W.ms.gatesAll, turrets: W.ms.turrets, turretsAll: W.ms.turretsAll }; W.events.push('section'); W.rk = Math.min(W.sp.rockets, W.rk + 2); W.bombs = Math.min(W.sp.bombs, W.bombs + 1); if (!q.say) banner(W, 'CHECKPOINT', '', 90, true); }
      if (q.tip === 'thrust') q.say[1] = W.ctrl === 'pad' ? 'HOLD RT FOR THRUST  -  LT BRAKES' : W.ctrl === 'touch' ? 'HOLD BOOST FOR THRUST' : W.ctrl === 'keys' ? 'HOLD W FOR THRUST  -  S BRAKES' : 'HOLD W OR THE WHEEL BUTTON FOR THRUST';   // (v20b: your own button)
      if (q.say) { banner(W, q.small ? q.say[0] + ' - ' + q.say[1] : q.say[0], q.small ? '' : q.say[1], q.small ? 90 : 170, q.small); say(W, titleCase(q.say[0]) + '. ' + q.say[1].toLowerCase() + '.'); }
      if (q.radio) radio(W, q.radio !== 'w_turn' ? q.radio : 'w_turn_' + (W.ctrl === 'pad' || W.ctrl === 'touch' || W.ctrl === 'keys' ? W.ctrl : 'mouse'));
      if (q.radio === 'v_squad') radioLater(W, 'rk_squad', 260);
      if (q.wave && !W.finale) spawnWave(W, q.wave, q.n, q);   // (none once she is going up)
      if (q.boss) { spawnWarden(W); storyEvent(W, 'gaoler'); }
      if (q.toy) spawnToy(W, q);
      if (q.boss2) spawnMillstone(W);
      if (q.ascent) { startAscent(W); return; }
    }
    if (chapter(W).id === 'warship' && !W.finale && W.ct > 4900 && --W.waveT <= 0) {   // more waves, for as long as she lasts (v20: more often while the path is far from her)
      var Sw = W.ship, far = Math.sqrt(Sw.x * Sw.x + Sw.y * Sw.y + Sw.z * Sw.z) > 1100; W.waveT = W.mode === 'rail' ? (far ? 420 : 560) : 900; W.waveN = (W.waveN || 0) + 1;
      if (W.mode === 'rail') { var WV = ['pass', 'vee', 'howl', 'dive', 'fetch', 'heavy', 'headon', 'howl', 'cross', 'fetch'], wv = WV[W.waveN % WV.length]; spawnWave(W, wv, wv === 'heavy' ? 1 : wv === 'howl' ? 4 : wv === 'fetch' ? 2 : Math.round(3 * W.sp.eCount + 0.3)); }
      else spawnWave(W, W.rnd() < 0.3 ? 'heavyf' : 'fighters', Math.round(3 * W.sp.eCount + 0.3), { ahead: W.rnd() < 0.5 });
    }
    for (var i = 0; i < W.objs.length; i++) {
      var o = W.objs[i];
      if (!o.alive) continue;
      if (W.mode === 'rail') {
        if (o.beh) railEnemyStep(W, o);
        else if (o.k === 'mine') o.rs += o.vs;
        else if (o.k === 'treat' || o.k === 'toy') pickupStep(W, o);   // (v32)   // (drifting down the lane more slowly than you fly: shoot it or steer round it)
        else if (o.k === 'boulder') boulderStep(W, o);
        else if (o.k === 'rock' && o.vlx) { o.lx += o.vlx; o.ly += o.vly; o.spin += 0.02; }   // (chapter 3: a rock drifting across the lane)
        else if (o.k === 'turret' || (o.k === 'drone' && o.armed)) {
          var rel = o.rs - W.s, wall = o.mount === 'wall';
          if (rel > (wall ? 50 : 70) && rel < (o.k === 'turret' ? (wall ? 440 : 560) : 480)) {
            if (o.burst > 0) burstStep(W, o, 7, function () { fireBolt(W, o, o.x, o.y + (wall ? 0 : 3), o.z); });
            else if (--o.fireT <= 0) { o.burst = o.k === 'turret' ? (wall ? 2 : 3) : 1; tellOn(W, o, W.sp.tell); o.fireT = (o.k === 'turret' ? (wall ? 140 : 150) : 170) * W.sp.eFire * (0.7 + W.rnd() * 0.6); }
          }
        }
      } else if (o.k === 'dart' || o.k === 'heavy') fighterStep(W, o);
    }
    if (chapter(W).id === 'warship') warshipStep(W);
    W.objs = W.objs.filter(function (q2) { return q2.alive && (q2.rs == null || q2.beh || q2.k === 'wpart' || q2.k === 'mpart' || q2.rs > W.s - 80); });
    if (W.phase !== 'play') return;
    if (chapter(W).id === 'valley') {
      if (W.warden && W.s > W.valley.sec.out - 300 && W.warden.st !== 'flee' && W.warden.st !== 'beaten') { W.warden.st = 'flee'; banner(W, 'THE GAOLER GOT AWAY', '', 140); radio(W, 'g_away'); }
      if (!W.warden) W.paceMul += (1 - W.paceMul) * 0.02;
      if (W.s >= W.rail.len - 2) chapterDone(W);
    } else if (chapter(W).id === 'shoals') {
      if (!W.mill) W.paceMul += (1 - W.paceMul) * 0.02;
      if (W.outrun) outrunStep(W); else if (W.s >= W.rail.len - 2) chapterDone(W);
    } else if (W.finale > 0) finaleStep(W);   // she breaks up, and you see it
  }
  function lapStart(W, kind) {   // a new lap round her: which one, and who is waiting on it - from lap 2, the Magpie on your tail or a few running from you
    W.lapN++; W.lapKind = kind;
    banner(W, 'LAP ' + W.lapN + ' - ' + ['ALONG HER BACK, DOWN BOTH SIDES', 'UNDER HER BELLY, THEN HER SIDES HEAD-ON', 'STRAFING RUNS ACROSS HER'][kind], '', 150, true);
    if (W.phase !== 'play') return;
    W.cue.push(W.lapN % 2 === 0 ? { at: W.ct + 240, wave: 'ace', n: 1 } : { at: W.ct + 200, wave: 'hunt', n: Math.max(2, Math.round(3 * W.sp.eCount)) });
    W.cue.sort(function (a, b) { return a.at - b.at; });
  }
  function escapeStart(W) {   // she is going up: your ship turns away from her and runs, climbing
    var S = W.ship, h = Math.sqrt(S.x * S.x + S.z * S.z) || 1, dx = S.x / h, dy = 0.3, dz = S.z / h, l = Math.sqrt(dx * dx + dy * dy + dz * dz);
    W.esc = { x: dx / l, y: dy / l, z: dz / l, v: Math.max(2, W.v) };
  }
  function escapeFly(W) {
    var S = W.ship, Q = W.esc, px = S.x, py = S.y, pz = S.z;
    Q.v += (8 - Q.v) * 0.03; W.v = Q.v; W.boosting = Q.v > 5; W.braking = false;
    var dy = wrapA(Math.atan2(Q.x, Q.z) - S.yaw);
    S.yaw = wrapA(S.yaw + dy * 0.05); S.pitch += (Math.asin(Q.y) - S.pitch) * 0.05; S.roll += (clamp(-dy * 1.5, -1, 1) - S.roll) * 0.08;
    var f = dirOf(S.yaw, S.pitch); S.x += f.x * Q.v; S.y += f.y * Q.v; S.z += f.z * Q.v; S.vx = S.x - px; S.vy = S.y - py; S.vz = S.z - pz;
  }
  function finaleStep(W) {   // (27 Oct night, the owner: "when you finally blow up the big ship ... you don't even see it blow up") you SEE it now:
    // your ship turns and runs; the camera cuts ahead of you looking back - blasts racing down her hull from the bridge to her stern; a wide
    // shot as she goes up (a flash, rings, her hull in pieces drifting apart: sr3d 'wsblow'), and the tally over the wreck
    var f = ++W.finale, D = WARSHIP;
    if (f === 30) { W.objs.forEach(function (o) { if (o.beh) o.alive = false; }); W.eshots = []; W.rockets = []; W.locks = []; escapeStart(W); }
    if (f > 30 && f < 330 && f % 5 === 0) {
      var b = D.boxes[Math.floor(W.rnd() * 5)], zz = D.bridge[2] - (f - 30) / 300 * (D.bridge[2] - D.boxes[4][2]);
      fx(W, { k: 'boom', x: b[0] + W.rnd() * (b[3] - b[0]), y: b[1] + W.rnd() * (b[4] - b[1]), z: clamp(zz + (W.rnd() - 0.5) * 240, b[2], b[5]), c: 'gen', big: true, huge: f % 30 === 0 });
      if (f % 15 === 0) W.events.push(f % 30 === 0 ? 'bigboom' : 'bigboom2');
      if (f < 170) shakeIt(W, 0.12);
    }
    if (f === 330) {
      fx(W, { k: 'wsblow', x: 0, y: 0, z: 0 }); W.events.push('bigboom'); W.events.push('bigboom2'); shakeIt(W, 0.7);
      W.objs.forEach(function (o) { if (o.free) o.alive = false; });   // (what was left of her guns goes with her)
      banner(W, 'THE WARSHIP IS DESTROYED', '', 220); radio(W, 'w_down');
    }
    if (f >= 540) chapterDone(W);
  }
  function startAscent(W) {   // the end of the valley: out of the canyon and up, up, until the sky goes black
    storyEvent(W, 'up');
    if (W.warden) { W.warden.alive = false; W.warden.parts.forEach(function (q) { q.alive = false; }); W.warden = null; }
    W.objs = W.objs.filter(function (o) { return !o.beh; }); W.eshots = []; W.shots = []; W.locks = [];
    W.ascending = true; setPhase(W, 'ascent'); W.yawRate = 0;
    banner(W, 'CLIMB FOR SPACE', 'THRUST TO CLIMB FASTER', 220); W.events.push('ascent'); say(W, 'Climb for space! Thrust to climb faster.'); radio(W, 'climb');
  }
  function secAt(W, k) { return W.valley && W.valley.sec ? W.valley.sec[k] : W.rail.len * VSEC[k]; }   // (where a valley section starts, along the route)
  function climbSoon(W) {   // the Gaoler is down (or gone): no long empty basin - the climb starts a few seconds later
    W.cue.forEach(function (c) { if (c.ascent) c.at = Math.min(c.at, W.s + 1100); });
    W.cue.sort(function (a, b) { return a.at - b.at; });
  }
  function flyAscent(W, input) {   // out of the valley on your own course: nose up, the ground falling away; the cursor or stick steers a little
    var S = W.ship, u = aimUnit(W), boost = !!(input && input.boost), sx = input && input.ctrl === 'pad' ? input.sx || 0 : W.phase === 'ascent' ? u[0] : 0;
    var sy = input && input.ctrl === 'pad' ? input.sy || 0 : W.phase === 'ascent' ? u[1] : 0;
    S.yaw = wrapA(S.yaw + sx * 0.012); W.yawRate = sx * 0.012;
    S.pitch += (clamp(1.0 - sy * 0.3, 0.55, 1.25) - S.pitch) * 0.03;
    W.v += (W.pace * (boost ? 2.6 : 1.6) - W.v) * 0.04; W.boosting = boost; W.braking = false;
    W.focal += ((boost ? 200 : 230) - W.focal) * 0.05;
    var f = dirOf(S.yaw, S.pitch); S.vx = f.x * W.v; S.vy = f.y * W.v; S.vz = f.z * W.v; S.x += S.vx; S.y += S.vy; S.z += S.vz;
    W.roll += (clamp(-sx * 0.8, -0.8, 0.8) + Math.sin(W.phaseT * 0.02) * 0.15 - W.roll) * 0.08; S.roll = W.roll;
    W.alt = S.y - W.valley.ground(S.z);
  }
  function farmStep(W) {   // (v28) the farm: saved the moment its last raider falls; lost once you have flown past with one still over it
    var F = W.farm, left = 0, S = W.ship;
    if (W.s < F.rs - 1300) return;
    F.raiders.forEach(function (o) { if (o.hp > 0) left++; });   // (its own list: one flown past is dropped from the world, not shot down)
    F.left = left;
    if (!left) { F.done = true; F.saved = true; W.ms.farm = 1; var v = add(W, PTS.farm, null); W.ms.farmPts = v; fx(W, { k: 'note', text: 'FARM SAVED +' + v, x: S.x, y: S.y + 5, z: S.z + 40 }); W.events.push('gate'); radio(W, 'v_saved'); }
    else if (W.s > F.rs + 170) { F.done = true; F.lost = true; W.ms.farm = -1; radio(W, 'v_farmlost'); }
  }
  function chapterDone(W) {
    var C = chapter(W), lines = [], acc = W.ms.shots ? W.ms.hits / W.ms.shots : 0, accPts = Math.round(acc * 100) * 100, secs = Math.round(W.ct / 60), tb = Math.max(0, C.par - secs) * 100;
    if (C.id === 'valley') {
      var pk = W.ms.pk || {};
      lines.push(['GATES ' + W.ms.gates + ' OF ' + W.ms.gatesAll, num(pk.gates || 0)]); lines.push(['FIGHTERS DOWN ' + W.ms.kills, num(pk.fighters || 0)]);
      if (W.ms.turretsAll && W.ms.turrets >= W.ms.turretsAll) { lines.push(['EVERY GUN DOWN', num((pk.guns || 0) + PTS.allGuns)]); W.score += PTS.allGuns; } else lines.push(['GUNS DOWN ' + W.ms.turrets + ' OF ' + W.ms.turretsAll, num(pk.guns || 0)]);
      lines.push([W.ms.warden ? 'THE GAOLER BEATEN' : 'THE GAOLER GOT AWAY', num(pk.gaoler || 0)]);
      if (W.farm) lines.push([W.ms.farm > 0 ? 'THE FARM SAVED' : 'THE FARM LOST', num(W.ms.farmPts || 0)]);
    }
    else if (C.id === 'shoals') {
      pk = W.ms.pk || {};
      lines.push(['ROCKS BROKEN ' + (W.ms.rocks || 0), num(pk.rocks || 0)]); lines.push(['FIGHTERS DOWN ' + W.ms.kills, num(pk.fighters || 0)]);
      lines.push(['GUNS DOWN ' + W.ms.turrets + ' OF ' + W.ms.turretsAll, num(pk.guns || 0)]);
      lines.push([W.ms.mill ? 'THE MILLSTONE FINISHED' : 'THE MILLSTONE GOT AWAY', num(pk.millstone || 0)]);
      lines.push([W.ms.caught ? 'CAUGHT IN THE BLAST' : W.ms.mill ? 'OUTRAN THE BLAST' : 'THE BLAST', num(pk.outran || 0)]);
      if (W.story) lines.push([W.ms.rescued ? 'NOODLE DOODLES RESCUED' : 'NOODLE DOODLES STILL OUT THERE', num(W.ms.rescuePts || 0)]);
    }
    else { pk = W.ms.pk || {}; lines.push(['GENERATORS ' + W.ms.gens + ' OF 4', num(pk.gens || 0)]); lines.push(['FIGHTERS DOWN ' + W.ms.kills, num(pk.fighters || 0)]); var hp = W.carrier ? W.carrier.hp : 0, hb = hp * 100; lines.push(['CARRIER ' + hp + '%', num(hb)]); W.score += hb; }
    if (W.ms.toysAll) lines.push(['SQUEAKY TOYS ' + (W.ms.toys || 0) + ' OF ' + W.ms.toysAll, num(W.ms.toyPts || 0)]);   // (v32)
    lines.push(['TIME ' + Math.floor(secs / 60) + ':' + ('0' + secs % 60).slice(-2), num(tb)]); W.score += tb;
    if (W.ms.sonic) { var ss = Math.round(W.ms.sonic / 60); lines.push(['SUPERSONIC ' + Math.floor(ss / 60) + ':' + ('0' + ss % 60).slice(-2), num(pk.sonic || 0)]); }   // (its bonus ticked up as you flew)
    lines.push(['ACCURACY ' + Math.round(acc * 100) + '%', num(accPts)]); W.score += accPts;
    if (W.ms.lost === 0) { lines.push(['NO DAMAGE', num(PTS.clean)]); W.score += PTS.clean; }
    // the medal: this chapter's score alone, against the line for your speed
    var GL = W.mode === 'free' && C.goldFree ? C.goldFree : C.gold, cs = W.score - W.score0, gold = GL[W.speed] || GL[2], medal = cs >= gold ? 'GOLD' : cs >= gold * 0.7 ? 'SILVER' : 'BRONZE';
    lines.push(['CHAPTER SCORE', num(cs)]); lines.push(['MEDAL', medal]);
    var miss = [];   // what would have got you more, and about how much: the two biggest are shown under the tally (v20)
    if (C.id === 'valley') { var mg = W.ms.turretsAll - W.ms.turrets, mt = W.ms.gatesAll - W.ms.gates; if (!W.ms.warden) miss.push(['BEAT THE GAOLER', PTS.wardenDown]); if (W.farm && !(W.ms.farm > 0)) miss.push(['SAVE THE FARM', PTS.farm]); if (mg > 0) miss.push(['ALL GUNS', PTS.allGuns + mg * PTS.turret * 2]); if (mt > 0) miss.push([mt + ' GATES', mt * PTS.gate * 4]); }
    else if (C.id === 'shoals') { if (!W.ms.mill) miss.push(['THE MILLSTONE', PTS.millstone]); if (W.story && !W.ms.rescued) miss.push(['RESCUE HER', PTS.rescue]); if (!W.ms.ace) miss.push(['THE MAGPIE', PTS.ace * 2]); if (W.ms.caught) miss.push(['OUTRUN THE BLAST', PTS.outran]); if (W.ms.turretsAll - W.ms.turrets > 0) miss.push(['EVERY GUN', (W.ms.turretsAll - W.ms.turrets) * PTS.turret * 2]); }
    else { if (!W.ms.gun) miss.push(['THE MAIN GUN', PTS.gun * 2]); if (hp < 100) miss.push(['SAVE THE CARRIER', (100 - hp) * 100]); if (!W.ms.keel) miss.push(['THE KEEL GUN', PTS.keel * 2]); }
    if (W.ms.lost) miss.push(['NO HITS', PTS.clean]);
    miss.sort(function (a, b) { return b[1] - a[1]; });
    W.tallyHint = medal === 'GOLD' ? 'GOLD!' : 'GOLD NEEDS ' + num(gold - cs) + ' MORE' + (miss.length ? ' - TRY: ' + miss.slice(0, 2).map(function (m) { return m[0] + ' +' + num(m[1]); }).join(', ') : '');
    var feats = [];
    if (C.id === 'valley') { var nq = (W.valley.squeezes || []).length; if (nq && (W.ms.thread || 0) >= nq) feats.push('needle'); if (W.ms.turretsAll && W.ms.turrets >= W.ms.turretsAll) feats.push('guns'); if (W.ms.gaolerT && W.ms.gaolerT < 40 * 60) feats.push('gaoler'); }
    else if (C.id === 'shoals') { if (!W.ms.rockHits) feats.push('untouched'); if (W.ms.ace) feats.push('magpie2'); if (W.ms.mill && W.ms.millT < 45 * 60) feats.push('mill'); }
    else { if (W.carrier && W.carrier.hp >= 100) feats.push('carrier'); if (W.ms.ace) feats.push('magpie'); if (W.ms.keel) feats.push('keel'); }
    if (W.ms.toysAll && (W.ms.toys || 0) >= W.ms.toysAll) feats.push('toys');   // (v32) the challenges
    if ((W.ms.howlersAll || 0) >= 2 && (W.ms.howlers || 0) >= W.ms.howlersAll) feats.push('howlers');
    if ((W.ms.packs || 0) >= 4) feats.push('packs');
    W.feats = feats;
    W.tally = lines; W.medal = medal; W.results.push({ chap: C.n, medal: medal, score: W.score, chapScore: cs, secs: secs, feats: feats });
    setPhase(W, 'clear'); W.eshots = []; W.shots = []; W.rockets = []; W.locks = [];
    W.events.push('clear'); say(W, 'Chapter complete. ' + spoken(lines) + '.');
  }
  var FEATS = { toys: 'ALL 3 SQUEAKY TOYS', howlers: 'EVERY HOWLER', packs: 'PACK BREAKER', needle: 'THREAD THE NEEDLE', guns: 'EVERY GUN', gaoler: 'GAOLER UNDER 40 S', carrier: 'CARRIER 100%', magpie: 'MAGPIE DOWN', keel: 'KEEL GUN',
    untouched: 'NOT A ROCK TOUCHED', magpie2: 'MAGPIE IN HIS OWN ROCKS', mill: 'MILLSTONE UNDER 45 S' };
  function retryChapter(W) {
    W.score = W.score0; if (W.lives0 != null) W.lives = W.lives0; W.results.pop(); W.feats = [];
    startChapter(W, W.chap); W.events.push('go');
  }
  // ---------------------------------------------------------------- (v31, 29 Oct) THE STORY. The owner: "you need to be like chasing someone in some
  // spaceship ... the aliens steal ... a chihuahua dog ... your job is to get your chihuahua dog back ... chasing them through the valley ... when you get
  // to the asteroid belt ... you're trying to chase someone". Her name is NOODLE DOODLES (a girl; the owner's own dog). The Magpie snatches her - her tag
  // carries Harbourlight's docking code - and runs. CHAPTER 1: you chase him down the valley (he is always just ahead, her pod slung under his ship;
  // thrust to close on him); he hands her to the Gaoler, whose cage takes her up to the warship. CHAPTER 2: she is in the warship's brig; as the warship
  // breaks up, the Magpie bursts out of her hangar with her again. CHAPTER 3: after him through the Shoals; he leaves her with the Millstone; bring it
  // down and her pod floats free - catch it. Then home. All of it scenery and words: no one can shoot her pod, and nothing here changes a fight.
  // W.story: holder (who has her: 'mag' the Magpie, ahead of you | 'gaoler' | 'up' | 'brig' | 'mill' | 'free' | 'ship'), gap (how far ahead he is),
  // mag / pod / dog (where the renderer draws them, the engine's terms), cam + cap (a scene's camera and caption).
  function storyInit(W) {
    var id = chapter(W).id, old = W.story;
    W.story = { holder: id === 'warship' ? 'brig' : 'mag', gap: 560, closeT: 0, closeR: false, noteT: -999, mag: null, pod: null, dog: null, cam: null, cap: null, caught: false, home: null, t: 0 };
    if (old && old.caught && id !== 'valley') { W.story.holder = 'ship'; W.story.caught = true; }
  }
  function storyGo(W) {   // the briefing over: the first words
    var T = W.story, id = chapter(W).id; if (!T || W.demo) return;
    if (id === 'valley') { radio(W, 'st_go'); radioLater(W, 'st_mag1', 260); }
    else if (id === 'warship') radioLater(W, 'st_brig', 420);
    else if (T.holder === 'mag') { radio(W, 'st_shoals'); radioLater(W, 'st_mag2', 300); }
  }
  function storyEvent(W, what) {
    var T = W.story; if (!T || W.demo) return;
    if (what === 'gaoler' && T.holder === 'mag') { T.holder = 'gaoler'; T.exit = { t: 0, lx: T.lx, ly: T.ly, gap: T.gap }; radio(W, 'st_hand'); radioLater(W, 'st_gaol', 230); }
    else if (what === 'up' && T.holder === 'gaoler') { T.holder = 'up'; radio(W, 'st_up'); }
    else if (what === 'mill' && T.holder === 'mag') { T.holder = 'mill'; T.exit = { t: 0, lx: T.lx, ly: T.ly, gap: T.gap }; radio(W, 'st_mill'); }
    else if (what === 'free' && T.holder === 'mill') { T.holder = 'free'; T.prs = W.s + 420; T.plx = 0; T.ply = 30; radioLater(W, 'st_free', 70); }
  }
  function storyStep(W) {
    var T = W.story; if (!T) return;
    var id = chapter(W).id, t = W.t, F, p;
    T.mag = null; T.pod = null; T.escCam = null;
    if (T.holder === 'mag') chaseStep(W, T);
    else if (T.exit && T.exit.t < 260) {   // he peels away, up and out of sight - he has left her with someone bigger
      var E2 = T.exit; E2.t++; E2.gap += W.v + 2 + E2.t * 0.05; E2.ly += 0.5 + E2.t * 0.012;
      F = frame(W.rail, W.s + E2.gap); p = local(F, E2.lx, E2.ly); T.mag = { x: p.x, y: p.y, z: p.z, yaw: F.yaw, pitch: F.pitch - 0.35, roll: 0.3 };
    }
    if (T.holder === 'gaoler' && W.warden && W.warden.alive !== false) { var g = W.warden; T.pod = { x: g.x, y: g.y - 30 + Math.sin(t * 0.05) * 1.2, z: g.z, cage: true }; }
    else if (T.holder === 'mill' && W.mill) { var arm = null; (W.mill.parts || []).forEach(function (q) { if (!arm || q.dx < arm.dx) arm = q; }); if (arm) T.pod = { x: arm.x - 4, y: arm.y - 14, z: arm.z - 6, cage: true }; }
    else if (T.holder === 'free') {   // her pod, drifting free ahead of you - it comes your way; fly through it and she is yours
      T.prs += W.pace * 0.55; T.plx += (W.ox - T.plx) * 0.03; T.ply += (W.oy - T.ply) * 0.03;
      F = frame(W.rail, T.prs); p = local(F, T.plx, T.ply); T.pod = { x: p.x, y: p.y, z: p.z };
      if (W.s >= T.prs - 3) {
        T.holder = 'ship'; T.caught = true; W.ms.rescued = 1; var v = add(W, PTS.rescue, null); W.ms.rescuePts = v;
        fx(W, { k: 'note', text: 'NOODLE DOODLES IS SAFE! +' + v, x: W.ship.x, y: W.ship.y + 6, z: W.ship.z + 40 }); W.events.push('bonus'); W.events.push('yip');
        W.radio = null; W.radioCD = 0; radio(W, 'st_got'); banner(W, 'YOU GOT HER!', 'NOODLE DOODLES IS SAFE', 170);
      }
    }
    if (id === 'warship' && W.esc && W.finale >= 200 && W.finale < 300) escapeShot(W, T);   // (the warship breaking up: he bursts out of her hangar with her)
    if (id === 'shoals' && W.phase === 'clear' && !T.caught && !T.lostSaid) { T.lostSaid = true; radio(W, 'st_lost3'); }
  }
  function chaseStep(W, T) {   // the Magpie, always just ahead: he flies a little faster than you cruise - thrust and you close on him
    var V = W.valley, sp = V.space, magV = W.pace * (sp ? 1.1 : 1.12), t = W.t, lx, ly;
    if (W.phase === 'play' && !W.freeze) T.gap = clamp(T.gap + magV - W.v, 150, 1000);
    var sm = W.s + T.gap, F = frame(W.rail, sm);
    if (sp) { var tr = V.tubeAt ? V.tubeAt(sm) : 0, lim = tr ? tr * 0.4 : 46; lx = Math.sin(t * 0.011) * lim; ly = 8 + Math.sin(t * 0.017) * lim * 0.5; }
    else {
      var hw = V.width(sm) / 2, fl = V.floorAt(sm), inT = sm > V.tunnel[0] - 40 && sm < V.tunnel[1] + 20, R = V.ridge(sm);
      lx = Math.sin(t * 0.011) * hw * 0.38; ly = fl + (inT ? 17 : 30 + Math.sin(t * 0.017) * 7);
      if (R && R.w > 1) lx = R.x + R.w + 26;   // (at a fork: down the right-hand channel)
    }
    T.lx = T.lx == null ? lx : T.lx + (lx - T.lx) * 0.05; T.ly = T.ly == null ? ly : T.ly + (ly - T.ly) * 0.05;
    var p = local(F, T.lx, T.ly), q = local(F, T.lx, T.ly - 7 + Math.sin(t * 0.07) * 0.6);
    T.mag = { x: p.x, y: p.y, z: p.z, yaw: F.yaw, pitch: F.pitch, roll: -Math.cos(t * 0.011) * 0.5 };
    T.pod = { x: q.x, y: q.y, z: q.z, cable: true };
    if (W.phase !== 'play') return;
    if (T.gap < 260) {   // right on his tail: points, and Control cheering you on
      T.closeT++; if (!T.closeR) { T.closeR = true; radio(W, 'st_close'); }
      if (T.closeT % 60 === 0) { var v = 100 * W.mult; W.score += v; W.ms.chase = (W.ms.chase || 0) + v; if (W.t - T.noteT > 200) { T.noteT = W.t; fx(W, { k: 'note', text: 'ON HIS TAIL +' + v, x: W.ship.x, y: W.ship.y + 5, z: W.ship.z + 40 }); } }
    } else if (T.gap > 340) T.closeR = false;
    if (T.gap > 900 && W.t % 900 === 450) radio(W, 'st_far');
    if (W.t % 2700 === 1350) radio(W, 'st_mag2');
    if (W.t % 1300 === 650) W.events.push('yip');   // (now and then you hear her over his open channel)
  }
  function escapeShot(W, T) {   // a camera under her belly by the hangar: out he comes, past the lens, her pod swinging under him
    var H = WARSHIP.hangar, f = W.finale, e = Math.max(0, f - 205), Wc = W.wideCam || { dx: 1, dz: 0 }, dx = Wc.dx, dz = Wc.dz;
    var d = e * e * 0.014, mx = H[0] + dx * (d + 6), my = H[1] - 8 - e * 0.18, mz = H[2] + dz * (d + 6);
    T.mag = { x: mx, y: my, z: mz, yaw: Math.atan2(dx, dz), pitch: 0.05, roll: Math.sin(e * 0.08) * 0.4 };
    T.pod = { x: mx, y: my - 7, z: mz, cable: true };
    T.escCam = { x: H[0] + dx * 78 - dz * 22, y: H[1] - 30, z: H[2] + dz * 78 + dx * 22, lx: H[0] + dx * 30, ly: H[1] - 12, lz: H[2] + dz * 30, cut: f === 205 };
    if (f === 214) { W.radio = null; W.radioCD = 0; radio(W, 'st_esc'); radioLater(W, 'st_mag3', 200); W.events.push('flyby'); W.events.push('yip'); }
  }
  function sc2(F, x, y, z) { return local(F, x, y, z); }
  function logoStep(W, input) {   // (v33) THE TITLE: STAR PAWS over a fast, low run down the valley at dawn (the letters are the panel's: starrun.js logoCard)
    var T = W.story, t = W.phaseT, V = W.valley, s0 = 260 + t * 6.5, F = frame(W.rail, s0), fl = V.floorAt(s0), A = frame(W.rail, s0 + 140), fa = V.floorAt(s0 + 140);
    var p = local(F, Math.sin(t * 0.012) * 18, fl + 16 + Math.sin(t * 0.02) * 5), l = local(A, Math.sin(t * 0.012 + 0.6) * 10, fa + 14 + t * 0.03);
    T.cam = { x: p.x, y: p.y, z: p.z, lx: l.x, ly: l.y, lz: l.z, cut: t === 0 }; T.cap = null; W.v = 6.5;
    if (t === 62 || t === 69 || t === 76 || t === 83 || t === 97 || t === 104 || t === 111 || t === 118) W.events.push('slam');
    if (t === 160) W.events.push('shine');
    if (t >= 360 || (t > 30 && input.tap)) { setPhase(W, 'intro'); }
  }
  function introStep(W, input) {   // THE THEFT: the valley's mouth at dawn - your ship on the sand, Noodle Doodles hopping about; the Magpie drops out of the
    // sky, his pod scoops her up, and he is gone down the valley; your ship lifts off after him
    var T = W.story, t = W.phaseT, F = frame(W.rail, -170), fl = W.valley.floorAt(-170), S = W.ship;
    var lift = t > 560 ? Math.min(14, (t - 560) * 0.12) : 0, ps = sc2(F, -6, fl + 2.4 + lift, 0);
    S.x = ps.x; S.y = ps.y; S.z = ps.z; S.yaw = F.yaw; S.pitch = t > 560 ? -Math.min(0.12, (t - 560) * 0.0015) : 0; S.roll = 0; W.v = 0; T.parked = t < 560;
    var td = Math.min(t, 272), dlx = 9 + Math.sin(td * 0.05) * 3, dfw = 11 + Math.cos(td * 0.037) * 4, hop = t < 272 ? Math.abs(Math.sin(t * 0.21)) * 0.8 : 0;
    var mlx, mly, mfw, k;
    if (t < 160) { mlx = 70; mly = fl + 240; mfw = -520; }
    else if (t < 272) { k = smooth(160, 272, t); mlx = 70 + (dlx - 70) * k; mly = fl + 240 - 225 * k; mfw = -520 + (dfw + 520) * k; }
    else if (t < 440) { mlx = dlx; mly = fl + 15 + Math.sin(t * 0.06) * 0.5; mfw = dfw; }
    else { var e = t - 440; mlx = dlx + e * 0.04; mly = fl + 15 + e * 0.1; mfw = dfw + e * e * 0.014; }
    var top = mly - 7, low = fl + 1.7, py = t < 282 ? top : t < 335 ? top + (low - top) * smooth(282, 335, t) : t < 400 ? low + (top - low) * smooth(345, 400, t) : top;
    T.dogIn = t >= 336;
    var pm = sc2(F, mlx, mly, mfw), pp = sc2(F, mlx, py, mfw), pd = sc2(F, dlx, fl + 0.05 + hop, dfw);
    T.mag = { x: pm.x, y: pm.y, z: pm.z, yaw: F.yaw + (t < 272 ? 0.4 * (1 - smooth(200, 272, t)) : 0), pitch: t < 272 ? -0.35 * (1 - smooth(220, 272, t)) : t > 440 ? -0.08 : 0, roll: t > 440 ? 0.15 : 0 };
    T.pod = { x: pp.x, y: pp.y, z: pp.z, cable: true };
    T.dog = T.dogIn ? null : { x: pd.x, y: pd.y, z: pd.z, yaw: F.yaw + Math.sin(t * 0.03) * 1.6, hop: hop };
    var cam, look, cut = t === 0 || t === 160 || t === 330 || t === 440 || t === 560;
    if (t < 160) { cam = sc2(F, -20 + t * 0.05, fl + 4.5, 27); look = sc2(F, 3, fl + 2.2, 6); }
    else if (t < 330) { cam = sc2(F, dlx + 9, fl + 1.8, dfw + 12); look = t < 250 ? pm : sc2(F, dlx, fl + 5, dfw); }
    else if (t < 440) { cam = sc2(F, mlx + 7, py + 1.5, mfw + 9); look = pp; }
    else if (t < 560) { cam = sc2(F, -4, fl + 9, -26); look = pm; }
    else { cam = sc2(F, -6, fl + 9 + lift, -30 + (t - 560) * 0.05); look = sc2(F, -6, fl + 4 + lift, 60); }
    T.cam = { x: cam.x, y: cam.y, z: cam.z, lx: look.x, ly: look.y, lz: look.z, cut: cut };
    T.cap = t < 160 ? { who: '', text: 'THE VALLEY MOUTH, AT DAWN. GULL ONE AND NOODLE DOODLES, WAITING FOR ORDERS.' }
      : t < 300 ? { who: 'MAGPIE', text: 'OH, WHAT A SHINY TAG. AND A LITTLE DOG ON THE END OF IT!' } : t < 440 ? { who: 'MAGPIE', text: 'FINDERS KEEPERS!' }
      : t < 560 ? { who: 'SANDERLING', text: 'GULL ONE - THE MAGPIE HAS NOODLE DOODLES! HER TAG CARRIES OUR DOCKING CODE!' } : { who: 'SANDERLING', text: 'GET AFTER HIM. BRING HER HOME!' };
    if (t === 60 || t === 120 || t === 230) W.events.push('yip');
    if (t === 170 || t === 445) W.events.push('flyby');
    if (t === 336 || t === 344) W.events.push('yip');
    if (t === 562) W.events.push('boost');
    if (t >= 720 || (t > 60 && input.tap)) { T.cam = null; T.cap = null; T.dog = null; T.mag = null; T.pod = null; T.dogIn = false; T.parked = false; T.holder = 'mag'; T.gap = 560; setPhase(W, 'brief'); W.events.push('brief'); }
  }
  function reunionStep(W, input) {   // HOME: the Lancer cruising back, slow and level; the canopy slides back and up she pops; Harbourlight ahead
    var T = W.story, t = W.phaseT, S = W.ship;
    if (!T.home) { var fw0 = dirOf(S.yaw, 0), rx = Math.cos(S.yaw), rz = -Math.sin(S.yaw); T.home = { x: S.x + fw0.x * 1100 - rx * 260, y: S.y - 70, z: S.z + fw0.z * 1100 - rz * 260 }; T.holder = 'ship'; }
    reunionCruise(W);
    T.canopy = smooth(150, 230, t); T.dogUp = smooth(215, 275, t);
    var a = 1.05 - t * 0.0016, R = 13 - 4.5 * smooth(0, 300, t), fw = dirOf(S.yaw, 0), rxx = Math.cos(S.yaw), rzz = -Math.sin(S.yaw);   // (in front of her, a little to one side: the canopy, not the engines)
    var ox = Math.sin(a) * R, oz = Math.cos(a) * R;
    T.cam = { x: S.x + rxx * ox + fw.x * oz, y: S.y + 3.2, z: S.z + rzz * ox + fw.z * oz, lx: S.x + fw.x * 1.7, ly: S.y + 1.1, lz: S.z + fw.z * 1.7, cut: t === 0 };
    T.cap = t < 150 ? { who: 'SANDERLING', text: 'GULL ONE, WE SEE YOU. IS SHE WITH YOU?' } : t < 330 ? null
      : t < 480 ? { who: 'SANDERLING', text: 'WELCOME HOME, NOODLE DOODLES. YOU TOO, GULL ONE.' } : t < 640 ? { who: 'MAGPIE', text: 'THIS IS NOT OVER, GULL ONE. I NEVER FORGET A SHINY THING!' } : null;
    if (t === 240 || t === 256 || t === 290 || t === 380) W.events.push('yip');
    if (t >= 720 || (t > 150 && input.tap)) { T.cap = null; setPhase(W, 'end'); say(W, 'That is the end of the sample. More chapters are on the way.'); }
  }
  function reunionCruise(W) { var S = W.ship, fw = dirOf(S.yaw, 0); S.pitch *= 0.95; S.roll *= 0.95; S.x += fw.x * 1.3; S.z += fw.z * 1.3; W.v = 1.3; W.boosting = false; W.braking = false; }
  function afterClear(W) {
    if (W.phase === 'reunion') { setPhase(W, 'end'); W.events.push('victory'); say(W, 'That is the end of the sample. More chapters are on the way.'); return; }
    if (W.chap + 1 < CHAPTERS.length) startChapter(W, W.chap + 1);
    else if (W.story && W.story.caught && !W.story.home) { setPhase(W, 'reunion'); W.events.push('victory'); }   // (v31) she is home
    else { setPhase(W, 'end'); W.events.push('victory'); say(W, 'That is the end of the sample. More chapters are on the way.'); }
  }
  function retry(W) {   // (v20b) a new ship, right where the last one went down - not back at the checkpoint: full shields, a full rack, two and a half
    // seconds' grace (it blinks; no hits, no crashes), the lane in front of you cleared of fighters and their fire
    W.shields = W.sp.shields; W.pk = 0.5; W.focal = FOCAL; W.bombs = Math.max(W.bombs, 1); W.rk = W.sp.rockets;
    W.eshots = []; W.shots = []; W.rockets = []; W.locks = []; W.bombsLive = []; W.altHeld = 0; W.salvo = null; W.mercyT = 0; W.hitT = 0; W.scrapeT = 0; W.grindT = 0;
    if (W.mode === 'rail') {
      W.objs = W.objs.filter(function (o) { return !((o.k === 'dart' || o.k === 'heavy' || o.k === 'mine') && o.rs != null && Math.abs(o.rs - W.s) < 420); });
      var C = corridor(W); W.ox = C.c; W.oy = (C.y0 + C.y1) / 2; W.vox = 0; W.voy = 0; W.v = W.pace * W.pk;
    } else W.objs = W.objs.filter(function (o) { return o.free && o.alive && o.k !== 'dart' && o.k !== 'heavy'; });
    W.graceT = 150;
    setPhase(W, 'play'); W.events.push('go');
  }

  // ---------------------------------------------------------------- one step
  function step(W, input) {
    if (W.over) return;
    input = input || {};
    // a heavy hit: the world holds still for a moment - and a button pressed in that moment is kept for the next step, not lost
    // (28 Oct: a shock bomb pressed during a kill's hit-stop simply vanished)
    var ONCE = ['tap', 'altTap', 'bomb', 'flip', 'rollL', 'rollR', 'roll'];
    if (W.freeze > 0) { W.freeze--; W._held = W._held || {}; ONCE.forEach(function (k) { if (input[k]) W._held[k] = true; }); return; }
    if (W._held) { var held = W._held; W._held = null; input = Object.assign({}, input); ONCE.forEach(function (k) { if (held[k]) input[k] = true; }); }
    W._in = input; W.t++; W.phaseT++; if (W.freezeCD > 0) W.freezeCD--; if (W.graceT > 0 && W.phase === 'play') W.graceT--; if (W.paceNote && ++W.paceNote.t > 220) W.paceNote = null;
    if (W.hitT > 0) W.hitT--; if (W.crashT > 0) W.crashT--; if (W.power && W.phase === 'play' && --W.power.t <= 0) W.power = null;
    W.shake = Math.max(0, W.shake - 0.035);
    if (W.t % 6 === 0) W.chainLive = targetsNear(W);
    if (W.chainT > 0 && W.chainLive !== false && --W.chainT === 0) { W.chain = 0; W.mult = 1; }
    if (W.banner && ++W.banner.t > W.banner.dur) W.banner = null;
    if (W.radioCD > 0) W.radioCD--; if (W.radio && ++W.radio.t > W.radio.dur) W.radio = null; radioQueue(W);
    if (W.hurtFrom && --W.hurtFrom.t <= 0) W.hurtFrom = null;
    steer(W, input);
    var fly = W.mode === 'rail' ? flyRail : flyFree;
    switch (W.phase) {
      case 'logo': logoStep(W, input); break;
      case 'intro': introStep(W, input); break;
      case 'reunion': reunionStep(W, input); break;
      case 'brief': throttle(W, input, true); fly(W, true); if (W.phaseT >= 420 || (W.phaseT > 60 && input.tap)) { setPhase(W, 'play'); W.events.push('go'); storyGo(W); } break;
      case 'play': play(W, input); storyStep(W); break;
      case 'ascent': storyStep(W); flyAscent(W, input); if (W.alt > 1900 || W.phaseT > 480) chapterDone(W); break;
      case 'clear': storyStep(W); if (W.ascending) flyAscent(W, input); else if (W.esc) { W.finale++; escapeFly(W); } else { throttle(W, input, true); fly(W, true); }
        if (W.phaseT > 120 && W.medal !== 'GOLD' && (input.flip || input.altTap)) { retryChapter(W); break; }
        if (W.phaseT >= (W.medal === 'GOLD' ? 420 : 720) || (W.phaseT > 120 && input.tap)) afterClear(W); break;   // (a little longer to choose, short of gold)
      case 'retry': W.v *= 0.97; if (W.mode === 'rail') { W.s += W.v; place(W); } if (W.phaseT >= 150) retry(W); break;
      case 'dead': W.v *= 0.97; if (W.mode === 'rail') { W.s += W.v; place(W); } if (W.phaseT >= 170) W.over = true; break;
      case 'end': if (W.story && W.story.home) reunionCruise(W); else if (W.esc) { W.finale++; escapeFly(W); } else { throttle(W, input, true); fly(W, true); } if (W.phaseT >= 600 || (W.phaseT > 180 && input.tap)) { W.done = true; W.over = true; } break;
    }
    camera(W, false); gunsight(W);
    W.autoR = input.autoAim || 0;   // auto-aim: what it would lock on now (the panel boxes it)
    if (W.phase === 'play' && W.autoR) { var AP = aimPoint(W); W.autoT = autoPick(W, AP.x, AP.y, W.autoR); } else W.autoT = null;
    if (W.phase === 'play' && !W.esc) { trigger(W, input); rocketsInput(W, input); bombInput(W, input); } else if (W.gap > 0) W.gap--;
    shots(W); rocketStep(W); bombStep(W); eshotsStep(W);
  }
  function hud(W) { return { score: W.score, lives: Math.max(0, W.lives), wave: W.stage }; }
  function demoStep(W) {   // the title screen: cruise down the valley with the camera swinging round the ship, for ever
    W.t++; W.phaseT++; throttle(W, {}, true); flyRail(W, true); camera(W, false); W.events.length = 0; W.fx.length = 0;
  }

  return {
    GW: GW, GH: GH, CX: CX, CY: CY, FOCAL: FOCAL, NEAR: NEAR, AIM: AIM, SHOT_T: SHOT_T, BACK: BACK, UP: UP, ARENA: ARENA, SPEEDS: SPEEDS, PTS: PTS, CHAPTERS: CHAPTERS, WARSHIP: WARSHIP, WARSHIP_BASE: WARSHIP_BASE, WS_K: WS_K, LAPS: LAPS, VSEC: VSEC, REACH: REACH, RADIO: RADIO,
    FEATS: FEATS, PACE: PACE, retryChapter: retryChapter, SSEC: SSEC, spawnMillstone: spawnMillstone, newWorld: newWorld, step: step, hud: hud, demoStep: demoStep, view: view, project: project, pick: pick, hitObj: hitObj, num: num,
    makeRail: makeRail, railPos: railPos, frame: frame, local: local, bankAt: bankAt, dirOf: dirOf, startChapter: startChapter, spawnWave: spawnWave, spawnWarden: spawnWarden,
    fireBolt: fireBolt, fireMissile: fireMissile, camLocal: camLocal, fireRocket: fireRocket, screenRay: screenRay, autoPick: autoPick, chapterDone: chapterDone, corridor: corridor, laneAt: laneAt, boxHit: boxHit, aimUnit: aimUnit, FLIP: FLIP, THRUST: THRUST, MACH1: MACH1, secAt: secAt, sAtZ: sAtZ
  };
});
