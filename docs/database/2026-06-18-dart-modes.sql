-- Dart oyun modlari: 501 (x01) yaninda Around the Clock ve Cricket destegi.
-- Mod-spesifik istatistikler esnek `summary` jsonb icinde saklanir; bu migrasyon
-- yalnizca maci hangi modun urettigini ayirt etmek icin `mode` kolonu ekler.
-- Supabase SQL Editor'de bir kez calistirin.

ALTER TABLE public.dart_matches
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'x01'
    CHECK (mode IN ('x01', 'atc', 'cricket'));

CREATE INDEX IF NOT EXISTS dart_matches_mode_created_idx
  ON public.dart_matches (mode, created_at DESC);

-- Not: Around the Clock / Cricket maclarinda atis-bazli kayit (dart_throws)
-- tutulmaz; ozet `summary` icinde saklanir. X01 atislari eskisi gibi kaydedilir.
