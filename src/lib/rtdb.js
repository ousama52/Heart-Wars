// Central Realtime Database helpers for the single hardcoded room.
// Match-flow transitions (countdown/active/reset) are driven by the *host*
// (deterministic = smallest connected uid) so exactly one client acts.
import {
  ref,
  onValue,
  set,
  update,
  remove,
  push,
  onDisconnect,
  runTransaction,
} from 'firebase/database'
import { db, roomPath } from './firebase'
import { MAX_HP, SPAWNS, COUNTDOWN_MS } from '../game/constants'

export const r = (sub) => ref(db, roomPath(sub))

// ---- subscriptions --------------------------------------------------------
export function subscribe(sub, cb) {
  return onValue(r(sub), (snap) => cb(snap.val()))
}

/** Clock skew between this client and the Firebase server, in ms. */
export function subscribeServerOffset(cb) {
  return onValue(ref(db, '.info/serverTimeOffset'), (snap) => cb(snap.val() || 0))
}

// ---- presence / lobby -----------------------------------------------------
export async function joinRoom(uid, name) {
  const presRef = r(`presence/${uid}`)
  await update(presRef, { name, connected: true })
  // Clear this player's connected flag if the tab closes / drops.
  onDisconnect(presRef).update({ connected: false, ready: false, rematch: false })
}

export function setReady(uid, ready) {
  return update(r(`presence/${uid}`), { ready })
}

export function setRematch(uid, rematch) {
  return update(r(`presence/${uid}`), { rematch })
}

// ---- match flow (host-driven) --------------------------------------------
function spawnFor(uid, hostUid) {
  const spot = uid === hostUid ? SPAWNS.left : SPAWNS.right
  return { x: spot.x, y: spot.y, angle: uid === hostUid ? 0 : Math.PI, hp: MAX_HP }
}

/** Reset positions + HP for both players and clear all transient combat state. */
export async function initMatch(hostUid, guestUid) {
  const players = { [hostUid]: spawnFor(hostUid, hostUid) }
  if (guestUid) players[guestUid] = spawnFor(guestUid, hostUid)
  await set(r('players'), players)
  await Promise.all([
    remove(r('projectiles')),
    remove(r('novas')),
    remove(r('potions')),
    remove(r('spellCooldowns')),
    set(r('winnerUid'), null),
  ])
}

export async function startCountdown(hostUid, guestUid) {
  await initMatch(hostUid, guestUid)
  await update(r(''), { status: 'countdown', countdownStartAt: Date.now() })
}

export function goActive() {
  return update(r(''), { status: 'active' })
}

export function endMatch(winnerUid) {
  return update(r(''), { status: 'match_over', winnerUid })
}

/** Host restarts after a result screen; clears rematch flags. */
export async function doRematch(hostUid, guestUid) {
  await update(r(`presence/${hostUid}`), { rematch: false })
  if (guestUid) await update(r(`presence/${guestUid}`), { rematch: false })
  await startCountdown(hostUid, guestUid)
}

/** Return everything to the lobby (recovery / "back to lobby"). */
export async function resetToWaiting(uids = []) {
  await Promise.all([
    remove(r('projectiles')),
    remove(r('novas')),
    remove(r('potions')),
    remove(r('spellCooldowns')),
    set(r('winnerUid'), null),
    update(r(''), { status: 'waiting' }),
    ...uids.map((uid) => update(r(`presence/${uid}`), { ready: false, rematch: false })),
  ])
}

// ---- position / hp --------------------------------------------------------
export function writePlayer(uid, data) {
  return update(r(`players/${uid}`), data)
}

/** Victim-authoritative damage. Returns the resulting HP. */
export async function damageSelf(uid, amount) {
  const res = await runTransaction(r(`players/${uid}/hp`), (hp) => {
    if (hp === null) return hp // player not initialized yet
    return Math.max(0, hp - amount)
  })
  return res.snapshot.val()
}

export async function healSelf(uid, amount) {
  const res = await runTransaction(r(`players/${uid}/hp`), (hp) => {
    if (hp === null) return hp
    return Math.min(MAX_HP, hp + amount)
  })
  return res.snapshot.val()
}

// ---- projectiles ----------------------------------------------------------
export function spawnProjectile(data) {
  const node = push(r('projectiles'))
  set(node, data)
  return node.key
}

export function removeProjectile(id) {
  return remove(r(`projectiles/${id}`))
}

// ---- novas (AoE events) ---------------------------------------------------
export function spawnNova(data) {
  const node = push(r('novas'))
  set(node, data)
  return node.key
}

export function removeNova(id) {
  return remove(r(`novas/${id}`))
}

// ---- potions --------------------------------------------------------------
export function spawnPotion(spotId, type, expiresAt) {
  return set(r(`potions/${spotId}`), { type, active: true, expiresAt })
}

export function deactivatePotion(spotId) {
  return update(r(`potions/${spotId}`), { active: false })
}

/** Atomic grab so only one client can consume a potion. Returns true on success. */
export async function grabPotion(spotId) {
  const res = await runTransaction(r(`potions/${spotId}/active`), (active) => {
    if (active === true) return false
    return // abort: already taken
  })
  return res.committed && res.snapshot.val() === false
}

// ---- cooldowns (advisory, survives refresh) -------------------------------
export function writeCooldown(uid, spellId, expiresAt) {
  return update(r(`spellCooldowns/${uid}`), { [spellId]: expiresAt })
}

export { COUNTDOWN_MS }
