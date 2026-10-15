import Phaser from 'phaser'
import Player from '../entities/Player'
import Projectile from '../entities/Projectile'
import Potion from '../entities/Potion'
import { SPELLS } from '../entities/spells.config'
import {
  ARENA_W,
  ARENA_H,
  MAX_HP,
  SPAWNS,
  PLAYER_SPEED,
  PLAYER_RADIUS,
  FIRE_COOLDOWN,
  HEART_SPEED,
  HEART_DAMAGE,
  PROJECTILE_TTL,
  COUNTDOWN_MS,
  POTION_SPOTS,
  POTION_TYPES,
  POTION_TYPE_KEYS,
  POTION_LIFETIME,
  POTION_MIN_INTERVAL,
  POTION_MAX_INTERVAL,
  POTION_RADIUS,
  SPEED_BUFF_MULT,
  DAMAGE_BUFF_MULT,
  PLAYER_COLORS,
} from '../constants'

// Static cover. Identical on both clients (defined in code) so projectile/wall
// collisions resolve deterministically. {x,y} = center.
const OBSTACLES = [
  { x: 640, y: 200, w: 44, h: 170 },
  { x: 640, y: 520, w: 44, h: 170 },
  { x: 360, y: 360, w: 150, h: 44 },
  { x: 920, y: 360, w: 150, h: 44 },
  { x: 210, y: 140, w: 130, h: 32 },
  { x: 1070, y: 580, w: 130, h: 32 },
]

const POTION_SPOT_KEYS = Object.keys(POTION_SPOTS)

export default class ArenaScene extends Phaser.Scene {
  constructor() {
    super('ArenaScene')
  }

  create() {
    this.sync = this.registry.get('sync')
    this.ctx = this.registry.get('ctx')
    this.uid = this.ctx.uid

    this.status = 'countdown'
    this.matchEnded = false
    this.playersData = {}
    this.projData = {}
    this.novaData = {}
    this.potionData = {}

    this.projSprites = new Map()
    this.potionSprites = new Map()
    this.piercedBy = new Set()
    this.novaSeen = new Set()
    this.novaProcessed = new Set()
    this.novaRemoved = new Set()
    this.grabbing = new Set()

    this.fireReadyAt = 0
    this.spellReadyAt = { cupid: 0, shield: 0, nova: 0, blink: 0 }
    this.speedBuffUntil = 0
    this.damageBuffUntil = 0
    this.nextPotionAt = Infinity
    this.aimAngle = 0

    this.physics.world.setBounds(0, 0, ARENA_W, ARENA_H)

    this.drawArena()
    this.createObstacles()
    this.createPlayers()
    this.createInput()
    this.createHUD()
    this.subscribeSync()

    this.events.once('shutdown', this.onShutdown, this)
  }

  // ---- setup --------------------------------------------------------------
  drawArena() {
    const g = this.add.graphics().setDepth(0)
    g.fillStyle(0x231019, 1)
    g.fillRect(0, 0, ARENA_W, ARENA_H)
    // grid
    g.lineStyle(1, 0xffffff, 0.03)
    for (let x = 0; x <= ARENA_W; x += 64) g.lineBetween(x, 0, x, ARENA_H)
    for (let y = 0; y <= ARENA_H; y += 64) g.lineBetween(0, y, ARENA_W, y)
    // border
    g.lineStyle(4, 0xff5c8a, 0.35)
    g.strokeRect(2, 2, ARENA_W - 4, ARENA_H - 4)

    this.aimGfx = this.add.graphics().setDepth(4)
  }

  createObstacles() {
    this.obstacleRects = OBSTACLES.map((o) =>
      new Phaser.Geom.Rectangle(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h)
    )
    this.obstacleGroup = this.physics.add.staticGroup()
    OBSTACLES.forEach((o) => {
      const img = this.obstacleGroup
        .create(o.x, o.y, 'wall')
        .setTint(0x5a3a4a)
        .setDepth(2)
      img.setDisplaySize(o.w, o.h)
      img.refreshBody()
    })
  }

