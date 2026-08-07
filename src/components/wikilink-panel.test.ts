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

  it("reuses the shared safe site-relative href preparation", () => {
    expect(componentSource).toContain(
      'import { prepareWikilinkReferences } from "@/utils/wikilinkReferences"'
    );
    expect(componentSource).toContain("prepareWikilinkReferences(outgoing)");
    expect(componentSource).toContain("prepareWikilinkReferences(backlinks)");
    expect(componentSource).not.toContain("href={reference.href}");
    expect(componentSource).toContain('data-astro-prefetch="tap"');
  });

  it("keeps article-provided titles in Astro's escaped text binding", () => {
    expect(componentSource).toContain("{reference.title}</span>");
    expect(componentSource).not.toContain("set:html");
  });
});
