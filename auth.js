// ===================== SUPABASE AUTH =====================
// IMPORTANTE: sustituye SUPABASE_ANON_KEY por tu clave pública "anon"
// (Supabase → Settings → API → Project API keys → "anon public")
const SUPABASE_URL = 'https://mvmpxbyflklqcmunmywq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bXB4YnlmbGtscWNtdW5teXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTYyMjcsImV4cCI6MjA5ODEzMjIyN30.xG5GHJnwvcAylHNmDOTcqlNGrtiKzk1I_pGWH8Suqyc';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let authMode = 'signup'; // 'signup' | 'login'
// Evita recargar el estado en refires de SIGNED_IN (foco de pestaña, refresco
// de token): solo cargamos cuando cambia de verdad el usuario con sesión.
let lastLoadedUserId = null;
let currentUsername = null; // nombre de viajero del usuario en sesión
// true tras el primer refreshCurrentUsername() (con o sin username real).
// Evita el parpadeo de mostrar el email un instante mientras se consulta
// profiles: con sesión detectada pero username aún sin resolver, el badge
// se queda oculto (mismo estado que antes de que cargue el JS) en vez de
// caer al email como relleno.
let usernameLoaded = false;

// El enlace de recuperación de contraseña llega con type=recovery en la URL.
// Lo capturamos aquí, en la carga síncrona del script, porque la librería
// consume y limpia la URL durante su inicialización y para cuando corre
// initAuth puede no quedar rastro.
const cameFromRecoveryLink = /type=recovery/.test(window.location.hash + window.location.search);

// Se llama una vez al arrancar la app, antes de loadState()
async function initAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session ? session.user : null;
  // La carga inicial la hace el loadState() del arranque, así que marcamos
  // este usuario como ya cargado para que el SIGNED_IN de arranque no duplique.
  lastLoadedUserId = currentUser ? currentUser.id : null;
  updateUserBadge();

  // Si arrancamos con sesión ya activa (p. ej. volviendo del redirect de Google),
  // el evento SIGNED_IN podría no dispararse o quedar descartado por el guardia.
  // Comprobamos aquí mismo que el usuario tenga nombre; si no, se lo pedimos.
  if (currentUser) {
    const hasUsername = await ensureUsername(); // consulta, cachea y muestra el username en una sola llamada
    if (!hasUsername) {
      // Se mostrará la pantalla de elegir nombre; no seguimos hasta que elija.
      return;
    }
    // ¿Llegamos desde el enlace de recuperación de contraseña? El evento
    // PASSWORD_RECOVERY se emite durante la inicialización del cliente,
    // antes de registrar el listener de abajo, así que se pierde — misma
    // compensación de arranque que la del username de justo arriba.
    if (cameFromRecoveryLink) openAuthModal('recovery');
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session ? session.user : null;
    updateUserBadge();
    if (event === 'PASSWORD_RECOVERY') {
      // El usuario llega desde el enlace del email de recuperación:
      // abrimos el modal en modo "nueva contraseña".
      openAuthModal('recovery');
      return;
    }
    if (event === 'SIGNED_IN' && currentUser && currentUser.id !== lastLoadedUserId) {
      lastLoadedUserId = currentUser.id;

      // Nada de `await` de llamadas de Supabase dentro del propio callback:
      // el SIGNED_IN que emite el cliente al procesar el token del callback
      // de OAuth llega con su candado interno aún cogido, y una consulta
      // esperada aquí puede quedarse colgada para siempre (username sin
      // cargar, estado sin recargar). Despachamos el trabajo fuera.
      setTimeout(async () => {
        // ¿Falta el nombre de viajero? (usuarios de Google, o registros por email
        // cuyo nombre quedó pendiente hasta confirmar el correo)
        const hasUsername = await ensureUsername();
        if (!hasUsername) {
          // ensureUsername ya ha abierto el modo choose-username; no seguimos
          // hasta que el usuario elija un nombre.
          return;
        }
        closeAuthModal();
        await migrateLocalToCloud();
        loadState(); // recarga desde la nube al iniciar sesión
      }, 0);
    }
  });
}

