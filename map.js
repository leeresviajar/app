// ===================== MAP =====================
const map = L.map('map', { zoomControl: false, minZoom: 2, maxZoom: 18 }).setView([30, 10], 2);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 19
}).addTo(map);
L.control.zoom({ position: 'bottomright' }).addTo(map);
// Compensar altura de la franja de actividad
const zoomStyle = document.createElement('style');
zoomStyle.textContent = '.leaflet-bottom.leaflet-right { bottom: 42px; }';
document.head.appendChild(zoomStyle);
markersLayer = L.layerGroup().addTo(map);

// ===================== MAP DRAWING =====================
function drawRoute(entry) {
  const p1 = { lat: entry.fromLat, lng: entry.fromLng };
  const p2 = { lat: entry.destLat, lng: entry.destLng };

  const midLat = (p1.lat + p2.lat) / 2;
  const midLng = (p1.lng + p2.lng) / 2;
  const dLat = p2.lat - p1.lat;
  const dLng = p2.lng - p1.lng;
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);

  const curvature = Math.min(dist * 0.25, 15);
  const perpLat = -dLng / (dist || 1) * curvature;
  const perpLng =  dLat / (dist || 1) * curvature;

  const steps = 40;
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = (1-t)*(1-t)*p1.lat + 2*(1-t)*t*(midLat + perpLat) + t*t*p2.lat;
    const lng = (1-t)*(1-t)*p1.lng + 2*(1-t)*t*(midLng + perpLng) + t*t*p2.lng;
    points.push([lat, lng]);
  }

  const line = L.polyline(points, { color: '#e8593c', weight: 2, opacity: 0.7, dashArray: '6 4' }).addTo(map);
  const el = line.getElement();
  if (el) {
    let offset = 0;
    const animate = () => { offset -= 1; if (el) el.style.strokeDashoffset = offset; requestAnimationFrame(animate); };
    requestAnimationFrame(animate);
  }
}

// Pin arrastrable propio (sustituye al azul de fábrica de Leaflet) para los
// mini-mapas de "ajustar en el mapa" (entries.js) y "colocar lugar ficticio"
// (fictional.js). color: '#1d9e75' (teal, real) o '#e8913c' (naranja, ficticio),
// respetando la semántica de color ya establecida en el resto de la app.
function coloredPinIcon(color) {
  return L.divIcon({
    className: '',
    html: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 11.25 15 27 15 27s15-15.75 15-27C30 6.7 23.3 0 15 0z" fill="${color}"/>
      <circle cx="15" cy="15" r="6" fill="white"/>
    </svg>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42] // la punta del pin señala el punto exacto, como el marcador de Leaflet
  });
}

function addDestMarker(entry) {
  const color = entry.fictional ? '#e8913c' : '#e8593c';
  const size = entry.fictional ? 12 : 10;
  // entry puede ser una copia resuelta (resolveEntries): la identidad se
  // comprueba contra la entrada real vía __original.
  const isCurrent = entries.length > 0 && typeof currentEntry === 'function' && currentEntry() === (entry.__original || entry);
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 0 0 1.5px ${color}"></div>`,
    iconSize: [size,size], iconAnchor: [size/2,size/2]
  });
  L.marker([entry.destLat, entry.destLng], { icon }).addTo(markersLayer).on('click', () => showDestinationDetail(entry.dest)).bindPopup(`
    <div class="popup-book">${esc(entry.book)}${entry.author ? ` <span style="font-weight:400;font-style:normal;font-size:0.8rem;color:#888">— ${esc(entry.author)}</span>` : ''}</div>
    <div class="popup-place">${entry.fictional ? '✦ ' : ''}${esc(entry.dest)}</div>
    <div class="popup-km">+${entry.km.toLocaleString()} km desde ${esc(entry.fromName)}</div>
    ${entry.note ? `<div style="font-size:0.75rem;color:#888;font-style:italic;margin-top:4px;">"${esc(entry.note)}"</div>` : ''}
    ${(() => {
      const key = normalizeName(entry.dest);
      const vData = PLACE_VISITORS[key];
      if (vData) {
        const others = vData.books.filter(b => b !== entry.book).slice(0,2);
        const highlightColor = entry.fictional ? '#e8913c' : 'var(--teal)';
        // Sin otros libros que listar, todas esas lecturas son de este mismo libro.
        const suffix = others.length ? 'leyendo:' : 'leyendo este libro';
        return `<div class="popup-community">
          ${communityCountHtml(vData.count, highlightColor, suffix, true)}
          ${others.length ? '<br>' + others.map(b => `<span style="font-size:0.7rem;color:#aaa;font-style:italic">· ${b}</span>`).join(' ') : ''}
        </div>`;
      }
      return '';
    })()}
    <div style="margin-top:8px;">
      ${isCurrent
        ? `<button onclick="openPostalFromEl(this)" data-dest="${esc(entry.dest)}" data-book="${esc(entry.book ? entry.book + (entry.author ? ', de ' + entry.author : '') : '')}" data-fictional="${!!entry.fictional}" style="background:none;border:1px solid rgba(29,158,117,0.3);border-radius:12px;padding:3px 10px;font-size:0.68rem;color:var(--teal);cursor:pointer;font-family:'Inter',sans-serif;">✉️ Enviar postal</button>`
        : `<span style="font-size:0.68rem;color:#aaa;font-style:italic;">Solo puedes enviar postales desde tu destino actual</span>`}
    </div>
  `);
}

