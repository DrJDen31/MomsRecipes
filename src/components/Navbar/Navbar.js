'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Home, Menu, X } from 'lucide-react';
import AuthButton from '../AuthButton/AuthButton';
import styles from './Navbar.module.css';
import NotificationBell from '../NotificationBell/NotificationBell';

export default function Navbar({ user }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className={styles.nav}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.logo}>
          Mom's<span>Recipes</span>
        </Link>
        <button 
          className={styles.menuToggle} 
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className={`${styles.menuContent} ${isOpen ? styles.open : ''}`}>
        <div className={styles.centerLinks}>
          <Link href="/" className={styles.link} title="Home">
            <Home size={20} />
          </Link>
          <Link href="/recipes" className={styles.link}>All Recipes</Link>
          <Link href="/my-recipes" className={styles.link}>My Recipes</Link>
          <Link href="/add" className={styles.link}>Add Recipe</Link>
          <Link href="/tags" className={styles.link}>Tags</Link>
        </div>

        <div className={styles.authSection}>
          <NotificationBell userId={user?.id} />
          <AuthButton user={user} />
        </div>
      </div>
    </nav>
  );
}
