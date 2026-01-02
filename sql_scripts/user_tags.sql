-- USER TAGS TABLE
create table public.user_tags (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tag_name text not null,
  created_at timestamp with time zone not null default now(),
  primary key (id),
  unique(user_id, tag_name)
);

-- Enable RLS
alter table public.user_tags enable row level security;

-- Policies

-- Users can see their own tags
create policy "Users can view their own tags"
  on public.user_tags for select
  using ( auth.uid() = user_id );

-- Users can insert their own tags
create policy "Users can insert their own tags"
  on public.user_tags for insert
  with check ( auth.uid() = user_id );

-- Users can delete their own tags
create policy "Users can delete their own tags"
  on public.user_tags for delete
  using ( auth.uid() = user_id );
