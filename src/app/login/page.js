'use client'

import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'
import styles from './login.module.css'
import { getURL } from '@/utils/url-helpers'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${getURL()}/auth/callback`,
      },
    })

    if (error) {
      setMessage('Error sending magic link: ' + error.message)
    } else {
      setMessage('Magic link sent! Check your email.')
    }
    setLoading(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Sign In</h1>
        <p className={styles.subtitle}>Enter your email to receive a magic link</p>
        
        <form onSubmit={handleLogin} className={styles.form}>
          <input
            className={styles.input}
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
        
        {message && <p className={styles.message}>{message}</p>}
      </div>
    </div>
  )
}
