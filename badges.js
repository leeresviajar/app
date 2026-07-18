// ===================== BADGES =====================
const BADGES_DEF = [
  {
    id: 'explorer_1',
    icon: '🧭',
    name: 'He llegado antes que nadie',
    desc: 'Registraste un destino que nadie había visitado.',
    unlockFn: (stats) => stats.pioneersCount >= 1,
    progress: (stats) => `${Math.min(stats.pioneersCount,1)}/1 primera llegada`,
  },
  {
    id: 'explorer_3',
    icon: '🗺️',
    name: 'He cartografiado 3 destinos',
    desc: 'Has sido el primero en llegar a 3 destinos distintos.',
    unlockFn: (stats) => stats.pioneersCount >= 3,
    progress: (stats) => `${stats.pioneersCount}/3 primeras llegadas`,
  },
  {
    id: 'explorer_10',
    icon: '⚓',
    name: 'Estuve antes que nadie en 10 destinos',
    desc: '10 destinos donde pusiste el pie antes que nadie.',
    unlockFn: (stats) => stats.pioneersCount >= 10,
    progress: (stats) => `${stats.pioneersCount}/10 primeras llegadas`,
  },
  {
    id: 'books_5',
    icon: '📚',
    name: 'He añadido 5 lecturas a mi itinerario',
    desc: 'Tu mapa lector ya tiene 5 viajes trazados.',
    unlockFn: (stats) => stats.booksCount >= 5,
    progress: (stats) => `${stats.booksCount}/5 libros`,
  },
  {
    id: 'books_20',
    icon: '🌍',
    name: 'He viajado a 20 destinos leyendo',
    desc: '20 libros y 20 destinos marcados en el mapa.',
    unlockFn: (stats) => stats.booksCount >= 20,
    progress: (stats) => `${stats.booksCount}/20 libros`,
  },
  {
    id: 'fictional',
    icon: '✨',
    name: 'He viajado a un lugar imaginario',
    desc: 'Has visitado un lugar que solo existe en la ficción.',
    unlockFn: (stats) => stats.fictionalCount >= 1,
    progress: (stats) => `${Math.min(stats.fictionalCount,1)}/1 lugar ficticio`,
  },
  {
    id: 'km_10k',
    icon: '🌐',
    name: 'He recorrido más de 10.000 km leyendo',
    desc: 'Una vuelta al mundo en páginas.',
    unlockFn: (stats) => stats.totalKm >= 10000,
    progress: (stats) => `${Math.round(stats.totalKm).toLocaleString()}/10.000 km`,
  },
  {
    id: 'countries_5',
    icon: '🛂',
    name: 'He viajado a 5 países distintos',
    desc: 'Tus lecturas te han llevado por medio mundo.',
    unlockFn: (stats) => stats.countriesCount >= 5,
    progress: (stats) => `${stats.countriesCount}/5 países`,
  },
];

function getBadgeStats() {
  const diary = loadDiary();
  const pioneersCount = diary.filter(e => e.pioneer).length;
  const booksCount = entries.length;
  const fictionalCount = entries.filter(e => e.fictional).length;
  const totalKm = resolveEntries(entries).reduce((s,e) => s + e.km, 0);
  const countries = new Set(entries.filter(e => !e.fictional).map(e => e.countryCode || e.country || '').filter(Boolean));
  return { pioneersCount, booksCount, fictionalCount, totalKm, countriesCount: countries.size };
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
    html += `<div class="badges-section-title">Conseguidos</div><div class="badges-grid">`;
    html += unlockedBadges.map(b => `
      <div class="badge-card unlocked">
        <span class="badge-icon">${b.icon}</span>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
      </div>`).join('');
    html += `</div>`;
  }
  if (lockedBadges.length) {
    html += `<div class="badges-section-title">Por conseguir</div><div class="badges-grid">`;
    html += lockedBadges.map(b => `
      <div class="badge-card locked">
        <span class="badge-icon">${b.icon}</span>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
        <div class="badge-progress">${b.progress(stats)}</div>
      </div>`).join('');
    html += `</div>`;
  }
  if (!html) html = `<div class="diary-empty"><div class="diary-icon">🏅</div><p>Añade lecturas para desbloquear logros.</p></div>`;
  container.innerHTML = html;
}

// ===================== TOASTS =====================
let pioneerHideTimer = null;

function showPioneerToast(destName, fictional) {
  const toast = document.getElementById('pioneer-toast');
  toast.classList.toggle('toast-fictional', !!fictional);
  toast.classList.toggle('toast-real', !fictional);
  document.getElementById('pioneer-name').textContent = fictional ? `✦ ${destName}` : destName;
  toast.classList.add('show');
  clearTimeout(pioneerHideTimer);
  pioneerHideTimer = setTimeout(() => toast.classList.remove('show'), 8000);
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

function showBadgeUnlockToast(badge) {
  // Si el toast de pionero está visible, se acorta a 4s y el logro espera su salida.
  const pioneer = document.getElementById('pioneer-toast');
  if (pioneer.classList.contains('show')) {
    clearTimeout(pioneerHideTimer);
    pioneerHideTimer = setTimeout(() => pioneer.classList.remove('show'), 4000);
    setTimeout(() => displayBadgeUnlockToast(badge), 4400);
  } else {
    displayBadgeUnlockToast(badge);
  }
}

function displayBadgeUnlockToast(badge) {
  const toast = document.getElementById('badge-unlock-toast');
  document.getElementById('bu-name').textContent = badge.name;
  document.getElementById('bu-desc').textContent = badge.desc;
  spawnBadgeConfetti(toast);
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 7000);
}

function goToBadgesFromToast(event) {
  event.preventDefault();
  document.getElementById('badge-unlock-toast').classList.remove('show');
  if (isMobile()) setMobileView('logros'); else switchTab('logros');
}

function showEntryAddedToast(destName, fictional) {
  const toast = document.getElementById('entry-added-toast');
  toast.classList.toggle('toast-fictional', !!fictional);
  toast.classList.toggle('toast-real', !fictional);
  document.getElementById('entry-added-name').textContent = fictional ? `✦ ${destName}` : destName;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 6000);
}
