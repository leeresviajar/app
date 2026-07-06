// ===================== ORIGIN =====================
function updateOriginNarrative() {
  const section = document.getElementById('origin-section');
  const narrative = document.getElementById('origin-narrative');
  const el = document.getElementById('origin-narrative-text');
  if (!origin) {
    section.style.display = 'block';
    narrative.style.display = 'none';
    return;
  }
  section.style.display = 'none';
  narrative.style.display = 'flex';
  const last = entries.length > 0 ? entries[entries.length - 1] : null;
  let text = `Saliste de <strong>${origin.name}</strong>`;
  if (last) text += ` · Ahora estás en <strong>${last.dest}</strong>`;
  el.innerHTML = text;
}

function toggleOriginEdit() {
  if (!origin) {
    const wrap = document.getElementById('origin-input-wrap');
    wrap.classList.toggle('visible');
    if (wrap.classList.contains('visible')) document.getElementById('origin-input').focus();
  } else {
    document.getElementById('origin-section').style.display = 'block';
    document.getElementById('origin-narrative').style.display = 'none';
    document.getElementById('origin-name').textContent = origin.name;
    const wrap = document.getElementById('origin-input-wrap');
    wrap.classList.add('visible');
    document.getElementById('origin-input').focus();
  }
}

async function setOrigin() {
  const val = document.getElementById('origin-input').value.trim();
  if (!val) return;
  const btn = document.querySelector('#origin-input-wrap .add-btn');
  const prevText = btn.textContent;
  btn.textContent = 'Buscando…'; btn.disabled = true;
  const geo = await geocode(val);
  btn.textContent = prevText; btn.disabled = false;
  if (!geo) { alert('No encontré ese lugar. Prueba con otro nombre.'); return; }
  origin = { name: val, lat: geo.lat, lng: geo.lng };
  document.getElementById('origin-input-wrap').classList.remove('visible');
  document.getElementById('origin-input').value = '';
  addOriginMarker();
  updateOriginNarrative();
  map.setView([origin.lat, origin.lng], 4);
  saveState();
}

function addOriginMarker() {
  if (!origin) return;
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;background:#1a3a2a;border-radius:50%;border:3px solid #1d9e75;box-shadow:0 0 0 2px white"></div>`,
    iconSize: [14,14], iconAnchor: [7,7]
  });
  L.marker([origin.lat, origin.lng], { icon }).addTo(markersLayer)
    .bindPopup(`<div class="popup-book">Punto de partida</div><div class="popup-place">${origin.name}</div>`);
}

// ===================== DEPARTURE =====================
function setDep(mode) {
  departure = mode;
  ['last','home','other'].forEach(m => document.getElementById('dep-'+m).classList.toggle('active', m === mode));
  const wrap = document.getElementById('dep-other-wrap');
  wrap.style.display = mode === 'other' ? 'block' : 'none';
  if (mode === 'other') {
    setTimeout(() => document.getElementById('dep-other-input').focus(), 60);
  }
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
    let fromName, fromCoords;
    if (departure === 'other') {
      // "Otro lugar" manda siempre, también en el primer viaje.
      const other = document.getElementById('dep-other-input').value.trim();
      if (!other) { alert('Indica el lugar de partida.'); return; }
      const geo = await geocode(other);
      if (!geo) { alert('No encontré ese lugar de partida.'); return; }
      fromName = other; fromCoords = { lat: geo.lat, lng: geo.lng };
    } else if (departure === 'home' || entries.length === 0) {
      // "Casa", o "Último destino" cuando aún no hay destino anterior.
      if (!origin) { alert('Primero indica tu ciudad de origen.'); return; }
      fromName = origin.name; fromCoords = { lat: origin.lat, lng: origin.lng };
    } else {
      // "Último destino"
      const last = entries[entries.length - 1];
      fromName = last.dest; fromCoords = { lat: last.destLat, lng: last.destLng };
    }

    const destGeo = await geocode(dest, true);
    if (destGeo && destGeo.cancelled) { return; } // el usuario corregirá el nombre
    if (!destGeo) { alert(`No encontré "${dest}". Prueba con otro nombre.`); return; }

    const entry = {
      book, author, dest, note, fromName,
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
    entries.push(entry);
    redrawMap();

    addDiaryEntry(entry, pioneer);
    if (pioneer) showPioneerToast(dest);
    if (wasFirstEntry) showAuthCtaToast();

    const stats = getBadgeStats();
    checkNewBadges(stats);

    updateList(); updateStats(); updateOriginNarrative(); saveState();

    document.getElementById('book-title').value = '';
    document.getElementById('book-author').value = '';
    document.getElementById('destination').value = '';
    document.getElementById('book-note').value = '';
    document.getElementById('dep-other-input').value = '';
    closeDropdown(); resetDate();
    switchTab('itinerario');

    const lats = [fromCoords.lat, destGeo.lat], lngs = [fromCoords.lng, destGeo.lng];
    map.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: [80,80] });
  } finally {
    btn.textContent = '+ Añadir al mapa'; btn.disabled = false;
  }
}

