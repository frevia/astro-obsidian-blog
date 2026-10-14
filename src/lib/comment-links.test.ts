import { describe, expect, it } from "vitest";

import {
  commentDestination,
  readCommentTarget,
  type CommentCatalog,
} from "./comment-links";

const siteUrl = "https://example.com/";
const catalog: CommentCatalog = {
  "/notes": {
    title: "Notes",
    href: "/notes",
    anchor: "date-2026-04-04",
  },
  "/blog/hello": {
    title: "Hello",
    href: "/blog/hello",
  },
};

describe("commentDestination", () => {
  it("maps a Notes path and keeps a trailing slash in the thread query", () => {
    expect(
      commentDestination("/notes/", "comment_1", catalog, siteUrl)
    ).toEqual({
      href: "/notes?comment=comment_1&thread=%2Fnotes%2F#date-2026-04-04",
      title: "Notes",
    });
  });

  it("accepts an absolute URL from the configured site origin", () => {
    expect(
      commentDestination(
        "https://example.com/blog/hello?from=comment#old",
        "reply-2",
        catalog,
        siteUrl
      )
    ).toEqual({
      href: "/blog/hello?comment=reply-2&thread=%2Fblog%2Fhello#reply-2",
      title: "Hello",
    });
  });

  it("does not guess an unknown catalog path", () => {
    expect(
      commentDestination("/notes/2026/04/04", "comment", catalog, siteUrl)
    ).toBe(null);
  });

  it("rejects external, protocol-relative, injected, malformed, and invalid-id inputs", () => {
    expect(
      commentDestination(
        "https://evil.example/notes",
        "comment",
        catalog,
        siteUrl
      )
    ).toBeNull();
    expect(
      commentDestination("//evil.example/notes", "comment", catalog, siteUrl)
    ).toBeNull();
    expect(
      commentDestination("javascript:alert(1)", "comment", catalog, siteUrl)
    ).toBeNull();
    expect(
      commentDestination(
        "https://example.com@evil.example/notes",
        "comment",
        catalog,
        siteUrl
      )
    ).toBeNull();
    expect(
      commentDestination("/notes/%5Cother", "comment", catalog, siteUrl)
    ).toBeNull();
    expect(
      commentDestination("/notes/%", "comment", catalog, siteUrl)
    ).toBeNull();
    expect(commentDestination("/notes", "bad id", catalog, siteUrl)).toBeNull();
    expect(commentDestination("/notes", "", catalog, siteUrl)).toBeNull();
  });
});

describe("readCommentTarget", () => {
  it("accepts a matching thread and preserves its path", () => {
    expect(
      readCommentTarget(
        "/notes/",
        "?comment=reply-2&thread=%2Fnotes",
        "#date-2026-04-04"
      )
    ).toEqual({ id: "reply-2", path: "/notes" });
  });

  it("defaults a missing thread to the current path", () => {
    expect(
      readCommentTarget("/blog/hello", "?comment=reply-2", "#old")
    ).toEqual({
      id: "reply-2",
      path: "/blog/hello",
    });
  });

  it("ignores an old hash when a valid comment query is present", () => {
    expect(
      readCommentTarget(
        "/notes",
        "?comment=reply-2&thread=%2Fnotes",
        "#date-2025-01-01"
      )
    ).toEqual({ id: "reply-2", path: "/notes" });
  });

  it("rejects invalid comments and unrelated threads", () => {
    expect(readCommentTarget("/notes", "?comment=bad%20id", "")).toBeNull();
    expect(
      readCommentTarget("/notes", "?comment=reply-2&thread=%2Fblog", "")
    ).toBeNull();
    expect(
      readCommentTarget("/notes", "?comment=reply-2&thread=%ZZ", "")
    ).toBeNull();
  });

  it("allows a valid page hash but reserves date anchors for Notes", () => {
    expect(readCommentTarget("/notes", "", "#reply-2")).toEqual({
      id: "reply-2",
      path: "/notes",
    });
    expect(readCommentTarget("/notes", "", "#date-2026-04-04")).toBeNull();
  });
});
