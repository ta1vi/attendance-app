-- 権限昇格の脆弱性対策
-- 1) サインアップ時のクライアント指定 role を信用せず、常に 'member' で作成する
-- 2) member 本人が自分の profiles.role を書き換えられないようにする

-- 1) 新規ユーザーは常に member として作成（admin 昇格は既存 admin の操作でのみ行う）
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
    'member',
    nullif(new.raw_user_meta_data->>'department', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2) UPDATE ポリシーを強化：本人更新では role を変更不可、admin のみ role 変更可
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  )
);

-- 既存の誤って昇格したテストアカウントを member に戻す（本来の admin は手動で再付与）
update public.profiles
set role = 'member'
where email in (
  'e2e-rls-test-b@example.com',
  'e2e-rls-escalation@example.com'
);
