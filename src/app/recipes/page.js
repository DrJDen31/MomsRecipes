'use client';
import { useState, useMemo } from 'react';
import RecipeCard from '@/components/RecipeCard/RecipeCard';
import recipes from '@/data/recipes.json';
import { useTags } from '@/context/TagContext';
import styles from './page.module.css';

export default function RecipeListing() {
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const { categories } = useTags();

  // Flatten all available tags from data + constants for a "quick" view or use categories
  // For the filter UI, we'll show categories.
  
  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      const matchesSearch = recipe.title.toLowerCase().includes(search.toLowerCase()) ||
                          recipe.description.toLowerCase().includes(search.toLowerCase());
      
      const recipeTags = recipe.tags || [];
      // AND logic: Recipe must contain ALL selected tags
      // OR logic: Recipe must contain AT LEAST ONE selected tag?
      // Usually "AND" is stricter, "OR" is easier. Let's do "AND" for Drill-down, or "OR" if that's standard.
      // Let's go with "EVERY selected tag must be in recipe" (AND)
      const matchesTags = selectedTags.length === 0 || selectedTags.every(t => recipeTags.includes(t) || recipe.category === t);
      
      return matchesSearch && matchesTags;
    });
  }, [search, selectedTags]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>All Recipes</h1>
        <div className={styles.controls}>
          <input
            type="text"
            placeholder="Search for lasagna, apple pie..."
            className={styles.searchBar}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          
          <div className={styles.filters}>
            {Object.entries(categories).map(([cat, tags]) => (
                <div key={cat} className={styles.filterGroup}>
                    <span className={styles.filterLabel}>{cat}:</span>
                    <div className={styles.filterOptions}>
                        {tags.map(tag => (
                            <button
                                key={tag}
                                className={`${styles.categoryBtn} ${selectedTags.includes(tag) ? styles.active : ''}`}
                                onClick={() => toggleTag(tag)}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
          </div>
          
          {selectedTags.length > 0 && (
             <button onClick={() => setSelectedTags([])} style={{marginTop:'1rem', fontSize:'0.9rem', textDecoration:'underline', color:'var(--primary)'}}>
                Clear Filters
             </button>
          )}
        </div>
      </div>

      {filteredRecipes.length > 0 ? (
        <div className={styles.grid}>
          {filteredRecipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <p>No recipes found matching your criteria. Time to ask Mom for more?</p>
        </div>
      )}
    </div>
  );
}
