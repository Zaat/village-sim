'use strict';
/* ==========================================================================
   voices.js — what villagers think, dream of and say to each other.
   Thoughts are chosen from the villager's real state (needs, mood, work, family, news,
   rumours, plans, dreams). Choosing consumes NO random numbers (it hashes the villager
   and the time slot), so the village runs exactly as it did without it. Every thought
   comes in three sizes: a full line (1x and below), a few words (3x) and a glyph.
   The display (bubbles, inspector, summaries) lives in render.js and ui.js.
   ========================================================================== */
const VOICE_PERIOD = 400;                                   // ticks between one villager's thoughts (20 s at 1x)
const VOICE_LIFE = 260;                                     // ticks a thought stays "current" for the inspector
const SEASON_LOW = ['spring', 'summer', 'autumn', 'winter'];
const SITE_WORDS = { ruin: 'ruins of an older people', cave: 'a deep cave', outcrop: 'an outcrop of dark stone', hoard: 'a buried hoard', oldpost: 'an abandoned post', wreck: 'a sunken wreck', ownwreck: 'our lost ship', shoals: 'rich fishing grounds', whales: 'whaling grounds', deepwreck: 'a wreck in the deep', seabed: 'something on the sea bed', lostcity: 'a lost city', lowwater: 'a hoard in the shrunken water' };
const ROLE_LINES = {
  farmer: [['The soil is good this year. The seed will take.', 'Fields', '♪'], ['Weeds again. They never stop coming.', 'Weeds', '…'], ['A good harvest would feed us all winter.', 'Harvest', '♪']],
  fisher: [['The water is calm. The fish should be biting.', 'Fish', '~'], ['I know every shoal along this shore.', 'Shoals', '~'], ['One more cast, then home.', 'Cast', '~']],
  hunter: [['Fresh tracks by the ridge. Deer, I think.', 'Tracks', '!'], ['Quiet steps. The wind is in my favour.', 'Quiet', '…'], ['Wolves left their mark here. Careful.', 'Wolves', '!']],
  woodcutter: [['Good oaks here, straight and tall.', 'Timber', '♪'], ['Every tree felled is a house or a fire.', 'Timber', '♪'], ['My axe wants sharpening again.', 'Axe', '…']],
  miner: [['The rock rings true. There is good stone here.', 'Stone', '♪'], ['Dust in my lungs, but the walls need stone.', 'Dust', '…'], ['I wonder what lies deeper in the hill.', 'Deeper', '?']],
  builder: [['Measure twice, cut once. The walls must stand.', 'Build', '♪'], ['A roof over everyone, that is the goal.', 'Roofs', '♪'], ['Nails and timber, never enough of either.', 'Timber', '…']],
};
const PLAN_LINES = {
  family: [['I hope to start a family of my own one day.', 'A family', '♥']],
  belong: [['I want to belong to a circle I can trust.', 'Belong', '♥']],
  know: [['There is so much I still want to learn.', 'Learn', '?']],
  lead: [['Perhaps I could lead this village one day.', 'Lead', '!']],
  fame: [['I want my name remembered after I am gone.', 'Fame', '!']],
};
const MASTER_WORD = { wood: 'woodcutter', stone: 'stonecutter', farm: 'farmer', build: 'builder', hunt: 'hunter', fish: 'fisher' };

const foodPer = w => (w.stock && w.stock.food || 0) / Math.max(1, w.vills.length);
const lc = s => String(s || '').toLowerCase();
const cap1 = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/* ---- categories: score(w, v, c) says how much it is on the villager's mind (0 = not at all),
   lines(w, v, c) offers [long, short, glyph] choices. c = shared context for this thought. ---- */
