import { Camera, Object3D, Vector2, Vector3 } from "three";

const UP = new Vector3(0, 1, 0);
const MAX_FRAME_SECONDS = 0.05;

/** カメラ相対の水平移動と移動方向への旋回を処理する。 */
export class PlayerController {
  readonly speed = 3.4;
  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly direction = new Vector3();

  constructor(readonly player: Object3D) {}

  update(movement: Vector2, deltaSeconds: number, camera: Camera): void {
    camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 1e-8) this.forward.set(0, 0, -1);
    else this.forward.normalize();
    this.right.crossVectors(this.forward, UP).normalize();

    this.direction.set(0, 0, 0)
      .addScaledVector(this.right, movement.x)
      .addScaledVector(this.forward, movement.y);
    const inputMagnitude = Math.min(this.direction.length(), 1);
    if (inputMagnitude === 0) return;
    this.direction.normalize();

    const step = this.speed * Math.max(0, Math.min(deltaSeconds, MAX_FRAME_SECONDS)) * inputMagnitude;
    this.player.position.addScaledVector(this.direction, step);
    // モデルの正面はローカル-Z。Three.jsのY回転では正の角度が-Zを-X側へ向ける。
    this.player.rotation.y = Math.atan2(-this.direction.x, -this.direction.z);
  }
}
