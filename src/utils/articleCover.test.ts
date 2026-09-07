import { describe, expect, it, vi } from "vitest";
import { resolveArticleCoverUrl } from "./articleCover";

describe("resolveArticleCoverUrl", () => {
  it("keeps resolved local covers same-origin instead of pinning a deployment domain", async () => {
    const resolveLocal = vi.fn().mockResolvedValue("/_astro/cover.webp");

    await expect(
      resolveArticleCoverUrl("../../attachments/cover.jpg", resolveLocal)
    ).resolves.toBe("/_astro/cover.webp");
    expect(resolveLocal).toHaveBeenCalledWith("../../attachments/cover.jpg");
  });

  it("keeps remote covers absolute and imported Astro assets same-origin", async () => {
    const resolveLocal = vi.fn();

    await expect(
      resolveArticleCoverUrl(
        "https://images.example.com/cover.jpg",
        resolveLocal
      )
    ).resolves.toBe("https://images.example.com/cover.jpg");
    await expect(
      resolveArticleCoverUrl({ src: "/_astro/local-cover.webp" }, resolveLocal)
    ).resolves.toBe("/_astro/local-cover.webp");
    expect(resolveLocal).not.toHaveBeenCalled();
  });

  it("returns undefined when a relative cover cannot be resolved", async () => {
    await expect(
      resolveArticleCoverUrl(
        "../../attachments/missing.jpg",
        async () => undefined
      )
    ).resolves.toBeUndefined();
  });
});
