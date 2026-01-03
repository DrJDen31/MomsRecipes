
-- Create Notifications Table
create table public.notifications (
  id uuid not null default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null, -- 'edit_invite', 'info'
  message text not null,
  data jsonb default '{}'::jsonb, -- e.g. { recipe_id: ... }
  is_read boolean default false,
  created_at timestamp with time zone default now(),
  primary key (id)
);

-- RLS
alter table public.notifications enable row level security;

-- Users can view their own notifications
create policy "Users can view own notifications" 
  on notifications for select 
  using (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
create policy "Users can update own notifications" 
  on notifications for update 
  using (auth.uid() = user_id);

-- Users can insert notifications for OTHERS (e.g. when sharing)
create policy "Users can insert notifications for others" 
  on notifications for insert 
  with check (auth.role() = 'authenticated');
