import assert from "node:assert/strict";
import test from "node:test";
import { BoxGeometry, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, Vector3 } from "three";
import {
  MAX_CAMERA_DISTANCE,
  MIN_CAMERA_DISTANCE,
  ThirdPersonOrbitCamera,
} from "../src/game/camera/third-person-orbit-camera.ts";
import { CollisionWorld } from "../src/game/physics/collision-world.ts";

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

function wheelEvent(deltaY: number): Event {
  const event = new Event("wheel", { cancelable: true });
  Object.defineProperty(event, "deltaY", { value: deltaY });
  return event;
}

function createCameraRig(element: FakePointerElement | null = null, collisionWorld?: CollisionWorld) {
  const target = new Object3D();
  const camera = new PerspectiveCamera(38, 4 / 3, 0.1, 100);
  camera.position.set(4.2, 3.1, 6.2);
  camera.lookAt(target.position);
  const orbitCamera = new ThirdPersonOrbitCamera(
    camera,
    target,
    element as unknown as HTMLElement | null,
    collisionWorld,
  );
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

test("垂直角度をほぼ真上からほぼ真下まで回転できる", () => {
  const element = new FakePointerElement();
  const { camera, target, orbitCamera } = createCameraRig(element);

  element.dispatchEvent(pointerEvent("pointerdown", {
    pointerId: 1, pointerType: "mouse", button: 0, clientX: 400, clientY: 300,
  }));
  element.dispatchEvent(pointerEvent("pointermove", {
    pointerId: 1, pointerType: "mouse", button: 0, clientX: 400, clientY: 2300,
  }));
  for (let index = 0; index < 80; index += 1) orbitCamera.update();
  element.dispatchEvent(pointerEvent("pointerup", {
    pointerId: 1, pointerType: "mouse", button: 0, clientX: 400, clientY: 2300,
  }));

  const angleDegrees = (polarAngle(camera, target) * 180) / Math.PI;
  assert.ok(angleDegrees >= 0 && angleDegrees < 1, `camera should rotate close to overhead, got ${angleDegrees}`);
  orbitCamera.dispose();

  const inverted = createCameraRig(element);
  element.dispatchEvent(pointerEvent("pointerdown", {
    pointerId: 4, pointerType: "mouse", button: 0, clientX: 400, clientY: 300,
  }));
  element.dispatchEvent(pointerEvent("pointermove", {
    pointerId: 4, pointerType: "mouse", button: 0, clientX: 400, clientY: -1700,
  }));
  for (let index = 0; index < 80; index += 1) inverted.orbitCamera.update();
  const invertedAngle = (polarAngle(inverted.camera, inverted.target) * 180) / Math.PI;
  assert.ok(invertedAngle > 179 && invertedAngle <= 180, `camera should rotate close to underneath, got ${invertedAngle}`);
  inverted.orbitCamera.dispose();
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

test("パンは無効のまま、マウスホイールで最小・最大距離内をズームする", () => {
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
  assert.ok(camera.position.distanceTo(initialPosition) < 1e-5, "middle-button pan remains disabled");

  element.dispatchEvent(wheelEvent(-120));
  orbitCamera.update();

  assert.ok(camera.position.distanceTo(initialPosition) > 0.1);
  assert.ok(camera.position.distanceTo(target.position) < initialPosition.distanceTo(target.position));

  for (let i = 0; i < 100; i += 1) element.dispatchEvent(wheelEvent(-120));
  orbitCamera.update();
  assert.ok(Math.abs(camera.position.distanceTo(target.position) - MIN_CAMERA_DISTANCE) < 1e-5);

  for (let i = 0; i < 100; i += 1) element.dispatchEvent(wheelEvent(120));
  orbitCamera.update();
  assert.ok(Math.abs(camera.position.distanceTo(target.position) - MAX_CAMERA_DISTANCE) < 1e-5);
  assertCameraLooksAt(camera, target);
  orbitCamera.dispose();
});

test("右側相当の2本指Pointer Eventsでピンチズームできる", () => {
  const element = new FakePointerElement();
  const { camera, target, orbitCamera } = createCameraRig(element);
  const initialDistance = camera.position.distanceTo(target.position);

  element.dispatchEvent(pointerEvent("pointerdown", {
    pointerId: 11, pointerType: "touch", button: 0, clientX: 250, clientY: 300, pageX: 250, pageY: 300,
  }));
  element.dispatchEvent(pointerEvent("pointerdown", {
    pointerId: 12, pointerType: "touch", button: 0, clientX: 450, clientY: 300, pageX: 450, pageY: 300,
  }));
  element.dispatchEvent(pointerEvent("pointermove", {
    pointerId: 12, pointerType: "touch", button: 0, clientX: 520, clientY: 300, pageX: 520, pageY: 300,
  }));
  orbitCamera.update();

  assert.ok(camera.position.distanceTo(target.position) < initialDistance);
  assert.ok(camera.position.distanceTo(target.position) >= MIN_CAMERA_DISTANCE);
  assert.ok(camera.position.distanceTo(target.position) <= MAX_CAMERA_DISTANCE);
  assert.equal(element.style.touchAction, "none");

  element.dispatchEvent(pointerEvent("pointerup", {
    pointerId: 12, pointerType: "touch", button: 0, clientX: 520, clientY: 300, pageX: 520, pageY: 300,
  }));
  const afterPinchPosition = camera.position.clone();
  element.dispatchEvent(pointerEvent("pointermove", {
    pointerId: 11, pointerType: "touch", button: 0, clientX: 280, clientY: 320, pageX: 280, pageY: 320,
  }));
  orbitCamera.update();
  assert.ok(camera.position.distanceTo(afterPinchPosition) > 0.1, "one-finger camera rotation resumes after pinch");
  element.dispatchEvent(pointerEvent("pointerup", {
    pointerId: 11, pointerType: "touch", button: 0, clientX: 280, clientY: 320, pageX: 280, pageY: 320,
  }));
  orbitCamera.dispose();
});

test("カメラ自身が障害物に当たる場合だけ距離を滑らかに制限する", () => {
  const element = new FakePointerElement();
  const collisionWorld = new CollisionWorld(0);
  const obstacle = new Mesh(new BoxGeometry(1.4, 1.4, 1.4), new MeshBasicMaterial());
  obstacle.position.set(3.9, 2.9, 5.8);
  collisionWorld.addCollider(obstacle);
  const { camera, target, orbitCamera } = createCameraRig(element, collisionWorld);
  const originalDistance = camera.position.distanceTo(target.position);

  orbitCamera.update(0.1);
  const firstClampedDistance = camera.position.distanceTo(target.position);
  assert.ok(firstClampedDistance < originalDistance);
  assert.ok(firstClampedDistance > MIN_CAMERA_DISTANCE);
  assertCameraLooksAt(camera, target);

  orbitCamera.update(0.1);
  const nextClampedDistance = camera.position.distanceTo(target.position);
  assert.ok(Math.abs(nextClampedDistance - firstClampedDistance) < 0.5);
  orbitCamera.dispose();
});

test("下向きカメラを地面より上に保ち、回転方向を変えず距離を制約する", () => {
  const target = new Object3D();
  target.position.y = 1.05;
  const camera = new PerspectiveCamera(38, 4 / 3, 0.1, 100);
  camera.position.set(0, -5, 0);
  camera.lookAt(target.position);
  const orbitCamera = new ThirdPersonOrbitCamera(camera, target, null, new CollisionWorld(0));

  orbitCamera.update(0.1);

  assert.ok(camera.position.y >= 0.22 - 1e-6, `camera sphere must remain above ground, got y=${camera.position.y}`);
  assert.ok(Math.abs(camera.position.x) < 0.01 && Math.abs(camera.position.z) < 0.01,
    "ground constraint preserves the orbit direction");
  assert.ok(camera.position.distanceTo(target.position) < MIN_CAMERA_DISTANCE,
    "ground collision may temporarily shorten actual distance below the user zoom minimum");
  orbitCamera.dispose();
});

test("視線候補が完全遮蔽されたときだけ確認後にズームし、部分遮蔽では維持する", () => {
  const fullWorld = new CollisionWorld(-10);
  const fullBlocker = new Mesh(new BoxGeometry(3, 3, 0.8), new MeshBasicMaterial());
  fullBlocker.position.set(-2.1, 1.55, 3.1);
  fullWorld.addCollider(fullBlocker);
  const fullElement = new FakePointerElement();
  const full = createCameraRig(fullElement, fullWorld);
  const initialDistance = full.camera.position.distanceTo(full.target.position);

  for (let frame = 0; frame < 5; frame += 1) full.orbitCamera.update(1 / 60);
  assert.ok(Math.abs(full.camera.position.distanceTo(full.target.position) - initialDistance) < 1e-5,
    "an obstacle outside the view must not change camera distance");

  // Simulate a camera orbit that brings the obstacle between the camera and the target.
  full.camera.position.set(-4.2, 3.1, 6.2);
  for (let frame = 0; frame < 30; frame += 1) full.orbitCamera.update(1 / 60);
  const adjustedDistance = full.camera.position.distanceTo(full.target.position);
  assert.ok(adjustedDistance < initialDistance - 0.5,
    `persistent full occlusion should move the camera to a visible position, got ${adjustedDistance}`);

  full.camera.position.set(4.2, 3.1, 6.2);
  let previousDistance = adjustedDistance;
  let minimumDuringRotation = adjustedDistance;
  for (let frame = 0; frame < 90; frame += 1) {
    full.orbitCamera.update(1 / 60);
    const distance = full.camera.position.distanceTo(full.target.position);
    assert.ok(Math.abs(distance - previousDistance) < 0.8,
      "camera distance should transition smoothly while rotation clears the occlusion");
    minimumDuringRotation = Math.min(minimumDuringRotation, distance);
    previousDistance = distance;
  }
  assert.ok(previousDistance > initialDistance - 0.2,
    `camera should smoothly return to the user distance after visibility is restored, got ${previousDistance}`);
  assert.ok(previousDistance > minimumDuringRotation + 0.5,
    "distance should recover after the camera rotates out of the occluded view");
  full.orbitCamera.dispose();

  const partialWorld = new CollisionWorld(-10);
  const partialBlocker = new Mesh(new BoxGeometry(3, 0.12, 0.05), new MeshBasicMaterial());
  partialBlocker.position.set(2.1, 1.55, 3.1);
  partialWorld.addCollider(partialBlocker);
  const partial = createCameraRig(null, partialWorld);
  const partialInitialDistance = partial.camera.position.distanceTo(partial.target.position);

  for (let frame = 0; frame < 30; frame += 1) partial.orbitCamera.update(1 / 60);
  assert.ok(Math.abs(partial.camera.position.distanceTo(partial.target.position) - partialInitialDistance) < 1e-5,
    "a blocker that covers only one of the visibility points must not trigger zoom");
  partial.orbitCamera.dispose();
});
