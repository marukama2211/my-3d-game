import assert from "node:assert/strict";
import test from "node:test";
import { Object3D, PerspectiveCamera, Vector3 } from "three";
import { ThirdPersonOrbitCamera } from "../src/game/camera/third-person-orbit-camera.ts";

type PointerDetails = {
  pointerId?: number;
  pointerType?: string;
  button?: number;
  clientX?: number;
  clientY?: number;
  pageX?: number;
  pageY?: number;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
};

class FakePointerElement extends EventTarget {
  readonly style = { touchAction: "auto" };
  readonly clientWidth = 800;
  readonly clientHeight = 600;

  getRootNode(): Node {
    return this as unknown as Node;
  }

  setPointerCapture(_pointerId: number): void {}
  releasePointerCapture(_pointerId: number): void {}
}

function pointerEvent(type: string, details: PointerDetails): Event {
  const event = new Event(type, { cancelable: true });
  for (const [key, value] of Object.entries(details)) {
    Object.defineProperty(event, key, { value });
  }
  return event;
}

function createCameraRig(element: FakePointerElement | null = null) {
  const target = new Object3D();
  const camera = new PerspectiveCamera(38, 4 / 3, 0.1, 100);
  camera.position.set(4.2, 3.1, 6.2);
  camera.lookAt(target.position);
  const orbitCamera = new ThirdPersonOrbitCamera(camera, target, element as unknown as HTMLElement | null);
  return { camera, target, orbitCamera };
}

function polarAngle(camera: PerspectiveCamera, target: Object3D): number {
  const offset = camera.position.clone().sub(target.getWorldPosition(new Vector3()));
  return Math.acos(Math.max(-1, Math.min(1, offset.normalize().y)));
}

function assertCameraLooksAt(camera: PerspectiveCamera, target: Object3D): void {
  camera.updateMatrixWorld(true);
  const projectedTarget = target.getWorldPosition(new Vector3()).project(camera);
  assert.ok(Math.abs(projectedTarget.x) < 1e-5);
  assert.ok(Math.abs(projectedTarget.y) < 1e-5);
}

test("初期カメラを維持し、対象が移動すると同じ距離で追従する", () => {
  const { camera, target, orbitCamera } = createCameraRig();
  const initialPosition = camera.position.clone();
  const initialDistance = camera.position.distanceTo(target.position);

  assert.ok(camera.position.distanceTo(initialPosition) < 1e-6);
  target.position.set(3, 1, -2);
  orbitCamera.update();

  assert.ok(Math.abs(camera.position.distanceTo(target.position) - initialDistance) < 1e-5);
  assertCameraLooksAt(camera, target);
  orbitCamera.dispose();
});

test("マウスドラッグで回転し、オービット距離は保たれる", () => {
  const element = new FakePointerElement();
  const { camera, target, orbitCamera } = createCameraRig(element);
  const initialPosition = camera.position.clone();
  const initialDistance = camera.position.distanceTo(target.position);

  element.dispatchEvent(pointerEvent("pointerdown", {
    pointerId: 1, pointerType: "mouse", button: 0, clientX: 400, clientY: 300,
  }));
  element.dispatchEvent(pointerEvent("pointermove", {
    pointerId: 1, pointerType: "mouse", button: 0, clientX: 500, clientY: 300,
  }));
  orbitCamera.update();
  element.dispatchEvent(pointerEvent("pointerup", {
    pointerId: 1, pointerType: "mouse", button: 0, clientX: 500, clientY: 300,
  }));

  assert.ok(camera.position.distanceTo(initialPosition) > 0.1);
  assert.ok(Math.abs(camera.position.distanceTo(target.position) - initialDistance) < 1e-5);
  assertCameraLooksAt(camera, target);
  orbitCamera.dispose();
});

test("垂直角度を上下限内に制限する", () => {
  const element = new FakePointerElement();
  const { camera, target, orbitCamera } = createCameraRig(element);

  element.dispatchEvent(pointerEvent("pointerdown", {
    pointerId: 1, pointerType: "mouse", button: 0, clientX: 400, clientY: 300,
  }));
  element.dispatchEvent(pointerEvent("pointermove", {
    pointerId: 1, pointerType: "mouse", button: 0, clientX: 400, clientY: 1200,
  }));
  orbitCamera.update();
  element.dispatchEvent(pointerEvent("pointerup", {
    pointerId: 1, pointerType: "mouse", button: 0, clientX: 400, clientY: 1200,
  }));

  const angleDegrees = (polarAngle(camera, target) * 180) / Math.PI;
  assert.ok(angleDegrees >= 22 - 1e-4);
  assert.ok(angleDegrees <= 85 + 1e-4);
  orbitCamera.dispose();
});

test("タッチドラッグで回転し、キャンバスのタッチスクロールを抑止する", () => {
  const element = new FakePointerElement();
  const { camera, target, orbitCamera } = createCameraRig(element);
  const initialPosition = camera.position.clone();

  element.dispatchEvent(pointerEvent("pointerdown", {
    pointerId: 2, pointerType: "touch", button: 0,
    clientX: 400, clientY: 300, pageX: 400, pageY: 300,
  }));
  element.dispatchEvent(pointerEvent("pointermove", {
    pointerId: 2, pointerType: "touch", button: 0,
    clientX: 480, clientY: 320, pageX: 480, pageY: 320,
  }));
  orbitCamera.update();
  element.dispatchEvent(pointerEvent("pointerup", {
    pointerId: 2, pointerType: "touch", button: 0,
    clientX: 480, clientY: 320, pageX: 480, pageY: 320,
  }));

  assert.ok(camera.position.distanceTo(initialPosition) > 0.1);
  assert.equal(element.style.touchAction, "none");
  assertCameraLooksAt(camera, target);
  orbitCamera.dispose();
  assert.equal(element.style.touchAction, "auto");
});

test("パン操作とズーム入力ではカメラが移動しない", () => {
  const element = new FakePointerElement();
  const { camera, target, orbitCamera } = createCameraRig(element);
  const initialPosition = camera.position.clone();

  element.dispatchEvent(pointerEvent("pointerdown", {
    pointerId: 3, pointerType: "mouse", button: 2, clientX: 400, clientY: 300,
  }));
  element.dispatchEvent(pointerEvent("pointermove", {
    pointerId: 3, pointerType: "mouse", button: 2, clientX: 500, clientY: 350,
  }));
  orbitCamera.update();
  element.dispatchEvent(pointerEvent("pointerup", {
    pointerId: 3, pointerType: "mouse", button: 2, clientX: 500, clientY: 350,
  }));

  const wheelEvent = new Event("wheel", { cancelable: true });
  Object.defineProperty(wheelEvent, "deltaY", { value: -120 });
  element.dispatchEvent(wheelEvent);
  orbitCamera.update();

  assert.ok(camera.position.distanceTo(initialPosition) < 1e-5);
  assertCameraLooksAt(camera, target);
  orbitCamera.dispose();
});
