import { useAuth } from './hooks/useAuth'
import { useRoom } from './hooks/useRoom'
import { firebaseReady, missingConfig } from './lib/firebase'
import Login from './pages/Login'
import Lobby from './pages/Lobby'
import GameContainer from './pages/GameContainer'
import Attribution from './pages/Attribution'

export default function App() {
  const authApi = useAuth()
  const { user, displayName, loading } = authApi

  if (!firebaseReady) {
    return <ConfigNotice />
  }

  if (loading) {
    return <Splash text="Loading Heart Wars…" />
  }

  if (!user) {
    return <Login authApi={authApi} />
  }

  return <AuthedApp user={user} displayName={displayName} authApi={authApi} />
}

function AuthedApp({ user, displayName, authApi }) {
  const room = useRoom(user, displayName)
  const inGame = room.status !== 'waiting'

  return (
    <div className="relative h-full w-full">
      {inGame ? (
        <GameContainer user={user} displayName={displayName} room={room} />
      ) : (
        <Lobby user={user} displayName={displayName} room={room} authApi={authApi} />
      )}
      <Attribution />
    </div>
  )
}

function Splash({ text }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#1a0a14]">
      <div className="animate-pulse text-2xl font-semibold text-pink-300">
        💗 {text}
      </div>
    </div>
  )
}

function ConfigNotice() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#2a0f1f] to-[#12060d] p-4">
      <div className="max-w-lg rounded-2xl border border-pink-500/20 bg-black/30 p-8 text-center shadow-2xl backdrop-blur">
        <div className="text-5xl">💘</div>
        <h1 className="mt-3 text-2xl font-black text-pink-200">
          Heart Wars needs Firebase
        </h1>
        <p className="mt-3 text-sm text-pink-200/70">
          The app can't find its Firebase configuration. Copy{' '}
          <code className="rounded bg-black/40 px-1">.env.example</code> to{' '}
          <code className="rounded bg-black/40 px-1">.env</code>, fill in your
          project values, and restart the dev server.
        </p>
        {missingConfig.length > 0 && (
          <p className="mt-4 text-xs text-pink-300/50">
            Missing: {missingConfig.join(', ')}
          </p>
        )}
        <p className="mt-4 text-xs text-pink-300/40">
          See <b>README.md</b> for the full Firebase + Netlify setup steps.
        </p>
      </div>
    </div>
  )
}
