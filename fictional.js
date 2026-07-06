// ===================== FICTIONAL COMMUNITY DATA =====================
// Estructura preparada para API real: GET /api/fictional-positions/{placeKey}
const COMMUNITY_POSITIONS = {
  // Tolkien
  'minas tirith':    { votes: 876,  regionName: 'Anatolia occidental (Turquía)' },
  'rohan':           { votes: 743,  regionName: 'Ucrania occidental' },
  'moria':           { votes: 612,  regionName: 'Bosnia central' },
  'isengard':        { votes: 534,  regionName: 'Bosnia-Herzegovina' },
  'erebor':          { votes: 489,  regionName: 'Cáucaso georgiano' },
  'lothloren':       { votes: 467,  regionName: 'Austria central' },
  'cair paravel':    { votes: 398,  regionName: 'Frontera escocesa' },
  // Harry Potter
  'hogsmeade':       { votes: 892,  regionName: 'Highlands escocesas' },
  'azkaban':         { votes: 654,  regionName: 'Islas Shetland (Escocia)' },
  // Juego de Tronos
  'winterfell':      { votes: 1876, regionName: 'norte de Inglaterra' },
  'kings landing':   { votes: 1654, regionName: 'costa dálmata (Croacia)' },
  'rocadragón':      { votes: 743,  regionName: 'islas del Egeo (Grecia)' },
  // Idhún
  'celestia':        { votes: 312,  regionName: 'islas griegas del Egeo' },
  'kelesban':        { votes: 234,  regionName: 'Chipre oriental' },
  'nanhai':          { votes: 198,  regionName: 'Nepal / Himalaya' },
  'gran oráculo':    { votes: 187,  regionName: 'Nepal / Himalaya' },
  'kash-tar':        { votes: 176,  regionName: 'desierto de Irán' },
  'kosh':            { votes: 154,  regionName: 'Omán oriental' },
  'lumbak':          { votes: 143,  regionName: 'costa de Omán' },
  'nin':             { votes: 132,  regionName: 'golfo Pérsico' },
  'derbhad':         { votes: 167,  regionName: 'Bohemia meridional (Rep. Checa)' },
  'drackwen':        { votes: 145,  regionName: 'Finlandia central' },
  'shur-ikail':      { votes: 123,  regionName: 'Siberia occidental (Rusia)' },
  'anillo de hielo': { votes: 112,  regionName: 'norte de Noruega' },
  'raden':           { votes: 134,  regionName: 'Mar Caspio (Azerbaiyán)' },
  'gantadd':         { votes: 98,   regionName: 'Iraq meridional' },
  'limbhad':         { votes: 156,  regionName: 'Alemania central' },
  'umadhun':         { votes: 89,   regionName: 'Yemen / Mar Arábigo' },
  'torre de awinor': { votes: 134,  regionName: 'Islandia volcánica' },
  'torre de drackwen':{ votes: 112, regionName: 'Finlandia central' },
  'haai-sil':        { votes: 98,   regionName: 'costa egea de Turquía' },
  'vaisel':          { votes: 87,   regionName: 'Creta occidental' },
  'monte lunn':      { votes: 143,  regionName: 'Highlands escocesas' },
  'thalis':          { votes: 112,  regionName: 'Cracovia (Polonia)' },
  'raheld':          { votes: 98,   regionName: 'Polonia meridional' },
  'nurgon':          { votes: 87,   regionName: 'Eslovenia' },
  'nanetten':        { votes: 76,   regionName: 'Eslovaquia occidental' },
  'dingra':          { votes: 65,   regionName: 'Cárpatos orientales' },
  'shia':            { votes: 54,   regionName: 'Croacia septentrional' },
  'arén':            { votes: 43,   regionName: 'Eslovaquia oriental' },
  // Literatura hispánica
  'vetusta':         { votes: 543,  regionName: 'Oviedo, Asturias (España)' },
  'orbajosa':        { votes: 312,  regionName: 'Andalucía interior (España)' },
  'marineda':        { votes: 234,  regionName: 'A Coruña, Galicia (España)' },
  'oleza':           { votes: 198,  regionName: 'Orihuela, Murcia (España)' },
  'región':          { votes: 176,  regionName: 'León / Castilla (España)' },
  // Pullman (La materia oscura)
  'bolvangar':       { votes: 432,  regionName: 'norte de Noruega' },
  'cittàgazze':      { votes: 376,  regionName: 'Liguria (Italia)' },
  // Literatura inglesa clásica
  'thornfield':      { votes: 298,  regionName: 'Yorkshire (Inglaterra)' },
  'wuthering heights':{ votes: 276, regionName: 'Yorkshire (Inglaterra)' },
  'manderley':       { votes: 254,  regionName: 'Cornualles (Inglaterra)' },
  'mansfield park':  { votes: 198,  regionName: 'Northamptonshire (Inglaterra)' },
  'coketown':        { votes: 167,  regionName: 'Lancashire (Inglaterra)' },
  // Calvino (Ciudades invisibles)
  'dorothea':        { votes: 145,  regionName: 'Lombardía (Italia)' },
  'anastasia':       { votes: 134,  regionName: 'Lombardía (Italia)' },
  'isidora':         { votes: 123,  regionName: 'Lombardía (Italia)' },
  'octavia':         { votes: 112,  regionName: 'Liguria (Italia)' },
  'ombra':           { votes: 98,   regionName: 'Suiza italiana' },
  'tintamundo':      { votes: 87,   regionName: 'Suiza italiana' },
  'capricorno':      { votes: 76,   regionName: 'Suiza italiana' },
  // Ursula K. Le Guin
  'terramar':        { votes: 432,  regionName: 'costa de California (EEUU)' },
  'anarres':         { votes: 312,  regionName: 'Australia occidental' },
  'omelas':          { votes: 234,  regionName: 'Seattle, Washington (EEUU)' },
  // Narnia
  'oceania':         { votes: 543,  regionName: 'Londres, Inglaterra' },
  // Sanderson (Cosmere)
  'luthadel':        { votes: 312,  regionName: 'Anatolia oriental (Turquía)' },
  'roshar':          { votes: 289,  regionName: 'Oriente Próximo / Arabia' },
  // King (La Torre Oscura)
  'mid-world':       { votes: 234,  regionName: 'Grandes Llanuras (EEUU)' },
  // Rothfuss (Crónica del asesino de reyes)
  'tarbean':         { votes: 198,  regionName: 'Budapest, Hungría' },
  'imre':            { votes: 176,  regionName: 'Polonia meridional' },
  // Anime/manga
  'konoha':          { votes: 432,  regionName: 'Japón central' },
  'alabasta':        { votes: 312,  regionName: 'Egipto / Nilo' },
  'dressrosa':       { votes: 287,  regionName: 'Islas Baleares (España)' },
  'trost':           { votes: 234,  regionName: 'norte de Alemania' },
  'paradis':         { votes: 212,  regionName: 'Mecklemburgo (Alemania)' },
  // Pratchett
  'lancre':          { votes: 312,  regionName: 'Lake District (Inglaterra)' },
  // Gaiman
  'neverwhere':      { votes: 345,  regionName: 'Londres subterráneo (Inglaterra)' },
  'american gods':   { votes: 289,  regionName: 'Wisconsin (EEUU)' },
  'stardust':        { votes: 234,  regionName: 'norte de Inglaterra' },
  // Verne
  'isla misteriosa': { votes: 198,  regionName: 'Pacífico sur' },
  'centro de la tierra':{ votes: 176, regionName: 'Islandia volcánica' },
  // Dune adicionales
  'caladan':         { votes: 312,  regionName: 'Bretaña (Francia)' },
  // Kafka
  'the castle':      { votes: 234,  regionName: 'Bohemia (Rep. Checa)' },
  // Faulkner
  'yoknapatawpha':   { votes: 198,  regionName: 'Mississippi (EEUU)' },
  // Zenda
  'zenda':           { votes: 145,  regionName: 'Eslovaquia occidental' },
  'tlön':            { votes: 189,  regionName: 'Argentina / Cono Sur' },
  'uqbar':           { votes: 167,  regionName: 'Chile / Cono Sur' },
  // Populares destacados
  'hobbiton':        { votes: 1842, regionName: 'Midlands inglesas (Inglaterra)' },
  'la comarca':      { votes: 1842, regionName: 'Midlands inglesas (Inglaterra)' },
  'mordor':          { votes: 2103, regionName: 'costa norte del Mar Negro' },
  'hogwarts':        { votes: 3471, regionName: 'Highlands escocesas' },
  'macondo':         { votes: 987,  regionName: 'Caribe colombiano' },
  'arrakis':         { votes: 1654, regionName: 'Península Arábiga' },
  'vanis':           { votes: 312,  regionName: 'Bohemia (Rep. Checa)' },
  'rhyrr':           { votes: 289,  regionName: 'islas griegas del Egeo' },
  'kazlunn':         { votes: 201,  regionName: 'Highlands escocesas' },
  'bosque de awa':   { votes: 178,  regionName: 'Selva Negra, Alemania' },
  'awinor':          { votes: 143,  regionName: 'Islandia' },
  'gilead':          { votes: 876,  regionName: 'Boston, Massachusetts (EEUU)' },
  'panem':           { votes: 654,  regionName: 'Washington D.C. (EEUU)' },
  'westeros':        { votes: 2891, regionName: 'Islas Británicas e Irlanda' },
  'narnia':          { votes: 1203, regionName: 'Inglaterra rural' },
  'comala':          { votes: 445,  regionName: 'Jalisco, México' },
  'rivendell':       { votes: 1102, regionName: 'Alpes suizos' },
  'gondor':          { votes: 934,  regionName: 'Anatolia occidental (Turquía)' },
  'giedi prime':     { votes: 421,  regionName: 'Yemen / Mar Arábigo' },
};

