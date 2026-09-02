import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const source = (path: string) => readFileSync(resolve(root, path), "utf-8");

describe("archive index presentation contracts", () => {
  it("renders semantic, prefetching archive rows without card media", () => {
    const row = source("components/archive/ArchiveRow.astro");

    expect(row).toContain("<li");
    expect(row).toContain("<time");
    expect(row).toContain("datetime={published.toISOString()}");
    expect(row).toContain("toYMDInTimeZone");
    expect(row).toContain("getPath(id, filePath)");
    expect(row).toContain('data-astro-prefetch="tap"');
    expect(row).toContain("tags[0]");
    expect(row).toContain("withBase(`/posts/${tagSlug}/`)");
    expect(row).not.toContain("Card.astro");
    expect(row).not.toContain("<img");
  });

  it("uses year summaries for native collapsible archive groups", () => {
    const archives = source("pages/archives/index.astro");

    expect(archives).not.toContain(
      'import Card from "@/components/Card.astro"'
    );
    expect(archives).toContain(
      'import ArchiveRow from "@/components/archive/ArchiveRow.astro"'
    );
    expect(archives).toContain("<details");
    expect(archives).toContain("<summary");
    expect(archives).toContain("open={isLatestYear}");
    expect(archives).toContain("archive-year-${year}");
    expect(archives).toContain("<ArchiveRow {...data} />");
    expect(archives).not.toContain("<Card {...data} />");
    expect(archives).toContain("data-month-group");
  });
});
