/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   techtree.js — v0.24 the tree of knowledge: about 150 technologies in 8
   branches and 11 ages (v0.39 adds the Atomic and Information ages). Ids of the first 18 technologies are unchanged, so old
   saves keep working. Each row:
     [id, name, branch, age, cost, requires, description, effects, ladder]
   effects (sums over all known techs; see techFx): farm, work, build, learn,
   health, store, trade, sea, defence, mood.   ladder: groups of techs that later
   steps use (terra = terraforming, explore = expeditions, war = units).
   An age is complete when 65% of its technologies are known; technologies of
   an age become available when the age before is complete.
   ========================================================================== */
const AGES = ['Stone Age', 'Bronze Age', 'Iron Age', 'Classical Age', 'Medieval Age', 'Renaissance', 'Gunpowder Age', 'Industrial Age', 'Modern Age', 'Atomic Age', 'Information Age'];
const BRANCHES = { food: { name: 'Land & food', col: '#8fd18b' }, build: { name: 'Building', col: '#d9a35a' }, craft: { name: 'Craft & metal', col: '#b9bfc6' }, sea: { name: 'Sea & trade', col: '#7fb4e8' }, mind: { name: 'Learning & faith', col: '#b08fe8' }, law: { name: 'Society & law', col: '#e0b070' }, war: { name: 'War & defence', col: '#e07a5a' }, health: { name: 'Medicine', col: '#e08fa8' } };
const TECH_ROWS = [
  // ---- Stone Age
  ['nets', 'Fishing nets', 'food', 0, 100, [], 'Woven nets: every catch is larger.', {}],
  ['tools', 'Better tools', 'craft', 0, 100, [], 'Hardened axes and picks: work goes about 10% faster.', {}],
  ['granary', 'Granaries', 'food', 0, 110, [], 'Raised, ventilated stores: each storehouse holds more and food spoils less.', {}],
  ['carpentry', 'Carpentry', 'build', 0, 120, [], 'Joinery and framing: new cabins are timber-framed and sleep one more person; old cabins can be upgraded.', {}],
  ['lodges', 'Hunting lodges', 'food', 0, 240, ['tools'], 'Smoking and drying meat: lodges near the game trails make hunts surer and shorten every trip.', {}],
  ['oral', 'Oral tradition', 'mind', 0, 100, [], 'Stories and songs carry what the old know down to the young: knowledge grows a little faster.', { learn: 0.05 }],
  ['shelter', 'Wattle and daub', 'build', 0, 110, [], 'Plastered walls: buildings go up a little faster.', { build: 0.05 }],
  ['weaving', 'Weaving', 'craft', 0, 110, [], 'Woven cloth and furs: warmer clothes, healthier winters.', { health: 0.06 }],
  ['kin', 'Kinship customs', 'law', 0, 100, [], 'Clear family bonds and duties: a calmer, steadier village.', { mood: 0.02 }],
  ['spears', 'Hafted spears', 'war', 0, 110, ['tools'], 'Stone points on long shafts: hunters and guards fight surer.', { defence: 0.08 }],
  ['pottery', 'Pottery', 'craft', 0, 120, [], 'Fired clay pots: grain and oil keep longer.', { store: 0.05 }],
  // ---- Bronze Age
  ['forestry', 'Forestry', 'craft', 1, 240, ['tools'], 'Organized timber work: logging camps beside the forest cut about a quarter more wood and shorten every trip.', {}],
  ['mining', 'Mining', 'craft', 1, 260, ['tools', 'carpentry'], 'Shafts and props: mining camps by the rock yield more stone, carry bigger loads and shorten every trip.', {}],
  ['trade', 'Trade', 'sea', 1, 260, ['carpentry'], 'Markets and visiting merchants: surplus goods can be swapped for what the village lacks.', {}],
  ['boats', 'Boat-building', 'sea', 1, 260, ['nets', 'carpentry'], 'Hulls and oars: docks and fishing boats can reach deep water.', {}],
  ['rotation', 'Crop rotation', 'food', 1, 260, ['granary'], 'Resting and alternating fields: crops yield about a quarter more.', {}],
  ['masonry', 'Masonry', 'build', 1, 280, ['tools', 'carpentry'], 'Cut stone: new homes are stone and sleep two more people; roads are cobbled.', {}],
  ['medicine', 'Herbal medicine', 'health', 1, 240, ['granary'], 'Healers and remedies: fevers and wounds are far less deadly.', {}],
  ['bronze', 'Bronze casting', 'craft', 1, 300, ['tools', 'mining'], 'Copper and tin alloyed: sharper tools, and work goes faster.', { work: 0.06 }],
  ['irrigation', 'Irrigation', 'food', 1, 280, ['rotation'], 'Ditches carry water to the fields: crops yield more.', { farm: 0.08 }],
  ['counting', 'Counting and tally', 'law', 1, 220, ['oral'], 'Tallies of grain, herds and debts: knowledge is kept, not just remembered.', { learn: 0.05 }],
  ['chiefdom', 'Chieftainship', 'law', 1, 240, ['kin'], 'Recognised leaders settle disputes before they spread.', { mood: 0.02 }],
  ['bows', 'Bows and archery', 'war', 1, 260, ['spears'], 'Bows from the shade of the wall: guards strike from a distance.', { defence: 0.12 }],
  ['astronomy', 'Sky-watching', 'mind', 1, 250, ['oral'], 'Seasons and stars charted: farmers sow on time and sailors know their way.', { learn: 0.05, sea: 0.04 }, 'explore'],
  ['grading', 'Levelling plots', 'build', 1, 220, ['carpentry'], 'Spades and rakes level a house plot and drain a wet corner.', { build: 0.04 }, 'terra'],
  // ---- Iron Age
  ['ironwork', 'Ironwork', 'craft', 2, 540, ['tools', 'masonry'], 'Iron edges: work speeds up again and hunters and fighters strike truer.', {}],
  ['plow', 'The heavy plow', 'food', 2, 520, ['rotation', 'ironwork'], 'Deep furrows: fields yield another quarter more.', {}],
  ['watchtowers', 'Watchtowers', 'war', 2, 520, ['masonry'], 'Lookouts see danger early: wolves are met sooner by more fighters.', {}],
  ['navigation', 'Navigation', 'sea', 2, 500, ['boats'], 'Stars and landmarks: boats carry bigger catches and a second boat can work each dock.', {}, 'explore'],
  ['writing', 'Writing', 'mind', 2, 420, ['counting'], 'Marks on clay and papyrus: laws, accounts and lessons are written down.', { learn: 0.15 }],
  ['lawcodes', 'Written law', 'law', 2, 420, ['chiefdom', 'counting'], 'The same rules for everyone, carved where all can see: fewer quarrels turn violent.', { mood: 0.03 }],
  ['roads', 'Paved ways', 'build', 2, 400, ['masonry'], 'Laid stone roads: carts and walkers move faster.', { work: 0.04 }],
  ['shipwright', 'Shipwrights', 'sea', 2, 440, ['boats', 'ironwork'], 'Keeled hulls with iron fittings: ships carry more.', { sea: 0.1 }],
  ['armour', 'Iron armour', 'war', 2, 460, ['ironwork'], 'Helmets and mail: guards survive blows that would have killed them.', { defence: 0.2 }],
  ['cisterns', 'Cisterns', 'health', 2, 380, ['masonry'], 'Stone tanks keep rainwater clean: fewer fevers.', { health: 0.08 }],
  ['orchards', 'Orchards and vineyards', 'food', 2, 380, ['irrigation'], 'Grafted fruit trees and vines: more food from the same land.', { farm: 0.05 }],
  // ---- Classical Age
  ['coinage', 'Coinage', 'law', 3, 480, ['trade', 'masonry'], 'Coins and a village treasury: trade earns money, the council sets taxes, and families can grow wealthy.', {}],
  ['seatrade', 'Sea trade', 'sea', 3, 520, ['trade', 'navigation'], 'Harbor trade: merchant ships call at the docks with larger cargoes.', {}],
  ['aqueducts', 'Aqueducts', 'build', 3, 600, ['roads', 'cisterns'], 'Water carried over valleys on arches: cleaner, healthier town and quicker building.', { health: 0.08, build: 0.05 }],
  ['arches', 'Arches and vaults', 'build', 3, 560, ['masonry', 'roads'], 'Spans of stone: bigger halls and sturdier bridges, faster building.', { build: 0.1 }],
  ['libraries', 'Libraries', 'mind', 3, 560, ['writing'], 'Scrolls collected and copied: knowledge grows faster.', { learn: 0.15 }],
  ['philosophy', 'Philosophy', 'mind', 3, 600, ['writing', 'astronomy'], 'Open questions asked in public: ideas spread faster and the village is a little more content.', { learn: 0.1, mood: 0.02 }],
  ['republic', 'Civic assemblies', 'law', 3, 580, ['lawcodes', 'counting'], 'Citizens speak and vote on common matters.', { mood: 0.03 }],
  ['legion', 'Drilled ranks', 'war', 3, 580, ['armour'], 'Fighters trained to hold a line: guards are far steadier.', { defence: 0.25 }],
  ['cartography', 'Cartography', 'sea', 3, 560, ['navigation'], 'Charts of coasts and currents: voyages go further and return surer.', { sea: 0.1 }, 'explore'],
  ['surgery', 'Surgery', 'health', 3, 600, ['medicine', 'cisterns'], 'Cutting and stitching: wounds that killed now heal.', { health: 0.15 }],
  ['terracing', 'Terraced fields', 'food', 3, 540, ['irrigation'], 'Hillsides cut into steps: poor slopes become fields.', { farm: 0.06 }, 'terra'],
  ['drainage', 'Drainage works', 'build', 3, 500, ['cisterns', 'grading'], 'Ditches and culverts drain marsh and wet ground: more land to build on.', {}, 'terra'],
  ['brickwork', 'Kilns and brick', 'build', 3, 580, ['masonry', 'pottery'], 'Fired brick: sturdy, even walls. New homes are brick and sleep one more person.', {}],
  // ---- Medieval Age
  ['feudalism', 'Feudal bonds', 'law', 4, 700, ['lawcodes'], 'Oaths of service and protection: a steadier, if harder, order.', { defence: 0.1 }],
  ['guilds', 'Guilds', 'craft', 4, 700, ['coinage', 'bronze'], 'Crafts organised and trained: better work, better prices.', { work: 0.06, trade: 0.05 }],
  ['watermills', 'Water mills', 'craft', 4, 680, ['aqueducts'], 'The river turns the wheel: grinding and sawing without hands.', { work: 0.08 }],
  ['crop3', 'Three-field system', 'food', 4, 700, ['plow', 'orchards'], 'Two fields sown and one rested in turn: yields climb.', { farm: 0.12 }],
  ['cathedrals', 'Great cathedrals', 'mind', 4, 760, ['arches', 'libraries'], 'Soaring stone built over generations: faith, learning and pride.', { mood: 0.04, learn: 0.05 }],
  ['universities', 'Universities', 'mind', 4, 800, ['libraries', 'philosophy'], 'Masters and students gather to argue and teach: knowledge races ahead.', { learn: 0.25 }],
  ['castles', 'Castle building', 'war', 4, 740, ['legion', 'arches'], 'Keeps and curtain walls: a village that can hold out.', { defence: 0.3 }],
  ['carrack', 'Ocean-going ships', 'sea', 4, 720, ['cartography', 'shipwright'], 'High-sided ships that cross open sea.', { sea: 0.15 }, 'explore'],
  ['banking', 'Banking', 'law', 4, 760, ['coinage', 'guilds'], 'Loans and letters of credit: trade runs on trust.', { trade: 0.15 }],
  ['hospitals', 'Hospitals', 'health', 4, 700, ['surgery'], 'Houses for the sick: care that keeps people alive.', { health: 0.15 }],
  ['canals', 'Canals', 'build', 4, 720, ['drainage', 'aqueducts'], 'Cut waterways: water, goods and boats go where the land did not allow.', {}, 'terra'],
  ['dikes', 'Dikes and polders', 'build', 4, 760, ['canals'], 'Earth walls hold back the sea: land is won from shallow water.', {}, 'terra'],
  ['siegecraft', 'Siegecraft', 'war', 4, 740, ['castles'], 'Rams, towers and engines to break a wall.', { defence: 0.05 }, 'war'],
  ['glass', 'Glassmaking', 'craft', 4, 700, ['brickwork', 'bronze'], 'Clear panes and lenses: lighter homes and new instruments.', { health: 0.03 }, 'explore'],
  // ---- Renaissance
  ['printing', 'Printing', 'mind', 5, 900, ['universities'], 'Books by the hundred: knowledge spreads as never before.', { learn: 0.3 }],
  ['architecture', 'Renaissance architecture', 'build', 5, 880, ['arches', 'universities'], 'Proportion, domes and grand squares: handsome townhouses and faster building.', { build: 0.1 }],
  ['compass', 'The compass', 'sea', 5, 880, ['cartography', 'carrack'], 'A needle that always points: no voyage is lost for want of direction.', { sea: 0.15 }, 'explore'],
  ['accounting', 'Double-entry accounting', 'law', 5, 860, ['banking'], 'Every coin accounted for: trade gains are surer.', { trade: 0.1 }],
  ['anatomy', 'Anatomy', 'health', 5, 900, ['hospitals'], 'The body studied openly: surgeons work with confidence.', { health: 0.15 }],
  ['scientific', 'The experimental method', 'mind', 5, 950, ['printing'], 'Test every claim: discoveries follow each other.', { learn: 0.3 }],
  ['reclamation', 'Land reclamation', 'build', 5, 900, ['dikes'], 'Pumps and polders turn shallows and marsh into fields.', {}, 'terra'],
  ['agronomy', 'Selective breeding', 'food', 5, 880, ['crop3'], 'Better seed, better stock: yields rise again.', { farm: 0.12 }],
  ['gunpowder', 'Gunpowder', 'war', 5, 950, ['siegecraft', 'glass'], 'Black powder: a new, fearful way to fight.', { defence: 0.1 }, 'war'],
  ['optics', 'Lenses and telescopes', 'mind', 5, 900, ['glass', 'astronomy'], 'The far made near: stars, coasts and cells in sharp focus.', { learn: 0.05, sea: 0.05 }, 'explore'],
  // ---- Gunpowder Age
  ['muskets', 'Muskets', 'war', 6, 980, ['gunpowder'], 'Shoulder guns: a line of guards outweighs a champion.', { defence: 0.3 }, 'war'],
  ['bastion', 'Bastion forts', 'war', 6, 960, ['castles', 'gunpowder'], 'Angled walls that cannons cannot easily break.', { defence: 0.3 }, 'war'],
  ['divingbell', 'Diving bells', 'sea', 6, 940, ['optics', 'compass'], 'A weighted bell with air inside: people can work on the seabed.', {}, 'explore'],
  ['chronometer', 'The chronometer', 'sea', 6, 1000, ['compass', 'scientific'], 'A clock that keeps time at sea: positions fixed at last.', { sea: 0.1 }, 'explore'],
  ['blastfurnace', 'Blast furnaces', 'craft', 6, 1050, ['bronze', 'watermills'], 'Iron in bulk: cheaper tools and better metal.', { work: 0.1 }],
  ['natphilosophy', 'Natural philosophy', 'mind', 6, 1100, ['scientific'], 'Laws of motion and matter: engineering becomes a science.', { learn: 0.2 }],
  ['vaccination', 'Vaccination', 'health', 6, 1100, ['anatomy'], 'A small scratch against a great sickness.', { health: 0.2 }],
  ['parliament', 'Constitutional government', 'law', 6, 1050, ['accounting', 'republic'], 'Rulers answerable to a standing assembly.', { mood: 0.05 }],
  ['fertilizer', 'Fertilizer', 'food', 6, 1100, ['agronomy'], 'Bone, guano and lime: tired soil recovers quickly.', { farm: 0.15 }],
  ['frigate', 'Ships of the line', 'sea', 6, 1050, ['carrack', 'gunpowder'], 'Armed, fast and seaworthy: protection and carrying power.', { sea: 0.15, defence: 0.05 }],
  ['artillery', 'Artillery', 'war', 6, 1100, ['muskets'], 'Cannon that smash walls: defences change again.', { defence: 0.3 }, 'war'],
  // ---- Industrial Age
  ['steam', 'Steam power', 'craft', 7, 1200, ['blastfurnace', 'natphilosophy'], 'Coal and water do the work of many hands.', { work: 0.15 }],
  ['railways', 'Railways', 'build', 7, 1400, ['steam'], 'Iron roads carry goods and people far and fast.', { trade: 0.15, work: 0.1 }],
  ['steamship', 'Steamships', 'sea', 7, 1400, ['steam', 'frigate'], 'Ships that need no wind: faster, surer, bigger cargoes.', { sea: 0.25 }, 'explore'],
  ['telegraph', 'The telegraph', 'mind', 7, 1350, ['natphilosophy', 'steam'], 'News in minutes: trade and learning speed up.', { learn: 0.15, trade: 0.05 }],
  ['sanitation', 'Sanitation', 'health', 7, 1300, ['vaccination'], 'Sewers and clean water: epidemics fade.', { health: 0.25 }],
  ['steel', 'Steel', 'craft', 7, 1350, ['blastfurnace'], 'Strong, cheap steel for tools, rails and frames.', { work: 0.1 }],
  ['mechfarm', 'Mechanised farming', 'food', 7, 1400, ['fertilizer', 'steam'], 'Machines sow and reap: one farmer feeds many.', { farm: 0.2 }],
  ['factories', 'Factories', 'craft', 7, 1450, ['steam'], 'Work gathered under one roof and one clock.', { work: 0.15 }],
  ['ironclads', 'Ironclads', 'war', 7, 1400, ['steamship', 'artillery'], 'Armoured, gun-armed ships.', { defence: 0.3 }, 'war'],
  ['electricity', 'Electricity', 'mind', 7, 1500, ['telegraph'], 'Light and power on a wire.', { learn: 0.15, work: 0.1 }],
  ['concrete', 'Concrete and steel frames', 'build', 7, 1300, ['steel', 'arches'], 'Tall, strong buildings: apartment blocks and big works.', { build: 0.15 }],
  ['dredging', 'Steam dredging', 'build', 7, 1400, ['steam', 'dikes'], 'Machines that move mud and rock: harbours deepen and shores are remade.', {}, 'terra'],
  ['pubschools', 'Public schools', 'law', 7, 1300, ['parliament', 'printing'], 'Every child taught to read: knowledge and order spread.', { learn: 0.2 }],
  // ---- Modern Age
  ['engines', 'Combustion engines', 'craft', 8, 1700, ['steel', 'electricity'], 'Compact engines power trucks, pumps and boats.', { work: 0.12 }],
  ['radio', 'Radio', 'mind', 8, 1700, ['electricity'], 'Voices across the air.', { learn: 0.1, trade: 0.05 }],
  ['antibiotics', 'Antibiotics', 'health', 8, 1700, ['sanitation'], 'Infections that once killed are cured.', { health: 0.3 }],
  ['skyscrapers', 'Skyscrapers', 'build', 8, 1800, ['concrete', 'electricity'], 'Towers of glass and steel: dense, tall cities.', { build: 0.2 }],
  ['hybrids', 'Hybrid crops', 'food', 8, 1800, ['mechfarm'], 'Bred for yield and hardiness.', { farm: 0.2 }],
  ['massprod', 'Mass production', 'craft', 8, 1900, ['factories', 'engines'], 'Assembly lines: more of everything.', { work: 0.15 }],
  ['welfare', 'Welfare and public health', 'law', 8, 1800, ['pubschools', 'sanitation'], 'A safety net: fewer fall through.', { mood: 0.08 }],
  ['computers', 'Computers', 'mind', 8, 2200, ['radio', 'electricity'], 'Machines that calculate and remember: knowledge no longer waits.', { learn: 0.3 }],
  ['earthworks', 'Heavy earthmoving', 'build', 8, 2000, ['engines', 'dredging'], 'Mountains moved, harbours dug, rivers redirected: terrain bends to the city.', {}, 'terra'],
  ['shipping', 'Container shipping', 'sea', 8, 1900, ['steamship', 'engines'], 'Standard boxes, giant ships: trade on a vast scale.', { sea: 0.3, trade: 0.15 }],
  ['sonar', 'Sonar', 'sea', 8, 2000, ['radio', 'divingbell'], 'Sound maps the seabed: wrecks and reefs are found.', {}, 'explore'],
  ['aviation', 'Aviation', 'war', 8, 2100, ['engines', 'electricity'], 'Flight: the world shrinks and the sky becomes contested.', { defence: 0.1, trade: 0.05 }, 'war'],
  // ---- Atomic Age (v0.39)
  ['nucphysics', 'Nuclear physics', 'mind', 9, 2400, ['computers'], 'The atom is understood: a new kind of power and a new kind of fear.', { learn: 0.15 }],
  ['transistors', 'Transistors', 'craft', 9, 2400, ['computers', 'radio'], 'Tiny switches replace glass tubes: machines shrink and spread.', { work: 0.1, learn: 0.1 }],
  ['fission', 'Nuclear power', 'craft', 9, 2700, ['nucphysics', 'massprod'], 'Reactors boil water without coal: cheap power for cities, and a waste problem.', { work: 0.15 }],
  ['plastics', 'Plastics and polymers', 'craft', 9, 2300, ['massprod'], 'Light, cheap, mouldable: from pipes to packaging.', { work: 0.08, store: 0.05 }],
  ['jetliners', 'Jet aircraft', 'sea', 9, 2500, ['aviation', 'engines'], 'Continents in hours: trade and travel across the whole map.', { trade: 0.2, sea: 0.1 }],
  ['rocketry', 'Rocketry', 'war', 9, 2600, ['aviation', 'nucphysics'], 'Rockets carry weapons and, one day, people beyond the sky.', { defence: 0.2 }, 'war'],
  ['civildefence', 'Civil defence', 'war', 9, 2300, ['aviation', 'welfare'], 'Shelters, sirens and plans: the village is ready for the worst.', { defence: 0.15, mood: 0.02 }],
  ['greenrev', 'Green revolution', 'food', 9, 2400, ['hybrids'], 'High-yield grain, fertiliser and irrigation together: harvests multiply.', { farm: 0.55 }],
  ['cropcare', 'Crop protection', 'food', 9, 2200, ['hybrids'], 'Blight and pests are held back: fewer harvests are lost.', { farm: 0.3 }],
  ['pivot', 'Pivot irrigation', 'food', 9, 2300, ['mechfarm'], 'Great sprinkler arms water dry ground: farms thrive in drought.', { farm: 0.3 }],
  ['coldchain', 'The cold chain', 'food', 9, 2200, ['massprod', 'electricity'], 'Refrigerated stores and trucks: food keeps and travels.', { store: 0.25 }],
  ['prefab', 'Prefabricated building', 'build', 9, 2300, ['concrete', 'massprod'], 'Parts made in factories: homes rise in weeks.', { build: 0.15 }],
  ['highrise', 'High-rise housing', 'build', 9, 2500, ['skyscrapers'], 'Whole districts stacked into towers: the first super habitations.', { build: 0.15 }],
  ['highways', 'Highways', 'build', 9, 2400, ['engines', 'concrete'], 'Wide roads for engines: goods and people move fast.', { trade: 0.1, work: 0.08 }],
  ['television', 'Television', 'mind', 9, 2300, ['radio'], 'Pictures in every home: news, learning and a shared culture.', { learn: 0.1, mood: 0.03 }],
  ['immunisation', 'Mass immunisation', 'health', 9, 2400, ['antibiotics'], 'Whole populations protected: old killers become rare.', { health: 0.25 }],
  ['modernmed', 'Modern hospitals', 'health', 9, 2500, ['antibiotics', 'welfare'], 'Surgeons, wards and intensive care: more lives saved.', { health: 0.2 }],
  ['deepsea', 'Deep-sea science', 'sea', 9, 2500, ['sonar'], 'Submersibles and trawlers reach the deep: new fisheries and finds.', { sea: 0.2 }, 'explore'],
  ['rights', 'Human rights', 'law', 9, 2300, ['welfare', 'pubschools'], 'Everyone counts before the law: a fairer, calmer society.', { mood: 0.06 }],
  ['ecology', 'Ecology and conservation', 'mind', 9, 2300, ['sanitation', 'television'], 'Forests, fish and soil are seen as capital to keep: nature recovers faster.', { mood: 0.03, health: 0.05 }],
  // ---- Information Age (v0.39)
  ['internet', 'The internet', 'mind', 10, 3000, ['transistors', 'television'], 'Every machine linked: knowledge, trade and gossip at the speed of light.', { learn: 0.3, trade: 0.1 }],
  ['pcs', 'Personal computers', 'craft', 10, 2900, ['transistors'], 'A computer on every desk: work and learning speed up.', { work: 0.15, learn: 0.1 }],
  ['mobile', 'Mobile phones', 'mind', 10, 2800, ['transistors', 'radio'], 'A phone in every pocket: nobody is out of reach.', { trade: 0.1, mood: 0.02 }],
  ['satellites', 'Satellites', 'sea', 10, 3100, ['rocketry', 'transistors'], 'Eyes and relays in orbit: weather, maps and signals from the sky.', { sea: 0.1, learn: 0.1 }, 'explore'],
  ['satnav', 'Satellite navigation', 'sea', 10, 3000, ['satellites'], 'Every ship, truck and plane knows exactly where it is.', { sea: 0.15, trade: 0.05 }],
  ['robotics', 'Robotics', 'craft', 10, 3200, ['pcs', 'massprod'], 'Tireless arms and machines do the dull and dangerous work.', { work: 0.25 }],
  ['renewables', 'Solar and wind power', 'craft', 10, 3000, ['pcs', 'fission'], 'Power from sun and wind: clean, endless and cheap.', { work: 0.1, mood: 0.02 }],
  ['fusion', 'Fusion power', 'craft', 10, 3900, ['fission', 'robotics', 'renewables'], 'A small sun in a bottle: almost limitless power.', { work: 0.25 }],
  ['automation', 'Automated farming', 'food', 10, 3100, ['robotics', 'greenrev'], 'Driverless tractors and drones tend every field: a few farmers feed a city.', { farm: 0.6 }],
  ['geneeng', 'Genetic engineering', 'food', 10, 3200, ['greenrev', 'pcs'], 'Crops designed to yield and endure: harvests beyond any earlier age.', { farm: 0.6 }],
  ['vertical', 'Vertical farms', 'food', 10, 3500, ['automation', 'geneeng', 'renewables'], 'Towers of crops under lamps: food grown in the city itself.', { farm: 0.8 }],
  ['biotech', 'Biotechnology', 'health', 10, 3300, ['geneeng', 'modernmed'], 'Designed medicines and gene therapy: many diseases end.', { health: 0.3 }],
  ['telemed', 'Telemedicine', 'health', 10, 2900, ['internet', 'modernmed'], 'A doctor on every screen: care reaches everyone.', { health: 0.15 }],
  ['smartcity', 'Smart city systems', 'build', 10, 3200, ['internet', 'highrise'], 'Sensors steer traffic, power and water: cities run themselves.', { build: 0.15, mood: 0.03 }],
  ['arcology', 'Arcologies', 'build', 10, 3600, ['highrise', 'robotics', 'renewables'], 'Cities in a single structure: homes, farms, work and parks stacked into one.', { build: 0.25 }],
  ['ecommerce', 'Online commerce', 'sea', 10, 2900, ['internet'], 'Shops without walls: trade across the world from a screen.', { trade: 0.3 }],
  ['drones', 'Drones and cyber defence', 'war', 10, 3200, ['robotics', 'satellites'], 'Unmanned craft and guarded networks: defence without crowds of soldiers.', { defence: 0.25 }, 'war'],
  ['spaceflight', 'Spaceflight', 'war', 10, 3700, ['rocketry', 'satellites', 'robotics'], 'Crews and cargo reach orbit: the start of the space race.', { defence: 0.05 }, 'explore'],
  ['digigov', 'Digital governance', 'law', 10, 2900, ['internet', 'welfare'], 'Services and votes online: government closer to its people.', { learn: 0.1, mood: 0.03 }]
];
const TECHS = {}, AGE_COUNT = new Array(AGES.length).fill(0), TECH_BY_BRANCH = {}, LADDERS = {};
const COST_SCALE = [1, 1, 1.1, 1.4, 2, 2.8, 3.6, 4.6, 5.8, 7.0, 8.2], ORIGINAL = new Set(['nets', 'tools', 'granary', 'carpentry', 'forestry', 'mining', 'lodges', 'trade', 'coinage', 'seatrade', 'boats', 'rotation', 'masonry', 'medicine', 'watchtowers', 'ironwork', 'plow', 'navigation']);       // later ages cost more, tuned by tools/pace.js so ages last about a decade each
for (const [id, name, branch, age, cost0, req, desc, fx, ladder] of TECH_ROWS) {
  const cost = ORIGINAL.has(id) ? cost0 : Math.round(cost0 * COST_SCALE[age] / 5) * 5;
  TECHS[id] = { name, branch, age, tier: age === 0 ? 1 : age === 1 ? 2 : 3, cost, req, desc, fx: fx || {}, ladder: ladder || null };
  AGE_COUNT[age]++; (TECH_BY_BRANCH[branch] || (TECH_BY_BRANCH[branch] = [])).push(id); if (ladder) (LADDERS[ladder] || (LADDERS[ladder] = [])).push(id);
}
const AGE_NEED = AGE_COUNT.map(n => Math.ceil(n * 0.65));          // technologies of an age that must be known before the next age begins
const ERAS = AGES;

const BRANCH_FOCUS = { craft: 'enterprise', sea: 'enterprise', war: 'safety', health: 'safety', food: 'community', build: 'community', law: 'community', mind: 'knowledge' };
for (const id in TECHS) if (typeof TECH_FOCUS === 'object' && !TECH_FOCUS[id]) TECH_FOCUS[id] = BRANCH_FOCUS[TECHS[id].branch];
