import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  createPhaseOneCamera,
  createPhaseOneCube,
  createPhaseOneGround,
} from "../src/render/phase-one-scene.ts";

function assertFiniteAttribute(attribute: THREE.BufferAttribute): void {
  for (let i = 0; i < attribute.array.length; i += 1) {
    assert.ok(Number.isFinite(attribute.array[i]), `attribute element ${i} must be finite`);
  }
}

function assertValidIndices(geometry: THREE.BufferGeometry): void {
  const index = geometry.getIndex();
  assert.ok(index, "indexed geometry is expected");

  for (let i = 0; i < index.count; i += 1) {
    const vertexIndex = index.getX(i);
    assert.ok(Number.isInteger(vertexIndex));
    assert.ok(vertexIndex >= 0 && vertexIndex < geometry.getAttribute("position").count);
  }

  assert.equal(index.count % 3, 0, "triangle index count must be divisible by three");
}

test("立方体メッシュの頂点・法線・UV・インデックスが有効", () => {
  const cube = createPhaseOneCube();
  const geometry = cube.geometry;
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const uvs = geometry.getAttribute("uv") as THREE.BufferAttribute;

  assert.equal(positions.count, 24);
  assert.equal(normals.count, positions.count);
  assert.equal(uvs.count, positions.count);
  assert.equal(geometry.getIndex()?.count, 36);
  assertFiniteAttribute(positions);
  assertFiniteAttribute(normals);
  assertFiniteAttribute(uvs);
  assertValidIndices(geometry);

  for (let i = 0; i < positions.count; i += 1) {
    const position = new THREE.Vector3().fromBufferAttribute(positions, i);
    const normal = new THREE.Vector3().fromBufferAttribute(normals, i);
    assert.ok(Math.abs(position.x) <= 0.9 && Math.abs(position.y) <= 0.9 && Math.abs(position.z) <= 0.9);
    assert.ok(Math.abs(normal.length() - 1) < 1e-6, "vertex normals must be normalized");
  }
});

test("円形の床メッシュの頂点とインデックスが有効", () => {
  const ground = createPhaseOneGround();
  const geometry = ground.geometry;
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;

  assert.equal(positions.count, 66, "64 segments plus center and closing perimeter vertex");
  assert.equal(geometry.getIndex()?.count, 192);
  assertFiniteAttribute(positions);
  assertValidIndices(geometry);

  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    assert.ok(Math.hypot(x, y, z) <= 2.8 + 1e-6);
  }
});

test("カメラのビュー・プロジェクション行列が有限で原点を画面内に投影する", () => {
  const camera = createPhaseOneCamera(16 / 9);
  camera.updateMatrixWorld(true);

  for (const element of camera.matrixWorldInverse.elements) assert.ok(Number.isFinite(element));
  for (const element of camera.projectionMatrix.elements) assert.ok(Number.isFinite(element));

  const originInView = new THREE.Vector3(0, 0, 0).applyMatrix4(camera.matrixWorldInverse);
  assert.ok(originInView.z < 0, "the target must be in front of the camera");

  const originInNdc = new THREE.Vector3(0, 0, 0).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
  assert.ok(Math.abs(originInNdc.x) < 1e-6);
  assert.ok(Math.abs(originInNdc.y) < 1e-6);
  assert.ok(originInNdc.z >= -1 && originInNdc.z <= 1, "the target must be inside the clip depth range");

  const forward = camera.getWorldDirection(new THREE.Vector3());
  const nearPoint = camera.position.clone().addScaledVector(forward, camera.near);
  const farPoint = camera.position.clone().addScaledVector(forward, camera.far);
  const nearDepth = nearPoint.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix).z;
  const farDepth = farPoint.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix).z;
  assert.ok(Math.abs(nearDepth + 1) < 1e-5, "near plane maps to WebGL NDC depth -1");
  assert.ok(Math.abs(farDepth - 1) < 1e-5, "far plane maps to WebGL NDC depth +1");
});

test("横長ビューポートでカメラのアスペクト比を保持する", () => {
  const camera = createPhaseOneCamera(16 / 9);
  assert.ok(Math.abs(camera.aspect - 16 / 9) < 1e-12);
  assert.ok(camera.projectionMatrix.elements.every(Number.isFinite));
});
