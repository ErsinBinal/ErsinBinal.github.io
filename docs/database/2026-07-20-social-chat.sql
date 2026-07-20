-- Convivium social chat: stable handles, friendships, blocks, DMs and groups.
-- Run once in the Supabase SQL editor. All private writes go through RPCs;
-- RLS remains the final authorization boundary.

create extension if not exists pgcrypto;

alter table public.profiles add column if not exists handle text;
alter table public.profiles add column if not exists handle_changed_at timestamptz;

update public.profiles
set handle = 'gezgin-' || substr(replace(user_id::text, '-', ''), 1, 8)
where handle is null;

alter table public.profiles alter column handle set not null;
create unique index if not exists profiles_handle_lower_uidx on public.profiles (lower(handle));
alter table public.profiles drop constraint if exists profiles_handle_format_check;
alter table public.profiles add constraint profiles_handle_format_check
  check (handle ~ '^[a-z0-9][a-z0-9_-]{2,23}$');

-- profiles.handle artik NOT NULL oldugu icin yeni auth kullanicisi trigger'i da
-- ayni islemde cakismasiz bir baslangic handle'i uretmelidir.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (
    user_id, handle, display_name, first_name, last_name,
    terms_accepted_at, terms_version, ai_consent, ai_consent_at
  ) values (
    new.id,
    'gezgin-' || substr(replace(new.id::text, '-', ''), 1, 8),
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''),
      concat_ws(' ', nullif(new.raw_user_meta_data->>'first_name', ''), nullif(new.raw_user_meta_data->>'last_name', '')),
      split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'first_name', ''),
    nullif(new.raw_user_meta_data->>'last_name', ''),
    case when (new.raw_user_meta_data->>'terms_accepted')='true' then now() else null end,
    nullif(new.raw_user_meta_data->>'terms_version', ''),
    coalesce((new.raw_user_meta_data->>'ai_consent')='true', false),
    case when (new.raw_user_meta_data->>'ai_consent')='true' then now() else null end
  ) on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);
create unique index if not exists friendships_pair_uidx on public.friendships
  (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create index if not exists friendships_recipient_status_idx on public.friendships (recipient_id, status, created_at desc);

create table if not exists public.member_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct', 'group')),
  title text check (title is null or char_length(title) between 1 and 60),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_members (
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);
create index if not exists chat_members_user_idx on public.chat_members (user_id, joined_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  message_type text not null default 'text' check (message_type in ('text', 'game_invite', 'system')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
create index if not exists chat_messages_thread_created_idx on public.chat_messages (thread_id, created_at desc);

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.recipient_id = b) or (f.requester_id = b and f.recipient_id = a))
  );
$$;

create or replace function public.has_block_between(a uuid, b uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.member_blocks x
    where (x.blocker_id = a and x.blocked_id = b) or (x.blocker_id = b and x.blocked_id = a)
  );
$$;

create or replace function public.is_chat_member(p_thread uuid, p_user uuid default auth.uid())
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.chat_members m where m.thread_id = p_thread and m.user_id = p_user);
$$;

