-- Sisedeki mesaj (bottle): asenkron rastlantisal mesajlasma.
-- Giris yapmis kullanici sise atar (gunde en fazla 3), baska bir kullanici
-- rastgele bir "afloat" siseyi yakalar. Herkes yalnizca kendi gonderdigi ve
-- yakaladigi siseleri okur. Yazma islemleri RPC uzerinden yapilir (guvenli
-- update + gunluk limit); tabloya dogrudan insert/update yoktur.
-- Calistirma: Supabase SQL Editor'de bu dosyayi calistir.

create table if not exists public.bottle_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  status text not null default 'afloat' check (status in ('afloat', 'caught')),
  catcher_id uuid references auth.users(id) on delete set null,
  caught_at timestamptz,
  reply_to uuid references public.bottle_messages(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists bottle_messages_afloat_idx
  on public.bottle_messages (status, created_at);
create index if not exists bottle_messages_sender_idx
  on public.bottle_messages (sender_id, created_at desc);

alter table public.bottle_messages enable row level security;

-- Okuma: yalnizca kendi gonderdigin ya da yakaladigin siseler.
drop policy if exists "bottle_select_own" on public.bottle_messages;
create policy "bottle_select_own"
on public.bottle_messages
for select
using (auth.uid() = sender_id or auth.uid() = catcher_id);

-- Insert/update politikasi YOK: yazma yalnizca asagidaki RPC'lerle olur.

-- Sise at: gunluk limit (24 saatte 3) RPC icinde uygulanir.
create or replace function public.throw_bottle(p_body text, p_reply_to uuid default null)
returns public.bottle_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_count integer;
  v_row public.bottle_messages;
begin
  if v_uid is null then
    raise exception 'login_required';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 280 then
    raise exception 'body_invalid';
  end if;
  select count(*) into v_count
    from public.bottle_messages
    where sender_id = v_uid
      and created_at > now() - interval '24 hours';
  if v_count >= 3 then
    raise exception 'daily_limit';
  end if;
  if p_reply_to is not null and not exists (
    select 1 from public.bottle_messages
    where id = p_reply_to and catcher_id = v_uid
  ) then
    raise exception 'reply_not_allowed';
  end if;
  insert into public.bottle_messages (sender_id, body, reply_to)
    values (v_uid, v_body, p_reply_to)
    returning * into v_row;
  return v_row;
end;
$$;

-- Sise yakala: kendi atmadigin rastgele bir afloat sise (guvenli update).
create or replace function public.catch_bottle()
returns public.bottle_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.bottle_messages;
begin
  if v_uid is null then
    raise exception 'login_required';
  end if;
  update public.bottle_messages
    set status = 'caught', catcher_id = v_uid, caught_at = now()
    where id = (
      select id from public.bottle_messages
      where status = 'afloat' and sender_id <> v_uid
      order by random()
      limit 1
      for update skip locked
    )
    returning * into v_row;
  return v_row; -- sise yoksa null doner; frontend zarifce anlatir.
end;
$$;

revoke execute on function public.throw_bottle(text, uuid) from public, anon;
revoke execute on function public.catch_bottle() from public, anon;
grant execute on function public.throw_bottle(text, uuid) to authenticated;
grant execute on function public.catch_bottle() to authenticated;