const VCATS = [
  { id: 'hunger', label: 'hunger', sc: (w, v) => v.hunger < 22 ? 16 : v.hunger < 40 ? 3.5 : 0, lines: () => [['My stomach is growling. Is anything left in the stores?', 'Hungry', '?'], ['I could eat a whole loaf right now.', 'Starving', '?'], ['Surely somebody has food to spare.', 'Food?', '?']] },
  { id: 'tired', label: 'weariness', sc: (w, v) => v.energy < 18 ? 6 : v.energy < 32 ? 2 : 0, lines: () => [['My legs feel like stone. I need my bed.', 'Tired', 'z'], ['Just a little rest, then I will go on.', 'Rest', 'z']] },
  { id: 'lonely', label: 'loneliness', sc: (w, v) => v.social < 18 ? 4.5 : v.social < 30 ? 1.5 : 0, lines: () => [['I have hardly spoken to anyone today.', 'Lonely', '…'], ['It would be good to sit by the fire with company.', 'Company?', '…']] },
  { id: 'sick', label: 'illness', sc: (w, v) => v.health < 45 ? 8 : v.health < 70 ? 2.5 : 0, lines: () => [['I do not feel well at all.', 'Unwell', '!'], ['Everything aches. I hope it passes.', 'Aches', '…']] },
  { id: 'cold', label: 'the cold', sc: (w, v) => w.cold ? (v.home == null ? 4 : 1.5) : 0, lines: () => [['The cold bites through my coat.', 'Brr', '*'], ['I would give anything for a warm hearth.', 'Cold', '*']] },
  { id: 'home', label: 'having no home', sc: (w, v, c) => c.adult && v.home == null ? 3.5 : 0, lines: () => [['I still have no roof of my own.', 'No home', '?'], ['Surely there is a bed somewhere for me.', 'A bed?', '?']] },
  { id: 'quiet', label: 'wanting privacy', sc: (w, v, c) => c.adult && c.crowded ? 3 : 0, lines: () => [['I long for a quiet corner of my own.', 'Quiet', '…'], ['Too many people under one roof.', 'Crowded', '…']] },
  { id: 'happy', label: 'contentment', sc: (w, v) => v.mood > 78 ? 2.5 : 0, lines: () => [['It is good to be alive on a day like this.', 'Content', '♪'], ['Things are going well for us.', 'Good', '♪']] },
  { id: 'low', label: 'low spirits', sc: (w, v) => v.mood < 32 ? 5 : v.mood < 45 ? 1.5 : 0, lines: () => [['Nothing seems to go right lately.', 'Gloomy', '…'], ['What is the point of all this toil?', 'Why?', '…']] },
  { id: 'work', label: 'daily work', sc: (w, v, c) => c.adult && (v.role || v.trade || v.side) ? 3 : 0,
    lines: (w, v, c) => { const o = ROLE_LINES[v.role] ? ROLE_LINES[v.role].slice() : [], t = v.trade || v.side; if (t && typeof TRADES !== 'undefined' && TRADES[t]) { const n = lc(TRADES[t].name); o.push([`Another day at the ${n}'s work.`, cap1(n), '♪'], [`A ${n} is never short of something to do.`, cap1(n), '♪']) } return o } },
  { id: 'play', label: 'play and lessons', sc: (w, v, c) => c.young ? 14 : 0, lines: () => [['Can we play by the water?', 'Play!', '♪'], ['I want to explore past the trees.', 'Explore', '!'], ['Why is the sky blue?', 'Why?', '?'], ['Look what I found!', 'Look!', '!'], ['When I grow up I will be brave.', 'Brave', '♪']] },
  { id: 'partner', label: 'loved ones', sc: (w, v, c) => c.mate ? 1.6 : 0, lines: (w, v, c) => [[`I am lucky to have ${c.mate.name} by my side.`, c.mate.name, '♥'], [`I wonder what ${c.mate.name} is doing now.`, c.mate.name + '?', '♥']] },
  { id: 'kids', label: 'the children', sc: (w, v, c) => c.kid ? 1.8 : 0, lines: (w, v, c) => [[`${c.kid.name} is growing so fast.`, c.kid.name, '♥'], [`I want a better village for ${c.kid.name} to inherit.`, 'Our child', '♥']] },
  { id: 'baby', label: 'a coming baby', sc: (w, v) => v.preg > 0 ? 8 : 0, lines: () => [['A little one is on the way. Let it be healthy.', 'Baby', '♥'], ['Soon there will be another voice in the house.', 'Baby', '♥']] },
  { id: 'grief', label: 'grief', sc: (w, v) => v.mournUntil > w.tick ? 14 : 0, lines: () => [['I miss them so much. The house is so quiet.', 'Grief', '…'], ['I keep expecting to hear their step.', 'Missing', '…']] },
  { id: 'single', label: 'finding someone', sc: (w, v, c) => c.adult && v.partner == null ? 1.2 : 0, lines: () => [['Perhaps one day I will find someone.', 'Someone', '♥'], ['Everyone around me seems to be paired.', 'Alone', '…']] },
  { id: 'season', label: 'the season', sc: () => 1.5, lines: (w) => [[({ 0: 'Seedtime already. The days grow longer.', 1: 'Long warm days. So much to do.', 2: 'The leaves turn. We must lay in stores before the snow.', 3: 'Snow on the roofs. Keep the fires going.' })[w.season], cap1(SEASON_LOW[w.season]), w.season === 3 ? '*' : '☼']] },
  { id: 'winter', label: 'the winter stores', sc: (w, v, c) => c.adult && (w.season === 2 || w.season === 3) && c.food < 3.5 ? 5 : 0, lines: (w, v, c) => [[c.food < 1.5 ? 'The stores are almost empty. How will we last the winter?' : 'The stores look thin for the winter. We must ration.', 'Winter', '!'], ['Every loaf counts now.', 'Stores', '!']] },
  { id: 'drought', label: 'the drought', sc: (w, v, c) => c.adult && w.drought ? 4.5 : 0, lines: () => [['No rain for days. The crops will wither.', 'Drought', '!'], ['The wells are low. I fear for the harvest.', 'Dry', '!']] },
  { id: 'harsh', label: 'the harsh winter', sc: (w, v, c) => c.adult && w.harsh ? 4.5 : 0, lines: () => [['This winter is harsher than any I remember.', 'Harsh', '*'], ['The wind never stops howling.', 'Wind', '*']] },
  { id: 'feast', label: 'the festival', sc: w => w.festival || w.holiday ? 5 : 0, lines: w => [[`The ${w.holiday || 'feast'}! I hope there will be music.`, 'Feast!', '♪'], ['A day without work. We have earned it.', 'Holiday', '♪']] },
  { id: 'news', label: 'the latest discovery', sc: (w, v, c) => c.adult && c.tech ? 4 : 0, lines: (w, v, c) => [[`Have you heard? We have learned ${lc(c.tech)}.`, cap1(lc(c.tech)).slice(0, 14), '!'], [`${cap1(lc(c.tech))}. Everything may change now.`, 'New craft', '!']] },
  { id: 'exped', label: 'the expedition', sc: (w, v, c) => c.adult && c.exped ? 3 : 0, lines: (w, v, c) => c.exped.back ? [[`${c.exped.name} is back from the expedition. What tales!`, 'Tales!', '!'], ['They say the journey found something worth the trouble.', 'Finds', '!']] : [[`${c.exped.name} has set out on a long journey. May they return safely.`, 'Journey', '?'], ['I wonder what the party will find out there.', 'Out there', '?']] },
  { id: 'concern', label: 'the village troubles', sc: (w, v, c) => c.adult && c.concern ? 3.5 : 0, lines: (w, v, c) => [[`I keep hearing about it: ${lc(c.concern)}. I am worried.`, 'Trouble', '!'], ['Somebody should do something about it.', 'Worried', '!']] },
  { id: 'finds', label: 'the new finds', sc: (w, v, c) => c.adult && (c.mat || c.strange) ? 3.5 : 0, lines: (w, v, c) => c.mat ? [[`They found a source of ${c.mat}. That could change a great deal.`, 'New ' + c.mat, '!'], [`${cap1(c.mat)}! If only we knew how to use it.`, cap1(c.mat) + '!', '!']] : [['Strange stone, they say, and nobody can name it yet.', 'Strange stone', '?'], ['Perhaps we will understand that stone one day.', 'Stone?', '?']] },
  { id: 'council', label: 'the council', sc: (w, v, c) => c.adult && c.decision ? 2 : 0, lines: (w, v, c) => [[`Word from the council: ${c.decision}.`, 'Council', '…'], ['I wonder if the council knows what it is doing.', 'Council', '?']] },
  { id: 'rumour', label: 'rumours of far places', sc: (w, v, c) => c.adult && c.site ? 1.6 : 0, lines: (w, v, c) => [[`They say there is ${c.site} out there. Worth a journey?`, 'Rumours', '?'], [`Somebody spoke of ${c.site}.`, 'Rumours', '?']] },
  { id: 'plan', label: 'dreams for the future', sc: (w, v, c) => c.adult && v.desire ? 2.2 : 0,
    lines: (w, v) => { const d = v.desire; if (!d) return []; if (d.kind === 'master') { const j = MASTER_WORD[d.key] || 'craftsman'; return [[`One day I will be the finest ${j} in the village.`, 'Master', '!']] } return PLAN_LINES[d.kind] || [] } },
  { id: 'feud', label: 'quarrels', sc: (w, v) => v.enemies > 0 ? 1.5 + Math.min(3, v.enemies) : 0, lines: () => [['There are people here I simply cannot stand.', 'Grr', '!'], ['Some folk never forget an old quarrel.', 'Grudge', '!']] },
  { id: 'friends', label: 'friendship', sc: (w, v) => v.friends >= 3 ? 1.8 : 0, lines: () => [['I am grateful for my friends.', 'Friends', '♥'], ['Good company makes the hardest day easy.', 'Friends', '♥']] },
  { id: 'coins', label: 'money', sc: (w, v, c) => c.adult && w.has && w.has('coinage') ? ((v.coins || 0) < 6 ? 2.4 : (v.coins || 0) > 60 ? 2 : 0) : 0, lines: (w, v) => (v.coins || 0) < 6 ? [['Coins are scarce this month.', 'Coins', '$'], ['How will I pay my way?', 'Pay?', '$']] : [['A few more coins and I could buy something fine.', 'Coins', '$']] },
  { id: 'elder', label: 'old days', sc: (w, v, c) => c.elder ? 2.5 : 0, lines: w => [['In my day the village was half this size.', 'Old days', '…'], ['I have seen many winters. Each one is a gift.', 'Winters', '…'], [w.vills.length > 60 ? 'So many new faces. I hardly know them all.' : 'The young ones will carry things on.', 'Old days', '…']] },
];
const VCAT = {}; for (const c of VCATS) VCAT[c.id] = c;
const WORRY = new Set(['hunger', 'tired', 'lonely', 'sick', 'cold', 'home', 'low', 'grief', 'winter', 'drought', 'harsh', 'concern', 'feud', 'quiet']);

