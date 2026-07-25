// ===================== BADGES =====================
const BADGES_DEF = [
  {
    id: 'books_5',
    icon: '📚',
    name: 'He añadido 5 lecturas a mi itinerario',
    desc: 'Cinco viajes trazados en tu mapa lector.',
    progressFn: (stats) => ({ actual: stats.booksCount, meta: 5 }),
  },
  {
    id: 'explorer_1',
    icon: '🧭',
    name: 'He llegado antes que nadie',
    desc: 'Registraste un destino que nadie había visitado.',
    progressFn: (stats) => ({ actual: stats.pioneersCount, meta: 1 }),
  },
  {
    id: 'fictional',
    icon: '✨',
    name: 'He viajado a un lugar imaginario',
    desc: 'Has visitado un lugar que solo existe en la ficción.',
    progressFn: (stats) => ({ actual: stats.fictionalCount, meta: 1 }),
  },
  {
    id: 'km_1k',
    icon: '🥾',
    name: 'He recorrido mis primeros 1.000 km',
    desc: 'Mil kilómetros de lecturas a tus espaldas.',
    progressFn: (stats) => ({ actual: stats.totalKm, meta: 1000 }),
    metaText: '1.000',
  },
  {
    id: 'books_10',
    icon: '📗',
    name: 'He añadido 10 lecturas a mi itinerario',
    desc: 'Diez viajes trazados en tu mapa lector.',
    revelaSi: 'books_5',
    progressFn: (stats) => ({ actual: stats.booksCount, meta: 10 }),
  },
  {
    id: 'explorer_3',
    icon: '🗺️',
    name: 'He cartografiado 3 destinos',
    desc: 'Llegaste antes que nadie a 3 destinos distintos.',
    revelaSi: 'explorer_1',
    progressFn: (stats) => ({ actual: stats.pioneersCount, meta: 3 }),
  },
  {
    id: 'countries_5',
    icon: '🛂',
    name: 'He viajado a 5 países distintos',
    desc: 'Cinco de los 195 países del mundo. Tu mapa empieza a tener forma.',
    progressFn: (stats) => ({ actual: stats.countriesCount, meta: 5 }),
  },
  {
    id: 'books_20',
    icon: '🌍',
    name: 'He añadido 20 lecturas a mi itinerario',
    desc: 'Veinte viajes trazados en tu mapa lector.',
    revelaSi: 'books_10',
    progressFn: (stats) => ({ actual: stats.booksCount, meta: 20 }),
  },
  {
    id: 'km_10k',
    icon: '🌐',
    name: 'He recorrido más de 10.000 km leyendo',
    desc: 'Una vuelta al mundo en páginas.',
    revelaSi: 'km_1k',
    progressFn: (stats) => ({ actual: stats.totalKm, meta: 10000 }),
    metaText: '10.000',
  },
  {
    id: 'fictional_5',
    icon: '🔮',
    name: 'He visitado 5 lugares imaginarios',
    desc: 'Cinco destinos que solo existen en la ficción.',
    revelaSi: 'fictional',
    progressFn: (stats) => ({ actual: stats.fictionalCount, meta: 5 }),
  },
  {
    id: 'explorer_10',
    icon: '⚓',
    name: 'Estuve antes que nadie en 10 destinos',
    desc: '10 destinos donde pusiste el pie antes que nadie.',
    revelaSi: 'explorer_3',
    progressFn: (stats) => ({ actual: stats.pioneersCount, meta: 10 }),
  },
  {
    id: 'fictional_10',
    icon: '🪄',
    name: 'He visitado 10 lugares imaginarios',
    desc: 'Diez destinos que solo existen en la ficción.',
    revelaSi: 'fictional_5',
    progressFn: (stats) => ({ actual: stats.fictionalCount, meta: 10 }),
  },
  {
    id: 'countries_15',
    icon: '🌎',
    name: 'He viajado a 15 países',
    desc: 'Quince de los 195 países del mundo. Tu mapa ya se lee de lejos.',
    revelaSi: 'countries_5',
    progressFn: (stats) => ({ actual: stats.countriesCount, meta: 15 }),
  },
  {
    id: 'km_40k',
    icon: '🌏',
    name: 'He dado la vuelta al mundo',
    desc: 'Más de 40.000 km leyendo: una vuelta completa al planeta.',
    revelaSi: 'km_10k',
    progressFn: (stats) => ({ actual: stats.totalKm, meta: 40075 }),
    metaText: '40.075',
  },
  {
    id: 'books_50',
    icon: '📕',
    name: 'He añadido 50 lecturas a mi itinerario',
    desc: 'Cincuenta viajes. Tu mapa ya cuenta una historia.',
    revelaSi: 'books_20',
    progressFn: (stats) => ({ actual: stats.booksCount, meta: 50 }),
  },
  {
    id: 'antipodes',
    icon: '🎯',
    secreto: true,
    name: 'He llegado a las antípodas',
    desc: 'Un solo libro te llevó a más de 15.000 km de tu punto de partida.',
    progressFn: (stats) => ({ actual: stats.maxRouteKm, meta: 15000 }),
    metaText: '15.000',
  },
  {
    id: 'near_home',
    icon: '🏠',
    secreto: true,
    name: 'Casi en casa',
    desc: 'Un libro te dejó a menos de 10 km de donde saliste.',
    // Criterio inverso (mejor = más cerca): no hay progreso monótono que
    // exponer, así que va en forma de hito. Es oculto, su barra no se pinta.
    progressFn: (stats) => ({
      actual: (stats.minRouteKm > 0 && stats.minRouteKm <= 10) ? 1 : 0,
      meta: 1,
    }),
  },
  {
    id: 'book_spread_5',
    icon: '🧳',
    secreto: true,
    name: 'Un mismo libro me ha llevado a 5 destinos',
    desc: 'Un solo libro te llevó a cinco destinos distintos.',
    progressFn: (stats) => ({ actual: stats.maxDestsPerBook, meta: 5 }),
  },
  {
    id: 'dest_converge_5',
    icon: '🚉',
    secreto: true,
    name: 'He llegado al mismo lugar con 5 lecturas distintas',
    desc: 'Cinco lecturas distintas te llevaron al mismo lugar.',
    progressFn: (stats) => ({ actual: stats.maxBooksPerDest, meta: 5 }),
  },
];

