'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import styles from './WeeklyCalendar.module.css';
import AddToPlanModal from './AddToPlanModal';

export default function WeeklyCalendar({ userId, currentDate, setCurrentDate, weekMeals, loading, onRefresh, onDelete }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Helper to get start/end of week (UI only now)
  const getWeekRange = (date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Sunday start
    
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    return { start, end };
  };

  const { start, end } = getWeekRange(currentDate);

  const changeWeek = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (offset * 7));
    setCurrentDate(newDate);
  };

  const handleAddClick = (date) => {
      setSelectedDate(date);
      setModalOpen(true);
  };

  const [deleteConfirmation, setDeleteConfirmation] = useState(null); // ID of meal to delete

  const confirmDelete = () => {
    if (deleteConfirmation) {
        onDelete(deleteConfirmation);
        setDeleteConfirmation(null);
    }
  };

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.controls}>
        <button onClick={() => changeWeek(-1)} className={styles.navBtn}><ChevronLeft /></button>
        <div className={styles.dateDisplay}>
          <CalendarIcon size={20} />
          <span>
            {start.toLocaleDateString()} - {end.toLocaleDateString()}
          </span>
        </div>
        <button onClick={() => changeWeek(1)} className={styles.navBtn}><ChevronRight /></button>
      </div>

      <div className={styles.grid}>
        {daysOfWeek.map((dayName, index) => {
          const dayDate = new Date(start);
          dayDate.setDate(start.getDate() + index);
          // Use format YYYY-MM-DD locals-safe
          const year = dayDate.getFullYear();
          const month = String(dayDate.getMonth() + 1).padStart(2, '0');
          const day = String(dayDate.getDate()).padStart(2, '0');
          const dateKey = `${year}-${month}-${day}`;
          const meals = weekMeals[dateKey] || [];
          const isToday = new Date().toDateString() === dayDate.toDateString();

          return (
            <div key={dayName} className={`${styles.dayColumn} ${isToday ? styles.today : ''}`}>
              <div className={styles.dayHeader}>
                <span className={styles.dayName}>{dayName}</span>
                <span className={styles.dayDate}>{dayDate.getDate()}</span>
              </div>
              <div className={styles.mealList}>
                {loading ? (
                  <div className={styles.skeletonItem}></div>
                ) : (
                  meals.map(meal => (
                    <div key={meal.id} className={styles.mealCard}>
                      {meal.recipes?.image && (
                        <div 
                            style={{
                                width:'100%', height:'80px', 
                                backgroundImage:`url(${meal.recipes.image})`,
                                backgroundSize:'cover', backgroundPosition:'center',
                                borderRadius:'4px 4px 0 0',
                                marginBottom:'0.5rem'
                            }}
                        />
                      )}
                      <div style={{padding:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                        <div>
                            <span className={styles.mealTitle}>
                                {meal.recipe_id ? meal.recipes?.title : meal.meal_name}
                            </span>
                            {meal.servings && <div className={styles.servingsBadge}>{meal.servings} serv</div>}
                        </div>
                        <button 
                            className={styles.deleteBtn}
                            onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmation(meal.id);
                            }}
                        >
                            ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <button className={styles.addBtn} onClick={() => handleAddClick(dayDate)}>+ Add</button>
              </div>
            </div>
          );
        })}
      </div>
      
      <AddToPlanModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          date={selectedDate}
          onAdd={onRefresh}
          userId={userId}
      />

      {deleteConfirmation && (
        <div className={styles.confirmationOverlay}>
            <div className={styles.confirmationModal}>
                <h3>Remove Meal?</h3>
                <p>Are you sure you want to remove this meal from your plan?</p>
                <div className={styles.confirmationActions}>
                    <button onClick={() => setDeleteConfirmation(null)} className={styles.cancelBtn}>Cancel</button>
                    <button onClick={confirmDelete} className={styles.confirmDeleteBtn}>Remove</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
