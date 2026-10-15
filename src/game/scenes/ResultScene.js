import Phaser from 'phaser'
import { ARENA_W, ARENA_H } from '../constants'

/**
 * Overlay shown on match_over. Rematch flags a per-player "rematch" in RTDB;
 * the host restarts once both agree. "Back to lobby" resets the room to waiting.
 */
export default class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene')
  }

  create(data) {
    this.sync = this.registry.get('sync')
    this.ctx = this.registry.get('ctx')
    this.won = !!data.won
    this.rematchRequested = false
    this.confettiFired = false

    this.add.rectangle(0, 0, ARENA_W, ARENA_H, 0x0a0308, 0.72).setOrigin(0).setDepth(0)

    this.titleText = this.add
      .text(ARENA_W / 2, ARENA_H / 2 - 120, '', {
        fontSize: '84px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(1)

    this.subtitleText = this.add
      .text(ARENA_W / 2, ARENA_H / 2 - 40, '', {
        fontSize: '24px',
        color: '#ffd6e7',
      })
      .setOrigin(0.5)
      .setDepth(1)

    this.rematchBtn = this.makeButton(
      ARENA_W / 2,
      ARENA_H / 2 + 60,
      '♥ Rematch',
      0xff5c8a,
      () => this.onRematch()
    )
    this.makeButton(
      ARENA_W / 2,
      ARENA_H / 2 + 130,
      'Back to lobby',
      0x5a3a4a,
      () => this.sync.backToLobby()
    )

    this.statusText = this.add
      .text(ARENA_W / 2, ARENA_H / 2 + 195, '', {
        fontSize: '18px',
        color: '#ffd6e7',
      })
      .setOrigin(0.5)
      .setDepth(1)

    // Render initial result, then self-correct once winnerUid is confirmed.
    this.applyResult(this.won)
    this._unsub = this.sync.onWinner((w) => {
      if (w != null) this.applyResult(w === this.ctx.uid)
    })
    this.events.once('shutdown', () => this._unsub && this._unsub())
  }

  applyResult(won) {
    this.won = won
    this.titleText.setText(won ? 'Victory! 💖' : 'Defeat 💔').setColor(
      won ? '#7cf0a0' : '#ff7a9a'
    )
    this.subtitleText.setText(
      won ? 'You captured their heart.' : 'Your heart was broken.'
    )
    if (won && !this.confettiFired) {
      this.confettiFired = true
      this.confetti()
    }
  }

  onRematch() {
    if (this.rematchRequested) return
    this.rematchRequested = true
    this.sync.setRematch(true)
    this.rematchBtn.label.setText('✓ Waiting for opponent…')
    this.rematchBtn.bg.setFillStyle(0x3a7a52)
    this.statusText.setText('Rematch requested. Waiting for your opponent to accept.')
  }

  makeButton(x, y, text, fill, onClick) {
    const bg = this.add
      .rectangle(x, y, 300, 54, fill, 1)
      .setStrokeStyle(2, 0xffffff, 0.2)
      .setDepth(1)
      .setInteractive({ useHandCursor: true })
    const label = this.add
      .text(x, y, text, {
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(2)
    bg.on('pointerover', () => bg.setScale(1.04))
    bg.on('pointerout', () => bg.setScale(1))
    bg.on('pointerdown', onClick)
    return { bg, label }
  }

  confetti() {
    const colors = [0xff5c8a, 0xffd6e7, 0x7cf0a0, 0x5cc7e2, 0xffe08a]
    this.add
      .particles(ARENA_W / 2, -20, 'particle', {
        x: { min: 0, max: ARENA_W },
        y: -20,
        speedY: { min: 120, max: 320 },
        speedX: { min: -60, max: 60 },
        lifespan: 3000,
        scale: { start: 1.1, end: 0.2 },
        tint: colors,
        frequency: 40,
        quantity: 2,
        rotate: { min: 0, max: 360 },
      })
      .setDepth(3)
  }
}