// ===================== PROGRESO NUMÉRICO =====================
// Cada logro expone { actual, meta } y está cumplido cuando actual >= meta.
// Los hitos únicos (sin progreso natural) usan meta 1 y actual 0 | 1.
const fmtBadgeNum = (v) => Math.round(v).toLocaleString();

function isBadgeUnlocked(badge, stats) {
  const { actual, meta } = badge.progressFn(stats);
  return actual >= meta;
}

function badgePct(badge, stats) {
  const { actual, meta } = badge.progressFn(stats);
  return meta > 0 ? Math.min(1, actual / meta) : 0;
}

// La fracción se corta a la meta: un logro pendiente nunca la supera, y así
// los hitos únicos leen "0/1" en vez de "3/1".
// metaText conserva los rótulos que ya eran literales (1.000, 40.075…) para
// que la fracción se imprima igual en cualquier idioma del navegador.
function badgeFrac(badge, stats) {
  const { actual, meta } = badge.progressFn(stats);
  return `${fmtBadgeNum(Math.min(actual, meta))}/${badge.metaText || fmtBadgeNum(meta)}`;
}

// ===================== VISIBILIDAD =====================
// Cuatro estados, porque "oculto" no es una cosa sino dos:
//   'unlocked' conseguido · 'locked' texto real y barra de progreso
//   'masked'   secreto: fila "Logro oculto", igual que siempre
//   'none'     eslabón de cadena sin revelar: no se pinta nada
//
// El predecesor cuenta como caído si está en la lista persistida O si su
// criterio ya se cumple. Solo con lo segundo, borrar lecturas volvería a
// esconder un eslabón ya revelado, y los logros no se revocan nunca.
function isBadgeRevealed(id, stats, unlocked) {
  if (unlocked.includes(id)) return true;
  const pred = BADGES_DEF.find(b => b.id === id);
  // Id inexistente (errata en revelaSi): se da por revelado, para que una
  // errata no deje un logro invisible para siempre.
  return !pred || isBadgeUnlocked(pred, stats);
}

function badgeVisibility(badge, stats, unlocked) {
  if (unlocked.includes(badge.id)) return 'unlocked';
  if (badge.revelaSi && !isBadgeRevealed(badge.revelaSi, stats, unlocked)) return 'none';
  if (badge.secreto) return 'masked';
  return 'locked';
}

