import "./style.css";
import { startPhaseOneScene } from "../render/phase-one-scene";

const root = document.querySelector<HTMLElement>("#app");
const errorElement = document.querySelector<HTMLElement>("#render-error");

if (!root || !errorElement) {
  throw new Error("アプリの表示領域を初期化できません。");
}

try {
  startPhaseOneScene(root);
} catch (error) {
  const detail = error instanceof Error ? error.message : "不明なエラー";
  errorElement.textContent = `3D表示を開始できませんでした。WebGL対応ブラウザで開いてください。(${detail})`;
  errorElement.hidden = false;
  console.error("Phase 1 scene initialization failed:", error);
}
