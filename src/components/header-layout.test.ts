import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("header navigation layout", () => {
  it("keeps desktop navigation labels on one line during font/view transitions", () => {
    const source = readFileSync("src/components/Header.astro", "utf-8");

    expect(source).toContain("whitespace-nowrap text-foreground/85");
    expect(source).toContain("transition:persist={useClientRouterTransitions}");
    expect(source).not.toContain('transition:name="site-brand"');
    expect(source).not.toContain("brandTransitionName");
    expect(source).toContain('alt=""');
    expect(source).toContain("data-nav-path={item.href}");
    expect(source).toContain("function syncActiveNavigation()");
    expect(source).toContain(
      'document.addEventListener("astro:after-swap", syncActiveNavigation)'
    );
    expect(source).toContain('class="hidden lg:flex lg:items-center"');
    expect(source).toContain("syncMenuState(false)");
    expect(source).toContain('class="nav-disclosure relative"');
    expect(source).toContain("closeDisclosures(true)");
    expect(source).toContain("group.querySelector('a[aria-current=\"page\"]')");
    expect(source).toContain(
      'document.addEventListener("astro:after-swap", () => closeDisclosures())'
    );
    expect(source).toContain(
      "max-h-[calc(100dvh-var(--header-top-height,5rem)-2rem)]"
    );
  });
});
