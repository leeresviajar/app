// ===================== TABS =====================
function switchTab(name) {
  document.querySelectorAll('.nav-tab').forEach((t,i) => {
    const names = ['añadir','itinerario','diario','logros'];
    t.classList.toggle('active', names[i] === name);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === 'panel-' + name);
  });
  if (name === 'logros') { const lt = document.getElementById('tab-logros'); if (lt) lt.textContent = 'Logros'; renderBadges(); }
  if (name === 'diario') renderDiary();
  if (name === 'itinerario') updateList();
}

// ===================== MÓVIL =====================
let mobileView = 'map';
function isMobile() { return window.matchMedia('(max-width: 768px)').matches; }

function setMobileView(view) {
  mobileView = view;
  const ids = { map:'mtab-map', anadir:'mtab-anadir', viajes:'mtab-viajes', diario:'mtab-diario', logros:'mtab-logros' };
  Object.values(ids).forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('active'); });
  const active = document.getElementById(ids[view]); if (active) active.classList.add('active');

  const sidebar = document.querySelector('.sidebar');
  if (view === 'map') {
    sidebar.classList.add('mv-hidden');
    setTimeout(() => { if (typeof map !== 'undefined' && map.invalidateSize) map.invalidateSize(); }, 60);
  } else {
    sidebar.classList.remove('mv-hidden');
    const tabMap = { anadir:'añadir', viajes:'itinerario', diario:'diario', logros:'logros' };
    switchTab(tabMap[view]);
    sidebar.scrollTop = 0;
  }
}

function initMobile() {
  if (isMobile()) setMobileView('map');
}

// ===================== FRANJA DE ACTIVIDAD =====================
const ACTIVITY_MESSAGES = [
  { text: () => `<em>Lucía</em> acaba de llegar a <em>Estambul</em> leyendo a Orhan Pamuk` },
  { text: () => `<em>3 lectores</em> visitaron <em>Macondo</em> esta semana` },
  { text: () => `<em>Marcos</em> ha cruzado <em>5 países</em> en sus últimas lecturas` },
  { text: () => `<em>Hogwarts</em> tiene hoy <em>1.847 viajeros</em> en el mapa` },
  { text: () => `<em>Elena</em> llegó por primera vez a <em>Praga</em> con Kafka` },
  { text: () => `<em>Sofía</em> lleva <em>23.000 km</em> leídos este año` },
  { text: () => `<em>Mordor</em> suma ya <em>2.103 exploradores</em> en la comunidad` },
  { text: () => `<em>Iker</em> acaba de descubrir <em>Winterfell</em> leyendo a George R.R. Martin` },
  { text: () => `<em>847 lectores</em> han recorrido juntos más de <em>2,3 millones de km</em>` },
  { text: () => `<em>Carlos</em> llegó a <em>Dublín</em> — ¡primera llegada registrada desde Murcia!` },
  { text: () => `<em>Nina</em> ha visitado <em>4 lugares ficticios</em> este mes` },
  { text: () => `<em>La Comarca</em> fue el destino más visitado de la semana` },
  { text: () => `<em>Amaia</em> está viajando ahora mismo por el <em>Caribe colombiano</em>` },
  { text: () => `<em>12 lectores</em> llegaron a <em>Tokio</em> esta semana` },
  { text: () => `<em>Arrakis</em> acaba de recibir su viajero número <em>1.654</em>` },
];

let activityIndex = 0;
function startActivityStrip() {
  const el = document.getElementById('activity-msg');
  function showNext() {
    el.classList.remove('visible');
    setTimeout(() => {
      el.innerHTML = ACTIVITY_MESSAGES[activityIndex % ACTIVITY_MESSAGES.length].text();
      activityIndex++;
      el.classList.add('visible');
    }, 600);
  }
  showNext();
  setInterval(showNext, 5000);
}
