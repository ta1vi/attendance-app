alter table public.attendances
  add column if not exists clock_in_jst timestamp
    generated always as (timezone('Asia/Tokyo', clock_in)) stored,
  add column if not exists clock_out_jst timestamp
    generated always as (timezone('Asia/Tokyo', clock_out)) stored;

comment on column public.attendances.clock_in_jst is '出勤時刻（日本時間表示用・自動計算）';
comment on column public.attendances.clock_out_jst is '退勤時刻（日本時間表示用・自動計算）';
