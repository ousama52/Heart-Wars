import { SPELL_LIST } from '../game/entities/spells.config'

export default function Lobby({ displayName, room, authApi }) {
  const { me, other, otherUid, isHost, setReady, backToLobby } = room
  const iAmReady = !!me?.ready
  const otherReady = !!other?.ready
  const otherName = other?.name || 'Waiting for opponent…'
  const otherHere = !!otherUid

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#2a0f1f] to-[#12060d] p-4">
      <div className="w-full max-w-lg rounded-2xl border border-pink-500/20 bg-black/30 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-pink-200">💘 Lobby</h1>
            <p className="text-sm text-pink-300/60">
              Signed in as <span className="font-semibold">{displayName}</span>
              {isHost && <span className="ml-1 text-pink-400/70">(host)</span>}
            </p>
          </div>
          <button
            onClick={authApi.logout}
            className="rounded-lg border border-pink-500/20 px-3 py-1.5 text-sm text-pink-200/80 transition hover:bg-pink-500/10"
          >
            Log out
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <PlayerCard name={displayName} ready={iAmReady} you />
          <PlayerCard name={otherName} ready={otherReady} present={otherHere} />
        </div>

        <button
          onClick={() => setReady(!iAmReady)}
          className={`w-full rounded-lg px-4 py-3 text-lg font-bold transition ${
            iAmReady
              ? 'bg-emerald-500/80 text-white hover:bg-emerald-500'
              : 'bg-pink-500 text-white hover:bg-pink-400'
          }`}
        >
          {iAmReady ? '✓ Ready — waiting for opponent' : 'Ready up'}
        </button>

        {iAmReady && otherReady && (
          <p className="mt-3 animate-pulse text-center text-sm text-emerald-300">
            Both ready — starting…
          </p>
        )}
        {!otherHere && (
          <p className="mt-3 text-center text-sm text-pink-300/50">
            Your opponent isn't online yet. The match starts once you're both
            ready.
          </p>
        )}

        <details className="mt-6 rounded-lg border border-pink-500/10 bg-black/20 p-4 text-sm text-pink-200/70">
          <summary className="cursor-pointer font-semibold text-pink-200">
            How to play
          </summary>
          <ul className="mt-3 space-y-1">
            <li>
              <b>Move:</b> WASD or arrow keys
            </li>
            <li>
              <b>Fire heart:</b> aim with mouse, left-click
            </li>
            {SPELL_LIST.map((s) => (
              <li key={s.id}>
                <b>
                  [{s.key}] {s.icon} {s.name}:
                </b>{' '}
                {s.desc}
              </li>
            ))}
            <li>
              <b>Potions</b> spawn in the arena — walk over them to grab.
            </li>
          </ul>
        </details>

        <button
          onClick={backToLobby}
          className="mt-4 w-full text-center text-xs text-pink-300/40 hover:text-pink-300/70"
        >
          Reset match state (recover if stuck)
        </button>
      </div>
    </div>
  )
}

function PlayerCard({ name, ready, you, present = true }) {
  return (
    <div
      className={`rounded-xl border p-4 text-center transition ${
        ready
          ? 'border-emerald-400/40 bg-emerald-500/10'
          : 'border-pink-500/20 bg-black/20'
      } ${!present ? 'opacity-50' : ''}`}
    >
      <div className="text-3xl">{ready ? '💖' : '🤍'}</div>
      <div className="mt-1 truncate font-semibold text-pink-100">
        {name} {you && <span className="text-pink-400/70">(you)</span>}
      </div>
      <div
        className={`mt-1 text-xs ${
          ready ? 'text-emerald-300' : 'text-pink-300/50'
        }`}
      >
        {present ? (ready ? 'Ready' : 'Not ready') : 'Offline'}
      </div>
    </div>
  )
}
