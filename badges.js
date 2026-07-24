// ===================== BADGES =====================
const BADGES_DEF = [
  {
    id: 'explorer_1',
    icon: '🧭',
    name: 'He llegado antes que nadie',
    desc: 'Registraste un destino que nadie había visitado.',
    unlockFn: (stats) => stats.pioneersCount >= 1,
    progress: (stats) => `${Math.min(stats.pioneersCount,1)}/1 primera llegada`,
    pct: (stats) => Math.min(1, stats.pioneersCount / 1),
  },
  {
    id: 'explorer_3',
    icon: '🗺️',
    name: 'He cartografiado 3 destinos',
    desc: 'Has sido el primero en llegar a 3 destinos distintos.',
    unlockFn: (stats) => stats.pioneersCount >= 3,
    progress: (stats) => `${stats.pioneersCount}/3 primeras llegadas`,
    pct: (stats) => Math.min(1, stats.pioneersCount / 3),
  },
  {
    id: 'explorer_10',
    icon: '⚓',
    name: 'Estuve antes que nadie en 10 destinos',
    desc: '10 destinos donde pusiste el pie antes que nadie.',
    unlockFn: (stats) => stats.pioneersCount >= 10,
    progress: (stats) => `${stats.pioneersCount}/10 primeras llegadas`,
    pct: (stats) => Math.min(1, stats.pioneersCount / 10),
  },
  {
    id: 'books_5',
    icon: '📚',
    name: 'He añadido 5 lecturas a mi itinerario',
    desc: 'Tu mapa lector ya tiene 5 viajes trazados.',
    unlockFn: (stats) => stats.booksCount >= 5,
    progress: (stats) => `${stats.booksCount}/5 libros`,
    pct: (stats) => Math.min(1, stats.booksCount / 5),
  },
  {
    id: 'books_20',
    icon: '🌍',
    name: 'He viajado a 20 destinos leyendo',
    desc: '20 libros y 20 destinos marcados en el mapa.',
    unlockFn: (stats) => stats.booksCount >= 20,
    progress: (stats) => `${stats.booksCount}/20 libros`,
    pct: (stats) => Math.min(1, stats.booksCount / 20),
  },
  {
    id: 'fictional',
    icon: '✨',
    name: 'He viajado a un lugar imaginario',
    desc: 'Has visitado un lugar que solo existe en la ficción.',
    unlockFn: (stats) => stats.fictionalCount >= 1,
    progress: (stats) => `${Math.min(stats.fictionalCount,1)}/1 lugar ficticio`,
    pct: (stats) => Math.min(1, stats.fictionalCount / 1),
  },
  {
    id: 'km_10k',
    icon: '🌐',
    name: 'He recorrido más de 10.000 km leyendo',
    desc: 'Una vuelta al mundo en páginas.',
    unlockFn: (stats) => stats.totalKm >= 10000,
    progress: (stats) => `${Math.round(stats.totalKm).toLocaleString()}/10.000 km`,
    pct: (stats) => Math.min(1, stats.totalKm / 10000),
  },
  {
    id: 'countries_5',
    icon: '🛂',
    name: 'He viajado a 5 países distintos',
    desc: 'Tus lecturas te han llevado por medio mundo.',
    unlockFn: (stats) => stats.countriesCount >= 5,
    progress: (stats) => `${stats.countriesCount}/5 países`,
    pct: (stats) => Math.min(1, stats.countriesCount / 5),
  },
];

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
  const countries = new Set(entries.filter(e => !e.fictional).map(e => e.countryCode || e.country || '').filter(Boolean));
  return { pioneersCount, booksCount, fictionalCount, totalKm, maxRouteKm, minRouteKm, countriesCount: countries.size };
}

function loadUnlocked() {
  try { return JSON.parse(localStorage.getItem('lev_badges') || '[]'); } catch(e) { return []; }
}
function saveUnlocked(arr) { localStorage.setItem('lev_badges', JSON.stringify(arr)); }

function checkNewBadges(stats, silent = false) {
  const unlocked = loadUnlocked();
  const newOnes = [];
  for (const badge of BADGES_DEF) {
    if (!unlocked.includes(badge.id) && badge.unlockFn(stats)) {
      unlocked.push(badge.id);
      newOnes.push(badge);
    }
  }
  if (newOnes.length) {
    saveUnlocked(unlocked);
    const tab = document.getElementById('tab-logros');
    tab.innerHTML = 'Logros <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--teal);vertical-align:middle;margin-left:3px;"></span>';
    // silent: al cargar desde la nube marcamos los logros ya conseguidos sin
    // lanzar la lluvia de toasts por logros que el usuario ya tenía.
    if (!silent) showBadgeUnlockToast(newOnes[0]);
  }
}

function renderBadges() {
  const stats = getBadgeStats();
  const unlocked = loadUnlocked();
  const container = document.getElementById('badges-container');

  const unlockedBadges = BADGES_DEF.filter(b => unlocked.includes(b.id));
  const lockedBadges   = BADGES_DEF.filter(b => !unlocked.includes(b.id));

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
    html += lockedBadges.map(b => `
      <div class="badge-row locked">
        <span class="badge-row-icon">${b.icon}</span>
        <div class="badge-row-body">
          <div class="badge-row-name">${b.name}</div>
          <div class="badge-row-track">
            <div class="badge-row-bar-bg"><div class="badge-row-bar" style="width:${Math.round(b.pct(stats)*100)}%"></div></div>
            <span class="badge-row-frac">${b.progress(stats).split(' ')[0]}</span>
          </div>
        </div>
      </div>`).join('');
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