// ===================== AGRUPACIÓN POR LIBRO Y POR DESTINO =====================
// Identidad de libro: dos entradas son el mismo libro si comparten bookRef.
// Cuando a alguna le falta (entradas anteriores al autocompletado, o escritas
// a mano), se cae al título normalizado. Un título con un único bookRef adopta
// ese ref, para que las entradas con y sin ref del mismo libro no se partan en
// dos grupos. Si un mismo título tiene varios refs (homónimos de distinto
// autor), las que no llevan ref se quedan en su propio grupo: no hay forma de
// saber a cuál de los libros pertenecen.
function bookIdentities(list) {
  const refsByTitle = new Map();
  list.forEach(e => {
    const title = normalizeName(e.book).trim();
    if (!refsByTitle.has(title)) refsByTitle.set(title, new Set());
    if (e.bookRef) refsByTitle.get(title).add(e.bookRef);
  });
  return list.map(e => {
    if (e.bookRef) return 'ref:' + e.bookRef;
    const title = normalizeName(e.book).trim();
    const refs = refsByTitle.get(title);
    return refs.size === 1 ? 'ref:' + [...refs][0] : 'title:' + title;
  });
}

// Tamaño del grupo más nutrido, contando elementos DISTINTOS: dos entradas del
// mismo libro al mismo destino cuentan como una.
function maxDistinctPerGroup(pairs) {
  const groups = new Map();
  pairs.forEach(([group, item]) => {
    if (!groups.has(group)) groups.set(group, new Set());
    groups.get(group).add(item);
  });
  let max = 0;
  groups.forEach(set => { max = Math.max(max, set.size); });
  return max;
}

function getBadgeStats() {
  const diary = loadDiary();
  const pioneersCount = diary.filter(e => e.pioneer).length;
  const booksCount = entries.length;
  const fictionalCount = entries.filter(e => e.fictional).length;
  const resolved = resolveEntries(entries);
  const totalKm = resolved.reduce((s,e) => s + e.km, 0);
  const realRoutes = resolved.filter(e => !e.fictional && e.km > 0);
  const maxRouteKm = realRoutes.reduce((m,e) => Math.max(m, e.km), 0);
  const minRouteKm = realRoutes.length
    ? realRoutes.reduce((m,e) => Math.min(m, e.km), Infinity)
    : 0;
  // Sobre TODAS las entradas: los logros no se filtran por año.
  const countries = countriesFrom(entries);
  // Dispersión y convergencia: los ficticios cuentan en las dos, y se calculan
  // sobre las entradas sin resolver — la cadena de orígenes no afecta ni al
  // libro ni al destino.
  const bookIds = bookIdentities(entries);
  const destKeys = entries.map(e => normalizeName(e.dest).trim());
  const maxDestsPerBook = maxDistinctPerGroup(entries.map((e, i) => [bookIds[i], destKeys[i]]));
  const maxBooksPerDest = maxDistinctPerGroup(entries.map((e, i) => [destKeys[i], bookIds[i]]));
  return { pioneersCount, booksCount, fictionalCount, totalKm, maxRouteKm, minRouteKm,
           countriesCount: countries.size, maxDestsPerBook, maxBooksPerDest };
}

function loadUnlocked() {
  try { return JSON.parse(localStorage.getItem('lev_badges') || '[]'); } catch(e) { return []; }
}
function saveUnlocked(arr) { localStorage.setItem('lev_badges', JSON.stringify(arr)); }

function checkNewBadges(stats, silent = false, seeding = false) {
  const unlocked = loadUnlocked();
  const newOnes = [];
  for (const badge of BADGES_DEF) {
    if (!unlocked.includes(badge.id) && isBadgeUnlocked(badge, stats)) {
      unlocked.push(badge.id);
      newOnes.push(badge);
    }
  }
  if (newOnes.length) {
    saveUnlocked(unlocked);
    // seeding: los logros no son nuevos, solo se ponen al día tras un
    // despliegue, así que tampoco se marca la pestaña con el punto de aviso.
    if (!seeding) {
      const tab = document.getElementById('tab-logros');
      tab.innerHTML = 'Logros <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--teal);vertical-align:middle;margin-left:3px;"></span>';
    }
    // silent: al cargar desde la nube marcamos los logros ya conseguidos sin
    // lanzar la lluvia de toasts por logros que el usuario ya tenía.
    if (!silent) showBadgeUnlockToast(newOnes[0]);
  }
}

