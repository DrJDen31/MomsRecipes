-- Add step_images column to recipes table
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS step_images jsonb DEFAULT '{}'::jsonb;
