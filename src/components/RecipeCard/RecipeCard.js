'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './RecipeCard.module.css';

export default function RecipeCard({ recipe }) {
  const router = useRouter();
  // Using a placeholder image if none provided or for mock data
  const imgSrc = recipe.image && recipe.image.startsWith('/') ? recipe.image : '/placeholder.jpg';

  const handleCardClick = (e) => {
    // Prevent navigation if clicking buttons/links inside
    if (e.target.closest('a') || e.target.closest('button')) return;
    router.push(`/recipes/${recipe.id}`);
  };

  return (
    <div onClick={handleCardClick} className={styles.card} style={{cursor:'pointer'}}>
      <div className={styles.imageWrapper}>
        <div style={{width: '100%', height: '100%', background: '#ffcc80', overflow:'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e65100'}}>
             {recipe.image ? (
                 <img src={recipe.image} alt={recipe.title} style={{width:'100%', height:'100%', objectFit:'cover'}} />
             ) : (
                 <span style={{padding:'1rem', textAlign:'center'}}>{recipe.category || 'Recipe'}</span>
             )}
        </div>
      </div>
      <div className={styles.content}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
            <h3 className={styles.title}>{recipe.title}</h3>
            <div style={{display:'flex', gap:'0.5rem', alignItems:'center'}}>
                <span className={styles.tag}>{recipe.time || recipe.cookTime}</span>
                <Link 
                    href={`/recipes/${recipe.id}?edit=true`} 
                    className={styles.editBtn} 
                    onClick={(e) => e.stopPropagation()}
                >
                    ✏️
                </Link>
            </div>
        </div>
        <p className={styles.description}>{recipe.description}</p>
        <div style={{display:'flex', flexWrap:'wrap', gap:'0.25rem', marginBottom:'1rem'}}>
           {(recipe.tags || []).slice(0, 3).map(tag => (
               <span key={tag} className={styles.tag}>{tag}</span>
           ))}
           {(recipe.tags || []).length > 3 && <span style={{fontSize:'0.8rem', color:'var(--accent)'}}>+{recipe.tags.length - 3}</span>}
        </div>
        <div className={styles.meta}>
          <span>{recipe.servings} Servings</span>
          <span>{recipe.difficulty}</span>
        </div>
      </div>
    </div>
  );
}
