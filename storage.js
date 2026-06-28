// ===================== LOCALSTORAGE =====================
function saveState() {
  localStorage.setItem('lev_origin', JSON.stringify(origin));
  localStorage.setItem('lev_entries', JSON.stringify(entries));
}
function loadState() {
  try {
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
  } catch(e) { console.warn('Error cargando estado:', e); }
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
