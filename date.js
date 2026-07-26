// ===================== DATE =====================
function todayStr() {
  // Fecha LOCAL (no UTC): evita que entre medianoche y las 2h en España
  // la fecha por defecto salga la del día anterior.
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function formatDate(str) {
  if (!str) return '';
  return new Date(str + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}
function initDate() {
  selectedDate = todayStr();
  const p = document.getElementById('date-picker');
  if (p) p.value = selectedDate;
  // La fecha se lee en la meta-línea del formulario, fuera del panel.
  if (typeof updateOriginNarrative === 'function') updateOriginNarrative();
}

function resetDate() { initDate(); }

function onDateChange(val) {
  const p = document.getElementById('date-picker');
  // El input nativo dispara change en cada tecla del año: mientras la fecha
  // no sea válida (año 0002 al teclear "2023") el cambio no se comete.
  if (!val || (p && !p.checkValidity())) return;
  selectedDate = val;
  if (typeof updateOriginNarrative === 'function') updateOriginNarrative();
}

function onDateBlur() {
  // Si sale del campo con una fecha incompleta o fuera de rango, se restaura
  // la última válida en vez de dejar el input y el estado descuadrados.
  const p = document.getElementById('date-picker');
  if (!p) return;
  if (!p.value || !p.checkValidity()) p.value = selectedDate;
}