  createPlayers() {
    const isHost = !!this.ctx.isHost
    const mySpawn = isHost ? SPAWNS.left : SPAWNS.right
    const myColor = isHost ? PLAYER_COLORS.host : PLAYER_COLORS.guest
    const otherColor = isHost ? PLAYER_COLORS.guest : PLAYER_COLORS.host

    this.localPlayer = new Player(this, {
      uid: this.uid,
      isLocal: true,
      color: myColor,
      name: this.ctx.myName || 'You',
    })
    this.localPlayer.setPosition(mySpawn.x, mySpawn.y)

    this.remotePlayer = new Player(this, {
      uid: this.ctx.otherUid,
      isLocal: false,
      color: otherColor,
      name: this.ctx.otherName || 'Opponent',
    })
    const otherSpawn = isHost ? SPAWNS.right : SPAWNS.left
    this.remotePlayer.setPosition(otherSpawn.x, otherSpawn.y)

    this.physics.add.collider(this.localPlayer.sprite, this.obstacleGroup)
    this.myColor = myColor
    this.otherColor = otherColor
  }

  createInput() {
    const KC = Phaser.Input.Keyboard.KeyCodes
    this.keys = this.input.keyboard.addKeys({
      up: KC.W,
      down: KC.S,
      left: KC.A,
      right: KC.D,
      up2: KC.UP,
      down2: KC.DOWN,
      left2: KC.LEFT,
      right2: KC.RIGHT,
      s1: KC.ONE,
      s2: KC.TWO,
      s3: KC.THREE,
      s4: KC.FOUR,
    })
  }

  subscribeSync() {
    this._unsubs = [
      this.sync.onPlayers((v) => this.onPlayers(v || {})),
      this.sync.onProjectiles((v) => (this.projData = v || {})),
      this.sync.onNovas((v) => (this.novaData = v || {})),
      this.sync.onPotions((v) => (this.potionData = v || {})),
      this.sync.onStatus((v) => this.onStatus(v || 'waiting')),
      this.sync.onCountdown((v) => (this.countdownStartAt = v)),
    ]
  }

  onPlayers(v) {
    this.playersData = v
    // Update the remote player's target position (never our own — we predict it).
    const rp = v[this.ctx.otherUid]
    if (rp && this.remotePlayer) this.remotePlayer.setTarget(rp.x, rp.y)
  }

  onStatus(status) {
    const prev = this.status
    this.status = status
    if (status === prev) return

    if (status === 'countdown') {
      this.matchEnded = false
      this.resetLocalCombat()
      this.snapToSpawn()
      if (this.scene.isActive('ResultScene')) this.scene.stop('ResultScene')
    } else if (status === 'active' && prev !== 'active') {
      this.matchEnded = false
      this.nextPotionAt =
        this.sync.now() +
        Phaser.Math.Between(POTION_MIN_INTERVAL, POTION_MAX_INTERVAL)
    } else if (status === 'match_over' && prev !== 'match_over') {
      this.launchResult()
    }
  }

  snapToSpawn() {
    const spawn = this.ctx.isHost ? SPAWNS.left : SPAWNS.right
    this.localPlayer.setPosition(spawn.x, spawn.y)
    this.localPlayer.sprite.body?.setVelocity(0, 0)
  }

  resetLocalCombat() {
    this.fireReadyAt = 0
    this.spellReadyAt = { cupid: 0, shield: 0, nova: 0, blink: 0 }
    this.speedBuffUntil = 0
    this.damageBuffUntil = 0
    this.localPlayer.shieldUntil = 0
    this.localPlayer.speedUntil = 0
    this.localPlayer.damageUntil = 0
    this.piercedBy.clear()
    this.novaProcessed.clear()
    this.novaRemoved.clear()
    this.grabbing.clear()
  }

  launchResult() {
    // Prefer HP (already reflects the killing blow) so the result is correct
    // regardless of whether the winnerUid write has propagated yet; ResultScene
    // also subscribes live and self-corrects.
    const myHp = this.playersData[this.uid]?.hp
    const won =
      typeof myHp === 'number' ? myHp > 0 : this.sync.getWinnerUid() === this.uid
    this.scene.launch('ResultScene', { won })
  }

  // ---- main loop ----------------------------------------------------------
  update(time, delta) {
    const now = this.sync.now()

    if (this.status === 'active' && !this.matchEnded) {
      this.handleAim(now)
      this.handleMovement(now)
      this.handleFiring(now)
      this.handleSpells(now)
      this.writeMyState()
    } else {
      this.localPlayer.sprite.body?.setVelocity(0, 0)
      this.aimGfx.clear()
    }

    this.localPlayer.update(now)
    this.remotePlayer.update(now)

    this.updateProjectiles(now)
    this.updateNovas(now)
    this.updatePotions(now)
    this.maybeSpawnPotions(now)
    this.checkDeath()
    this.updateHUD(now)
  }

