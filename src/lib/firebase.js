import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

// All values come from Vite env vars — never hardcode them.
// See .env.example for the required variable names.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Detect an unconfigured environment so the app can show a helpful setup
// screen instead of crashing on getAuth()/getDatabase() with bad config.
export const missingConfig = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k)
export const firebaseReady = missingConfig.length === 0

let auth = null
let db = null

if (firebaseReady) {
  const app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getDatabase(app)
} else {
  // eslint-disable-next-line no-console
  console.warn(
    `[Heart Wars] Missing Firebase config values: ${missingConfig.join(', ')}. ` +
      'Copy .env.example to .env and fill in your project settings.'
  )
}

export { auth, db }

// One hardcoded room — only two users will ever exist.
export const ROOM_ID = 'room1'
export const roomPath = (sub = '') => `rooms/${ROOM_ID}${sub ? '/' + sub : ''}`
