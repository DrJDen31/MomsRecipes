
import styles from './page.module.css';
import { createClient } from '@/utils/supabase/server';
import RecipeCard from '@/components/RecipeCard/RecipeCard';
import Link from 'next/link';

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
  // If logged in, Hero = My Favorites. If not, Hero = Top 3 (or just default)
  // Actually, filtering `recipesWithStats` ensures we have the counts!
  const userFavorites = recipesWithStats.filter(r => r.is_favorited);
  
  const heroRecipes = user ? userFavorites : recipesWithStats.slice(0, 3);
  const heroSectionTitle = user ? "Your Favorites" : "Featured from Mom's Kitchen";

  return (
    <main className={styles.container}>
      {/* Restored Hero Header */}
      <section style={{textAlign:'center', padding:'4rem 2rem', background:'var(--card-bg)', marginBottom:'2rem'}}>
          <h1 style={{fontSize:'3.5rem', marginBottom:'1rem', color:'var(--primary)'}}>Mom's Secret Recipes</h1>
          <p style={{fontSize:'1.2rem', maxWidth:'600px', margin:'0 auto 2rem', opacity:0.8}}>
              A collection of cherished family recipes, passed down through generations. 
              Now digitized for the modern kitchen.
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

      <section className={styles.featured}>
        
        <h2 className={styles.sectionTitle}>{heroSectionTitle}</h2>
        
        {heroRecipes.length === 0 ? (
            <p style={{textAlign:'center', fontStyle:'italic', opacity:0.7, marginBottom:'3rem'}}>
                {user ? "You haven't favorited any recipes yet. Go explore!" : "No recipes yet."}
            </p>
        ) : (
            <div className={styles.grid}>
            {heroRecipes.map((recipe) => (
                <RecipeCard 
                    key={recipe.id} 
                    recipe={recipe} 
                />
            ))}
            </div>
        )}
      </section>

      <section className={styles.featured} style={{paddingTop:0}}>
        <h2 className={styles.sectionTitle} style={{fontSize:'2rem', borderTop:'1px solid var(--card-border)', paddingTop:'3rem'}}>
            Fresh from the Kitchen
        </h2>
        <div className={styles.grid}>
          {recipesWithStats.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </section>
    </main>
  );
}
