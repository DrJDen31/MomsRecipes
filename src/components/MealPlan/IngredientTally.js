'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react';
import styles from './IngredientTally.module.css';

export default function IngredientTally({ weekMeals }) {
  const [isOpen, setIsOpen] = useState(true);

  // Calculate totals
  const ingredients = useMemo(() => {
    const tally = {};

    Object.values(weekMeals).flat().forEach(meal => {
      // Only process meals with linked recipes
      if (meal.recipe_id && meal.recipes) {
        let recipeIngredients = meal.recipes.ingredients;
        
        // Handle case where ingredients might be a string (Supabase sometimes returns JSONB as string if not typed?)
        if (typeof recipeIngredients === 'string') {
            try { recipeIngredients = JSON.parse(recipeIngredients); } catch(e) {}
        }

        if (Array.isArray(recipeIngredients) && recipeIngredients.length > 0) {
            const recipe = meal.recipes;
            const scale = (Number(meal.servings) || 1) / (Number(recipe.servings) || 1);

            recipeIngredients.forEach(ing => {
                // The JSON structure uses 'item' for the name, but we handle 'name' as fallback
                const name = ing.item || ing.name;
                if (!name) return;

                const key = `${name.toLowerCase()}_${ing.unit}`;
                
                if (!tally[key]) {
                    tally[key] = {
                    name: name,
                    quantity: 0,
                    unit: ing.unit
                    };
                }
                // Use 'amount' or 'quantity' (handle both just in case)
                const amt = Number(ing.amount) || Number(ing.quantity) || 0;
                tally[key].quantity += amt * scale;
            });
        }
      }
    });

    return Object.values(tally).sort((a, b) => a.name.localeCompare(b.name));
  }, [weekMeals]);

  // Debug log
  console.log('IngredientTally weekMeals:', weekMeals);
  console.log('Calculated ingredients:', ingredients);

  if (!ingredients || ingredients.length === 0) {
      return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.title}>
                    <ShoppingCart size={20} />
                    <span>Shopping List</span>
                </div>
            </div>
            <div style={{padding:'1rem', color:'#888', fontStyle:'italic'}}>
                No ingredients found. Add recipes to your plan to see items here.
            </div>
        </div>
      );
  }

  return (
    <div className={styles.container}>
      <button 
        className={styles.header}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.title}>
          <ShoppingCart size={20} />
          <span>Shopping List ({ingredients.length} items)</span>
        </div>
        {isOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
      </button>

      {isOpen && (
        <div className={styles.list}>
          {ingredients.map((item, idx) => (
            <div key={idx} className={styles.item}>
              <span className={styles.itemName}>{item.name}</span>
              <span className={styles.itemQty}>
                {Math.round(item.quantity * 100) / 100} {item.unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
