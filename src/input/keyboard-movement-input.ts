import { Vector2 } from "three";

const MOVEMENT_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"]);

/** PCのキー入力を正規化された移動ベクトルへ変換する。 */
export class KeyboardMovementInput {
  private readonly pressedKeys = new Set<string>();
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (!MOVEMENT_KEYS.has(key)) return;
    event.preventDefault();
    this.pressedKeys.add(key);
  };
  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressedKeys.delete(event.key.toLowerCase());
  };
  private readonly onBlur = (): void => this.pressedKeys.clear();

  constructor(private readonly target: Window = window) {
    target.addEventListener("keydown", this.onKeyDown);
    target.addEventListener("keyup", this.onKeyUp);
    target.addEventListener("blur", this.onBlur);
  }

  read(out = new Vector2()): Vector2 {
    const horizontal = Number(this.pressedKeys.has("d") || this.pressedKeys.has("arrowright"))
      - Number(this.pressedKeys.has("a") || this.pressedKeys.has("arrowleft"));
    const vertical = Number(this.pressedKeys.has("w") || this.pressedKeys.has("arrowup"))
      - Number(this.pressedKeys.has("s") || this.pressedKeys.has("arrowdown"));
    out.set(horizontal, vertical);
    if (out.lengthSq() > 1) out.normalize();
    return out;
  }

  dispose(): void {
    this.target.removeEventListener("keydown", this.onKeyDown);
    this.target.removeEventListener("keyup", this.onKeyUp);
    this.target.removeEventListener("blur", this.onBlur);
    this.pressedKeys.clear();
  }
}
