// ===================== ORIGIN =====================
const META_PIN_SVG = '<svg class="meta-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
const META_CAL_SVG = '<svg class="meta-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>';

// Única fuente de verdad de "desde dónde sale este viaje". La comparten
// addEntry() y el render de la meta-línea, para que no puedan discrepar.
// Devuelve siempre modo y nombre; las coordenadas solo cuando se saben sin
// preguntar a nadie: 'other' exige geocodificar y eso es asíncrono, así que
// lo resuelve addEntry() encima de esto. El render nunca geocodifica.
// `error` dice por qué no hay origen, y quien llama decide si avisa.
function resolveOrigen() {
  // Sin viajes previos no hay cadena que seguir: el primero sale de casa
  // sea cual sea el modo elegido. Es la regla que ya aplicaba addEntry().
  if (departure === 'home' || entries.length === 0) {
    if (!origin) return { mode: 'home', name: null, coords: null, error: 'sin-origen' };
    return { mode: 'home', name: origin.name, coords: { lat: origin.lat, lng: origin.lng } };
  }
  if (departure === 'last') {
    const last = currentEntry();
    if (!last) return { mode: 'last', name: null, coords: null, error: 'sin-origen' };
    return { mode: 'last', name: last.dest, coords: { lat: last.destLat, lng: last.destLng } };
  }
  const other = document.getElementById('dep-other-input').value.trim();
  if (!other) return { mode: 'other', name: null, coords: null, error: 'sin-lugar' };
  return { mode: 'other', name: other, coords: null };
}

// Pinta la meta-línea y sincroniza el panel. Conserva el nombre antiguo
// porque storage.js la llama en tres sitios.
function updateOriginNarrative() {
  const line = document.getElementById('meta-line');
  if (!line) return;
  if (!origin) {
    // Sin origen no se puede decir "Sales de X": la línea entera se
    // sustituye por la llamada a definirlo. No se vuelve a este estado.
    line.className = 'meta-line meta-line-empty';
    line.innerHTML = '<button type="button" class="meta-set-origin" id="meta-set-origin" onclick="openEditPanelAtHome()">Elige desde dónde sales</button>';
  } else {
    const o = resolveOrigen();
    line.className = 'meta-line';
    line.innerHTML =
      `<span class="meta-item">${META_PIN_SVG}Sales de <span class="meta-val">${esc(o.name || '…')}</span></span>` +
      '<span class="meta-sep"></span>' +
      `<span class="meta-item">${META_CAL_SVG}<span class="meta-val">${esc(formatDate(selectedDate))}</span></span>` +
      '<button type="button" class="meta-edit" id="meta-edit" onclick="toggleEditPanel()">editar</button>';
  }
  syncDepRows();
}

// Refleja el estado actual en las filas del panel: cuál va marcada, qué
// valor muestra cada una y si Casa ofrece "definir".
function syncDepRows() {
  const hasEntries = entries.length > 0;
  const lastRow = document.getElementById('dep-last');
  // Sin viajes todavía no existe "último destino" que ofrecer: la fila sobra.
  if (lastRow) lastRow.style.display = hasEntries ? '' : 'none';

  const active = resolveOrigen().mode;
  ['last', 'home', 'other'].forEach(m => {
    const row = document.getElementById('dep-' + m);
    if (row) row.classList.toggle('active', m === active);
  });

  const lastVal = document.getElementById('dep-last-val');
  if (lastVal) { const c = currentEntry(); lastVal.textContent = c ? c.dest : ''; }
  const homeVal = document.getElementById('origin-name');
  if (homeVal) homeVal.textContent = origin ? origin.name : '';
  const define = document.getElementById('dep-home-define');
  if (define) define.style.display = origin ? 'none' : '';
}

function setEditPanel(open) {
  const panel = document.getElementById('edit-panel');
  if (panel) panel.style.display = open ? 'block' : 'none';
}

function toggleEditPanel() {
  const panel = document.getElementById('edit-panel');
  if (panel) setEditPanel(panel.style.display === 'none');
}

// Entrada desde la meta-línea vacía: abre el panel con Casa ya elegida y
// el input desplegado, para que no haya que buscar dónde escribir.
function openEditPanelAtHome() {
  setEditPanel(true);
  setDep('home');
}

