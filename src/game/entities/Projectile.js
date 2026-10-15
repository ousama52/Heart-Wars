import { HEART_RADIUS } from '../constants'

/**
 * Purely visual projectile. Its authoritative motion lives in RTDB as
 * { x, y, dx, dy, spawnedAt } — every client reconstructs the position
 * deterministically from spawn data + elapsed time, so no per-frame position
 * writes are needed. Collision + removal are decided by the scene.
 */
export default class Projectile {
  constructor(scene, id, data) {
    this.scene = scene
    this.id = id
    this.data = data
    this.isCupid = data.kind === 'cupid'

    this.sprite = scene.add
      .image(data.x, data.y, 'heart')
      .setDepth(4)
      .setTint(this.isCupid ? 0xff2d6f : 0xff7aa8)
    if (this.isCupid) this.sprite.setScale(1.5)

    // Point the heart along its travel direction.
    this.sprite.rotation = Math.atan2(data.dy, data.dx) + Math.PI / 2

    if (this.isCupid) {
      this.trail = scene.add.particles(data.x, data.y, 'particle', {
        follow: this.sprite,
        speed: 0,
        lifespan: 220,
        scale: { start: 0.6, end: 0 },
        tint: 0xff2d6f,
        frequency: 20,
      })
      this.trail.setDepth(3)
    }
  }

  get radius() {
    return this.isCupid ? 12 : HEART_RADIUS
  }

  positionAt(now) {
    const t = Math.max(0, (now - this.data.spawnedAt) / 1000)
    return {
      x: this.data.x + this.data.dx * t,
      y: this.data.y + this.data.dy * t,
    }
  }

  sync(now) {
    const p = this.positionAt(now)
    this.sprite.setPosition(p.x, p.y)
    return p
  }

  destroy() {
    if (this.trail) this.trail.destroy()
    this.sprite.destroy()
  }
}
