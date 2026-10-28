import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Header mobile menu accessibility behaviors", () => {
  const headerPath = resolve(import.meta.dirname, "Header.astro");

  it("contains aria-expanded and aria-controls linkage", () => {
    const source = readFileSync(headerPath, "utf-8");

    expect(source).toContain('id="menu-btn"');
    expect(source).toContain('aria-controls="menu-items"');
    expect(source).toContain('aria-expanded="false"');
  });

  it("keeps aria-expanded and aria-label in sync", () => {
    const source = readFileSync(headerPath, "utf-8");

    expect(source).toContain(
      'setAttribute("aria-expanded", isOpen ? "false" : "true")'
    );
    expect(source).toContain(
      'setAttribute("aria-label", isOpen ? openLabel : closeLabel)'
    );
    expect(source).toContain(
      'setAttribute("aria-label", isOpen ? closeLabel : openLabel)'
    );
  });

  it("supports Escape close and focus restore", () => {
    const source = readFileSync(headerPath, "utf-8");

    expect(source).toContain('if (event.key === "Escape"');
    expect(source).toContain("lastFocusedElement?.focus()");
  });

  it("binds one Escape handler and resets menu state after swaps", () => {
    const source = readFileSync(headerPath, "utf-8");

    expect(
      source.match(/document\.addEventListener\("keydown", event =>/g)
    ).toHaveLength(1);
    expect(source).toContain(
      'document.addEventListener("astro:after-swap", () => {'
    );
    expect(source).toContain("    toggleNav();");
  });

  it("locks body scroll while menu is open", () => {
    const source = readFileSync(headerPath, "utf-8");

    expect(source).toContain('document.body.style.overflow = "hidden"');
    expect(source).toContain('document.body.style.overflow = ""');
  });
});
