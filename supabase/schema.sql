create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'candidate' check (role in ('candidate', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create table public.quiz_sets (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.quiz_sets enable row level security;

create policy "quiz sets are publicly readable"
  on public.quiz_sets for select
  using (true);

create function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user ();
