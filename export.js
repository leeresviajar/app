// ===================== EXPORT =====================
let exportMode = 'stats';
let exportFormat = 'story';
let exportPeriod = 'total';
let exportPeriodValue = null;
let exportCanvas = null;
const EXPORT_FORMATS = { story: { W: 1080, H: 1920 }, feed: { W: 1080, H: 1350 } };

function openExportModal() {
  document.getElementById('export-overlay').classList.add('visible');
  exportMode = 'stats';
  exportFormat = 'story';
  exportPeriod = 'total';
  exportPeriodValue = null;
  setTimeout(() => {
    document.getElementById('export-period-select').style.display = 'none';
    syncExportButtons();
    renderExportPreview();
  }, 50);
}
function closeExportModal() {
  document.getElementById('export-overlay').classList.remove('visible');
}
function syncExportButtons() {
  ['stats','books','wrapped','map'].forEach(m =>
    document.getElementById('em-' + m).classList.toggle('active', m === exportMode));
  ['story','feed'].forEach(f =>
    document.getElementById('ef-' + f).classList.toggle('active', f === exportFormat));
  ['total','year','month'].forEach(p =>
    document.getElementById('ep-' + p).classList.toggle('active', p === exportPeriod));
  const phraseWrap = document.getElementById('export-phrase-wrap');
  phraseWrap.classList.toggle('visible', exportMode === 'wrapped');
  if (exportMode === 'wrapped') {
    const phrase = document.getElementById('export-phrase');
    if (!phrase.value) phrase.value = generatePhrase();
  }
}
function setExportMode(mode) {
  exportMode = mode;
  syncExportButtons();
  renderExportPreview();
}
function setExportFormat(fmt) {
  exportFormat = fmt;
  syncExportButtons();
  renderExportPreview();
}

function exportAvailableYears() {
  return [...new Set(entries.map(e => e.year).filter(Boolean))].sort((a,b) => b - a);
}
function exportAvailableMonths() {
  return [...new Set(entries.map(e => (e.date || '').slice(0,7)).filter(Boolean))].sort().reverse();
}
function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}
function getExportEntries() {
  if (exportPeriod === 'year' && exportPeriodValue != null)
    return entries.filter(e => e.year === Number(exportPeriodValue));
  if (exportPeriod === 'month' && exportPeriodValue != null)
    return entries.filter(e => (e.date || '').slice(0,7) === exportPeriodValue);
  return entries.slice();
}
function exportPeriodSubtitle() {
  if (exportPeriod === 'year' && exportPeriodValue != null) return 'MI AÑO LECTOR ' + exportPeriodValue;
  if (exportPeriod === 'month' && exportPeriodValue != null) return 'MI MES LECTOR · ' + monthLabel(exportPeriodValue);
  return 'MI VIAJE LECTOR';
}
function exportWrappedSubtitle() {
  if (exportPeriod === 'year' && exportPeriodValue != null) return 'Wrapped ' + exportPeriodValue;
  if (exportPeriod === 'month' && exportPeriodValue != null) return 'Wrapped · ' + monthLabel(exportPeriodValue);
  return 'Wrapped · todo mi viaje';
}
function setExportPeriod(period) {
  exportPeriod = period;
  const sel = document.getElementById('export-period-select');
  if (period === 'year') {
    const years = exportAvailableYears();
    exportPeriodValue = years.length ? years[0] : new Date().getFullYear();
    sel.innerHTML = (years.length ? years : [exportPeriodValue])
      .map(y => `<option value="${y}">${y}</option>`).join('');
    sel.value = String(exportPeriodValue);
    sel.style.display = 'block';
  } else if (period === 'month') {
    const months = exportAvailableMonths();
    exportPeriodValue = months.length ? months[0] : null;
    sel.innerHTML = months.map(m => `<option value="${m}">${monthLabel(m)}</option>`).join('');
    if (exportPeriodValue) sel.value = exportPeriodValue;
    sel.style.display = months.length ? 'block' : 'none';
  } else {
    exportPeriodValue = null;
    sel.style.display = 'none';
  }
  syncExportButtons();
  renderExportPreview();
}
function onExportPeriodChange() {
  const sel = document.getElementById('export-period-select');
  exportPeriodValue = exportPeriod === 'year' ? Number(sel.value) : sel.value;
  renderExportPreview();
}

