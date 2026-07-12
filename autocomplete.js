// ===================== AUTOCOMPLETE =====================
let acResults = [], acIndex = -1, acTimer = null;

function onBookInput(val) {
  selectedBookRef = null;
  clearTimeout(acTimer);
  if (val.length < 3) { closeDropdown(); return; }
  acTimer = setTimeout(() => searchBooks(val), 350);
}

async function fetchJSON(url, ms = 5000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const r = await fetch(url, { signal: controller.signal });
    if (!r.ok) throw new Error('status ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

function normOpenLibrary(d) {
  return (d.docs || []).slice(0, 6).map(b => {
    const isbns = b.isbn || [];
    const isbn13 = isbns.find(x => x.length === 13);
    const isbn10 = isbns.find(x => x.length === 10);
    return {
      title: b.title,
      author: b.author_name ? b.author_name[0] : '',
      cover: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-S.jpg` : null,
      ref: isbn13 ? `isbn:${isbn13}` : (isbn10 ? `isbn:${isbn10}` : null),
    };
  }).filter(b => b.title);
}
function normGoogleBooks(d) {
  return (d.items || []).slice(0, 6).map(it => {
    const v = it.volumeInfo || {};
    let cover = v.imageLinks ? (v.imageLinks.smallThumbnail || v.imageLinks.thumbnail) : null;
    if (cover) cover = cover.replace(/^http:\/\//, 'https://');
    const ids = v.industryIdentifiers || [];
    const isbn13 = ids.find(x => x.type === 'ISBN_13');
    const isbn10 = ids.find(x => x.type === 'ISBN_10');
    const ref = isbn13 ? `isbn:${isbn13.identifier}` : (isbn10 ? `isbn:${isbn10.identifier}` : (it.id ? `gbooks:${it.id}` : null));
    return { title: v.title || '', author: v.authors ? v.authors[0] : '', cover: cover || null, ref };
  }).filter(b => b.title);
}

async function searchBooks(q) {
  const dd = document.getElementById('ac-dropdown');
  dd.innerHTML = '<div class="ac-loading">Buscando…</div>'; dd.classList.add('visible');

  try {
    const d = await fetchJSON(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=6&fields=title,author_name,cover_i,isbn`);
    const res = normOpenLibrary(d);
    if (res.length) { acResults = res; acIndex = -1; renderDropdown(); return; }
  } catch (e) {}

  try {
    const d = await fetchJSON(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=6&country=ES`);
    acResults = normGoogleBooks(d); acIndex = -1; renderDropdown(); return;
  } catch (e) {
    dd.innerHTML = '<div class="ac-loading" style="line-height:1.45">No se pudo conectar con el buscador.<br>Escribe el título a mano y sigue sin problema.</div>';
  }
}

function renderDropdown() {
  const dd = document.getElementById('ac-dropdown');
  if (!acResults.length) { dd.innerHTML = '<div class="ac-loading">Sin resultados</div>'; return; }
  dd.innerHTML = '';
  acResults.forEach((book, i) => {
    const div = document.createElement('div'); div.className = 'ac-item';
    const author = book.author || '';
    const coverUrl = book.cover || null;
    div.innerHTML = `
      ${coverUrl ? `<img class="ac-cover" src="${coverUrl}" alt="" loading="lazy" onerror="this.style.display='none'">` : `<div class="ac-cover-placeholder">📖</div>`}
      <div><div class="ac-title">${book.title}</div>${author ? `<div class="ac-author">${author}</div>` : ''}</div>
    `;
    div.addEventListener('mousedown', e => { e.preventDefault(); selectBook(i); });
    dd.appendChild(div);
  });
}

function selectBook(i) {
  const b = acResults[i]; if (!b) return;
  document.getElementById('book-title').value = b.title;
  document.getElementById('book-author').value = b.author || '';
  selectedBookRef = b.ref || null;
  closeDropdown(); document.getElementById('destination').focus();
}

function onBookKeydown(e) {
  const dd = document.getElementById('ac-dropdown');
  if (!dd.classList.contains('visible')) return;
  const items = dd.querySelectorAll('.ac-item');
  if (e.key === 'ArrowDown') { e.preventDefault(); acIndex = Math.min(acIndex+1, items.length-1); items.forEach((el,i) => el.style.background = i===acIndex ? 'var(--parchment)' : ''); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); acIndex = Math.max(acIndex-1, -1); items.forEach((el,i) => el.style.background = i===acIndex ? 'var(--parchment)' : ''); }
  else if (e.key === 'Enter' && acIndex >= 0) { e.preventDefault(); selectBook(acIndex); }
  else if (e.key === 'Escape') closeDropdown();
}

function closeDropdown() { document.getElementById('ac-dropdown').classList.remove('visible'); acIndex = -1; }
document.addEventListener('click', e => { if (!e.target.closest('.book-input-wrap')) closeDropdown(); });
