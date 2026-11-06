import { Vector2 } from "three";
import { KeyboardMovementInput } from "./keyboard-movement-input";
import { TouchMovementInput } from "./touch-movement-input";
import { TouchJumpInput } from "./touch-jump-input";

/** 入力元をゲームロジックから隠し、共通の移動ベクトルを提供する。 */
export class PlayerInput {
  private readonly keyboard: KeyboardMovementInput;
  private readonly touch: TouchMovementInput;
  private readonly touchJump: TouchJumpInput;

  constructor(container: HTMLElement, eventWindow: Window = window) {
    this.keyboard = new KeyboardMovementInput(eventWindow);
    this.touch = new TouchMovementInput(container, eventWindow);
    this.touchJump = new TouchJumpInput(container, eventWindow);
  }

  readMovement(out = new Vector2()): Vector2 {
    if (this.touch.isActive()) return this.touch.read(out);
    return this.keyboard.read(out);
  }

  consumeJumpPressed(): boolean {
    const keyboardPressed = this.keyboard.consumeJumpPressed();
    const touchPressed = this.touchJump.consumeJumpPressed();
    return keyboardPressed || touchPressed;
  }

  dispose(): void {
    this.keyboard.dispose();
    this.touch.dispose();
    this.touchJump.dispose();
  }
}
