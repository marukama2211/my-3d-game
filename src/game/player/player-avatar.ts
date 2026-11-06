import { Group, Mesh, MeshStandardMaterial, Object3D, SphereGeometry, CapsuleGeometry } from "three";

export type PlayerAvatar = {
  root: Group;
  cameraTarget: Object3D;
};

/** 動作確認用の簡素なカプセル型プレイヤーを作る。 */
export function createPlayerAvatar(groundY = -1.12): PlayerAvatar {
  const root = new Group();
  root.position.y = groundY;

  const bodyMaterial = new MeshStandardMaterial({ color: "#76d5c1", roughness: 0.58, flatShading: true });
  const body = new Mesh(new CapsuleGeometry(0.38, 0.88, 4, 8), bodyMaterial);
  body.position.y = 0.82;
  body.castShadow = true;
  root.add(body);

  // 見た目の正面はローカル-Z。PlayerControllerがこの向きを進行方向へ回す。
  const visor = new Mesh(
    new SphereGeometry(0.16, 10, 6),
    new MeshStandardMaterial({ color: "#ffe0ad", emissive: "#573e21", roughness: 0.35 }),
  );
  visor.scale.set(1.2, 0.65, 0.55);
  visor.position.set(0, 1.04, -0.34);
  root.add(visor);

  const cameraTarget = new Object3D();
  cameraTarget.position.set(0, 1.05, 0);
  root.add(cameraTarget);

  return { root, cameraTarget };
}
