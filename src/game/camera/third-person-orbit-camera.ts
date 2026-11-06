import { MathUtils, Object3D, PerspectiveCamera, TOUCH, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CollisionWorld } from "../physics/collision-world";

const POLAR_ANGLE_EPSILON = 1e-3;
export const MIN_CAMERA_DISTANCE = 5.2;
export const MAX_CAMERA_DISTANCE = 14;
const CAMERA_COLLISION_RADIUS = 0.22;
const COLLISION_DAMPING = 10;
const OCCLUSION_CONFIRM_SECONDS = 0.12;
const CAMERA_MIN_SAFE_DISTANCE = 0.05;
// 自動遮蔽回避だけはユーザーズームの下限を越えて近づける（ユーザー指定距離自体は変更しない）。
const OCCLUSION_MIN_DISTANCE = 2.8;
const VISIBILITY_TARGET_OFFSETS = [-0.35, 0, 0.35] as const;

/** Three.js OrbitControlsをゲーム向け三人称カメラとして設定する。 */
export class ThirdPersonOrbitCamera {
  private readonly controls: OrbitControls;
  private readonly target: Object3D;
  private readonly targetWorldPosition = new Vector3();
  private readonly previousTargetPosition = new Vector3();
  private readonly targetDelta = new Vector3();
  private readonly desiredOffset = new Vector3();
  private readonly desiredCameraPosition = new Vector3();
  private readonly visibilityTargets = VISIBILITY_TARGET_OFFSETS.map(() => new Vector3());
  private readonly collisionWorld?: CollisionWorld;
  private userDistance: number;
  private collisionDistance: number;
  private visibilityDistance: number;
  private actualDistance: number;
  private occlusionDuration = 0;
  private visibilitySearchCooldown = 0;

  constructor(
    camera: PerspectiveCamera,
    target: Object3D,
    element: HTMLElement | null = null,
    collisionWorld?: CollisionWorld,
  ) {
    this.target = target;
    this.collisionWorld = collisionWorld;
    this.controls = new OrbitControls(camera, element);
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.minDistance = MIN_CAMERA_DISTANCE;
    this.controls.maxDistance = MAX_CAMERA_DISTANCE;
    this.controls.zoomSpeed = 0.8;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.65;
    this.controls.minPolarAngle = POLAR_ANGLE_EPSILON;
    this.controls.maxPolarAngle = Math.PI - POLAR_ANGLE_EPSILON;
    this.controls.touches.TWO = TOUCH.DOLLY_PAN;

    this.target.getWorldPosition(this.previousTargetPosition);
    this.controls.target.copy(this.previousTargetPosition);
    this.controls.update();
    this.userDistance = camera.position.distanceTo(this.previousTargetPosition);
    this.collisionDistance = this.userDistance;
    this.visibilityDistance = this.userDistance;
    this.actualDistance = this.userDistance;
  }

