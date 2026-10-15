import { useRef } from 'react'
import {
  subscribe,
  subscribeServerOffset,
  writePlayer,
  damageSelf,
  healSelf,
  spawnProjectile,
  removeProjectile,
  spawnNova,
  removeNova,
  spawnPotion,
  deactivatePotion,
  grabPotion,
  writeCooldown,
  endMatch,
  setRematch,
  resetToWaiting,
} from '../lib/rtdb'
import { POSITION_SYNC_MS } from '../game/constants'

/**
 * Bridges Firebase RTDB <-> Phaser. A single instance is created per game
 * mount and handed to the Phaser scenes via the game registry. It owns all
 * high-frequency combat I/O (positions, projectiles, novas, potions) and
 * exposes a clock synced to Firebase's server time.
 *
 * `ctx` is a live, mutable object (uid / otherUid / isHost / names) kept up to
 * date by GameContainer, so the sync always sees the current room roles.
 */
export class GameSync {
  constructor(ctx) {
    this.ctx = ctx
    this.serverOffset = 0
    this.winnerUid = null
    this._lastWrite = 0
    this._unsubs = [
      subscribeServerOffset((off) => (this.serverOffset = off)),
      subscribe('winnerUid', (v) => (this.winnerUid = v)),
    ]
  }

  /** Server-synced clock so both clients agree on projectile timelines. */
  now() {
    return Date.now() + this.serverOffset
  }

  getWinnerUid() {
    return this.winnerUid
  }

  // ---- subscriptions used by Phaser scenes -------------------------------
  onPlayers(cb) {
    return subscribe('players', cb)
  }
  onProjectiles(cb) {
    return subscribe('projectiles', cb)
  }
  onNovas(cb) {
    return subscribe('novas', cb)
  }
  onPotions(cb) {
    return subscribe('potions', cb)
  }
  onStatus(cb) {
    return subscribe('status', cb)
  }
  onCountdown(cb) {
    return subscribe('countdownStartAt', cb)
  }
  onWinner(cb) {
    return subscribe('winnerUid', cb)
  }

  // ---- writes ------------------------------------------------------------
  writePlayerThrottled(data) {
    const t = this.now()
    if (t - this._lastWrite < POSITION_SYNC_MS) return
    this._lastWrite = t
    writePlayer(this.ctx.uid, data)
  }

  damageSelf(amount) {
    return damageSelf(this.ctx.uid, amount)
  }
  healSelf(amount) {
    return healSelf(this.ctx.uid, amount)
  }

  spawnProjectile(data) {
    return spawnProjectile(data)
  }
  removeProjectile(id) {
    return removeProjectile(id)
  }

  spawnNova(data) {
    return spawnNova(data)
  }
  removeNova(id) {
    return removeNova(id)
  }

  spawnPotion(spotId, type, expiresAt) {
    return spawnPotion(spotId, type, expiresAt)
  }
  deactivatePotion(spotId) {
    return deactivatePotion(spotId)
  }
  grabPotion(spotId) {
    return grabPotion(spotId)
  }

  writeCooldown(spellId, expiresAt) {
    return writeCooldown(this.ctx.uid, spellId, expiresAt)
  }

  endMatch(winnerUid) {
    return endMatch(winnerUid)
  }

  setRematch(v) {
    return setRematch(this.ctx.uid, v)
  }

  backToLobby() {
    const uids = [this.ctx.uid, this.ctx.otherUid].filter(Boolean)
    return resetToWaiting(uids)
  }

  destroy() {
    this._unsubs.forEach((u) => u && u())
    this._unsubs = []
  }
}

/**
 * Returns a stable, mutable ctx ref kept up to date with the latest room roles
 * and names. GameContainer owns the actual GameSync instance (created and
 * destroyed alongside the Phaser game) so the sync lifecycle exactly matches
 * the canvas — StrictMode-safe, no orphaned subscriptions.
 */
export function useGameSync(roomInfo) {
  const ctxRef = useRef({})
  // Mutate in place so any holder of this object (Phaser scenes) sees updates.
  Object.assign(ctxRef.current, roomInfo)
  return ctxRef
}