// Sin argumento alterna; con argumento fuerza el estado.
function toggleOriginEdit(forceOpen) {
  const wrap = document.getElementById('origin-input-wrap');
  const open = (forceOpen === undefined) ? !wrap.classList.contains('visible') : !!forceOpen;
  wrap.classList.toggle('visible', open);
  if (open) setTimeout(() => document.getElementById('origin-input').focus(), 60);
}

async function setOrigin() {
  const val = document.getElementById('origin-input').value.trim();
  if (!val) return;
  const btn = document.querySelector('#origin-input-wrap .origin-ok');
  const prevText = btn.textContent;
  btn.textContent = 'Buscando…'; btn.disabled = true;
  try {
    const geo = await geocode(val, false, 'origen');
    if (!geo) { alert('No encontré ese lugar. Prueba con otro nombre.'); return; }
    origin = { name: val, lat: geo.lat, lng: geo.lng };
    document.getElementById('origin-input-wrap').classList.remove('visible');
    document.getElementById('origin-input').value = '';
    addOriginMarker();
    updateOriginNarrative();
    map.setView([origin.lat, origin.lng], 4);
    saveState();
  } finally {
    btn.textContent = prevText; btn.disabled = false;
  }
}

function addOriginMarker() {
  if (!origin) return;
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;background:#1a3a2a;border-radius:50%;border:3px solid #1d9e75;box-shadow:0 0 0 2px white"></div>`,
    iconSize: [14,14], iconAnchor: [7,7]
  });
  // Tarjeta de origen propio unificada (misma que "otro lugar", start-card):
  // la casa es variante de CONTENIDO, no de diseño. Su conteo de lecturas
  // propias se cuenta aquí porque redrawMap la excluye del agregado de starts.
  const count = resolvedFiltered().filter(e => normalizeName(e.fromName) === normalizeName(origin.name)).length;
  const continent = isFictionalPlace(origin.name) ? '' : continentFor(origin.lat, origin.lng);
  const line = count > 0
    ? `Tu casa · punto de partida de <b>${count.toLocaleString()}</b> ${count === 1 ? 'lectura tuya' : 'lecturas tuyas'}`
    : 'Tu casa';
  const html = `<div class="start-card">
      <div class="start-card-title">${esc(origin.name)}</div>
      ${continent ? `<div class="start-card-geo">${esc(continent)}</div>` : ''}
      <p class="start-card-line">${line}</p>
    </div>`;
  const opts = { className: 'start-popup', maxWidth: START_CARD_W, minWidth: START_CARD_W };
  L.marker([origin.lat, origin.lng], { icon }).addTo(markersLayer).bindPopup(html, opts);
}

// ===================== DEPARTURE =====================
function setDep(mode) {
  departure = mode;
  const wrap = document.getElementById('dep-other-wrap');
  wrap.style.display = mode === 'other' ? 'block' : 'none';
  if (mode === 'other') {
    setTimeout(() => document.getElementById('dep-other-input').focus(), 60);
  }
  // Casa sin coordenadas todavía: se despliega el input en vez de dejar la
  // fila elegida pero vacía.
  if (mode === 'home' && !origin) toggleOriginEdit(true);
  else if (mode !== 'home') toggleOriginEdit(false);
  // La meta-línea sigue al modo elegido: es donde se lee el resultado.
  updateOriginNarrative();
}

