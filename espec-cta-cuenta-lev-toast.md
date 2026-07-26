# Espec — Migrar el CTA de cuenta a la familia `.lev-toast`

**Estado:** listo para implementar
**Rama:** `redesign-concepto-b`
**Fecha:** julio 2026
**Commit sugerido:** `restyle account cta toast to concepto b`

---

## 1. Contexto

Cuando una persona sin sesión añade su primer libro, aparece un popup invitándola a crear cuenta. Ese popup es **`#auth-cta-toast`** y usa la clase **`.pioneer-toast`**: degradado verde oscuro (`linear-gradient(135deg, #1a3a2a, #0f6e56)`), texto blanco, sombra al 0.3 y radio 12px.

Es el **único elemento que queda usando esa clase**. Toda la familia de toasts —pionera, viaje añadido, logro desbloqueado— ya migró a `.lev-toast`, que sí sigue Concepto B: fondo claro, `Instrument Serif` + `Inter`, sombra suave, kicker en versalitas. Este se quedó atrás.

No hay que diseñar nada nuevo: hay que **migrar y borrar el legacy**.

### Incoherencias adicionales que se corrigen de paso

1. El icono es **✦**, símbolo reservado en exclusiva a destinos ficticios. Aquí no pinta nada → se elimina.
2. Los botones llevan estilos inline → pasan a clases.

---

## 2. Alcance

**Se toca:** `app.html`, `app.css`, `auth.js`.
**No se toca:** `entries.js` (el retraso se resuelve dentro de `showAuthCtaToast()`), ni ningún otro toast, ni la lógica de `lev_auth_cta_dismissed`, ni el modal de auth.

---

## 3. Cambios

### 3.1 `app.html` — sustituir líneas 369-380

Bloque actual (desde el comentario `<!-- AUTH CTA TOAST ... -->` hasta su `</div>` de cierre) reemplazado por:

```html
<!-- AUTH CTA TOAST (aparece al añadir el primer libro, si no hay sesión) -->
<div class="lev-toast" id="auth-cta-toast">
  <div class="lt-kicker">TU MAPA LECTOR</div>
  <div class="lt-name">Guarda tus rutas</div>
  <div class="lt-desc">Crea un perfil para no perder tu mapa si cambias de dispositivo.</div>
  <div class="lt-actions">
    <button class="lt-btn" onclick="openAuthFromCta()">Crear cuenta</button>
    <button class="lt-dismiss" onclick="dismissAuthCtaToast()">Ahora no</button>
  </div>
</div>
```

Notas:
- El `style="cursor:default"` inline desaparece: se define en CSS.
- Se elimina el `<div class="p-icon">✦</div>` y el `<div>` envolvente sobrante.

---

### 3.2 `app.css` — borrar el bloque legacy (líneas 654-661)

Borrar íntegro, incluido el comentario de cabecera:

```
/* CELEBRACIÓN primer viajero */
.pioneer-toast { ... }
.pioneer-toast.show { ... }
.pioneer-toast.toast-real { ... }
.pioneer-toast.toast-fictional { ... }
.pioneer-toast .p-icon { ... }
.pioneer-toast .p-title { ... }
.pioneer-toast .p-text { ... }
```

Verificado: ningún otro elemento de `app.html` ni de los módulos JS usa `.pioneer-toast`, `.p-icon`, `.p-title` ni `.p-text`. El toast de pionera real es `#pioneer-toast` (id, no clase) y vive sobre `.lev-toast`.

**Salvedad:** `leer_es_viajar_v5.html` sí usa las cuatro clases (markup en 601-605), pero las **define en su propio CSS inline** (202-206) y no carga `app.css`. Es el monolito LEGACY, no se toca y no se rompe con este borrado.

---

### 3.3 `app.css` — borrar la regla móvil (línea 1165)

Dentro de la media query móvil:

```css
.pioneer-toast { left: 0.75rem; right: 0.75rem; max-width: none; }
```

Se borra. La línea siguiente (`.lev-toast { left: 50%; }`) **se mantiene**: es la que ya centra la familia nueva en móvil.

---

### 3.4 `app.css` — añadir la variante nueva (tras la línea 681)

Insertar después de `#entry-added-toast.toast-fictional .lt-name`, antes del bloque `/* BADGE DESBLOQUEADO */`:

```css
/* CTA CUENTA (primer libro sin sesión) */
#auth-cta-toast { background: #ffffff; cursor: default; }
#auth-cta-toast.show { pointer-events: auto; }
#auth-cta-toast .lt-kicker { color: #1d9e75; }
#auth-cta-toast .lt-actions { display: flex; align-items: center; gap: 14px;
  border-top: 0.5px solid var(--line); padding-top: 12px; margin-top: 14px; }
#auth-cta-toast .lt-btn { background: var(--teal); color: #fff; border: none;
  border-radius: 6px; padding: 8px 14px; font-family: inherit; font-size: 12.5px;
  font-weight: 600; cursor: pointer; }
#auth-cta-toast .lt-dismiss { background: none; border: none; color: var(--muted);
  font-family: inherit; font-size: 12.5px; cursor: pointer; padding: 0; }
```

