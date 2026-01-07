-- Create meal_plan_items table
create table if not exists public.meal_plan_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  recipe_id uuid references public.recipes,
  meal_name text,
  date date not null,
  servings numeric default 1,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.meal_plan_items enable row level security;

-- Policies
create policy "Users can view their own meal plan items"
  on public.meal_plan_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own meal plan items"
  on public.meal_plan_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own meal plan items"
  on public.meal_plan_items for update
  using (auth.uid() = user_id);

create policy "Users can delete their own meal plan items"
  on public.meal_plan_items for delete
  using (auth.uid() = user_id);
