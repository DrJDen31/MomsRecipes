'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { CalendarPlus, X } from 'lucide-react';
import styles from './AddRecipeToPlanButton.module.css';

export default function AddRecipeToPlanButton({ recipe }) {
  const [isOpen, setIsOpen] = useState(false);
  // Default to today local
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const [date, setDate] = useState(todayStr);
  const [servings, setServings] = useState(recipe.servings || 1);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert('Please login to add to meal plan');
        setLoading(false);
        return;
    }

    const { error } = await supabase
      .from('meal_plan_items')
      .insert([{
        user_id: user.id,
        recipe_id: recipe.id,
        meal_name: recipe.title,
        date: date,
        servings: Number(servings)
      }]);

    if (error) {
      console.error('Error adding to plan:', error);
      alert('Failed to add to plan');
    } else {
      alert('Added to meal plan!');
      setIsOpen(false);
    }
    setLoading(false);
  };

  return (
    <>
      <button 
        className={styles.button}
        onClick={() => setIsOpen(true)}
      >
        <CalendarPlus size={20} />
        Add to Plan
      </button>

      {isOpen && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.header}>
              <h3>Add "{recipe.title}" to components</h3>
              <button onClick={() => setIsOpen(false)} className={styles.closeBtn}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label>Date</label>
                <input 
                  type="date" 
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label>Servings</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.actions}>
                <button type="button" onClick={() => setIsOpen(false)} className={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={loading} className={styles.submitBtn}>
                  {loading ? 'Adding...' : 'Add to Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
