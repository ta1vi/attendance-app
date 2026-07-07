create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  department text,
  employee_code text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null,
  work_type text not null default '出社' check (work_type in ('出社', 'リモート', '直行', '直帰', 'フレックス')),
  clock_in timestamptz,
  clock_out timestamptz,
  break_minutes integer not null default 0 check (break_minutes >= 0),
  breaks jsonb not null default '[]'::jsonb check (jsonb_typeof(breaks) = 'array'),
  status text not null default 'not_started' check (
    status in (
      'not_started',
      'working',
      'break',
      'done',
      'normal',
      'missing_clock_out',
      'correction_pending',
      'correction_approved',
      'correction_rejected',
      'absent',
      'paid_leave',
      'holiday'
    )
  ),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, work_date)
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_date date not null,
  shift_type text not null,
  start_time time,
  end_time time,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_date date not null,
  title text not null,
  body text not null,
  next_plan text,
  status text not null default 'submitted' check (status in ('draft', 'submitted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, report_date)
);

create table if not exists public.action_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists attendances_user_date_idx on public.attendances(user_id, work_date desc);
create index if not exists attendances_status_idx on public.attendances(status);
create index if not exists shifts_user_date_idx on public.shifts(user_id, request_date desc);
create index if not exists shifts_status_idx on public.shifts(status);
create index if not exists daily_reports_user_date_idx on public.daily_reports(user_id, report_date desc);
create index if not exists action_logs_user_created_idx on public.action_logs(user_id, created_at desc);
create index if not exists action_logs_target_idx on public.action_logs(target_table, target_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_attendances_updated_at on public.attendances;
create trigger set_attendances_updated_at
before update on public.attendances
for each row execute function public.set_updated_at();

drop trigger if exists set_shifts_updated_at on public.shifts;
create trigger set_shifts_updated_at
before update on public.shifts
for each row execute function public.set_updated_at();

drop trigger if exists set_daily_reports_updated_at on public.daily_reports;
create trigger set_daily_reports_updated_at
before update on public.daily_reports
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, department)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'member'),
    new.raw_user_meta_data->>'department'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.attendances enable row level security;
alter table public.shifts enable row level security;
alter table public.daily_reports enable row level security;
alter table public.action_logs enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_own_or_admin" on public.profiles;
create policy "profiles_insert_own_or_admin"
on public.profiles for insert
to authenticated
with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
on public.profiles for delete
to authenticated
using (public.is_admin());

drop policy if exists "attendances_select_own_or_admin" on public.attendances;
create policy "attendances_select_own_or_admin"
on public.attendances for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "attendances_insert_own_or_admin" on public.attendances;
create policy "attendances_insert_own_or_admin"
on public.attendances for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "attendances_update_own_or_admin" on public.attendances;
create policy "attendances_update_own_or_admin"
on public.attendances for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "attendances_delete_admin" on public.attendances;
create policy "attendances_delete_admin"
on public.attendances for delete
to authenticated
using (public.is_admin());

drop policy if exists "shifts_select_own_or_admin" on public.shifts;
create policy "shifts_select_own_or_admin"
on public.shifts for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "shifts_insert_own_or_admin" on public.shifts;
create policy "shifts_insert_own_or_admin"
on public.shifts for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "shifts_update_own_or_admin" on public.shifts;
create policy "shifts_update_own_or_admin"
on public.shifts for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "shifts_delete_admin" on public.shifts;
create policy "shifts_delete_admin"
on public.shifts for delete
to authenticated
using (public.is_admin());

drop policy if exists "daily_reports_select_own_or_admin" on public.daily_reports;
create policy "daily_reports_select_own_or_admin"
on public.daily_reports for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "daily_reports_insert_own_or_admin" on public.daily_reports;
create policy "daily_reports_insert_own_or_admin"
on public.daily_reports for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "daily_reports_update_own_or_admin" on public.daily_reports;
create policy "daily_reports_update_own_or_admin"
on public.daily_reports for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "daily_reports_delete_own_or_admin" on public.daily_reports;
create policy "daily_reports_delete_own_or_admin"
on public.daily_reports for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "action_logs_select_own_or_admin" on public.action_logs;
create policy "action_logs_select_own_or_admin"
on public.action_logs for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "action_logs_insert_own_or_admin" on public.action_logs;
create policy "action_logs_insert_own_or_admin"
on public.action_logs for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "action_logs_update_admin" on public.action_logs;
create policy "action_logs_update_admin"
on public.action_logs for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "action_logs_delete_admin" on public.action_logs;
create policy "action_logs_delete_admin"
on public.action_logs for delete
to authenticated
using (public.is_admin());