function redrawMap() {
  markersLayer.clearLayers();
  map.eachLayer(l => { if (l instanceof L.Polyline) map.removeLayer(l); });
  if (origin) addOriginMarker();
  resolvedFiltered().forEach(e => { drawRoute(e); addDestMarker(e); });
  drawCommunityRoutes();
}

// ===================== RUTAS DE COMUNIDAD =====================
// Datos reales agregados desde dos vistas de Supabase, ambas anónimas
// (sin user_id ni note por construcción — ver sql/):
//  · community_routes_latest_per_user → líneas de ambiente (última ruta
//    de cada usuario; rotación orgánica cuando alguien añade una entrada)
//  · public_community_routes → histórico completo (puntos, PLACE_VISITORS
//    y detalle al pinchar un destino)
// Parámetros ajustables sin tocar el motor: se giran según crezca la comunidad.
const COMMUNITY_CONFIG = {
  maxRoutes: 40,          // tope absoluto de rutas dibujadas
  // Tope de filas del histórico que se leen para agregar. Va aparte de
  // maxRoutes a propósito: con un solo tope, un destino cuya última lectura
  // caía fuera de las N filas más recientes desaparecía de PLACE_VISITORS y
  // su popup se quedaba sin libros. Leer siempre el histórico entero.
  historyRows: 500,
  windowDays: null        // null = sin filtro de fecha; número = solo últimos N días
};
const COMMUNITY_CACHE_TTL = 5 * 60 * 1000;
let communityCache = { ambient: null, history: null, ts: 0 };
// Clave canónica de nombres de lugar y libro: minúsculas y sin diacríticos.
// Única definición compartida — PLACE_VISITORS se escribe y se lee con ella.
const normalizeName = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
let PLACE_VISITORS = {};
// Lugares que son destino de alguna ruta de comunidad: el rol destino
// tiene prioridad — nunca se dibujan como simple "punto de partida".
let communityDestKeys = new Set();

function invalidateCommunityCache() { communityCache = { ambient: null, history: null, ts: 0 }; }

async function fetchCommunityRoutes(viewName, rowLimit = COMMUNITY_CONFIG.maxRoutes) {
  let query = supabaseClient.from(viewName).select('*');
  if (COMMUNITY_CONFIG.windowDays) {
    const since = new Date(Date.now() - COMMUNITY_CONFIG.windowDays * 86400000).toISOString().slice(0, 10);
    query = query.gte('date', since);
  }
  query = query.order('date', { ascending: false }).limit(rowLimit);
  const { data, error } = await query;
  if (error) { console.warn('Error cargando rutas de comunidad:', error); return []; }
  return data || [];
}

// Agrupa las filas por (origen, destino, libro): lecturas iguales suman
// visitors. Las lecturas del propio usuario se descuentan (el mapa ya las
// dibuja en rojo y su popup dice "también han llegado"); una ruta que se
// queda a 0 no se dibuja. Reconstruye PLACE_VISITORS con los datos reales.
function aggregateCommunityRoutes(rows) {
  const normalize = normalizeName;
  const ownCounts = {};
  // Resuelto: el descuento de lecturas propias compara contra el origen
  // real actual de cada entrada, no contra uno viudo.
  resolveEntries(entries).forEach(e => {
    const k = [normalize(e.fromName), normalize(e.dest), normalize(e.book)].join('|');
    ownCounts[k] = (ownCounts[k] || 0) + 1;
  });
  const routes = new Map();
  rows.forEach(row => {
    const fullKey = [normalize(row.from_name), normalize(row.dest), normalize(row.book)].join('|');
    let r = routes.get(fullKey);
    if (!r) {
      r = { from: [row.from_lat, row.from_lng], to: [row.dest_lat, row.dest_lng],
            fromName: row.from_name, toName: row.dest, book: row.book,
            fictional: !!row.fictional, country: row.country || '',
            visitors: 0, date: row.date };
      routes.set(fullKey, r);
    }
    r.visitors++;
    if (row.date > r.date) r.date = row.date; // ISO YYYY-MM-DD: la más reciente al fusionar
    if (ownCounts[fullKey]) { r.visitors--; ownCounts[fullKey]--; }
  });
  PLACE_VISITORS = {};
  const list = [];
  routes.forEach(r => {
    if (r.visitors <= 0) return; // solo lecturas propias: ya están en el mapa
    const pk = normalize(r.toName);
    // books se mantiene tal cual (lista de títulos, sin contadores): lo leen
    // los popups de las lecturas propias. bookCounts va en paralelo, para el
    // ranking de la tarjeta de destino. Cuenta FILAS del histórico, no
    // lectores distintos: la vista pública no expone user_id a propósito
    // (ver sql/2026-07-16-public-community-routes.sql), así que igual que
    // count, una relectura de la misma persona suma dos.
    if (!PLACE_VISITORS[pk]) PLACE_VISITORS[pk] = { count: 0, books: [], bookCounts: {}, country: '' };
    const place = PLACE_VISITORS[pk];
    place.count += r.visitors;
    if (!place.books.some(b => normalize(b) === normalize(r.book))) place.books.push(r.book);
    // Agrupa por título normalizado (mismo libro escrito distinto = un libro),
    // conservando la primera grafía vista como etiqueta.
    const bk = normalize(r.book);
    if (!place.bookCounts[bk]) place.bookCounts[bk] = { title: r.book, n: 0 };
    place.bookCounts[bk].n += r.visitors;
    if (!place.country && r.country) place.country = r.country; // filas viejas pueden no traerlo
    list.push(r);
  });
  return list.slice(0, COMMUNITY_CONFIG.maxRoutes);
}

