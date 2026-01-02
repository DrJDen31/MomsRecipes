
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import RecipeDetailClient from './RecipeDetailClient';

const isUUID = (str) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(str);
};

export default async function RecipeDetail({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase.from('recipes').select('*, favorites(count)');
  
  if (isUUID(id)) {
    query = query.eq('id', id);
  } else {
    query = query.eq('original_id', id);
  }
  
  const { data: recipe, error } = await query.single();

  if (error) {
    console.error('Recipe lookup error:', error);
  }
  
  if (error || !recipe) {
    notFound();
  }

  // Fetch Stats
  const favoriteCount = recipe.favorites ? recipe.favorites[0]?.count || 0 : 0;
  let isFavorited = false;

  if (user) {
      const { data: fav } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('recipe_id', recipe.id)
        .single();
      
      if (fav) isFavorited = true;
  }

  // Fetch Notes and Gallery
  const { data: notes } = await supabase
    .from('recipe_notes')
    .select('id, note, created_at')
    .eq('recipe_id', recipe.id)
    .order('created_at', { ascending: true });

  const { data: gallery } = await supabase
    .from('recipe_gallery')
    .select('id, image_url, caption, created_at, user_id')
    .eq('recipe_id', recipe.id)
    .order('created_at', { ascending: true });

  const canEdit = user && user.id === recipe.user_id;

  return (
    <RecipeDetailClient 
      recipe={{
        ...recipe, 
        favorites: undefined, // Remove the joined favorites array
        notes: notes || [],
        gallery: gallery || [],
        is_favorited: isFavorited,
        favorite_count: favoriteCount
      }} 
      canEdit={!!canEdit}
      userId={user ? user.id : null}
    />
  );
}

