-- Función de estadísticas para el dashboard de admin (admin.html).
-- Se aplica a mano en el SQL editor de Supabase (este repo no despliega SQL).
--
-- Seguridad: SECURITY DEFINER (salta el RLS de entries/profiles a propósito),
-- pero la primera línea comprueba que auth.uid() es el UUID de Paula y lanza
-- excepción para cualquier otra persona. Solo devuelve agregados: ningún
-- email, nota ni dato individual sale de aquí salvo username + fecha de
-- último guardado en la lista de últimos activos.
--
-- ANTES DE EJECUTAR: sustituye PON-AQUI-TU-UUID por tu UUID real.
-- Para encontrarlo:   select id, email from auth.users order by created_at;
--
-- Nota sobre km: agrega el km congelado de cada fila (el que guarda
-- saveStateToCloud). Puede diferir levemente del km resuelto que muestra el
-- mapa cuando una cadena ha cambiado; para agregados es suficiente.

create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  v_beta_total bigint := 0;
  v_beta_conv numeric := null;
  v_has_beta_email boolean;
  v_has_username boolean;
  v_last_active jsonb;
begin
  if auth.uid() is distinct from 'PON-AQUI-TU-UUID'::uuid then
    raise exception 'no autorizado';
  end if;

  -- Bloques opcionales según columnas realmente presentes
  select exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='beta_requests' and column_name='email')
    into v_has_beta_email;
  select exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='profiles' and column_name='username')
    into v_has_username;

  begin
    execute 'select count(*) from public.beta_requests' into v_beta_total;
  exception when undefined_table then v_beta_total := 0;
  end;

  if v_has_beta_email and v_beta_total > 0 then
    execute '
      select round(100.0 * count(distinct u.id) / nullif(count(distinct lower(b.email)),0), 1)
      from public.beta_requests b
      left join auth.users u on lower(u.email) = lower(b.email)'
    into v_beta_conv;
  end if;

  if v_has_username then
    execute '
      select coalesce(jsonb_agg(t), ''[]''::jsonb) from (
        select p.username as name, max(e.created_at) as last_save, count(*) as entries
        from public.entries e join public.profiles p on p.id = e.user_id
        group by p.username order by max(e.created_at) desc limit 8) t'
    into v_last_active;
  else
    select coalesce(jsonb_agg(t), '[]'::jsonb) from (
      select left(e.user_id::text, 8) as name, max(e.created_at) as last_save, count(*) as entries
      from public.entries e group by e.user_id
      order by max(e.created_at) desc limit 8) t
    into v_last_active;
  end if;

  select jsonb_build_object(
    'generated_at', now(),

    -- Volumen
    'users_total',        (select count(*) from profiles),
    'entries_total',      (select count(*) from entries),
    'km_total',           (select coalesce(round(sum(km)), 0) from entries),
    'destinations',       (select count(distinct lower(dest)) from entries),
    'countries',          (select count(distinct country_code) from entries
                            where not fictional and country_code is not null),
    'pioneers_total',     (select count(*) from entries where pioneer),
    'beta_requests',      v_beta_total,
    'beta_conversion_pct', v_beta_conv,

    -- Salud / activación
    'users_with_entries', (select count(distinct user_id) from entries),
    'activation_pct',     (select round(100.0 * (select count(distinct user_id) from entries)
                            / nullif((select count(*) from profiles),0), 1)),
    'active_7d',          (select count(distinct user_id) from entries
                            where created_at >= now() - interval '7 days'),
    'active_30d',         (select count(distinct user_id) from entries
                            where created_at >= now() - interval '30 days'),
    'median_entries_per_user', (select percentile_cont(0.5) within group (order by n)
                            from (select count(*) n from entries group by user_id) s),
    'max_entries_per_user',    (select coalesce(max(n),0)
                            from (select count(*) n from entries group by user_id) s),

    -- Comportamiento
    'fictional_pct',      (select round(100.0 * count(*) filter (where fictional)
                            / nullif(count(*),0), 1) from entries),
    'fictional_users',    (select count(distinct user_id) from entries where fictional),
    'notes_pct',          (select round(100.0 * count(*) filter (where note is not null and note <> '')
                            / nullif(count(*),0), 1) from entries),
    'bookref_pct',        (select round(100.0 * count(*) filter (where book_ref is not null)
                            / nullif(count(*),0), 1) from entries),
    'recent30_pct',       (select round(100.0 * count(*) filter (where date >= current_date - 30)
                            / nullif(count(*),0), 1) from entries),
    'rereads_pairs',      (select count(*) from (
                            select user_id, lower(dest) from entries
                            group by user_id, lower(dest) having count(*) > 1) s),

    -- Decisión de encadenado
    'departure_modes',    (select coalesce(jsonb_object_agg(coalesce(departure_mode,'(sin dato)'), n), '{}'::jsonb)
                            from (select departure_mode, count(*) n from entries
                                  group by departure_mode) s),

    -- Funnel de logros (requiere profiles.badges, 2026-07-24)
    'badges_funnel',      (select coalesce(jsonb_object_agg(badge, n), '{}'::jsonb)
                            from (select unnest(badges) badge, count(*) n from profiles
                                  group by 1) s),

    -- Distribución de km por ruta (calibrado de la etiqueta de transporte)
    'km_percentiles',     (select jsonb_build_object(
                            'p25', round(percentile_cont(0.25) within group (order by km)),
                            'p50', round(percentile_cont(0.50) within group (order by km)),
                            'p75', round(percentile_cont(0.75) within group (order by km)),
                            'p90', round(percentile_cont(0.90) within group (order by km)))
                            from entries),
    'km_buckets',         (select jsonb_build_object(
                            'cero', count(*) filter (where km = 0),
                            'b1', count(*) filter (where km > 0 and km < 100),
                            'b2', count(*) filter (where km >= 100 and km < 500),
                            'b3', count(*) filter (where km >= 500 and km < 1500),
                            'b4', count(*) filter (where km >= 1500 and km < 5000),
                            'b5', count(*) filter (where km >= 5000)) from entries),

    -- Rankings
    'top_destinations',   (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                            select min(dest) as dest, bool_or(fictional) as fictional, count(*) as n
                            from entries group by lower(dest)
                            order by count(*) desc, min(dest) limit 10) t),
    'top_books',          (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                            select min(book) as book, count(*) as n
                            from entries group by lower(book)
                            order by count(*) desc, min(book) limit 10) t),

    'last_active',        v_last_active
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- Verificación tras ejecutar:
-- 1. Logueada como tú en el SQL editor no vale (corre como postgres y
--    auth.uid() es null): prueba desde admin.html directamente.
-- 2. Con una cuenta de prueba en admin.html debe aparecer "no autorizado".
