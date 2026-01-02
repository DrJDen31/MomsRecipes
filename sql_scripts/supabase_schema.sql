-- RLS is enabled on auth.users by default in Supabase.
-- Skipping explicit enable to avoid permission errors.

-- 1. PROFILES TABLE
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone,
  
  primary key (id)
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Trigger to create profile on signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. RECIPES TABLE
create table public.recipes (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  title text not null,
  description text,
  prep_time text,
  cook_time text,
  servings text, -- changing to text to be flexible like "8" or "6-8"
  difficulty text,
  image text,
  ingredients jsonb default '[]'::jsonb,
  steps jsonb default '[]'::jsonb, -- holding simple string array or object array with images
  category text,
  tags text[],
  original_id text, -- ID from the local JSON file for migration
  user_id uuid references public.profiles(id) not null,
  
  primary key (id)
);

alter table public.recipes enable row level security;

-- Everyone can read recipes
create policy "Recipes are viewable by everyone."
  on recipes for select
  using ( true );

-- Authenticated users can create recipes
create policy "Authenticated users can create recipes."
  on recipes for insert
  with check ( auth.role() = 'authenticated' );

-- Users can update their own recipes
create policy "Users can update own recipes."
  on recipes for update
  using ( auth.uid() = user_id );

-- Users can delete their own recipes
create policy "Users can delete own recipes."
  on recipes for delete
  using ( auth.uid() = user_id );


-- 3. RECIPE EDITORS (Shared Editing)
create table public.recipe_editors (
  id uuid not null default gen_random_uuid(),
  recipe_id uuid references public.recipes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  
  primary key (id),
  unique(recipe_id, user_id)
);

alter table public.recipe_editors enable row level security;

-- Read: Public (so we can check who are editors easily? Or just editors?)
-- Let's allow everyone to see who edits what for simplicity, or just linked users.
create policy "Editors viewable by everyone"
  on recipe_editors for select
  using ( true );

-- Owner can add editors
create policy "Recipe owners can add editors"
  on recipe_editors for insert
  with check ( 
    auth.uid() = (select user_id from recipes where id = recipe_id) 
  );

-- Owner can remove editors
create policy "Recipe owners can remove editors"
  on recipe_editors for delete
  using ( 
    auth.uid() = (select user_id from recipes where id = recipe_id)
    or auth.uid() = user_id -- Editor can remove themselves
  );

-- UPDATE POLICY FOR RECIPES to include Editors
create policy "Editors can update recipes"
  on recipes for update
  using ( 
    auth.uid() in (select user_id from recipe_editors where recipe_id = id)
  );


-- 4. RECIPE NOTES (Private)
create table public.recipe_notes (
  id uuid not null default gen_random_uuid(),
  recipe_id uuid references public.recipes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  note text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  primary key (id)
);

alter table public.recipe_notes enable row level security;

-- Users can only view their own notes
create policy "Users can view own notes"
  on recipe_notes for select
  using ( auth.uid() = user_id );

create policy "Users can insert own notes"
  on recipe_notes for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own notes"
  on recipe_notes for update
  using ( auth.uid() = user_id );

create policy "Users can delete own notes"
  on recipe_notes for delete
  using ( auth.uid() = user_id );


-- 5. RECIPE GALLERY (Public Photos)
create table public.recipe_gallery (
  id uuid not null default gen_random_uuid(),
  recipe_id uuid references public.recipes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  image_url text not null,
  caption text,
  created_at timestamp with time zone default now(),
  
  primary key (id)
);

alter table public.recipe_gallery enable row level security;

create policy "Gallery viewable by everyone"
  on recipe_gallery for select
  using ( true );

create policy "Authenticated users can add to gallery"
  on recipe_gallery for insert
  with check ( auth.role() = 'authenticated' );

create policy "Users can delete own gallery images"
  on recipe_gallery for delete
  using ( auth.uid() = user_id or auth.uid() = (select user_id from recipes where id = recipe_id) );