  update(deltaSeconds = 1 / 60): void {
    this.target.getWorldPosition(this.targetWorldPosition);
    this.targetDelta.subVectors(this.targetWorldPosition, this.previousTargetPosition);
    this.controls.object.position.add(this.targetDelta);
    this.controls.target.copy(this.targetWorldPosition);
    this.previousTargetPosition.copy(this.targetWorldPosition);

    // 衝突で短くなった実位置からユーザー指定距離へ戻し、OrbitControlsの入力状態を保つ。
    if (this.collisionWorld) {
      this.desiredOffset.subVectors(this.controls.object.position, this.targetWorldPosition);
      if (this.desiredOffset.lengthSq() > 1e-8) {
        this.desiredOffset.setLength(this.userDistance);
        this.controls.object.position.copy(this.targetWorldPosition).add(this.desiredOffset);
      }
    }

    this.controls.update();
    this.userDistance = MathUtils.clamp(
      this.controls.object.position.distanceTo(this.targetWorldPosition),
      MIN_CAMERA_DISTANCE,
      MAX_CAMERA_DISTANCE,
    );

    if (this.collisionWorld) {
      this.desiredOffset.subVectors(this.controls.object.position, this.targetWorldPosition);
      if (this.desiredOffset.lengthSq() > 1e-8) {
        this.desiredOffset.normalize();
        const obstacleDistance = this.collisionWorld.resolveCameraDistance(
          this.targetWorldPosition,
          this.desiredOffset,
          this.userDistance,
          MIN_CAMERA_DISTANCE,
          CAMERA_COLLISION_RADIUS,
        );
        this.collisionDistance = this.collisionWorld.resolveGroundCameraDistance(
          this.targetWorldPosition,
          this.desiredOffset,
          obstacleDistance,
          CAMERA_COLLISION_RADIUS,
        );

        VISIBILITY_TARGET_OFFSETS.forEach((heightOffset, index) => {
          this.visibilityTargets[index]
            .copy(this.targetWorldPosition)
            .y += heightOffset;
        });
        this.desiredCameraPosition.copy(this.targetWorldPosition)
          .addScaledVector(this.desiredOffset, this.collisionDistance);
        const fullyOccluded = this.collisionWorld.areCameraTargetsFullyOccluded(
          this.desiredCameraPosition,
          this.visibilityTargets,
        );
        const interpolationDelta = Math.min(Math.max(0, deltaSeconds), 0.05);
        this.visibilitySearchCooldown = Math.max(0, this.visibilitySearchCooldown - interpolationDelta);
        if (fullyOccluded) {
          this.occlusionDuration += interpolationDelta;
          if (this.occlusionDuration >= OCCLUSION_CONFIRM_SECONDS && this.visibilitySearchCooldown === 0) {
            this.visibilityDistance = this.collisionWorld.findVisibleCameraDistance(
              this.targetWorldPosition,
              this.desiredOffset,
              this.collisionDistance,
              OCCLUSION_MIN_DISTANCE,
              this.visibilityTargets,
              CAMERA_COLLISION_RADIUS,
            );
            this.visibilitySearchCooldown = 0.1;
          } else {
            if (this.occlusionDuration < OCCLUSION_CONFIRM_SECONDS) {
              this.visibilityDistance = this.userDistance;
            }
          }
        } else {
          this.occlusionDuration = 0;
          this.visibilitySearchCooldown = 0;
          this.visibilityDistance = this.userDistance;
        }

        const interpolation = 1 - Math.exp(-COLLISION_DAMPING * interpolationDelta);
        const constrainedDistance = Math.min(this.collisionDistance, this.visibilityDistance);
        this.actualDistance += (constrainedDistance - this.actualDistance) * interpolation;
        this.actualDistance = MathUtils.clamp(
          this.actualDistance,
          CAMERA_MIN_SAFE_DISTANCE,
          this.userDistance,
        );
        // 距離の復帰は補間しつつ、壁・床へ実際のカメラ球が侵入するフレームは安全位置で制限する。
        this.actualDistance = Math.min(
          this.actualDistance,
          this.collisionWorld.resolveCameraDistance(
            this.targetWorldPosition,
            this.desiredOffset,
            this.actualDistance,
            Math.min(MIN_CAMERA_DISTANCE, this.actualDistance),
            CAMERA_COLLISION_RADIUS,
          ),
        );
        this.actualDistance = this.collisionWorld.resolveGroundCameraDistance(
          this.targetWorldPosition,
          this.desiredOffset,
          this.actualDistance,
          CAMERA_COLLISION_RADIUS,
        );
        this.desiredOffset.setLength(this.actualDistance);
        this.desiredCameraPosition.copy(this.targetWorldPosition).add(this.desiredOffset);
        this.controls.object.position.copy(this.desiredCameraPosition);
      }
    } else {
      this.collisionDistance = this.userDistance;
      this.visibilityDistance = this.userDistance;
      this.actualDistance = this.userDistance;
    }
  }

  dispose(): void {
    if (this.controls.domElement !== null) this.controls.dispose();
  }
}
