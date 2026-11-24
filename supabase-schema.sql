-- Flavours Business Manager cloud backup schema
-- Run this in Supabase Dashboard > SQL Editor.
-- The app must sign users in with Supabase Auth before it can read/write this table.

create table if not exists public.flavours_backups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  backup jsonb not null,
  updated_at timestamptz not null default now(),
  constraint flavours_backups_backup_is_object
    check (jsonb_typeof(backup) = 'object')
);

alter table public.flavours_backups enable row level security;

-- Each signed-in Supabase user can access only their own backup.
drop policy if exists "Users can read own Flavours backup" on public.flavours_backups;
create policy "Users can read own Flavours backup"
  on public.flavours_backups for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create own Flavours backup" on public.flavours_backups;
create policy "Users can create own Flavours backup"
  on public.flavours_backups for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own Flavours backup" on public.flavours_backups;
create policy "Users can update own Flavours backup"
  on public.flavours_backups for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own Flavours backup" on public.flavours_backups;
create policy "Users can delete own Flavours backup"
  on public.flavours_backups for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.flavours_backups to authenticated;
revoke all on public.flavours_backups from anon;

create index if not exists flavours_backups_updated_at_idx
  on public.flavours_backups (updated_at desc);

-- Keep updated_at current on every change.
create or replace function public.set_flavours_backup_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_flavours_backup_updated_at on public.flavours_backups;
create trigger set_flavours_backup_updated_at
  before update on public.flavours_backups
  for each row execute function public.set_flavours_backup_updated_at();