function generatePhrase() {
  const ents = getExportEntries();
  const km = Math.round(ents.reduce((s,e) => s+e.km, 0));
  const books = new Set(ents.map(e => e.book.toLowerCase().trim())).size;
  const dests = [...new Set(ents.map(e => e.dest))];
  const fictional = ents.filter(e => e.fictional);

  const firstDest = ents.length ? ents[0].dest : null;
  const lastDest  = ents.length ? ents[ents.length-1].dest : null;

  const phrases = [
    `Este año viajé ${km.toLocaleString()} km gracias a ${books} libro${books !== 1 ? 's' : ''}, sin moverme de casa.`,
    `De ${firstDest} a ${lastDest} en ${books} lectura${books !== 1 ? 's' : ''}. ${km.toLocaleString()} km recorridos.`,
    `${books} libro${books !== 1 ? 's' : ''}, ${dests.length} destino${dests.length !== 1 ? 's' : ''}, ${km.toLocaleString()} km. La lectura es el mejor viaje.`,
    fictional.length
      ? `Este año viajé hasta ${fictional[0].dest} y otros ${dests.length - 1} destinos. ${km.toLocaleString()} km en total.`
      : `${km.toLocaleString()} km recorridos en ${books} libro${books !== 1 ? 's' : ''}. Leer es viajar.`,
  ].filter(Boolean);

  return phrases[Math.floor(Math.random() * phrases.length)];
}
function regenPhrase() {
  document.getElementById('export-phrase').value = generatePhrase();
  renderExportPreview();
}

async function renderExportPreview() {
  const wrap = document.getElementById('export-preview-wrap');
  const loading = document.getElementById('export-preview-loading');
  loading.style.display = 'block';
  const old = wrap.querySelector('canvas');
  if (old) old.remove();

  const c = await buildExportCanvas();
  exportCanvas = c;

  const previewCanvas = document.createElement('canvas');
  const scale = Math.min(wrap.clientWidth / c.width, 250 / c.height);
  previewCanvas.width  = c.width  * scale;
  previewCanvas.height = c.height * scale;
  const pctx = previewCanvas.getContext('2d');
  pctx.drawImage(c, 0, 0, previewCanvas.width, previewCanvas.height);
  wrap.appendChild(previewCanvas);
  loading.style.display = 'none';
}

