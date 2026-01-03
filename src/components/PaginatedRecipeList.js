'use client';
import { useState } from 'react';
import RecipeCard from '@/components/RecipeCard/RecipeCard';
import styles from '@/app/page.module.css';

export default function PaginatedRecipeList({ recipes = [], pageSize = 3 }) {
  const [startIndex, setStartIndex] = useState(0);

  // Safety check: if recipes shrink, reset index
  if (startIndex > 0 && startIndex >= recipes.length) {
    setStartIndex(0);
  }

  const visibleRecipes = recipes.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(recipes.length / pageSize);
  const currentPage = Math.floor(startIndex / pageSize) + 1;

  const hasNext = startIndex + pageSize < recipes.length;
  const hasPrev = startIndex > 0;

  const handleNext = () => {
    if (hasNext) setStartIndex(prev => prev + pageSize);
  };

  const handlePrev = () => {
    if (hasPrev) setStartIndex(prev => prev - pageSize);
  };

  if (recipes.length === 0) {
      return (
          <p style={{textAlign:'center', fontStyle:'italic', opacity:0.7, marginBottom:'3rem'}}>
              No recipes found for this section yet.
          </p>
      );
  }

  return (
    <>
      <div className={styles.grid}>
        {visibleRecipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
      
      {/* Pagination Controls */}
      {recipes.length > pageSize && (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginTop: '2.5rem'
        }}>
          <button 
            onClick={handlePrev}
            disabled={!hasPrev}
            style={{
                background: hasPrev ? 'var(--card-bg)' : 'transparent',
                border: '1px solid var(--card-border)',
                color: hasPrev ? 'var(--primary)' : 'var(--disabled)', // Assuming a disabled var or grey
                opacity: hasPrev ? 1 : 0.3,
                width: '40px', height: '40px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: hasPrev ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                fontSize: '1.2rem',
                boxShadow: hasPrev ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
            }}
            aria-label="Previous Page"
          >
            ←
          </button>

          <span style={{fontSize:'0.9rem', opacity:0.6, fontVariantNumeric:'tabular-nums'}}>
              {currentPage} / {totalPages}
          </span>

          <button 
            onClick={handleNext}
            disabled={!hasNext}
            style={{
                background: hasNext ? 'var(--card-bg)' : 'transparent',
                border: '1px solid var(--card-border)',
                color: hasNext ? 'var(--primary)' : 'var(--disabled)',
                opacity: hasNext ? 1 : 0.3,
                width: '40px', height: '40px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: hasNext ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                fontSize: '1.2rem',
                boxShadow: hasNext ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
            }}
            aria-label="Next Page"
          >
            →
          </button>
        </div>
      )}
    </>
  );
}