function getCommunityData(placeKey) {
  const key = placeKey.toLowerCase().trim();
  for (const [k, v] of Object.entries(COMMUNITY_POSITIONS)) {
    if (key === k || key.includes(k) || k.includes(key)) return { key: k, known: true, ...v };
  }
  return { key, known: false, votes: 0, regionName: null };
}

// Overrides personales (localStorage → preparado para sincronizar con API)
function loadPersonalOverrides() {
  try { return JSON.parse(localStorage.getItem('lev_fictional_overrides') || '{}'); } catch(e) { return {}; }
}
function savePersonalOverride(key, lat, lng) {
  const overrides = loadPersonalOverrides();
  overrides[key] = { lat, lng };
  localStorage.setItem('lev_fictional_overrides', JSON.stringify(overrides));
}

// ===================== FICTIONAL PLACE MODAL =====================
let fictionalPending = null;

function openFictionalModal(placeKey, onResolve) {
  const community = getCommunityData(placeKey);
  fictionalPending = { placeKey, onResolve, communityLat: null, communityLng: null };

  for (const [k, v] of Object.entries(FICTIONAL)) {
    if (placeKey === k || placeKey.includes(k)) {
      fictionalPending.communityLat = v[0];
      fictionalPending.communityLng = v[1];
      break;
    }
  }

  const niceName = placeKey.charAt(0).toUpperCase() + placeKey.slice(1);
  document.getElementById('fic-place-name').textContent = niceName;

  const hasCoords = fictionalPending.communityLat != null;
  const section = document.getElementById('fic-community-section');
  const intro = document.getElementById('fic-first-intro');

  if (community.known && hasCoords) {
    section.style.display = '';
    intro.style.display = 'none';
    document.getElementById('fic-votes').textContent =
      `${community.votes.toLocaleString()} viajeros lo han colocado en:`;
    document.getElementById('fic-community-place').textContent = community.regionName;
  } else {
    section.style.display = 'none';
    intro.style.display = 'block';
    intro.innerHTML = `Todavía nadie ha situado <strong style="color:var(--ink)">${niceName}</strong> en el mapa. Colócalo donde tú lo imaginas — será tu rincón.`;
  }

  document.getElementById('fic-custom-input').value = '';
  document.getElementById('fictional-overlay').classList.add('visible');
  setTimeout(() => document.getElementById('fic-custom-input').focus(), 100);
}

