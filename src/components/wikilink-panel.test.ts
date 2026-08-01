import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const componentSource = readFileSync(
  resolve(import.meta.dirname, "WikilinkPanel.astro"),
  "utf-8"
);

describe("WikilinkPanel", () => {
  it("renders no empty-state text node when both link lists are empty", () => {
    expect(componentSource).toContain(
      "const hasLinks = outgoingLinks.length > 0 || backlinkLinks.length > 0;"
    );
    expect(componentSource).toContain("hasLinks && (");
    expect(componentSource).not.toContain(
      "(outgoing.length || backlinks.length)"
    );
  });

  it("applies BASE_URL only after accepting a safe site-relative href", () => {
    expect(componentSource).toContain(
      'import { withBase } from "@/utils/withBase"'
    );
    expect(componentSource).toContain('!path.startsWith("/")');
    expect(componentSource).toContain('path.startsWith("//")');
    expect(componentSource).toContain('path.includes("\\\\")');
    expect(componentSource).toContain("return withBase(path);");
    expect(componentSource).toContain(
      "const href = safeSiteHref(reference.href)"
    );
    expect(componentSource).not.toContain("href={reference.href}");
  });

  it("keeps article-provided titles in Astro's escaped text binding", () => {
    expect(componentSource).toContain("{reference.title}</span>");
    expect(componentSource).not.toContain("set:html");
  });
});