// Muestra en la cabecera si hay sesión iniciada (email + botón de salir),
// o un enlace para iniciar sesión si no la hay.
function updateUserBadge() {
  const badge = document.getElementById('user-badge');
  const loginLink = document.getElementById('login-link');
  if (!badge || !loginLink) return;
  if (currentUser && !usernameLoaded) {
    // Sesión detectada pero username aún sin resolver: no mostrar nada
    // todavía (ni email ni username) para evitar el parpadeo.
    badge.style.display = 'none';
    loginLink.style.display = 'none';
    return;
  }
  if (currentUser) {
    const email = currentUser.email || '';
    // Mostramos el nombre de viajero si lo tenemos; si no, caemos al email.
    const display = currentUsername || email;
    document.getElementById('user-avatar').textContent = (display.charAt(0) || '?').toUpperCase();
    document.getElementById('user-email').textContent = display;
    badge.style.display = 'flex';
    loginLink.style.display = 'none';
  } else {
    badge.style.display = 'none';
    loginLink.style.display = 'block';
  }
}

// Carga el username del perfil (una sola consulta), lo cachea en
// currentUsername, refresca el badge y devuelve si el usuario tiene nombre.
async function refreshCurrentUsername() {
  if (!currentUser) { currentUsername = null; return false; }
  try {
    const { data } = await supabaseClient
      .from('profiles')
      .select('username')
      .eq('id', currentUser.id)
      .single();
    currentUsername = (data && data.username) ? data.username : null;
  } catch (e) {
    currentUsername = null;
  }
  usernameLoaded = true;
  updateUserBadge();
  return !!currentUsername;
}

// ===================== MIGRACIÓN LOCAL → NUBE =====================
// Si el usuario tenía datos guardados en este dispositivo antes de registrarse,
// los subimos a su cuenta nueva. Solo se migra si la cuenta está vacía en la nube,
// para no duplicar datos si inicia sesión otra vez más adelante desde este mismo dispositivo.
async function migrateLocalToCloud() {
  try {
    const localOriginRaw = localStorage.getItem('lev_origin');
    const localEntriesRaw = localStorage.getItem('lev_entries');
    if (!localEntriesRaw) return;

    const localEntries = JSON.parse(localEntriesRaw);
    if (!Array.isArray(localEntries) || localEntries.length === 0) return;

    const { data: existing, error: existingError } = await supabaseClient
      .from('entries')
      .select('id')
      .eq('user_id', currentUser.id)
      .limit(1);
    // Si la comprobación falla (p. ej. sin conexión), no migramos: sin la
    // certeza de que la cuenta está vacía podríamos duplicar datos.
    if (existingError) return;
    if (existing && existing.length) return; // ya tiene datos en la nube, no tocar nada

    if (localOriginRaw) {
      const o = JSON.parse(localOriginRaw);
      await supabaseClient.from('profiles').upsert({
        id: currentUser.id,
        origin_name: o.name,
        origin_lat: o.lat,
        origin_lng: o.lng
      });
    }

    const rows = localEntries.map(e => ({
      user_id: currentUser.id,
      book: e.book,
      author: e.author || null,
      note: e.note || null,
      dest: e.dest,
      dest_lat: e.destLat,
      dest_lng: e.destLng,
      from_name: e.fromName,
      from_lat: e.fromLat,
      from_lng: e.fromLng,
      km: e.km,
      fictional: !!e.fictional,
      country: e.country || null,
      country_code: e.countryCode || null,
      date: e.date,
      year: e.year || null,
      pioneer: !!e.pioneer,
      book_ref: e.bookRef || null,
      departure_mode: e.departureMode || null
    }));
    await supabaseClient.from('entries').insert(rows);

    // Limpiamos el local tras migrar, para que no se mezcle con la sesión de otro usuario después
    localStorage.removeItem('lev_origin');
    localStorage.removeItem('lev_entries');
  } catch (err) {
    console.warn('Error migrando datos locales a la nube:', err);
  }
}