// ===================== NOTAS =====================
// El textarea mide una línea en reposo y crece con el contenido. Al
// vaciarlo vuelve a una línea: 'auto' antes de leer scrollHeight es lo que
// permite que también encoja, no solo que crezca.
function autoGrowNote(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// ===================== ADD ENTRY =====================
async function addEntry() {
  const book = document.getElementById('book-title').value.trim();
  const author = document.getElementById('book-author').value.trim();
  const dest = document.getElementById('destination').value.trim();
  const note = document.getElementById('book-note').value.trim();
  if (!book || !dest) { alert('Necesito al menos el título y el destino.'); return; }

  const btn = document.getElementById('add-btn');
  btn.textContent = 'Buscando…'; btn.disabled = true;

  try {
    const partida = resolveOrigen();
    if (partida.error === 'sin-origen') { alert('Primero indica tu ciudad de origen.'); return; }
    if (partida.error === 'sin-lugar') { alert('Indica el lugar de partida.'); return; }
    const fromName = partida.name;
    let fromCoords = partida.coords;
    // Solo 'other' llega sin coordenadas: es el único modo que hay que
    // geocodificar, y por eso no puede resolverse en el render.
    if (!fromCoords) {
      const geo = await geocode(fromName, false, 'origen');
      if (!geo) { alert('No encontré ese lugar de partida.'); return; }
      fromCoords = { lat: geo.lat, lng: geo.lng };
    }

    const destGeo = await geocode(dest, true);
    if (destGeo && destGeo.cancelled) { return; } // el usuario corrige el nombre o desiste; formulario intacto
    if (!destGeo) { alert('No se pudo conectar con el buscador de lugares. Inténtalo de nuevo.'); return; }

    const entry = {
      book, author, dest: destGeo.fictional ? dest : titleCaseDestino(dest), note, fromName,
      bookRef: selectedBookRef,
      departureMode: departure,
      fromLat: fromCoords.lat, fromLng: fromCoords.lng,
      destLat: destGeo.lat, destLng: destGeo.lng,
      km: haversineKm(fromCoords.lat, fromCoords.lng, destGeo.lat, destGeo.lng),
      fictional: destGeo.fictional,
      country: destGeo.country || '', countryCode: destGeo.countryCode || '',
      date: selectedDate, year: new Date(selectedDate + 'T12:00:00').getFullYear()
    };
    const pioneer = isPioneer(dest);
    if (pioneer) markDestinationKnown(dest);
    entry.pioneer = pioneer;

    const wasFirstEntry = entries.length === 0;
    // Antes del push: si ya se visitó este destino, el aviso "ya está en tu mapa" sobra.
    const repeatVisit = entries.some(e => normalizeName(e.dest) === normalizeName(entry.dest));
    entries.push(entry);
    redrawMap();

    addDiaryEntry(entry, pioneer);
    if (pioneer) { showPioneerToast(entry.dest, entry.fictional); }
    else if (!repeatVisit) { showEntryAddedToast(entry.dest, entry.fictional); }
    if (wasFirstEntry) showAuthCtaToast();

    const stats = getBadgeStats();
    // fromEntry: único sitio que lo pasa. Habilita los logros conmemorativos,
    // que premian añadir un destino y no la mera carga de la app.
    checkNewBadges(stats, false, false, true);

    updateList(); updateStats(); updateOriginNarrative(); saveState();
    invalidateCommunityCache();

    document.getElementById('book-title').value = '';
    document.getElementById('book-author').value = '';
    document.getElementById('destination').value = '';
    const noteEl = document.getElementById('book-note');
    noteEl.value = ''; autoGrowNote(noteEl); // vaciarlo no basta: hay que devolverlo a una línea
    document.getElementById('dep-other-input').value = '';
    selectedBookRef = null;
    closeDropdown(); resetDate();
    switchTab('itinerario');

    const lats = [fromCoords.lat, destGeo.lat], lngs = [fromCoords.lng, destGeo.lng];
    map.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: [80,80] });
  } finally {
    btn.textContent = 'Añadir al mapa'; btn.disabled = false;
  }
}

// ===================== STATS =====================
// Regla ÚNICA de conteo de países. La comparten los tres sitios que los cuentan
// —la cabecera, los logros y la exportación—: países de los destinos reales, más
// el país anclado de los destinos imaginarios que lo tienen
// (FICTIONAL_REAL_COUNTRY), deduplicado entre sí. Si ya habías estado en Reino
// Unido, Hogwarts no añade uno nuevo.
// Recibe la lista en vez de leerla porque cada sitio cuenta sobre un conjunto
// distinto: la cabecera filtra por año, los logros usan todas las entradas y la
// exportación su propia selección. Si aparece un cuarto sitio, que llame aquí.
function countriesFrom(list) {
  const countries = new Set(
    list
      .filter(e => !e.fictional)
      .map(e => e.countryCode || e.country || '')
      .filter(c => c.length > 0)
  );
  list.filter(e => e.fictional).forEach(e => {
    const cc = realCountryForFictional(e.dest);
    if (cc) countries.add(cc);
  });
  return countries;
}

