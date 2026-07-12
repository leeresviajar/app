// ===================== STATE =====================
let origin = null;
let entries = [];
let departure = 'last';
let activeYear = 'all';
let selectedDate = todayStr();
let markersLayer = null;
let selectedBookRef = null;

// ===================== ESCAPE HTML (seguridad) =====================
// Escapa texto de usuario antes de insertarlo en HTML, para no romper la
// interfaz con caracteres normales (comillas, <, &) ni permitir inyección
// cuando se muestren datos de otros usuarios (capa de comunidad).
function esc(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Para texto que va dentro de un atributo onclick="...(&quot;VALOR&quot;)":
// escapamos comillas y barras para no romper el JS ni el atributo.
function escAttr(v) {
  if (v == null) return '';
  return String(v)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '\\\'')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