// ===================== SIEMBRA SILENCIOSA =====================
// Un despliegue que añade logros encontraría a los usuarios de siempre con
// varios ya cumplidos: sin esto, quien lleve 20 lecturas recibe el aviso de un
// logro que no acaba de conseguir. En la primera carga tras el despliegue se
// marcan como vistos sin aviso, sin animación y sin punto en la pestaña.
// La versión sube cada vez que se añaden logros nuevos: así vuelve a sembrar
// una única vez por despliegue.
const BADGE_SEED_KEY = 'lev_badges_seed';
const BADGE_SEED_VERSION = 1;

function seedBadgesOnce() {
  if (localStorage.getItem(BADGE_SEED_KEY) === String(BADGE_SEED_VERSION)) return false;
  checkNewBadges(getBadgeStats(), true, true);
  localStorage.setItem(BADGE_SEED_KEY, String(BADGE_SEED_VERSION));
  return true;
}

function renderBadges() {
  const stats = getBadgeStats();
  const unlocked = loadUnlocked();
  const container = document.getElementById('badges-container');

  // "Por conseguir · N" cuenta exactamente lo que se pinta: los secretos
  // enmascarados sí, los eslabones sin revelar no. La N crece conforme se
  // revelan cadenas.
  const state = new Map(BADGES_DEF.map(b => [b.id, badgeVisibility(b, stats, unlocked)]));
  const unlockedBadges = BADGES_DEF.filter(b => state.get(b.id) === 'unlocked');
  const lockedBadges   = BADGES_DEF.filter(b => ['locked', 'masked'].includes(state.get(b.id)));

  let html = '';
  if (unlockedBadges.length) {
    html += `<div class="badges-section-title">Conseguidos · ${unlockedBadges.length}</div>`;
    html += unlockedBadges.map(b => `
      <div class="badge-row unlocked">
        <span class="badge-row-icon">${b.icon}</span>
        <div class="badge-row-body">
          <div class="badge-row-name">${b.name}</div>
          <div class="badge-row-desc">${b.desc}</div>
        </div>
        <span class="badge-row-check">✓</span>
      </div>`).join('');
  }
  if (lockedBadges.length) {
    html += `<div class="badges-section-title">Por conseguir · ${lockedBadges.length}</div>`;
    html += lockedBadges.map(b => {
      if (state.get(b.id) === 'masked') {
        return `
      <div class="badge-row locked badge-hidden">
        <span class="badge-row-icon">🔒</span>
        <div class="badge-row-body">
          <div class="badge-row-name">Logro oculto</div>
          <div class="badge-row-desc">Sigue viajando para descubrirlo.</div>
        </div>
      </div>`;
      }
      return `
      <div class="badge-row locked">
        <span class="badge-row-icon">${b.icon}</span>
        <div class="badge-row-body">
          <div class="badge-row-name">${b.name}</div>
          <div class="badge-row-track">
            <div class="badge-row-bar-bg"><div class="badge-row-bar" style="width:${Math.round(badgePct(b, stats)*100)}%"></div></div>
            <span class="badge-row-frac">${badgeFrac(b, stats)}</span>
          </div>
        </div>
      </div>`;
    }).join('');
  }
  if (!html) html = `<div class="diary-empty"><div class="diary-icon">🏅</div><p>Añade lecturas para desbloquear logros.</p></div>`;
  container.innerHTML = html;
}

// ===================== TOASTS =====================
let pioneerHideTimer = null;
let entryAddedHideTimer = null;

// Los toasts de viaje comparten posición: el nuevo sustituye al que estuviera visible.
function hideTravelToast(id, clearTimer) {
  const toast = document.getElementById(id);
  if (toast.classList.contains('show')) {
    clearTimer();
    toast.classList.remove('show');
  }
}

// El logro convive con los toasts de viaje: si hay uno visible, se coloca debajo
// y vuelve a la posición base (con la transición existente) cuando aquel se cierra.
function visibleTravelToast() {
  return ['pioneer-toast', 'entry-added-toast']
    .map(id => document.getElementById(id))
    .find(t => t.classList.contains('show')) || null;
}

