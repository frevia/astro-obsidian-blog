import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  clampLightboxScale,
  formatLightboxTriggerLabel,
  getNextLightboxIndex,
  isEligibleArticleImage,
  lockBodyScroll,
  restoreLightboxFocus,
  trapLightboxFocus,
} from "./article-lightbox";

const componentPath = resolve(import.meta.dirname, "ArticleLightbox.astro");

function imageCandidate({
  linked = false,
  currentSrc = "",
  src = "https://example.com/image.jpg",
}: {
  linked?: boolean;
  currentSrc?: string;
  src?: string;
} = {}) {
  return {
    closest: vi.fn(() => (linked ? {} : null)),
    currentSrc,
    src,
  } as unknown as HTMLImageElement;
}

function keyboardEvent(key: string, shiftKey = false) {
  return {
    key,
    shiftKey,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
}

describe("article lightbox behavior", () => {
  it("strictly excludes every image nested in a link", () => {
    expect(isEligibleArticleImage(imageCandidate())).toBe(true);
    expect(isEligibleArticleImage(imageCandidate({ linked: true }))).toBe(
      false
    );
    expect(isEligibleArticleImage(imageCandidate({ src: "" }))).toBe(false);
  });

  it("wraps navigation and clamps zoom state", () => {
    expect(getNextLightboxIndex(0, -1, 3)).toBe(2);
    expect(getNextLightboxIndex(2, 1, 3)).toBe(0);
    expect(getNextLightboxIndex(0, 1, 0)).toBe(0);
    expect(clampLightboxScale(0.5)).toBe(1);
    expect(clampLightboxScale(2.25)).toBe(2.25);
    expect(clampLightboxScale(4)).toBe(3);
  });

  it("builds a useful localized trigger label", () => {
    expect(formatLightboxTriggerLabel("Zoom image", "A lake")).toBe(
      "Zoom image: A lake"
    );
    expect(formatLightboxTriggerLabel("Zoom image", "  ")).toBe("Zoom image");
  });

  it("restores the exact pre-existing body overflow value", () => {
    const body = { style: { overflow: "clip" } } as HTMLElement;
    const unlock = lockBodyScroll(body);

    expect(body.style.overflow).toBe("hidden");
    unlock();
    expect(body.style.overflow).toBe("clip");
  });

  it("restores focus only while the trigger remains connected", () => {
    const connected = {
      isConnected: true,
      focus: vi.fn(),
    } as unknown as HTMLElement;
    const detached = {
      isConnected: false,
      focus: vi.fn(),
    } as unknown as HTMLElement;

    expect(restoreLightboxFocus(connected)).toBe(true);
    expect(connected.focus).toHaveBeenCalledOnce();
    expect(restoreLightboxFocus(detached)).toBe(false);
    expect(detached.focus).not.toHaveBeenCalled();
  });

  it("wraps Tab and Shift+Tab focus at the dialog boundaries", () => {
    const first = { focus: vi.fn() } as unknown as HTMLElement;
    const middle = { focus: vi.fn() } as unknown as HTMLElement;
    const last = { focus: vi.fn() } as unknown as HTMLElement;
    const root = {
      querySelectorAll: vi.fn(() => [first, middle, last]),
      contains: vi.fn((element: Element) =>
        [first, middle, last].includes(element as HTMLElement)
      ),
      focus: vi.fn(),
    } as unknown as HTMLElement;

    const forward = keyboardEvent("Tab");
    expect(trapLightboxFocus(root, forward, last)).toBe(true);
    expect(forward.preventDefault).toHaveBeenCalledOnce();
    expect(first.focus).toHaveBeenCalledOnce();

    const backward = keyboardEvent("Tab", true);
    expect(trapLightboxFocus(root, backward, first)).toBe(true);
    expect(backward.preventDefault).toHaveBeenCalledOnce();
    expect(last.focus).toHaveBeenCalledOnce();

    const inside = keyboardEvent("Tab");
    expect(trapLightboxFocus(root, inside, middle)).toBe(false);
    expect(inside.preventDefault).not.toHaveBeenCalled();
  });

  it("falls back to the dialog when it has no focusable controls", () => {
    const root = {
      querySelectorAll: vi.fn(() => []),
      contains: vi.fn(() => false),
      focus: vi.fn(),
    } as unknown as HTMLElement;
    const event = keyboardEvent("Tab");

    expect(trapLightboxFocus(root, event, null)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(root.focus).toHaveBeenCalledOnce();
  });
});

describe("ArticleLightbox component wiring", () => {
  it("renders a distinctly named modal and localized controls", () => {
    const source = readFileSync(componentPath, "utf-8");

    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain("aria-label={labels.preview}");
    expect(source).toContain("data-open-label={labels.open}");
    expect(source).toContain("data-lightbox-close");
    expect(source).toContain("data-lightbox-prev");
    expect(source).toContain("data-lightbox-next");
    expect(source).toContain("data-lightbox-zoom-in");
    expect(source).toContain("data-lightbox-zoom-out");
  });

  it("wires one replaceable ClientRouter lifecycle pair to the helper", () => {
    const source = readFileSync(componentPath, "utf-8");

    expect(source).toContain(
      'import { initArticleLightbox } from "./article-lightbox"'
    );
    expect(source).toContain("window.__articleLightboxCleanup?.()");
    expect(source).toContain(
      'document.addEventListener("astro:page-load", onPageLoad)'
    );
    expect(source).toContain(
      'document.addEventListener("astro:before-swap", onBeforeSwap)'
    );
    expect(source).toContain(
      'document.removeEventListener(\n      "astro:page-load",'
    );
    expect(source).toContain(
      'document.removeEventListener(\n      "astro:before-swap",'
    );
  });

  it("keeps Escape and backdrop close behavior in the tested helper", () => {
    const helperSource = readFileSync(
      resolve(import.meta.dirname, "article-lightbox.ts"),
      "utf-8"
    );

    expect(helperSource).toContain('if (event.key === "Escape")');
    expect(helperSource).toContain("if (event.target === root) close()");
    expect(helperSource).toContain("scale = 1");
    expect(helperSource).toContain("eligibleImages.includes(trigger)");
  });
});