// ===================== USERNAME =====================
// Reglas: 3-20 caracteres, letras (con tildes y ñ), números y guion bajo.
// Sin espacios ni otros símbolos. Único (sin distinguir mayúsculas/minúsculas
// lo gestiona el índice de la base de datos).
const USERNAME_RE = /^[\p{L}0-9_]{3,20}$/u;

let usernameCheckTimer = null;
let usernameStatus = 'empty'; // 'empty' | 'invalid' | 'checking' | 'taken' | 'ok'

function validateUsernameFormat(v) {
  if (!v) return { ok: false, reason: 'empty' };
  if (v.length < 3) return { ok: false, reason: 'Mínimo 3 caracteres.' };
  if (v.length > 20) return { ok: false, reason: 'Máximo 20 caracteres.' };
  if (/\s/.test(v)) return { ok: false, reason: 'Sin espacios.' };
  if (!USERNAME_RE.test(v)) return { ok: false, reason: 'Solo letras, números y guion bajo.' };
  return { ok: true };
}

function setUsernameHint(text, color) {
  const el = document.getElementById('auth-username-hint');
  if (!el) return;
  el.textContent = text || '';
  el.style.color = color || '#9a948d';
  // Solo ocupa espacio cuando hay mensaje, para que el hueco vacío no
  // descuadre la separación con el campo de email.
  el.style.marginTop = text ? '6px' : '0';
}

// Se llama en cada tecla del campo username (con debounce para la consulta a la nube)
function onUsernameInput() {
  const v = document.getElementById('auth-username').value.trim();
  clearTimeout(usernameCheckTimer);

  const fmt = validateUsernameFormat(v);
  if (!fmt.ok) {
    usernameStatus = v ? 'invalid' : 'empty';
    setUsernameHint(v ? fmt.reason : '', '#c14b34');
    return;
  }

  usernameStatus = 'checking';
  setUsernameHint('Comprobando disponibilidad…', '#9a948d');
  usernameCheckTimer = setTimeout(() => checkUsernameAvailable(v), 450);
}

async function checkUsernameAvailable(v) {
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id')
      .ilike('username', v)   // ilike = comparación sin distinguir mayúsculas
      .limit(1);
    if (error) {
      // Si la comprobación falla, no bloqueamos: se validará de nuevo al enviar.
      usernameStatus = 'ok';
      setUsernameHint('', '#9a948d');
      return;
    }
    if (data && data.length) {
      usernameStatus = 'taken';
      setUsernameHint('Ese nombre ya está cogido. Prueba otro.', '#c14b34');
    } else {
      usernameStatus = 'ok';
      setUsernameHint('¡Disponible!', '#137a5a');
    }
  } catch (e) {
    usernameStatus = 'ok';
    setUsernameHint('', '#9a948d');
  }
}

// Guarda el username en el perfil del usuario actual.
// Devuelve { ok } o { ok:false, reason } si el nombre se cogió entre medias.
async function saveUsername(v) {
  const { error } = await supabaseClient
    .from('profiles')
    .upsert({ id: currentUser.id, username: v });
  if (error) {
    // El índice único puede rechazarlo si alguien lo cogió a la vez (carrera).
    if (/duplicate|unique/i.test(error.message)) {
      return { ok: false, reason: 'Ese nombre acaba de cogerlo otra persona. Prueba otro.' };
    }
    return { ok: false, reason: 'No se pudo guardar el nombre. Inténtalo de nuevo.' };
  }
  return { ok: true };
}

