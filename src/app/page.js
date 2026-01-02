import Hero from '@/components/Hero/Hero';
import RecipeCard from '@/components/RecipeCard/RecipeCard';
import recipes from '@/data/recipes.json';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Hero />
      
      <section className={styles.featured}>
        <h2 className={styles.sectionTitle}>Featured from Mom's Kitchen</h2>
        <div className={styles.grid}>
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </section>
    </div>
  );
}
