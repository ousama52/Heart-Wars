import Phaser from 'phaser'
import { PLAYER_RADIUS } from '../constants'

/**
 * Generates every texture procedurally with Phaser Graphics — no external image
 * files are fetched or hotlinked (see CREDITS.md). Then hands off to ArenaScene.
 */
export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene')
  }

  create() {
    this.makePlayer()
    this.makeHeart()
    this.makePotion()
    this.makeWall()
    this.makeParticle()

    this.scene.start('ArenaScene')
  }

  makePlayer() {
    const size = PLAYER_RADIUS * 2 + 8
    const c = size / 2
    const g = this.make.graphics({ add: false })
    g.fillStyle(0xffffff, 1)
    g.fillCircle(c, c, PLAYER_RADIUS)
    // subtle inner shading so the tint reads as a rounded body
    g.fillStyle(0x000000, 0.12)
    g.fillCircle(c, c + 3, PLAYER_RADIUS - 4)
    g.fillStyle(0xffffff, 0.9)
    g.fillCircle(c - 6, c - 6, PLAYER_RADIUS * 0.35)
    g.generateTexture('player', size, size)
    g.destroy()
  }

  makeHeart() {
    const g = this.make.graphics({ add: false })
    g.fillStyle(0xffffff, 1)
    // two lobes + a point => heart on a 32x32 canvas
    g.fillCircle(10, 12, 8)
    g.fillCircle(22, 12, 8)
    g.fillTriangle(2, 14, 30, 14, 16, 30)
    g.generateTexture('heart', 32, 32)
    g.destroy()
  }

  makePotion() {
    const g = this.make.graphics({ add: false })
    g.fillStyle(0xffffff, 1)
    g.fillRoundedRect(9, 12, 14, 16, 5) // body
    g.fillRect(12, 5, 8, 8) // neck
    g.fillStyle(0xffffff, 0.6)
    g.fillRect(11, 3, 10, 3) // cork
    g.generateTexture('potion', 32, 32)
    g.destroy()
  }

  makeWall() {
    // Plain white rectangle, tinted + display-sized per obstacle.
    const g = this.make.graphics({ add: false })
    g.fillStyle(0xffffff, 1)
    g.fillRect(0, 0, 16, 16)
    g.generateTexture('wall', 16, 16)
    g.destroy()
  }

  makeParticle() {
    const g = this.make.graphics({ add: false })
    g.fillStyle(0xffffff, 1)
    g.fillCircle(5, 5, 5)
    g.generateTexture('particle', 10, 10)
    g.destroy()
  }
}
