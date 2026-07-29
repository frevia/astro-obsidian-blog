import { describe, expect, it } from "vitest";

import { attachmentRelativePath } from "./attachmentPath";

describe("attachmentRelativePath", () => {
  it.each([
    ["attachment/media/image.jpg", "image.jpg"],
    ["../data/attachment/media/image.jpg", "image.jpg"],
    ["attachments/image.jpg", "image.jpg"],
    ["../data/attachments/image.jpg", "image.jpg"],
    ["plain/image.jpg", "image.jpg"],
  ])("normalizes %s", (input, expected) => {
    expect(attachmentRelativePath(input)).toBe(expected);
  });
});
