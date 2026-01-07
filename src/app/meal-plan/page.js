'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import WeeklyCalendar from '@/components/MealPlan/WeeklyCalendar';
import IngredientTally from '@/components/MealPlan/IngredientTally';
import MealList from '@/components/MealPlan/MealList';
import ExportModal from '@/components/MealPlan/ExportModal';
import styles from './page.module.css';

export default function MealPlanPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekMeals, setWeekMeals] = useState({});
  const [mealsLoading, setMealsLoading] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/login');
        return;
      }
      setUser(user);
      setLoading(false);
    }
    getUser();
  }, [router, supabase]);

  // Fetching logic lifted from WeeklyCalendar
  useEffect(() => {
     if (user) fetchMeals();
  }, [currentDate, user]);

  async function fetchMeals() {
    setMealsLoading(true);
    // Calculate start/end of week
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    const { data, error } = await supabase
      .from('meal_plan_items')
      .select(`
        *,
        recipes (
          id,
          title,
          image,
          servings,
          ingredients
        )
      `)
      .eq('user_id', user.id)
      .gte('date', start.toISOString())
      .lte('date', end.toISOString());

    if (error) {
      console.error('Error fetching meals:', error);
    } else {
      const grouped = {};
      data?.forEach(item => {
        // Parse the YYYY-MM-DD string directly to avoid timezone mess
        const dateKey = item.date; // It comes as string from Supabase usually
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(item);
      });
      setWeekMeals(grouped);
    }
    setMealsLoading(false);
    setMealsLoading(false);
  }

  async function deleteMeal(id) {
    const { error } = await supabase.from('meal_plan_items').delete().eq('id', id);
    if (error) {
        console.error('Error deleting meal:', error);
        alert('Failed to delete meal');
    } else {
        fetchMeals();
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading meal plan...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
          <div>
            <h1>Weekly Meal Plan</h1>
            <p>Plan your meals and track ingredients.</p>
          </div>
          <button 
            onClick={() => setExportModalOpen(true)}
            className={styles.exportBtn}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--background-subtle)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Export
          </button>
        </div>
      </header>
      
      <main className={styles.main}>
        <WeeklyCalendar 
          userId={user.id} 
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          weekMeals={weekMeals}
          loading={mealsLoading}
          onRefresh={fetchMeals}
          onDelete={deleteMeal}
        />
        <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap:'1.5rem', marginTop:'1.5rem'}}>
            <MealList weekMeals={weekMeals} />
            <IngredientTally weekMeals={weekMeals} />
        </div>
      </main>

      <ExportModal 
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        data={weekMeals}
      />
    </div>
  );
}
