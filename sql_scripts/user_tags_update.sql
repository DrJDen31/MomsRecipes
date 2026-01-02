-- Add category column to user_tags
alter table public.user_tags 
add column category text default 'Custom';

-- Update existing tags to have a default category
update public.user_tags set category = 'Custom' where category is null;
