import Link from 'next/link';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <h1 className={styles.title}>
        Secret Ingredients,<br />Shared with Love.
      </h1>
      <p className={styles.subtitle}>
        Welcome to the digital home of Mom's famous recipes. From spicy lasagna to comforting pies, every dish tells a story.
      </p>
      <Link href="/recipes" className={styles.cta}>
        Browse Recipes
      </Link>
    </section>
  );
}
