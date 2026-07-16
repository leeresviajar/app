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
  L.marker([entry.destLat, entry.destLng], { icon }).addTo(markersLayer).bindPopup(`
    <div class="popup-book">${esc(entry.book)}${entry.author ? ` <span style="font-weight:400;font-style:normal;font-size:0.8rem;color:#888">— ${esc(entry.author)}</span>` : ''}</div>
    <div class="popup-place">${entry.fictional ? '✦ ' : ''}${esc(entry.dest)}</div>
    <div class="popup-km">+${entry.km.toLocaleString()} km desde ${esc(entry.fromName)}</div>
    ${entry.note ? `<div style="font-size:0.75rem;color:#888;font-style:italic;margin-top:4px;">"${esc(entry.note)}"</div>` : ''}
    ${(() => {
      const key = entry.dest.toLowerCase();
      const vData = PLACE_VISITORS[key];
      if (vData) {
        const others = vData.books.filter(b => b !== entry.book).slice(0,2);
        const nowCount = COMMUNITY_ROUTES.filter(r => r.toName.toLowerCase() === key && r.now >= 2).reduce((s,r) => s + r.now, 0);
        const highlightColor = entry.fictional ? '#e8913c' : 'var(--teal)';
        return `<div class="popup-community">
          <strong style="color:${highlightColor}">${vData.count.toLocaleString()} lectores</strong> también han llegado hasta aquí leyendo:
          ${others.length ? '<br>' + others.map(b => `<span style="font-size:0.7rem;color:#aaa;font-style:italic">· ${b}</span>`).join(' ') : ''}
          ${nowCount >= 2 ? `<br><span style="color:${highlightColor};font-weight:500">● ${nowCount} leyendo aquí ahora mismo</span>` : ''}
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
const COMMUNITY_ROUTES = [
  { from: [40.4,-3.7],  to: [41.4,2.17],  book: 'La sombra del viento',              reader: 'Elena',    fromName: 'Madrid',      toName: 'Barcelona',    fictional: false, visitors: 312,  now: 4  },
  { from: [51.5,-0.1],  to: [53.3,-6.26], book: 'Ulises',                             reader: 'Carlos',   fromName: 'Londres',     toName: 'Dublín',       fictional: false, visitors: 429,  now: 6  },
  { from: [48.8,2.35],  to: [55.7,12.6],  book: 'La señorita Smilla',                 reader: 'Marc',     fromName: 'París',       toName: 'Copenhague',   fictional: false, visitors: 203,  now: 2  },
  { from: [52.5,13.4],  to: [48.2,16.4],  book: 'El proceso',                         reader: 'Nina',     fromName: 'Berlín',      toName: 'Viena',        fictional: false, visitors: 387,  now: 5  },
  { from: [48.8,2.35],  to: [43.8,11.2],  book: 'Inferno',                            reader: 'Laura',    fromName: 'París',       toName: 'Florencia',    fictional: false, visitors: 521,  now: 8  },
  { from: [41.4,2.17],  to: [38.7,-9.1],  book: 'Sostiene Pereira',                   reader: 'Tomás',    fromName: 'Barcelona',   toName: 'Lisboa',       fictional: false, visitors: 298,  now: 3  },
  { from: [59.9,10.7],  to: [60.2,24.9],  book: 'Los juegos del hambre',              reader: 'Ingrid',   fromName: 'Oslo',        toName: 'Helsinki',     fictional: false, visitors: 167,  now: 2  },
  { from: [51.5,-0.1],  to: [57.0,-4.0],  book: 'Harry Potter y la piedra filosofal', reader: 'Marcos',   fromName: 'Londres',     toName: 'Hogwarts',     fictional: true,  visitors: 1847, now: 23 },
  { from: [52.5,13.4],  to: [52.7,-1.8],  book: 'El Señor de los Anillos',            reader: 'Nina',     fromName: 'Berlín',      toName: 'La Comarca',   fictional: true,  visitors: 1842, now: 19 },
  { from: [43.3,-1.9],  to: [55.0,-2.0],  book: 'Canción de hielo y fuego',           reader: 'Iker',     fromName: 'San Sebastián', toName: 'Winterfell', fictional: true,  visitors: 2891, now: 39 },
  { from: [59.9,10.7],  to: [46.5,8.0],   book: 'El Señor de los Anillos',            reader: 'Ingrid',   fromName: 'Oslo',        toName: 'Rivendell',    fictional: true,  visitors: 1102, now: 12 },
  { from: [53.3,-6.26], to: [48.5,17.0],  book: 'Memorias de Idhún',                  reader: 'Rían',     fromName: 'Dublín',      toName: 'Nanetten',     fictional: true,  visitors: 143,  now: 2  },
];

const communityLayer = L.layerGroup();
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
  }
}

