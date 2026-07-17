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

function addDestMarker(entry) {
  const color = entry.fictional ? '#e8913c' : '#e8593c';
  const size = entry.fictional ? 12 : 10;
  const isCurrent = entries.length > 0 && typeof currentEntry === 'function' && currentEntry() === entry;
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
        ? `<button onclick="openPostalFromEl(this)" data-dest="${esc(entry.dest)}" data-book="${esc(entry.book||'')}" data-fictional="${!!entry.fictional}" style="background:none;border:1px solid rgba(29,158,117,0.3);border-radius:12px;padding:3px 10px;font-size:0.68rem;color:var(--teal);cursor:pointer;font-family:'Inter',sans-serif;">✉️ Enviar postal</button>`
        : `<span style="font-size:0.68rem;color:#aaa;font-style:italic;">Solo puedes enviar postales desde tu destino actual</span>`}
    </div>
  `);
}

function redrawMap() {
  markersLayer.clearLayers();
  map.eachLayer(l => { if (l instanceof L.Polyline) map.removeLayer(l); });
  if (origin) addOriginMarker();
  sortedFiltered().forEach(e => { drawRoute(e); addDestMarker(e); });
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

async function fetchCommunityRoutes(viewName) {
  let query = supabaseClient.from(viewName).select('*');
  if (COMMUNITY_CONFIG.windowDays) {
    const since = new Date(Date.now() - COMMUNITY_CONFIG.windowDays * 86400000).toISOString().slice(0, 10);
    query = query.gte('date', since);
  }
  query = query.order('date', { ascending: false }).limit(COMMUNITY_CONFIG.maxRoutes);
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
  entries.forEach(e => {
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
            fictional: !!row.fictional, visitors: 0, date: row.date };
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
    if (!PLACE_VISITORS[pk]) PLACE_VISITORS[pk] = { count: 0, books: [] };
    PLACE_VISITORS[pk].count += r.visitors;
    if (!PLACE_VISITORS[pk].books.some(b => normalize(b) === normalize(r.book))) PLACE_VISITORS[pk].books.push(r.book);
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
  btn.title = communityVisible ? 'Ocultar las rutas de la comunidad' : 'Mostrar las rutas de la comunidad';
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
      fetchCommunityRoutes('public_community_routes')
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
  // par origen|destino → timestamp más reciente gobierna el dedupe (una
  // sombra por par) y el gradiente temporal de opacidad; es local a cada
  // render. minTs/maxTs viajan en el propio Map para no ensanchar la firma.
  const shadowPairs = new Map();
  communityCache.history.forEach(r => {
    const pk = normalize(r.fromName) + '|' + normalize(r.toName);
    const ts = new Date(r.date).getTime();
    if (!shadowPairs.has(pk) || ts > shadowPairs.get(pk)) shadowPairs.set(pk, ts);
  });
  shadowPairs.minTs = Math.min(...shadowPairs.values());
  shadowPairs.maxTs = Math.max(...shadowPairs.values());
  communityCache.history.forEach(r => drawCommunityRoute(r, drawnDestinations, userDestinations, normalize, communityLayer, shadowPairs));
}

// «Una persona ha llegado…» / «N lectores han llegado…»: con pocos
// testers habrá recuentos de 1 y "1 lectores" no puede aparecer.
function communityCountHtml(n, color, suffix, tambien) {
  const strong = t => `<strong style="color:${color}">${t}</strong>`;
  return n === 1
    ? `${strong('Una persona')} ${tambien ? 'también ' : ''}ha llegado hasta aquí ${suffix}`
    : `${strong(n.toLocaleString() + ' lectores')} ${tambien ? 'también ' : ''}han llegado hasta aquí ${suffix}`;
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
    const booksHtml = vData && vData.books.length
      ? vData.books.slice(0,3).map(b => `<div style="font-size:0.7rem;color:#888;font-style:italic">· ${b}</div>`).join('')
      : '';

    if (!drawnDestinations.has(destKey) && !userDestinations.has(destKey)) {
      drawnDestinations.add(destKey);
      const icon = L.divIcon({
        className: '',
        html: r.fictional
          ? `<div style="width:10px;height:10px;background:rgba(232,145,60,0.15);border-radius:50%;border:1.5px solid rgba(232,145,60,0.8);display:flex;align-items:center;justify-content:center;font-size:7px;color:rgba(232,145,60,0.9);line-height:1">✦</div>`
          : `<div style="width:7px;height:7px;background:rgba(29,158,117,0.5);border-radius:50%;border:1.5px solid rgba(29,158,117,0.7)"></div>`,
        iconSize: r.fictional ? [10,10] : [7,7], iconAnchor: r.fictional ? [5,5] : [3.5,3.5]
      });
      const destPopup = `
        <div class="popup-book" style="font-size:0.85rem">${r.fictional ? '✦ ' : ''}${r.toName}</div>
        <div class="popup-community">
          ${communityCountHtml(vData ? vData.count : r.visitors, highlightColor, 'leyendo:')}
          ${booksHtml}
        </div>
      `;
      L.marker(r.to, { icon }).addTo(targetLayer).on('click', () => showDestinationDetail(r.toName)).bindPopup(destPopup);
      // Zona de click ampliada del destino: mismo popup y mismo detalle.
      L.circleMarker(r.to, { pane: 'communityHit', radius: 11, stroke: false, fillOpacity: 0, bubblingMouseEvents: false })
        .addTo(targetLayer).on('click', () => showDestinationDetail(r.toName)).bindPopup(destPopup);
    }
}

map.on('moveend zoomend', renderCommunityRoutes);
