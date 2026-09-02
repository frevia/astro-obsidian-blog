import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("View Transition routing", () => {
  it("uses ClientRouter navigation while preserving the native fallback", () => {
    const config = readFileSync("astro-paper.config.ts", "utf-8");
    const resolver = readFileSync("src/config.ts", "utf-8");
    const layout = readFileSync("src/layouts/Layout.astro", "utf-8");

    expect(config).toContain('viewTransitions: "client-router"');
    expect(resolver).toContain(
      'viewTransitions: input.features?.viewTransitions ?? "client-router"'
    );
    expect(layout).toContain("useNativeViewTransitions");
    expect(layout).toContain("<ClientRouter />");
    expect(layout).toContain("data-view-transitions={useNativeViewTransitions");
    expect(layout).toContain('html[data-view-transitions="native"]');
    expect(layout).toContain("@view-transition");
    expect(layout).toContain("view-transition-name: site-header");
  });

  it("cleans up search for both router and native page lifecycles", () => {
    const searchDialog = readFileSync("src/scripts/search-dialog.ts", "utf-8");

    expect(searchDialog).toContain('"astro:before-swap", onPageExit');
    expect(searchDialog).toContain('"pageswap", onPageExit');
    expect(searchDialog).toContain('"pagehide", onPageExit');
    expect(searchDialog).toContain("{ capture: true }");
    expect(searchDialog).toContain("activationId !== state.activationId");
  });
});
