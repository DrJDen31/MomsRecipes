'use client';

import { FileText } from 'lucide-react';
import styles from './MealList.module.css';

export default function MealList({ weekMeals }) {
  const dates = Object.keys(weekMeals).sort();
  
  if (dates.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <FileText size={20} />
        <h2>Weekly Menu Summary</h2>
      </div>
      <div className={styles.list}>
        {dates.map(date => {
            const meals = weekMeals[date];
            if(!meals || meals.length === 0) return null;
            
            // Parse YYYY-MM-DD
            const [y, m, d] = date.split('-').map(Number);
            const localDate = new Date(y, m-1, d);
            
            return (
                <div key={date} className={styles.dayGroup}>
                    <h3>{localDate.toLocaleDateString(undefined, {weekday: 'long', month: 'short', day: 'numeric'})}</h3>
                    <ul>
                        {meals.map(meal => {
                            let quantityDisplay = `${meal.servings}x`;
                            if (meal.recipe_id && meal.recipes && meal.recipes.servings) {
                                const ratio = Number(meal.servings) / Number(meal.recipes.servings);
                                quantityDisplay = `${parseFloat(ratio.toFixed(2))}x`;
                            }
                            return (
                                <li key={meal.id} className={styles.mealItem}>
                                    <span className={styles.servings}>{quantityDisplay}</span>
                                    <span>{meal.recipe_id ? meal.recipes?.title : meal.meal_name}</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )
        })}
      </div>
    </div>
  );
}
