import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createGameConfig } from '../game/config'
import { GameSync, useGameSync } from '../hooks/useGameSync'

/**
 * Mounts the Phaser canvas. The Phaser game + its GameSync are created exactly
 * once (on mount) and torn down on unmount. Room role/name changes flow in
 * through the shared, mutable ctx object without recreating the canvas.
 */
export default function GameContainer({ user, displayName, room }) {
  const parentRef = useRef(null)

  const ctxRef = useGameSync({
    uid: user.uid,
    otherUid: room.otherUid,
    isHost: room.isHost,
    hostUid: room.hostUid,
    guestUid: room.guestUid,
    myName: displayName,
    otherName: room.other?.name || 'Opponent',
  })

  // Build the Phaser game once.
  useEffect(() => {
    const parent = parentRef.current
    const sync = new GameSync(ctxRef.current)
    const game = new Phaser.Game(createGameConfig(parent))
    game.registry.set('sync', sync)
    game.registry.set('ctx', ctxRef.current)

    return () => {
      game.destroy(true)
      sync.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#12060d]">
      <div ref={parentRef} className="h-full w-full" />
    </div>
  )
}
