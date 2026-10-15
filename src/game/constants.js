// Shared gameplay constants (no Phaser import so React screens can use them too).

export const ARENA_W = 1280
export const ARENA_H = 720

export const MAX_HP = 100

// Two fixed spawn points. Host takes the left, guest the right.
export const SPAWNS = {
  left: { x: 150, y: ARENA_H / 2 },
  right: { x: ARENA_W - 150, y: ARENA_H / 2 },
}

// Movement
export const PLAYER_SPEED = 260
export const PLAYER_RADIUS = 22

// Basic heart attack
export const FIRE_COOLDOWN = 500 // ms
export const HEART_SPEED = 620
export const HEART_DAMAGE = 8
export const HEART_RADIUS = 10
export const PROJECTILE_TTL = 2500 // ms before auto-despawn

// How often each client writes its own position to RTDB (throttled, not per-frame)
export const POSITION_SYNC_MS = 50

// Countdown before a match / rematch goes live
export const COUNTDOWN_MS = 3000

// --- Potions ---------------------------------------------------------------
// Three fixed spots; the host rotates which ones are active.
export const POTION_SPOTS = {
  a: { x: ARENA_W / 2, y: 150 },
  b: { x: ARENA_W / 2, y: ARENA_H - 150 },
  c: { x: ARENA_W / 2, y: ARENA_H / 2 },
}

export const POTION_MIN_INTERVAL = 15000
export const POTION_MAX_INTERVAL = 20000
export const POTION_LIFETIME = 12000 // active on the ground before it disappears
export const POTION_RADIUS = 16

export const POTION_TYPES = {
  heal: { label: 'Heal +20', color: 0x5ce27a, heal: 20 },
  speed: { label: 'Speed', color: 0x5cc7e2, buff: 'speed', duration: 6000 },
  damage: { label: 'Damage', color: 0xe2a25c, buff: 'damage', duration: 6000 },
  shield: { label: 'Shield', color: 0xc07aff, buff: 'shield', duration: 6000 },
}
export const POTION_TYPE_KEYS = Object.keys(POTION_TYPES)

// Temporary buff multipliers
export const SPEED_BUFF_MULT = 1.6
export const DAMAGE_BUFF_MULT = 1.75

// Colors for the two players (assigned host = pink, guest = blue)
export const PLAYER_COLORS = {
  host: 0xff5c8a,
  guest: 0x5c9dff,
}

/** Deterministic host = the lexicographically smallest connected uid. */
export function computeHostUid(playersObj = {}) {
  const uids = Object.entries(playersObj)
    .filter(([, p]) => p && p.connected)
    .map(([uid]) => uid)
  if (uids.length === 0) return null
  return uids.sort()[0]
}
