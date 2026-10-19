import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@/styles/footprint-map.css";
import { footprintPlaceKey, findLinkedPlace } from "@/utils/footprintPlaces";
export { footprintPlaceKey } from "@/utils/footprintPlaces";
import type { AlbumPhoto } from "@/utils/album";
import FootprintPhotoPanel from "./footprint/FootprintPhotoPanel";
import { groupNearbyPlaces } from "./footprint/photoClusters";
import { manageMapStyle } from "./footprint/mapStyleLifecycle";
import { loadAMap, type AMapInstance, type AMapMarker } from "./footprint/amap";

export interface FootprintPlace {
  name: string;
  lng: number;
  lat: number;
}

export interface FootprintRecord {
  title: string;
  url: string;
  name: string;
  lng: number;
  lat: number;
  date?: string;
  thumbnail?: {
    src: string;
    alt: string;
  };
}

export interface FootprintMapProps {
  places?: FootprintPlace[];
  records?: FootprintRecord[];
  photos?: AlbumPhoto[];
}

type PlaceItem = FootprintPlace & {
  key: string;
  posts: FootprintRecord[];
};

const MAP_PIN_PATH =
  "M16 2C9.373 2 4 7.373 4 14c0 8.68 9.65 18.4 11.35 20.03a.92.92 0 0 0 1.3 0C18.35 32.4 28 22.68 28 14 28 7.373 22.627 2 16 2Z";

function currentMapStyle() {
  return document.documentElement.dataset.theme === "dark"
    ? "amap://styles/dark"
    : "amap://styles/normal";
}

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function recordsAtPlace(
  place: FootprintPlace,
  records: FootprintRecord[]
): FootprintRecord[] {
  return records
    .filter(
      record =>
        Math.abs(record.lng - place.lng) < 1e-5 &&
        Math.abs(record.lat - place.lat) < 1e-5
    )
    .sort((a, b) => recordTime(b) - recordTime(a));
}

function recordTime(record?: FootprintRecord): number {
  if (!record?.date) return 0;
  const parsed = Date.parse(record.date);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value?: string): string {
  if (!value) return "日期未记录";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "日期未记录"
    : dateFormatter.format(date);
}

// Normalize pixel, line and page wheel deltas; trackpad pinch uses ctrlKey.
export function wheelZoomDelta(
  event: Pick<WheelEvent, "deltaY" | "deltaMode" | "ctrlKey">
): number {
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
  const delta = -event.deltaY * unit * (event.ctrlKey ? 0.025 : 0.005);
  return Number.isFinite(delta) ? Math.max(-1, Math.min(1, delta)) : 0;
}

function createMarkerButton(
  name: string,
  thumbnail?: FootprintRecord["thumbnail"],
  count = 1
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "footprint-marker-icon-wrap footprint-marker-button";
  button.setAttribute("aria-label", `查看${name}的照片`);
  button.innerHTML = `<span class="footprint-marker-icon" aria-hidden="true"><svg viewBox="0 0 32 42" focusable="false"><ellipse class="footprint-marker-pin-base" cx="16" cy="37" rx="9" ry="2.8"></ellipse><path class="footprint-marker-pin-body" d="${MAP_PIN_PATH}"></path><circle class="footprint-marker-pin-hole" cx="16" cy="14" r="4.1"></circle></svg></span>`;
  if (thumbnail) {
    button.classList.add("footprint-photo-button");
    const frame = document.createElement("span");
    frame.className = "footprint-marker-icon footprint-photo-marker";
    const image = document.createElement("img");
    image.src = thumbnail.src;
    image.alt = "";
    image.width = 50;
    image.height = 50;
    image.decoding = "async";
    image.addEventListener(
      "error",
      () => {
        button.classList.remove("footprint-photo-button");
        frame.classList.remove("footprint-photo-marker");
        frame.innerHTML = `<svg viewBox="0 0 32 42" aria-hidden="true"><path class="footprint-marker-pin-body" d="${MAP_PIN_PATH}"></path><circle class="footprint-marker-pin-hole" cx="16" cy="14" r="4.1"></circle></svg>`;
      },
      { once: true }
    );
    frame.append(image);
    button.replaceChildren(frame);
  }
  if (count > 1) {
    const badge = document.createElement("span");
    badge.className = "footprint-marker-count";
    badge.textContent = String(count);
    badge.setAttribute("aria-hidden", "true");
    button.append(badge);
    button.setAttribute("aria-label", `放大查看 ${count} 个地点`);
  }
  return button;
}

