import { describe, expect, it } from "vitest";

import { resolveSocialLinks } from "./socialLinks";

describe("resolveSocialLinks", () => {
  it("maps configured URLs and case-insensitive icon names for UI consumers", () => {
    const githubIcon = Symbol("github");

    expect(
      resolveSocialLinks(
        [
          {
            name: "GitHub",
            url: "https://github.com/example",
            linkTitle: "Example on GitHub",
          },
        ],
        { github: githubIcon },
        "Example"
      )
    ).toEqual([
      {
        name: "GitHub",
        href: "https://github.com/example",
        linkTitle: "Example on GitHub",
        icon: githubIcon,
      },
    ]);
  });

  it("rejects unknown configured icon names instead of hiding links", () => {
    expect(() =>
      resolveSocialLinks(
        [{ name: "Unknown", url: "https://example.com" }],
        {},
        "Example"
      )
    ).toThrow('Unknown social icon "Unknown"');
  });
});
