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

- Frontend estático: `app.html` (shell) + `css/app.css` + 14 módulos JS.
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
- **Naranja `#e8913c` = SOLO destinos ficticios. Rojo `#e8593c` = SOLO rutas del usuario.** Nunca intercambiarlos.
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
- **Logros / Pionero**: pionero es comunitario — primera persona de TODOS los usuarios en llegar a un destino, consultado en `entries`.
- **Onboarding spotlight**: 5 pasos desktop / 3 móvil, motor compartido con `spanAll`.
- **Solicitud de beta**: vive en el repo `landing` (no en este) → worker `leer-es-viajar-beta-requests` → tabla `beta_requests` → Resend (`expediciones@`).
