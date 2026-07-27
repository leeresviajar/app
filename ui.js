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
// Cifras reales del mapa, nunca personas: la franja no nombra a nadie ni
// describe conducta individual (ver CLAUDE.md). Las frases hablan de lo
// REGISTRADO por la comunidad, no de lo que se está viendo en pantalla —
// lo dibujado es un subconjunto (ambient = última ruta por persona, y el
// histórico va recortado a COMMUNITY_CONFIG.maxRoutes).
//
// Se calcula sobre las filas CRUDAS de public_community_routes
// (communityCache.rawHistory), NO sobre aggregateCommunityRoutes(): esa
// función descuenta las lecturas propias y recorta la lista, y aquí hacen
// falta totales. Las lecturas propias cuentan: también son rutas recorridas.
//
// Mínimo por mensaje: por debajo del umbral la frase se omite (un "3 rutas
// recorridas por la comunidad" no dice nada). Se giran aquí sin tocar el motor.
const ACTIVITY_MIN = {
  routes: 10,       // filas del histórico
  dests: 8,         // destinos distintos
  fictional: 3,     // destinos ficticios distintos
  longestKm: 2000,  // km de la ruta más larga
  ranking: 2        // llegadas del líder, para los dos rankings
};

const activityNum = v => v.toLocaleString('es-ES');

// Un solo recorrido de las filas. Agrupa por destino con normalizeName
// (map.js) y conserva la primera grafía vista como etiqueta, igual que hace
// aggregateCommunityRoutes con los títulos de libro.
function activityStats(rows) {
  const dests = new Map();
  let longestKm = 0;
  rows.forEach(row => {
    const key = normalizeName(row.dest);
    if (!key) return;
    let d = dests.get(key);
    if (!d) { d = { name: row.dest, arrivals: 0, fictional: false }; dests.set(key, d); }
    d.arrivals++;
    if (row.fictional) d.fictional = true;
    if (row.from_lat != null && row.dest_lat != null) {
      const km = haversineKm(row.from_lat, row.from_lng, row.dest_lat, row.dest_lng);
      if (km > longestKm) longestKm = km;
    }
  });
  const all = [...dests.values()];
  // Líder y llegadas del segundo: "el destino con más llegadas" exige liderazgo
  // ESTRICTO, no solo ser el primero de la lista. Con empate en cabeza el
  // desempate sería el orden de las filas (fecha desc) y la frase cambiaría de
  // nombre sola, sin que cambie ningún dato.
  const rank = list => {
    const sorted = [...list].sort((a, b) => b.arrivals - a.arrivals);
    return { leader: sorted[0] || null, second: sorted[1] ? sorted[1].arrivals : 0 };
  };
  return {
    routes: rows.length,
    dests: all.length,
    fictional: all.filter(d => d.fictional).length,
    longestKm,
    destRank: rank(all),
    ficRank: rank(all.filter(d => d.fictional))
  };
}

// Liderazgo estricto Y mínimo de llegadas. Los dos hacen falta: la separación
// estricta sola dejaría pasar un líder con una única visita y un segundo a 0.
function activityLeads(r) {
  return r.leader && r.leader.arrivals >= ACTIVITY_MIN.ranking && r.leader.arrivals > r.second;
}

