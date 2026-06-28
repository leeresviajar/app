// ===================== PRIMERAS LLEGADAS =====================
const KNOWN_DESTINATIONS = new Set([
  'paris','london','roma','madrid','barcelona','berlin','amsterdam','lisboa',
  'tokyo','new york','buenos aires','ciudad de mexico','bogotá','lima',
  'cairo','istanbul','beijing','mumbai','sydney','toronto',
  // Ficticios populares
  'mordor','hogwarts','macondo','arrakis','westeros','narnia','la comarca','hobbiton',
  'rivendell','gondor','minas tirith','desembarco del rey','winterfell',
]);

function isPioneer(destName) {
  const key = destName.toLowerCase().trim();
  if (KNOWN_DESTINATIONS.has(key)) return false;
  if (entries.some(e => e.dest.toLowerCase() === key)) return false;
  return true;
}

function markDestinationKnown(destName) {
  KNOWN_DESTINATIONS.add(destName.toLowerCase().trim());
}

// ===================== DIARIO =====================
function loadDiary() {
  try { return JSON.parse(localStorage.getItem('lev_diary') || '[]'); } catch(e) { return []; }
}
function saveDiary(diary) {
  localStorage.setItem('lev_diary', JSON.stringify(diary));
}
function addDiaryEntry(entry, pioneer) {
  const diary = loadDiary();
  diary.unshift({
    date: entry.date,
    dest: entry.dest,
    book: entry.book,
    author: entry.author,
    fromName: entry.fromName,
    km: entry.km,
    fictional: entry.fictional,
    pioneer,
    id: Date.now()
  });
  saveDiary(diary);
}
function renderDiary() {
  const diary = loadDiary();
  const container = document.getElementById('diary-list');
  if (!diary.length) {
    container.innerHTML = `<div class="diary-empty"><div class="diary-icon">✍️</div><p>Aquí se escribe tu viaje.<br>Cada vez que una lectura te lleve a algún sitio,<br>quedará registrado.<br><br><em style="font-family:'Instrument Serif',serif;color:var(--teal)">El diario espera tu primera entrada.</em></p></div>`;
    return;
  }
  container.innerHTML = diary.map((e, idx) => {
    const dateStr = e.date ? new Date(e.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const pioneerBadge = e.pioneer ? `<div><span class="diary-pioneer">🧭 Primera persona en llegar aquí</span></div>` : '';
    const fictionalTag = e.fictional ? '✦ ' : '';
    const isFirst = idx === 0;
    const postalBtn = isFirst
      ? `<button class="diary-postal-btn" onclick="openPostal('${e.dest.replace(/'/g,"\\'")}','${(e.book||'').replace(/'/g,"\\'")}',${!!e.fictional})">✉ Enviar postal desde aquí</button>`
      : '';
    return `<div class="diary-entry">
      <div class="diary-date">${dateStr}</div>
      <div class="diary-text">
        Llegada a <span class="place">${fictionalTag}${e.dest}</span>
        <span class="book-ref">📖 ${e.book}${e.author ? ' — ' + e.author : ''} · +${e.km.toLocaleString()} km desde ${e.fromName}</span>
      </div>
      ${pioneerBadge}
      ${postalBtn}
    </div>`;
  }).join('');
}