  handleAim(now) {
    const p = this.input.activePointer
    const px = p.worldX
    const py = p.worldY
    this.aimAngle = Math.atan2(py - this.localPlayer.y, px - this.localPlayer.x)

    this.aimGfx.clear()
    this.aimGfx.lineStyle(2, this.myColor, 0.4)
    const sx = this.localPlayer.x + Math.cos(this.aimAngle) * (PLAYER_RADIUS + 4)
    const sy = this.localPlayer.y + Math.sin(this.aimAngle) * (PLAYER_RADIUS + 4)
    this.aimGfx.lineBetween(
      sx,
      sy,
      sx + Math.cos(this.aimAngle) * 26,
      sy + Math.sin(this.aimAngle) * 26
    )
  }

  handleMovement(now) {
    const k = this.keys
    let vx = 0
    let vy = 0
    if (k.left.isDown || k.left2.isDown) vx -= 1
    if (k.right.isDown || k.right2.isDown) vx += 1
    if (k.up.isDown || k.up2.isDown) vy -= 1
    if (k.down.isDown || k.down2.isDown) vy += 1
    const len = Math.hypot(vx, vy) || 1
    const speed = PLAYER_SPEED * (now < this.speedBuffUntil ? SPEED_BUFF_MULT : 1)
    this.localPlayer.sprite.body.setVelocity((vx / len) * speed, (vy / len) * speed)
  }

  handleFiring(now) {
    if (this.input.activePointer.leftButtonDown() && now >= this.fireReadyAt) {
      this.fireReadyAt = now + FIRE_COOLDOWN
      this.spawnHeart(now, false)
    }
  }

  handleSpells(now) {
    const jd = (key) => Phaser.Input.Keyboard.JustDown(key)
    if (jd(this.keys.s1)) this.castSpell('cupid', now)
    if (jd(this.keys.s2)) this.castSpell('shield', now)
    if (jd(this.keys.s3)) this.castSpell('nova', now)
    if (jd(this.keys.s4)) this.castSpell('blink', now)
  }

  spawnHeart(now, piercing) {
    const spell = piercing ? SPELLS[1] : null
    const speed = piercing ? spell.speed : HEART_SPEED
    const baseDmg = piercing ? spell.damage : HEART_DAMAGE
    const dmg = Math.round(baseDmg * (now < this.damageBuffUntil ? DAMAGE_BUFF_MULT : 1))
    const a = this.aimAngle
    const sx = this.localPlayer.x + Math.cos(a) * (PLAYER_RADIUS + 8)
    const sy = this.localPlayer.y + Math.sin(a) * (PLAYER_RADIUS + 8)
    this.sync.spawnProjectile({
      ownerUid: this.uid,
      x: Math.round(sx),
      y: Math.round(sy),
      dx: Math.cos(a) * speed,
      dy: Math.sin(a) * speed,
      spawnedAt: now,
      kind: piercing ? 'cupid' : 'heart',
      dmg,
      piercing: !!piercing,
      ttl: piercing ? spell.ttl : PROJECTILE_TTL,
    })
    this.burst(sx, sy, piercing ? 0xff2d6f : 0xff7aa8, 6)
  }

  castSpell(id, now) {
    const spell = Object.values(SPELLS).find((s) => s.id === id)
    if (now < (this.spellReadyAt[id] || 0)) return
    this.spellReadyAt[id] = now + spell.cooldown
    this.sync.writeCooldown(id, this.spellReadyAt[id])

    if (id === 'cupid') {
      this.spawnHeart(now, true)
    } else if (id === 'shield') {
      this.localPlayer.shieldUntil = now + spell.duration
      this.toast('🛡️ Shield up!')
    } else if (id === 'nova') {
      const dmg = Math.round(
        spell.damage * (now < this.damageBuffUntil ? DAMAGE_BUFF_MULT : 1)
      )
      this.sync.spawnNova({
        ownerUid: this.uid,
        x: Math.round(this.localPlayer.x),
        y: Math.round(this.localPlayer.y),
        radius: spell.radius,
        dmg,
        at: now,
      })
    } else if (id === 'blink') {
      this.blink(spell)
    }
  }

