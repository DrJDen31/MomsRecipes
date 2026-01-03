'use client';
import { useState, useMemo, useEffect } from 'react';
import RecipeCard from '@/components/RecipeCard/RecipeCard';
import { createClient } from '@/utils/supabase/client';
import { useTags } from '@/context/TagContext';
import { TAG_CATEGORIES } from '@/lib/constants';
import styles from './page.module.css';

export default function RecipeListingClient({ initialRecipes = [], favoriteIds = [] }) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Selection state
  const [activeCategory, setActiveCategory] = useState('Meal Type'); // Default category
  const [activeSubCategory, setActiveSubCategory] = useState(null); // For "My Tags" nested navigation
  const [selectedTags, setSelectedTags] = useState([]);
  
  const { categories, userTags } = useTags();

  useEffect(() => {
      setRecipes(initialRecipes);
  }, [initialRecipes]);

  // Inject favorited status into recipes for Card display if needed
  // But RecipeCard might handle its own logic or expecting 'is_favorited'
  // Let's map it.
  const processedRecipes = useMemo(() => {
      return recipes.map(r => ({
          ...r,
          is_favorited: favoriteIds.includes(r.id),
          favorite_count: r.favorites && r.favorites[0] ? r.favorites[0].count : 0
      }));
  }, [recipes, favoriteIds]);

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredRecipes = useMemo(() => {
    return processedRecipes.filter(recipe => {
      const matchText = (text) => text && text.toLowerCase().includes(search.toLowerCase());
      
      const matchesSearch = matchText(recipe.title) || matchText(recipe.description);
      
      const recipeTags = recipe.tags || [];
      // AND logic: matches ALL selected tags
      const matchesTags = selectedTags.length === 0 || selectedTags.every(t => recipeTags.includes(t) || recipe.category === t);
      
      return matchesSearch && matchesTags;
    });
  }, [search, selectedTags, recipes]);

  // Combine categories name list (Platform Only + My Tags)
  const categoryNames = useMemo(() => [...Object.keys(TAG_CATEGORIES), 'My Tags'], []);

  // Get tags for current active category
  // If My Tags: Return list of CATEGORIES if no sub-selected, or tags if sub-selected.
  // Actually, let's separate the lists. 
  
  // Flatten platform tags to check source (Platform vs Custom)
  const allPlatformTags = useMemo(() => {
      return new Set(Object.values(TAG_CATEGORIES).flat());
  }, []);

  // 1. Get Custom Categories belonging to user (filtering out platform tags from this view)
  const myCustomCategories = useMemo(() => {
      // Only consider tags that are NOT in the platform list
      const customOnlyTags = userTags.filter(t => !allPlatformTags.has(t.name));
      const cats = new Set(customOnlyTags.map(t => t.category || 'Custom'));
      return Array.from(cats).sort();
  }, [userTags, allPlatformTags]);

  // Effect to set default sub-category when switching to My Tags
  useEffect(() => {
      if (activeCategory === 'My Tags' && !activeSubCategory && myCustomCategories.length > 0) {
          setActiveSubCategory(myCustomCategories[0]);
      }
  }, [activeCategory, activeSubCategory, myCustomCategories]);

  const visibleTags = useMemo(() => {
      if (activeCategory === 'My Tags') {
          if (!activeSubCategory) return []; // Should have default by effect, but safety
          
          return userTags
            .filter(t => (t.category || 'Custom') === activeSubCategory)
            .filter(t => !allPlatformTags.has(t.name)) // Ensure clean custom list
            .map(t => t.name);
      }
      return TAG_CATEGORIES[activeCategory] || [];
  }, [activeCategory, activeSubCategory, userTags, allPlatformTags]);

  if (loading) {
    return (
        <div className={styles.container} style={{display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh'}}>
            <div className={styles.loader}></div>
        </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {/* Search Bar */}
        <div className={styles.searchWrapper}>
             <input
                type="text"
                placeholder="Search for lasagna, apple pie..."
                className={styles.searchBar}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
        </div>

        <div className={styles.controls}>
          
          {/* Category Pills (Horizontal Scroll) */}
          <div className={styles.categoryScroll} style={{display:'flex', gap:'0.75rem', overflowX:'auto', paddingBottom:'0', marginBottom:'0', scrollbarWidth:'none'}}>
             {categoryNames.map(cat => (
                 <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                        padding: '0.5rem 1.25rem',
                        borderRadius: '20px',
                        border: activeCategory === cat ? '1px solid var(--primary)' : '1px solid var(--card-border)',
                        background: activeCategory === cat ? 'var(--primary)' : 'white',
                        color: activeCategory === cat ? 'white' : 'var(--foreground)',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.95rem',
                        transition: 'all 0.2s',
                        boxShadow: activeCategory === cat ? '0 2px 8px rgba(230,81,0,0.2)' : 'none'
                    }}
                 >
                     {cat}
                 </button>
             ))}
          </div>

          {/* Secondary Level: Sub-Categories (Only for My Tags) */}
          {activeCategory === 'My Tags' && (
              <div className={styles.categoryScroll} style={{display:'flex', gap:'0.75rem', overflowX:'auto', paddingBottom:'0', marginBottom:'0', scrollbarWidth:'none'}}>
                  {myCustomCategories.map(cat => (
                      <button 
                          key={cat}
                          onClick={() => setActiveSubCategory(cat)}
                          style={{
                              padding: '0.4rem 1rem',
                              borderRadius: '15px',
                              border: activeSubCategory === cat ? '1px solid var(--accent)' : '1px solid var(--card-border)',
                              background: activeSubCategory === cat ? 'var(--accent)' : '#f9f9f9',
                              color: activeSubCategory === cat ? 'white' : 'var(--foreground)',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              fontWeight: '500',
                              fontSize: '0.85rem',
                              transition: 'all 0.2s'
                          }}
                      >
                          {cat}
                      </button>
                  ))}
              </div>
          )}

          {/* Tags Area */}
          <div className={styles.tagArea} style={{display:'flex', flexWrap:'wrap', gap:'0.5rem', justifyContent:'center', minHeight:'50px'}}>
              {visibleTags.length === 0 ? (
                  <p style={{fontStyle:'italic', opacity:0.6, fontSize:'0.9rem'}}>
                    {activeCategory === 'My Tags' && myCustomCategories.length === 0 
                        ? "You haven't created any custom tags yet." 
                        : "No tags found."}
                  </p>
              ) : (
                  visibleTags.map(tag => {
                       const isActive = selectedTags.includes(tag);
                       // For visual consistency, even though we filtered types, check map
                       const isPlatform = allPlatformTags.has(tag);
                       
                       return (
                            <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                style={{
                                    padding: '0.4rem 1rem',
                                    borderRadius: '20px',
                                    border: isActive ? '1px solid var(--primary)' : '1px solid var(--card-border)',
                                    background: isActive ? 'rgba(230,81,0,0.1)' : 'white',
                                    color: isActive ? 'var(--primary)' : 'var(--foreground)',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    transition: 'all 0.1s'
                                }}
                            >
                                {tag}
                                {isActive && (
                                    <span style={{fontSize:'0.8em'}}>
                                        {isPlatform ? '●' : '★'}
                                    </span>
                                )}
                            </button>
                       );
                  })
              )}
          </div>
          
          {selectedTags.length > 0 && (
             <div style={{marginTop:'1.5rem', textAlign:'center', display:'flex', gap:'0.5rem', justifyContent:'center', flexWrap:'wrap'}}>
                 {/* Show Active Filters Summary */}
                 {selectedTags.map(tag => (
                     <span key={tag} style={{background:'var(--foreground)', color:'var(--background)', padding:'0.3rem 0.8rem', borderRadius:'15px', fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'0.4rem'}}>
                         {tag}
                         <button onClick={() => toggleTag(tag)} style={{cursor:'pointer', border:'none', background:'none', color:'inherit', fontWeight:'bold'}}>&times;</button>
                     </span>
                 ))}
                 <button onClick={() => setSelectedTags([])} style={{background:'none', border:'none', textDecoration:'underline', color:'var(--primary)', cursor:'pointer', marginLeft:'1rem', fontSize:'0.9rem'}}>
                    Clear All
                 </button>
             </div>
          )}
        </div>
      </div>

      {filteredRecipes.length > 0 ? (
        <div className={styles.grid}>
          {filteredRecipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} searchQuery={search} selectedTags={selectedTags} />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <p>No recipes found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
