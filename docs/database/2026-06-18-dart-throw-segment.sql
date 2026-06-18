-- Dart atislari icin segment (hangi dilim/halka) bilgisi.
-- Tahta sicaklik haritasi (heatmap) ve ileride kocluk analizi icin gerekli.
-- X01 atislari `dart_throws`'a segment ile kaydedilir; ATC/Cricket segment
-- ozeti maclarin `summary` jsonb'sinde (players[slot].segments) tutulur.
-- Supabase SQL Editor'de bir kez calistirin.

ALTER TABLE public.dart_throws
  ADD COLUMN IF NOT EXISTS segment text;

-- Kanonik segment kodlari: S1..S20, D1..D20, T1..T20, OUTER_BULL (25), BULL (50), MISS.
