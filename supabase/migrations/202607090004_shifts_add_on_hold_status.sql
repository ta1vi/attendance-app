-- shifts.status に保留(on_hold)を追加
-- 既存の check 制約 (pending/approved/rejected) を作り直す
alter table public.shifts drop constraint if exists shifts_status_check;
alter table public.shifts
  add constraint shifts_status_check
  check (status in ('pending', 'approved', 'rejected', 'on_hold'));