async function buildExportCanvas() {
  const { W, H } = EXPORT_FORMATS[exportFormat] || EXPORT_FORMATS.feed;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ===================== MODO MAPA =====================
  // Dibuja el mapa de rutas del usuario. Fondo propio (papel limpio), no
  // comparte el fondo con gradiente/círculos de los otros modos.
  if (exportMode === 'map') {
    return drawMapExport(ctx, canvas, W, H);
  }

  function centerOffset(blockTop, blockBottom) {
    const availTop = 40, footerZone = 100;
    const availBottom = H - footerZone;
    const blockH = blockBottom - blockTop;
    const desiredTop = availTop + (availBottom - availTop - blockH) / 2;
    return desiredTop - blockTop;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
  }

  // Fondo
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   '#faf8f4');
  bg.addColorStop(0.5, '#f5f2ec');
  bg.addColorStop(1,   '#f2eee7');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Textura: líneas de latitud/longitud fantasma
  ctx.strokeStyle = 'rgba(29,158,117,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += W/8) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += H/8) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Círculos decorativos
  ctx.strokeStyle = 'rgba(29,158,117,0.07)';
  ctx.lineWidth = 1.5;
  for (const r of [180, 300, 420]) {
    ctx.beginPath(); ctx.arc(W/2, H*0.42, r, 0, Math.PI*2); ctx.stroke();
  }

  function drawBrandLogo(cx, cy, size) {
    ctx.font = `italic ${size}px Georgia, serif`;
    ctx.textAlign = 'left';
    const w1 = ctx.measureText('Leer ').width;
    const w2 = ctx.measureText('es').width;
    const w3 = ctx.measureText(' viajar').width;
    let x = cx - (w1 + w2 + w3) / 2;
    ctx.fillStyle = '#1a1a18'; ctx.fillText('Leer ', x, cy); x += w1;
    ctx.fillStyle = '#1d9e75'; ctx.fillText('es', x, cy);     x += w2;
    ctx.fillStyle = '#1a1a18'; ctx.fillText(' viajar', x, cy);
    ctx.textAlign = 'center';
  }

  const exFiltered = getExportEntries();
  const km      = Math.round(exFiltered.reduce((s,e) => s+e.km, 0));
  const books   = new Set(exFiltered.map(e => e.book.toLowerCase().trim())).size;
  const places  = new Set(exFiltered.map(e => e.dest.toLowerCase())).size;
  const countries = new Set(exFiltered.filter(e=>!e.fictional)
    .map(e=>e.countryCode||e.country||'').filter(Boolean)).size;
  const pioneers = loadDiary().filter(e=>e.pioneer).length;
  const fictional = new Set(exFiltered.filter(e=>e.fictional).map(e=>e.dest.toLowerCase())).size;

  if (exportMode === 'stats' || exportMode === 'books') {
    const bookList = [...new Set(exFiltered.map(e => e.book))].slice(0, 6);
    const lastContentY = bookList.length ? (638 + (bookList.length - 1) * 28) : 495;
    const offsetY = centerOffset(50, lastContentY + 20);

    ctx.save();
    ctx.translate(0, offsetY);

    drawBrandLogo(W/2, 72, 28);

    ctx.fillStyle = '#9a948d';
    ctx.font = '500 13px Inter, sans-serif';
    ctx.letterSpacing = '0.12em';
    ctx.textAlign = 'center';
    ctx.fillText(exportPeriodSubtitle().toUpperCase(), W/2, 100);

    ctx.fillStyle = '#1a1a18';
    ctx.font = 'bold 110px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(km.toLocaleString(), W/2, 260);

    ctx.fillStyle = '#1d9e75';
    ctx.font = '400 20px Inter, sans-serif';
    ctx.fillText('KILÓMETROS LEÍDOS', W/2, 298);

    const sepG = ctx.createLinearGradient(120, 0, W-120, 0);
    sepG.addColorStop(0, 'transparent');
    sepG.addColorStop(0.3, '#1d9e75');
    sepG.addColorStop(0.7, '#1d9e75');
    sepG.addColorStop(1, 'transparent');
    ctx.strokeStyle = sepG;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(120, 330); ctx.lineTo(W-120, 330); ctx.stroke();

    const stats = [
      { val: places,   label: places === 1 ? 'destino' : 'destinos' },
      { val: countries,label: countries === 1 ? 'país' : 'países' },
      { val: books,    label: books === 1 ? 'libro' : 'libros' },
      { val: fictional,label: 'lugares imaginarios' },
      { val: pioneers, label: pioneers === 1 ? 'primera llegada' : 'primeras llegadas' },
    ];

    const colW = W / stats.length;
    const statY = 420;
    stats.forEach((s, i) => {
      const x = colW * i + colW / 2;
      roundRect(colW*i + 20, statY - 55, colW - 40, 130, 10);
      ctx.fillStyle = 'rgba(29,158,117,0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(29,158,117,0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#0f6e56';
      ctx.font = 'bold 44px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(s.val), x, statY + 8);

      ctx.fillStyle = '#9a948d';
      ctx.font = '400 12px Inter, sans-serif';
      const labelLines = s.label.split('\n');
      labelLines.forEach((l, li) => ctx.fillText(l.toUpperCase(), x, statY + 30 + li*16));
    });

    if (bookList.length) {
      ctx.fillStyle = '#b8b2a8';
      ctx.font = '400 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LECTURAS', W/2, 610);

      ctx.fillStyle = '#55504a';
      ctx.font = 'italic 17px Georgia, serif';
      bookList.forEach((b, i) => {
        const text = b.length > 42 ? b.slice(0,40)+'…' : b;
        ctx.fillText(text, W/2, 638 + i * 28);
      });
    }

    ctx.restore();

    const taglines = [
      '"Leer es la forma más barata de viajar."',
      '"Cada libro, un pasaporte."',
      '"Sin maletas. Sin límites."',
    ];
    ctx.fillStyle = 'rgba(29,158,117,0.75)';
    ctx.font = 'italic 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(taglines[books % taglines.length], W/2, H - 50);

    ctx.fillStyle = '#b8b2a8';
    ctx.font = '400 12px Inter, sans-serif';
    ctx.fillText('leeresviajar.app', W/2, H - 25);

  } else {
    // MODO WRAPPED
    const phrase = document.getElementById('export-phrase')?.value?.trim() || generatePhrase();
    ctx.font = 'italic 30px Georgia, serif';
    const words = phrase.split(' ');
    const maxLineW = W - 140;
    let lineArr = [], curLine = '';
    words.forEach(w => {
      const test = curLine ? curLine+' '+w : w;
      if (ctx.measureText(test).width > maxLineW && curLine) {
        lineArr.push(curLine); curLine = w;
      } else curLine = test;
    });
    if (curLine) lineArr.push(curLine);
    const lineH = 44;
    const phraseStartY = 530;
    const blist = [...new Set(exFiltered.map(e=>e.book))].slice(0,5);
    const listStartY = phraseStartY + lineArr.length*lineH + 60;
    const lastContentY = blist.length
      ? (listStartY + 28 + (blist.length-1)*28)
      : (phraseStartY + lineArr.length*lineH);
    const offsetY = centerOffset(55, lastContentY + 20);

    ctx.save();
    ctx.translate(0, offsetY);

    drawBrandLogo(W/2, 80, 26);

    ctx.fillStyle = '#9a948d';
    ctx.font = '500 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(exportWrappedSubtitle().toUpperCase(), W/2, 108);

    ctx.fillStyle = '#1a1a18';
    ctx.font = 'bold 96px Georgia, serif';
    ctx.fillText(km.toLocaleString() + ' km', W/2, 270);

    const sg = ctx.createLinearGradient(120,0,W-120,0);
    sg.addColorStop(0,'transparent'); sg.addColorStop(0.5,'#1d9e75'); sg.addColorStop(1,'transparent');
    ctx.strokeStyle = sg; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(120,310); ctx.lineTo(W-120,310); ctx.stroke();

    const ws = [
      {val: places, label: places===1?'destino':'destinos'},
      {val: countries, label: countries===1?'país':'países'},
      {val: books, label: books===1?'libro':'libros'},
    ];
    const cww = W / ws.length;
    ws.forEach((s,i) => {
      const x = cww*i + cww/2;
      ctx.fillStyle = '#0f6e56';
      ctx.font = 'bold 52px Georgia, serif';
      ctx.fillText(String(s.val), x, 400);
      ctx.fillStyle = '#9a948d';
      ctx.font = '400 13px Inter, sans-serif';
      ctx.fillText(s.label.toUpperCase(), x, 428);
    });

    ctx.fillStyle = '#1a1a18';
    ctx.font = 'italic 30px Georgia, serif';
    ctx.textAlign = 'center';
    lineArr.forEach((l,i) => ctx.fillText(l, W/2, phraseStartY + i*lineH));

    if (blist.length) {
      ctx.fillStyle = '#b8b2a8';
      ctx.font = '400 12px Inter, sans-serif';
      ctx.fillText('ESTE AÑO LEÍSTE', W/2, listStartY);
      ctx.fillStyle = '#55504a';
      ctx.font = 'italic 18px Georgia, serif';
      blist.forEach((b,i) => {
        const t = b.length>40 ? b.slice(0,38)+'…' : b;
        ctx.fillText(t, W/2, listStartY+28+i*28);
      });
    }

    ctx.restore();

    ctx.fillStyle = 'rgba(29,158,117,0.75)';
    ctx.font = 'italic 14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('"Leer es la forma más barata de viajar."', W/2, H-50);
    ctx.fillStyle = '#b8b2a8';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('leeresviajar.app', W/2, H-25);
  }

  return canvas;
}