const EMPTY_PLACES: FootprintPlace[] = [];
const EMPTY_RECORDS: FootprintRecord[] = [];
const EMPTY_PHOTOS: AlbumPhoto[] = [];

const FootprintMap: React.FC<FootprintMapProps> = ({
  places = EMPTY_PLACES,
  records = EMPTY_RECORDS,
  photos = EMPTY_PHOTOS,
}) => {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMapInstance | null>(null);
  const markersRef = useRef<AMapMarker[]>([]);
  const [selection, setSelection] = useState<PlaceItem | null>(null);
  const focusPhotoCloseRef = useRef(false);
  const selectionRef = useRef<PlaceItem | null>(null);
  const selectedButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeSelection = useCallback(() => {
    selectionRef.current = null;
    setSelection(null);
    const button = selectedButtonRef.current;
    button?.querySelector("span")?.classList.remove("is-selected");
    button?.setAttribute("aria-expanded", "false");
    if (button?.isConnected) button.focus({ preventScroll: true });
  }, []);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const placeItems = useMemo<PlaceItem[]>(
    () =>
      places
        .map(place => ({
          ...place,
          key: footprintPlaceKey(place),
          posts: recordsAtPlace(place, records),
        }))
        .sort((a, b) => {
          const latestA = recordTime(a.posts[0]);
          const latestB = recordTime(b.posts[0]);
          return latestB - latestA || a.name.localeCompare(b.name, "zh-CN");
        }),
    [places, records]
  );
  const articleCount = new Set(records.map(record => record.url)).size;
  const latestDate = records.reduce<string | undefined>((latest, record) => {
    if (!record.date) return latest;
    if (!latest || recordTime(record) > Date.parse(latest)) return record.date;
    return latest;
  }, undefined);

  const clearSelection = useCallback(() => {
    closeSelection();
    mapRef.current?.setFitView(markersRef.current, true, [48, 48, 48, 48], 12);
  }, [closeSelection]);

  useEffect(() => {
    const element = mapElementRef.current;
    if (!element) return;
    let cancelled = false;
    let map: AMapInstance | undefined;
    let styleLifecycle: ReturnType<typeof manageMapStyle> | undefined;
    let themeObserver: MutationObserver | undefined;
    let readyTimer: ReturnType<typeof setTimeout> | undefined;
    let wheelFrame: number | undefined;
    let wheelDelta = 0;
    const onWheel = (event: WheelEvent) => {
      if (!map || cancelled) return;
      const delta = wheelZoomDelta(event);
      if (!delta) return;
      event.preventDefault();
      // Only handle this map's standard wheel event, once, before SDK listeners.
      event.stopImmediatePropagation();
      wheelDelta = Math.max(-1, Math.min(1, wheelDelta + delta));
      if (wheelFrame !== undefined) return;
      wheelFrame = requestAnimationFrame(() => {
        wheelFrame = undefined;
        if (!cancelled && map) {
          const zoom = Math.max(2, Math.min(20, map.getZoom() + wheelDelta));
          map.setZoom(zoom, true);
        }
        wheelDelta = 0;
      });
    };
    element.addEventListener("wheel", onWheel, {
      passive: false,
      capture: true,
    });
    setMapReady(false);
    setMapError(null);

    void loadAMap()
      .then(AMap => {
        if (cancelled) return;
        map = new AMap.Map(element, {
          viewMode: "2D",
          center: [105, 25],
          zoom: 4,
          scrollWheel: true,
          zoomEnable: true,
          touchZoom: true,
          resizeEnable: true,
          animateEnable: !window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches,
        });
        mapRef.current = map;
        styleLifecycle = manageMapStyle(map);
        styleLifecycle.update(currentMapStyle());
        readyTimer = setTimeout(() => {
          if (!cancelled)
            setMapError("地图暂时无法加载，请稍后刷新；下方仍可查看足迹文章。");
        }, 20000);
        map.on("complete", () => {
          if (cancelled) return;
          clearTimeout(readyTimer);
          setMapReady(true);
          setMapError(null);
        });
        let buttons: HTMLButtonElement[] = [];
        let visibleMarkers: AMapMarker[] = [];
        // Keep all positions for the “fit all” control, even while clustered.
        markersRef.current = placeItems.map(
          item =>
            new AMap.Marker({
              position: [item.lng, item.lat],
            })
        );
        const renderMarkers = () => {
          if (cancelled || !map) return;
          map.remove(visibleMarkers);
          selectedButtonRef.current = null;
          buttons = [];
          const groups = groupNearbyPlaces(
            placeItems.map(item => {
              const pixel = map!.lngLatToContainer([item.lng, item.lat]);
              return { item, x: pixel.getX(), y: pixel.getY() };
            })
          );
          visibleMarkers = groups.map(group => {
            const item = group[0];
            const thumbnail = group
              .flatMap(place => place.posts)
              .find(post => post.thumbnail)?.thumbnail;
            const button = createMarkerButton(
              item.name,
              thumbnail,
              group.length
            );
            const isSelected = group.some(
              place => place.key === selectionRef.current?.key
            );
            button.setAttribute("aria-expanded", String(isSelected));
            button
              .querySelector("span")
              ?.classList.toggle("is-selected", isSelected);
            if (isSelected) selectedButtonRef.current = button;
            buttons.push(button);
            const position: [number, number] = [item.lng, item.lat];
            const marker = new AMap.Marker({
              position,
              content: button,
              anchor: "bottom-center",
              title: group.map(place => place.name).join("、"),
            });
            button.addEventListener("click", event => {
              event.stopPropagation();
              focusPhotoCloseRef.current = event.detail === 0;
              selectionRef.current = null;
              setSelection(null);
              if (group.length > 1 && map!.getZoom() < 20) {
                map!.setZoomAndCenter(
                  Math.min(20, map!.getZoom() + 2),
                  position
                );
                return;
              }
              buttons.forEach(other => {
                other
                  .querySelector("span")
                  ?.classList.toggle("is-selected", other === button);
                other.setAttribute("aria-expanded", String(other === button));
              });
              if (!window.matchMedia("(max-width: 767px)").matches) {
                const pixel = map!.lngLatToContainer(position);
                map!.panBy(element.clientWidth * 0.3 - pixel.getX(), 0);
              }
              selectedButtonRef.current = button;
              const selected =
                group.length === 1
                  ? item
                  : {
                      ...item,
                      name: group.map(place => place.name).join("、"),
                      posts: Array.from(
                        new Map(
                          group
                            .flatMap(place => place.posts)
                            .map(post => [post.url, post])
                        ).values()
                      ),
                    };
              selectionRef.current = selected;
              setSelection(selected);
            });
            map!.add(marker);
            return marker;
          });
        };
        map.on("zoomend", renderMarkers);
        map.on("resize", renderMarkers);
        map.on("complete", renderMarkers);
        if (markersRef.current.length)
          map.setFitView(markersRef.current, true, [64, 64, 64, 64], 12);
        const linkedPlace = findLinkedPlace(placeItems, window.location.search);
        if (linkedPlace) {
          selectionRef.current = linkedPlace;
          setSelection(linkedPlace);
          map.setZoomAndCenter(14, [linkedPlace.lng, linkedPlace.lat]);
          if (!window.matchMedia("(max-width: 767px)").matches)
            map.panBy(-element.clientWidth * 0.2, 0);
        }
        renderMarkers();
        map.addControl(new AMap.Scale());
        themeObserver = new MutationObserver(() =>
          styleLifecycle?.update(currentMapStyle())
        );
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-theme"],
        });
      })
      .catch(() => {
        if (!cancelled)
          setMapError("地图暂时无法加载，但仍可从下方文章链接查看足迹。");
      });

    return () => {
      cancelled = true;
      element.removeEventListener("wheel", onWheel, true);
      if (wheelFrame !== undefined) cancelAnimationFrame(wheelFrame);
      clearTimeout(readyTimer);
      themeObserver?.disconnect();
      selectedButtonRef.current = null;
      markersRef.current = [];
      if (styleLifecycle) styleLifecycle.dispose();
      else map?.destroy();
      mapRef.current = null;
    };
  }, [placeItems]);

  const hasPlaces = placeItems.length > 0;

  return (
    <section
      className="footprint-explorer"
      aria-label="足迹地图与统计"
      data-footprint-explorer
    >
      {!hasPlaces ? (
        <section
          className="footprint-empty-state"
          aria-labelledby="footprint-empty-title"
          data-footprint-empty-state
        >
          <p className="footprint-eyebrow">还没有记录</p>
          <h2 id="footprint-empty-title">这里还没有地点</h2>
          <p>在文章里加上地点，这里就会显示相应标记。</p>
        </section>
      ) : null}

      <section
        className="footprint-map-panel"
        aria-labelledby="footprint-map-title"
      >
        <h2 id="footprint-map-title" className="sr-only">
          足迹地图
        </h2>

        <div
          className={`footprint-map-body ${selection ? "has-photo-panel" : ""}`}
        >
          <div className="footprint-map-frame">
            <div
              ref={mapElementRef}
              className="footprint-amap"
              role="region"
              aria-label="交互式足迹地图"
              aria-describedby="footprint-map-help"
            />
            <div
              className="footprint-map-toolbar"
              role="group"
              aria-label="地图操作"
            >
              <button
                type="button"
                aria-label="放大地图"
                title="放大地图"
                disabled={!mapReady}
                onClick={() => mapRef.current?.zoomIn()}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="缩小地图"
                title="缩小地图"
                disabled={!mapReady}
                onClick={() => mapRef.current?.zoomOut()}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="适配全部地点"
                title="适配全部地点"
                disabled={!hasPlaces || !mapReady}
                onClick={clearSelection}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" />
                </svg>
              </button>
            </div>
            {!mapReady && !mapError ? (
              <div
                className="footprint-map-loading app-loading-state"
                role="status"
              >
                正在准备地图图层…
              </div>
            ) : null}
            {mapError ? (
              <div className="footprint-map-error" role="status">
                {mapError}
              </div>
            ) : null}
          </div>
          {selection && (
            <FootprintPhotoPanel
              focusClose={focusPhotoCloseRef.current}
              key={selection.key}
              name={selection.name}
              posts={selection.posts}
              photos={photos}
              onClose={closeSelection}
            />
          )}
          {mapError ? (
            <ul className="footprint-fallback-links" aria-label="足迹文章">
              {Array.from(
                new Map(records.map(post => [post.url, post])).values()
              ).map(post => (
                <li key={post.url}>
                  <a href={post.url} data-astro-prefetch="tap">
                    {post.title}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
      <footer className="footprint-overview">
        <dl className="footprint-stats">
          <div>
            <dt>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              地点
            </dt>
            <dd>{placeItems.length}</dd>
          </div>
          <div>
            <dt>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Z M14 3v5h5M9 12h6M9 16h6" />
              </svg>
              文章
            </dt>
            <dd>{articleCount}</dd>
          </div>
          <div>
            <dt>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="5" width="16" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M4 11h16M8 15h2M14 15h2" />
              </svg>
              最近记录
            </dt>
            <dd className="footprint-stat-date">{formatDate(latestDate)}</dd>
          </div>
        </dl>
        <p className="footprint-map-help" id="footprint-map-help">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="3" width="12" height="18" rx="6" />
            <path d="M12 7v4" />
          </svg>
          <span>拖动浏览 · 滚轮缩放</span>
          <span className="sr-only">
            。点击地点打开照片列表，点击照片查看大图与来源文章；键盘可用 Tab
            选择标记，Enter 打开。
          </span>
        </p>
      </footer>
    </section>
  );
};

export default FootprintMap;
