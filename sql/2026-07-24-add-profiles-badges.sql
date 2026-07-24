-- Persistir los logros desbloqueados en la nube (espec-sync-badges-supabase.md).
-- La nube pasa a ser la fuente de verdad de la pegajosidad: un logro
-- desbloqueado no se revoca aunque las stats bajen del umbral.
-- RLS: sin cambios; las políticas existentes de profiles ya cubren el upsert.
alter table profiles add column if not exists badges text[] not null default '{}';
