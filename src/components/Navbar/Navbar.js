'use client';
import Link from 'next/link';
import AuthButton from '../AuthButton/AuthButton';
import styles from './Navbar.module.css';

export default function Navbar({ user }) {

  return (
    <>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          Mom's<span>Recipes</span>
        </Link>
        
        <div className={styles.centerLinks}>
          <Link href="/" className={styles.link}>Home</Link>
          <Link href="/recipes" className={styles.link}>All Recipes</Link>
          <Link href="/add" className={styles.link}>Add Recipe</Link>
          <Link href="/tags" className={styles.link}>Tags</Link>
        </div>

        <div className={styles.authSection}>
          <AuthButton user={user} />
        </div>
      </nav>
    </>
  );
}
