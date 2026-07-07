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
  document.getElementById('date-display').textContent = formatDate(selectedDate);
  document.getElementById('date-picker').value = selectedDate;
}
function resetDate() { initDate(); document.getElementById('date-picker').style.display = 'none'; }
function toggleDatePicker() {
  const p = document.getElementById('date-picker');
  p.style.display = p.style.display === 'none' ? 'inline-block' : 'none';
  if (p.style.display !== 'none') p.focus();
}
function onDateChange(val) {
  selectedDate = val;
  document.getElementById('date-display').textContent = formatDate(val);
  document.getElementById('date-picker').style.display = 'none';
}
