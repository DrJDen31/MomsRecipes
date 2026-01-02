'use client';
import Link from 'next/link';
import { useTags } from '@/context/TagContext';
import TagManager from '@/components/TagManager/TagManager';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { openManager } = useTags();

  return (
    <>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          Mom's<span>Recipes</span>
        </Link>
        <div className={styles.links}>
          <Link href="/" className={styles.link}>Home</Link>
          <Link href="/recipes" className={styles.link}>All Recipes</Link>
          <Link href="/add" className={styles.link}>Add Recipe</Link>
          <button className={styles.link} onClick={openManager}>Tags</button>
        </div>
      </nav>
      <TagManager />
    </>
  );
}