  blink(spell) {
    const a = this.aimAngle
    let nx = Phaser.Math.Clamp(
      this.localPlayer.x + Math.cos(a) * spell.distance,
      PLAYER_RADIUS,
      ARENA_W - PLAYER_RADIUS
    )
    let ny = Phaser.Math.Clamp(
      this.localPlayer.y + Math.sin(a) * spell.distance,
      PLAYER_RADIUS,
      ARENA_H - PLAYER_RADIUS
    )
    // Nudge out of any obstacle we'd land in.
    for (const rect of this.obstacleRects) {
      const grown = new Phaser.Geom.Rectangle(
        rect.x - PLAYER_RADIUS,
        rect.y - PLAYER_RADIUS,
        rect.width + PLAYER_RADIUS * 2,
        rect.height + PLAYER_RADIUS * 2
      )
      if (grown.contains(nx, ny)) {
        nx = this.localPlayer.x
        ny = this.localPlayer.y
        break
      }
    }
    this.burst(this.localPlayer.x, this.localPlayer.y, 0xffd6e7, 12)
    this.localPlayer.setPosition(nx, ny)
    this.burst(nx, ny, 0xffd6e7, 12)
  }

  writeMyState() {
    this.sync.writePlayerThrottled({
      x: Math.round(this.localPlayer.x),
      y: Math.round(this.localPlayer.y),
      angle: this.aimAngle,
    })
  }

  // ---- projectiles --------------------------------------------------------
  updateProjectiles(now) {
    // create / update
    for (const id in this.projData) {
      const data = this.projData[id]
      let proj = this.projSprites.get(id)
      if (!proj) {
        proj = new Projectile(this, id, data)
        this.projSprites.set(id, proj)
      }
      const pos = proj.sync(now)

      if (data.ownerUid === this.uid) {
        // Owner cleans up its own projectiles.
        if (now - data.spawnedAt > (data.ttl || PROJECTILE_TTL)) {
          this.sync.removeProjectile(id)
        } else if (this.outOfBounds(pos)) {
          this.sync.removeProjectile(id)
        } else if (!data.piercing && this.hitsObstacle(pos, proj.radius)) {
          this.burst(pos.x, pos.y, 0xff7aa8, 8)
          this.sync.removeProjectile(id)
        }
      } else {
        // We are the potential victim -> authoritative for our own HP.
        const dist = Phaser.Math.Distance.Between(
          pos.x,
          pos.y,
          this.localPlayer.x,
          this.localPlayer.y
        )
        if (dist < proj.radius + PLAYER_RADIUS) {
          if (data.piercing) {
            if (!this.piercedBy.has(id)) {
              this.piercedBy.add(id)
              this.applyIncomingDamage(data.dmg, pos)
            }
          } else {
            this.applyIncomingDamage(data.dmg, pos)
            this.burst(pos.x, pos.y, 0xff7aa8, 10)
            this.sync.removeProjectile(id)
          }
        }
      }
    }

    // destroy sprites whose record is gone
    for (const [id, proj] of this.projSprites) {
      if (!this.projData[id]) {
        proj.destroy()
        this.projSprites.delete(id)
        this.piercedBy.delete(id)
      }
    }
  }

  applyIncomingDamage(amount, pos) {
    const now = this.sync.now()
    if (this.localPlayer.isShielded(now)) {
      this.toast('🛡️ Blocked!')
      if (pos) this.burst(pos.x, pos.y, 0xc07aff, 8)
      return
    }
    this.sync.damageSelf(amount)
    this.cameras.main.shake(120, 0.008)
    this.cameras.main.flash(90, 255, 60, 100)
  }

  outOfBounds(p) {
    return p.x < -20 || p.x > ARENA_W + 20 || p.y < -20 || p.y > ARENA_H + 20
  }

  hitsObstacle(p, r) {
    for (const rect of this.obstacleRects) {
      if (
        p.x > rect.x - r &&
        p.x < rect.right + r &&
        p.y > rect.y - r &&
        p.y < rect.bottom + r
      ) {
        return true
      }
    }
    return false
  }

  // ---- novas --------------------------------------------------------------
  updateNovas(now) {
    for (const id in this.novaData) {
      const n = this.novaData[id]

      if (!this.novaSeen.has(id)) {
        this.novaSeen.add(id)
        this.playNovaVisual(n)
      }

      // Victim applies damage to self (once).
      if (n.ownerUid !== this.uid && !this.novaProcessed.has(id)) {
        this.novaProcessed.add(id)
        const dist = Phaser.Math.Distance.Between(
          n.x,
          n.y,
          this.localPlayer.x,
          this.localPlayer.y
        )
        if (dist < n.radius + PLAYER_RADIUS) {
          if (this.localPlayer.isShielded(now)) {
            this.toast('🛡️ Blocked!')
          } else {
            this.sync.damageSelf(n.dmg)
            this.cameras.main.shake(220, 0.014)
            this.cameras.main.flash(140, 255, 60, 100)
          }
        }
      }

      // Owner removes the record shortly after so it fires once.
      if (n.ownerUid === this.uid && now - n.at > 800 && !this.novaRemoved.has(id)) {
        this.novaRemoved.add(id)
        this.sync.removeNova(id)
      }
    }
  }

