# Especificación — Sección de logros

**Rama:** `feature/logros` (salir de `redesign-concepto-b`, merge cuando esté completo)
**Alcance:** todo local. Ningún cambio en Supabase, ninguna consulta nueva, ninguna vista nueva.
**Fecha:** julio 2026

---

## Nota previa para Claude Code

Los nombres de campos, funciones e ids que aparecen aquí son **descriptivos, no literales**. Antes de tocar nada:

1. Leer en disco `badges.js`, `entries.js` y `fictional.js`.
2. Inventariar los logros que ya existen hoy: id, texto, criterio y si son secretos.
3. Presentar ese inventario junto al plan, **antes de ejecutar**. Varios logros de esta espec puede que ya existan y solo haya que modificarlos, no crearlos.

Reutilizar siempre la función de normalización compartida para cualquier clave de destino. No crear una nueva.

---

## Discrepancias con el código real (verificadas en disco, 25 jul 2026)

Tres cosas que esta espec suponía y el código contradice. Manda el código.

1. **`FICTIONAL` no vive en `fictional.js`**, sino en `geocoding.js`, y sus valores son arrays `[lat, lng]`, no objetos. `fictional.js` contiene `COMMUNITY_POSITIONS`, los overrides personales y los modales.
2. **La función de normalización se llama `normalizeName()`** (`map.js`): minúsculas + sin tildes, sin `trim` — los llamantes hacen el `trim` cuando lo necesitan. Es la que se reutiliza. En `map.js` aparece aliasada localmente como `normalize`.
3. **El `paisReal` no se añade dentro de `FICTIONAL`.** Cambiar la forma de ese objeto obligaría a tocar todos sus consumidores (`v[0]`/`v[1]` en el modal de ficticios, el matcher, el mapa). En su lugar se crea un **mapa hermano `FICTIONAL_REAL_COUNTRY`** en `geocoding.js`, con las mismas claves y nulo por defecto. Sus valores son **códigos ISO-2** (`GB`, `CO`, `MX`), no nombres de país: el conjunto de países se construye con `countryCode`, y con el nombre no deduplicaría contra los destinos reales.

---

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Textos de países | Número desnudo sobre 195, sin porcentaje, **en la descripción** |
| Identidad de libro | `book_ref` con fallback a título normalizado |
| Ficticios y países | Mapa hermano `FICTIONAL_REAL_COUNTRY` con ISO-2, nulo por defecto |
| Estado revelado | Texto real + barra de progreso |
| Retroactividad | Siembra silenciosa en la primera carga tras el despliegue |

---

## Modelo de visibilidad

**Criterio revisado (25 jul 2026, tras el merge):** todos los logros ocupan fila siempre. La primera versión de esta espec pedía no renderizar los eslabones sin revelar; se descartó. Dos estados de render para los no cumplidos:

1. **Enmascarado** — fila "Logro oculto / Sigue viajando para descubrirlo". Tapa por igual a los `secreto: true` y a los `revelaSi` cuyo predecesor no ha caído. La diferencia entre ambos sigue en la lógica —un `revelaSi` se destapa cuando cae su predecesor, un secreto solo al cumplirse— pero visualmente son idénticos mientras están tapados.
2. **Visible y bloqueado** — texto real y barra de progreso.
3. **Desbloqueado** — fila normal en "Conseguidos".

Dos campos nuevos en la definición de cada logro:

- `secreto: boolean` — por defecto `false`. Es el `hidden` que ya existía, renombrado.
- `revelaSi: string | null` — id del logro predecesor de la misma cadena

Resolución:

```
si cumplido                        → desbloqueado
si no, y revelaSi != null          → bloqueado si el predecesor está cumplido, si no ENMASCARADO
si no, y secreto === true          → enmascarado
si no                              → bloqueado
```

**Orden de render:** las filas enmascaradas van todas juntas al final de "Por conseguir", nunca intercaladas en su posición de cadena — la adyacencia delataría la estructura de escaleras.

**Contador.** No existe ningún "X de Y": los títulos de sección son "Conseguidos · N" y "Por conseguir · N". **"Por conseguir · N" cuenta todos los no cumplidos, revelados o no.** En una cuenta vacía: 19.

---

## Commits

