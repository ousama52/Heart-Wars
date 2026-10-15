import { POTION_TYPES } from '../constants'

/** Visual for an active potion sitting on the ground at a fixed spot. */
export default class Potion {
  constructor(scene, spotId, x, y, type) {
    this.spotId = spotId
    this.type = type
    this.x = x
    this.y = y

    const def = POTION_TYPES[type] || {}
    const color = def.color ?? 0xffffff

    this.glow = scene.add.circle(x, y, 22, color, 0.18).setDepth(2)
    this.sprite = scene.add.image(x, y, 'potion').setTint(color).setDepth(3)
    this.label = scene.add
      .text(x, y - 30, def.label ?? type, {
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(3)

    this.tween = scene.tweens.add({
      targets: this.sprite,
      y: y - 7,
      yoyo: true,
      repeat: -1,
      duration: 850,
      ease: 'Sine.inOut',
    })
    this.glowTween = scene.tweens.add({
      targets: this.glow,
      scale: 1.25,
      alpha: 0.35,
      yoyo: true,
      repeat: -1,
      duration: 850,
      ease: 'Sine.inOut',
    })
  }

  destroy() {
    this.tween?.remove()
    this.glowTween?.remove()
    this.sprite.destroy()
    this.glow.destroy()
    this.label.destroy()
  }
}
