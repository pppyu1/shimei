create extension if not exists "pgcrypto";

-- 1. Create tables

-- profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- favorites table
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  content_id text not null,
  content_type text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, content_id)
);

-- play_history table
create table if not exists public.play_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  content_id text not null,
  progress_seconds integer default 0,
  played_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- mixer_presets table
create table if not exists public.mixer_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  channels jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- dream_journals table
create table if not exists public.dream_journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  mood text,
  content text,
  recorded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create indexes
create index if not exists idx_profiles_id on public.profiles(id);
create index if not exists idx_favorites_user_id on public.favorites(user_id);
create index if not exists idx_play_history_user_id_played_at on public.play_history(user_id, played_at desc);
create index if not exists idx_mixer_presets_user_id on public.mixer_presets(user_id);
create index if not exists idx_dream_journals_user_id_recorded_at on public.dream_journals(user_id, recorded_at desc);

-- 3. Set up updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer;

-- Apply triggers
drop trigger if exists on_profiles_updated on public.profiles;
drop trigger if exists on_favorites_updated on public.favorites;
drop trigger if exists on_play_history_updated on public.play_history;
drop trigger if exists on_mixer_presets_updated on public.mixer_presets;
drop trigger if exists on_dream_journals_updated on public.dream_journals;
create trigger on_profiles_updated before update on public.profiles for each row execute procedure public.handle_updated_at();
create trigger on_favorites_updated before update on public.favorites for each row execute procedure public.handle_updated_at();
create trigger on_play_history_updated before update on public.play_history for each row execute procedure public.handle_updated_at();
create trigger on_mixer_presets_updated before update on public.mixer_presets for each row execute procedure public.handle_updated_at();
create trigger on_dream_journals_updated before update on public.dream_journals for each row execute procedure public.handle_updated_at();

-- 4. Enable RLS
alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.play_history enable row level security;
alter table public.mixer_presets enable row level security;
alter table public.dream_journals enable row level security;

-- 5. RLS Policies

-- profiles
drop policy if exists "Users can view their own profile." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;
create policy "Users can view their own profile." on public.profiles
  for select using (auth.uid() = id);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- favorites
drop policy if exists "Users can view their own favorites." on public.favorites;
drop policy if exists "Users can insert their own favorites." on public.favorites;
drop policy if exists "Users can update their own favorites." on public.favorites;
drop policy if exists "Users can delete their own favorites." on public.favorites;
create policy "Users can view their own favorites." on public.favorites
  for select using (auth.uid() = user_id);

create policy "Users can insert their own favorites." on public.favorites
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own favorites." on public.favorites
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own favorites." on public.favorites
  for delete using (auth.uid() = user_id);

-- play_history
drop policy if exists "Users can view their own play history." on public.play_history;
drop policy if exists "Users can insert their own play history." on public.play_history;
drop policy if exists "Users can update their own play history." on public.play_history;
drop policy if exists "Users can delete their own play history." on public.play_history;
create policy "Users can view their own play history." on public.play_history
  for select using (auth.uid() = user_id);

create policy "Users can insert their own play history." on public.play_history
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own play history." on public.play_history
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own play history." on public.play_history
  for delete using (auth.uid() = user_id);

-- mixer_presets
drop policy if exists "Users can view their own mixer presets." on public.mixer_presets;
drop policy if exists "Users can insert their own mixer presets." on public.mixer_presets;
drop policy if exists "Users can update their own mixer presets." on public.mixer_presets;
drop policy if exists "Users can delete their own mixer presets." on public.mixer_presets;
create policy "Users can view their own mixer presets." on public.mixer_presets
  for select using (auth.uid() = user_id);

create policy "Users can insert their own mixer presets." on public.mixer_presets
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own mixer presets." on public.mixer_presets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own mixer presets." on public.mixer_presets
  for delete using (auth.uid() = user_id);

-- dream_journals
drop policy if exists "Users can view their own dream journals." on public.dream_journals;
drop policy if exists "Users can insert their own dream journals." on public.dream_journals;
drop policy if exists "Users can update their own dream journals." on public.dream_journals;
drop policy if exists "Users can delete their own dream journals." on public.dream_journals;
create policy "Users can view their own dream journals." on public.dream_journals
  for select using (auth.uid() = user_id);

create policy "Users can insert their own dream journals." on public.dream_journals
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own dream journals." on public.dream_journals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own dream journals." on public.dream_journals
  for delete using (auth.uid() = user_id);

-- 6. Trigger to automatically create a profile for new users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create extension if not exists "pgcrypto";

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.admins enable row level security;

drop policy if exists "admins_select_self" on public.admins;
drop policy if exists "admins_insert_self" on public.admins;
drop policy if exists "admins_delete_self" on public.admins;

create policy "admins_select_self" on public.admins
  for select using (user_id = auth.uid());

create policy "admins_insert_self" on public.admins
  for insert with check (user_id = auth.uid());

create policy "admins_delete_self" on public.admins
  for delete using (user_id = auth.uid());

create or replace function public.is_admin(target uuid default auth.uid())
returns boolean
language sql
stable
security definer
as $$
  select exists(select 1 from public.admins a where a.user_id = target);
$$;

create or replace function public.ensure_profile()
returns void
language plpgsql
security definer
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  insert into public.profiles (id)
  values (auth.uid())
  on conflict (id) do nothing;
end;
$$;

create or replace function public.set_display_name(new_name text)
returns void
language plpgsql
security definer
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.profiles
  set display_name = nullif(trim(new_name), '')
  where id = auth.uid();
end;
$$;

create or replace function public.set_avatar_url(new_url text)
returns void
language plpgsql
security definer
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.profiles
  set avatar_url = nullif(trim(new_url), '')
  where id = auth.uid();
end;
$$;

create or replace view public.me as
select id, display_name, avatar_url, created_at, updated_at
from public.profiles
where id = auth.uid();
