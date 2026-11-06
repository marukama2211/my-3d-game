import { Vector2 } from "three";
import { KeyboardMovementInput } from "./keyboard-movement-input";
import { TouchMovementInput } from "./touch-movement-input";

/** 入力元をゲームロジックから隠し、共通の移動ベクトルを提供する。 */
export class PlayerInput {
  private readonly keyboard: KeyboardMovementInput;
  private readonly touch: TouchMovementInput;

  constructor(container: HTMLElement, eventWindow: Window = window) {
    this.keyboard = new KeyboardMovementInput(eventWindow);
    this.touch = new TouchMovementInput(container, eventWindow);
  }

  readMovement(out = new Vector2()): Vector2 {
    if (this.touch.isActive()) return this.touch.read(out);
    return this.keyboard.read(out);
  }

  dispose(): void {
    this.keyboard.dispose();
    this.touch.dispose();
  }
}
