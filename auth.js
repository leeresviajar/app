// ===================== SUPABASE AUTH =====================
// IMPORTANTE: sustituye SUPABASE_ANON_KEY por tu clave pública "anon"
// (Supabase → Settings → API → Project API keys → "anon public")
const SUPABASE_URL = 'https://mvmpxbyflklqcmunmywq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bXB4YnlmbGtscWNtdW5teXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTYyMjcsImV4cCI6MjA5ODEzMjIyN30.xG5GHJnwvcAylHNmDOTcqlNGrtiKzk1I_pGWH8Suqyc';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let authMode = 'signup'; // 'signup' | 'login'

// Se llama una vez al arrancar la app, antes de loadState()
async function initAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session ? session.user : null;

  supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session ? session.user : null;
    if (event === 'SIGNED_IN') {
      closeAuthModal();
      loadState(); // recarga desde la nube al iniciar sesión
    }
  });
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
  await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
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
