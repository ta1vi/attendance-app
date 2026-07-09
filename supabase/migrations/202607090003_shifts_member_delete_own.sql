-- shifts: member が自分のシフトを削除できるようにする
-- （SELECT/INSERT/UPDATE は既に「本人＋admin」で適用済み。DELETE のみ admin 限定だったため修正）
drop policy if exists "shifts_delete_admin" on public.shifts;
drop policy if exists "shifts_delete_own_or_admin" on public.shifts;
create policy "shifts_delete_own_or_admin"
on public.shifts for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());
