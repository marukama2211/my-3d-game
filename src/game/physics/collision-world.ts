import { Box3, Object3D, Raycaster, Vector3 } from "three";
import type { Intersection } from "three";
import { Capsule } from "three/addons/math/Capsule.js";

const COLLISION_EPSILON = 1e-5;

export type VerticalCollisionResult = {
  blocked: boolean;
  grounded: boolean;
};

/** 静的なBox3障害物、水平な地面、カメラ位置の物理衝突を扱う軽量ワールド。 */
export class CollisionWorld {
  private readonly colliders: Array<{ object: Object3D; bounds: Box3 }> = [];
  private readonly colliderObjects: Object3D[] = [];
  private readonly intersections: Intersection<Object3D>[] = [];
  private readonly offset = new Vector3();
  private readonly cameraPosition = new Vector3();
  private readonly nearestPoint = new Vector3();
  private readonly raycaster = new Raycaster();
  private readonly rayDirection = new Vector3();

  constructor(readonly groundY: number) {}

  addCollider(object: Object3D): void {
    object.updateWorldMatrix(true, false);
    const bounds = new Box3().setFromObject(object);
    if (!bounds.isEmpty()) {
      this.colliders.push({ object, bounds });
      this.colliderObjects.push(object);
    }
  }

  /** 一歩を細分化し、X/Z軸を個別に解決して壁沿いの移動を保つ。 */
  moveHorizontal(capsule: Capsule, deltaX: number, deltaZ: number): void {
    const maxStep = Math.max(capsule.radius * 0.5, 0.05);
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(deltaX), Math.abs(deltaZ)) / maxStep));
    const stepX = deltaX / steps;
    const stepZ = deltaZ / steps;

    for (let i = 0; i < steps; i += 1) {
      if (stepX !== 0) {
        this.offset.set(stepX, 0, 0);
        capsule.translate(this.offset);
        if (this.intersectsAny(capsule)) {
          this.offset.set(-stepX, 0, 0);
          capsule.translate(this.offset);
        }
      }
      if (stepZ !== 0) {
        this.offset.set(0, 0, stepZ);
        capsule.translate(this.offset);
        if (this.intersectsAny(capsule)) {
          this.offset.set(0, 0, -stepZ);
          capsule.translate(this.offset);
        }
      }
    }
  }

  /** 重力・ジャンプの垂直移動を地面や障害物上面で止める。 */
  moveVertical(capsule: Capsule, deltaY: number): VerticalCollisionResult {
    if (deltaY === 0) {
      return { blocked: false, grounded: Math.abs(capsule.start.y - capsule.radius - this.groundY) < COLLISION_EPSILON };
    }

    const maxStep = Math.max(capsule.radius * 0.5, 0.05);
    const steps = Math.max(1, Math.ceil(Math.abs(deltaY) / maxStep));
    const stepY = deltaY / steps;
    let grounded = false;

    for (let i = 0; i < steps; i += 1) {
      const previousFeet = capsule.start.y - capsule.radius;
      this.offset.set(0, stepY, 0);
      capsule.translate(this.offset);
      const currentFeet = capsule.start.y - capsule.radius;

      if (stepY < 0) {
        let landingHeight = currentFeet <= this.groundY ? this.groundY : Number.NEGATIVE_INFINITY;
        for (const collider of this.colliders) {
          const top = collider.bounds.max.y;
          if (previousFeet + COLLISION_EPSILON < top || currentFeet > top) continue;
          if (this.overlapsHorizontal(capsule, collider.bounds) && top > landingHeight) landingHeight = top;
        }

        if (Number.isFinite(landingHeight)) {
          this.offset.set(0, landingHeight - currentFeet, 0);
          capsule.translate(this.offset);
          grounded = true;
          return { blocked: true, grounded };
        }
      }

      if (this.intersectsAny(capsule)) {
        this.offset.set(0, -stepY, 0);
        capsule.translate(this.offset);
        return { blocked: true, grounded: false };
      }
    }

    return { blocked: false, grounded };
  }

  /**
   * カメラ球が障害物の内部へ入る場合だけ、最も遠い安全な位置まで距離を制約する。
   * targetからdesiredPositionへの視線上に障害物があっても、カメラ位置自体が空いていれば距離を変えない。
   */
  resolveCameraDistance(
    target: Vector3,
    direction: Vector3,
    desiredDistance: number,
    minimumDistance: number,
    cameraRadius = 0.22,
  ): number {
    const maximumDistance = Math.max(minimumDistance, desiredDistance);
    if (!this.isCameraPositionBlocked(target, direction, maximumDistance, cameraRadius)) return maximumDistance;

    // 複数の障害物で距離帯が分断されても、最小距離へ過剰に寄せず、
    // 希望位置から内側へ調べて最初に見つかる（最も遠い）安全位置を選ぶ。
    const range = maximumDistance - minimumDistance;
    const sampleStep = Math.max(cameraRadius * 0.5, 0.05);
    const sampleCount = Math.max(1, Math.ceil(range / sampleStep));
    let previousBlockedDistance = maximumDistance;
    for (let sample = 1; sample <= sampleCount; sample += 1) {
      const candidate = maximumDistance - (range * sample) / sampleCount;
      if (this.isCameraPositionBlocked(target, direction, candidate, cameraRadius)) {
        previousBlockedDistance = candidate;
        continue;
      }

      let safeDistance = candidate;
      let blockedDistance = previousBlockedDistance;
      for (let iteration = 0; iteration < 12; iteration += 1) {
        const midpoint = (safeDistance + blockedDistance) * 0.5;
        if (this.isCameraPositionBlocked(target, direction, midpoint, cameraRadius)) {
          blockedDistance = midpoint;
        } else {
          safeDistance = midpoint;
        }
      }
      return safeDistance;
    }

    // 最小距離を含めても空きがなければ、定めた下限を優先する。
    return minimumDistance;
  }

  /** 水平地面をカメラ球が貫通しない最大距離。下向き回転に限り距離を短くする。 */
  resolveGroundCameraDistance(
    target: Vector3,
    direction: Vector3,
    desiredDistance: number,
    cameraRadius = 0.22,
  ): number {
    if (direction.y >= -COLLISION_EPSILON) return desiredDistance;
    const availableHeight = target.y - this.groundY - cameraRadius;
    if (availableHeight <= 0) return 0;
    return Math.min(desiredDistance, availableHeight / -direction.y);
  }

  /** 指定した視線候補がすべて障害物に遮られているかを調べる。 */
  areCameraTargetsFullyOccluded(cameraPosition: Vector3, targets: Vector3[]): boolean {
    return targets.length > 0 && targets.every((target) => this.isCameraTargetOccluded(cameraPosition, target));
  }

  /** 完全遮蔽時、内側へ探して最初に視線が通る距離を返す。 */
  findVisibleCameraDistance(
    target: Vector3,
    direction: Vector3,
    startDistance: number,
    minimumDistance: number,
    visibilityTargets: Vector3[],
    cameraRadius = 0.22,
  ): number {
    if (startDistance <= minimumDistance) return startDistance;
    this.cameraPosition.copy(target).addScaledVector(direction, startDistance);
    if (!this.areCameraTargetsFullyOccluded(this.cameraPosition, visibilityTargets)) return startDistance;

    const range = startDistance - minimumDistance;
    const samples = Math.max(1, Math.ceil(range / 0.2));
    for (let sample = 1; sample <= samples; sample += 1) {
      const requestedDistance = startDistance - (range * sample) / samples;
      const objectSafeDistance = this.resolveCameraDistance(
        target,
        direction,
        requestedDistance,
        minimumDistance,
        cameraRadius,
      );
      const safeDistance = this.resolveGroundCameraDistance(
        target,
        direction,
        objectSafeDistance,
        cameraRadius,
      );
      this.cameraPosition.copy(target).addScaledVector(direction, safeDistance);
      if (!this.areCameraTargetsFullyOccluded(this.cameraPosition, visibilityTargets)) return safeDistance;
    }
    return minimumDistance;
  }

  private isCameraTargetOccluded(cameraPosition: Vector3, target: Vector3): boolean {
    this.rayDirection.subVectors(target, cameraPosition);
    const distance = this.rayDirection.length();
    if (distance <= 0.08 || this.colliderObjects.length === 0) return false;
    this.rayDirection.multiplyScalar(1 / distance);
    this.raycaster.set(cameraPosition, this.rayDirection);
    this.raycaster.far = distance - 0.08;
    this.intersections.length = 0;
    return this.raycaster.intersectObjects(this.colliderObjects, false, this.intersections).length > 0;
  }

  private isCameraPositionBlocked(
    target: Vector3,
    direction: Vector3,
    distance: number,
    cameraRadius: number,
  ): boolean {
    this.cameraPosition.copy(target).addScaledVector(direction, distance);
    const radiusSquared = cameraRadius * cameraRadius;
    return this.colliders.some(({ bounds }) => {
      bounds.clampPoint(this.cameraPosition, this.nearestPoint);
      return this.cameraPosition.distanceToSquared(this.nearestPoint) < radiusSquared;
    });
  }

  private intersectsAny(capsule: Capsule): boolean {
    return this.colliders.some(({ bounds }) => capsule.intersectsBox(bounds));
  }

  private overlapsHorizontal(capsule: Capsule, bounds: Box3): boolean {
    const centerX = (capsule.start.x + capsule.end.x) * 0.5;
    const centerZ = (capsule.start.z + capsule.end.z) * 0.5;
    const nearestX = Math.max(bounds.min.x, Math.min(centerX, bounds.max.x));
    const nearestZ = Math.max(bounds.min.z, Math.min(centerZ, bounds.max.z));
    return (centerX - nearestX) ** 2 + (centerZ - nearestZ) ** 2 <= capsule.radius ** 2;
  }
}