const communityLayer = L.layerGroup();
// Pane para las zonas de click ampliadas de los puntos de comunidad:
// por encima del SVG de las rutas (overlayPane, 400) para ganar a la línea
// invisible ancha, pero por debajo de markerPane (600) para que el click
// exacto sobre un punto visible siga ganando al halo de un punto vecino.
map.createPane('communityHit').style.zIndex = 450;
// Pane de las sombras del histórico: bajo overlayPane (400), para que las
// líneas vivas de ambiente y el detalle queden siempre por encima.
map.createPane('communityFaint').style.zIndex = 390;
let communityVisible = localStorage.getItem('lev_show_community') !== 'false';
if (communityVisible) communityLayer.addTo(map);

function toggleCommunityLayer() {
  communityVisible = !communityVisible;
  localStorage.setItem('lev_show_community', communityVisible);
  updateCommunityToggleUI();
  if (communityVisible) {
    communityLayer.addTo(map);
    drawCommunityRoutes();
  } else {
    map.removeLayer(communityLayer);
    hideDestinationDetail(); // el detalle activo se cierra con la capa
  }
}

function updateCommunityToggleUI() {
  const btn = document.getElementById('community-toggle');
  if (!btn) return;
  btn.classList.toggle('off', !communityVisible);
  btn.title = communityVisible ? 'Ocultar las rutas de otros viajeros' : 'Mostrar las rutas de otros viajeros';
}
updateCommunityToggleUI();

// Consulta (si la caché caducó) y dibuja. La llaman el init, redrawMap y
// el toggle; los objetos agregados mantienen la forma del array antiguo,
// así que drawCommunityRoute no cambia ni en geometría ni en estilos.
async function drawCommunityRoutes() {
  if (!communityVisible) return;
  const stale = !communityCache.ambient || (Date.now() - communityCache.ts > COMMUNITY_CACHE_TTL);
  if (stale) {
    const [latestRows, historyRows] = await Promise.all([
      fetchCommunityRoutes('community_routes_latest_per_user'),
      fetchCommunityRoutes('public_community_routes', COMMUNITY_CONFIG.historyRows)
    ]);
    const ambient = aggregateCommunityRoutes(latestRows);
    const history = aggregateCommunityRoutes(historyRows); // la última: deja PLACE_VISITORS con el histórico
    communityCache = { ambient, history, ts: Date.now() };
  }
  renderCommunityRoutes();
}

// Solo redibuja desde la caché: nunca lanza la consulta (moveend/zoomend).
function renderCommunityRoutes() {
  communityLayer.clearLayers();
  if (!communityVisible || !communityCache.ambient) return;
  const drawnDestinations = new Set();
  const normalize = normalizeName;
  const userDestinations = new Set(entries.map(e => normalize(e.dest)));
  // Desde los datos, no desde lo dibujado: un destino que no se dibuja
  // (p. ej. destino propio) también veta el marcador de partida.
  communityDestKeys = new Set([...communityCache.ambient, ...communityCache.history].map(r => normalize(r.toName)));
  // El popup de la línea usa el recuento del histórico para la misma ruta:
  // la línea no puede decir «Una persona» cuando su punto dice «5 lectores».
  const keyOf = r => [normalize(r.fromName), normalize(r.toName), normalize(r.book)].join('|');
  const historyCounts = new Map(communityCache.history.map(r => [keyOf(r), r.visitors]));
  communityCache.ambient.forEach(r => {
    r.visitors = historyCounts.get(keyOf(r)) || r.visitors;
    drawCommunityRoute(r, drawnDestinations, userDestinations, normalize);
  });
  // Histórico completo: puntos + línea sombra por par de lugares. El Map
  // par origen|destino → rango ordinal por fecha gobierna el dedupe (una
  // sombra por par) y el gradiente temporal de opacidad; es local a cada
  // render. minTs/maxTs viajan en el propio Map para no ensanchar la firma.
  const shadowPairs = new Map();
  communityCache.history.forEach(r => {
    const pk = normalize(r.fromName) + '|' + normalize(r.toName);
    const ts = new Date(r.date).getTime();
    if (!shadowPairs.has(pk) || ts > shadowPairs.get(pk)) shadowPairs.set(pk, ts);
  });
  // Rango ordinal en vez de fecha absoluta: t equiespaciado por posición.
  // Rangos 1..N (el 0 sería falsy en el dedupe); con minTs=1 y maxTs=N la
  // normalización existente da t = índice/(N-1), y N===1 cae en t=1 (span 0).
  [...shadowPairs.entries()].sort((a, b) => a[1] - b[1])
    .forEach(([pk], i) => shadowPairs.set(pk, i + 1));
  shadowPairs.minTs = 1;
  shadowPairs.maxTs = shadowPairs.size;
  communityCache.history.forEach(r => drawCommunityRoute(r, drawnDestinations, userDestinations, normalize, communityLayer, shadowPairs));
}

