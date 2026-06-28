// ===================== DATE =====================
function todayStr() { return new Date().toISOString().split('T')[0]; }
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