function voiceCtx(w, v) {
  const st = v.stage(), c = { st, adult: st === 'adult' || st === 'elder', elder: st === 'elder', young: st === 'child' || st === 'youth', food: foodPer(w) };
  c.mate = v.partner != null ? vById(w, v.partner) : null; c.kid = v.kids && v.kids.length ? vById(w, v.kids[(hash2(v.id, w.day >> 3)) % v.kids.length]) : null;
  const h = v.home != null ? w.buildings.get(v.home) : null; c.crowded = !!(h && h.occ && typeof bedsOf === 'function' && h.occ.length >= bedsOf(h) && privOf(v) > 0.55);
  const T = w.tech; if (T && T.log && T.log[0] && w.day - T.log[0].day <= 3 && typeof TECHS !== 'undefined' && TECHS[T.log[0].id]) c.tech = TECHS[T.log[0].id].name;
  const D = w.disc; if (D) {
    const ex = D.exped.find(e => e.state === 'running' || e.state === 'out'), ld = ex ? vById(w, ex.leader) : null; if (ex && ld) c.exped = { name: ld.name, back: false };
    else if (D.log[0] && w.day - D.log[0].day <= 3) { const m = /^([A-Z][a-z]+(?: \d+)?) returns/.exec(D.log[0].text); if (m) c.exped = { name: m[1], back: true } }
    if (D.log[0] && w.day - D.log[0].day <= 6) { const m = /source of (\w+)/.exec(D.log[0].text); if (m) c.mat = m[1]; else if (/nobody can name/.test(D.log[0].text)) c.strange = true }
    const known = D.sites.filter(s => s.known && !s.done && !s.unnamed); if (known.length) c.site = SITE_WORDS[known[hash2(v.id, w.day >> 4) % known.length].kind] || 'a place worth a journey';
  }
  const C = w.concerns; if (C && C.list.length) c.concern = lc(C.list[0].title);
  const g = w.gov && w.gov.decisions && w.gov.decisions[0]; if (g && w.day - g.day <= 4) c.decision = String(g.text).replace(/\.+$/, '').slice(0, 60);
  return c;
}

