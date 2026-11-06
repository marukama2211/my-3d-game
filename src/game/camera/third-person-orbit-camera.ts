import { MathUtils, Object3D, PerspectiveCamera, TOUCH, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const MIN_POLAR_ANGLE = MathUtils.degToRad(22);
const MAX_POLAR_ANGLE = MathUtils.degToRad(85);

/** Three.js OrbitControlsをゲーム向け三人称カメラとして設定する。 */
export class ThirdPersonOrbitCamera {
  private readonly controls: OrbitControls;
  private readonly target: Object3D;
  private readonly targetWorldPosition = new Vector3();
  private readonly previousTargetPosition = new Vector3();
  private readonly targetDelta = new Vector3();

  constructor(camera: PerspectiveCamera, target: Object3D, element: HTMLElement | null = null) {
    this.target = target;
    this.controls = new OrbitControls(camera, element);
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.65;
    this.controls.minPolarAngle = MIN_POLAR_ANGLE;
    this.controls.maxPolarAngle = MAX_POLAR_ANGLE;
    this.controls.touches.TWO = TOUCH.PAN;

    this.target.getWorldPosition(this.previousTargetPosition);
    this.controls.target.copy(this.previousTargetPosition);
    this.controls.update();
  }

  update(): void {
    this.target.getWorldPosition(this.targetWorldPosition);
    this.targetDelta.subVectors(this.targetWorldPosition, this.previousTargetPosition);
    this.controls.object.position.add(this.targetDelta);
    this.controls.target.copy(this.targetWorldPosition);
    this.previousTargetPosition.copy(this.targetWorldPosition);
    this.controls.update();
  }

  dispose(): void {
    if (this.controls.domElement !== null) this.controls.dispose();
  }
}
