import { useEffect, useState, useCallback } from 'react'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from '../lib/firebase'

/**
 * Tracks the current Firebase auth session.
 * Session persists across refresh (Firebase default local persistence).
 */
export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }
    // Safety net: never hang on the splash if auth never resolves.
    const timeout = setTimeout(() => setLoading(false), 5000)
    const unsub = onAuthStateChanged(
      auth,
      (u) => {
        clearTimeout(timeout)
        setUser(u)
        setLoading(false)
      },
      () => {
        clearTimeout(timeout)
        setLoading(false)
      }
    )
    return () => {
      clearTimeout(timeout)
      unsub()
    }
  }, [])

  const login = useCallback(async (email, password) => {
    setError(null)
    if (!auth) {
      setError('Firebase is not configured. See README / .env.example.')
      return false
    }
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return true
    } catch (e) {
      setError(friendlyError(e))
      return false
    }
  }, [])

  const logout = useCallback(() => signOut(auth), [])

  // Prefer the real display name; fall back to the email local-part.
  const displayName =
    user?.displayName || (user?.email ? user.email.split('@')[0] : 'Player')

  return { user, displayName, loading, error, login, logout, setError }
}

function friendlyError(e) {
  const code = e?.code || ''
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Wrong email or password.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.'
    default:
      return e?.message || 'Could not sign in.'
  }
}
