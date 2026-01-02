'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toggleFavorite } from '@/app/actions';
import { useTags } from '@/context/TagContext';
import { TAG_CATEGORIES } from '@/lib/constants';
import styles from './RecipeCard.module.css';

export default function RecipeCard({ recipe, searchQuery = '', selectedTags = [] }) {
  const router = useRouter();
  const { userTags } = useTags();
  
  // Flatten platform tags
  // Note: Optimally this should be in a global context or hook to avoid recalculation per card, 
  // but for now performance is likely fine.
  const allPlatformTags = new Set(Object.values(TAG_CATEGORIES).flat());

  const displayRecipe = {
      ...recipe,
      prepTime: recipe.prep_time || recipe.prepTime,
      cookTime: recipe.cook_time || recipe.cookTime,
      time: recipe.time || recipe.cook_time || recipe.cookTime
  };

  const [isFavorited, setIsFavorited] = useState(recipe.is_favorited || false);
  const [favCount, setFavCount] = useState(recipe.favorite_count || 0);

  // Sync state with props when parent re-renders (e.g. after router.refresh())
  useEffect(() => {
    setIsFavorited(recipe.is_favorited || false);
    setFavCount(recipe.favorite_count || 0);
  }, [recipe.is_favorited, recipe.favorite_count]);

  const handleFavorite = async (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      // Optimistic update
      const newStatus = !isFavorited;
      setIsFavorited(newStatus);
      setFavCount(prev => newStatus ? prev + 1 : prev - 1);

      const res = await toggleFavorite(recipe.id);
      if (!res.success) {
          // Revert if failed (e.g. not logged in)
          setIsFavorited(!newStatus);
          setFavCount(prev => newStatus ? prev - 1 : prev + 1);
          if (res.error === 'Must be logged in') {
              alert("Please login to save favorites!");
              router.push('/login');
          }
      } else {
        router.refresh(); // Refresh to update home lists if needed
      }
  };

  const handleCardClick = (e) => {
    if (e.target.closest('a') || e.target.closest('button')) return;
    router.push(`/recipes/${recipe.id}`);
  };

  // Helper to highlight text
  const highlightText = (text) => {
      if (!searchQuery || !text) return text;
      
      const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
      return parts.map((part, i) => 
        part.toLowerCase() === searchQuery.toLowerCase() ? (
            <span key={i} style={{ backgroundColor: 'rgba(230, 81, 0, 0.3)', borderRadius:'2px' }}>{part}</span>
        ) : (
            part
        )
      );
  };

  return (
    <div onClick={handleCardClick} className={styles.card} style={{cursor:'pointer', position:'relative'}}>
      <div className={styles.imageWrapper}>
        <div style={{width: '100%', height: '100%', background: '#ffcc80', overflow:'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e65100'}}>
             {displayRecipe.image ? (
                 <img src={displayRecipe.image} alt={displayRecipe.title} style={{width:'100%', height:'100%', objectFit:'cover'}} />
             ) : (
                 <span style={{padding:'1rem', textAlign:'center'}}>{displayRecipe.category || 'Recipe'}</span>
             )}
        </div>

        {/* Search Match Overlay */}
        {selectedTags.length > 0 && (() => {
            const matchedTags = (recipe.tags || []).filter(t => selectedTags.includes(t));
            if (matchedTags.length === 0) return null;

            return (
                <div 
                    className="match-badge"
                    style={{
                        position: 'absolute', top: '10px', left: '10px', zIndex: 10,
                        background: 'var(--primary)', padding: '0.3rem 0.8rem', borderRadius: '20px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '0.85rem', fontWeight: '600',
                        color: 'white',
                        cursor: 'default', maxWidth: '80%'
                    }}
                    title={matchedTags.join(', ')} // Native tooltip fallback
                >
                    <div style={{display:'flex', alignItems:'center', gap:'0.3rem'}}>
                         <span>{matchedTags[0]}</span>
                         {matchedTags.length > 1 && (
                             <span style={{background:'white', color:'var(--primary)', borderRadius:'10px', padding:'0.1rem 0.4rem', fontSize:'0.75rem'}}>
                                 +{matchedTags.length - 1} more
                             </span>
                         )}
                    </div>
                </div>
            );
        })()}
      </div>
      
      {/* Heart Button */}
      <button 
        onClick={handleFavorite}
        style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'white',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            fontSize: '1.2rem',
            zIndex: 10
        }}
        title={isFavorited ? "Unfavorite" : "Add to Favorites"}
      >
        {isFavorited ? '❤️' : '🤍'}
      </button>

      <div className={styles.content}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
            <h3 className={styles.title}>{highlightText(displayRecipe.title)}</h3>
            <div style={{display:'flex', gap:'0.5rem', alignItems:'center'}}>
                <span className={styles.tag}>{displayRecipe.time}</span>
            </div>
        </div>
        
        {/* Fav Count */}
        <div style={{marginBottom:'0.5rem', fontSize:'0.85rem', color:'var(--accent)', display:'flex', alignItems:'center', gap:'0.25rem'}}>
            <span>❤️ {favCount} Favorites</span>
        </div>

        <p className={styles.description}>{highlightText(displayRecipe.description)}</p>
        <div style={{display:'flex', flexWrap:'wrap', gap:'0.25rem', marginBottom:'1rem'}}>
           {(displayRecipe.tags || []).slice(0, 3).map(tag => {
               const userTag = userTags.find(t => t.name === tag);
               const isOwned = !!userTag; 
               const isPlatform = allPlatformTags.has(tag);
               const isSelected = selectedTags.includes(tag);
               
               // Resolve category for tooltip
               let category = userTag ? userTag.category : 'Platform';
               if (!userTag) {
                   for (const [cat, tags] of Object.entries(TAG_CATEGORIES)) {
                       if (tags.includes(tag)) {
                           category = cat;
                           break;
                       }
                   }
               }

               return (
                   <span 
                        key={tag} 
                        className={styles.tag}
                        title={`${category}: ${tag}`} // Tooltip: "Category: Tag"
                        style={{
                            border: isOwned ? '1px solid var(--primary)' : '1px solid transparent', 
                            backgroundColor: isSelected ? 'rgba(230, 81, 0, 0.15)' : undefined, // Highlight selected tags
                            display: 'flex', alignItems: 'center', gap: '0.2rem',
                            padding: '0.2rem 0.6rem', cursor: 'default'
                        }}
                    >
                       <span style={{
                           fontSize: '0.7rem', 
                           color: 'var(--primary)', 
                           lineHeight: 0 
                        }}>
                           {isPlatform ? '●' : '★'}
                       </span>
                       {tag}
                   </span>
               );
           })}
           {(displayRecipe.tags || []).length > 3 && <span style={{fontSize:'0.8rem', color:'var(--accent)'}}>+{displayRecipe.tags.length - 3}</span>}
        </div>
        <div className={styles.meta}>
          <span>{displayRecipe.servings} Servings</span>
          <span>{displayRecipe.difficulty}</span>
        </div>
      </div>
    </div>
  );
}
