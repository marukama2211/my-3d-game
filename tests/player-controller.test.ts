import assert from "node:assert/strict";
import test from "node:test";
import { Object3D, PerspectiveCamera, Vector2, Vector3 } from "three";
import { PlayerController } from "../src/game/player/player-controller.ts";
import { createPlayerAvatar } from "../src/game/player/player-avatar.ts";
import { CollisionWorld } from "../src/game/physics/collision-world.ts";

function createCamera(): PerspectiveCamera {
  const camera = new PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 3, 6);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  return camera;
}

function createController(player: Object3D, world = new CollisionWorld(0)): PlayerController {
  return new PlayerController(player, world);
}

test("カメラ前方へ移動し、フレーム時間に応じた距離を進む", () => {
  const player = new Object3D();
  const controller = createController(player);
  const before = player.position.clone();
  controller.update(new Vector2(0, 1), 1 / 60, createCamera());

  const moved = player.position.clone().sub(before);
  assert.ok(moved.z < 0);
  assert.ok(Math.abs(moved.length() - controller.speed / 60) < 1e-10);
  assert.ok(Math.abs(player.rotation.y) < 1e-10);
});

test("移動方向はカメラの水平回転に追従する", () => {
  const player = new Object3D();
  const controller = createController(player);
  const camera = createCamera();
  camera.rotation.set(0, Math.PI / 2, 0);
  camera.updateMatrixWorld(true);
  controller.update(new Vector2(0, 1), 1 / 60, camera);

  assert.ok(player.position.x < 0);
  assert.ok(Math.abs(player.position.z) < 1e-8);
  assert.ok(Math.abs(player.rotation.y - Math.PI / 2) < 1e-8);
});

test("モデルのローカル-Z正面を4方向の進行方向へ向ける", () => {
  const player = new Object3D();
  const controller = createController(player);
  const forward = new Vector3(0, 0, -1);

  for (const cameraYaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const camera = createCamera();
    camera.rotation.set(0, cameraYaw, 0);
    camera.updateMatrixWorld(true);
    const expectedDirection = camera.getWorldDirection(new Vector3());
    expectedDirection.y = 0;
    expectedDirection.normalize();

    controller.update(new Vector2(0, 1), 1 / 60, camera);
    const modelForward = forward.clone().applyQuaternion(player.quaternion);
    assert.ok(modelForward.dot(expectedDirection) > 1 - 1e-10, `camera yaw ${cameraYaw}`);
  }
});

test("進行方向が±180度の境界を越えても姿勢は短い角度差に留まる", () => {
  const player = new Object3D();
  const controller = createController(player);
  const epsilon = 0.01;
  const camera = createCamera();

  camera.rotation.set(0, Math.PI - epsilon, 0);
  camera.updateMatrixWorld(true);
  controller.update(new Vector2(0, 1), 1 / 60, camera);
  const beforeTurn = player.quaternion.clone();

  camera.rotation.set(0, -Math.PI + epsilon, 0);
  camera.updateMatrixWorld(true);
  controller.update(new Vector2(0, 1), 1 / 60, camera);

  assert.ok(beforeTurn.angleTo(player.quaternion) < 0.021);
});

test("斜め移動の速度を正規化し、フレーム停止後の大移動を制限する", () => {
  const diagonal = new Object3D();
  const controller = createController(diagonal);
  controller.update(new Vector2(1, 1).normalize(), 1 / 60, createCamera());
  assert.ok(Math.abs(diagonal.position.length() - controller.speed / 60) < 1e-10);

  const before = diagonal.position.clone();
  controller.update(new Vector2(0, 1), 2, createCamera());
  assert.ok(Math.abs(diagonal.position.distanceTo(before) - controller.speed * 0.05) < 1e-10);
});

test("入力がないと移動・旋回しない", () => {
  const player = new Object3D();
  player.rotation.y = 0.4;
  const initialRotation = player.rotation.y;
  const controller = createController(player);
  controller.update(new Vector2(), 1 / 60, createCamera());
  assert.deepEqual(player.position.toArray(), [0, 0, 0]);
  assert.equal(player.rotation.y, initialRotation);
});

test("プレイヤーの仮メッシュとカメラ追従点を作成する", () => {
  const avatar = createPlayerAvatar();
  assert.equal(avatar.root.children.length, 3);
  assert.ok(avatar.root.children.some((child) => child === avatar.cameraTarget));
  assert.ok(avatar.cameraTarget.position.y > 0);
});