// «Una persona ha llegado…» / «N lectores han llegado…»: con pocos
// testers habrá recuentos de 1 y "1 lectores" no puede aparecer.
// suffix vacío cierra la frase con punto: «leyendo:» solo puede escribirse
// cuando detrás va de verdad una lista de libros.
function communityCountHtml(n, color, suffix, tambien) {
  const strong = t => `<strong style="color:${color}">${t}</strong>`;
  const tail = suffix ? ` ${suffix}` : '.';
  return n === 1
    ? `${strong('Una persona')} ${tambien ? 'también ' : ''}ha llegado hasta aquí${tail}`
    : `${strong(n.toLocaleString() + ' lectores')} ${tambien ? 'también ' : ''}han llegado hasta aquí${tail}`;
}

// Rutas históricas completas hacia un destino, mostradas solo mientras
// ese punto está seleccionado. Capa aparte para no interferir con el
// ciclo de vida de la capa de ambiente (communityLayer).
const detailLayer = L.layerGroup().addTo(map);
let detailDestKey = null;

async function showDestinationDetail(destName) {
  if (!communityVisible) return; // el toggle manda sobre ambiente y detalle por igual
  const normalize = normalizeName;
  const key = normalize(destName);
  if (detailDestKey === key) { hideDestinationDetail(); return; } // pinchar el mismo punto lo cierra
  detailDestKey = key;
  detailLayer.clearLayers();

  const { data, error } = await supabaseClient
    .from('public_community_routes')   // vista existente, histórico completo
    .select('*')
    .ilike('dest', destName);          // insensible a mayúsculas, no a tildes (espec §3.3)
  if (error) { console.warn('Error cargando detalle de destino:', error); return; }
  if (detailDestKey !== key) return;   // se pinchó otro punto mientras cargaba

  const saved = PLACE_VISITORS;        // aggregate reconstruye PLACE_VISITORS como efecto
  const rows = aggregateCommunityRoutes(data); // lateral; aquí solo queremos la lista
  PLACE_VISITORS = saved;
  const drawnDestinations = new Set([key]); // el punto ya existe en la capa de ambiente
  const userDestinations = new Set(entries.map(e => normalize(e.dest)));
  rows.forEach(r => drawCommunityRoute(r, drawnDestinations, userDestinations, normalize, detailLayer));
}

function hideDestinationDetail() {
  detailDestKey = null;
  detailLayer.clearLayers();
}

map.on('click', hideDestinationDetail); // pinchar fuera cierra el detalle

// ===================== TARJETA DE DESTINO DE COMUNIDAD =====================

// Ancho de la tarjeta: lo usan el popup de Leaflet (minWidth/maxWidth) y el
// viewBox del SVG de la cabecera, que se dibuja contra estas medidas.
const DEST_CARD_W = 300, DEST_CARD_H = 100;

// --------------------- Continente por coordenadas ---------------------
// Se deriva de dest_lat/dest_lng, no del país: `country` viene de Nominatim
// en español con formas irregulares ("Estados Unidos de América", "Belarús")
// y falta en parte de las filas, mientras que las coordenadas están siempre.
//
// Cajas DELIBERADAMENTE CONSERVADORAS: es peor mostrar un continente
// equivocado que no mostrar ninguno. Un punto que no cae limpiamente dentro
// de una caja devuelve '' y la tarjeta omite el continente.
//
// Casos límite conocidos, excluidos a propósito de las cajas:
//  · Rusia: no se trata como país. Al ir por coordenadas, la parte al oeste
//    de los Urales (lng < 60) cae en Europa y el resto en Asia, que es lo
//    correcto y lo que un mapa país→continente no puede hacer.
//  · El Mediterráneo es el tramo delicado: Europa y África se solapan en
//    latitud (Málaga 36,7°N está al SUR de Túnez 36,8°N), así que Europa se
//    parte por tramos de longitud en vez de usar una sola caja:
//      lng -10..8   → Europa desde 36,2°N (bajo el Estrecho: Tánger 35,8
//                     cae en África, Málaga 36,7 en Europa)
//      lng 8..26    → Europa desde 37,6°N (sobre el cabo Angela 37,35, el
//                     punto más al norte de Túnez; Atenas y Palermo entran)
//      lng 26..40   → Europa desde 41°N (deja fuera Anatolia; Ankara 39,9
//                     no da continente, Estambul 41,0 sí da EUROPA, que es
//                     correcto: su lado europeo lo es)
//  · Cáucaso, Levante y Sinaí: fuera de todas las cajas → sin continente
//    (Jerusalén 31,8/35,2 no da ninguno, a propósito).
//  · Centroamérica y el Caribe (lat 8-25, lng -92..-60): frontera
//    Norteamérica/Sudamérica → fuera de las cajas, sin continente.
//  · Hawái, Islandia y las islas del Pacífico y el Atlántico medio quedan
//    fuera → sin continente, en vez de asignarlas a la fuerza.
const DEST_CONTINENT_BOXES = [
  // [nombre, latMin, latMax, lngMin, lngMax]
  ['EUROPA',      36.2,  71,  -10,    8],  // Iberia, Francia, UK, Escandinavia
  ['EUROPA',      37.6,  71,    8,   26],  // Italia, Centroeuropa, Balcanes
  ['EUROPA',        41,  71,   26,   40],  // Grecia norte, Rumanía, Ucrania
  ['EUROPA',        50,  71,   40,   60],  // Rusia al oeste de los Urales
  ['ASIA',          10,  55,   60,  145],  // desde los Urales hacia el este
  ['ASIA',          20,  46,   45,   60],  // Península Arábiga oriental e Irán
  ['ÁFRICA',       -35,  36,  -17,    8],  // Marruecos y Argelia occidental
  ['ÁFRICA',       -35, 37.4,   8,   25],  // Túnez y Libia
  ['ÁFRICA',       -27,  31,   25,   34],  // Egipto y Sudán, sin el Levante
  ['ÁFRICA',       -27,  15,   34,   43],  // Cuerno de África
  ['NORTEAMÉRICA',  25,  72, -168,  -55],  // sin Centroamérica ni Caribe
  ['SUDAMÉRICA',   -55,   0,  -82,  -34],  // desde el ecuador hacia el sur
  ['OCEANÍA',      -48, -10,  112,  180]   // Australia y Nueva Zelanda
];

