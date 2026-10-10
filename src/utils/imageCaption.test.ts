import { describe, expect, it } from "vitest";

import { getImageCaption } from "./imageCaption";

describe("getImageCaption", () => {
  it.each([
    ["photo.jpg", "/images/photo.jpg"],
    ["photo", "/images/photo.jpg"],
    ["photo", "/images/photo.webp?width=640#preview"],
    ["山间落日", "/images/%E5%B1%B1%E9%97%B4%E8%90%BD%E6%97%A5.jpg"],
    [
      "202406271801276_1775657297532706",
      "/_image?href=%2Fimages%2F202406271801276_1775657297532706.jpg&f=webp&w=640",
    ],
    ["IMG_1234", "/images/another-photo.jpg"],
    ["DSC-20240101", "/images/another-photo.jpg"],
    ["1234567890123", "/images/another-photo.jpg"],
    ["a1b2c3d4e5f60718293a4b5c6d7e8f90", "/images/another-photo.jpg"],
  ])("hides generated or filename-like alt text: %s", (alt, src) => {
    expect(getImageCaption(alt, src)).toBe("");
  });

  it.each([
    ["山间落日", "/images/IMG_1234.jpg"],
    ["海边的风", "/images/202406271801276.jpg"],
    ["<script>alert(1)</script>", "/images/IMG_1234.jpg"],
  ])("keeps real descriptions: %s", (alt, src) => {
    expect(getImageCaption(alt, src)).toBe(alt);
  });
});
