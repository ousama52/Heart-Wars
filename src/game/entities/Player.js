import Phaser from 'phaser'
import { PLAYER_RADIUS } from '../constants'

/**
 * Visual + physics container for a player. The local player gets an Arcade
 * body (collides with world bounds + obstacles); the remote player is a plain
 * image whose position is interpolated toward the latest networked target.
 */
export default class Player {
  constructor(scene, { uid, isLocal, color, name }) {
    this.scene = scene
    this.uid = uid
    this.isLocal = isLocal
    this.color = color

    this.sprite = scene.add.image(0, 0, 'player').setTint(color).setDepth(5)

    if (isLocal) {
      scene.physics.add.existing(this.sprite)
      const b = this.sprite.body
      b.setCircle(
        PLAYER_RADIUS,
        this.sprite.width / 2 - PLAYER_RADIUS,
        this.sprite.height / 2 - PLAYER_RADIUS
      )
      b.setCollideWorldBounds(true)
    }

    this.label = scene.add
      .text(0, 0, name || '', {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(7)

    this.shieldGfx = scene.add.graphics().setDepth(6)
    this.auraGfx = scene.add.graphics().setDepth(4)

    this.shieldUntil = 0
    this.speedUntil = 0
    this.damageUntil = 0

    this.targetX = 0
    this.targetY = 0
  }

  get x() {
    return this.sprite.x
  }
  get y() {
    return this.sprite.y
  }

  setPosition(x, y) {
    this.sprite.setPosition(x, y)
    if (this.isLocal && this.sprite.body) this.sprite.body.reset(x, y)
    this.targetX = x
    this.targetY = y
  }

  setTarget(x, y) {
    this.targetX = x
    this.targetY = y
  }

  isShielded(now) {
    return now < this.shieldUntil
  }

  update(now) {
    if (!this.isLocal) {
      // Smoothly interpolate remote position toward the last received target.
      this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.targetX, 0.3)
      this.sprite.y = Phaser.Math.Linear(this.sprite.y, this.targetY, 0.3)
    }

    this.label.setPosition(this.sprite.x, this.sprite.y - PLAYER_RADIUS - 10)

    // Shield ring
    this.shieldGfx.clear()
    if (this.isShielded(now)) {
      const pulse = Math.sin(now / 90) * 2
      this.shieldGfx.lineStyle(3, 0xc07aff, 0.85)
      this.shieldGfx.strokeCircle(this.sprite.x, this.sprite.y, PLAYER_RADIUS + 9 + pulse)
    }

    // Buff aura (speed = cyan, damage = orange)
    this.auraGfx.clear()
    if (now < this.speedUntil) {
      this.auraGfx.lineStyle(2, 0x5cc7e2, 0.6)
      this.auraGfx.strokeCircle(this.sprite.x, this.sprite.y, PLAYER_RADIUS + 4)
    }
    if (now < this.damageUntil) {
      this.auraGfx.lineStyle(2, 0xe2a25c, 0.6)
      this.auraGfx.strokeCircle(this.sprite.x, this.sprite.y, PLAYER_RADIUS + 6)
    }
  }

  destroy() {
    this.sprite.destroy()
    this.label.destroy()
    this.shieldGfx.destroy()
    this.auraGfx.destroy()
  }
}
