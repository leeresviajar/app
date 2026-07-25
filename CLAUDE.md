# Leer es viajar — reglas del proyecto

App web en español: mapa literario donde lectores registran libros ligados a destinos (reales o ficticios) y miden su lectura en kilómetros. En producción con testers reales (beta.leeresviajar.app). Segunda expedición (nueva oleada de beta) el 1 de agosto de 2026.

## Reglas de trabajo (INNEGOCIABLES)

1. **Nunca hagas push sin OK explícito de Paula.** Propón el commit, espera confirmación.
2. **Cambios quirúrgicos siempre.** Nunca regeneres un archivo entero salvo petición explícita.
3. **Lee el archivo actual del disco antes de editarlo.** Nunca asumas su contenido.
4. **Explica cada cambio antes de aplicarlo** y espera aprobación.
5. Esto es **producción con usuarios reales**: ante la duda, pregunta antes de actuar.

## Git

- Rama de trabajo: `redesign-concepto-b`. **`main` es legacy, no se toca.**
- Commits: en inglés, cortos, en minúscula, con prefijo (`feat: ...`, `fix: ...`).
- Deploy: GitHub Pages publica automáticamente tras el push (propagación ~10 min, la caché puede retrasar).

## Arquitectura

- Frontend estático: `app.html` (shell) + `app.css` (raíz del repo) + 15 módulos JS.
- Punto de entrada público: `index.html` — bienvenida de la beta (GitHub Pages la sirve en la raíz); enlaza a `app.html` (la app real) y a `feedback_leer_es_viajar.html`. No es legacy.
- `leer_es_viajar_v5.html` es LEGACY: copia monolítica antigua con todo inline, sin referencias desde ningún otro archivo. No editarla nunca — los cambios van siempre en `app.html` + módulos.
- **NO usar ES modules** (import/export): romperían GitHub Pages sin bundler. Los módulos se cargan con `<script>` clásicos y comparten scope global.
- Backend: Supabase (auth Google OAuth + email/contraseña, tablas `profiles` y `entries` con RLS).
- El "diario" NO es una tabla aparte: es `entries` ordenado por fecha descendente.
- Cloudflare Workers (`leer-es-viajar-postal`, `leer-es-viajar-beta-requests`): se despliegan a mano en el dashboard de Cloudflare, no desde este repo.
- Emails vía Resend: `postales@` y `expediciones@leeresviajar.app`.
- Mapas: Leaflet. Geocoding: Nominatim (timeout 5s) + Open Library / Google Books para datos de libros.
- Lugares ficticios: hardcodeados en `FICTIONAL` y `COMMUNITY_POSITIONS` (aislados para futura migración a Supabase).
- Analytics: Plausible. Feedback: Formspree (`mqevpabl`).

## Diseño y marca

- Paleta: paper `#faf7f2`, teal `#1d9e75`, forest `#0f6e56`, naranja `#e8913c`, rojo `#e8593c`, mint `#9fd9c0`, ink `#1a1a18`.
- **Naranja `#e8913c` = SOLO destinos ficticios. Rojo `#e8593c` = lo del usuario (rutas y destinos propios; en un ficticio del usuario manda el naranja).** Nunca intercambiarlos.
- El símbolo **✦ está reservado en exclusiva para destinos ficticios**. Nunca decorativo.
- Las rutas nunca son ficticias — solo los destinos lo son.
- Dirección de rediseño (Concepto B "Minimalismo cartográfico"): blanco puro, Inter + Instrument Serif, máximo espacio en blanco, sidebar ultrafino, el mapa como protagonista.

## Copy y tono

- Todo el copy de cara al usuario en español, tono literario y sobrio, sin lenguaje con género en mensajes de éxito.
- El modal de ficticios siempre muestra el mensaje de comunidad ("X viajeros lo han colocado en..."), nunca queda en silencio ni dice "todavía nadie".

## Mapa de funcionalidades

- **Postales**: modal y envío en `postal.js`; email vía worker `leer-es-viajar-postal` → Resend (`postales@`). El worker NO vive en este repo.
- **Auth + username**: `auth.js` (Google OAuth, email/contraseña, pantalla obligatoria choose-username, badge de sesión).
- **Migración localStorage → Supabase**: `migrateLocalToCloud()` en `auth.js`; solo primera vez con cuenta vacía.
- **Diario**: `diary.js`; compone el libro como "Título, de Autor" cuando hay autor.
- **Destinos ficticios**: objetos `FICTIONAL` y `COMMUNITY_POSITIONS`; modal con mensaje de comunidad.
- **Rutas de comunidad**: reales, agregadas y anónimas desde la vista `public_community_routes` de Supabase (SQL documentado en `sql/`, se aplica a mano en el dashboard; visible sin login). En `map.js`: caché de 5 min, volumen ajustable con `COMMUNITY_CONFIG`, agregación por origen+destino+libro con descuento de las lecturas propias, toggle persistido en `lev_show_community`.
- **Logros / Pionero**: `isPioneer()` (diary.js) es LOCAL — solo compara contra las entradas del propio usuario y la lista fija `KNOWN_DESTINATIONS`; NO consulta a otros usuarios. Hacerlo comunitario de verdad quedó aplazado a propósito (16 jul 2026); cuando se haga, puede reutilizar la vista `public_community_routes`.
- **Logros — siembra silenciosa**: al añadir CUALQUIER logro nuevo a `BADGES_DEF`, subir `BADGE_SEED_VERSION` en `badges.js` antes de desplegar. Si no se sube, la siembra silenciosa no se ejecuta y los logros que la comunidad ya cumple retroactivamente lanzan avisos por sorpresa en la primera carga. Es un mecanismo invisible que se rompe por omisión.
- **Conteo de países**: regla única en `countriesFrom(list)` (entries.js), compartida por cabecera, logros y exportación. Incluye los lugares imaginarios anclados a país real (`FICTIONAL_REAL_COUNTRY` en geocoding.js, con su regla de curación en comentario: anclar solo si el país existe con ese nombre y en ese mundo). Cualquier cómputo nuevo de países debe llamar a ese helper, no montar su propio Set.
- **Onboarding spotlight**: 5 pasos desktop / 3 móvil, motor compartido con `spanAll`.
- **Solicitud de beta**: vive en el repo `landing` (no en este) → worker `leer-es-viajar-beta-requests` → tabla `beta_requests` → Resend (`expediciones@`).
