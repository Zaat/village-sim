'use strict';
/* ==========================================================================
   unlocks.js — v0.27 what knowledge is good for. Every technology has
     needs:  real-world inputs the village must have before it can study it
             (a coast, rock, timber, farms, a mine, a library, enough people...)
     gives:  what the city can do once it is known (plain words).
   The needs are the "material gates" of the research limits; the gives are shown
   in the Ages panel, the dependency tree and the discovery message. Projects and
   terraforming works that a technology opens are added automatically.
   ========================================================================== */
const popOf = w => w.vills.length;
const GATES = {
  coast: { name: 'a coast to fish and sail from', ok: w => !!(w.fishOK || w.of('dock').length) },
  harbour: { name: 'two landings or more', ok: w => w.of('dock').length >= 2 },
  rock: { name: 'rock to quarry', ok: w => w.of('minecamp').length > 0 || w.stock.stone >= 40 },
  timber: { name: 'timber to cut', ok: w => w.of('logcamp').length > 0 || w.stock.wood >= 60 },
  ore: { name: 'a working mine', ok: w => w.of('minecamp').length > 0 },
  fields: { name: 'six or more farms', ok: w => w.of('farm').length >= 6 },
  contact: { name: 'neighbours to learn from or deal with', ok: w => !!(w.neigh && w.neigh.length) },
  library: { name: 'a library', ok: w => projBuilt(w, 'library') },
  saltpetre: { name: 'saltpetre (from a cave, a mine or a neighbour)', ok: w => matOk(w, 'saltpetre') },
  coal: { name: 'coal (from a seam, a mine or a neighbour)', ok: w => matOk(w, 'coal') },
  copper: { name: 'copper (from a lode, a mine or a neighbour)', ok: w => matOk(w, 'copper') },
  oil: { name: 'oil (from a seep, a mine or a neighbour)', ok: w => matOk(w, 'oil') },
  folk30: { name: '30 people', ok: w => popOf(w) >= 30 }, folk60: { name: '60 people', ok: w => popOf(w) >= 60 },
  folk100: { name: '100 people', ok: w => popOf(w) >= 100 }, folk150: { name: '150 people', ok: w => popOf(w) >= 150 }
};
/* id: [needs, gives...] */
const UNLOCK_ROWS = {
  nets: [['coast'], 'Fishing from the shore', 'Bigger catches at every dock'],
  tools: [[], 'Faster work for everyone', 'Lodges, logging and mining need tools'],
  granary: [[], 'Granaries hold more and spoil less', 'The Great Granary'],
  carpentry: [[], 'Timber-framed cabins', 'The Great Hall', 'Upgrades for old cabins'],
  lodges: [['timber'], 'Hunting lodges near the game trails'],
  oral: [[], 'Faster learning'], shelter: [[], 'Plastered walls: buildings go up faster'], weaving: [[], 'Warm clothes: healthier winters'],
  kin: [[], 'Family duties: steadier mood'], spears: [[], 'Armed hunters and guards'], pottery: [[], 'Clay pots: slower spoilage'],
  forestry: [['timber'], 'Logging camps'], mining: [['rock'], 'Mining camps'], trade: [['contact'], 'The market and visiting merchants'],
  boats: [['coast', 'timber'], 'Fishing boats and docks'], rotation: [['fields'], 'Higher crop yields'], masonry: [['rock'], 'Stone houses', 'Cobbled roads', 'Library, Monument, Amphitheatre'],
  medicine: [[], 'Healers: fewer deaths from fever'], bronze: [['ore'], 'Bronze tools', 'Faster work'], irrigation: [['fields'], 'Ditches to the fields'],
  counting: [[], 'Tally records'], chiefdom: [[], 'Recognised leaders'], bows: [[], 'Guards strike from the wall'],
  astronomy: [[], 'Sky charts for farmers and sailors'], grading: [[], 'Levelled house plots', 'Levelled ground: bare rock becomes plots'],
  ironwork: [['ore', 'rock'], 'Iron tools', 'Foundry', 'Citadel'], plow: [['fields'], 'Deep ploughing'], watchtowers: [['rock'], 'Watchtowers', 'Bastion'],
  navigation: [['coast'], 'Open-water voyages', 'The Lighthouse'], writing: [['folk30'], 'Written records and laws'], lawcodes: [['folk30'], 'Written law'],
  roads: [['rock'], 'Paved roads: faster travel'], shipwright: [['coast', 'timber'], 'Larger ships'], armour: [['ore'], 'Armoured guards'],
  cisterns: [['rock'], 'Clean water tanks'], orchards: [['fields'], 'Fruit trees and vines'],
  coinage: [['contact'], 'Coins and a treasury', 'Taxes and wealth'], seatrade: [['harbour', 'contact'], 'Merchant ships at the docks'],
  aqueducts: [['rock', 'folk60'], 'Aqueducts: health and faster building'], arches: [['rock'], 'Vaults and bridges'], libraries: [['folk30'], 'Library gains more value'],
  philosophy: [['folk30'], 'Public debate spreads ideas'], republic: [['folk60'], 'Citizen assemblies'], legion: [['ore'], 'Drilled guards'],
  cartography: [['coast'], 'Charts for expeditions'], surgery: [[], 'Wounds heal'], terracing: [['fields'], 'Terraced fields: rocky slopes become farmland'],
  drainage: [['rock'], 'Drained shore: shore sand becomes meadow'], brickwork: [['rock', 'timber'], 'Brick houses'],
  feudalism: [['folk60'], 'Oaths of service'], guilds: [['folk60', 'ore'], 'Guilds: better work and prices'], watermills: [['rock', 'timber'], 'Mills on the river'],
  crop3: [['fields'], 'Three-field system'], cathedrals: [['rock', 'folk100'], 'Great cathedrals: faith and fellowship'], universities: [['library', 'folk100'], 'A university of masters and students'],
  castles: [['rock', 'folk60'], 'Castles'], carrack: [['harbour', 'timber'], 'Ocean ships'], banking: [['folk100'], 'Loans and credit'],
  hospitals: [['folk60'], 'Houses for the sick'], canals: [['rock', 'folk60'], 'Canals'], dikes: [['rock', 'coast'], 'Dikes: shallows become sand'],
  siegecraft: [['ore'], 'Siege engines'], glass: [['ore', 'rock'], 'Glass windows and lenses'],
  printing: [['library', 'folk100'], 'Books by the hundred'], architecture: [['rock', 'folk100'], 'Townhouses'], compass: [['harbour'], 'Safe long voyages'],
  accounting: [['folk100'], 'Surer trade gains'], anatomy: [['folk100'], 'Confident surgeons'], scientific: [['library', 'folk100'], 'Discoveries follow each other'],
  reclamation: [['coast', 'folk100'], 'Polders: shallows become fields'], agronomy: [['fields'], 'Selective breeding'], gunpowder: [['ore', 'saltpetre', 'folk100'], 'Black powder'],
  optics: [['ore', 'library'], 'Lenses and telescopes'],
  muskets: [['ore', 'folk100'], 'Muskets'], bastion: [['rock', 'folk100'], 'Angled forts'], divingbell: [['harbour'], 'Underwater work'],
  chronometer: [['harbour', 'folk100'], 'Exact positions at sea'], blastfurnace: [['ore', 'timber', 'coal', 'folk100'], 'Iron in bulk'],
  natphilosophy: [['library', 'folk100'], 'Engineering by laws'], vaccination: [['folk100'], 'Epidemics fade'], parliament: [['folk100'], 'Constitutional rule'],
  fertilizer: [['fields'], 'Tired soil recovers'], frigate: [['harbour', 'timber'], 'Armed ships'], artillery: [['ore', 'folk100'], 'Cannon'],
  steam: [['ore', 'coal', 'folk100'], 'Steam engines'], railways: [['ore', 'rock', 'folk150'], 'Railways'], steamship: [['harbour', 'ore'], 'Steamships'],
  telegraph: [['copper', 'folk100'], 'News in minutes'], sanitation: [['rock', 'folk100'], 'Sewers: epidemics fade'], steel: [['ore', 'coal', 'folk100'], 'Steel'],
  mechfarm: [['fields', 'ore'], 'Machines in the fields'], factories: [['ore', 'folk150'], 'Factories'], ironclads: [['harbour', 'ore'], 'Armoured ships'],
  electricity: [['copper', 'folk100'], 'Light and power on a wire'], concrete: [['rock', 'folk100'], 'Concrete', 'Apartment blocks'], dredging: [['coast', 'ore'], 'Steam dredging'],
  pubschools: [['folk100'], 'Every child taught'],
  engines: [['ore', 'oil', 'folk150'], 'Combustion engines'], radio: [['folk100'], 'Voices across the air'], antibiotics: [['folk150'], 'Infections cured'],
  skyscrapers: [['rock', 'folk150'], 'Towers'], hybrids: [['fields'], 'Hybrid crops'], massprod: [['ore', 'folk150'], 'Assembly lines'], welfare: [['folk150'], 'A safety net'],
  computers: [['folk150'], 'Machines that calculate'], earthworks: [['ore', 'folk150'], 'Earthworks: hills and shallows become open ground'], shipping: [['harbour', 'folk150'], 'Container shipping'],
  sonar: [['harbour'], 'Seabed mapping'], aviation: [['ore', 'oil', 'folk150'], 'Flight']
};
/* what a technology gives: the hand-written line(s) plus every great project it opens */
function unlocksOf(id) {
  const r = UNLOCK_ROWS[id] || [[]], gives = r.slice(1).filter(g => !(typeof PROJECTS === 'object' && Object.values(PROJECTS).some(p => p.name === g)));
  if (typeof PROJECTS === 'object') for (const k in PROJECTS) if (PROJECTS[k].tech === id) gives.push(PROJECTS[k].name + ' (great project)');
  return { needs: r[0], gives: gives.length ? gives : [TECHS[id].desc] };
}
/* the gates a village does not yet meet for this technology */
const techGaps = (w, id) => unlocksOf(id).needs.filter(g => !GATES[g].ok(w));