/* the thought a villager has in time slot `slot` (pure: the same state and slot give the same thought) */
function thinkOf(w, v, slot) {
  const h = hash2(v.id * 31 + 7, slot | 0), c = voiceCtx(w, v);
  if (v.sleeping) return dreamOf(w, v, c, h);
  if (v.age < CFG.INFANT_DAYS) return null;
  let tot = 0; const sc = [];
  for (const k of VCATS) { const s = k.sc(w, v, c); if (s > 0) { sc.push([k, s]); tot += s } }
  if (!sc.length) return null;
  let r = ((h >>> 3) % 10007) / 10007 * tot, pick = sc[0][0];
  for (const [k, s] of sc) { r -= s; if (r <= 0) { pick = k; break } }
  const L = pick.lines(w, v, c); if (!L.length) return null;
  const l = L[(h >>> 11) % L.length];
  return { cat: pick.id, kind: 'thought', long: l[0], short: String(l[1]).slice(0, 14), emo: l[2], tick: w.tick, at: w.tick };
}
function dreamOf(w, v, c, h) {
  const o = [['I dream of green fields and endless summer.', 'Fields', 'z'], ['I dream I am flying over the village.', 'Flying', 'z'], ['I dream of the sea and distant sails.', 'The sea', 'z']];
  if (v.hunger < 40) o.push(['I dream of a great feast, but I cannot taste it.', 'Feast', 'z'], ['Bread, hot from the oven. Then I wake.', 'Bread', 'z']);
  if (c.mate) o.push([`I dream of ${c.mate.name} laughing.`, c.mate.name, 'z']);
  if (v.mournUntil > w.tick) o.push(['I dream the one I lost is still here.', 'Lost', 'z']);
  if (c.exped) o.push(['I dream of strange stones in a far country.', 'Far lands', 'z']);
  if (v.desire && v.desire.kind === 'fame') o.push(['A crowd chants my name in the square.', 'Fame', 'z']);
  if (v.desire && v.desire.kind === 'know') o.push(['I dream of a hall of endless scrolls.', 'Scrolls', 'z']);
  if (v.desire && v.desire.kind === 'master') o.push(['I dream of work so fine that nobody could fault it.', 'Mastery', 'z']);
  if (w.cold) o.push(['I dream of a warm summer meadow.', 'Summer', 'z']);
  if (c.young) o.push(['I dream I can fly with the birds.', 'Flying', 'z']);
  const l = o[(h >>> 7) % o.length];
  return { cat: 'dream', kind: 'dream', long: l[0], short: String(l[1]).slice(0, 14), emo: 'z', tick: w.tick, at: w.tick };
}

