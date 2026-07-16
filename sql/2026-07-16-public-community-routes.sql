-- Rutas de comunidad agregadas y anónimas — espec §3, Opción A.
-- Se aplica a mano en el SQL editor del dashboard de Supabase (este repo
-- no despliega nada en Supabase; el archivo documenta el cambio).
--
-- La tabla entries NO cambia: conserva su RLS actual (cada usuario solo
-- lee sus filas). Esta vista es la única puerta de lectura cruzada y no
-- puede filtrar campos sensibles porque no los contiene: sin user_id,
-- sin note, sin author.
--
-- El dueño de la vista (postgres) no está sujeto al RLS de entries; el
-- linter de Supabase avisará de "security definer view": es exactamente
-- el comportamiento buscado y está documentado aquí.

create or replace view public.public_community_routes as
select
  from_name, from_lat, from_lng,
  dest, dest_lat, dest_lng,
  book, fictional, country,
  date  -- necesaria para el filtro windowDays y el orden por recencia (§4.1)
from public.entries;

-- Acceso: lectura para autenticados y anónimos (decisión de Paula,
-- 16 jul 2026: la capa de comunidad se ve sin login, igual que el mapa).
revoke all on public.public_community_routes from anon, authenticated;
grant select on public.public_community_routes to anon, authenticated;

-- ---------------------------------------------------------------------
-- Verificación (§3.3, antes de tocar frontend), con dos cuentas de prueba:
--
-- 1. En el SQL editor:
--      select * from public_community_routes limit 5;
--    → solo las 10 columnas de arriba; nunca user_id ni note.
--
-- 2. Con sesión de la cuenta B, desde la consola del navegador:
--      supabaseClient.from('public_community_routes').select('*')
--    → devuelve también filas creadas por la cuenta A.
--
-- 3. Sin sesión (logout): la misma consulta funciona (grant a anon).
--
-- 4. supabaseClient.from('entries').select('*')
--    → sigue devolviendo SOLO las filas propias (RLS de la tabla intacto).
--
-- Rollback:
--   drop view public.public_community_routes;