// Garantiza que el usuario tenga username. Si hay uno pendiente (registro por
// email), lo asigna. Si no tiene ninguno (Google), abre el modo para elegirlo.
// Devuelve true si ya tiene (o se le acaba de asignar) username.
async function ensureUsername() {
  if (await refreshCurrentUsername()) return true;

  // ¿Había un nombre pendiente del registro por email?
  const pending = localStorage.getItem('lev_pending_username');
  if (pending) {
    const fmt = validateUsernameFormat(pending);
    if (fmt.ok) {
      const res = await saveUsername(pending);
      localStorage.removeItem('lev_pending_username');
      if (res.ok) { currentUsername = pending; updateUserBadge(); return true; }
      // Si el pendiente ya no está disponible, caemos a pedirlo de nuevo.
    } else {
      localStorage.removeItem('lev_pending_username');
    }
  }

  // No tiene username: le pedimos que elija uno y no le dejamos salir del modal.
  openAuthModal('choose-username');
  return false;
}

// ===================== MODAL: ABRIR / CERRAR =====================
function openAuthModal(mode) {
  setAuthMode(mode || 'signup');
  document.getElementById('auth-error').style.display = 'none';
  document.getElementById('auth-overlay').classList.add('open');
}
function closeAuthModal(force) {
  // En modo choose-username el nombre es obligatorio, y en modo recovery un
  // cierre accidental dejaría al usuario logueado sin poder cambiar la
  // contraseña ni reabrir el formulario: en ambos, ni X ni clic fuera.
  // Cuando cerramos nosotros tras guardar, pasamos force=true.
  if ((authMode === 'choose-username' || authMode === 'recovery') && !force) return;
  document.getElementById('auth-overlay').classList.remove('open');
}

function setAuthMode(mode) {
  authMode = mode;
  const isLogin = mode === 'login';
  const isRecovery = mode === 'recovery';
  const isChooseUsername = mode === 'choose-username';

  // "choose-username": modo especial tras login con Google (o cuenta sin nombre).
  // Solo se muestra el campo de nombre de viajero; ni tabs, ni Google, ni email,
  // ni contraseña. El usuario no puede cerrar el modal hasta elegir uno.
  document.getElementById('auth-tabs').style.display = (isRecovery || isChooseUsername) ? 'none' : 'flex';
  document.getElementById('auth-google-btn').style.display = (isRecovery || isChooseUsername) ? 'none' : 'flex';
  document.getElementById('auth-divider').style.display = (isRecovery || isChooseUsername) ? 'none' : 'flex';
  document.getElementById('auth-email-wrap').style.display = (isRecovery || isChooseUsername) ? 'none' : 'block';
  document.getElementById('auth-password-wrap').style.display = (isChooseUsername) ? 'none' : 'block';

  // El campo username se muestra en el registro y en el modo choose-username
  document.getElementById('auth-username-wrap').style.display = (mode === 'signup' || isChooseUsername) ? 'block' : 'none';

  if (!isRecovery && !isChooseUsername) {
    const tabLogin = document.getElementById('auth-tab-login');
    const tabSignup = document.getElementById('auth-tab-signup');
    tabLogin.style.borderBottomColor = isLogin ? '#1d9e75' : 'transparent';
    tabLogin.style.color = isLogin ? '#1a1a18' : '#9a948d';
    tabSignup.style.borderBottomColor = isLogin ? 'transparent' : '#1d9e75';
    tabSignup.style.color = isLogin ? '#9a948d' : '#1a1a18';
  }

  document.getElementById('auth-password-label').textContent = isRecovery ? 'NUEVA CONTRASEÑA' : 'CONTRASEÑA';
  document.getElementById('auth-password').placeholder = isRecovery ? 'Mínimo 6 caracteres' : 'Tu contraseña';

  document.getElementById('auth-headline').textContent = isChooseUsername
    ? 'Elige el nombre con el que viajarás'
    : (isRecovery
      ? 'Elige una nueva contraseña y sigue viajando'
      : (isLogin
        ? 'Guarda tus rutas y retómalas donde las dejaste'
        : 'Empieza a guardar tu mapa lector en la nube'));
  document.getElementById('auth-eyebrow').textContent = isChooseUsername ? '· ÚLTIMO PASO' : (isRecovery ? '· NUEVA CONTRASEÑA' : (isLogin ? '· INICIAR SESIÓN' : '· CREAR CUENTA'));
  document.getElementById('auth-google-label').textContent = isLogin ? 'Continuar con Google' : 'Registrarse con Google';
  document.getElementById('auth-submit').textContent = isChooseUsername ? 'Empezar a viajar' : (isRecovery ? 'Guardar contraseña' : (isLogin ? 'Entrar' : 'Crear cuenta'));
  document.getElementById('auth-forgot').style.display = isLogin ? 'block' : 'none';

  // Reset del campo username al cambiar de modo
  if (mode === 'signup' || isChooseUsername) {
    const u = document.getElementById('auth-username');
    if (u) u.value = '';
    setUsernameHint('', '#9a948d');
    usernameStatus = 'empty';
  }
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.background = '#fdf1ef';
  el.style.color = '#c14b34';
  el.style.display = 'block';
}

