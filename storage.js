// ===================== STORAGE (LOCAL + NUBE) =====================
// Si hay sesión (currentUser, de auth.js), lee/escribe en Supabase.
// Si no, se comporta exactamente igual que antes: localStorage.

async function saveState() {
  if (currentUser) {
    await saveStateToCloud();
  } else {
    saveStateToLocal();
  }
}

function saveStateToLocal() {
  localStorage.setItem('lev_origin', JSON.stringify(origin));
  localStorage.setItem('lev_entries', JSON.stringify(entries));
}

async function saveStateToCloud() {
  try {
    if (origin) {
      await supabaseClient.from('profiles').upsert({
        id: currentUser.id,
        origin_name: origin.name,
        origin_lat: origin.lat,
        origin_lng: origin.lng
      });
    }
    // Estrategia simple: sustituir todas las entradas del usuario por el estado actual.
    // Correcto y suficiente para el volumen de la beta; se puede optimizar más adelante.
    await supabaseClient.from('entries').delete().eq('user_id', currentUser.id);
    if (entries.length) {
      const rows = entries.map(e => ({
        user_id: currentUser.id,
        book: e.book,
        author: e.author || null,
        note: e.note || null,
        dest: e.dest,
        dest_lat: e.destLat,
        dest_lng: e.destLng,
        from_name: e.fromName,
        from_lat: e.fromLat,
        from_lng: e.fromLng,
        km: e.km,
        fictional: !!e.fictional,
        country: e.country || null,
        country_code: e.countryCode || null,
        date: e.date,
        year: e.year || null,
        pioneer: !!e.pioneer
      }));
      await supabaseClient.from('entries').insert(rows);
    }
  } catch (err) {
    console.warn('Error guardando en la nube:', err);
  }
}

async function loadState() {
  try {
    if (currentUser) {
      await loadStateFromCloud();
    } else {
      loadStateFromLocal();
    }
  } catch (e) { console.warn('Error cargando estado:', e); }
}

function loadStateFromLocal() {
  const o = localStorage.getItem('lev_origin');
  const e = localStorage.getItem('lev_entries');
  if (o) { origin = JSON.parse(o); document.getElementById('origin-name').textContent = origin.name; addOriginMarker(); map.setView([origin.lat, origin.lng], 4); }
  if (e) {
    entries = JSON.parse(e);
    sortedFiltered().forEach(en => { drawRoute(en); addDestMarker(en); });
    migrateDiary();
    updateList(); updateStats();
  }
  updateOriginNarrative();
}

async function loadStateFromCloud() {
  const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
  if (profile && profile.origin_name) {
    origin = { name: profile.origin_name, lat: profile.origin_lat, lng: profile.origin_lng };
    document.getElementById('origin-name').textContent = origin.name;
    addOriginMarker();
    map.setView([origin.lat, origin.lng], 4);
  } else {
    origin = null;
  }

  const { data: cloudEntries } = await supabaseClient
    .from('entries')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('date', { ascending: true });

  entries = (cloudEntries || []).map(row => ({
    book: row.book, author: row.author || '', note: row.note || '',
    dest: row.dest, destLat: row.dest_lat, destLng: row.dest_lng,
    fromName: row.from_name, fromLat: row.from_lat, fromLng: row.from_lng,
    km: row.km, fictional: row.fictional,
    country: row.country || '', countryCode: row.country_code || '',
    date: row.date, year: row.year, pioneer: row.pioneer
  }));

  redrawMap();

  // El diario se sigue mostrando desde su caché local (diary.js),
  // así que la reconstruimos a partir de lo que acaba de llegar de la nube.
  const cloudDiary = entries.slice().reverse().map(en => ({ ...en, id: Date.now() + Math.random() }));
  saveDiary(cloudDiary);

  updateList(); updateStats();
  updateOriginNarrative();
}

function migrateDiary() {
  const diary = loadDiary();
  if (diary.length > 0) return; // ya tiene diario, no migrar
  if (entries.length === 0) return;
  // Crear entradas de diario para todas las entradas existentes
  // Marcar como pioneras las que no están en KNOWN_DESTINATIONS
  const seen = new Set();
  const newDiary = [];
  sortedFiltered().forEach(entry => {
    const key = entry.dest.toLowerCase().trim();
    const pioneer = !KNOWN_DESTINATIONS.has(key) && !seen.has(key);
    seen.add(key);
    if (pioneer) markDestinationKnown(entry.dest);
    newDiary.push({
      date: entry.date,
      dest: entry.dest,
      book: entry.book,
      author: entry.author,
      fromName: entry.fromName,
      km: entry.km,
      fictional: entry.fictional,
      pioneer,
      id: Date.now() + Math.random()
    });
  });
  saveDiary(newDiary.reverse()); // más reciente primero
  // Comprobar badges con el estado migrado
  checkNewBadges(getBadgeStats());
}
