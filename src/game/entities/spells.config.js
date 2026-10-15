// Spell definitions bound to keys 1–4. Each has its own cooldown.
// Damage/effects are applied by the *victim's* client (single source of truth
// for HP) — these numbers describe intent; ArenaScene/GameSync enforce them.

export const SPELLS = {
  1: {
    id: 'cupid',
    key: '1',
    name: "Cupid's Arrow",
    desc: 'Piercing shot, higher damage.',
    cooldown: 6000,
    color: 0xff2d6f,
    icon: '💘',
    damage: 22,
    speed: 780,
    radius: 12,
    piercing: true,
    ttl: 2500,
  },
  2: {
    id: 'shield',
    key: '2',
    name: 'Love Shield',
    desc: 'Blocks incoming damage for a short window.',
    cooldown: 10000,
    color: 0xc07aff,
    icon: '🛡️',
    duration: 2500, // ms of invulnerability
  },
  3: {
    id: 'nova',
    key: '3',
    name: 'Heartbreak Nova',
    desc: 'AoE burst around you.',
    cooldown: 12000,
    color: 0xff7ab0,
    icon: '💥',
    damage: 26,
    radius: 190, // pixels
  },
  4: {
    id: 'blink',
    key: '4',
    name: 'Blink Kiss',
    desc: 'Short dash toward your cursor.',
    cooldown: 8000,
    color: 0xffd6e7,
    icon: '💋',
    distance: 240, // pixels
  },
}

export const SPELL_KEYS = Object.keys(SPELLS) // ['1','2','3','4']
export const SPELL_LIST = SPELL_KEYS.map((k) => SPELLS[k])
export const SPELL_BY_ID = Object.fromEntries(
  SPELL_LIST.map((s) => [s.id, s])
)