// Mensajes informativos (verde) en el mismo hueco que los errores
function showAuthInfo(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.background = '#eaf6f1';
  el.style.color = '#137a5a';
  el.style.display = 'block';
}

// ===================== ACCIONES =====================
async function authSubmit() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const username = (document.getElementById('auth-username').value || '').trim();

  // ── Modo especial: elegir username tras login con Google / cuenta sin nombre ──
  if (authMode === 'choose-username') {
    const fmt = validateUsernameFormat(username);
    if (!fmt.ok) { showAuthError(fmt.reason || 'Elige un nombre válido.'); return; }
    if (usernameStatus === 'taken') { showAuthError('Ese nombre ya está cogido. Prueba otro.'); return; }

    const btn = document.getElementById('auth-submit');
    const prev = btn.textContent; btn.textContent = 'Un momento…'; btn.disabled = true;
    try {
      const res = await saveUsername(username);
      if (!res.ok) { showAuthError(res.reason); return; }
      showAuthInfo('¡Listo! Buen viaje.');
      // Cierre forzado (salta el candado de choose-username) y carga de la app.
      currentUsername = username; // reflejar de inmediato en el badge
      updateUserBadge();
      setTimeout(() => {
        authMode = 'login';
        closeAuthModal(true);
        loadState();
      }, 900);
    } catch (e) {
      showAuthError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      btn.textContent = prev; btn.disabled = false;
    }
    return;
  }

  if (authMode === 'recovery') {
    if (!password || password.length < 6) { showAuthError('La contraseña necesita al menos 6 caracteres.'); return; }
  } else if (authMode === 'signup') {
    if (!email || !password) { showAuthError('Rellena email y contraseña.'); return; }
    const fmt = validateUsernameFormat(username);
    if (!fmt.ok) { showAuthError(fmt.reason || 'Elige un nombre de viajero.'); return; }
    if (usernameStatus === 'taken') { showAuthError('Ese nombre ya está cogido. Prueba otro.'); return; }
  } else if (!email || !password) {
    showAuthError('Rellena email y contraseña.'); return;
  }

  const btn = document.getElementById('auth-submit');
  const prevText = btn.textContent;
  btn.textContent = 'Un momento…'; btn.disabled = true;

  try {
    if (authMode === 'recovery') {
      const { error } = await supabaseClient.auth.updateUser({ password });
      if (error) { showAuthError(traduceErrorAuth(error.message)); return; }
      document.getElementById('auth-password').value = '';
      showAuthInfo('Contraseña actualizada. ¡Buen viaje!');
      setTimeout(() => closeAuthModal(true), 1600);
      return;
    }
    if (authMode === 'signup') {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) { showAuthError(traduceErrorAuth(error.message)); return; }
      // Con confirmación de email activada, Supabase no devuelve error si el
      // correo ya está registrado: responde con user.identities vacío.
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        showAuthInfo('Ya existe una cuenta con este correo. Inicia sesión, o restablece la contraseña si no la recuerdas.');
        return;
      }
      // Guardamos el username elegido. Si hay sesión inmediata (confirmación de
      // email desactivada), lo guardamos ya; si no, lo dejamos pendiente para
      // guardarlo cuando confirme el correo y entre.
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) {
        const res = await saveUsername(username);
        if (!res.ok) { showAuthError(res.reason); return; }
      } else {
        // Sin sesión aún (debe confirmar email): guardamos el nombre localmente
        // para asignarlo en cuanto entre por primera vez.
        localStorage.setItem('lev_pending_username', username);
        showAuthInfo('Cuenta creada. Revisa tu correo para confirmarla.');
        return;
      }
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) { showAuthError(traduceErrorAuth(error.message)); return; }
    }
  } catch (e) {
    showAuthError('Error de conexión. Inténtalo de nuevo.');
  } finally {
    btn.textContent = prevText; btn.disabled = false;
  }
}

