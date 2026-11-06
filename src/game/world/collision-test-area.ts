import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Scene,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { CollisionWorld } from "../physics/collision-world";

const STONE = new MeshStandardMaterial({ color: "#56676a", roughness: 0.92, flatShading: true });
const PALE_STONE = new MeshStandardMaterial({ color: "#788884", roughness: 0.86, flatShading: true });
const GROUND = new MeshStandardMaterial({ color: "#35464a", roughness: 0.98, flatShading: true });
const LANTERN = new MeshStandardMaterial({
  color: "#e8b86b",
  emissive: "#765126",
  roughness: 0.42,
  flatShading: true,
});

function addObstacle(
  scene: Scene,
  world: CollisionWorld,
  geometry: BoxGeometry | CylinderGeometry,
  material: MeshStandardMaterial,
  position: [number, number, number],
): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  world.addCollider(mesh);
  return mesh;
}

/** 灯台の石造りの前庭を題材にした、衝突確認用の小さな場を作る。 */
export function createCollisionTestArea(scene: Scene, groundY = -1.12): CollisionWorld {
  const world = new CollisionWorld(groundY);

  const ground = new Mesh(new CircleGeometry(16, 64), GROUND);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = groundY - 0.035;
  ground.receiveShadow = true;
  scene.add(ground);

  const pathRing = new Mesh(new TorusGeometry(12.5, 0.045, 5, 96), PALE_STONE);
  pathRing.rotation.x = Math.PI / 2;
  pathRing.position.y = groundY + 0.008;
  scene.add(pathRing);

  // 中央に人が通れる隙間を残した、崩れかけの防波壁。
  addObstacle(scene, world, new BoxGeometry(4.2, 2.1, 0.58), STONE, [-2.65, groundY + 1.05, -5.4]);
  addObstacle(scene, world, new BoxGeometry(4.2, 2.1, 0.58), STONE, [2.65, groundY + 1.05, -5.4]);

  // 背後の灯標。光源ではなく小さな発光マテリアルで形状を示す。
  const beacon = new Group();
  const tower = new Mesh(new CylinderGeometry(0.56, 0.9, 3.4, 7), PALE_STONE);
  tower.position.y = 1.7;
  beacon.add(tower);
  const lantern = new Mesh(new SphereGeometry(0.35, 8, 6), LANTERN);
  lantern.position.y = 3.55;
  beacon.add(lantern);
  beacon.position.set(0, groundY, -8.1);
  scene.add(beacon);
  world.addCollider(tower);

  // 低い崩落石と欠けた標柱で、異なる高さ・形状の衝突を試せる。
  addObstacle(scene, world, new BoxGeometry(2.6, 0.62, 0.82), STONE, [-3.1, groundY + 0.31, -1.9]);
  addObstacle(scene, world, new CylinderGeometry(0.57, 0.73, 2.25, 7), PALE_STONE, [3.25, groundY + 1.125, 0.2]);

  return world;
}
