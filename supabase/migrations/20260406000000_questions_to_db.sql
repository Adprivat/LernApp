-- ============================================================
-- Migration: Questions from JSON to Database
-- ============================================================

-- ============================================================
-- QUESTION CATEGORIES
-- ============================================================
create table if not exists public.question_categories (
  id uuid default uuid_generate_v4() primary key,
  key text unique not null,
  name text not null,
  icon text not null default '',
  color text not null default '#000000',
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

alter table public.question_categories enable row level security;

create policy "Categories readable by all authenticated users"
  on public.question_categories for select
  using (auth.uid() is not null);

create policy "Admins can insert categories"
  on public.question_categories for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

create policy "Admins can update categories"
  on public.question_categories for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

create policy "Admins can delete categories"
  on public.question_categories for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

-- ============================================================
-- SUBJECTS (tag metadata)
-- ============================================================
create table if not exists public.subjects (
  id uuid default uuid_generate_v4() primary key,
  key text unique not null,
  category_id uuid references public.question_categories(id) on delete cascade not null,
  name text not null,
  icon text not null default '',
  color text not null default '#000000',
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

alter table public.subjects enable row level security;

create policy "Subjects readable by all authenticated users"
  on public.subjects for select
  using (auth.uid() is not null);

create policy "Admins can insert subjects"
  on public.subjects for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

create policy "Admins can update subjects"
  on public.subjects for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

create policy "Admins can delete subjects"
  on public.subjects for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

-- ============================================================
-- QUESTIONS
-- ============================================================
create table if not exists public.questions (
  id uuid default uuid_generate_v4() primary key,
  category_id uuid references public.question_categories(id) on delete cascade not null,
  question text not null,
  answers text[] not null check (array_length(answers, 1) = 4),
  correct_index integer not null check (correct_index >= 0 and correct_index <= 3),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  tags text[] not null default '{}',
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_questions_category on public.questions(category_id);
create index idx_questions_tags on public.questions using gin(tags);
create index idx_questions_sort_order on public.questions(category_id, sort_order);

alter table public.questions enable row level security;

create policy "Questions readable by all authenticated users"
  on public.questions for select
  using (auth.uid() is not null);

create policy "Admins can insert questions"
  on public.questions for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

create policy "Admins can update questions"
  on public.questions for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

create policy "Admins can delete questions"
  on public.questions for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

-- ============================================================
-- Add question_id to game_answers (nullable for old games)
-- ============================================================
alter table public.game_answers
  add column if not exists question_id uuid references public.questions(id) on delete set null;

-- ============================================================
-- SEED: Category + Subjects
-- ============================================================
insert into public.question_categories (key, name, icon, color, sort_order)
values ('exam_prep', 'Prüfungsvorbereitung', '📝', '#e11d48', 0);

insert into public.subjects (key, category_id, name, icon, color, sort_order)
values
  ('projektmanagement',    (select id from public.question_categories where key = 'exam_prep'), 'Projektmanagement',       '📋', '#2E5BFF',  0),
  ('scrum_agile',          (select id from public.question_categories where key = 'exam_prep'), 'Scrum & Agile',           '🔄', '#00BCD4',  1),
  ('datenschutz',          (select id from public.question_categories where key = 'exam_prep'), 'Datenschutz & DSGVO',     '🔒', '#9C27B0',  2),
  ('it_sicherheit',        (select id from public.question_categories where key = 'exam_prep'), 'IT-Sicherheit',           '🛡️', '#FF3D00',  3),
  ('netzwerktechnik',      (select id from public.question_categories where key = 'exam_prep'), 'Netzwerktechnik',         '🌐', '#00C853',  4),
  ('softwareentwicklung',  (select id from public.question_categories where key = 'exam_prep'), 'Softwareentwicklung',     '💻', '#FF6B35',  5),
  ('wirtschaft',           (select id from public.question_categories where key = 'exam_prep'), 'Wirtschaft & Recht',      '📊', '#FFC107',  6),
  ('arbeitsrecht',         (select id from public.question_categories where key = 'exam_prep'), 'Arbeits- & Sozialrecht',  '⚖️', '#E91E63',  7),
  ('qualitaetsmanagement', (select id from public.question_categories where key = 'exam_prep'), 'Qualitätsmanagement',     '✅', '#8BC34A',  8),
  ('datenanalyse',         (select id from public.question_categories where key = 'exam_prep'), 'Datenanalyse & KI',       '📈', '#B24BFF',  9);