function closeFictionalModal() {
  document.getElementById('fictional-overlay').classList.remove('visible');
  if (fictionalPending) {
    const { onResolve } = fictionalPending;
    fictionalPending = null;
    onResolve(null, null);
  }
}

let disambigPending = null;

function openDisambigModal(placeName, candidates, onResolve) {
  disambigPending = { onResolve };
  const overlay = document.getElementById('disambig-overlay');
  const title = document.getElementById('disambig-title');
  const list = document.getElementById('disambig-list');
  title.textContent = placeName;
  list.innerHTML = '';
  candidates.forEach((c, i) => {
    const addr = c.address || {};
    const parts = [addr.city || addr.town || addr.village || addr.municipality || c.name, addr.state || addr.county, addr.country].filter(Boolean);
    const label = parts[0] || c.display_name;
    const detail = parts.slice(1).join(', ');
    const btn = document.createElement('button');
    btn.className = 'disambig-option';
    btn.innerHTML = `<span><span class="disambig-option-name">${label}</span><span class="disambig-option-detail">${detail}</span></span>`;
    btn.onclick = () => { overlay.classList.remove('visible'); disambigPending.onResolve(c); disambigPending = null; };
    list.appendChild(btn);
  });
  overlay.classList.add('visible');
}

function closeDisambigModal() {
  document.getElementById('disambig-overlay').classList.remove('visible');
  if (disambigPending) { disambigPending.onResolve(null); disambigPending = null; }
}

