import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@/styles/footprint-map.css";
import {
  loadAMap,
  type AMapInstance,
  type AMapMarker,
  type AMapInfoWindow,
} from "./footprint/amap";

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

export function footprintPlaceKey(place: FootprintPlace): string {
  return `${place.name}:${place.lng},${place.lat}`;
}

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

function formatCoordinate(value: number): string {
  return value.toFixed(4);
}

function createMarkerButton(name: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "footprint-marker-icon-wrap footprint-marker-button";
  button.setAttribute("aria-label", `查看${name}的文章`);
  button.innerHTML = `<span class="footprint-marker-icon" aria-hidden="true"><svg viewBox="0 0 32 42" focusable="false"><ellipse class="footprint-marker-pin-base" cx="16" cy="37" rx="9" ry="2.8"></ellipse><path class="footprint-marker-pin-body" d="${MAP_PIN_PATH}"></path><circle class="footprint-marker-pin-hole" cx="16" cy="14" r="4.1"></circle></svg></span>`;
  return button;
}

function createPopupContent(item: PlaceItem): HTMLElement {
  const root = document.createElement("div");
  root.className = "footprint-popup-content";

  const eyebrow = document.createElement("p");
  eyebrow.className = "footprint-popup-eyebrow";
  eyebrow.textContent = `${item.posts.length} 篇文章`;
  root.append(eyebrow);

  const title = document.createElement("h3");
  title.className = "footprint-popup-title";
  title.textContent = item.name;
  root.append(title);

  const coordinate = document.createElement("p");
  coordinate.className = "footprint-popup-coordinate";
  coordinate.textContent = `${formatCoordinate(item.lat)}, ${formatCoordinate(item.lng)}`;
  root.append(coordinate);

  if (item.posts.length > 0) {
    const list = document.createElement("ul");
    list.className = "footprint-popup-posts";
    item.posts.forEach(post => {
      const listItem = document.createElement("li");
      const link = document.createElement("a");
      link.href = post.url;
      link.dataset.astroPrefetch = "tap";

      if (post.thumbnail) {
        const image = document.createElement("img");
        image.className = "footprint-popup-post-image";
        image.src = post.thumbnail.src;
        image.alt = post.thumbnail.alt;
        image.width = 112;
        image.height = 70;
        image.loading = "lazy";
        image.decoding = "async";
        link.append(image);
      }

      const copy = document.createElement("span");
      copy.className = "footprint-popup-post-copy";

      const postTitle = document.createElement("span");
      postTitle.className = "footprint-popup-post-title";
      postTitle.textContent = post.title;
      copy.append(postTitle);

      const postDate = document.createElement("time");
      postDate.className = "footprint-popup-post-date";
      postDate.textContent = formatDate(post.date);
      if (post.date) postDate.dateTime = post.date;
      copy.append(postDate);

      link.append(copy);
      listItem.append(link);
      list.append(listItem);
    });
    root.append(list);
  }

  return root;
}

const EMPTY_PLACES: FootprintPlace[] = [];
const EMPTY_RECORDS: FootprintRecord[] = [];

const FootprintMap: React.FC<FootprintMapProps> = ({
  places = EMPTY_PLACES,
  records = EMPTY_RECORDS,
}) => {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMapInstance | null>(null);
  const markersRef = useRef<AMapMarker[]>([]);
  const popupRef = useRef<AMapInfoWindow | null>(null);
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
    popupRef.current?.close();
    mapRef.current?.setFitView(markersRef.current, true, [48, 48, 48, 48], 12);
  }, []);

  useEffect(() => {
    const element = mapElementRef.current;
    if (!element) return;
    let cancelled = false;
    let map: AMapInstance | undefined;
    let themeObserver: MutationObserver | undefined;
    let readyTimer: ReturnType<typeof setTimeout> | undefined;
    setMapReady(false);
    setMapError(null);

    void loadAMap()
      .then(AMap => {
        if (cancelled) return;
        map = new AMap.Map(element, {
          viewMode: "2D",
          center: [105, 25],
          zoom: 4,
          mapStyle: currentMapStyle(),
          scrollWheel: true,
          resizeEnable: true,
          animateEnable: !window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches,
        });
        mapRef.current = map;
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
        const popup = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -42) });
        popupRef.current = popup;
        const buttons: HTMLButtonElement[] = [];
        popup.on("close", () =>
          buttons.forEach(button => {
            button.querySelector("span")?.classList.remove("is-selected");
            button.setAttribute("aria-expanded", "false");
          })
        );
        markersRef.current = placeItems.map(item => {
          // Article coordinates come from AMap and are already GCJ-02.
          const position: [number, number] = [item.lng, item.lat];
          const button = createMarkerButton(item.name);
          button.setAttribute("aria-expanded", "false");
          buttons.push(button);
          const marker = new AMap.Marker({
            position,
            content: button,
            anchor: "bottom-center",
            title: item.name,
          });
          button.addEventListener("click", event => {
            event.stopPropagation();
            popup.close();
            buttons.forEach(other => {
              other
                .querySelector("span")
                ?.classList.toggle("is-selected", other === button);
              other.setAttribute("aria-expanded", String(other === button));
            });
            popup.setContent(createPopupContent(item));
            popup.open(map!, position);
          });
          map!.add(marker);
          return marker;
        });
        if (markersRef.current.length)
          map.setFitView(markersRef.current, true, [48, 48, 48, 48], 12);
        map.addControl(new AMap.Scale());
        themeObserver = new MutationObserver(() =>
          map?.setMapStyle(currentMapStyle())
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
      clearTimeout(readyTimer);
      themeObserver?.disconnect();
      popupRef.current?.close();
      popupRef.current = null;
      markersRef.current = [];
      map?.destroy();
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

        <div className="footprint-map-body">
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
            。点击地点查看照片与文章；键盘可用 Tab 选择标记，Enter 打开。
          </span>
        </p>
      </footer>
    </section>
  );
};

export default FootprintMap;