### Commit 1 — `refactor: badges expose numeric progress`

Es el commit más estructural y va primero. Hoy es probable que cada logro se evalúe como booleano; pasa a exponer progreso.

Cada logro devuelve `{ actual, meta }`. Cumplido equivale a `actual >= meta`.

- Los logros sin progreso natural (hitos únicos) exponen `meta: 1` y `actual: 0 | 1`.
- Los logros de máximo por grupo (ver commit 4) exponen como `actual` el valor del **mejor grupo**, no la suma.
- **`near_home` pasa a forma de hito.** Su criterio es inverso (mejor = más cerca) y no se puede expresar como `actual >= meta` con progreso real. Es secreto, así que su barra no se dibuja nunca: no hay pérdida visual.
- Los rótulos de meta que hoy son cadenas literales (`1.000`, `10.000`, `40.075`, `15.000`) siguen siendo literales, para que la fracción se imprima idéntica en cualquier idioma del navegador. El resto se formatea con `toLocaleString()`.
- Este commit lleva también esta espec actualizada, para que no se quede suelta ensuciando el árbol durante siete commits.

**Verificación:** tras este commit, todos los logros existentes se desbloquean exactamente igual que antes y no hay ningún cambio visual. Si algo cambia de estado, hay un error de traducción del criterio.

---

### Commit 2 — `feat: three-state badge visibility and progressive reveal`

Añadir los campos `secreto` y `revelaSi`, la función de resolución, y el renderizado del estado bloqueado con barra de progreso.

Cadenas de revelado:

| Cadena | Secuencia | ids |
|---|---|---|
| Lecturas | 5 → 10 → 20 → 50 | `books_5` → `books_10` → `books_20` → `books_50` |
| Kilómetros | 1.000 → 10.000 → 40.075 | `km_1k` → `km_10k` → `km_40k` |
| Países | 5 → 15 | `countries_5` → `countries_15` |
| Ficticios | 1 → 5 → 10 | `fictional` → `fictional_5` → `fictional_10` |
| Pioneros | 1 → 3 → 10 | `explorer_1` → `explorer_3` → `explorer_10` |

El **primer eslabón de cada cadena es público**: visible desde el primer día. Solo los siguientes llevan `revelaSi`.

La cadena de **pioneros** no estaba en la espec original y se añade: que una escalera esté oculta y otra visible sería incoherente.

**`km_40k` sí es el tercer eslabón** de la cadena de kilómetros (decisión revisada, 25 jul 2026). Dejarlo público abría un hueco: se veían los peldaños 1 y 3 con el 2 escondido, peor que cualquiera de las dos opciones limpias. Y el "0/40.075" del día uno es el mismo error que ya se rechazó con el 2,5% de los países — un número honesto que desinfla. La tesis del producto la carga `km_1k`, que es visible desde el primer día y además alcanzable.

Comprobar cuáles de estos logros ya existen. Los que existan solo reciben `revelaSi`; los que no, se crean con el criterio correspondiente.

---

### Commit 3 — `feat: add 5 fictional places badge`

Logro nuevo intermedio: **"He visitado 5 lugares imaginarios"**.

- Se inserta en la cadena de ficticios entre el de 1 y el de 10.
- El logro de 10 pasa a tener `revelaSi` apuntando a este, no al de 1.

---

### Commit 4 — `feat: secret badges for book spread and destination convergence`

Dos logros nuevos, ambos `secreto: true` y sin `revelaSi`.

**A. Un mismo libro, 5 destinos o más**

- Agrupar las entradas por identidad de libro.
- Identidad de libro: si ambas entradas tienen `book_ref`, comparar por `book_ref`. Si a alguna le falta, caer a título normalizado.
- Contar **destinos distintos** por grupo (clave normalizada), no número de entradas. Dos entradas del mismo libro al mismo destino cuentan como uno.
- Los destinos ficticios cuentan.
- Texto propuesto: *"Un mismo libro me ha llevado a 5 destinos"*

**B. Un mismo destino, 5 lecturas o más**

- Agrupar las entradas por clave de destino normalizada.
- Contar **libros distintos** por grupo, usando la misma regla de identidad de libro.
- Los destinos ficticios cuentan.
- Texto propuesto: *"He llegado al mismo lugar con 5 lecturas distintas"*