// ===================== DIBUJO DEL MAPA (modo "map") =====================
function drawMapExport(ctx, canvas, W, H) {
  const paper='#faf7f2', ink='#1a1a18', teal='#1d9e75', forest='#0f6e56',
        rojo='#e8593c', orange='#e8913c', muted='#9a948d';
  const MAXR = 2.8; // tope de deformación aprobado

  const exFiltered = getExportEntries();

  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);

  // Cabecera
  ctx.textAlign = 'center';
  ctx.font = "italic 60px 'Instrument Serif', serif";
  const parts = [['Leer ', ink], ['es', teal], [' viajar', ink]];
  let total = 0; parts.forEach(p => total += ctx.measureText(p[0]).width);
  let sx = W/2 - total/2; ctx.textAlign = 'left';
  parts.forEach(p => { ctx.fillStyle = p[1]; ctx.fillText(p[0], sx, 160); sx += ctx.measureText(p[0]).width; });
  ctx.textAlign = 'center';
  ctx.font = "500 26px 'Inter', sans-serif"; ctx.fillStyle = muted; ctx.letterSpacing = '4px';
  ctx.fillText('MI MAPA LECTOR', W/2, 225); ctx.letterSpacing = '0px';

  // Si no hay viajes, mensaje simple y salimos
  if (!exFiltered.length) {
    ctx.font = "italic 32px 'Instrument Serif', serif"; ctx.fillStyle = muted;
    ctx.fillText('Aún no hay rutas que mostrar.', W/2, H/2);
    return canvas;
  }

  const headerH = 330, footerH = 210;
  const bX = 70, bY = headerH, bW = W - 140, bH = H - headerH - footerH;

  // Rejilla de fondo
  ctx.strokeStyle = 'rgba(29,158,117,0.10)'; ctx.lineWidth = 1.5;
  for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(bX+bW/6*i, bY); ctx.lineTo(bX+bW/6*i, bY+bH); ctx.stroke(); }
  for (let i = 0; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(bX, bY+bH/10*i); ctx.lineTo(bX+bW, bY+bH/10*i); ctx.stroke(); }

  // Construimos las "rutas" a partir de las entradas reales, en orden cronológico
  const sorted = exFiltered.slice().sort((a,b) => (a.date||'').localeCompare(b.date||''));
  const routes = sorted.map(en => ({
    from: [en.fromLng, en.fromLat], fromName: en.fromName,
    to: [en.destLng, en.destLat], toName: en.dest,
    fict: !!en.fictional
  }));

  const lons = routes.flatMap(r => [r.from[0], r.to[0]]);
  const lats = routes.flatMap(r => [r.from[1], r.to[1]]);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const latMid = (minLat+maxLat)/2 * Math.PI/180;
  const geoW = Math.max((maxLon-minLon) * Math.cos(latMid), 0.0001);
  const geoH = Math.max((maxLat-minLat), 0.0001);
  const pad = 0.13, aW = bW*(1-2*pad), aH = bH*(1-2*pad);
  let sxScale = aW/geoW, syScale = aH/geoH;
  if (sxScale > syScale*MAXR) sxScale = syScale*MAXR;
  if (syScale > sxScale*MAXR) syScale = sxScale*MAXR;
  const dW = geoW*sxScale, dH = geoH*syScale;
  const ox = bX + (bW-dW)/2, oy = bY + (bH-dH)/2;
  function P(lon, lat) { return [ox + ((lon-minLon)*Math.cos(latMid))*sxScale, oy + dH - ((lat-minLat))*syScale]; }

  // Rutas: mismo patrón de guion para reales y ficticias, solo cambia el color
  routes.forEach(r => {
    const a = P(r.from[0], r.from[1]), b = P(r.to[0], r.to[1]);
    ctx.strokeStyle = r.fict ? orange : rojo; ctx.lineWidth = 4;
    ctx.setLineDash([12, 8]);
    const mmx = (a[0]+b[0])/2, mmy = (a[1]+b[1])/2 - Math.abs(b[0]-a[0])*0.08;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(mmx, mmy, b[0], b[1]); ctx.stroke();
    ctx.setLineDash([]);
  });

  // Puntos (todos visibles)
  const uniq = {};
  routes.flatMap(r => [
    { lon: r.from[0], lat: r.from[1], name: r.fromName, fict: false },
    { lon: r.to[0], lat: r.to[1], name: r.toName, fict: r.fict }
  ]).forEach(p => { if (!uniq[p.name]) uniq[p.name] = p; });
  const list = Object.values(uniq);
  list.forEach(p => {
    const xy = P(p.lon, p.lat);
    ctx.beginPath(); ctx.arc(xy[0], xy[1], 10, 0, Math.PI*2);
    ctx.fillStyle = p.fict ? orange : forest; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  });

  // Etiquetas: ficticios primero, luego los más lejanos de casa (origin), máx 6, sin solapes
  const home = (typeof origin !== 'undefined' && origin) ? [origin.lng, origin.lat] : [list[0].lon, list[0].lat];
  function dh(p) { const dx = p.lon-home[0], dy = p.lat-home[1]; return Math.sqrt(dx*dx+dy*dy); }
  const fict = list.filter(p => p.fict).sort((a,b) => dh(b)-dh(a));
  const real = list.filter(p => !p.fict).sort((a,b) => dh(b)-dh(a));
  const chosen = [...fict.slice(0,6)];
  for (const r of real) { if (chosen.length >= 6) break; chosen.push(r); }
  const placed = [];
  function ov(a,b) { return !(a.x+a.w<b.x || b.x+b.w<a.x || a.y+a.h<b.y || b.y+b.h<a.y); }
  chosen.forEach(p => {
    const xy = P(p.lon, p.lat);
    ctx.font = p.fict ? "italic 32px 'Instrument Serif', serif" : "500 28px 'Inter', sans-serif";
    const label = p.fict ? ('✦ ' + p.name) : p.name;
    const tw = ctx.measureText(label).width, th = 36;
    const right = xy[0] > bX + bW*0.7;
    const off = right ? -18 : 18;
    const tx = right ? xy[0]+off-tw : xy[0]+off;
    const ty = xy[1] + 10;
    const box = { x: tx-6, y: ty-th+6, w: tw+12, h: th };
    if (placed.some(b => ov(box, b))) return;
    placed.push(box);
    ctx.fillStyle = p.fict ? orange : ink;
    ctx.textAlign = right ? 'right' : 'left';
    ctx.fillText(label, xy[0]+off, ty);
  });

  // Pie: km y nº de destinos reales (calculados de verdad, no de ejemplo)
  const km = Math.round(exFiltered.reduce((s,e) => s+e.km, 0));
  const places = new Set(exFiltered.map(e => e.dest.toLowerCase())).size;
  ctx.textAlign = 'center';
  ctx.font = "italic 34px 'Instrument Serif', serif"; ctx.fillStyle = 'rgba(29,158,117,0.85)';
  ctx.fillText(km.toLocaleString('es-ES') + ' km · ' + places + ' destino' + (places===1?'':'s'), W/2, H-160);
  ctx.font = "400 24px 'Inter', sans-serif"; ctx.fillStyle = muted;
  ctx.fillText('leeresviajar.app', W/2, H-100);

  return canvas;
}

function downloadExport() {
  if (!exportCanvas) return;
  const dataUrl = exportCanvas.toDataURL('image/png');
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    const win = window.open();
    win.document.write(`<img src="${dataUrl}" style="max-width:100%;display:block;margin:auto"><p style="text-align:center;font-family:sans-serif;color:#888;font-size:14px;margin-top:12px">Mantén pulsada la imagen para guardarla en Fotos</p>`);
    return;
  }
  const link = document.createElement('a');
  const modeLabel = { stats: 'stats', books: 'lecturas', wrapped: 'wrapped', map: 'mapa' }[exportMode] || exportMode;
  const fmtLabel = { story: 'historia', feed: 'feed' }[exportFormat] || exportFormat;
  const periodLabel = exportPeriod === 'total' ? 'todo' : String(exportPeriodValue);
  link.download = `leer-es-viajar-${modeLabel}-${fmtLabel}-${periodLabel}.png`;
  link.href = dataUrl;
  link.click();
}
