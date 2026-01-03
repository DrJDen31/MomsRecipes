'use client'

import styles from './auth-error.module.css'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ErrorContent() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')
    
    // Default message if no specific error is provided
    const errorMessage = error || 'Invalid or expired authentication code.'

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>Authentication Error</h1>
                <p className={styles.description}>
                    There was a problem signing you in. This link may have expired or already been used.
                </p>
                
                <div className={styles.errorBox}>
                    <span className={styles.errorLabel}>Error Details</span>
                    <p className={styles.errorMessage}>{errorMessage}</p>
                </div>

                <Link href="/login" className={styles.button}>
                    Return to Login
                </Link>
            </div>
        </div>
    )
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={<div className={styles.container}>Loading...</div>}>
            <ErrorContent />
        </Suspense>
    )
}
