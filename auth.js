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

// Se llama una vez al arrancar la app, antes de loadState()
async function initAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session ? session.user : null;
  // La carga inicial la hace el loadState() del arranque, así que marcamos
  // este usuario como ya cargado para que el SIGNED_IN de arranque no duplique.
  lastLoadedUserId = currentUser ? currentUser.id : null;
  updateUserBadge();

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    currentUser = session ? session.user : null;
    updateUserBadge();
    if (event === 'SIGNED_IN' && currentUser && currentUser.id !== lastLoadedUserId) {
      lastLoadedUserId = currentUser.id;
      closeAuthModal();
      await migrateLocalToCloud();
      loadState(); // recarga desde la nube al iniciar sesión
    }
  });
}

// Muestra en la cabecera si hay sesión iniciada (email + botón de salir),
// o un enlace para iniciar sesión si no la hay.
function updateUserBadge() {
  const badge = document.getElementById('user-badge');
  const loginLink = document.getElementById('login-link');
  if (!badge || !loginLink) return;
  if (currentUser) {
    const email = currentUser.email || '';
    document.getElementById('user-avatar').textContent = email.charAt(0).toUpperCase();
    document.getElementById('user-email').textContent = email;
    badge.style.display = 'flex';
    loginLink.style.display = 'none';
  } else {
    badge.style.display = 'none';
    loginLink.style.display = 'block';
  }
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
      pioneer: !!e.pioneer
    }));
    await supabaseClient.from('entries').insert(rows);

    // Limpiamos el local tras migrar, para que no se mezcle con la sesión de otro usuario después
    localStorage.removeItem('lev_origin');
    localStorage.removeItem('lev_entries');
  } catch (err) {
    console.warn('Error migrando datos locales a la nube:', err);
  }
}

// ===================== MODAL: ABRIR / CERRAR =====================
function openAuthModal(mode) {
  setAuthMode(mode || 'signup');
  document.getElementById('auth-error').style.display = 'none';
  document.getElementById('auth-overlay').classList.add('open');
}
function closeAuthModal() {
  document.getElementById('auth-overlay').classList.remove('open');
}

function setAuthMode(mode) {
  authMode = mode;
  const isLogin = mode === 'login';
  const tabLogin = document.getElementById('auth-tab-login');
  const tabSignup = document.getElementById('auth-tab-signup');
  tabLogin.style.borderBottomColor = isLogin ? '#1d9e75' : 'transparent';
  tabLogin.style.color = isLogin ? '#1a1a18' : '#9a948d';
  tabSignup.style.borderBottomColor = isLogin ? 'transparent' : '#1d9e75';
  tabSignup.style.color = isLogin ? '#9a948d' : '#1a1a18';
  document.getElementById('auth-headline').textContent = isLogin
    ? 'Guarda tus rutas y retómalas donde las dejaste'
    : 'Empieza a guardar tu mapa lector en la nube';
  document.getElementById('auth-eyebrow').textContent = isLogin ? '· INICIAR SESIÓN' : '· CREAR CUENTA';
  document.getElementById('auth-google-label').textContent = isLogin ? 'Continuar con Google' : 'Registrarse con Google';
  document.getElementById('auth-submit').textContent = isLogin ? 'Entrar' : 'Crear cuenta';
  document.getElementById('auth-forgot').style.display = isLogin ? 'block' : 'none';
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = 'block';
}

// ===================== ACCIONES =====================
async function authSubmit() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email || !password) { showAuthError('Rellena email y contraseña.'); return; }

  const btn = document.getElementById('auth-submit');
  const prevText = btn.textContent;
  btn.textContent = 'Un momento…'; btn.disabled = true;

  try {
    if (authMode === 'signup') {
      const { error } = await supabaseClient.auth.signUp({ email, password });
      if (error) { showAuthError(traduceErrorAuth(error.message)); return; }
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) { showAuthError(traduceErrorAuth(error.message)); return; }
    }
    // Si la confirmación de email está activada en Supabase, aquí no habrá sesión
    // todavía y el usuario deberá confirmar el correo antes de entrar.
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session && authMode === 'signup') {
      showAuthError('Cuenta creada. Revisa tu correo para confirmarla.');
    }
  } catch (e) {
    showAuthError('Error de conexión. Inténtalo de nuevo.');
  } finally {
    btn.textContent = prevText; btn.disabled = false;
  }
}

async function authSignInWithGoogle() {
  await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
}

function traduceErrorAuth(msg) {
  if (/already registered/i.test(msg)) return 'Ese email ya tiene una cuenta. Prueba a iniciar sesión.';
  if (/invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.';
  if (/password.*least/i.test(msg)) return 'La contraseña necesita al menos 6 caracteres.';
  return msg;
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
