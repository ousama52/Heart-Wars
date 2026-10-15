import Phaser from 'phaser'
import PreloadScene from './scenes/PreloadScene'
import ArenaScene from './scenes/ArenaScene'
import ResultScene from './scenes/ResultScene'
import { ARENA_W, ARENA_H } from './constants'

/** Phaser game config. `parent` is the DOM element GameContainer mounts into. */
export function createGameConfig(parent) {
  return {
    type: Phaser.AUTO,
    parent,
    width: ARENA_W,
    height: ARENA_H,
    backgroundColor: '#1a0a14',
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: { antialias: true, pixelArt: false },
    scene: [PreloadScene, ArenaScene, ResultScene],
  }
}
