// Writes games/<game>/journey.js for the four games against the computer, from tools/journeys/<game>-levels.json
// (made by make-rival-journeys.cjs) and the chapters and drawings in scenes-rivals.cjs. The page loads it before
// common/journey.js; the game's own file passes it to the table as D.journey.
const fs = require('fs'), path = require('path');
const SC = require('./scenes-rivals.cjs');
const VAR = { hearts: 'HE_JOURNEY', gin: 'GR_JOURNEY', cribbage: 'CR_JOURNEY', whist: 'WH_JOURNEY' };
const WHAT = {
  hearts: 'one hand each: t = the most points you may score for each star (\'moon\' = shoot the moon)',
  gin: 'one hand each: t = how much you must win the hand by for each star (1 = just win it; \'gin\' = go Gin)',
  cribbage: 'one deal each: t = the points you must score in the deal for each star',
  whist: 'one hand each: t = the tricks you and Jo must take for each star',
};
for (const game of Object.keys(VAR)) {
  const J = JSON.parse(fs.readFileSync(path.join(__dirname, game + '-levels.json'), 'utf8')), S = SC[game];
  if (S.chapters.length !== 10 || S.scenes.length !== 10 || S.skies.length !== 10) throw new Error(game + ': 10 chapters, scenes and skies needed');
  const out = '/* 365 ' + { hearts: 'Hearts', gin: 'Gin Rummy', cribbage: 'Cribbage', whist: 'Whist' }[game] + ' - the Journey (made by tools/journeys/make-rival-journeys.cjs on ' + J.made + ' and write-rival-journeys.cjs; do not edit by hand).\n'
    + ' * 10 chapters x 10 levels ' + S.where + ', ' + WHAT[game] + '.\n'
    + ' * Every target has been reached on its deal (tools/journeys/check-rival-journeys.cjs replays the lines). scenes = our drawings of each chapter. */\n'
    + '(function (root) {\n  var J = { where: ' + JSON.stringify(S.where) + ', chapters: ' + JSON.stringify(S.chapters) + ',\n    skies: ' + JSON.stringify(S.skies) + ',\n    scenes: ' + JSON.stringify(S.scenes) + ',\n    levels: [\n'
    + J.levels.map((l) => '      ' + JSON.stringify(l)).join(',\n') + '\n    ] };\n'
    + "  if (typeof module !== 'undefined' && module.exports) module.exports = J; else root." + VAR[game] + ' = J;\n})(typeof window !== \'undefined\' ? window : this);\n';
  const file = path.join(__dirname, '../../games/' + game + '/journey.js');
  fs.writeFileSync(file, out);
  console.log(game + ': ' + J.levels.length + ' levels, ' + Math.round(out.length / 1024) + ' KB -> games/' + game + '/journey.js');
}
