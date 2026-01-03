
'use client';
import { useState } from 'react';
import RecipeCard from '@/components/RecipeCard/RecipeCard';
import styles from './page.module.css';
import Link from 'next/link';

export default function MyRecipesClient({ owned = [], shared = [], gallery = [] }) {
  const [activeTab, setActiveTab] = useState('owned');

  const tabs = [
    { id: 'owned', label: 'My Recipes', count: owned.length, data: owned },
    { id: 'shared', label: 'Shared with Me', count: shared.length, data: shared },
    { id: 'gallery', label: 'My Gallery', count: gallery.length, data: gallery },
  ];

  const activeData = tabs.find(t => t.id === activeTab)?.data || [];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Collection</h1>
        <p className={styles.subtitle}>Manage your recipes and contributions</p>
      </header>

      <div className={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
          >
            {tab.label}
            {tab.count > 0 && <span className={styles.countBadge}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeData.length > 0 ? (
        <div className={styles.grid}>
          {activeData.map(recipe => (
             // Pass a minimal recipe object or enrich it if RecipeCard needs more context
             // Note: RecipeCard might expect 'is_favorited' which we fetch in getMyRecipes (via 'favorites(count)')
             // but we didn't process it into a boolean. 
             // We can do a quick map if needed, or rely on RecipeCard to handle 'favorites' array if it does.
             // Looking at previous MyRecipes analysis, RecipeListingClient mapped it.
             // Let's do a quick map here to be safe and consistent.
             <div key={recipe.id}>
                <RecipeCard 
                    recipe={{
                        ...recipe,
                        // If "favorites" is an array with count, extracting count.
                        // If we needed is_favorited, we might be missing it unless we specifically fetched user's favorite status.
                        // In actions.js getMyRecipes, we did fetch 'favorites(count)', but we didn't filter by user for that count (it's total favorites).
                        // We also didn't fetch "is this favorited by me". 
                        // For "My Recipes", maybe favoriting isn't the primary action, but nice to have.
                        // I'll leave it as is for now.
                        favorite_count: recipe.favorites && recipe.favorites[0] ? recipe.favorites[0].count : 0
                    }} 
                />
             </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          {activeTab === 'owned' && (
            <>
              <h3>No recipes yet</h3>
              <p>Start your culinary journey by creating your first recipe.</p>
              <Link href="/add" className={styles.createButton}>
                 Create Recipe
              </Link>
            </>
          )}
          {activeTab === 'shared' && (
            <>
              <h3>No shared recipes</h3>
              <p>When friends give you edit access to their recipes, they will appear here.</p>
            </>
          )}
          {activeTab === 'gallery' && (
            <>
              <h3>No gallery contributions</h3>
              <p>Add photos to recipes you've cooked to see them here.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