function continentFor(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return '';
  const hit = DEST_CONTINENT_BOXES.filter(b => lat >= b[1] && lat <= b[2] && lng >= b[3] && lng <= b[4]);
  // Si dos cajas se solapan sobre el mismo punto, la zona es ambigua: fuera.
  const names = new Set(hit.map(b => b[0]));
  return names.size === 1 ? hit[0][0] : '';
}

// --------------------- Cabecera ---------------------
// Fragmento real del basemap centrado en el destino. Variante SIN ETIQUETAS
// (light_nolabels): con las etiquetas, el rótulo de la ciudad repetía el
// título de la tarjeta justo debajo.
// z11 elegido sobre la comparativa z8/z11/z14: z8 deja casi vacías las
// cabeceras de destinos de interior (Madrid es una maraña sin forma) y z14
// da textura pero ya no sitúa. z11 es el único legible en ambos casos.
const DEST_CARD_ZOOM = 11;

function destCardTilesHtml(lat, lng) {
  const z = DEST_CARD_ZOOM, n = Math.pow(2, z);
  const latRad = lat * Math.PI / 180;
  // Posición del destino en píxeles absolutos del nivel de zoom (slippy map).
  const px = (lng + 180) / 360 * n * 256;
  const py = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n * 256;
  const tx = Math.floor(px / 256), ty = Math.floor(py / 256);
  // Desplazamiento de la cuadrícula 3x3 para que (px,py) caiga en el centro
  // de la franja, que es donde va el anillo.
  const left = DEST_CARD_W / 2 - (px - (tx - 1) * 256);
  const top = DEST_CARD_H / 2 - (py - (ty - 1) * 256);
  let tiles = '';
  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 3; dx++) {
      const x = tx - 1 + dx, y = ty - 1 + dy;
      if (y < 0 || y >= n) continue;              // fuera de los polos: hueco
      const wrapX = ((x % n) + n) % n;            // el mundo da la vuelta en x
      const url = `https://a.basemaps.cartocdn.com/light_nolabels/${z}/${wrapX}/${y}@2x.png`;
      tiles += `<img class="dest-card-tile" src="${url}" alt="" style="left:${dx * 256}px;top:${dy * 256}px">`;
    }
  }
  return `<div class="dest-card-tiles" style="left:${left}px;top:${top}px">${tiles}</div>
      <span class="dest-card-tint"></span>`;
}

