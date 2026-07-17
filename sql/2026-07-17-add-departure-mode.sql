-- Columna nueva, aditiva, sin backfill: las filas existentes quedan a
-- NULL y se tratan como origen fijo (equivalente a 'home'/'other') sin
-- ninguna migración ni inferencia — decisión explícita de Paula, dado
-- que es un grupo cerrado de beta testers a quienes se les pide no
-- tocar sus entradas antiguas.
alter table public.entries
  add column if not exists departure_mode text;

-- Rollback: alter table public.entries drop column departure_mode;