function updateStats() {
  const filtered = resolvedFiltered();
  const books = new Set(filtered.map(e => e.book.toLowerCase().trim())).size;
  const km = filtered.reduce((s,e) => s+e.km, 0);
  const places = new Set(filtered.map(e => e.dest.toLowerCase())).size;
  const countries = countriesFrom(filtered).size;

  document.getElementById('stat-books').textContent = books;
  document.getElementById('stat-km').textContent = km >= 1000 ? (km/1000).toFixed(1)+'k' : km;
  document.getElementById('stat-places').textContent = places;
  document.getElementById('stat-countries').textContent = countries;

  document.querySelector('[id="stat-places"]').nextElementSibling.textContent = places === 1 ? 'destino' : 'destinos';
  document.querySelector('[id="stat-countries"]').nextElementSibling.textContent = countries === 1 ? 'país' : 'países';
  document.querySelector('[id="stat-books"]').nextElementSibling.textContent = books === 1 ? 'lectura' : 'lecturas';
}

// ===================== YEAR FILTER =====================
function updateYearFilter() {
  const filter = document.getElementById('year-filter');
  const years = [...new Set(entries.map(e => e.year).filter(Boolean))].sort();
  if (years.length < 2) { filter.style.display = 'none'; return; }
  filter.style.display = 'flex';
  filter.innerHTML = '';
  [['all','Todos'], ...years.map(y => [y, y])].forEach(([val, label]) => {
    const btn = document.createElement('button');
    btn.className = 'year-opt' + (activeYear === val ? ' active' : '');
    btn.textContent = label;
    btn.onclick = () => { activeYear = val; redrawMap(); updateList(); };
    filter.appendChild(btn);
  });
}

// ===================== LIST =====================
// Entrada "actual": la de fecha más reciente (coherente entre local y nube).
// Empate de fecha -> la última registrada de ese día.
function currentEntry() {
  if (!entries.length) return null;
  let best = entries[0], bestIdx = 0;
  entries.forEach((e, i) => {
    const d = e.date || '', bd = best.date || '';
    if (d > bd || (d === bd && i >= bestIdx)) { best = e; bestIdx = i; }
  });
  return best;
}

// Conectores españoles de topónimos: en minúscula salvo que sean la
// primera palabra del nombre ("La Coruña", "Las Palmas de Gran Canaria").
const DEST_CONNECTORS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'en']);