> ⚠️ **`pointer-events: auto` es imprescindible.** `.lev-toast` los desactiva por defecto y la regla `.show` solo los restaura para `#pioneer-toast` y `#entry-added-toast`. Sin esa línea los dos botones quedan muertos.

El separador (`border-top` de `.lt-actions`) replica el patrón de `.bu-footer` del toast de logro, para que la familia se lea coherente.

---

### 3.5 `auth.js` — retrasar el disparo (línea 546)

**Problema:** el toast legacy vivía anclado arriba a la derecha; `.lev-toast` vive centrado sobre el mapa. En `entries.js:303-305` el CTA se dispara en el mismo instante que `showEntryAddedToast()` / `showPioneerToast()`, así que tras la migración se solaparían en la misma posición exacta.

**Duraciones reales de la familia** (medidas en `badges.js`, no son iguales entre sí):

| Toast | Duración | Dónde |
|---|---|---|
| `entry-added-toast` | 4000 ms | `badges.js:536` |
| `badge-unlock-toast` | 7000 ms | `badges.js:517` |
| `pioneer-toast` | **8000 ms** | `badges.js:473` |

Un retraso fijo de 4600 ms **no basta**: en el primer libro se disparan justo los largos. Si el destino es pionera salen el toast de 8 s y, con él, el logro `explorer_1` (1 pionera, se cumple con esa misma entrada, 7 s); añádase `km_1k` si el viaje pasa de 1.000 km, que es lo habitual. El CTA aterrizaría encima.

**Solución:** disparo condicional dentro de la propia función, para no tocar `entries.js` ni `badges.js`. A los 4600 ms comprueba si queda algún toast de la familia visible y reintenta cada 600 ms hasta que el hueco esté libre.

```js
function showAuthCtaToast() {
  if (currentUser) return; // ya tiene cuenta
  if (localStorage.getItem('lev_auth_cta_dismissed')) return; // ya lo cerró antes
  // El CTA comparte posición con la familia .lev-toast: espera a que no quede
  // ninguno visible (viaje 4s, pionera 8s, logro 7s) antes de entrar.
  const tryShow = () => {
    if (currentUser) return; // se registró mientras tanto
    if (localStorage.getItem('lev_auth_cta_dismissed')) return;
    const busy = ['pioneer-toast', 'entry-added-toast', 'badge-unlock-toast']
      .some(id => document.getElementById(id).classList.contains('show'));
    if (busy) { setTimeout(tryShow, 600); return; }
    document.getElementById('auth-cta-toast').classList.add('show');
  };
  setTimeout(tryShow, 4600);
}
```

`dismissAuthCtaToast()` y `openAuthFromCta()` **no cambian**.

Efecto secundario deseable: primero se celebra el viaje, después se invita a guardarlo. Deja de competir con el momento de recompensa.

---

## 4. Decisiones tomadas

| Decisión | Elegido | Alternativa descartada |
|---|---|---|
| Colisión con el toast de viaje | Disparo condicional: 4,6 s y, si queda algún toast visible, reintento cada 600 ms | (a) Retraso fijo de 4,6 s — insuficiente, ver §3.5. (b) Apilado reusando `restackBadgeToast()` — más código y toca `badges.js`, fuera de alcance |
| Persistencia | El CTA no se auto-oculta; se queda hasta "Ahora no" | Auto-ocultar a los N segundos. Se mantiene persistente porque es un CTA, no una notificación: aparece una sola vez, es descartable y recordado en `localStorage` |
| Color | Blanco con kicker teal | Fondo mint `#e1f5ee` (el de pionera real) — se reserva ese fondo para celebración, no para petición |

---

## 5. QA antes de dar por cerrado

Con sesión cerrada y `localStorage` limpio (borrar `lev_auth_cta_dismissed`):

- [ ] Añadir el primer libro → sale el toast de viaje; ~4,6 s después entra el CTA, sin solaparse.
- [ ] **Los dos botones responden al clic** (comprobación de `pointer-events`).
- [ ] "Crear cuenta" cierra el toast y abre el modal en modo signup.
- [ ] "Ahora no" lo cierra y no vuelve a salir tras recargar.
- [ ] Móvil: el toast queda centrado y dentro del viewport, sin desbordar.
- [ ] Con sesión iniciada, añadir un libro → **no** aparece.
- [ ] El toast de pionera y el de viaje añadido siguen intactos (no se ha roto nada al borrar el bloque legacy).
- [ ] Ya no queda ningún degradado verde oscuro en la app.

---

## 6. Verificación en producción

Recordatorio: que el código esté en la rama no significa que esté vivo en `beta.leeresviajar.app`. Confirmar el despliegue de GitHub Pages antes de marcarlo como hecho.
