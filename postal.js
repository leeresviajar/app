// ===================== POSTAL =====================
// Lee los datos del propio botón (data-attributes), evitando meter texto de
// usuario dentro de un onclick (donde comillas o caracteres raros rompían el JS).
function openPostalFromEl(el) {
  openPostal(
    el.getAttribute('data-dest') || '',
    el.getAttribute('data-book') || '',
    el.getAttribute('data-fictional') === 'true'
  );
}

function openPostal(dest, book, fictional) {
  const overlay = document.getElementById('postal-overlay');
  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('postal-place-display').childNodes[0].textContent = (fictional ? '✦ ' : '') + dest;
  overlay.classList.toggle('fictional', !!fictional);
  document.getElementById('postal-book-display').textContent = book ? `Leyendo: ${book}` : '';
  document.getElementById('postal-stamp-place').textContent = dest;
  document.getElementById('postal-stamp-date').textContent = today;
  document.getElementById('postal-quote').value = '';
  document.getElementById('postal-to-name').value = '';
  document.getElementById('postal-to-email').value = '';
  document.getElementById('postal-form-side').style.display = 'flex';
  document.getElementById('postal-sent-side').style.display = 'none';
  overlay.classList.add('open');
}

function closePostal() {
  document.getElementById('postal-overlay').classList.remove('open');
}

async function sendPostal() {
  const name = document.getElementById('postal-to-name').value.trim();
  const email = document.getElementById('postal-to-email').value.trim();
  const place = document.getElementById('postal-stamp-place').textContent;
  const book = document.getElementById('postal-book-display').textContent.replace('Leyendo: ', '').trim();
  const quote = document.getElementById('postal-quote').value.trim();
  const date = document.getElementById('postal-stamp-date').textContent;

  if (!email || !email.includes('@')) {
    alert('Introduce un email válido.');
    return;
  }

  const btn = document.querySelector('.postal-btn-send');
  btn.disabled = true;
  btn.textContent = 'Enviando…';

  try {
    const res = await fetch('https://leer-es-viajar-postal.paula-7a6.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toName: name, toEmail: email, fromPlace: place, book, quote, date })
    });

    if (res.ok) {
      document.getElementById('postal-form-side').style.display = 'none';
      document.getElementById('postal-sent-side').style.display = 'flex';
      document.getElementById('postal-sent-msg').textContent =
        name ? `Tu postal a ${name} ha salido de ${place}.` : `Tu postal ha salido de ${place}.`;
      document.querySelector('#postal-sent-side small').textContent = 'Debería llegar en unos segundos.';
    } else {
      const err = await res.text();
      alert('Error al enviar la postal. Inténtalo de nuevo.');
      console.error(err);
    }
  } catch (e) {
    alert('Error de conexión. Comprueba tu internet e inténtalo de nuevo.');
    console.error(e);
  } finally {
    btn.disabled = false;
    btn.textContent = '✉️ Enviar postal';
  }
}
