-- Wally Squad world leaderboard. Run this once in the Supabase SQL editor of the project in js/net.js.
-- Anyone can read the scores and add a new one; nobody can change or delete them.
create table if not exists public.wallysquad_scores (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  board text not null check (char_length(board) between 1 and 40),
  name text not null check (char_length(name) between 1 and 16),
  score integer not null check (score between 0 and 100000000),
  detail text check (char_length(detail) <= 40),
  version text check (char_length(version) <= 12)
);
create index if not exists wallysquad_scores_board_score on public.wallysquad_scores (board, score);
alter table public.wallysquad_scores enable row level security;
create policy "read scores" on public.wallysquad_scores for select to anon using (true);
create policy "add a score" on public.wallysquad_scores for insert to anon with check (true);
