import { describe, expect, it, vi } from "vitest";
import { createPagefindLoader, type PagefindInstance } from "./pagefind-loader";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

const pagefind: PagefindInstance = {
  search: vi.fn().mockResolvedValue({ results: [] }),
};

describe("Pagefind loader", () => {
  it("deduplicates a pending import by normalized bundle URL", async () => {
    const pending = deferred<PagefindInstance>();
    const importer = vi.fn(() => pending.promise);
    const load = createPagefindLoader(importer);

    const first = load("/blog/pagefind/");
    const second = load("/blog/pagefind///");

    expect(second).toBe(first);
    expect(importer).toHaveBeenCalledOnce();
    expect(importer).toHaveBeenCalledWith("/blog/pagefind/pagefind.js");

    pending.resolve(pagefind);
    await expect(first).resolves.toBe(pagefind);
  });

  it("keeps different base paths isolated", async () => {
    const importer = vi.fn().mockResolvedValue(pagefind);
    const load = createPagefindLoader(importer);

    await Promise.all([load("/first/pagefind/"), load("/second/pagefind/")]);

    expect(importer.mock.calls).toEqual([
      ["/first/pagefind/pagefind.js"],
      ["/second/pagefind/pagefind.js"],
    ]);
  });

  it("evicts a failed import so a later interaction can retry", async () => {
    const importer = vi
      .fn()
      .mockRejectedValueOnce(new Error("not built yet"))
      .mockResolvedValueOnce(pagefind);
    const load = createPagefindLoader(importer);

    await expect(load("/pagefind/")).rejects.toThrow("not built yet");
    await expect(load("/pagefind/")).resolves.toBe(pagefind);

    expect(importer).toHaveBeenCalledTimes(2);
  });
});