// ===================== RECUPERAR CONTRASEÑA =====================
async function authForgotPassword() {
  const email = document.getElementById('auth-email').value.trim();
  if (!email || !email.includes('@')) {
    showAuthError('Escribe tu email arriba y vuelve a pulsar aquí.');
    document.getElementById('auth-email').focus();
    return;
  }
  const link = document.getElementById('auth-forgot-link');
  const prev = link.textContent;
  link.textContent = 'Enviando…';
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) { showAuthError(traduceErrorAuth(error.message)); return; }
    showAuthInfo('Te hemos enviado un correo para restablecer la contraseña. Revisa tu bandeja.');
  } catch (e) {
    showAuthError('Error de conexión. Inténtalo de nuevo.');
  } finally {
    link.textContent = prev;
  }
}

async function authSignInWithGoogle() {
  // Usamos origin + pathname (sin hash ni query): si pasáramos
  // window.location.href, su '#' se juntaría con el '#access_token' que añade
  // Supabase al volver, creando un '##' que rompe el parseo de la sesión.
  await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
}

function traduceErrorAuth(msg) {
  if (/already registered/i.test(msg)) return 'Ese email ya tiene una cuenta. Prueba a iniciar sesión.';
  if (/invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.';
  if (/password.*least/i.test(msg)) return 'La contraseña necesita al menos 6 caracteres.';
  const mSec = msg.match(/only request this after (\d+) seconds/i);
  if (mSec) return `Por seguridad, espera ${mSec[1]} segundos antes de volver a intentarlo.`;
  if (/email rate limit exceeded/i.test(msg)) return 'Hemos enviado demasiados correos a esta dirección. Espera unos minutos e inténtalo de nuevo.';
  if (/email not confirmed/i.test(msg)) return 'Tu cuenta aún no está confirmada. Revisa el correo que te enviamos.';
  if (/unable to validate email|invalid.*email/i.test(msg)) return 'Ese email no parece válido. Revísalo.';
  console.warn('[auth] error sin traducir:', msg);
  return 'Algo no ha ido bien. Inténtalo de nuevo en unos segundos.';
}

async function authSignOut() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  location.reload();
}

// ===================== TOAST: CTA AL PRIMER LIBRO =====================
function showAuthCtaToast() {
  if (currentUser) return; // ya tiene cuenta
  if (localStorage.getItem('lev_auth_cta_dismissed')) return; // ya lo cerró antes
  const toast = document.getElementById('auth-cta-toast');
  toast.classList.add('show');
}
function dismissAuthCtaToast() {
  document.getElementById('auth-cta-toast').classList.remove('show');
  localStorage.setItem('lev_auth_cta_dismissed', '1');
}
function openAuthFromCta() {
  document.getElementById('auth-cta-toast').classList.remove('show');
  openAuthModal('signup');
}


// ===================== MOSTRAR / OCULTAR CONTRASEÑA =====================
function toggleAuthPassword(el) {
  const p = document.getElementById('auth-password');
  const show = p.type === 'password';
  p.type = show ? 'text' : 'password';
  // Ojo abierto vs ojo tachado
  el.innerHTML = show
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
}
