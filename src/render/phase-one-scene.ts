import * as THREE from "three";
import { ThirdPersonOrbitCamera } from "../game/camera/third-person-orbit-camera";
import { createPlayerAvatar } from "../game/player/player-avatar";
import { PlayerController } from "../game/player/player-controller";
import { createCollisionTestArea } from "../game/world/collision-test-area";
import { PlayerInput } from "../input/player-input";

export function createPhaseOneCamera(aspect = 1): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 100);
  camera.position.set(4.2, 3.1, 6.2);
  camera.lookAt(0, 0, 0);
  return camera;
}

export function createPhaseOneCube(): THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> {
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.8, 1.8),
    new THREE.MeshStandardMaterial({
      color: "#e58c61",
      roughness: 0.38,
      metalness: 0.08,
      flatShading: true,
    }),
  );
  cube.rotation.set(0.28, 0.48, 0.08);
  return cube;
}

export function createPhaseOneGround(radius = 2.8): THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial> {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 64),
    new THREE.MeshBasicMaterial({ color: "#83c9bd", transparent: true, opacity: 0.045 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.12;
  return ground;
}

export function startPhaseOneScene(container: HTMLElement): void {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#10151b");

  const camera = createPhaseOneCamera();

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor("#10151b", 0);
  container.prepend(renderer.domElement);

  scene.add(new THREE.HemisphereLight("#d5f0e8", "#26333d", 2.1));

  const keyLight = new THREE.DirectionalLight("#ffe0ad", 3.2);
  keyLight.position.set(-3, 5, 4);
  scene.add(keyLight);

  const avatar = createPlayerAvatar();
  const collisionWorld = createCollisionTestArea(scene, avatar.root.position.y);
  scene.add(avatar.root);
  const playerController = new PlayerController(avatar.root, collisionWorld);
  const playerInput = new PlayerInput(container);
  const orbitCamera = new ThirdPersonOrbitCamera(camera, avatar.cameraTarget, container, collisionWorld);

  const resize = (): void => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  const clock = new THREE.Clock();
  const movement = new THREE.Vector2();
  let previousTime = 0;
  renderer.setAnimationLoop(() => {
    const elapsed = clock.getElapsedTime();
    const deltaSeconds = elapsed - previousTime;
    playerController.update(
      playerInput.readMovement(movement),
      deltaSeconds,
      camera,
      playerInput.consumeJumpPressed(),
    );
    previousTime = elapsed;
    orbitCamera.update(deltaSeconds);
    renderer.render(scene, camera);
  });
}
