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
    coalesce(new.email, new.id::text || '@no-email.local'),
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(coalesce(new.email, new.id::text), '@', 1),
      'ユーザー'
    ),
    case
      when new.raw_user_meta_data->>'role' = 'admin' then 'admin'
      else 'member'
    end,
    nullif(new.raw_user_meta_data->>'department', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email, full_name, role, department)
select
  auth_user.id,
  coalesce(auth_user.email, auth_user.id::text || '@no-email.local') as email,
  coalesce(
    nullif(auth_user.raw_user_meta_data->>'full_name', ''),
    split_part(coalesce(auth_user.email, auth_user.id::text), '@', 1),
    'ユーザー'
  ) as full_name,
  case
    when auth_user.raw_user_meta_data->>'role' = 'admin' then 'admin'
    else 'member'
  end as role,
  nullif(auth_user.raw_user_meta_data->>'department', '') as department
from auth.users as auth_user
left join public.profiles as profile
  on profile.id = auth_user.id
where profile.id is null
on conflict (id) do nothing;