function updateCommunityToggleUI() {
  const btn = document.getElementById('community-toggle');
  if (!btn) return;
  btn.classList.toggle('off', !communityVisible);
  btn.title = communityVisible ? 'Ocultar las rutas de la comunidad' : 'Mostrar las rutas de la comunidad';
}
updateCommunityToggleUI();

const PLACE_VISITORS = {};
COMMUNITY_ROUTES.forEach(r => {
  const key = r.toName.toLowerCase();
  if (!PLACE_VISITORS[key]) PLACE_VISITORS[key] = { count: 0, books: [] };
  PLACE_VISITORS[key].count += r.visitors;
  if (!PLACE_VISITORS[key].books.includes(r.book)) PLACE_VISITORS[key].books.push(r.book);
});

function drawCommunityRoutes() {
  if (!communityVisible) return;
  communityLayer.clearLayers();
  const drawnDestinations = new Set();
  const normalize = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const userDestinations = new Set(entries.map(e => normalize(e.dest)));
  COMMUNITY_ROUTES.forEach(r => drawCommunityRoute(r, drawnDestinations, userDestinations, normalize));
}

function drawCommunityRoute(r, drawnDestinations, userDestinations, normalize) {
  normalize = normalize || (s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
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
    L.polyline(points, { color: 'transparent', weight: 12, opacity: 1 })
      .addTo(communityLayer)
      .bindPopup(`
        <div class="popup-book" style="font-size:0.85rem">${r.fictional ? '✦ ' : ''}${r.toName}</div>
        <div class="popup-place" style="font-size:0.75rem;color:#888">${r.fromName} → ${r.toName} · <em>${r.book}</em></div>
        <div class="popup-community">
          <strong style="color:${highlightColor}">${r.visitors.toLocaleString()} lectores</strong> han llegado hasta aquí leyendo:
          ${r.now >= 2 ? `<br><span style="color:${highlightColor};font-weight:500">● ${r.now} leyendo aquí ahora mismo</span>` : ''}
        </div>
      `);
    L.polyline(points, { color, weight: 2, opacity: 1, dashArray: '5 5' }).addTo(communityLayer);

    if (!drawnDestinations.has(fromKey) && !userDestinations.has(fromKey)) {
      drawnDestinations.add(fromKey);
      const fromIcon = L.divIcon({
        className: '',
        html: `<div style="width:7px;height:7px;background:rgba(29,158,117,0.5);border-radius:50%;border:1.5px solid rgba(29,158,117,0.7)"></div>`,
        iconSize: [7,7], iconAnchor: [3.5,3.5]
      });
      L.marker(r.from, { icon: fromIcon }).addTo(communityLayer).bindPopup(`
        <div class="popup-book" style="font-size:0.85rem">${r.fromName}</div>
        <div class="popup-place" style="font-size:0.75rem;color:#888">Punto de partida de lectores de la comunidad</div>
      `);
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
      L.marker(r.to, { icon }).addTo(communityLayer).bindPopup(`
        <div class="popup-book" style="font-size:0.85rem">${r.fictional ? '✦ ' : ''}${r.toName}</div>
        <div class="popup-community">
          <strong style="color:${highlightColor}">${vData ? vData.count.toLocaleString() : r.visitors} lectores</strong> han llegado hasta aquí leyendo:
          ${booksHtml}
          ${r.now >= 2 ? `<br><span style="color:${highlightColor};font-weight:500">● ${r.now} leyendo aquí ahora mismo</span>` : ''}
        </div>
      `);
    }
}

map.on('moveend zoomend', drawCommunityRoutes);
