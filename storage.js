// ===================== STORAGE (LOCAL + NUBE) =====================
// Si hay sesión (currentUser, de auth.js), lee/escribe en Supabase.
// Si no, se comporta exactamente igual que antes: localStorage.

// Cola de operaciones de nube: los guardados se encadenan uno detrás de otro
// y ninguna carga puede colarse en mitad de un guardado (delete + insert).
let cloudQueue = Promise.resolve();

async function saveState() {
  if (currentUser) {
    cloudQueue = cloudQueue.catch(() => {}).then(() => saveStateToCloud());
    await cloudQueue;
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
      const { error: profileError } = await supabaseClient.from('profiles').upsert({
        id: currentUser.id,
        origin_name: origin.name,
        origin_lat: origin.lat,
        origin_lng: origin.lng
      });
      if (profileError) throw profileError;
    }
    // Estrategia simple: sustituir todas las entradas del usuario por el estado actual.
    // Correcto y suficiente para el volumen de la beta; se puede optimizar más adelante.
    const { error: deleteError } = await supabaseClient.from('entries').delete().eq('user_id', currentUser.id);
    if (deleteError) throw deleteError;
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
      const { error: insertError } = await supabaseClient.from('entries').insert(rows);
      if (insertError) throw insertError;
    }
    // Guardado correcto: ya no hace falta la copia de seguridad local.
    localStorage.removeItem('lev_cloud_pending');
  } catch (err) {
    console.warn('Error guardando en la nube:', err);
    // La nube no recibió el estado (p. ej. sin conexión): guardamos una copia
    // local para no perder nada y reintentamos cuando vuelva la conexión.
    try {
      localStorage.setItem('lev_cloud_pending', JSON.stringify({ origin, entries }));
    } catch (e) {}
    notifyCloudSaveError();
  }
}

// Aviso discreto de que el guardado en nube ha fallado
function notifyCloudSaveError() {
  let el = document.getElementById('cloud-save-error');
  if (!el) {
    el = document.createElement('div');
    el.id = 'cloud-save-error';
    el.style.cssText = 'position:fixed;bottom:64px;left:50%;transform:translateX(-50%);background:#1a1a18;color:#fff;padding:0.6rem 1rem;border-radius:8px;font-family:Inter,sans-serif;font-size:0.78rem;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.25);opacity:0;transition:opacity 0.3s;max-width:90%;text-align:center;';
    el.textContent = 'Sin conexión: tus últimos cambios se guardarán en cuanto vuelva.';
    document.body.appendChild(el);
  }
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => { el.style.opacity = '0'; }, 5000);
}

// Reintento automático al recuperar la conexión
window.addEventListener('online', () => {
  if (currentUser && localStorage.getItem('lev_cloud_pending')) saveState();
});

async function loadState() {
  try {
    if (currentUser) {
      await cloudQueue.catch(() => {}); // espera a que termine cualquier guardado en curso
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
  // Si hay un guardado pendiente (la conexión falló al guardar), ese estado es
  // más reciente que el de la nube: lo restauramos y reintentamos subirlo.
  const pendingRaw = localStorage.getItem('lev_cloud_pending');
  if (pendingRaw) {
    try {
      const pending = JSON.parse(pendingRaw);
      origin = pending.origin || null;
      entries = Array.isArray(pending.entries) ? pending.entries : [];
      if (origin) {
        document.getElementById('origin-name').textContent = origin.name;
        map.setView([origin.lat, origin.lng], 4);
      }
      redrawMap();
      updateList(); updateStats(); updateOriginNarrative();
      saveState(); // reintenta la subida; si funciona, se limpia el pendiente
      return;
    } catch (e) {
      localStorage.removeItem('lev_cloud_pending');
    }
  }

  const { data: cloudEntries, error: entriesError } = await supabaseClient
    .from('entries')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('date', { ascending: true });

  // Lectura fallida (p. ej. sin conexión): no tocamos el estado en memoria.
  if (entriesError) {
    console.warn('No se pudo leer de la nube:', entriesError);
    return;
  }

  const { data: profile, error: profileError } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
  if (profile && profile.origin_name) {
    origin = { name: profile.origin_name, lat: profile.origin_lat, lng: profile.origin_lng };
    document.getElementById('origin-name').textContent = origin.name;
    addOriginMarker();
    map.setView([origin.lat, origin.lng], 4);
  } else if (!profileError || profileError.code === 'PGRST116') {
    // Sin perfil aún (o perfil sin origen): estado limpio. Si la consulta
    // falló por conexión, conservamos el origen que ya había en memoria.
    origin = null;
  }

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

  // Recalcular logros con el estado recién cargado, en silencio (sin toasts)
  // para que un usuario que entra en un dispositivo nuevo vea de inmediato
  // los logros que ya tenía conseguidos, sin una avalancha de avisos.
  checkNewBadges(getBadgeStats(), true);
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
