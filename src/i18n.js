/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
/* v0.39 language layer. English text is the key: i18n('Save now') returns the Spanish line when Spanish is on and the English text when
   a line is missing, so an untranslated string never breaks anything. Pure data and functions (no DOM here; the browser side is at the
   end of ui.js). New text from v0.39 on is written through i18n() and gets its Spanish line in ES below.
   Arguments: i18n('{n} villagers', { n: 5 }). Plurals: i18nPlural(n, 'villager', 'villagers'). */
const I18N = {
  lang: 'en', key: 'villagesim.lang', langs: { en: 'English', es: 'Español' },
  ES: {
    // control bar and speeds
    'Concerns': 'Preocupaciones', 'Close': 'Cerrar', 'Max': 'Máx.', 'Follow': 'Seguir', 'Settings': 'Ajustes', 'Watch': 'Observar', 'Play': 'Jugar',
    'Pause / play (Space)': 'Pausa / reanudar (Espacio)', 'Slower ( [ )': 'Más lento ( [ )', 'Faster ( ] )': 'Más rápido ( ] )', 'Simulation speed': 'Velocidad de la simulación',
    'As fast as your machine can go': 'Lo más rápido que da tu equipo', 'Advance one day ( . ) · hold Shift for one season': 'Avanzar un día ( . ) · con Mayús, una estación',
    'Music is off (M)': 'La música está apagada (M)', 'Menu: new world, save, settings, how to play, about': 'Menú: mundo nuevo, guardar, ajustes, cómo jugar, acerca de',
    'Follow selected (F)': 'Seguir al seleccionado (F)', 'Settings, saving, Claude counsel and diagnostics (G)': 'Ajustes, guardado, consejo de Claude y diagnóstico (G)',
    'Watch the village live its life, or Play and take the lead': 'Observa cómo vive la aldea, o juega y toma el mando',
    'Zoom in (+)': 'Acercar (+)', 'Zoom out (−)': 'Alejar (−)', 'Close (Esc)': 'Cerrar (Esc)',
    // music
    'No track yet': 'Aún no hay pista', 'Turn on': 'Activar', 'Skip': 'Saltar', 'Like': 'Me gusta', 'Dislike': 'No me gusta', 'Volume': 'Volumen',
    'Next track': 'Siguiente pista', 'I like this one': 'Me gusta esta', 'Not for me': 'No es para mí',
    'Made in your browser as you play. Press M to turn it on or off.': 'Se genera en tu navegador mientras juegas. Pulsa M para activarla o apagarla.',
    // play tools
    'Select': 'Seleccionar', 'Build': 'Construir', 'Road': 'Camino', 'Zone': 'Zona', 'Research': 'Investigar', 'Crowd': 'Multitud', 'Village plans': 'Planes de la aldea',
    'Buildings': 'Edificios', 'Jobs': 'Oficios', 'Cancel': 'Cancelar', 'Select and inspect (V)': 'Seleccionar e inspeccionar (V)', 'Place buildings (B)': 'Colocar edificios (B)',
    'Lay roads (R)': 'Trazar caminos (R)', 'Paint zones for the village to build in (Z)': 'Pintar zonas donde la aldea construirá (Z)',
    'Choose what the village studies': 'Elige qué estudia la aldea', 'Build here': 'Construir aquí',
    // settings drawer
    'Settings & tools': 'Ajustes y herramientas', 'Hardship': 'Dificultad', 'how forgiving the world is: births, newcomers, wolves, fevers, winters': 'cuán indulgente es el mundo: nacimientos, recién llegados, lobos, fiebres, inviernos',
    'Gentle': 'Suave', 'Normal': 'Normal', 'Harsh': 'Dura', 'Philosophy': 'Filosofía', 'what the village tends to study first': 'qué tiende a estudiar primero la aldea',
    'Open knowledge': 'Conocimiento abierto', 'Off': 'No', 'Relaxed': 'Relajado', 'Unlimited': 'Ilimitado', 'Survival mode': 'Modo supervivencia', 'harsher food, cold, wolves, fever': 'comida, frío, lobos y fiebres más duros',
    'Disasters': 'Desastres', 'fire, storms, drought, fever, harsh winter': 'incendio, tormentas, sequía, fiebre, invierno crudo', 'Raids and war': 'Asaltos y guerra', 'Crime and conflict': 'Delitos y conflictos', 'theft, brawls, trials': 'robos, peleas, juicios',
    'Concern alerts': 'Alertas de preocupaciones', 'Only show the badge and toast': 'Solo mostrar la insignia y el aviso', 'Pause the game': 'Pausar el juego', 'Slow the game to 1×': 'Bajar el juego a 1×',
    'Toasts for critical concerns': 'Avisos para preocupaciones críticas', 'stay until dismissed': 'permanecen hasta cerrarlos', 'Save & load': 'Guardar y cargar', 'Nothing saved yet.': 'Aún no hay nada guardado.',
    'Save now': 'Guardar ahora', 'Saves…': 'Guardados…', 'Load saved': 'Cargar guardado', 'Export file': 'Exportar archivo', 'Import file': 'Importar archivo', 'Resume automatically': 'Reanudar automáticamente', 'when the page opens': 'al abrir la página',
    'Thought bubbles': 'Globos de pensamiento', 'speech, thoughts and dreams above villagers': 'habla, pensamientos y sueños sobre los aldeanos', 'Autosave': 'Autoguardado', 'every minute, in this browser': 'cada minuto, en este navegador',
    'Claude counsel': 'Consejo de Claude', 'optional': 'opcional', 'Diagnostics': 'Diagnóstico', 'Copy report': 'Copiar informe', 'Download report': 'Descargar informe', 'Self-check & repair': 'Autocomprobación y reparación', 'Clear timings': 'Borrar tiempos',
    'Copy diagnostics': 'Copiar diagnóstico', 'Time travel': 'Viaje en el tiempo', 'One season': 'Una estación', 'One year': 'Un año', 'Two years': 'Dos años', 'Five years': 'Cinco años', 'Ten years (slow)': 'Diez años (lento)', 'Fast-forward': 'Avance rápido', 'Stop': 'Detener', 'Ready.': 'Listo.',
    'much harder': 'mucho más difícil', 'harder': 'más difícil', 'harder later': 'más difícil después', 'a little harder': 'algo más difícil',
    'harsher food, cold, wolves, fever; a small village can die out': 'comida, frío, lobos y fiebres más duros; una aldea pequeña puede extinguirse',
    'Survival mode is on: growth is much slower and a small village can die out. Keep food, homes and defence ahead of the seasons; the Concerns tab warns before it gets critical.': 'El modo supervivencia está activo: el crecimiento es mucho más lento y una aldea pequeña puede extinguirse. Mantén la comida, las casas y la defensa por delante de las estaciones; la pestaña de Preocupaciones avisa antes de que sea crítico.',
    'Several harder switches are on: expect slow early growth and setbacks.': 'Hay varios interruptores difíciles activos: espera un crecimiento inicial lento y reveses.',
    'Language': 'Idioma', 'the game text; your browser language is used the first time': 'el texto del juego; la primera vez se usa el idioma de tu navegador',
    // menu
    'New world…': 'Mundo nuevo…', 'Resume': 'Reanudar', 'Scenarios…': 'Escenarios…', 'Full screen (X)': 'Pantalla completa (X)', 'Layout': 'Diseño', 'Docked': 'Acoplado', 'Overlay': 'Superpuesto', 'Clean': 'Limpio', 'Show tips again': 'Mostrar los consejos otra vez', 'How to play': 'Cómo jugar', 'About': 'Acerca de',
    'Tree of knowledge': 'Árbol del conocimiento', 'Tree of knowledge…': 'Árbol del conocimiento…',
    // new world dialog
    'New world': 'Mundo nuevo', 'Seed': 'Semilla', 'Map type': 'Tipo de mapa', 'Map size': 'Tamaño del mapa', 'Check this world': 'Revisar este mundo', 'Start': 'Empezar', 'Same world again': 'El mismo mundo otra vez', 'Keep watching': 'Seguir observando',
    'Copy world line': 'Copiar línea del mundo', 'Saved village found': 'Aldea guardada encontrada', 'The game is paused until you choose.': 'El juego está en pausa hasta que elijas.', 'Start fresh': 'Empezar de cero',
    '· you can change it later in Settings': '· puedes cambiarlo luego en Ajustes', '· what the village tends to study first': '· qué tiende a estudiar primero la aldea',
    'The same seed and settings, from the start': 'La misma semilla y ajustes, desde el principio', 'Keep watching what is left': 'Seguir observando lo que queda', 'Pick a random seed': 'Elegir una semilla al azar',
    'Generate this world and list what it is good for': 'Generar este mundo y listar sus ventajas',
    // main panel
    'Drag to pan · wheel to zoom · click to inspect · WASD · Space pause · [ ] speed': 'Arrastra para mover · rueda para acercar · clic para inspeccionar · WASD · Espacio pausa · [ ] velocidad',
    'Village': 'Aldea', 'Society': 'Sociedad', 'Progress': 'Progreso', 'Stats': 'Estadísticas', 'Events': 'Sucesos', 'History': 'Historia', 'World': 'Mundo', 'population': 'población', 'food stock': 'reserva de comida',
    'Inspector': 'Inspector', 'Click something on the map.': 'Haz clic en algo del mapa.', 'How the village is ruled': 'Cómo se gobierna la aldea', 'Village council': 'Consejo de la aldea', 'Culture & guilds': 'Cultura y gremios',
    'Causes of death': 'Causas de muerte', 'Families & feuds': 'Familias y enemistades', 'Social circles': 'Círculos sociales', 'Knowledge & discoveries': 'Conocimiento y descubrimientos', 'Trade & treasury': 'Comercio y tesoro',
    'Livelihoods': 'Medios de vida', 'Harbour & trade abroad': 'Puerto y comercio exterior', 'Expeditions & discoveries': 'Expediciones y descubrimientos', 'Great projects': 'Grandes obras', 'Settlements & outposts': 'Asentamientos y puestos',
    'Neighbours': 'Vecinos', 'City': 'Ciudad', 'Defence & war': 'Defensa y guerra', 'Chronicle & lessons': 'Crónica y lecciones', 'A civilization in numbers': 'Una civilización en cifras', 'Over time': 'A lo largo del tiempo',
    'What happens, and how often': 'Qué ocurre y con qué frecuencia', 'Records & firsts': 'Récords y primicias', 'Export CSV': 'Exportar CSV', 'Export JSON': 'Exportar JSON',
    'Click to move the camera': 'Clic para mover la cámara',
    // v0.39.3: the Events tab (Now, Events feed, Years), event pins, and the Play panels
    'Now': 'Ahora', 'Years': 'Años', 'All': 'Todo', 'Important': 'Importante', 'People': 'Gente', 'Hardships': 'Penurias',
    'Spring': 'Primavera', 'Summer': 'Verano', 'Autumn': 'Otoño', 'Winter': 'Invierno', 'day {n}': 'día {n}', 'a wet year': 'un año lluvioso', 'a dry year': 'un año seco', 'mood': 'ánimo',
    'joyful': 'alegre', 'content': 'tranquilo', 'uneasy': 'inquieto', 'unhappy': 'abatido', 'miserable': 'desdichado',
    'working': 'trabajando', 'sleeping': 'durmiendo', 'socialising': 'conviviendo', 'free time': 'tiempo libre', 'What the villagers in play are doing': 'Qué hacen los aldeanos en juego',
    'event': 'suceso', 'events': 'sucesos', 'big event': 'suceso importante', 'big events': 'sucesos importantes', '{n} big': '{n} importantes', '{n} born': '{n} nacidos', '{n} died': '{n} muertos', '{n} arrived': '{n} llegados',
    'Top concern:': 'Mayor preocupación:', 'No pressing concerns.': 'Ninguna preocupación urgente.', 'Last eight days:': 'Últimos ocho días:',
    'Fast speed: this card is the live picture; the feed below shows what mattered.': 'Velocidad alta: esta tarjeta es la imagen en vivo; la lista de abajo muestra lo que importó.',
    'Show on the map': 'Mostrar en el mapa', 'The whole village: go to the village': 'Toda la aldea: ir a la aldea', 'Go to the village': 'Ir a la aldea',
    'Fast speed: showing the important lines': 'Velocidad alta: se muestran solo las líneas importantes', '{n} minor ones in the last eight days are folded away': 'se ocultan {n} menores de los últimos ocho días',
    'Nothing here yet.': 'Todavía no hay nada aquí.', 'Show more': 'Mostrar más', 'Show older events': 'Mostrar sucesos anteriores',
    '{n} people': '{n} personas', '{a} → {b} people': '{a} → {b} personas', 'Tale:': 'Relato:', 'Year {n}': 'Año {n}', 'Years {a}–{b}': 'Años {a}–{b}', 'so far': 'hasta ahora', 'No big events.': 'Sin sucesos importantes.',
    'The first year is still being written.': 'El primer año aún se está escribiendo.',
    // v0.39.3: Play mode panels
    'Homes and food': 'Casas y comida', 'Work': 'Trabajo', 'Civic': 'Cívico', 'You have': 'Tienes', 'wood': 'madera', 'stone': 'piedra', 'free': 'gratis', 'Needs': 'Requiere',
    'House': 'Casa', 'Farm': 'Granja', 'Store': 'Almacén', 'Workshop': 'Taller', 'Logging camp': 'Campamento maderero', 'Mining camp': 'Campamento minero', 'Hunting lodge': 'Cabaña de caza', 'Market': 'Mercado', 'Plaza': 'Plaza', 'Tavern': 'Taberna',
    'Where a family sleeps and children are raised.': 'Donde duerme una familia y se crían los niños.', 'Fields that grow food through the warm seasons.': 'Campos que dan comida en las estaciones cálidas.',
    'Keeps food, wood and stone safe and dry.': 'Guarda comida, madera y piedra a salvo y secas.', 'Tools and crafts; speeds up other work.': 'Herramientas y oficios; acelera otros trabajos.',
    'Woodcutters work from here and haul logs in.': 'Los leñadores trabajan desde aquí y traen los troncos.', 'Miners work from here and haul stone in.': 'Los mineros trabajan desde aquí y traen la piedra.',
    'Hunters work from here and bring game home.': 'Los cazadores trabajan desde aquí y traen la caza.', 'Where goods and visitors meet; trade grows around it.': 'Donde se encuentran mercancías y visitantes; el comercio crece a su alrededor.',
    'The village square: a well, and where people gather.': 'La plaza de la aldea: un pozo y el lugar donde la gente se reúne.', 'Where people meet of an evening; lifts mood.': 'Donde la gente se reúne por la tarde; levanta el ánimo.',
    'pick one, then tap the map. Drag the ghost, then press ✓.': 'elige uno y toca el mapa. Arrastra el fantasma y pulsa ✓.', 'pick one, then click the map. Esc or right-click to stop.': 'elige uno y haz clic en el mapa. Esc o clic derecho para parar.',
    'Drag the ghost to move it, then press ✓.': 'Arrastra el fantasma para moverlo y pulsa ✓.', 'Click the green spot, or press Place.': 'Haz clic en el punto verde o pulsa Colocar.', 'Place here': 'Colocar aquí',
    'Roads': 'Caminos', 'drag along the ground to lay a road. Costs 1 stone a tile. Use ✋ or hold Space to move the map.': 'arrastra por el suelo para trazar un camino. Cuesta 1 piedra por casilla. Usa ✋ o mantén Espacio para mover el mapa.',
    'Zones': 'Zonas', 'paint where the village should build. Drag on the map. ✋ or Space moves the map.': 'pinta dónde debe construir la aldea. Arrastra sobre el mapa. ✋ o Espacio mueve el mapa.',
    'Homes': 'Casas', 'Farms': 'Granjas', 'Erase': 'Borrar', 'Brush': 'Pincel', 'Clear all': 'Borrar todo'
  }
};
/* The language to start in: a saved choice wins, then the browser's list of languages (first one we have), then English. */
function langDetect(saved, navLangs) {
  if (saved && I18N.langs[saved]) return saved;
  for (const l of navLangs || []) { const c = String(l || '').toLowerCase().split(/[-_]/)[0]; if (I18N.langs[c]) return c }
  return 'en';
}
function langSet(l) { I18N.lang = I18N.langs[l] ? l : 'en'; return I18N.lang }
/* English text -> text in the current language (exact line, whitespace around it kept); args fill {name} slots. */
function i18nText(en) {
  if (I18N.lang === 'en' || !en) return en;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(en), tbl = I18N.lang === 'es' ? I18N.ES : null, hit = tbl && Object.prototype.hasOwnProperty.call(tbl, m[2]) ? tbl[m[2]] : null;
  return hit == null ? en : m[1] + hit + m[3];
}
function i18n(en, args) {
  let s = i18nText(en);
  if (args) s = s.replace(/\{(\w+)\}/g, (a, k) => (k in args ? args[k] : a));
  return s;
}
/* A count with its noun: i18nPlural(3, 'villager', 'villagers') -> '3 villagers' (Spanish lines in ES under the plural English text). */
function i18nPlural(n, one, many) { return n + ' ' + i18n(n === 1 ? one : many) }
