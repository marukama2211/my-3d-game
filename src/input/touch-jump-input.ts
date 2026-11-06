/** タッチ端末用の小さなジャンプ操作。押下を一度だけゲーム側へ渡す。 */
export class TouchJumpInput {
  private readonly button: HTMLButtonElement;
  private jumpQueued = false;
  private pointerId: number | null = null;

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" || event.button !== 0 || this.pointerId !== null) return;
    event.preventDefault();
    event.stopPropagation();
    this.pointerId = event.pointerId;
    this.jumpQueued = true;
    this.button.classList.add("is-pressed");
    this.button.setPointerCapture(event.pointerId);
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.pointerId = null;
    this.button.classList.remove("is-pressed");
  };

  private readonly onBlur = (): void => {
    const pointerId = this.pointerId;
    this.pointerId = null;
    this.jumpQueued = false;
    this.button.classList.remove("is-pressed");
    if (pointerId !== null && this.button.hasPointerCapture(pointerId)) {
      this.button.releasePointerCapture(pointerId);
    }
  };

  constructor(container: HTMLElement, private readonly eventWindow: Window = window) {
    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.className = "touch-jump";
    this.button.textContent = "跳ぶ";
    this.button.setAttribute("aria-label", "ジャンプ");
    container.append(this.button);
    this.button.addEventListener("pointerdown", this.onPointerDown);
    this.button.addEventListener("pointerup", this.onPointerEnd);
    this.button.addEventListener("pointercancel", this.onPointerEnd);
    this.button.addEventListener("lostpointercapture", this.onPointerEnd);
    eventWindow.addEventListener("blur", this.onBlur);
  }

  consumeJumpPressed(): boolean {
    const pressed = this.jumpQueued;
    this.jumpQueued = false;
    return pressed;
  }

  dispose(): void {
    this.button.removeEventListener("pointerdown", this.onPointerDown);
    this.button.removeEventListener("pointerup", this.onPointerEnd);
    this.button.removeEventListener("pointercancel", this.onPointerEnd);
    this.button.removeEventListener("lostpointercapture", this.onPointerEnd);
    this.eventWindow.removeEventListener("blur", this.onBlur);
    this.onBlur();
    this.button.remove();
  }
}
