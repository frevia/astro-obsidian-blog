import { describe, expect, it, vi } from "vitest";
import { resolveArticleCoverUrl } from "./articleCover";

describe("resolveArticleCoverUrl", () => {
  it("resolves a relative content cover through the local asset pipeline", async () => {
    const resolveLocal = vi.fn().mockResolvedValue("/_astro/cover.webp");

    await expect(
      resolveArticleCoverUrl(
        "../../attachments/cover.jpg",
        "https://frevia.site",
        resolveLocal
      )
    ).resolves.toBe("https://frevia.site/_astro/cover.webp");
    expect(resolveLocal).toHaveBeenCalledWith("../../attachments/cover.jpg");
  });

  it("keeps remote and Astro image sources absolute", async () => {
    const resolveLocal = vi.fn();

    await expect(
      resolveArticleCoverUrl(
        "https://images.example.com/cover.jpg",
        "https://frevia.site",
        resolveLocal
      )
    ).resolves.toBe("https://images.example.com/cover.jpg");
    await expect(
      resolveArticleCoverUrl(
        { src: "/_astro/local-cover.webp" },
        "https://frevia.site",
        resolveLocal
      )
    ).resolves.toBe("https://frevia.site/_astro/local-cover.webp");
    expect(resolveLocal).not.toHaveBeenCalled();
  });

  it("returns undefined when a relative cover cannot be resolved", async () => {
    await expect(
      resolveArticleCoverUrl(
        "../../attachments/missing.jpg",
        "https://frevia.site",
        async () => undefined
      )
    ).resolves.toBeUndefined();
  });
});
