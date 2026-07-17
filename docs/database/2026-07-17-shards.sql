-- Signal Shards ekonomisi: world_state tablosuna shards bakiyesi eklenir.
-- Kazanim/harcama frontend'de yonetilir; bakiye cihazlar arasi world_state
-- senkronuyla tasinir (kolon yokken frontend eski secime zarifce duser).
-- Calistirma: Supabase SQL Editor'de bu dosyayi calistir.

alter table public.world_state
  add column if not exists shards integer not null default 0;
