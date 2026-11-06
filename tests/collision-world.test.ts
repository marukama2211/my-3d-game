import assert from "node:assert/strict";
import test from "node:test";
import { BoxGeometry, Camera, Mesh, MeshBasicMaterial, Object3D, Vector2, Vector3 } from "three";
import { Capsule } from "three/addons/math/Capsule.js";
import { CollisionWorld } from "../src/game/physics/collision-world.ts";
import { PlayerController } from "../src/game/player/player-controller.ts";

const RADIUS = 0.38;
const HEIGHT = 1.64;

function createCapsule(x = 0, feetY = 0, z = 0): Capsule {
  return new Capsule(
    new Vector3(x, feetY + RADIUS, z),
    new Vector3(x, feetY + HEIGHT - RADIUS, z),
    RADIUS,
  );
}

function addBox(
  world: CollisionWorld,
  size: [number, number, number],
  position: [number, number, number],
): Mesh {
  const mesh = new Mesh(new BoxGeometry(...size), new MeshBasicMaterial());
  mesh.position.set(...position);
  world.addCollider(mesh);
  return mesh;
}

test("地面を下回る垂直移動を接地高で止める", () => {
  const world = new CollisionWorld(-1.12);
  const capsule = createCapsule(0, -0.8);
  const result = world.moveVertical(capsule, -1);

  assert.equal(result.blocked, true);
  assert.equal(result.grounded, true);
  assert.ok(Math.abs(capsule.start.y - capsule.radius - world.groundY) < 1e-10);
});

test("高速な水平移動でも壁を抜けず、壁面に沿う移動は許す", () => {
  const world = new CollisionWorld(0);
  addBox(world, [1, 2.4, 6], [0, 1.2, 0]);
  const capsule = createCapsule(-1.2);

  world.moveHorizontal(capsule, 4, 1.5);
  const center = capsule.getCenter(new Vector3());
  assert.ok(center.x < -0.87, `wall should block x movement, got ${center.x}`);
  assert.ok(center.z > 1.4, `tangential z movement should slide along the wall, got ${center.z}`);
});

test("落下中は低い障害物の上面に着地できる", () => {
  const world = new CollisionWorld(0);
  addBox(world, [2, 1, 2], [0, 0.5, 0]);
  const capsule = createCapsule(0, 2);
  const result = world.moveVertical(capsule, -2);

  assert.equal(result.grounded, true);
  assert.ok(Math.abs(capsule.start.y - capsule.radius - 1) < 1e-10);
});

test("視線を遮る岩があっても、空いているカメラ位置なら距離を維持する", () => {
  const world = new CollisionWorld(0);
  addBox(world, [3, 4, 0.5], [0, 1, 5]);
  const target = new Vector3(0, 1, 0);
  const desired = new Vector3(0, 1, 10);
  const direction = desired.clone().sub(target).normalize();
  const safeDistance = world.resolveCameraDistance(target, direction, 10, 4);
  assert.equal(safeDistance, 10, "occlusion alone does not constrain the camera's physical position");
});

test("カメラ位置を占有する障害物だけが距離を制限し、最小距離を下回らない", () => {
  const world = new CollisionWorld(0);
  addBox(world, [2, 2, 0.6], [0, 1, 9.8]);
  const target = new Vector3(0, 1, 0);
  const direction = new Vector3(0, 0, 1);
  const safeDistance = world.resolveCameraDistance(target, direction, 10, 4);
  assert.ok(safeDistance < 9.5 && safeDistance > 9, `camera should stop before its occupied position, got ${safeDistance}`);

  const minimumBlockedWorld = new CollisionWorld(0);
  addBox(minimumBlockedWorld, [2, 2, 2], [0, 1, 4]);
  addBox(minimumBlockedWorld, [2, 2, 0.6], [0, 1, 9.8]);
  const nearestAvailable = minimumBlockedWorld.resolveCameraDistance(target, direction, 10, 4);
  assert.ok(nearestAvailable < 9.5 && nearestAvailable > 8.8,
    `when minimum and desired points are blocked, use the nearest free point between them, got ${nearestAvailable}`);

  const fullyBlockedWorld = new CollisionWorld(0);
  addBox(fullyBlockedWorld, [2, 2, 12], [0, 1, 4]);
  assert.equal(fullyBlockedWorld.resolveCameraDistance(target, direction, 10, 4), 4);
});

test("下向きカメラは水平地面を貫通せず、地面が離れていれば距離を維持する", () => {
  const world = new CollisionWorld(0);
  const target = new Vector3(0, 1.05, 0);
  const downward = new Vector3(0, -1, 0);
  assert.ok(Math.abs(world.resolveGroundCameraDistance(target, downward, 8) - 0.83) < 1e-8);
  assert.equal(world.resolveGroundCameraDistance(target, new Vector3(0, 1, 0), 8), 8);
});

test("プレイヤーの複数視線候補がすべて遮られた場合だけ完全遮蔽とする", () => {
  const target = new Vector3(0, 1.05, 0);
  const targets = [-0.35, 0, 0.35].map((offset) => target.clone().add(new Vector3(0, offset, 0)));
  const camera = new Vector3(0, 1.05, 10);

  const fullBlockerWorld = new CollisionWorld(-10);
  addBox(fullBlockerWorld, [3, 3, 0.6], [0, 1.05, 5]);
  assert.equal(fullBlockerWorld.areCameraTargetsFullyOccluded(camera, targets), true);
  const visibleDistance = fullBlockerWorld.findVisibleCameraDistance(
    target, new Vector3(0, 0, 1), 10, 2, targets,
  );
  assert.ok(visibleDistance < 5 && visibleDistance > 4, `camera should move to the near side of the blocker, got ${visibleDistance}`);

  const partialBlockerWorld = new CollisionWorld(-10);
  addBox(partialBlockerWorld, [3, 0.12, 0.6], [0, 1.05, 5]);
  assert.equal(partialBlockerWorld.areCameraTargetsFullyOccluded(camera, targets), false);
});

test("ジャンプ後に地面へ戻り、空中の再ジャンプ入力は無視する", () => {
  const world = new CollisionWorld(0);
  const playerA = new Object3D();
  const playerB = new Object3D();
  const controllerA = new PlayerController(playerA, world);
  const controllerB = new PlayerController(playerB, new CollisionWorld(0));
  const cameraLike = {
    getWorldDirection(target: Vector3): Vector3 { return target.set(0, -0.2, -1).normalize(); },
  } as unknown as Camera;

  controllerA.update(new Vector2(), 1 / 60, cameraLike, true);
  controllerB.update(new Vector2(), 1 / 60, cameraLike, true);
  assert.ok(playerA.position.y > 0);
  assert.equal(controllerA.isGrounded, false);

  for (let frame = 0; frame < 10; frame += 1) {
    controllerA.update(new Vector2(), 1 / 60, cameraLike, true);
    controllerB.update(new Vector2(), 1 / 60, cameraLike, false);
  }
  assert.ok(Math.abs(playerA.position.y - playerB.position.y) < 1e-10);

  for (let frame = 0; frame < 90; frame += 1) {
    controllerA.update(new Vector2(), 1 / 60, cameraLike, false);
  }
  assert.ok(Math.abs(playerA.position.y) < 1e-10);
  assert.equal(controllerA.isGrounded, true);
});
