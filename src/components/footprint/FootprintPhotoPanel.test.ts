import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { expect, it } from "vitest";
import FootprintPhotoPanel from "./FootprintPhotoPanel";
import type { AlbumPhoto } from "@/utils/album";

it("keeps each story's photos and source link together, including shared photos", () => {
  const posts = ["old", "new"].map(id => ({
    title: id,
    url: `/posts/${id}`,
    name: "杭州",
    lng: 120,
    lat: 30,
    date: "2024-01-01T00:00:00Z",
  }));
  const photo = (src: string, ids: string[]): AlbumPhoto => ({
    src,
    original: src,
    width: 10,
    height: 10,
    alt: src,
    exif: "",
    sources: ids.map(id => ({
      title: id,
      url: `/posts/${id}`,
      date: "2024-01-01",
    })),
  });
  const html = renderToStaticMarkup(
    React.createElement(FootprintPhotoPanel, {
      name: "杭州",
      posts,
      photos: [
        photo("old.jpg", ["old"]),
        photo("new.jpg", ["new"]),
        photo("shared.jpg", ["old", "new"]),
      ],
      onClose: () => {},
    })
  );
  const $ = load(html);
  expect($("#article")).toHaveLength(1);
  expect(
    $("section[aria-label='old'] img")
      .map((_, el) => $(el).attr("src"))
      .get()
  ).toEqual(["old.jpg", "shared.jpg"]);
  expect(
    $("section[aria-label='new'] img")
      .map((_, el) => $(el).attr("src"))
      .get()
  ).toEqual(["new.jpg", "shared.jpg"]);
  expect(
    $("section[aria-label='old'] [data-photo-source]")
      .map((_, el) => $(el).attr("href"))
      .get()
  ).toEqual(["/posts/old", "/posts/old"]);
  expect($("section time")).toHaveLength(2);
});
