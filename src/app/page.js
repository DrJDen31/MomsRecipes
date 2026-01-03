
import styles from './page.module.css';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import PaginatedRecipeList from '@/components/PaginatedRecipeList';

export const revalidate = 0;

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Fetch ALL Recipes with favorite count
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('*, favorites(count)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching recipes:", error);
  }

  // 2. Fetch User's Favorite IDs
  let myFavoriteIds = new Set();
  
  if (user) {
      const { data: myFaves } = await supabase
        .from('favorites')
        .select('recipe_id')
        .eq('user_id', user.id);
      
      if (myFaves) {
          myFaves.forEach(f => myFavoriteIds.add(f.recipe_id));
      }
  }

  // 3. Merge Stats
  const recipesWithStats = (recipes || []).map(r => ({
      ...r,
      // Aggregated count usually comes as [{ count: N }]
      favorite_count: r.favorites && r.favorites[0] ? r.favorites[0].count : 0, 
      is_favorited: myFavoriteIds.has(r.id)
  }));

  // 4. Derive Layout Lists
  
  // A. Your Favorites (Logged in only)
  const userFavorites = user ? recipesWithStats.filter(r => r.is_favorited) : [];

  // B. Featured: Top Favorited (Global)
  // Sort by count DESC, then created DESC
  const featuredRecipes = [...recipesWithStats].sort((a, b) => {
      if (b.favorite_count !== a.favorite_count) return b.favorite_count - a.favorite_count;
      return new Date(b.created_at) - new Date(a.created_at);
  });

  // C. Fresh from the Kitchen: Top Favorited Created This Week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  let freshRecipes = recipesWithStats.filter(r => new Date(r.created_at) > oneWeekAgo);
  
  // Sort Fresh by Popularity
  freshRecipes.sort((a, b) => b.favorite_count - a.favorite_count);

  // Fallback: If 0 fresh recipes, just use most recent 5
  if (freshRecipes.length === 0) {
      freshRecipes = [...recipesWithStats].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return (
    <main className={styles.container}>
      {/* Hero Header */}
      <section style={{textAlign:'center', padding:'4rem 2rem', background:'var(--card-bg)', marginBottom:'2rem'}}>
          <h1 style={{fontSize:'3.5rem', marginBottom:'1rem', color:'var(--primary)'}}>Mom's Secret Recipes</h1>
          <p style={{fontSize:'1.2rem', maxWidth:'600px', margin:'0 auto 2rem', opacity:0.8}}>
              A collection of cherished family recipes, passed down through generations.
          </p>
          <Link 
            href="/recipes" 
            style={{
                display:'inline-block', padding:'0.75rem 2rem', background:'var(--primary)', color:'white', 
                borderRadius:'30px', fontWeight:'bold', textDecoration:'none', fontSize:'1.1rem',
                boxShadow:'0 4px 12px rgba(230, 81, 0, 0.3)'
            }}
          >
              Browse All Recipes
          </Link>
      </section>

      {/* 1. YOUR FAVORITES (If Logged In) */}
      {user && (
          <section className={styles.featured}>
            <h2 className={styles.sectionTitle}>Your Favorites</h2>
            <PaginatedRecipeList recipes={userFavorites} pageSize={3} />
          </section>
      )}

      {/* 2. FEATURED (Top Favorited Global) */}
      <section className={styles.featured}>
        <h2 className={styles.sectionTitle}>Featured Favorites</h2>
        <PaginatedRecipeList recipes={featuredRecipes} pageSize={3} />
      </section>

      {/* 3. FRESH (Top Favorited Weekly) */}
      <section className={styles.featured} style={{paddingTop:0}}>
        <h2 className={styles.sectionTitle} style={{fontSize:'2rem', borderTop:'1px solid var(--card-border)', paddingTop:'3rem'}}>
            Fresh from the Kitchen
        </h2>
        <PaginatedRecipeList recipes={freshRecipes} pageSize={3} />
      </section>
    </main>
  );
}
