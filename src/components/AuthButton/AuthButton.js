'use client'

import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './AuthButton.module.css'

export default function AuthButton({ user }) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  if (user) {
    return (
      <div className={styles.userContainer}>
        <span className={styles.email}>{user.email}</span>
        <button onClick={handleSignOut} className={styles.button}>
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <Link href="/login" className={styles.button}>
      Sign In
    </Link>
  )
}
