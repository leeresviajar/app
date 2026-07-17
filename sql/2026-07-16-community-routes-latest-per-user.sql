-- Ambiente rotatorio: última ruta de cada usuario, anónima — espec
-- rutas-rotacion §2. Se aplica a mano en el SQL editor del dashboard de
-- Supabase (este repo no despliega nada en Supabase; el archivo
-- documenta el cambio).
--
-- No modifica ni sustituye public_community_routes: los puntos y el
-- detalle al pinchar siguen usando esa vista, sin cambios. user_id se
-- usa solo para agrupar dentro de esta consulta; no aparece en las
-- columnas de salida.
--
-- distinct on (user_id) + order by user_id, date desc es el patrón
-- estándar de Postgres para "una fila por grupo, la más reciente".
--
-- El linter de Supabase avisará de "security definer view", igual que
-- con public_community_routes: es el comportamiento buscado.
--
-- FIX (17 jul 2026): "date" es solo la fecha de lectura, sin hora, así
-- que un usuario que añade varias entradas el mismo día (p. ej. al
-- rellenar su historial de golpe) las tiene todas empatadas en la
-- ordenación. Con un empate así, distinct on no garantiza cuál de las
-- filas elige — puede quedarse sistemáticamente con una que no es la
-- última destino real. Tampoco sirve created_at como desempate: como
-- saveStateToCloud() borra y reinserta TODAS las entradas del usuario
-- en cada guardado dentro de la misma transacción, now() es igual en
-- todas las filas. La columna id (serial) sí es fiable: cada fila saca
-- un valor de secuencia distinto y creciente en el mismo orden en que
-- llegaron en el array que mandó el cliente, así que refleja el orden
-- real en que el usuario las fue añadiendo. Caso confirmado: Lluna,
-- 8 entradas en un mismo día, la de Londres no salía en esta vista
-- hasta añadir este desempate.

create or replace view public.community_routes_latest_per_user as
select distinct on (user_id)
  from_name, from_lat, from_lng,
  dest, dest_lat, dest_lng,
  book, fictional, country,
  date
from public.entries
order by user_id, date desc, id desc;

-- Acceso: lectura para autenticados y anónimos, como la vista anterior
-- (la capa de comunidad se ve sin login).
revoke all on public.community_routes_latest_per_user from anon, authenticated;
grant select on public.community_routes_latest_per_user to anon, authenticated;

-- ---------------------------------------------------------------------
-- Verificación (§2.3, antes de tocar frontend):
--
-- 1. En el SQL editor:
--      select * from community_routes_latest_per_user;
--    → nunca más de una fila por usuario real (comprobar con una cuenta
--      de prueba con varias lecturas: solo aparece la más reciente) y
--      sin columna user_id en el resultado.
--
-- 1b. Caso de empate en fecha (regresión del fix del 17 jul): con una
--     cuenta que tenga varias entradas en la MISMA fecha, la fila que
--     sale debe corresponder al id más alto de ese grupo (la añadida
--     más tarde), no una cualquiera de las empatadas.
--
-- 2. Sin sesión (logout), desde la consola del navegador:
--      supabaseClient.from('community_routes_latest_per_user').select('*')
--    → funciona (grant a anon).
--
-- 3. supabaseClient.from('entries').select('*')
--    → sigue devolviendo SOLO las filas propias (RLS de la tabla intacto).
--
-- Rollback:
--   drop view public.community_routes_latest_per_user;
