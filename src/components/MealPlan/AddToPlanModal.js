'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, Search } from 'lucide-react';
import styles from './AddToPlanModal.module.css';

export default function AddToPlanModal({ isOpen, onClose, date, onAdd, userId }) {
  const [mode, setMode] = useState('recipe'); // 'recipe' or 'custom'
  const [searchTerm, setSearchTerm] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [customName, setCustomName] = useState('');
  const [servings, setServings] = useState(1);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();


  useEffect(() => {
    if (isOpen && mode === 'recipe') {
      searchRecipes('');
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (selectedRecipe) {
      setServings(selectedRecipe.servings || 1);
    }
  }, [selectedRecipe]);

  const searchRecipes = async (term) => {
    const { data } = await supabase
      .from('recipes')
      .select('id, title, servings, image')
      .ilike('title', `%${term}%`)
      .limit(10);
    setRecipes(data || []);
  };

  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (isOpen && mode === 'favorites') {
      fetchFavorites();
    }
  }, [isOpen, mode]);

  const fetchFavorites = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('favorites')
      .select(`
        recipes (
          id,
          title,
          servings,
          image
        )
      `)
      .eq('user_id', user.id);
    
    // Flatten the structure
    setFavorites(data?.map(f => f.recipes) || []);
  };

  const handleRecipeSelect = (r) => {
      setSelectedRecipe(r);
      // Automatically switch mode back to recipe context for the form submission if needed, 
      // but simpler to just keep 'mode' as is and reuse selectedRecipe
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Format date as YYYY-MM-DD local
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const mealData = {
      user_id: userId,
      date: dateStr,
      servings: Number(servings),
      meal_name: mode === 'custom' ? customName : selectedRecipe.title,
      recipe_id: (mode === 'recipe' || mode === 'favorites') ? selectedRecipe.id : null,
    };

    const { data, error } = await supabase
      .from('meal_plan_items')
      .insert([mealData])
      .select();

    if (error) {
      console.error('Error adding meal:', JSON.stringify(error, null, 2));
      console.error('Error Code:', error.code);
      console.error('Error Message:', error.message);
      alert('Failed to add meal: ' + error.message);
    } else {
      onAdd();
      onClose();
      // Reset state
      setSelectedRecipe(null);
      setCustomName('');
      setSearchTerm('');
      setMode('recipe');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Add Meal for {date.toLocaleDateString()}</h2>
          <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
        </div>

        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${mode === 'recipe' ? styles.activeTab : ''}`}
            onClick={() => setMode('recipe')}
          >
            Search
          </button>
           <button 
            className={`${styles.tab} ${mode === 'favorites' ? styles.activeTab : ''}`}
            onClick={() => setMode('favorites')}
          >
            Favorites
          </button>
          <button 
            className={`${styles.tab} ${mode === 'custom' ? styles.activeTab : ''}`}
            onClick={() => setMode('custom')}
          >
            Custom
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === 'recipe' && (
            <div className={styles.field}>
              <label>Search Recipe</label>
              <div className={styles.searchBox}>
                <Search size={16} className={styles.searchIcon} />
                <input 
                  type="text" 
                  placeholder="Mac & Cheese..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    searchRecipes(e.target.value);
                  }}
                  className={styles.input}
                />
              </div>
              {searchTerm && (
                <div className={styles.results}>
                  {recipes.map(r => (
                    <div 
                      key={r.id} 
                      className={`${styles.resultItem} ${selectedRecipe?.id === r.id ? styles.selected : ''}`}
                      onClick={() => handleRecipeSelect(r)}
                    >
                      {r.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === 'favorites' && (
             <div className={styles.field}>
                <label>Select from Favorites</label>
                <div className={styles.results} style={{maxHeight:'300px'}}>
                  {favorites.length === 0 && <div style={{padding:'1rem', color:'#888'}}>No favorites found.</div>}
                  {favorites.map(r => (
                    <div 
                      key={r.id} 
                      className={`${styles.resultItem} ${selectedRecipe?.id === r.id ? styles.selected : ''}`}
                      onClick={() => handleRecipeSelect(r)}
                    >
                      {r.title}
                    </div>
                  ))}
                </div>
             </div>
          )}

          {mode === 'custom' && (
            <div className={styles.field}>
              <label>Meal Name</label>
              <input 
                type="text" 
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className={styles.input}
                placeholder="e.g. Leftovers"
              />
            </div>
          )}

          {(selectedRecipe || mode === 'custom') && (
            <>
                 {selectedRecipe && <div className={styles.selection}>Selected: <b>{selectedRecipe.title}</b></div>}
                 <div className={styles.field}>
                    <label>Servings</label>
                    <input 
                    type="number" 
                    min="1"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    className={styles.input}
                    />
                    <span className={styles.hint}>
                    {(mode === 'recipe' || mode === 'favorites') && selectedRecipe 
                        ? `Default: ${selectedRecipe.servings}` 
                        : 'Used for ingredient calculation'}
                    </span>
                </div>
            </>
          )}

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={loading || ((mode === 'recipe' || mode === 'favorites') && !selectedRecipe)}
            >
              {loading ? 'Adding...' : 'Add to Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