En ambos, `actual` es el valor del grupo con más elementos y `meta` es 5.

---

### Commit 5 — `feat: optional real country for fictional places`

Distinción real: hay lugares imaginarios anclados en un país que existe (Hogwarts en Reino Unido, Macondo en Colombia, Comala en México) y lugares que viven en un mundo aparte (Narnia, Nunca Jamás, la Tierra Media). Los primeros deben sumar país; los segundos no pueden.

- Mapa hermano `FICTIONAL_REAL_COUNTRY` en `geocoding.js`, con las mismas claves que `FICTIONAL` y **nulo por defecto**. Valores en ISO-2 (ver §Discrepancias, punto 3).
- **No deducirlo de las coordenadas.** Las posiciones de `COMMUNITY_POSITIONS` son colocaciones inventadas para el mapa, no ubicaciones geográficas reales.
- El cómputo de países pasa a ser: países de destinos reales + `paisReal` de destinos ficticios cuando no es nulo, deduplicado.

**Regla de curación** (decidida por Paula, 25 jul 2026; vale para futuras ampliaciones del catálogo): anclar solo si el país existe **con ese nombre y en ese mundo**. Ni mundos que no son la Tierra (Konoha), ni lugares deliberadamente sin ubicar (Omelas), ni estados sucesores (Panem, Gilead, Oceanía).

Valores decididos: **ES** vetusta, marineda, oleza, orbajosa, región · **CO** macondo · **MX** comala · **GB** thornfield, wuthering heights, manderley, mansfield park, coketown, hogwarts, hogsmeade, azkaban, diagon alley, el callejón diagon, neverwhere · **US** yoknapatawpha. Los otros 110 se quedan en `null`.

**Claude Code no rellena los valores.** Debe listar todos los lugares de `FICTIONAL` con su `paisReal` a `null` y presentar la lista para que Paula decida cuáles anclar. Es curación manual y probablemente la mayoría se queden en `null`.

---

### Commit 6 — `fix: silent badge seeding on first load after deploy`

Sin esto, quien ya tenga 20 lecturas recibe una cascada de notificaciones al entrar.

- En la primera carga tras el despliegue, calcular los logros cumplidos y marcarlos como vistos **sin disparar aviso ni animación**.
- Controlarlo con un flag de versión en el estado persistido de logros, para que se ejecute una sola vez.
- Todo lo que se desbloquee a partir de ese momento sí avisa con normalidad.

Leer primero cómo se persiste hoy el conjunto de logros vistos y adaptarse a esa estructura.

---

### Commit 7 — `copy: honest country badge texts`

Cambio de criterio respecto a la primera versión de esta espec: la frase a desterrar ("Tus lecturas te han llevado por **medio mundo**") vive en la **descripción**, no en el nombre. Y ahí es donde va la proporción: los nombres se quedan cortos y escaneables. **Este commit solo toca descripciones.**

- `countries_5` — nombre sin cambios. Desc: *Cinco de los 195 países del mundo. Tu mapa empieza a tener forma.*
- `countries_15` — nombre sin cambios. Desc: *Quince de los 195 países del mundo. Tu mapa ya se lee de lejos.*

195 = 193 estados miembros de la ONU + 2 observadores. Mantener el mismo denominador si en el futuro se añaden más niveles.

---

## Verificación antes del merge

- [ ] Ningún logro existente cambia de estado tras el commit 1
- [ ] Un logro con `revelaSi` sale enmascarado ("Logro oculto") hasta que cae su predecesor, y con texto real después
- [ ] La barra de progreso muestra el valor real, no un placeholder
- [ ] Los dos logros secretos no se intuyen en la interfaz antes de cumplirse
- [ ] Con una cuenta que ya tenga logros cumplidos, la primera carga tras el despliegue no lanza avisos
- [ ] Un desbloqueo posterior a la siembra sí lanza aviso
- [ ] Comprobado en `beta.leeresviajar.app`, no solo en la rama

---

## Fuera de alcance

- Cualquier logro que dependa de datos de otras personas usuarias. `isPioneer()` sigue siendo local.
- Cambios en RLS, vistas o tablas de Supabase.
- Rediseño visual de la sección de logros más allá del estado bloqueado con progreso.
