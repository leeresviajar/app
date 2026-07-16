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

create or replace view public.community_routes_latest_per_user as
select distinct on (user_id)
  from_name, from_lat, from_lng,
  dest, dest_lat, dest_lng,
  book, fictional, country,
  date
from public.entries
order by user_id, date desc;

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
-- 2. Sin sesión (logout), desde la consola del navegador:
--      supabaseClient.from('community_routes_latest_per_user').select('*')
--    → funciona (grant a anon).
--
-- 3. supabaseClient.from('entries').select('*')
--    → sigue devolviendo SOLO las filas propias (RLS de la tabla intacto).
--
-- Rollback:
--   drop view public.community_routes_latest_per_user;