// ===================== STATS =====================
function updateStats() {
  const filtered = sortedFiltered();
  const books = new Set(filtered.map(e => e.book.toLowerCase().trim())).size;
  const km = filtered.reduce((s,e) => s+e.km, 0);
  const places = new Set(filtered.map(e => e.dest.toLowerCase())).size;
  const countries = new Set(
    filtered
      .filter(e => !e.fictional)
      .map(e => e.countryCode || e.country || '')
      .filter(c => c.length > 0)
  ).size;

  document.getElementById('stat-books').textContent = books;
  document.getElementById('stat-km').textContent = km >= 1000 ? (km/1000).toFixed(1)+'k' : km;
  document.getElementById('stat-places').textContent = places;
  document.getElementById('stat-countries').textContent = countries;

  document.querySelector('[id="stat-places"]').nextElementSibling.textContent = places === 1 ? 'destino' : 'destinos';
  document.querySelector('[id="stat-countries"]').nextElementSibling.textContent = countries === 1 ? 'país' : 'países';
  document.querySelector('[id="stat-countries"]').closest('.stat').style.display = countries === 0 ? 'none' : '';
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
function sortedFiltered() {
  return (activeYear === 'all' ? entries : entries.filter(e => e.year === activeYear))
    .slice().sort((a,b) => (a.date||'').localeCompare(b.date||''));
}

function updateList() {
  const list = document.getElementById('journey-list');
  const filtered = sortedFiltered();
  if (filtered.length === 0) {
    list.innerHTML = entries.length === 0
      ? `<div class="empty-state"><div class="compass">🧭</div><p>Tu viaje lector empieza aquí.<br>Añade 2 o 3 libros que estés leyendo<br>o hayas leído recientemente.<br><br><em>El mundo entero te espera.</em></p></div>`
      : `<div class="empty-state"><p>Sin lecturas en ${activeYear}.</p></div>`;
    return;
  }
  list.innerHTML = '';
  filtered.forEach((e, i) => {
    const realIndex = entries.indexOf(e);
    const div = document.createElement('div');
    div.className = 'journey-entry';
    const connector = i < filtered.length - 1 ? '<div class="entry-connector"></div>' : '';
    const dotClass = i === 0 ? 'entry-dot origin' : (e.fictional ? 'entry-dot fictional' : 'entry-dot');
    div.innerHTML = `
      <div class="entry-line"><div class="${dotClass}"></div>${connector}</div>
      <div class="entry-content">
        <div class="entry-route">${e.fromName} → ${e.dest}${e.fictional ? ' ✦' : ''}${e.country && !e.fictional ? ` <span style="opacity:0.7">· ${e.country}</span>` : ''}</div>
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
  updateYearFilter();
}

function editEntry(i) {
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
    <div class="entry-edit-actions">
      <button class="entry-edit-save" onclick="saveEditEntry(${i})">Guardar</button>
      <button class="entry-edit-cancel" onclick="cancelEdit(${i})">Cancelar</button>
    </div>
  `;
  entryDiv.appendChild(form);
  document.getElementById(`edit-book-${i}`).focus();
}

const editGeoPending = {};

async function saveEditEntry(i) {
  const book = document.getElementById(`edit-book-${i}`).value.trim();
  const author = document.getElementById(`edit-author-${i}`).value.trim();
  const note = document.getElementById(`edit-note-${i}`).value.trim();
  const destVal = document.getElementById(`edit-dest-${i}`).value.trim();
  if (!book) return;

  const pending = editGeoPending[i];
  if (!pending && destVal && destVal !== entries[i].dest) {
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
    entries[i].dest = finalPending.name;
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