function useCommunityPosition() {
  if (!fictionalPending) return;
  const { communityLat, communityLng, onResolve } = fictionalPending;
  fictionalPending = null; // evita que closeFictionalModal resuelva null
  document.getElementById('fictional-overlay').classList.remove('visible');
  onResolve(communityLat, communityLng);
}

async function useCustomPosition() {
  if (!fictionalPending) return;
  const input = document.getElementById('fic-custom-input').value.trim();
  if (!input) { document.getElementById('fic-custom-input').focus(); return; }

  const btn = document.querySelector('.btn-use-custom');
  btn.textContent = 'Buscando…'; btn.disabled = true;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'es' }, signal: controller.signal }
    );
    clearTimeout(timeout);
    const d = await r.json();
    if (!d.length) { alert('No encontré ese lugar. Prueba con otro nombre.'); return; }
    const lat = parseFloat(d[0].lat), lng = parseFloat(d[0].lon);
    savePersonalOverride(fictionalPending.placeKey, lat, lng);
    const { onResolve } = fictionalPending;
    fictionalPending = null; // evita que closeFictionalModal resuelva null
    document.getElementById('fictional-overlay').classList.remove('visible');
    onResolve(lat, lng);
  } catch(e) {
    alert('Error de conexión. Inténtalo de nuevo.');
  } finally {
    btn.textContent = 'Usar mi ubicación'; btn.disabled = false;
  }
}

// ===================== MODAL: LUGAR NO ENCONTRADO =====================
let unknownPlacePending = null;

function openUnknownPlaceModal(placeName, onResolve) {
  unknownPlacePending = { onResolve };
  document.getElementById('unknown-place-name').textContent = placeName;
  document.getElementById('unknown-place-overlay').classList.add('visible');
}

function resolveUnknownPlace(choice) {
  document.getElementById('unknown-place-overlay').classList.remove('visible');
  if (!unknownPlacePending) return;
  const { onResolve } = unknownPlacePending;
  unknownPlacePending = null;
  onResolve(choice);
}
