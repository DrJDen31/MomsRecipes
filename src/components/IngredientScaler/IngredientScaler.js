'use client';
import { useState } from 'react';
import styles from './IngredientScaler.module.css';

export default function IngredientScaler({ 
  initialServings, 
  ingredients, 
  servings, 
  onServingsChange, 
  checkedIngredients = [], 
  onToggleIngredient 
}) {
  // Use internal state if not controlled (fallback)
  const [internalServings, setInternalServings] = useState(initialServings);
  
  const currentServings = servings !== undefined ? servings : internalServings;
  const setServingsState = onServingsChange || setInternalServings;

  const scale = (amount) => {
    if (!amount) return '';
    const scaled = (amount / initialServings) * currentServings;
    return Math.round(scaled * 100) / 100;
  };

  const adjust = (delta) => {
    const newServings = currentServings + delta;
    if (newServings > 0) setServingsState(newServings);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Ingredients</h3>
        <div className={styles.controls}>
          <button className={styles.btn} onClick={() => adjust(-1)}>−</button>
          <span className={styles.servings}>{currentServings} Servings</span>
          <button className={styles.btn} onClick={() => adjust(1)}>+</button>
        </div>
      </div>
      <ul className={styles.list}>
        {ingredients.map((ing, i) => {
          const isChecked = checkedIngredients.includes(i);
          return (
            <li 
                key={i} 
                className={`${styles.item} ${isChecked ? styles.checked : ''}`}
                onClick={() => onToggleIngredient && onToggleIngredient(i)}
                style={{cursor: 'pointer'}}
            >
              <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
                  <div className={styles.checkbox}>
                      {isChecked && '✓'}
                  </div>
                  <span style={{color: 'inherit'}}>
                    {ing.item}
                  </span>
              </div>
              <span className={styles.amount}>
                {scale(ing.amount)} {ing.unit}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
