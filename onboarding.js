// ===================== ONBOARDING =====================
const ONBOARDING_STEPS_MOBILE = [
  {
    label: 'Paso 1 de 3', icon: '🗺',
    text: '<em>Este mapa está vivo.</em> Cada ruta es un viaje lector y lo construimos leyendo.',
    target: '#map', placement: 'center'
  },
  {
    label: 'Paso 2 de 3', icon: '✏️',
    text: 'Toca <em>Añadir</em> para registrar un viaje: el libro, el destino y desde dónde partes.',
    target: '#mtab-anadir', placement: 'top', pad: 6
  },
  {
    label: 'Paso 3 de 3', icon: '📖',
    text: 'Aquí viven tus rutas, tu diario de lectura y los logros que desbloqueas leyendo. <em>¡Buen viaje!</em>',
    target: ['#mtab-viajes', '#mtab-diario', '#mtab-logros'], spanAll: true, placement: 'top', pad: 6
  }
];

// Escritorio: 4 pasos. Los antiguos 2 (origen) y 5 (segmentado «Sales desde»)
// se fusionan en el último: los dos valores viven ahora en la meta-línea y su
// panel, y resaltar dos veces casi el mismo rectángulo no aportaba nada.
const ONBOARDING_STEPS = [
  {
    label: 'Paso 1 de 4',
    icon: '🗺',
    text: '<em>Este mapa está vivo.</em> Cada ruta es un viaje lector y lo construimos leyendo.',
    target: '#map', placement: 'center', pad: -28
  },
  {
    label: 'Paso 2 de 4',
    icon: '📍',
    text: '<em>Escribe aquí tu destino.</em> Ciudad, isla, planeta o reino: si te llevó un libro, cuenta.',
    target: '#row-destination', placement: 'right', pad: 8
  },
  {
    label: 'Paso 3 de 4',
    icon: '📖',
    text: '<em>¿Qué estás leyendo?</em> Cada destino queda unido al libro que te llevó hasta él.',
    target: '#row-book', placement: 'right', pad: 8
  },
  {
    // Un solo selector: #meta-line es el contenedor en sus dos estados, y
    // cuando aún no hay origen su único contenido es el enlace, así que el
    // recuadro cae sobre él sin necesidad de ramificar.
    label: 'Paso 4 de 4',
    icon: '🧭',
    text: '<em>De aquí sales y este es el día.</em> Puedes cambiarlo cuando quieras.',
    target: '#row-meta', placement: 'right', pad: 8
  }
];

let onboardingStep = 0;
let onboardingActive = false;

function initOnboarding() {
  if (localStorage.getItem('lev_onboarding_done')) return;
  window._obSteps = isMobile() ? ONBOARDING_STEPS_MOBILE : ONBOARDING_STEPS;
  showOnboardingStep(0);
}

// ¿Sigue existiendo algo a lo que apuntar? Se comprueba EXISTENCIA, no
// tamaño: un elemento puede medir cero un instante mientras el layout se
// asienta (le pasa a #map justo tras un resize) y saltar el paso por eso
// sería un falso positivo. Del tamaño ya se ocupa positionOnboarding(), que
// simplemente esconde el recuadro. Un paso sin target declarado es válido:
// la tarjeta se muestra centrada.
function stepHasTarget(step) {
  const selectors = Array.isArray(step.target) ? step.target : (step.target ? [step.target] : []);
  if (!selectors.length) return true;
  return selectors.some(sel => document.querySelector(sel));
}

function showOnboardingStep(i) {
  const overlay = document.getElementById('onboarding-overlay');
  const step = window._obSteps[i];
  if (!step) { finishOnboarding(); return; }

  // Un selector obsoleto dejaba la tarjeta en pantalla sin recuadro y podía
  // cortar la secuencia. Peor momento posible: la primera visita. Se salta.
  if (!stepHasTarget(step)) {
    if (i < window._obSteps.length - 1) showOnboardingStep(i + 1);
    else finishOnboarding();
    return;
  }

  overlay.style.display = 'block';
  overlay.style.pointerEvents = 'auto';

  document.getElementById('onboarding-step').textContent = step.label;
  document.getElementById('onboarding-text').innerHTML =
    '<span style="font-size:1.4rem;display:block;margin-bottom:0.5rem;font-style:normal">' + step.icon + '</span>' + step.text;
  document.getElementById('onboarding-next').textContent =
    i === window._obSteps.length - 1 ? '¡Empezar! →' : 'Siguiente →';

  const dots = document.getElementById('onboarding-dots');
  dots.innerHTML = window._obSteps.map((_, j) =>
    '<div class="onboarding-dot' + (j === i ? ' active' : '') + '"></div>'
  ).join('');

  const animate = onboardingActive;
  onboardingStep = i;
  onboardingActive = true;

  requestAnimationFrame(() => positionOnboarding(i, animate));
}