// --------------------- Constelación (ficticios) ---------------------
// Los destinos ficticios NO llevan tiles: sus coordenadas son inventadas y
// enseñaríamos un lugar real que no les corresponde. En su lugar, una
// constelación generada. La semilla sale del nombre, así que cada ficticio
// tiene siempre la suya, entre aperturas y entre sesiones — con azar de
// verdad la cabecera cambiaría en cada apertura y parecería un fallo.
function destCardSeed(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const DEST_STAR_MIN_CENTER = 34;   // radio libre alrededor del anillo
const DEST_STAR_MIN_GAP = 26;      // separación mínima entre estrellas

function destCardConstellationSvg(name) {
  let s = destCardSeed(name);
  const rnd = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) % 100000) / 100000; };
  const W = DEST_CARD_W, H = DEST_CARD_H, cx = W / 2, cy = H / 2;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // Estrellas por muestreo con rechazo. El objetivo es 7-10, pero las dos
  // restricciones (hueco central + separación) pueden no dejar sitio para
  // todas en una franja de 300x100: se acepta quedarse corto antes que
  // amontonarlas.
  const target = 7 + Math.floor(rnd() * 4);
  const stars = [];
  for (let a = 0; a < 400 && stars.length < target; a++) {
    const p = { x: 6 + rnd() * (W - 12), y: 6 + rnd() * (H - 12) };
    if (Math.hypot(p.x - cx, p.y - cy) < DEST_STAR_MIN_CENTER) continue;
    if (stars.some(q => dist(p, q) < DEST_STAR_MIN_GAP)) continue;
    p.r = (0.9 + rnd() * 1.9).toFixed(2);
    stars.push(p);
  }

  // Árbol de expansión (Prim) arrancando del centro: el anillo del marcador
  // es la estrella principal, así que las líneas nacen de él.
  const nodes = [{ x: cx, y: cy }].concat(stars);
  const linked = [0], pending = nodes.map((_, i) => i).slice(1), edges = [];
  while (pending.length) {
    let best = null;
    linked.forEach(i => pending.forEach(j => {
      const d = dist(nodes[i], nodes[j]);
      if (!best || d < best.d) best = { i, j, d };
    }));
    edges.push([best.i, best.j]);
    linked.push(best.j);
    pending.splice(pending.indexOf(best.j), 1);
  }
  // Una arista extra entre dos estrellas ya conectadas, para cerrar un
  // triángulo y que no se lea como un árbol perfecto.
  if (stars.length > 2) {
    const a = 1 + Math.floor(rnd() * stars.length);
    let b = null;
    nodes.forEach((n, j) => {
      if (j === a || j === 0) return;
      if (edges.some(e => (e[0] === a && e[1] === j) || (e[0] === j && e[1] === a))) return;
      const d = dist(nodes[a], n);
      if (!b || d < b.d) b = { j, d };
    });
    if (b) edges.push([a, b.j]);
  }

  const links = edges.map(([i, j]) =>
    `<line x1="${nodes[i].x.toFixed(1)}" y1="${nodes[i].y.toFixed(1)}" x2="${nodes[j].x.toFixed(1)}" y2="${nodes[j].y.toFixed(1)}"/>`).join('');
  const pts = stars.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.r}"/>`).join('');
  let dust = '';
  for (let i = 0; i < 16; i++) {
    dust += `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(rnd() * H).toFixed(1)}" r="${(0.3 + rnd() * 0.55).toFixed(2)}" opacity="${(0.12 + rnd() * 0.20).toFixed(2)}"/>`;
  }

  return `<svg class="dest-card-sky" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <g class="dc-dust">${dust}</g>
      <g class="dc-link">${links}</g>
      <g class="dc-star">${pts}</g>
    </svg>`;
}

function destCardHeaderHtml(name, lat, lng, fictional) {
  return `<div class="dest-card-header">
        ${fictional ? destCardConstellationSvg(name) : destCardTilesHtml(lat, lng)}
        <span class="dest-card-fade"></span>
        <span class="dest-card-pin"></span>
      </div>`;
}

// --------------------- Ranking ---------------------
const DEST_CARD_ALSO = 3;      // filas visibles en "también os han traído"
const DEST_CARD_FLAT = 4;      // filas visibles en la lista plana de empate

// Fila del ranking.
//  · first: badge teal y cifra en teal (solo con un nº1 estricto).
//  · count: false oculta el contador — con un único título la cifra ya
//    está en la caja de stats y repetirla es ruido.
function destCardRankRow(book, pos, first, count) {
  const n = book.n.toLocaleString();
  const lectores = first ? (book.n === 1 ? '1 lector' : `${n} lectores`) : n;
  return `<div class="dest-card-rank">
      <span class="dest-card-badge${first ? ' is-first' : ''}">${pos}</span>
      <span class="dest-card-rank-title"><em>${esc(book.title)}</em></span>
      ${count ? `<span class="dest-card-rank-n">${lectores}</span>` : ''}
    </div>`;
}

// Bloque de filas ocultas + botón de expandir, común a los dos modos.
function destCardMoreHtml(hidden, fromPos, total) {
  if (!hidden.length) return '';
  const label = `Ver los ${total} títulos`;
  return `<div class="dest-card-more">${hidden.map((b, i) => destCardRankRow(b, fromPos + i, false, true)).join('')}</div>
      <button type="button" class="dest-card-toggle" aria-expanded="false" onclick="toggleDestCardBooks(this, event)"
        data-more="${label}" data-less="Ver menos">${label}</button>`;
}

// Devuelve '' si no hay lista: quien llama decide el fallback (el copy del
// misterio, sin cabeceras de sección ni estructura de ranking).
function destCardBooksHtml(bookCounts) {
  const list = Object.values(bookCounts || {}).sort((a, b) => b.n - a.n);
  if (!list.length) return '';

  // Un solo título: sin contador en la fila (la caja de stats ya da esa
  // cifra), pero el badge SÍ va coloreado — es el nº1 legítimo del destino.
  // El gris está reservado al empate, que es donde el orden es arbitrario.
  if (list.length === 1) {
    return `<div class="dest-card-section">El libro que os ha traído aquí</div>
      ${destCardRankRow(list[0], 1, true, false)}`;
  }

  // Sin un nº1 estricto no hay ganador que destacar: lista plana, todos los
  // badges en gris y ningún contador en verde. Es el caso habitual mientras
  // la comunidad sea pequeña y casi ningún libro se repita en un destino.
  if (list[0].n === list[1].n) {
    const shown = list.slice(0, DEST_CARD_FLAT);
    const hidden = list.slice(DEST_CARD_FLAT);
    return `<div class="dest-card-section">Los libros que os han traído aquí</div>
      ${shown.map((b, i) => destCardRankRow(b, i + 1, false, true)).join('')}
      ${destCardMoreHtml(hidden, DEST_CARD_FLAT + 1, list.length)}`;
  }

  const rest = list.slice(1);
  const shown = rest.slice(0, DEST_CARD_ALSO);
  const hidden = rest.slice(DEST_CARD_ALSO);
  return `<div class="dest-card-section">El libro que más os ha traído aquí</div>
      ${destCardRankRow(list[0], 1, true, true)}
      <hr class="dest-card-div">
      <div class="dest-card-section">También os han traído</div>
      ${shown.map((b, i) => destCardRankRow(b, i + 2, false, true)).join('')}
      ${destCardMoreHtml(hidden, shown.length + 2, list.length)}`;
}

