-- ============================================================
-- AgentHire — Burtch Team / Century 21 Sunbelt
-- Run this entire file in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/omwizinwdggzbrathxog/sql
-- ============================================================

-- 1. USERS (profile table extending Supabase auth.users)
create table if not exists public.users (
  id         uuid references auth.users(id) on delete cascade primary key,
  email      text not null,
  full_name  text,
  role       text not null default 'recruiter',
  team       text not null default 'Burtch Team',
  created_at timestamptz not null default now()
);

-- 2. JOBS
create table if not exists public.jobs (
  id           uuid not null default gen_random_uuid() primary key,
  title        text not null,
  counties     text[] not null default '{}',
  cities       text[] not null default '{}',
  requirements text,
  status       text not null default 'active',
  created_at   timestamptz not null default now()
);

-- 3. CANDIDATES
create table if not exists public.candidates (
  id             uuid not null default gen_random_uuid() primary key,
  name           text not null,
  email          text,
  phone          text,
  resume_text    text,
  ai_score       integer,
  score_breakdown jsonb,
  status         text not null default 'new',
  job_id         uuid references public.jobs(id) on delete set null,
  source         text not null default 'manual',
  created_at     timestamptz not null default now()
);

-- 4. INTERVIEWS
create table if not exists public.interviews (
  id           uuid not null default gen_random_uuid() primary key,
  candidate_id uuid references public.candidates(id) on delete cascade,
  job_id       uuid references public.jobs(id) on delete set null,
  scheduled_at timestamptz,
  type         text not null default 'Video Call',
  interviewer  text,
  notes        text,
  status       text not null default 'scheduled',
  created_at   timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.users      enable row level security;
alter table public.jobs       enable row level security;
alter table public.candidates enable row level security;
alter table public.interviews enable row level security;

-- Users: read own profile, update own profile
create policy "Users can view own profile"
  on public.users for select to authenticated using (auth.uid() = id);
create policy "Users can update own profile"
  on public.users for update to authenticated using (auth.uid() = id);

-- Jobs: full access for authenticated users
create policy "Authenticated full access to jobs"
  on public.jobs for all to authenticated using (true) with check (true);

-- Candidates: full access for authenticated users
create policy "Authenticated full access to candidates"
  on public.candidates for all to authenticated using (true) with check (true);

-- Interviews: full access for authenticated users
create policy "Authenticated full access to interviews"
  on public.interviews for all to authenticated using (true) with check (true);

-- ============================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
