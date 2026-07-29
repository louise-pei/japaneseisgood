-- ===========================================================================
-- 東京日語衝刺 — 同步碼後端
--
-- 在 Supabase 專案的 SQL Editor 貼上整段執行一次即可。
--
-- 遇到「cannot execute CREATE TABLE in a read-only transaction」的話，
-- 資料庫或這條連線正處在唯讀模式。下面兩行會解除 session 層級的唯讀，
-- 在同一個查詢視窗先跑它們，再跑後面的建表語句。
--
-- 如果仍然失敗，去 dashboard 確認：專案上方有沒有唯讀橫幅、
-- Settings → Database 的資料庫大小（免費方案超過 500 MB 會強制唯讀）、
-- 以及專案是不是還在 Setting up / Paused。
--
-- 安全性設計：
--   資料表開了 RLS 但「刻意不建立任何 policy」，所以拿 anon key 的人
--   無法直接 select / insert 這張表。對外只暴露 pull / push 兩支
--   security definer 函式，兩支都必須帶對同步碼才拿得到東西。
--   同步碼是 12 碼、去掉易混淆字元的隨機字串（約 10^18 種組合）。
-- ===========================================================================

-- 只有在遇到唯讀錯誤時才需要這兩行，平常跑了也無害
set session characteristics as transaction read write;
set default_transaction_read_only = 'off';

create table if not exists public.progress (
  code       text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

-- 讀取：帶對同步碼才拿得到那一列
create or replace function public.pull(p_code text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select data from public.progress where code = p_code;
$$;

-- 寫入：同一組同步碼就覆蓋（合併邏輯在前端做，這裡單純存最終結果）
create or replace function public.push(p_code text, p_data jsonb)
returns timestamptz
language sql
security definer
set search_path = public
as $$
  insert into public.progress (code, data, updated_at)
  values (p_code, p_data, now())
  on conflict (code) do update
    set data = excluded.data, updated_at = now()
  returning updated_at;
$$;

-- 只開放這兩支函式給匿名端，其餘一律不給
revoke all on function public.pull(text) from public, anon;
revoke all on function public.push(text, jsonb) from public, anon;
grant execute on function public.pull(text) to anon, authenticated;
grant execute on function public.push(text, jsonb) to anon, authenticated;
