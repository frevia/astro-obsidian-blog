import { useEffect, useRef, useState } from "react";
import { lockBodyScroll } from "../article-lightbox";
import type { DiaryImage } from "./types";

import "lightgallery/css/lightgallery.css";
import "lightgallery/css/lg-zoom.css";

const LIGHTGALLERY_PLACEHOLDER_KEY = "0000-0000-000-0000";
const lightGalleryLicenseKey =
  import.meta.env.PUBLIC_LIGHTGALLERY_LICENSE_KEY?.trim();
const hasValidLightGalleryLicense =
  !!lightGalleryLicenseKey &&
  lightGalleryLicenseKey !== LIGHTGALLERY_PLACEHOLDER_KEY;

interface OptimizedDiaryImage {
  thumbnail: string;
  original: string;
  width: number;
  height: number;
}

export interface DiaryImageGalleryProps {
  images?: DiaryImage[];
  htmlContent?: string;
}

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/**
 * The image markup is intentionally derived synchronously from props. Astro can
 * therefore SSR the gallery and its native-link fallback before this island is
 * hydrated; lightGallery is only an enhancement layered on top in the effect.
 */
export default function DiaryImageGallery({
  images = [],
  htmlContent,
}: DiaryImageGalleryProps) {
  const previewRef = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(
    null
  );
  useEffect(() => {
    if (preview) return lockBodyScroll(document.body);
  }, [preview]);

  const galleryRef = useRef<HTMLElement>(null);
  const lightGalleryRef = useRef<{ destroy: () => void } | null>(null);
  const optimizedImages: OptimizedDiaryImage[] = images.map(image => ({
    thumbnail: image.src,
    original: image.original || image.src,
    width: image.width || 800,
    height: image.height || 600,
  }));

  useEffect(() => {
    if (!hasValidLightGalleryLicense || optimizedImages.length === 0) return;

    let cancelled = false;

    const initLightGallery = async () => {
      try {
        const { default: lightGallery } = await import("lightgallery");
        const { default: lgZoom } = await import("lightgallery/plugins/zoom");

        if (cancelled || !galleryRef.current) return;

        lightGalleryRef.current = lightGallery(galleryRef.current, {
          licenseKey: lightGalleryLicenseKey,
          plugins: [lgZoom],
          speed: 400,
          selector: "a.lg-item",
          download: false,
          counter: false,
          getCaptionFromTitleOrAlt: false,
          mode: "lg-fade",
          hideBarsDelay: 2000,
          showZoomInOutIcons: true,
          actualSize: false,
          enableDrag: true,
          enableSwipe: true,
          zoomFromOrigin: true,
          allowMediaOverlap: false,
        });
      } catch {
        // Native anchors remain usable when the optional gallery enhancement fails.
      }
    };

    void initLightGallery();

    return () => {
      cancelled = true;
      lightGalleryRef.current?.destroy();
      lightGalleryRef.current = null;
    };
    // The parsed image array is stable for a diary block. Watching its identity
    // and length avoids reinitializing the gallery on unrelated parent renders.
  }, [images, optimizedImages.length]);

  if (optimizedImages.length === 0) return null;

  return (
    <figure
      className="images-grid mb-4"
      ref={galleryRef}
      role="group"
      aria-label={`图片集合，共 ${optimizedImages.length} 张图片`}
    >
      <div
        className={`grid gap-3 ${
          htmlContent
            ? "w-full grid-cols-1"
            : optimizedImages.length === 1
              ? "max-w-80 grid-cols-1"
              : optimizedImages.length === 2
                ? "max-w-83 grid-cols-2"
                : optimizedImages.length === 4
                  ? "max-w-83 grid-cols-2"
                  : "max-w-126 grid-cols-3"
        }`}
      >
        {optimizedImages.map((optimizedImage, index) => {
          const image = images[index];
          const caption =
            image.title || `${optimizedImage.width}x${optimizedImage.height}`;
          const lightboxCaption = `<h4>${escapeHtml(image.alt)}</h4><p>${escapeHtml(caption)}</p>`;

          return (
            <a
              key={`${image.original}-${index}`}
              className={`lg-item group block overflow-hidden rounded-xl focus:ring-skin-accent focus:outline-none ${
                optimizedImages.length === 1
                  ? "relative"
                  : "image-item relative aspect-square"
              }`}
              style={
                optimizedImages.length === 1
                  ? undefined
                  : {
                      aspectRatio: "1 / 1",
                    }
              }
              data-src={optimizedImage.original}
              data-lg-size={`${optimizedImage.width}-${optimizedImage.height}`}
              data-sub-html={lightboxCaption}
              href={optimizedImage.original}
              onClick={event => {
                if (
                  lightGalleryRef.current ||
                  event.ctrlKey ||
                  event.metaKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                event.preventDefault();
                setPreview({
                  src: optimizedImage.original,
                  alt: image.alt || "图片预览",
                });
                previewRef.current?.showModal();
              }}
              aria-label={`查看大图：${image.alt}${image.title ? ` - ${image.title}` : ""}`}
            >
              <img
                src={optimizedImage.thumbnail}
                alt={image.alt || `图片 ${index + 1}`}
                width={optimizedImage.width}
                height={optimizedImage.height}
                className="app-card-media h-full w-full cursor-pointer object-cover transition-transform duration-300 hover:scale-105"
                style={
                  optimizedImages.length === 1
                    ? undefined
                    : {
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }
                }
                loading="lazy"
                decoding="async"
                title={image.title}
              />
            </a>
          );
        })}
      </div>
      <dialog
        ref={previewRef}
        aria-label="图片预览"
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-black/90 p-4 text-white backdrop:bg-black/90 open:flex open:items-center open:justify-center"
        onClose={() => setPreview(null)}
        onClick={event => {
          if (event.target === event.currentTarget) previewRef.current?.close();
        }}
      >
        <button
          type="button"
          autoFocus
          aria-label="关闭图片预览"
          className="absolute top-4 right-4 z-10 rounded-full bg-white/15 px-4 py-2 text-2xl focus-visible:outline-2 focus-visible:outline-white"
          onClick={() => previewRef.current?.close()}
        >
          ×
        </button>
        {preview && (
          <img
            src={preview.src}
            alt={preview.alt}
            className="max-h-[85dvh] max-w-full object-contain"
          />
        )}
      </dialog>
      {optimizedImages.length > 1 && (
        <figcaption className="sr-only">
          图片集合包含 {optimizedImages.length} 张图片，点击任意图片可查看大图
        </figcaption>
      )}
    </figure>
  );
}