revoke execute on function public.are_friends(uuid, uuid) from public, anon;
revoke execute on function public.has_block_between(uuid, uuid) from public, anon;
revoke execute on function public.is_chat_member(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.has_block_between(uuid, uuid) to authenticated;
grant execute on function public.is_chat_member(uuid, uuid) to authenticated;

alter table public.friendships enable row level security;
alter table public.member_blocks enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_members enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists social_friendships_read on public.friendships;
create policy social_friendships_read on public.friendships for select to authenticated
  using (auth.uid() in (requester_id, recipient_id));
drop policy if exists social_blocks_read_own on public.member_blocks;
create policy social_blocks_read_own on public.member_blocks for select to authenticated
  using (blocker_id = auth.uid());
drop policy if exists social_threads_read_member on public.chat_threads;
create policy social_threads_read_member on public.chat_threads for select to authenticated
  using (public.is_chat_member(id));
drop policy if exists social_members_read_thread on public.chat_members;
create policy social_members_read_thread on public.chat_members for select to authenticated
  using (public.is_chat_member(thread_id));
drop policy if exists social_messages_read_thread on public.chat_messages;
create policy social_messages_read_thread on public.chat_messages for select to authenticated
  using (public.is_chat_member(thread_id) and not public.has_block_between(auth.uid(), sender_id));

create or replace function public.claim_handle(p_handle text)
returns text language plpgsql security definer set search_path = public as $$
declare v_handle text := lower(trim(coalesce(p_handle, ''))); v_last timestamptz;
begin
  if auth.uid() is null then raise exception 'Giris gerekli.'; end if;
  if v_handle !~ '^[a-z0-9][a-z0-9_-]{2,23}$' then
    raise exception 'Kullanici adi 3-24 karakter olmali; harf, rakam, _ ve - kullanilabilir.';
  end if;
  if v_handle in ('admin','moderator','system','support','convivium','oracle','bugy','everyone','here') then
    raise exception 'Bu kullanici adi ayrilmis.';
  end if;
  select handle_changed_at into v_last from public.profiles where user_id = auth.uid();
  if v_last is not null and v_last > now() - interval '30 days' then
    raise exception 'Kullanici adi 30 gunde bir degistirilebilir.';
  end if;
  update public.profiles set handle = v_handle, handle_changed_at = now(), updated_at = now()
  where user_id = auth.uid();
  if not found then raise exception 'Profil bulunamadi.'; end if;
  return v_handle;
exception when unique_violation then raise exception 'Bu kullanici adi alinmis.';
end;
$$;

create or replace function public.search_members(p_query text, p_limit integer default 12)
returns table(user_id uuid, handle text, display_name text, is_friend boolean, request_status text)
language sql security definer stable set search_path = public as $$
  select p.user_id, p.handle, coalesce(nullif(p.display_name,''), p.handle),
    public.are_friends(auth.uid(), p.user_id),
    (select f.status from public.friendships f
      where (f.requester_id = auth.uid() and f.recipient_id = p.user_id)
         or (f.recipient_id = auth.uid() and f.requester_id = p.user_id) limit 1)
  from public.profiles p
  where auth.uid() is not null and p.user_id <> auth.uid()
    and char_length(trim(coalesce(p_query,''))) >= 2
    and not public.has_block_between(auth.uid(), p.user_id)
    and (p.handle ilike '%' || left(trim(coalesce(p_query,'')), 40) || '%'
      or coalesce(p.display_name,'') ilike '%' || left(trim(coalesce(p_query,'')), 40) || '%')
  order by (p.handle = lower(trim(coalesce(p_query,'')))) desc, p.handle
  limit greatest(1, least(coalesce(p_limit,12), 30));
$$;

create or replace function public.get_social_snapshot()
returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object(
    'profile', (select jsonb_build_object('user_id',p.user_id,'handle',p.handle,'display_name',coalesce(nullif(p.display_name,''),p.handle)) from public.profiles p where p.user_id=auth.uid()),
    'friends', coalesce((select jsonb_agg(jsonb_build_object('friendship_id',f.id,'user_id',p.user_id,'handle',p.handle,'display_name',coalesce(nullif(p.display_name,''),p.handle)) order by p.handle)
      from public.friendships f join public.profiles p on p.user_id = case when f.requester_id=auth.uid() then f.recipient_id else f.requester_id end
      where f.status='accepted' and auth.uid() in (f.requester_id,f.recipient_id)), '[]'::jsonb),
    'incoming', coalesce((select jsonb_agg(jsonb_build_object('friendship_id',f.id,'user_id',p.user_id,'handle',p.handle,'display_name',coalesce(nullif(p.display_name,''),p.handle)) order by f.created_at desc)
      from public.friendships f join public.profiles p on p.user_id=f.requester_id where f.recipient_id=auth.uid() and f.status='pending'), '[]'::jsonb),
    'outgoing', coalesce((select jsonb_agg(jsonb_build_object('friendship_id',f.id,'user_id',p.user_id,'handle',p.handle,'display_name',coalesce(nullif(p.display_name,''),p.handle)) order by f.created_at desc)
      from public.friendships f join public.profiles p on p.user_id=f.recipient_id where f.requester_id=auth.uid() and f.status='pending'), '[]'::jsonb),
    'blocked', coalesce((select jsonb_agg(jsonb_build_object('user_id',p.user_id,'handle',p.handle,'display_name',coalesce(nullif(p.display_name,''),p.handle)) order by p.handle)
      from public.member_blocks b join public.profiles p on p.user_id=b.blocked_id where b.blocker_id=auth.uid()), '[]'::jsonb)
  );
$$;

create or replace function public.send_friend_request(p_handle text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_target uuid; v_id uuid; v_status text;
begin
  select user_id into v_target from public.profiles where lower(handle)=lower(trim(p_handle));
  if v_target is null then raise exception 'Uye bulunamadi.'; end if;
  if v_target=auth.uid() then raise exception 'Kendine davet gonderemezsin.'; end if;
  if public.has_block_between(auth.uid(),v_target) then raise exception 'Bu uye ile baglanti kurulamiyor.'; end if;
  if (select count(*) from public.friendships where requester_id=auth.uid() and status='pending') >= 20 then raise exception 'En fazla 20 bekleyen davet olabilir.'; end if;
  if (select count(*) from public.friendships where requester_id=auth.uid() and created_at > now()-interval '10 minutes') >= 5 then raise exception 'Cok hizli davet gonderiyorsun; biraz bekle.'; end if;
  select id,status into v_id,v_status from public.friendships where (requester_id=auth.uid() and recipient_id=v_target) or (requester_id=v_target and recipient_id=auth.uid());
  if v_id is not null and v_status='declined' then
    update public.friendships set requester_id=auth.uid(),recipient_id=v_target,status='pending',responded_at=null,created_at=now(),updated_at=now() where id=v_id;
    return v_id;
  end if;
  if v_id is not null then raise exception 'Bu uye icin zaten bir arkadaslik kaydi var.'; end if;
  insert into public.friendships(requester_id,recipient_id) values(auth.uid(),v_target) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.cancel_friend_request(p_request uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from public.friendships where id=p_request and requester_id=auth.uid() and status='pending';
  return found;
end;
$$;

create or replace function public.respond_friend_request(p_request uuid, p_accept boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.friendships set status=case when p_accept then 'accepted' else 'declined' end, responded_at=now(), updated_at=now()
  where id=p_request and recipient_id=auth.uid() and status='pending';
  if not found then raise exception 'Bekleyen davet bulunamadi.'; end if;
  return true;
end;
$$;

create or replace function public.remove_friend(p_handle text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_target uuid;
begin
  select user_id into v_target from public.profiles where lower(handle)=lower(trim(p_handle));
  delete from public.friendships where status='accepted' and ((requester_id=auth.uid() and recipient_id=v_target) or (recipient_id=auth.uid() and requester_id=v_target));
  return found;
end;
$$;

create or replace function public.block_member(p_handle text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_target uuid;
begin
  select user_id into v_target from public.profiles where lower(handle)=lower(trim(p_handle));
  if v_target is null or v_target=auth.uid() then raise exception 'Uye bulunamadi.'; end if;
  insert into public.member_blocks(blocker_id,blocked_id) values(auth.uid(),v_target) on conflict do nothing;
  delete from public.friendships where (requester_id=auth.uid() and recipient_id=v_target) or (recipient_id=auth.uid() and requester_id=v_target);
  delete from public.chat_threads t where t.kind='direct'
    and public.is_chat_member(t.id,auth.uid()) and public.is_chat_member(t.id,v_target);
  return true;
end;
$$;

create or replace function public.unblock_member(p_handle text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_target uuid;
begin
  select user_id into v_target from public.profiles where lower(handle)=lower(trim(p_handle));
  delete from public.member_blocks where blocker_id=auth.uid() and blocked_id=v_target;
  return found;
end;
$$;

create or replace function public.open_direct_chat(p_handle text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_target uuid; v_thread uuid;
begin
  select user_id into v_target from public.profiles where lower(handle)=lower(trim(p_handle));
  if v_target is null or not public.are_friends(auth.uid(),v_target) or public.has_block_between(auth.uid(),v_target) then
    raise exception 'Ozel sohbet yalniz engellenmemis arkadaslar arasinda acilir.';
  end if;
  select t.id into v_thread from public.chat_threads t
  where t.kind='direct' and public.is_chat_member(t.id,auth.uid()) and public.is_chat_member(t.id,v_target)
    and (select count(*) from public.chat_members m where m.thread_id=t.id)=2 limit 1;
  if v_thread is null then
    insert into public.chat_threads(kind,owner_id) values('direct',auth.uid()) returning id into v_thread;
    insert into public.chat_members(thread_id,user_id,role) values(v_thread,auth.uid(),'owner'),(v_thread,v_target,'member');
  end if;
  return v_thread;
end;
$$;

create or replace function public.create_group_chat(p_title text, p_handles text[])
returns uuid language plpgsql security definer set search_path = public as $$
declare v_thread uuid; v_handle text; v_target uuid; v_count integer := 0;
begin
  if char_length(trim(coalesce(p_title,''))) not between 1 and 60 then raise exception 'Grup adi 1-60 karakter olmali.'; end if;
  if cardinality(coalesce(p_handles,'{}')) > 29 then raise exception 'Bir grup en fazla 30 uye olabilir.'; end if;
  if (select count(*) from public.chat_threads where owner_id=auth.uid() and kind='group' and created_at>now()-interval '1 hour') >= 5 then raise exception 'Saatte en fazla 5 grup kurulabilir.'; end if;
  insert into public.chat_threads(kind,title,owner_id) values('group',trim(p_title),auth.uid()) returning id into v_thread;
  insert into public.chat_members(thread_id,user_id,role) values(v_thread,auth.uid(),'owner');
  foreach v_handle in array coalesce(p_handles,'{}') loop
    select user_id into v_target from public.profiles where lower(handle)=lower(trim(v_handle));
    if v_target is null or not public.are_friends(auth.uid(),v_target) or public.has_block_between(auth.uid(),v_target) then
      raise exception 'Gruba yalniz engellenmemis arkadaslar eklenebilir: %', v_handle;
    end if;
    insert into public.chat_members(thread_id,user_id) values(v_thread,v_target) on conflict do nothing;
    v_count := v_count + 1;
  end loop;
  if v_count < 1 then raise exception 'Grup icin en az bir arkadas sec.'; end if;
  return v_thread;
end;
$$;

create or replace function public.manage_group_member(p_thread uuid, p_handle text, p_action text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_target uuid; v_role text;
begin
  select role into v_role from public.chat_members where thread_id=p_thread and user_id=auth.uid();
  if v_role not in ('owner','admin') or not exists(select 1 from public.chat_threads where id=p_thread and kind='group') then raise exception 'Grup yoneticisi yetkisi gerekli.'; end if;
  select user_id into v_target from public.profiles where lower(handle)=lower(trim(p_handle));
  if p_action='add' then
    if not public.are_friends(auth.uid(),v_target) or public.has_block_between(auth.uid(),v_target) then raise exception 'Yalniz arkadaslarini ekleyebilirsin.'; end if;
    if (select count(*) from public.chat_members where thread_id=p_thread) >= 30 then raise exception 'Grup 30 uye sinirinda.'; end if;
    insert into public.chat_members(thread_id,user_id) values(p_thread,v_target) on conflict do nothing;
  elsif p_action='remove' then
    delete from public.chat_members where thread_id=p_thread and user_id=v_target and role<>'owner';
  else raise exception 'Gecersiz grup islemi.'; end if;
  update public.chat_threads set updated_at=now() where id=p_thread;
  return true;
end;
$$;

create or replace function public.leave_group_chat(p_thread uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if exists(select 1 from public.chat_members where thread_id=p_thread and user_id=auth.uid() and role='owner') then raise exception 'Grup sahibi once sahipligi devretmeli veya grubu silmeli.'; end if;
  delete from public.chat_members where thread_id=p_thread and user_id=auth.uid();
  return found;
end;
$$;

create or replace function public.transfer_group_owner(p_thread uuid, p_handle text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_target uuid;
begin
  if not exists(select 1 from public.chat_members where thread_id=p_thread and user_id=auth.uid() and role='owner') then raise exception 'Yalniz grup sahibi devredebilir.'; end if;
  select p.user_id into v_target from public.profiles p join public.chat_members m on m.user_id=p.user_id and m.thread_id=p_thread where lower(p.handle)=lower(trim(p_handle));
  if v_target is null or v_target=auth.uid() then raise exception 'Yeni sahip grup uyesi olmali.'; end if;
  update public.chat_members set role='member' where thread_id=p_thread and user_id=auth.uid();
  update public.chat_members set role='owner' where thread_id=p_thread and user_id=v_target;
  update public.chat_threads set owner_id=v_target,updated_at=now() where id=p_thread and kind='group';
  return true;
end;
$$;

create or replace function public.delete_group_chat(p_thread uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from public.chat_threads where id=p_thread and kind='group' and owner_id=auth.uid();
  return found;
end;
$$;

create or replace function public.list_chat_threads()
returns table(id uuid, kind text, title text, members jsonb, last_body text, last_at timestamptz)
language sql security definer stable set search_path = public as $$
  select t.id,t.kind,
    case when t.kind='group' then t.title else (select coalesce(nullif(p.display_name,''),p.handle) from public.chat_members x join public.profiles p on p.user_id=x.user_id where x.thread_id=t.id and x.user_id<>auth.uid() limit 1) end,
    (select jsonb_agg(jsonb_build_object('user_id',p.user_id,'handle',p.handle,'display_name',coalesce(nullif(p.display_name,''),p.handle),'role',m.role) order by p.handle) from public.chat_members m join public.profiles p on p.user_id=m.user_id where m.thread_id=t.id),
    lm.body,lm.created_at
  from public.chat_threads t
  left join lateral (select body,created_at from public.chat_messages z where z.thread_id=t.id and z.deleted_at is null and not public.has_block_between(auth.uid(),z.sender_id) order by z.created_at desc limit 1) lm on true
  where public.is_chat_member(t.id)
  order by coalesce(lm.created_at,t.created_at) desc;
$$;

create or replace function public.list_chat_messages(p_thread uuid, p_limit integer default 60)
returns table(id uuid, thread_id uuid, sender_id uuid, sender_handle text, sender_name text, body text, message_type text, metadata jsonb, created_at timestamptz)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_chat_member(p_thread) then raise exception 'Sohbet erisimi yok.'; end if;
  return query select m.id,m.thread_id,m.sender_id,p.handle,coalesce(nullif(p.display_name,''),p.handle),m.body,m.message_type,m.metadata,m.created_at
  from public.chat_messages m join public.profiles p on p.user_id=m.sender_id
  where m.thread_id=p_thread and m.deleted_at is null and not public.has_block_between(auth.uid(),m.sender_id)
  order by m.created_at desc limit greatest(1,least(coalesce(p_limit,60),100));
end;
$$;

create or replace function public.send_chat_message(p_thread uuid, p_body text, p_type text default 'text', p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_other uuid; v_clean text := regexp_replace(trim(coalesce(p_body,'')), '[[:cntrl:]]', ' ', 'g');
begin
  if not public.is_chat_member(p_thread) then raise exception 'Sohbet erisimi yok.'; end if;
  if char_length(v_clean) not between 1 and 1000 then raise exception 'Mesaj 1-1000 karakter olmali.'; end if;
  if p_type not in ('text','game_invite') then raise exception 'Gecersiz mesaj turu.'; end if;
  if pg_column_size(coalesce(p_metadata,'{}'::jsonb)) > 4096 then raise exception 'Mesaj ek verisi cok buyuk.'; end if;
  if (select count(*) from public.chat_messages where sender_id=auth.uid() and created_at>now()-interval '10 seconds') >= 8 then raise exception 'Cok hizli mesaj gonderiyorsun; biraz bekle.'; end if;
  if exists(select 1 from public.chat_threads where id=p_thread and kind='direct') then
    select user_id into v_other from public.chat_members where thread_id=p_thread and user_id<>auth.uid() limit 1;
    if not public.are_friends(auth.uid(),v_other) or public.has_block_between(auth.uid(),v_other) then raise exception 'Ozel mesaj icin engelsiz arkadaslik gerekli.'; end if;
  end if;
  insert into public.chat_messages(thread_id,sender_id,body,message_type,metadata) values(p_thread,auth.uid(),v_clean,p_type,coalesce(p_metadata,'{}')) returning id into v_id;
  update public.chat_threads set updated_at=now() where id=p_thread;
  return v_id;
end;
$$;

revoke all on public.friendships, public.member_blocks, public.chat_threads, public.chat_members, public.chat_messages from anon;
revoke insert, update, delete on public.friendships, public.member_blocks, public.chat_threads, public.chat_members, public.chat_messages from authenticated;
grant select on public.friendships, public.member_blocks, public.chat_threads, public.chat_members, public.chat_messages to authenticated;
revoke execute on function public.claim_handle(text), public.search_members(text,integer), public.get_social_snapshot(),
  public.send_friend_request(text), public.respond_friend_request(uuid,boolean), public.remove_friend(text),
  public.cancel_friend_request(uuid), public.block_member(text), public.unblock_member(text),
  public.open_direct_chat(text), public.create_group_chat(text,text[]), public.manage_group_member(uuid,text,text),
  public.leave_group_chat(uuid), public.transfer_group_owner(uuid,text), public.delete_group_chat(uuid),
  public.list_chat_threads(), public.list_chat_messages(uuid,integer), public.send_chat_message(uuid,text,text,jsonb)
  from public, anon;
grant execute on function public.claim_handle(text), public.search_members(text,integer), public.get_social_snapshot(),
  public.send_friend_request(text), public.respond_friend_request(uuid,boolean), public.remove_friend(text),
  public.cancel_friend_request(uuid),
  public.block_member(text), public.unblock_member(text), public.open_direct_chat(text), public.create_group_chat(text,text[]),
  public.manage_group_member(uuid,text,text), public.leave_group_chat(uuid), public.transfer_group_owner(uuid,text),
  public.delete_group_chat(uuid), public.list_chat_threads(),
  public.list_chat_messages(uuid,integer), public.send_chat_message(uuid,text,text,jsonb) to authenticated;

-- Realtime delivery still honors the subscriber's RLS policies.
do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;
end $$;
