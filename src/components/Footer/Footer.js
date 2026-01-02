import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p>
        Made with <span className={styles.heart}>♥</span>
      </p>
    </footer>
  );
}
