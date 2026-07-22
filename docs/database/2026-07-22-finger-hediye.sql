-- finger @handle (opt-in kamusal gezgin karti) + arkadasa kart hediyesi.
-- Calistirma: Supabase SQL Editor'de bu dosyayi calistir.
-- Calistirilana kadar frontend zarif dusur: finger "kayit kapali/rpc yok",
-- gift "hediye agi kurulmamis" der; hicbir sey kirilmaz.

-- 1) Opt-in bayragi: varsayilan KAPALI. Acmayan kimse finger'da gorunmez.
alter table public.profiles
  add column if not exists public_profile boolean not null default false;

-- Kendi bayragini degistirme (acik/kapali).
create or replace function public.set_public_profile(p_enabled boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login_required'; end if;
  update public.profiles set public_profile = coalesce(p_enabled, false)
    where user_id = auth.uid();
  return coalesce(p_enabled, false);
end;
$$;

-- 2) finger: yalniz opt-in profillerde, yalniz OZET sayilar doner.
--    (envanter icerigi, e-posta, kimlik ACILMAZ.)
create or replace function public.finger_profile(p_handle text)
returns table(
  handle text,
  display_name text,
  member_since date,
  shards integer,
  cards integer,
  unlocked_rooms integer
)
language sql security definer set search_path = public stable as $$
  select
    p.handle,
    coalesce(nullif(p.display_name, ''), p.handle) as display_name,
    p.created_at::date as member_since,
    coalesce(w.shards, 0) as shards,
    coalesce((select count(*)::integer from unnest(coalesce(w.inventory, '{}')) item
              where item like 'card:%'), 0) as cards,
    coalesce(array_length(w.unlocked, 1), 0) as unlocked_rooms
  from public.profiles p
  left join public.world_state w on w.user_id = p.user_id
  where lower(p.handle) = lower(trim(p_handle))
    and p.public_profile = true;
$$;

-- 3) Kart hediyesi: yalniz karsilikli arkadas + engelsiz; kart gonderenden
--    SILINIR, aliciya eklenir; ozel sohbete 'system' mesaji duser.
create or replace function public.gift_card(p_handle text, p_card text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_target uuid;
  v_card text := lower(trim(coalesce(p_card, '')));
  v_sender_inv text[];
  v_target_inv text[];
  v_thread uuid;
  v_handle text;
begin
  if v_uid is null then raise exception 'login_required'; end if;
  if v_card !~ '^card:\d{4}-\d{2}-\d{2}$' then raise exception 'card_invalid'; end if;

  select user_id into v_target from public.profiles
    where lower(handle) = lower(trim(p_handle));
  if v_target is null or v_target = v_uid then raise exception 'target_invalid'; end if;
  if not public.are_friends(v_uid, v_target) or public.has_block_between(v_uid, v_target) then
    raise exception 'not_friends';
  end if;

  select coalesce(inventory, '{}') into v_sender_inv
    from public.world_state where user_id = v_uid for update;
  if v_sender_inv is null or not (v_card = any(v_sender_inv)) then
    raise exception 'card_not_owned';
  end if;

  insert into public.world_state (user_id, unlocked, inventory, discovered, level, shards)
    values (v_target, '{}', '{}', '{}', 0, 0)
    on conflict (user_id) do nothing;
  select coalesce(inventory, '{}') into v_target_inv
    from public.world_state where user_id = v_target for update;
  if v_card = any(v_target_inv) then raise exception 'already_owned'; end if;

  update public.world_state
    set inventory = array_remove(v_sender_inv, v_card), updated_at = now()
    where user_id = v_uid;
  update public.world_state
    set inventory = array_append(v_target_inv, v_card), updated_at = now()
    where user_id = v_target;

  v_thread := public.open_direct_chat(p_handle);
  select p.handle into v_handle from public.profiles p where p.user_id = v_uid;
  insert into public.chat_messages (thread_id, sender_id, body, message_type, metadata)
    values (
      v_thread,
      v_uid,
      coalesce(v_handle, 'bir gezgin') || ' sana bir sinyal karti hediye etti: ' || v_card,
      'system',
      jsonb_build_object('kind', 'gift', 'card', v_card)
    );
  return v_thread;
end;
$$;

revoke execute on function public.set_public_profile(boolean) from public, anon;
revoke execute on function public.finger_profile(text) from public;
revoke execute on function public.gift_card(text, text) from public, anon;
grant execute on function public.set_public_profile(boolean) to authenticated;
grant execute on function public.finger_profile(text) to anon, authenticated;
grant execute on function public.gift_card(text, text) to authenticated;