function positionOnboarding(i, animate) {
  const step = window._obSteps[i];
  const highlight = document.getElementById('onboarding-highlight');
  const card = document.getElementById('onboarding-card');
  const vw = window.innerWidth;
  const tabbar = document.getElementById('mobile-tabbar');
  const tabbarH = (tabbar && getComputedStyle(tabbar).display !== 'none') ? tabbar.getBoundingClientRect().height : 0;
  const vh = window.innerHeight - tabbarH;
  const m = 16;

  let hRect = null;
  const pad = (step.pad != null) ? step.pad : 8;
  const selectors = Array.isArray(step.target) ? step.target : (step.target ? [step.target] : []);
  if (step.spanAll) {
    let u = null;
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (!u) u = { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
      else { u.top = Math.min(u.top, r.top); u.left = Math.min(u.left, r.left); u.right = Math.max(u.right, r.right); u.bottom = Math.max(u.bottom, r.bottom); }
    }
    if (u) hRect = { top: u.top - pad, left: u.left - pad, width: (u.right - u.left) + pad * 2, height: (u.bottom - u.top) + pad * 2 };
  } else {
    let target = null;
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) { target = el; break; } }
    }
    if (target) {
      const r = target.getBoundingClientRect();
      hRect = { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
    }
  }

  if (hRect) {
    const clampedLeft = Math.max(0, hRect.left);
    const clampedTop = Math.max(0, hRect.top);
    const clampedRight = Math.min(vw, hRect.left + hRect.width);
    const highlightVh = step.placement === 'top' ? window.innerHeight : vh;
    const clampedBottom = Math.min(highlightVh, hRect.top + hRect.height);
    hRect = { top: clampedTop, left: clampedLeft, width: clampedRight - clampedLeft, height: clampedBottom - clampedTop };
    highlight.style.transition = animate ? 'all 0.45s cubic-bezier(0.4,0,0.2,1)' : 'none';
    highlight.style.display = 'block';
    highlight.style.top = hRect.top + 'px';
    highlight.style.left = hRect.left + 'px';
    highlight.style.width = hRect.width + 'px';
    highlight.style.height = hRect.height + 'px';
  } else {
    highlight.style.display = 'none';
  }

  card.style.transition = 'none';
  card.style.opacity = '0';
  card.style.transform = 'none';
  card.style.right = 'auto';
  card.style.bottom = 'auto';
  const cw = card.offsetWidth, ch = card.offsetHeight;

  const sb = document.querySelector('.sidebar');
  const sbRight = sb ? sb.getBoundingClientRect().right : 380;

  let left, top;
  if (!hRect || step.placement === 'center') {
    left = isMobile() ? vw / 2 - cw / 2 : sbRight + (vw - sbRight) / 2 - cw / 2;
    top = vh / 2 - ch / 2;
  } else if (step.placement === 'top') {
    left = vw / 2 - cw / 2;
    top = hRect.top - ch - m;
  } else if (step.placement === 'right') {
    left = hRect.left + hRect.width + m;
    top = hRect.top + hRect.height / 2 - ch / 2;
    if (left + cw > vw - m) {
      left = sbRight + (vw - sbRight) / 2 - cw / 2;
    }
  } else {
    left = vw / 2 - cw / 2;
    top = vh / 2 - ch / 2;
  }

  left = Math.max(m, Math.min(left, vw - cw - m));
  top = Math.max(m, Math.min(top, vh - ch - m));

  card.style.left = left + 'px';
  card.style.top = top + 'px';

  void card.offsetWidth;
  card.style.transition = (animate ? 'top 0.4s cubic-bezier(0.4,0,0.2,1), left 0.4s cubic-bezier(0.4,0,0.2,1), ' : '') + 'opacity 0.3s ease';
  card.style.opacity = '1';
}

window.addEventListener('resize', () => {
  const overlay = document.getElementById('onboarding-overlay');
  if (overlay && overlay.style.display === 'block') {
    positionOnboarding(onboardingStep, false);
  }
});

function nextOnboardingStep() {
  if (onboardingStep < window._obSteps.length - 1) {
    showOnboardingStep(onboardingStep + 1);
  } else {
    finishOnboarding();
  }
}

function finishOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.4s ease';
  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'none';
  }, 400);
  onboardingActive = false;
  localStorage.setItem('lev_onboarding_done', '1');
}

// ===================== TOOLTIP BIENVENIDA =====================
function initWelcomeTooltip() {
  const seen = localStorage.getItem('lev_welcome_seen');
  const el = document.getElementById('welcome-tooltip');
  if (seen) { el.style.display = 'none'; return; }
  setTimeout(() => dismissWelcome(), 8000);
}
function dismissWelcome() {
  const el = document.getElementById('welcome-tooltip');
  el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  el.style.opacity = '0';
  el.style.transform = 'translate(-50%, -48%)';
  setTimeout(() => el.style.display = 'none', 400);
  localStorage.setItem('lev_welcome_seen', '1');
}
