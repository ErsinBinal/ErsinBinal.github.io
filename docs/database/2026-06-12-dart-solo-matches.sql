-- Dart maçlarında tekli oyuncu (CPU / misafir) desteği.
-- Supabase SQL Editor'de bir kez çalıştırın.

-- 1. Her iki slotu bloke eden sınırlamaları kaldır
ALTER TABLE public.dart_matches
  DROP CONSTRAINT IF EXISTS dart_matches_distinct_players,
  DROP CONSTRAINT IF EXISTS dart_matches_winner_participant,
  DROP CONSTRAINT IF EXISTS dart_matches_at_least_one_user,
  DROP CONSTRAINT IF EXISTS dart_matches_blue_user_id_fkey,
  DROP CONSTRAINT IF EXISTS dart_matches_red_user_id_fkey;

-- 2. Her iki kullanıcı sütununu nullable yap (CPU / misafir için null)
ALTER TABLE public.dart_matches
  ALTER COLUMN red_user_id  DROP NOT NULL,
  ALTER COLUMN blue_user_id DROP NOT NULL;

-- 3. Nullable FK'ları yeniden ekle
ALTER TABLE public.dart_matches
  ADD CONSTRAINT dart_matches_red_user_id_fkey
    FOREIGN KEY (red_user_id)  REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT dart_matches_blue_user_id_fkey
    FOREIGN KEY (blue_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. En az bir gerçek kullanıcı zorunlu
ALTER TABLE public.dart_matches
  ADD CONSTRAINT dart_matches_at_least_one_user CHECK (
    red_user_id IS NOT NULL OR blue_user_id IS NOT NULL
  );

-- 5. Her ikisi doluysa farklı olmalı
ALTER TABLE public.dart_matches
  ADD CONSTRAINT dart_matches_distinct_players CHECK (
    red_user_id IS NULL OR blue_user_id IS NULL OR red_user_id <> blue_user_id
  );

-- 6. Kazanan katılımcılardan biri olmalı (null = CPU / misafir kazandı)
ALTER TABLE public.dart_matches
  ADD CONSTRAINT dart_matches_winner_participant CHECK (
    winner_user_id IS NULL
    OR (red_user_id  IS NOT NULL AND winner_user_id = red_user_id)
    OR (blue_user_id IS NOT NULL AND winner_user_id = blue_user_id)
  );

-- 7. Rakip bilgisi (CPU adı veya "Misafir")
ALTER TABLE public.dart_matches
  ADD COLUMN IF NOT EXISTS opponent_label text,
  ADD COLUMN IF NOT EXISTS opponent_type  text DEFAULT 'human'
    CHECK (opponent_type IN ('human', 'cpu', 'guest'));
