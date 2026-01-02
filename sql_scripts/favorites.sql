-- FAVORITES TABLE
create table public.favorites (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  primary key (id),
  unique(user_id, recipe_id)
);

-- Enable RLS
alter table public.favorites enable row level security;

-- Policies

-- Everyone can see favorites (needed for counting)
create policy "Favorites are viewable by everyone"
  on public.favorites for select
  using ( true );

-- Authenticated users can add their own favorites
create policy "Users can insert their own favorites"
  on public.favorites for insert
  with check ( auth.uid() = user_id );

-- Authenticated users can remove their own favorites
create policy "Users can delete their own favorites"
  on public.favorites for delete
  using ( auth.uid() = user_id );
