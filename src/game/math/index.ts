/**
 * ゲームコードから利用する Three.js 数学型の窓口。
 * 演算そのものは Three.js に委譲し、独自実装との二重管理を避ける。
 */
export {
  Euler,
  Matrix3,
  Matrix4,
  Object3D as Transform,
  Quaternion,
  Vector2 as Vec2,
  Vector3 as Vec3,
  Vector4 as Vec4,
} from "three";
