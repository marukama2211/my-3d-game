import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  Euler,
  Matrix3,
  Matrix4,
  Quaternion,
  Transform,
  Vec2,
  Vec3,
  Vec4,
} from "../src/game/math/index.ts";

function assertNear(actual: number, expected: number, epsilon = 1e-6): void {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${actual} to be within ${epsilon} of ${expected}`);
}

function assertVector3Near(actual: THREE.Vector3, expected: THREE.Vector3, epsilon = 1e-6): void {
  assertNear(actual.x, expected.x, epsilon);
  assertNear(actual.y, expected.y, epsilon);
  assertNear(actual.z, expected.z, epsilon);
}

function assertMatrixNear(actual: THREE.Matrix4, expected: THREE.Matrix4, epsilon = 1e-6): void {
  assert.equal(actual.elements.length, expected.elements.length);
  for (let i = 0; i < actual.elements.length; i += 1) {
    assertNear(actual.elements[i], expected.elements[i], epsilon);
  }
}

test("ゲーム用ベクトル名はThree.jsの型をそのまま公開し、演算できる", () => {
  assert.equal(Vec2, THREE.Vector2);
  assert.equal(Vec3, THREE.Vector3);
  assert.equal(Vec4, THREE.Vector4);

  const vec2 = new Vec2(2, -3).add(new Vec2(4, 5)).multiplyScalar(0.5);
  assertNear(vec2.x, 3);
  assertNear(vec2.y, 1);

  const vec3 = new Vec3(1, 0, 0).cross(new Vec3(0, 1, 0));
  assertVector3Near(vec3, new THREE.Vector3(0, 0, 1));

  const vec4 = new Vec4(2, 4, 6, 2).multiplyScalar(0.5);
  assert.deepEqual(vec4.toArray(), [1, 2, 3, 1]);
});

test("Matrix3/Matrix4で変換を合成し、逆変換で元の点へ戻せる", () => {
  assert.equal(Matrix3, THREE.Matrix3);
  assert.equal(Matrix4, THREE.Matrix4);

  const position = new Vec3(3, -2, 5);
  const rotation = new Quaternion().setFromEuler(new Euler(0.35, -0.7, 0.2, "YXZ"));
  const scale = new Vec3(2, 3, 4);
  const matrix = new Matrix4().compose(position, rotation, scale);
  const point = new Vec3(1, 2, -1);

  const transformed = point.clone().applyMatrix4(matrix);
  const restored = transformed.clone().applyMatrix4(matrix.clone().invert());
  assertVector3Near(restored, point);

  const decomposedPosition = new Vec3();
  const decomposedRotation = new Quaternion();
  const decomposedScale = new Vec3();
  matrix.decompose(decomposedPosition, decomposedRotation, decomposedScale);
  assertVector3Near(decomposedPosition, position);
  assertVector3Near(decomposedScale, scale);
  assert.ok(Math.abs(decomposedRotation.length() - 1) < 1e-6);

  const normalMatrix = new Matrix3().getNormalMatrix(matrix);
  assert.ok(normalMatrix.elements.every(Number.isFinite));
});

test("Euler角とQuaternionが同じ回転行列を表す", () => {
  const euler = new Euler(0.4, -0.8, 1.1, "YXZ");
  const quaternion = new Quaternion().setFromEuler(euler);
  const eulerMatrix = new Matrix4().makeRotationFromEuler(euler);
  const quaternionMatrix = new Matrix4().makeRotationFromQuaternion(quaternion);

  assertNear(quaternion.length(), 1);
  assertMatrixNear(quaternionMatrix, eulerMatrix);
});

test("Transform(Object3D)が親子の位置・回転・拡縮をワールド行列へ合成する", () => {
  assert.equal(Transform, THREE.Object3D);

  const parent = new Transform();
  parent.position.set(5, 0, -2);
  parent.rotation.y = Math.PI / 2;

  const child = new Transform();
  child.position.set(2, 1, 0);
  child.scale.set(2, 2, 2);
  parent.add(child);
  parent.updateMatrixWorld(true);

  const expectedWorldMatrix = parent.matrixWorld.clone().multiply(child.matrix);
  assertMatrixNear(child.matrixWorld, expectedWorldMatrix);

  const worldOrigin = child.localToWorld(new Vec3());
  assertVector3Near(worldOrigin, new Vec3(5, 1, -4));
});
