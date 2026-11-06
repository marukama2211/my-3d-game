import { Vector2 } from "three";

const DEAD_ZONE = 0.12;
const MAX_STICK_RADIUS = 72;
const MIN_STICK_RADIUS = 48;

/** スティック変位を、デッドゾーンと最大半径を反映した移動入力へ変換する。 */
export function calculateStickVector(
  deltaX: number,
  deltaY: number,
  radius: number,
  deadZone = DEAD_ZONE,
  out = new Vector2(),
): Vector2 {
  if (radius <= 0) return out.set(0, 0);
  const distance = Math.hypot(deltaX, deltaY);
  const rawMagnitude = Math.min(distance / radius, 1);
  if (rawMagnitude <= deadZone || distance === 0) return out.set(0, 0);

  const magnitude = (rawMagnitude - deadZone) / (1 - deadZone);
  return out.set((deltaX / distance) * magnitude, (-deltaY / distance) * magnitude);
}

/** Android等のタッチ入力で使う、タッチ中だけ現れるフローティングスティック。 */
export class TouchMovementInput {
  private readonly movementZone: HTMLDivElement;
  private readonly cameraZone: HTMLDivElement;
  private readonly stickBase: HTMLDivElement;
  private readonly stickKnob: HTMLDivElement;
  private readonly movement = new Vector2();
  private movementPointerId: number | null = null;
  private readonly cameraPointerIds = new Set<number>();
  private anchorX = 0;
  private anchorY = 0;
  private radius = MAX_STICK_RADIUS;

  private readonly onMovementDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse") return;
    event.preventDefault();
    event.stopPropagation();
    if (this.movementPointerId !== null || event.button !== 0) return;

    this.movementPointerId = event.pointerId;
    this.radius = this.getRadius();
    const rect = this.movementZone.getBoundingClientRect();
    const inset = this.radius + 12;
    this.anchorX = this.clamp(event.clientX - rect.left, inset, Math.max(inset, rect.width - inset));
    this.anchorY = this.clamp(event.clientY - rect.top, inset, Math.max(inset, rect.height - inset));
    this.stickBase.style.width = `${this.radius * 2}px`;
    this.stickBase.style.height = `${this.radius * 2}px`;
    this.stickBase.style.left = `${this.anchorX}px`;
    this.stickBase.style.top = `${this.anchorY}px`;
    this.stickBase.classList.add("is-visible");
    this.updateStick(event.clientX, event.clientY, rect);
    this.movementZone.setPointerCapture(event.pointerId);
  };

  private readonly onMovementMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.movementPointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.updateStick(event.clientX, event.clientY, this.movementZone.getBoundingClientRect());
  };

  private readonly onMovementEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.movementPointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.resetMovement();
  };

  private readonly onCameraDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse") return;
    if (this.cameraPointerIds.size >= 2 || event.button !== 0) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.cameraPointerIds.add(event.pointerId);
  };

  private readonly onCameraEnd = (event: PointerEvent): void => {
    this.cameraPointerIds.delete(event.pointerId);
  };

  private readonly onWindowBlur = (): void => {
    this.resetMovement();
    this.cameraPointerIds.clear();
  };
  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") this.onWindowBlur();
  };

  constructor(private readonly container: HTMLElement, private readonly eventWindow: Window = window) {
    this.movementZone = document.createElement("div");
    this.movementZone.className = "touch-zone touch-zone--movement";
    this.movementZone.setAttribute("aria-label", "左側をドラッグして移動");

    this.cameraZone = document.createElement("div");
    this.cameraZone.className = "touch-zone touch-zone--camera";
    this.cameraZone.setAttribute("aria-label", "右側をスワイプして視点を操作");

    this.stickBase = document.createElement("div");
    this.stickBase.className = "virtual-stick__base";
    this.stickKnob = document.createElement("div");
    this.stickKnob.className = "virtual-stick__knob";
    this.stickBase.append(this.stickKnob);
    this.movementZone.append(this.stickBase);
    container.append(this.movementZone, this.cameraZone);

    this.movementZone.addEventListener("pointerdown", this.onMovementDown);
    this.movementZone.addEventListener("pointermove", this.onMovementMove);
    this.movementZone.addEventListener("pointerup", this.onMovementEnd);
    this.movementZone.addEventListener("pointercancel", this.onMovementEnd);
    this.movementZone.addEventListener("lostpointercapture", this.onMovementEnd);
    this.cameraZone.addEventListener("pointerdown", this.onCameraDown);
    container.addEventListener("pointerup", this.onCameraEnd);
    container.addEventListener("pointercancel", this.onCameraEnd);
    container.addEventListener("lostpointercapture", this.onCameraEnd);
    eventWindow.addEventListener("blur", this.onWindowBlur);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  isActive(): boolean {
    return this.movementPointerId !== null;
  }

  read(out = new Vector2()): Vector2 {
    return out.copy(this.movement);
  }

  dispose(): void {
    this.resetMovement();
    this.movementZone.removeEventListener("pointerdown", this.onMovementDown);
    this.movementZone.removeEventListener("pointermove", this.onMovementMove);
    this.movementZone.removeEventListener("pointerup", this.onMovementEnd);
    this.movementZone.removeEventListener("pointercancel", this.onMovementEnd);
    this.movementZone.removeEventListener("lostpointercapture", this.onMovementEnd);
    this.cameraZone.removeEventListener("pointerdown", this.onCameraDown);
    this.container.removeEventListener("pointerup", this.onCameraEnd);
    this.container.removeEventListener("pointercancel", this.onCameraEnd);
    this.container.removeEventListener("lostpointercapture", this.onCameraEnd);
    this.eventWindow.removeEventListener("blur", this.onWindowBlur);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.movementZone.remove();
    this.cameraZone.remove();
  }

  private updateStick(clientX: number, clientY: number, rect: DOMRect): void {
    const dx = clientX - rect.left - this.anchorX;
    const dy = clientY - rect.top - this.anchorY;
    this.calculateInput(dx, dy);
    const length = Math.hypot(dx, dy);
    const scale = length > this.radius ? this.radius / length : 1;
    this.stickKnob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
  }

  private calculateInput(dx: number, dy: number): void {
    calculateStickVector(dx, dy, this.radius, DEAD_ZONE, this.movement);
  }

  private getRadius(): number {
    const shortSide = Math.min(this.container.clientWidth, this.container.clientHeight);
    return this.clamp(shortSide * 0.1, MIN_STICK_RADIUS, MAX_STICK_RADIUS);
  }

  private resetMovement(): void {
    const pointerId = this.movementPointerId;
    this.movementPointerId = null;
    this.movement.set(0, 0);
    this.stickBase.classList.remove("is-visible");
    this.stickKnob.style.transform = "translate(0px, 0px)";
    if (pointerId !== null && this.movementZone.hasPointerCapture(pointerId)) {
      this.movementZone.releasePointerCapture(pointerId);
    }
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