  playNovaVisual(n) {
    const ring = this.add
      .circle(n.x, n.y, n.radius, 0xff7ab0, 0.12)
      .setStrokeStyle(5, 0xff2d6f, 0.9)
      .setDepth(3)
      .setScale(0.2)
    this.tweens.add({
      targets: ring,
      scale: 1,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.out',
      onComplete: () => ring.destroy(),
    })
    this.burst(n.x, n.y, 0xff2d6f, 18)
  }

  // ---- potions ------------------------------------------------------------
  updatePotions(now) {
    for (const spotId in this.potionData) {
      const pd = this.potionData[spotId]
      const spot = POTION_SPOTS[spotId]
      const active = pd.active && (!pd.expiresAt || now < pd.expiresAt) && spot
      if (active) {
        if (!this.potionSprites.has(spotId)) {
          this.potionSprites.set(
            spotId,
            new Potion(this, spotId, spot.x, spot.y, pd.type)
          )
        }
        const dist = Phaser.Math.Distance.Between(
          spot.x,
          spot.y,
          this.localPlayer.x,
          this.localPlayer.y
        )
        if (dist < POTION_RADIUS + PLAYER_RADIUS) this.tryGrab(spotId, pd.type)
      } else if (this.potionSprites.has(spotId)) {
        this.potionSprites.get(spotId).destroy()
        this.potionSprites.delete(spotId)
      }
    }
    for (const [spotId, sprite] of this.potionSprites) {
      if (!this.potionData[spotId]) {
        sprite.destroy()
        this.potionSprites.delete(spotId)
      }
    }
  }

  tryGrab(spotId, type) {
    if (this.grabbing.has(spotId)) return
    this.grabbing.add(spotId)
    this.sync.grabPotion(spotId).then((ok) => {
      this.grabbing.delete(spotId)
      if (ok) this.applyPotion(type)
    })
  }

  applyPotion(type) {
    const now = this.sync.now()
    const def = POTION_TYPES[type]
    if (!def) return
    if (type === 'heal') {
      this.sync.healSelf(def.heal)
      this.toast('💚 +20 HP')
    } else if (type === 'speed') {
      this.speedBuffUntil = now + def.duration
      this.localPlayer.speedUntil = this.speedBuffUntil
      this.toast('💨 Speed boost!')
    } else if (type === 'damage') {
      this.damageBuffUntil = now + def.duration
      this.localPlayer.damageUntil = this.damageBuffUntil
      this.toast('⚔️ Damage boost!')
    } else if (type === 'shield') {
      this.localPlayer.shieldUntil = now + def.duration
      this.toast('🛡️ Shield charge!')
    }
    this.burst(this.localPlayer.x, this.localPlayer.y, def.color, 14)
  }

  maybeSpawnPotions(now) {
    if (!this.ctx.isHost || this.status !== 'active') return

    // expire old ones
    for (const spotId in this.potionData) {
      const pd = this.potionData[spotId]
      if (pd.active && pd.expiresAt && now > pd.expiresAt) {
        this.sync.deactivatePotion(spotId)
      }
    }

    if (now >= this.nextPotionAt) {
      this.nextPotionAt =
        now + Phaser.Math.Between(POTION_MIN_INTERVAL, POTION_MAX_INTERVAL)
      const free = POTION_SPOT_KEYS.filter((k) => {
        const pd = this.potionData[k]
        return !pd || !pd.active || (pd.expiresAt && now > pd.expiresAt)
      })
      if (free.length) {
        const spot = Phaser.Utils.Array.GetRandom(free)
        const type = Phaser.Utils.Array.GetRandom(POTION_TYPE_KEYS)
        this.sync.spawnPotion(spot, type, now + POTION_LIFETIME)
      }
    }
  }

  // ---- death --------------------------------------------------------------
  checkDeath() {
    if (this.matchEnded) return
    const me = this.playersData[this.uid]
    if (me && typeof me.hp === 'number' && me.hp <= 0) {
      this.matchEnded = true
      // Victim is authoritative: report the opponent as the winner.
      this.sync.endMatch(this.ctx.otherUid)
    }
  }

