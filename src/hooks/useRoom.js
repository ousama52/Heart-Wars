import { useEffect, useRef, useState, useCallback } from 'react'
import {
  subscribe,
  joinRoom,
  setReady as rtdbSetReady,
  setRematch as rtdbSetRematch,
  startCountdown,
  goActive,
  doRematch,
  resetToWaiting,
} from '../lib/rtdb'
import { computeHostUid, COUNTDOWN_MS } from '../game/constants'

/**
 * Lightweight, low-frequency room state for the React screens (lobby / routing)
 * plus host-driven match-flow transitions. High-frequency combat data
 * (positions, projectiles, potions) is handled separately inside Phaser.
 */
export function useRoom(user, displayName) {
  const uid = user?.uid
  const [status, setStatus] = useState(null)
  const [winnerUid, setWinnerUid] = useState(null)
  const [countdownStartAt, setCountdownStartAt] = useState(null)
  const [presence, setPresence] = useState({})

  // Join presence once authenticated.
  useEffect(() => {
    if (!uid) return
    joinRoom(uid, displayName)
  }, [uid, displayName])

  // Subscribe to the low-frequency fields.
  useEffect(() => {
    if (!uid) return
    const unsubs = [
      subscribe('status', (v) => setStatus(v ?? 'waiting')),
      subscribe('winnerUid', setWinnerUid),
      subscribe('countdownStartAt', setCountdownStartAt),
      subscribe('presence', (v) => setPresence(v || {})),
    ]
    return () => unsubs.forEach((u) => u())
  }, [uid])

  const hostUid = computeHostUid(presence)
  const isHost = !!uid && hostUid === uid
  const connectedUids = Object.entries(presence)
    .filter(([, p]) => p && p.connected)
    .map(([id]) => id)
  const guestUid = connectedUids.find((id) => id !== hostUid) || null
  const otherUid = connectedUids.find((id) => id !== uid) || null

  const me = presence[uid] || null
  const other = otherUid ? presence[otherUid] : null

  const bothConnected = !!hostUid && !!guestUid
  const bothReady = bothConnected && !!me?.ready && !!other?.ready
  const bothRematch = bothConnected && !!me?.rematch && !!other?.rematch

  // HOST: once both are ready in the lobby, start the countdown.
  useEffect(() => {
    if (!isHost) return
    if (status === 'waiting' && bothReady) {
      startCountdown(hostUid, guestUid)
    }
  }, [isHost, status, bothReady, hostUid, guestUid])

  // HOST: after the countdown elapses, go live.
  useEffect(() => {
    if (!isHost || status !== 'countdown' || !countdownStartAt) return
    const remaining = countdownStartAt + COUNTDOWN_MS - Date.now()
    const t = setTimeout(() => goActive(), Math.max(0, remaining))
    return () => clearTimeout(t)
  }, [isHost, status, countdownStartAt])

  // HOST: both players hit "rematch" on the result screen -> restart.
  useEffect(() => {
    if (!isHost) return
    if (status === 'match_over' && bothRematch) {
      doRematch(hostUid, guestUid)
    }
  }, [isHost, status, bothRematch, hostUid, guestUid])

  const setReady = useCallback((v) => uid && rtdbSetReady(uid, v), [uid])
  const setRematch = useCallback((v) => uid && rtdbSetRematch(uid, v), [uid])
  const backToLobby = useCallback(
    () => resetToWaiting(connectedUids),
    [connectedUids.join(',')] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return {
    status: status ?? 'waiting',
    winnerUid,
    countdownStartAt,
    presence,
    uid,
    me,
    other,
    otherUid,
    hostUid,
    guestUid,
    isHost,
    bothConnected,
    bothReady,
    setReady,
    setRematch,
    backToLobby,
  }
}
