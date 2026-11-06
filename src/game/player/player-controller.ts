import { Camera, Object3D, Vector2, Vector3 } from "three";
import { Capsule } from "three/addons/math/Capsule.js";
import { CollisionWorld } from "../physics/collision-world";

const UP = new Vector3(0, 1, 0);
const MAX_FRAME_SECONDS = 0.05;
const COLLIDER_RADIUS = 0.38;
const COLLIDER_HEIGHT = 1.64;
const GRAVITY = 18;
const JUMP_SPEED = 6.4;

/** カメラ相対の水平移動と移動方向への旋回を処理する。 */
export class PlayerController {
  readonly speed = 3.4;
  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly direction = new Vector3();
  private readonly capsule: Capsule;
  private verticalVelocity = 0;
  private grounded: boolean;

  constructor(readonly player: Object3D, private readonly collisionWorld: CollisionWorld) {
    const feetY = player.position.y;
    this.capsule = new Capsule(
      new Vector3(player.position.x, feetY + COLLIDER_RADIUS, player.position.z),
      new Vector3(player.position.x, feetY + COLLIDER_HEIGHT - COLLIDER_RADIUS, player.position.z),
      COLLIDER_RADIUS,
    );
    this.grounded = Math.abs(feetY - collisionWorld.groundY) < 0.05;
  }

  update(movement: Vector2, deltaSeconds: number, camera: Camera, jumpPressed = false): void {
    camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 1e-8) this.forward.set(0, 0, -1);
    else this.forward.normalize();
    this.right.crossVectors(this.forward, UP).normalize();

    this.direction.set(0, 0, 0)
      .addScaledVector(this.right, movement.x)
      .addScaledVector(this.forward, movement.y);
    const inputMagnitude = Math.min(this.direction.length(), 1);
    const stepSeconds = Math.max(0, Math.min(deltaSeconds, MAX_FRAME_SECONDS));
    if (inputMagnitude > 0) {
      this.direction.normalize();
      this.collisionWorld.moveHorizontal(
        this.capsule,
        this.direction.x * this.speed * stepSeconds * inputMagnitude,
        this.direction.z * this.speed * stepSeconds * inputMagnitude,
      );
      // モデルの正面はローカル-Z。Three.jsのY回転では正の角度が-Zを-X側へ向ける。
      this.player.rotation.y = Math.atan2(-this.direction.x, -this.direction.z);
    }

    if (jumpPressed && this.grounded) {
      this.verticalVelocity = JUMP_SPEED;
      this.grounded = false;
    }

    this.verticalVelocity -= GRAVITY * stepSeconds;
    const verticalResult = this.collisionWorld.moveVertical(this.capsule, this.verticalVelocity * stepSeconds);
    if (verticalResult.blocked) this.verticalVelocity = 0;
    this.grounded = verticalResult.grounded;

    this.player.position.set(
      this.capsule.start.x,
      this.capsule.start.y - COLLIDER_RADIUS,
      this.capsule.start.z,
    );
  }

  get isGrounded(): boolean { return this.grounded; }
}