// Expande/contrae la lista dentro de la tarjeta.
//
// Dos cosas que parecen omisiones y no lo son:
//  · stopPropagation NO es opcional: el click llega al contenedor del mapa,
//    que con closeOnClick (por defecto) cierra el popup. Sin esto, pulsar el
//    toggle cerraba la tarjeta en vez de expandirla.
//  · NO se llama a popup.update(): re-renderiza el contenido desde el HTML
//    enlazado y se lleva por delante la clase is-expanded y el texto del
//    botón. Tampoco hace falta: el popup está anclado por abajo al marcador,
//    así que la tarjeta crece hacia arriba y el piquito no se mueve.
//    Contrapartida asumida: si la tarjeta expandida se sale por arriba,
//    Leaflet ya no reencuadra (un panBy dispararía moveend, que redibuja la
//    capa de comunidad y cerraría el popup).
function toggleDestCardBooks(btn, ev) {
  if (ev) ev.stopPropagation();
  const card = btn.closest('.dest-card');
  const open = card.classList.toggle('is-expanded');
  btn.textContent = open ? btn.dataset.less : btn.dataset.more;
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

// --------------------- Tarjeta ---------------------
function destCardHtml(name, lat, lng, fictional, vData, fallbackCount) {
  const count = vData ? vData.count : fallbackCount;
  const titles = vData && vData.books ? vData.books.length : 0;
  const booksHtml = vData ? destCardBooksHtml(vData.bookCounts) : '';
  // En ficticios NUNCA se muestra geografía real: ni país (aunque una fila
  // sucia lo traiga relleno) ni continente derivado de sus coordenadas.
  let country = !fictional && vData && vData.country ? vData.country : '';
  // Destinos que son el país entero ("Francia", "Nigeria"): repetir el nombre
  // debajo del título no aporta nada. Misma normalización que el resto del
  // mapa, para que acentos y mayúsculas no cuenten como diferencia.
  if (country && normalizeName(country).trim() === normalizeName(name).trim()) country = '';
  const continent = fictional ? '' : continentFor(lat, lng);
  const geo = [country, continent].filter(Boolean).join(' · ');
  // Sin libros que listar la frase se cierra y el misterio se nombra: nunca
  // unos dos puntos huérfanos.
  const fallback = count === 1
    ? 'El libro que la trajo aún es un misterio.'
    : 'Sus libros aún son un misterio.';
  return `<div class="dest-card${fictional ? ' is-fictional' : ''}">
      ${destCardHeaderHtml(name, lat, lng, fictional)}
      <div class="dest-card-body">
        <h3 class="dest-card-title">${fictional ? '✦ ' : ''}${esc(name)}</h3>
        ${geo ? `<div class="dest-card-geo">${esc(geo)}</div>` : ''}
        <div class="dest-card-stats">
          <div class="dest-card-stat">
            <b>${count.toLocaleString()}</b>
            <span>${count === 1 ? 'lector ha llegado aquí' : 'lectores han llegado aquí'}</span>
          </div>
          ${titles ? `<div class="dest-card-stat">
            <b>${titles.toLocaleString()}</b>
            <span>${titles === 1 ? 'título' : 'títulos distintos'}</span>
          </div>` : ''}
        </div>
        ${booksHtml || `<p class="dest-card-fallback">${fallback}</p>`}
      </div>
    </div>`;
}

// targetLayer permite reutilizar la función desde el detalle (detailLayer);
// shadowPairs (Map par → timestamp de la ruta más reciente) marca el modo histórico:
// puntos + línea sombra tenue no interactiva en vez de la línea viva.
function drawCommunityRoute(r, drawnDestinations, userDestinations, normalize, targetLayer, shadowPairs) {
  normalize = normalize || normalizeName;
  targetLayer = targetLayer || communityLayer;
  const fromKey = normalize(r.fromName);
  const destKey = normalize(r.toName);
    const p1 = { lat: r.from[0], lng: r.from[1] };
    const p2 = { lat: r.to[0], lng: r.to[1] };
    const midLat = (p1.lat + p2.lat) / 2;
    const midLng = (p1.lng + p2.lng) / 2;
    const dLat = p2.lat - p1.lat, dLng = p2.lng - p1.lng;
    const dist = Math.sqrt(dLat*dLat + dLng*dLng);
    const curvature = Math.min(dist * 0.2, 10);
    const perpLat = -dLng/(dist||1)*curvature, perpLng = dLat/(dist||1)*curvature;
    const steps = 30, points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push([
        (1-t)*(1-t)*p1.lat + 2*(1-t)*t*(midLat+perpLat) + t*t*p2.lat,
        (1-t)*(1-t)*p1.lng + 2*(1-t)*t*(midLng+perpLng) + t*t*p2.lng
      ]);
    }
    const color = r.fictional ? 'rgba(232,145,60,0.6)' : 'rgba(29,158,117,0.55)';
    const highlightColor = r.fictional ? '#e8913c' : 'var(--teal)';
    if (shadowPairs) {
      const pairKey = fromKey + '|' + destKey;
      const pairTs = shadowPairs.get(pairKey);
      if (pairTs) {
        shadowPairs.delete(pairKey); // una sola sombra por par de lugares
        // t ∈ [0,1]: 0 = par más antiguo del histórico, 1 = más reciente
        const span = shadowPairs.maxTs - shadowPairs.minTs;
        const t = span > 0 ? (pairTs - shadowPairs.minTs) / span : 1;
        const alpha = 0.16 + 0.24 * t * t; // cuadrática: base 0.16, techo 0.40
        L.polyline(points, {
          pane: 'communityFaint',
          color: r.fictional ? `rgba(232,145,60,${alpha})` : `rgba(29,158,117,${alpha})`,
          weight: 1.25,
          interactive: false
        }).addTo(targetLayer);
      }
    }
    if (!shadowPairs) {
      // bubblingMouseEvents:false — que abrir el popup de una línea no dispare
      // el click del mapa (cerraría el detalle activo). La línea visible no es
      // interactiva: los clicks pasan a esta línea ancha, que tiene el popup.
      L.polyline(points, { color: 'transparent', weight: 12, opacity: 1, bubblingMouseEvents: false })
        .addTo(targetLayer)
        .bindPopup(`
          <div class="popup-book" style="font-size:0.85rem">${r.fictional ? '✦ ' : ''}${r.toName}</div>
          <div class="popup-place" style="font-size:0.75rem;color:#888">${r.fromName} → ${r.toName} · <em>${r.book}</em></div>
          <div class="popup-community">
            ${communityCountHtml(r.visitors, highlightColor, 'leyendo este libro')}
          </div>
        `);
      L.polyline(points, { color, weight: 2, opacity: 1, dashArray: '5 5', interactive: false }).addTo(targetLayer);
    }

    if (!drawnDestinations.has(fromKey) && !userDestinations.has(fromKey) && !communityDestKeys.has(fromKey)) {
      drawnDestinations.add(fromKey);
      const fromIcon = L.divIcon({
        className: '',
        html: `<div style="width:7px;height:7px;background:rgba(29,158,117,0.5);border-radius:50%;border:1.5px solid rgba(29,158,117,0.7)"></div>`,
        iconSize: [7,7], iconAnchor: [3.5,3.5]
      });
      const fromPopup = `
        <div class="popup-book" style="font-size:0.85rem">${r.fromName}</div>
        <div class="popup-place" style="font-size:0.75rem;color:#888">Punto de partida de lectores de la comunidad</div>
      `;
      L.marker(r.from, { icon: fromIcon }).addTo(targetLayer).bindPopup(fromPopup);
      // Zona de click ampliada: círculo invisible con el mismo popup, para que
      // un click cerca del punto no se lo lleve la línea ancha de la ruta.
      L.circleMarker(r.from, { pane: 'communityHit', radius: 11, stroke: false, fillOpacity: 0, bubblingMouseEvents: false })
        .addTo(targetLayer).bindPopup(fromPopup);
    }

    const vData = PLACE_VISITORS[destKey];

    if (!drawnDestinations.has(destKey) && !userDestinations.has(destKey)) {
      drawnDestinations.add(destKey);
      const icon = L.divIcon({
        className: '',
        html: r.fictional
          ? `<div style="width:10px;height:10px;background:rgba(232,145,60,0.15);border-radius:50%;border:1.5px solid rgba(232,145,60,0.8);display:flex;align-items:center;justify-content:center;font-size:7px;color:rgba(232,145,60,0.9);line-height:1">✦</div>`
          : `<div style="width:7px;height:7px;background:rgba(29,158,117,0.5);border-radius:50%;border:1.5px solid rgba(29,158,117,0.7)"></div>`,
        iconSize: r.fictional ? [10,10] : [7,7], iconAnchor: r.fictional ? [5,5] : [3.5,3.5]
      });
      const destPopup = destCardHtml(r.toName, r.to[0], r.to[1], r.fictional, vData, r.visitors);
      // maxWidth fijo: la cabecera de mapa se calcula contra DEST_CARD_W, y a
      // 380px de viewport la tarjeta sigue cabiendo con mapa alrededor.
      const destPopupOpts = { className: 'dest-popup', maxWidth: DEST_CARD_W, minWidth: DEST_CARD_W };
      L.marker(r.to, { icon }).addTo(targetLayer).on('click', () => showDestinationDetail(r.toName)).bindPopup(destPopup, destPopupOpts);
      // Zona de click ampliada del destino: mismo popup y mismo detalle.
      L.circleMarker(r.to, { pane: 'communityHit', radius: 11, stroke: false, fillOpacity: 0, bubblingMouseEvents: false })
        .addTo(targetLayer).on('click', () => showDestinationDetail(r.toName)).bindPopup(destPopup, destPopupOpts);
    }
}

map.on('moveend zoomend', renderCommunityRoutes);