// Devuelve [{ html, fictional }]. fictional marca la TEMÁTICA del mensaje
// (habla de lugares imaginarios), que es lo que tiñe el punto de naranja.
function buildActivityMessages() {
  if (typeof communityVisible !== 'undefined' && !communityVisible) return [];
  const rows = (typeof communityCache !== 'undefined' && communityCache.rawHistory) || [];
  if (!rows.length) return [];
  // Histórico truncado (ver fetchCommunityRoutes): la franja entera se calla.
  // No vale silenciar solo los totales — los seis mensajes son agregados sobre
  // el mismo conjunto de filas y ninguno sobrevive a que ese conjunto esté
  // incompleto: los totales se quedan cortos, el máximo puede coronar una ruta
  // que no lo es porque la de verdad más larga quedó fuera del corte, y un
  // líder que depende de dónde cortes no es un líder. Sale por el mismo camino
  // que cuando no hay mensajes: body.no-activity, sin banda muerta.
  if (communityCache.truncated) return [];
  const s = activityStats(rows);
  const msgs = [];
  const add = (ok, html, fictional) => { if (ok) msgs.push({ html, fictional: !!fictional }); };

  add(s.routes >= ACTIVITY_MIN.routes,
      `<em>${activityNum(s.routes)} rutas</em> recorridas por la comunidad`);
  add(s.dests >= ACTIVITY_MIN.dests,
      `<em>${activityNum(s.dests)} destinos</em> alcanzados hasta hoy`);
  add(s.fictional >= ACTIVITY_MIN.fictional,
      `<em>${activityNum(s.fictional)} de los destinos</em> no existen fuera de un libro`, true);
  add(s.longestKm >= ACTIVITY_MIN.longestKm,
      `La ruta más larga registrada mide <em>${activityNum(s.longestKm)} km</em>`);
  add(activityLeads(s.destRank),
      s.destRank.leader && `<em>${s.destRank.leader.name}</em> es el destino con más llegadas`);
  add(activityLeads(s.ficRank),
      s.ficRank.leader && `<em>${s.ficRank.leader.name}</em>, el destino ficticio más visitado`, true);

  return msgs;
}

let activityIndex = 0;
let activityMessages = [];
let activityTimer = null;
let activitySignature = null;

// Pasa al siguiente mensaje del ciclo con el fundido de .activity-msg.
function rotateActivityMessage() {
  const el = document.getElementById('activity-msg');
  const dot = document.querySelector('.activity-dot');
  if (!el) return;
  el.classList.remove('visible');
  // El color del punto cambia DENTRO de la espera, en el mismo instante que
  // el texto: ahí .activity-msg está en opacidad 0, así que el punto no salta
  // antes de que entre la frase. Su transición de 0.6s acompaña al fundido.
  setTimeout(() => {
    const msg = activityMessages[activityIndex % activityMessages.length];
    if (!msg) return;
    el.innerHTML = msg.html;
    if (dot) dot.classList.toggle('fictional', msg.fictional);
    activityIndex++;
    el.classList.add('visible');
  }, 600);
}

// La llaman el init y drawCommunityRoutes() cada vez que la caché se puebla o
// cambia. Si los mensajes salen idénticos no reinicia el ciclo: redrawMap()
// dispara un dibujado en cada alta o edición y la franja no debe saltar al
// primer mensaje cada vez.
// Sin mensajes no se deja la franja vacía con el punto latiendo: se oculta
// entera. La clase va en <body> porque además hay que anular el hueco que
// #map le reserva al pie (padding-bottom), o quedaría una banda muerta.
function refreshActivityStrip() {
  const next = buildActivityMessages();
  const sig = next.map(m => m.html).join('|');
  if (sig === activitySignature && (activityTimer || !next.length)) return;
  activitySignature = sig;
  activityMessages = next;
  if (activityTimer) { clearInterval(activityTimer); activityTimer = null; }
  document.body.classList.toggle('no-activity', next.length === 0);
  if (!next.length) return;
  activityIndex = 0;
  rotateActivityMessage();
  // Con un solo mensaje no hay rotación: fundirse a sí mismo cada 5s no aporta.
  if (next.length > 1) activityTimer = setInterval(rotateActivityMessage, 5000);
}

// La franja arranca oculta y aparece cuando hay datos: al llamarla desde el
// init la caché de comunidad todavía puede estar vacía (drawCommunityRoutes
// es async), y leerla ahí daría cero mensajes de forma permanente.
function startActivityStrip() {
  refreshActivityStrip();
}
