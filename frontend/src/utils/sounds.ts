import { SoundManager } from "../engine/SoundManager";

export function playMoveSound() {
  SoundManager.move();
}

export function playCaptureSound() {
  SoundManager.capture();
}

export function playKingSound() {
  SoundManager.king();
}

export function playSelectSound() {
  SoundManager.select();
}

export function playGameStartSound() {
  SoundManager.gameStart();
}

export function playGameOverSound() {
  SoundManager.gameOver();
}