/* ---- a chat between two villagers: topic from what they actually share ---- */
function chatTopicLines(w, a, b, h) {
  const rel = w.rel.get(w.relKey(a, b)) || 0, T = [], fp = foodPer(w), ca = voiceCtx(w, a);
  if (rel < -30) return [['Hm. You again.', 'You again', '!'], ['I have nothing to say to you.', 'Nothing', '!']];
  if (a.hunger < 30 || fp < 2.5) T.push([['Is there enough grain in the stores?', 'Enough grain?', '?'], fp < 2.5 ? ['Barely. We will have to be careful.', 'Barely', '!'] : ['We will manage, I think.', 'We will', '♪']]);
  T.push([[`Fine ${w.cold ? 'cold' : w.drought ? 'dry' : SEASON_LOW[w.season]} weather, is it not?`, 'Weather', '☼'], [w.cold ? 'Bitter. Keep warm.' : w.drought ? 'We need rain badly.' : 'It is, and long may it last.', 'Indeed', '♪']]);
  if (b.role || a.role) T.push([[`How goes the ${b.role || 'work'}?`, 'How is work?', '?'], ['Hard, but honest. Can not complain.', 'Hard work', '♪']]);
  if (b.partner != null) { const m = vById(w, b.partner); if (m) T.push([[`How is ${m.name}?`, m.name + '?', '♥'], ['Well, thank you for asking.', 'Well', '♥']]) }
  if (b.kids && b.kids.length) { const k = vById(w, b.kids[0]); if (k) T.push([[`${k.name} has grown!`, k.name + '!', '♥'], ['Hasn\'t she? Time flies.', 'Time flies', '♥']]) }
  if (ca.tech) T.push([[`Did you hear about ${lc(ca.tech)}?`, 'News?', '!'], ['I did. Interesting times.', 'Indeed', '!']]);
  if (ca.exped) T.push([[ca.exped.back ? `${ca.exped.name} is back!` : `Any word from ${ca.exped.name}?`, 'Any word?', '?'], [ca.exped.back ? 'And with tales to tell.' : 'Not yet. We wait.', 'Wait', '…']]);
  if (w.festival || w.holiday) T.push([['Will you come to the feast?', 'Feast?', '♪'], ['Wouldn\'t miss it.', 'Of course', '♪']]);
  let issue = null, dd = 0; for (const k of ISSUES) { const d = Math.abs(a.op[k] - b.op[k]); if (d > dd) { dd = d; issue = k } }
  if (issue && dd > 0.5) { const same = a.op[issue] * b.op[issue] > 0; T.push([[`I keep wondering ${ISSUE_TXT[issue].q}.`, ISSUE_TXT[issue].name, '?'], same ? ['I think the same.', 'Agreed', '♪'] : ['I see it very differently.', 'Not so', '!']]) }
  if (rel > 40) T.push([['It is good to see you.', 'Friend!', '♥'], ['And you, my friend.', 'Friend!', '♥']]);
  return T[(h >>> 5) % T.length];
}
/* called when two villagers start talking: the first speaks now, the other answers a moment later */
function voiceChat(w, a, b) {
  if (!w.voices || a.age < CFG.CHILD_DAYS || b.age < CFG.CHILD_DAYS) return;
  const h = hash2(a.id * 977 + b.id, w.tick >> 3), pair = chatTopicLines(w, a, b, h); if (!pair) return;
  const mk = (l, at) => ({ cat: 'talk', kind: 'say', long: l[0], short: l[1], emo: l[2], tick: at, at, to: null });
  a.th = mk(pair[0], w.tick); a.th.to = b.id; b.th = mk(pair[1], w.tick + 24); b.th.to = a.id;
  voiceKeep(w, a, a.th); voiceKeep(w, b, b.th); w.voices.talks++;
  if ((w.rel.get(w.relKey(a, b)) || 0) < -30) w.voices.hot++;
}