// Capitaliza tras el inicio de palabra, un guion o un apóstrofo, para
// nombres compuestos ("Vitoria-Gasteiz", "L'Hospitalet").
function capitalizeWord(word) {
  return word.replace(/(^|[-'])(\p{L})/gu, (_, sep, letter) => sep + letter.toUpperCase());
}

// Se fuerza siempre (no se respeta la capitalización del usuario, ver
// espec §decisiones): "madrid", "MADRID" y "Madrid" dan el mismo resultado.
// No tocar si el destino es ficticio (se llama condicionalmente desde
// addEntry() y saveEditEntry()). Idempotente.
function titleCaseDestino(str) {
  if (!str) return str;
  return str.trim().toLowerCase().split(/\s+/).map((word, i) => {
    if (i > 0 && DEST_CONNECTORS.has(word)) return word;
    return capitalizeWord(word);
  }).join(' ');
}

function sortedFiltered() {
  return (activeYear === 'all' ? entries : entries.filter(e => e.year === activeYear))
    .slice().sort((a,b) => (a.date||'').localeCompare(b.date||''));
}

// Devuelve una copia de la lista con el origen (fromName/fromLat/fromLng)
// y el km recalculados para las entradas 'last' (encadenan por fecha),
// contra la entrada inmediatamente anterior en orden cronológico REAL,
// no la que tenía en el momento de crearla. Las de 'home'/'other' (o sin
// departureMode: entradas antiguas) se devuelven sin tocar — su origen
// es fijo a propósito.
// El punto de cadena avanza al destino de CADA entrada, sea cual sea su
// modo: la entrada 'last' que sigue a un 'home'/'other' encadena desde
// ese punto de ruptura.
function resolveEntries(list) {
  const sorted = list.slice().sort((a, b) => (a.date||'').localeCompare(b.date||''));
  let chainPoint = origin ? { name: origin.name, lat: origin.lat, lng: origin.lng } : null;
  return sorted.map(e => {
    if (e.departureMode !== 'last' || !chainPoint) {
      chainPoint = { name: e.dest, lat: e.destLat, lng: e.destLng };
      return e;
    }
    const resolved = {
      ...e,
      fromName: chainPoint.name,
      fromLat: chainPoint.lat,
      fromLng: chainPoint.lng,
      km: haversineKm(chainPoint.lat, chainPoint.lng, e.destLat, e.destLng)
    };
    // Referencia no enumerable a la entrada real: editar/borrar y las
    // comparaciones de identidad siguen operando sobre ella, y no se
    // cuela en JSON.stringify.
    Object.defineProperty(resolved, '__original', { value: e });
    chainPoint = { name: e.dest, lat: e.destLat, lng: e.destLng };
    return resolved;
  });
}

// sortedFiltered() en versión resuelta: la cadena se calcula sobre la
// lista COMPLETA y el filtro de año se aplica después, para que el
// enlace entre años no se rompa al filtrar.
function resolvedFiltered() {
  const resolved = resolveEntries(entries);
  return activeYear === 'all' ? resolved : resolved.filter(e => e.year === activeYear);
}

function updateList() {
  const list = document.getElementById('journey-list');
  const filtered = resolvedFiltered();
  if (filtered.length === 0) {
    list.innerHTML = entries.length === 0
      ? `<div class="empty-state"><div class="compass">🧭</div><p>Tu viaje lector empieza aquí.<br>Añade 2 o 3 libros que estés leyendo<br>o hayas leído recientemente.<br><br><em>El mundo entero te espera.</em></p></div>`
      : `<div class="empty-state"><p>Sin lecturas en ${activeYear}.</p></div>`;
    return;
  }
  list.innerHTML = '';
  filtered.forEach((e, i) => {
    // e puede ser una copia resuelta: el índice de editar/borrar se
    // calcula siempre contra la entrada real (__original).
    const realIndex = entries.indexOf(e.__original || e);
    const div = document.createElement('div');
    div.className = 'journey-entry';
    const connector = i < filtered.length - 1 ? '<div class="entry-connector"></div>' : '';
    const dotClass = i === 0 ? 'entry-dot origin' : (e.fictional ? 'entry-dot fictional' : 'entry-dot');
    div.innerHTML = `
      <div class="entry-line"><div class="${dotClass}"></div>${connector}</div>
      <div class="entry-content">
        <div class="entry-route">${e.fromName} → ${e.fictional ? '✦ ' : ''}${e.dest}${e.country && !e.fictional ? ` <span style="opacity:0.7">· ${e.country}</span>` : ''}</div>
        <div class="entry-book">${e.book}${e.author ? ` <span style="font-size:0.78rem;color:#aaa;font-style:normal">— ${e.author}</span>` : ''}</div>
        <div class="entry-km">+${e.km.toLocaleString()} km</div>
        ${e.date ? `<div class="entry-date">${formatDate(e.date)}</div>` : ''}
        ${e.note ? `<div class="entry-note">"${e.note}"</div>` : ''}
      </div>
      <div style="display:flex;align-items:flex-start;gap:0.25rem" id="delete-wrap-${realIndex}">
        <button class="entry-edit" onclick="editEntry(${realIndex})" title="Editar">✏️</button>
        <button class="entry-delete" onclick="askDeleteEntry(${realIndex})" title="Eliminar">✕</button>
      </div>
    `;
    list.appendChild(div);
  });
  const panel = document.getElementById('panel-itinerario');
  if (panel) panel.scrollTop = panel.scrollHeight;
  updateYearFilter();
}

function editEntry(i) {
  Object.keys(editMiniMaps).forEach(k => destroyEditMiniMap(Number(k)));
  document.querySelectorAll('.entry-edit-form').forEach(el => el.remove());
  document.querySelectorAll('.confirm-delete').forEach(el => el.remove());

  const entry = entries[i];
  if (!entry) return;

  const wrap = document.getElementById(`delete-wrap-${i}`);
  const entryDiv = wrap.closest('.journey-entry');
  if (!entryDiv) return;

  const form = document.createElement('div');
  form.className = 'entry-edit-form';
  form.innerHTML = `
    <input type="text" id="edit-book-${i}" value="${entry.book.replace(/"/g,'&quot;')}" placeholder="Título del libro…">
    <input type="text" id="edit-author-${i}" value="${(entry.author||'').replace(/"/g,'&quot;')}" placeholder="Autor (opcional)…">
    <input type="text" id="edit-note-${i}" value="${(entry.note||'').replace(/"/g,'&quot;')}" placeholder="Nota personal (opcional)…">
    <div class="entry-edit-location">
      <input type="text" id="edit-dest-${i}" value="${entry.dest.replace(/"/g,'&quot;')}" placeholder="Ubicación del destino…">
      <button class="entry-edit-geo-btn" onclick="relocateEntry(${i})">Buscar</button>
    </div>
    <div class="entry-edit-geo-status" id="edit-geo-status-${i}"></div>
    <button type="button" class="entry-edit-map-toggle" id="edit-map-toggle-${i}" onclick="toggleEditMiniMap(${i})">📍 Ajustar en el mapa</button>
    <div class="entry-edit-minimap" id="edit-minimap-wrap-${i}" style="display:none;">
      <div id="edit-minimap-${i}" class="entry-edit-minimap-canvas"></div>
      <div class="entry-edit-minimap-hint">Arrastra el pin hasta la ubicación correcta</div>
    </div>
    <div class="entry-edit-actions">
      <button class="entry-edit-save" onclick="saveEditEntry(${i})">Guardar</button>
      <button class="entry-edit-cancel" onclick="cancelEdit(${i})">Cancelar</button>
    </div>
  `;
  entryDiv.appendChild(form);
  document.getElementById(`edit-book-${i}`).focus();
  // Base de partida del mini-mapa: la posición ya guardada del viaje, marcada
  // como "auto" (no es una elección real del usuario todavía). Si el usuario
  // escribe un destino distinto sin buscar ni tocar el mapa, este "auto" se
  // ignora y se dispara la búsqueda por texto como antes.
  if (!editGeoPending[i]) {
    editGeoPending[i] = { name: entry.dest, lat: entry.destLat, lng: entry.destLng, country: entry.country, countryCode: entry.countryCode, fictional: entry.fictional, auto: true };
  }
}

// ===================== MINI-MAPA PARA AJUSTAR EL PIN A MANO =====================
const editMiniMaps = {}; // i -> { map, marker }

function toggleEditMiniMap(i) {
  const wrap = document.getElementById(`edit-minimap-wrap-${i}`);
  if (!wrap) return;
  const isOpen = wrap.style.display !== 'none';
  if (isOpen) {
    destroyEditMiniMap(i);
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  const pending = editGeoPending[i];
  const lat = pending ? pending.lat : 40.4;
  const lng = pending ? pending.lng : -3.7;
  setTimeout(() => initEditMiniMap(i, lat, lng), 0);
}

function initEditMiniMap(i, lat, lng) {
  const el = document.getElementById(`edit-minimap-${i}`);
  if (!el || editMiniMaps[i]) return;
  const m = L.map(el, { zoomControl: true, attributionControl: false }).setView([lat, lng], 5);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 19
  }).addTo(m);
  const marker = L.marker([lat, lng], { draggable: true, icon: coloredPinIcon('#1d9e75') }).addTo(m);
  marker.on('dragend', () => {
    const pos = marker.getLatLng();
    const prev = editGeoPending[i] || {};
    editGeoPending[i] = Object.assign({}, prev, { lat: pos.lat, lng: pos.lng, auto: false });
    const status = document.getElementById(`edit-geo-status-${i}`);
    if (status) { status.textContent = 'Ubicación ajustada manualmente — guarda para aplicar'; status.style.color = 'var(--teal)'; }
  });
  editMiniMaps[i] = { map: m, marker };
  setTimeout(() => m.invalidateSize(), 50);
}

function destroyEditMiniMap(i) {
  const entry = editMiniMaps[i];
  if (entry) { entry.map.remove(); delete editMiniMaps[i]; }
}

const editGeoPending = {};

async function saveEditEntry(i) {
  const book = document.getElementById(`edit-book-${i}`).value.trim();
  const author = document.getElementById(`edit-author-${i}`).value.trim();
  const note = document.getElementById(`edit-note-${i}`).value.trim();
  const destVal = document.getElementById(`edit-dest-${i}`).value.trim();
  if (!book) return;

  const pending = editGeoPending[i];
  const pendingIsStaleAuto = pending && pending.auto && destVal !== entries[i].dest;
  if ((!pending || pendingIsStaleAuto) && destVal && destVal !== entries[i].dest) {
    const status = document.getElementById(`edit-geo-status-${i}`);
    const saveBtn = document.querySelector(`#delete-wrap-${i}`)?.closest('.journey-entry')?.querySelector('.entry-edit-save');
    if (status) { status.textContent = 'Buscando…'; status.style.color = 'var(--muted)'; }
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Guardando…'; }
    const geo = await geocode(destVal, true);
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Guardar'; }
    if (geo && geo.cancelled) { if (status) { status.textContent = ''; } return; }
    if (!geo) {
      if (status) { status.textContent = 'No encontré ese lugar. Prueba con otro nombre.'; status.style.color = 'var(--route)'; }
      return;
    }
    editGeoPending[i] = { name: destVal, lat: geo.lat, lng: geo.lng, country: geo.country, countryCode: geo.countryCode, fictional: geo.fictional };
  }

  entries[i].book = book;
  entries[i].author = author;
  entries[i].note = note;

  const finalPending = editGeoPending[i];
  if (finalPending) {
    entries[i].dest = finalPending.fictional ? finalPending.name : titleCaseDestino(finalPending.name);
    entries[i].destLat = finalPending.lat;
    entries[i].destLng = finalPending.lng;
    entries[i].country = finalPending.country;
    entries[i].countryCode = finalPending.countryCode;
    entries[i].fictional = finalPending.fictional || false;
    entries[i].km = haversineKm(entries[i].fromLat, entries[i].fromLng, finalPending.lat, finalPending.lng);
    delete editGeoPending[i];
    redrawMap();
  }
  updateList(); updateStats(); saveState();
}

async function relocateEntry(i) {
  const val = document.getElementById(`edit-dest-${i}`).value.trim();
  const status = document.getElementById(`edit-geo-status-${i}`);
  if (!val) return;
  status.textContent = 'Buscando…';
  const geo = await geocode(val, true);
  if (geo && geo.cancelled) { status.textContent = ''; return; }
  if (!geo) {
    status.textContent = 'No encontré ese lugar. Prueba con otro nombre.';
    return;
  }
  editGeoPending[i] = { name: val, lat: geo.lat, lng: geo.lng, country: geo.country, countryCode: geo.countryCode, fictional: geo.fictional };
  status.textContent = `✓ ${val}${geo.country ? ' · ' + geo.country : ''} — guarda para aplicar`;
  status.style.color = 'var(--teal)';
}

function cancelEdit(i) {
  destroyEditMiniMap(i);
  document.querySelectorAll('.entry-edit-form').forEach(el => el.remove());
}

function askDeleteEntry(i) {
  document.querySelectorAll('.confirm-delete').forEach(el => el.remove());
  document.querySelectorAll('.entry-delete').forEach(el => el.style.color = '');

  const wrap = document.getElementById(`delete-wrap-${i}`);
  if (!wrap) return;
  const btn = wrap.querySelector('.entry-delete');
  btn.style.color = '#e06060';

  const confirm = document.createElement('div');
  confirm.className = 'confirm-delete';
  confirm.innerHTML = `
    <span>¿Borrar?</span>
    <button class="confirm-yes" onclick="removeEntry(${i})">Sí</button>
    <button class="confirm-no" onclick="cancelDelete(${i})">No</button>
  `;
  wrap.appendChild(confirm);
}

function cancelDelete(i) {
  const wrap = document.getElementById(`delete-wrap-${i}`);
  if (!wrap) return;
  wrap.querySelector('.confirm-delete')?.remove();
  const btn = wrap.querySelector('.entry-delete');
  if (btn) btn.style.color = '';
}

function removeEntry(i) {
  const removed = entries[i];
  entries.splice(i, 1);
  if (removed) {
    const diary = loadDiary();
    let found = false;
    const newDiary = diary.filter(d => {
      if (!found && d.dest === removed.dest && d.book === removed.book) {
        found = true;
        return false;
      }
      return true;
    });
    saveDiary(newDiary);
    renderDiary();
  }
  redrawMap(); updateList(); updateStats(); updateOriginNarrative(); saveState();
}