  // ---- HUD ----------------------------------------------------------------
  createHUD() {
    const style = {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3,
    }
    this.hudGfx = this.add.graphics().setDepth(20)

    this.nameLeft = this.add.text(24, 20, this.ctx.myName || 'You', style).setDepth(21)
    this.nameRight = this.add
      .text(ARENA_W - 24, 20, this.ctx.otherName || 'Opponent', style)
      .setOrigin(1, 0)
      .setDepth(21)

    // Spell icons (bottom center)
    this.spellIcons = {}
    const ids = ['cupid', 'shield', 'nova', 'blink']
    const startX = ARENA_W / 2 - (ids.length * 66) / 2 + 33
    ids.forEach((id, i) => {
      const spell = Object.values(SPELLS).find((s) => s.id === id)
      const x = startX + i * 66
      const y = ARENA_H - 46
      const icon = this.add
        .text(x, y, spell.icon, { fontSize: '30px' })
        .setOrigin(0.5)
        .setDepth(21)
      const key = this.add
        .text(x - 20, y - 22, spell.key, {
          fontSize: '13px',
          color: '#ffd6e7',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(22)
      this.spellIcons[id] = { icon, key, x, y, spell }
    })

    this.countdownText = this.add
      .text(ARENA_W / 2, ARENA_H / 2, '', {
        fontSize: '120px',
        color: '#ff5c8a',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(30)

    this.toastText = this.add
      .text(ARENA_W / 2, 120, '', {
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setAlpha(0)
  }

  updateHUD(now) {
    const g = this.hudGfx
    g.clear()

    const myHp = this.playersData[this.uid]?.hp ?? MAX_HP
    const otherHp = this.playersData[this.ctx.otherUid]?.hp ?? MAX_HP
    this.drawHealthBar(g, 24, 46, 300, myHp, this.myColor, false)
    this.drawHealthBar(g, ARENA_W - 24 - 300, 46, 300, otherHp, this.otherColor, true)

    // Spell cooldown fills
    for (const id in this.spellIcons) {
      const s = this.spellIcons[id]
      const ready = this.spellReadyAt[id] || 0
      const frac = Phaser.Math.Clamp((ready - now) / s.spell.cooldown, 0, 1)
      g.fillStyle(0x000000, 0.35)
      g.fillCircle(s.x, s.y, 26)
      g.lineStyle(3, frac > 0 ? 0x8a5a6a : 0x5ce27a, 0.9)
      if (frac > 0) {
        // shrinking arc as it recharges
        g.beginPath()
        g.arc(
          s.x,
          s.y,
          26,
          -Math.PI / 2,
          -Math.PI / 2 + (1 - frac) * Math.PI * 2,
          false
        )
        g.strokePath()
        s.icon.setAlpha(0.4)
      } else {
        g.strokeCircle(s.x, s.y, 26)
        s.icon.setAlpha(1)
      }
    }

    // Countdown
    if (this.status === 'countdown' && this.countdownStartAt) {
      const remaining = this.countdownStartAt + COUNTDOWN_MS - now
      const n = Math.ceil(remaining / 1000)
      this.countdownText.setText(n > 0 ? String(n) : 'GO!')
    } else {
      this.countdownText.setText('')
    }
  }

  drawHealthBar(g, x, y, w, hp, color, alignRight) {
    const h = 22
    const frac = Phaser.Math.Clamp(hp / MAX_HP, 0, 1)
    g.fillStyle(0x000000, 0.5)
    g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 6)
    g.fillStyle(0x3a1a26, 1)
    g.fillRoundedRect(x, y, w, h, 5)
    const fillW = Math.max(0, w * frac)
    if (fillW > 0) {
      g.fillStyle(color, 1)
      if (alignRight) g.fillRoundedRect(x + (w - fillW), y, fillW, h, 5)
      else g.fillRoundedRect(x, y, fillW, h, 5)
    }
  }

  toast(msg) {
    this.toastText.setText(msg).setAlpha(1)
    this.tweens.killTweensOf(this.toastText)
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 900,
      duration: 500,
    })
  }

  burst(x, y, color, count = 10) {
    const p = this.add.particles(x, y, 'particle', {
      speed: { min: 40, max: 180 },
      lifespan: 420,
      scale: { start: 0.9, end: 0 },
      tint: color,
      emitting: false,
    })
    p.setDepth(8)
    p.explode(count, x, y)
    this.time.delayedCall(500, () => p.destroy())
  }

  onShutdown() {
    if (this._unsubs) this._unsubs.forEach((u) => u && u())
    this._unsubs = null
  }
}
