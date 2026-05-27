import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("CalendarModal accessibility source", () => {
  const filePath = resolve(import.meta.dirname, "CalendarModal.astro");
  const source = readFileSync(filePath, "utf-8");

  it("adds dialog semantics and labelled title", () => {
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('aria-labelledby="calendar-modal-title"');
    expect(source).toContain('<h3 id="calendar-modal-title" class="text-lg font-semibold">日历</h3>');
  });

  it("captures and restores the last focused element", () => {
    expect(source).toContain("let lastFocusedElement: HTMLElement | null = null;");
    expect(source).toContain("lastFocusedElement = activeElement instanceof HTMLElement ? activeElement : null;");
    expect(source).toContain("lastFocusedElement?.focus();");
  });

  it("moves focus into the modal when it opens", () => {
    expect(source).toContain("const firstFocusableElement = getFocusableElements(modal)[0];");
    expect(source).toContain("if (firstFocusableElement) {");
    expect(source).toContain("firstFocusableElement.focus();");
    expect(source).toContain("} else {");
    expect(source).toContain("modal.focus();");
  });

  it("restores and clears captured focus when modal closes", () => {
    expect(source).toContain("lastFocusedElement?.focus();");
    expect(source).toContain("lastFocusedElement = null;");
  });

  it("handles Escape only when modal is open", () => {
    expect(source).toContain("if (!modal || modal.classList.contains(\"hidden\")) {");
    expect(source).toContain("if (e.key === \"Escape\") {");
  });

  it("binds global listeners only once", () => {
    expect(source).toContain("__calendarModalListenersBound");
    expect(source).toContain("if (!globalState.__calendarModalListenersBound)");
  });

  it("traps tab navigation inside the modal while open", () => {
    expect(source).toContain("if (e.key !== \"Tab\" || !modal || modal.classList.contains(\"hidden\")) {");
    expect(source).toContain("const focusableElements = getFocusableElements(modal);");
    expect(source).toContain("const firstElement = focusableElements[0] ?? modal;");
    expect(source).toContain("const lastElement = focusableElements[focusableElements.length - 1] ?? modal;");
  });
});
