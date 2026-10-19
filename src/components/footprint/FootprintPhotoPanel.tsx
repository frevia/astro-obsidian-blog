import { useEffect, useMemo, useRef } from "react";
import type { AlbumPhoto } from "@/utils/album";
import type { FootprintRecord } from "../FootprintMap";
import { initArticleLightbox } from "../article-lightbox";
import { photosAtPlace } from "./placePhotos";

type Props = {
  name: string;
  posts: FootprintRecord[];
  photos: AlbumPhoto[];
  onClose: () => void;
};

export default function FootprintPhotoPanel({
  name,
  posts,
  photos,
  onClose,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const selectedPhotos = useMemo(
    () => photosAtPlace(photos, posts),
    [photos, posts]
  );
  useEffect(() => {
    window.__articleLightboxCleanup?.();
    const cleanup = initArticleLightbox({ open: "查看大图" });
    window.__articleLightboxCleanup = cleanup;
    closeRef.current?.focus({ preventScroll: true });
    if (window.matchMedia("(max-width: 767px)").matches) {
      closeRef.current?.scrollIntoView({ block: "nearest" });
    }
    const onKeydown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        document.getElementById("article-lightbox")?.hidden
      )
        onClose();
    };
    // Capture first so Escape closes only the lightbox when it is open.
    document.addEventListener("keydown", onKeydown, true);
    return () => {
      cleanup();
      if (window.__articleLightboxCleanup === cleanup)
        window.__articleLightboxCleanup = undefined;
      document.removeEventListener("keydown", onKeydown, true);
    };
  }, [selectedPhotos, onClose]);

  return (
    <aside
      className="footprint-photo-panel"
      aria-labelledby="footprint-photo-title"
    >
      <header className="footprint-photo-panel-header">
        <div>
          <h3 id="footprint-photo-title">{selectedPhotos.length} 张照片</h3>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="关闭地点照片"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M6 18 18 6" />
          </svg>
        </button>
      </header>
      <div id="article" className="footprint-photo-panel-body">
        {posts.map(post => (
          <section
            className="footprint-photo-story"
            key={post.url}
            aria-label={post.title}
          >
            <div className="footprint-photo-articles">
              <a href={post.url} data-astro-prefetch="tap">
                <span>{post.title}</span>
                <small>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  {post.name}
                </small>
              </a>
              {posts.length > 1 &&
                post.date &&
                !Number.isNaN(Date.parse(post.date)) && (
                  <time dateTime={post.date} className="footprint-photo-date">
                    发布于{" "}
                    {new Intl.DateTimeFormat("zh-CN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      timeZone: "Asia/Shanghai",
                    }).format(new Date(post.date))}
                  </time>
                )}
            </div>
            <div className="footprint-place-photos">
              {selectedPhotos
                .filter(photo =>
                  photo.sources.some(source => source.url === post.url)
                )
                .map(photo => (
                  <figure key={photo.src}>
                    <img
                      src={photo.src}
                      alt={photo.alt || name}
                      loading="lazy"
                      decoding="async"
                      data-lightbox-src={photo.original}
                      data-photo-exif={photo.exif}
                    />
                    <figcaption hidden>
                      <a href={post.url} data-photo-source>
                        阅读游记：{post.title}
                      </a>
                    </figcaption>
                  </figure>
                ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