/* ---- bookkeeping ---- */
function initVoices(w) { w.voices = { tally: {}, talks: 0, hot: 0, ex: {}, sum: [], worry: 0, n: 0 } }
function voiceKeep(w, v, th) {
  const V = w.voices; if (!th) return;
  (v.thh || (v.thh = [])).unshift(th); if (v.thh.length > 8) v.thh.pop();
  V.tally[th.cat] = (V.tally[th.cat] || 0) + 1; V.n++;
  if (!V.ex[th.cat] && th.cat !== 'work' && th.cat !== 'talk') V.ex[th.cat] = { name: v.name, text: th.long };
}
function voicesTick(w) {
  if (!w.voices) initVoices(w);
  const per = VOICE_PERIOD / 20, slot = (w.tick / VOICE_PERIOD) | 0;
  for (const v of w.vills) {
    if (!v.alive || ((w.tick / 20 + v.id) % per) !== 0) continue;
    if (v.th && v.th.kind === 'say' && w.tick - v.th.at < 60) continue;       // still mid-conversation
    const th = thinkOf(w, v, slot); if (th) { v.th = th; voiceKeep(w, v, th) }
  }
}
function voicesDay(w) {
  if (!w.voices) initVoices(w);
  const V = w.voices, ent = Object.entries(V.tally).filter(([k]) => k !== 'talk').sort((a, b) => b[1] - a[1]);
  if (V.n) {
    const worry = ent.reduce((s, [k, n]) => s + (WORRY.has(k) ? n : 0), 0), top = ent.filter(([k]) => k !== 'dream').slice(0, 3), tot = Math.max(1, V.n - (V.tally.talk || 0));
    const phrase = top.map(([k, n]) => `${(VCAT[k] || { label: k }).label} (${Math.round(100 * n / tot)}%)`);
    const lead = top.find(([k]) => V.ex[k] && k !== 'work' && k !== 'season'), q = lead ? V.ex[lead[0]] : null;
    let text = `The talk of the village: ${phrase.length > 1 ? phrase.slice(0, -1).join(', ') + ' and ' + phrase[phrase.length - 1] : phrase[0] || 'daily work'}.`;
    if (V.talks) text += ` ${V.talks} conversation${V.talks > 1 ? 's' : ''}${V.hot ? `, ${V.hot} of them cold or bitter` : ''}.`;
    if (q) text += ` ${q.name}: “${q.text}”`;
    V.sum.unshift({ day: w.day - 1, text, t: V.tally, talks: V.talks, hot: V.hot, n: V.n, worry: Math.round(100 * worry / tot) });
    V.worry = Math.round(100 * worry / tot); if (V.sum.length > 48) V.sum.pop();
  }
  V.chats = V.talks; V.tally = {}; V.talks = 0; V.hot = 0; V.ex = {}; V.n = 0;
}
/* several days of summaries merged for fast speeds: counts add up, one line */
function voiceDigest(w, days) {
  const S = (w.voices ? w.voices.sum : []).filter(s => s.day >= w.day - days), t = {}; let talks = 0, hot = 0;
  for (const s of S) { talks += s.talks || 0; hot += s.hot || 0; for (const k in s.t) if (k !== 'talk') t[k] = (t[k] || 0) + s.t[k] }
  const ent = Object.entries(t).filter(([k]) => k !== 'dream').sort((a, b) => b[1] - a[1]).slice(0, 4), tot = Math.max(1, Object.entries(t).reduce((s, [k, n]) => s + n, 0));
  if (!ent.length) return null;
  return { days: S.length, talks, hot, top: ent.map(([k, n]) => `${(VCAT[k] || { label: k }).label} ${Math.round(100 * n / tot)}%`) };
}
