import RecipeListingClient from './RecipeListingClient';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic'; // Ensure it refreshes on navigation

export default async function RecipeListingPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch Recipes
  let query = supabase.from('recipes').select('*, favorites(count)');
  const { data: recipes } = await query;
  
  // Fetch Favorites for current user to pass "isFavorited" state, 
  // though RecipeCard might need it. 
  // Actually, RecipeListingClient fetches nothing now. It should take recipes as props.
  // But wait, RecipeCard logic for favorites might need looking at.
  // The current RecipeListingClient does client-side filtering. 
  // We can just pass the raw recipes array and let the client filter.
  // *However*, we need to know if *each* recipe is favorited by *this* user.
  
  let userFavorites = new Set();
  if (user) {
      const { data: favs } = await supabase
        .from('favorites')
        .select('recipe_id')
        .eq('user_id', user.id);
      
      if (favs) {
          favs.forEach(f => userFavorites.add(f.recipe_id));
      }
  }

  // Enhance recipes with 'isFavorited' status if needed, 
  // OR pass the set of favorite IDs to the client.
  // Passing the set is cleaner.
  
  return <RecipeListingClient initialRecipes={recipes || []} favoriteIds={Array.from(userFavorites)} />;
}
