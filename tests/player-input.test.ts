import assert from "node:assert/strict";
import test from "node:test";
import { Vector2 } from "three";
import { KeyboardMovementInput } from "../src/input/keyboard-movement-input.ts";
import { calculateStickVector } from "../src/input/touch-movement-input.ts";

function keyEvent(type: string, key: string): Event {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, "key", { value: key });
  return event;
}

test("WASDと矢印キーを同じ移動ベクトルへ変換し、斜め入力を正規化する", () => {
  const target = new EventTarget();
  const input = new KeyboardMovementInput(target as unknown as Window);
  target.dispatchEvent(keyEvent("keydown", "w"));
  target.dispatchEvent(keyEvent("keydown", "d"));

  const movement = input.read();
  assert.ok(Math.abs(movement.x - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(movement.y - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(movement.length() - 1) < 1e-12);

  target.dispatchEvent(keyEvent("keyup", "d"));
  assert.deepEqual(input.read().toArray(), [0, 1]);
  input.dispose();
});

test("ウィンドウのフォーカス喪失時にキー移動を解除する", () => {
  const target = new EventTarget();
  const input = new KeyboardMovementInput(target as unknown as Window);
  target.dispatchEvent(keyEvent("keydown", "ArrowLeft"));
  assert.deepEqual(input.read().toArray(), [-1, 0]);
  target.dispatchEvent(new Event("blur"));
  assert.deepEqual(input.read().toArray(), [0, 0]);
  input.dispose();
});

test("仮想スティックのデッドゾーン、方向、最大入力を計算する", () => {
  const movement = new Vector2();
  calculateStickVector(4, 0, 60, 0.12, movement);
  assert.deepEqual(movement.toArray(), [0, 0]);

  calculateStickVector(60, -60, 60, 0.12, movement);
  assert.ok(Math.abs(movement.length() - 1) < 1e-12);
  assert.ok(movement.x > 0 && movement.y > 0);

  calculateStickVector(0, 120, 60, 0.12, movement);
  assert.deepEqual(movement.toArray(), [0, -1]);
});

test("ゼロ半径のスティック入力は停止状態になる", () => {
  assert.deepEqual(calculateStickVector(10, 10, 0).toArray(), [0, 0]);
});

test("キー入力がページスクロールを起こさないよう既定動作を抑止する", () => {
  const target = new EventTarget();
  const input = new KeyboardMovementInput(target as unknown as Window);
  const event = keyEvent("keydown", "ArrowDown");
  target.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  input.dispose();
});