function restackBadgeToast() {
  const badge = document.getElementById('badge-unlock-toast');
  if (!badge.classList.contains('show')) { badge.style.top = ''; return; }
  const travel = visibleTravelToast();
  badge.style.top = travel
    ? `calc(12vh + ${Math.round(travel.getBoundingClientRect().height) + 12}px)`
    : '';
}

function closeTravelToast(toast) {
  toast.classList.remove('show');
  restackBadgeToast();
}

function showPioneerToast(destName, fictional) {
  hideTravelToast('entry-added-toast', () => clearTimeout(entryAddedHideTimer));
  const toast = document.getElementById('pioneer-toast');
  toast.classList.toggle('toast-fictional', !!fictional);
  toast.classList.toggle('toast-real', !fictional);
  document.getElementById('pioneer-name').textContent = fictional ? `✦ ${destName}` : destName;
  toast.classList.add('show');
  restackBadgeToast();
  clearTimeout(pioneerHideTimer);
  pioneerHideTimer = setTimeout(() => { toast.classList.remove('show'); restackBadgeToast(); }, 8000);
}

// Trayectorias del cañón izquierdo; el derecho es el espejo con --dx negado.
const BADGE_CONFETTI = [
  { shape: 'rect',   color: 'c-teal',   dx: 110, dy: -190, delay: 0 },
  { shape: 'dot',    color: 'c-mint',   dx: 180, dy: -150, delay: 0.06 },
  { shape: 'rect',   color: 'c-orange', dx: 70,  dy: -220, delay: 0.1 },
  { shape: 'dot-sm', color: 'c-forest', dx: 240, dy: -100, delay: 0.04 },
  { shape: 'rect',   color: 'c-mint',   dx: 140, dy: -205, delay: 0.13 },
  { shape: 'dot',    color: 'c-orange', dx: 210, dy: -175, delay: 0.08 },
];
let badgeConfettiCleanup = null;

function spawnBadgeConfetti(toast) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  clearTimeout(badgeConfettiCleanup);
  toast.querySelectorAll('.bu-piece').forEach(p => p.remove());
  for (const side of [1, -1]) {
    for (const c of BADGE_CONFETTI) {
      const piece = document.createElement('span');
      piece.className = `bu-piece ${c.shape} ${c.color}`;
      piece.style.left = side === 1 ? '-4px' : '100%';
      piece.style.top = '100%';
      piece.style.setProperty('--dx', (side * c.dx) + 'px');
      piece.style.setProperty('--dy', c.dy + 'px');
      piece.style.animationDelay = c.delay + 's';
      toast.appendChild(piece);
    }
  }
  badgeConfettiCleanup = setTimeout(() =>
    toast.querySelectorAll('.bu-piece').forEach(p => p.remove()), 2400);
}

let badgeHideTimer = null;

function showBadgeUnlockToast(badge) {
  const toast = document.getElementById('badge-unlock-toast');
  document.getElementById('bu-name').textContent = badge.name;
  document.getElementById('bu-desc').textContent = badge.desc;
  spawnBadgeConfetti(toast);
  toast.classList.add('show');
  restackBadgeToast();
  clearTimeout(badgeHideTimer);
  badgeHideTimer = setTimeout(() => toast.classList.remove('show'), 7000);
}

function goToBadgesFromToast(event) {
  event.preventDefault();
  clearTimeout(badgeHideTimer);
  document.getElementById('badge-unlock-toast').classList.remove('show');
  if (isMobile()) setMobileView('logros'); else switchTab('logros');
}

function showEntryAddedToast(destName, fictional) {
  hideTravelToast('pioneer-toast', () => clearTimeout(pioneerHideTimer));
  const toast = document.getElementById('entry-added-toast');
  toast.classList.toggle('toast-fictional', !!fictional);
  toast.classList.toggle('toast-real', !fictional);
  document.getElementById('entry-added-name').textContent = fictional ? `✦ ${destName}` : destName;
  toast.classList.add('show');
  restackBadgeToast();
  clearTimeout(entryAddedHideTimer);
  entryAddedHideTimer = setTimeout(() => { toast.classList.remove('show'); restackBadgeToast(); }, 4000);
}
