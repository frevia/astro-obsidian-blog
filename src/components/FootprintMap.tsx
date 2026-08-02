import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  LayerGroup,
  Map as LeafletMap,
  Marker as LeafletMarker,
} from "leaflet";
import "leaflet/dist/leaflet.css";
import "@/styles/footprint-leaflet.css";

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
}

export interface FootprintMapProps {
  places?: FootprintPlace[];
  records?: FootprintRecord[];
}

type LeafletApi = typeof import("leaflet");

type PlaceItem = FootprintPlace & {
  key: string;
  posts: FootprintRecord[];
};

const DEFAULT_CENTER: [number, number] = [25, 105];
const DEFAULT_ZOOM = 3;
const TILE_URL =
  import.meta.env.PUBLIC_FOOTPRINT_TILE_URL ??
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  import.meta.env.PUBLIC_FOOTPRINT_TILE_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

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

function recordTime(record: FootprintRecord): number {
  if (!record.date) return 0;
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

function createMarkerIcon(L: LeafletApi, selected: boolean) {
  return L.divIcon({
    className: "footprint-marker-icon-wrap",
    html: `<span class="footprint-marker-icon${selected ? " is-selected" : ""}" aria-hidden="true"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
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
    item.posts.slice(0, 3).forEach(post => {
      const listItem = document.createElement("li");
      const link = document.createElement("a");
      link.href = post.url;
      link.textContent = post.title;
      listItem.append(link);
      list.append(listItem);
    });
    root.append(list);
  }

  if (item.posts.length > 3) {
    const more = document.createElement("p");
    more.className = "footprint-popup-more";
    more.textContent = `还有 ${item.posts.length - 3} 篇文章`;
    root.append(more);
  }

  return root;
}

const FootprintMap: React.FC<FootprintMapProps> = ({
  places = [],
  records = [],
}) => {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletApi | null>(null);
  const markerLayerRef = useRef<LayerGroup<LeafletMarker> | null>(null);
  const markersRef = useRef(new Map<string, LeafletMarker>());

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

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

  const selectedItem = placeItems.find(item => item.key === selectedKey);
  const articleCount = new Set(records.map(record => record.url)).size;
  const latestDate = records.reduce<string | undefined>((latest, record) => {
    if (!record.date) return latest;
    if (!latest || recordTime(record) > Date.parse(latest)) return record.date;
    return latest;
  }, undefined);

  const fitAllPlaces = useCallback(
    (animate = true) => {
      const map = mapRef.current;
      const L = leafletRef.current;
      if (!map || !L) return;

      if (placeItems.length === 0) {
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate });
        return;
      }

      const bounds = L.latLngBounds(
        placeItems.map(item => [item.lat, item.lng] as [number, number])
      );
      map.fitBounds(bounds, {
        padding: [48, 48],
        maxZoom: 12,
        animate,
      });
    },
    [placeItems]
  );

  const selectPlace = useCallback((key: string) => {
    setSelectedKey(key);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedKey(null);
    mapRef.current?.closePopup();
    fitAllPlaces();
  }, [fitAllPlaces]);

  useEffect(() => {
    const element = mapElementRef.current;
    if (!element) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;

    const initializeMap = async () => {
      try {
        const module = (await import("leaflet")) as LeafletApi & {
          default?: LeafletApi;
        };
        if (cancelled) return;

        const L = module.default ?? module;
        const prefersReducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;
        const map = L.map(element, {
          zoomControl: false,
          minZoom: 2,
          maxZoom: 18,
          scrollWheelZoom: false,
          zoomAnimation: !prefersReducedMotion,
          markerZoomAnimation: !prefersReducedMotion,
          attributionControl: false,
        });

        L.tileLayer(TILE_URL, {
          maxZoom: 19,
          attribution: TILE_ATTRIBUTION,
          crossOrigin: true,
        }).addTo(map);
        L.control.zoom({ position: "topright" }).addTo(map);
        L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
        const attributionControl = L.control.attribution({ prefix: false });
        attributionControl.addTo(map);
        attributionControl.addAttribution(TILE_ATTRIBUTION);

        leafletRef.current = L;
        mapRef.current = map;
        markerLayerRef.current = L.layerGroup().addTo(map);
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize({ pan: false });
        });
        resizeObserver.observe(element);
        window.setTimeout(() => map.invalidateSize({ pan: false }), 0);
        setMapReady(true);
      } catch {
        if (!cancelled) {
          setMapError("地图暂时无法加载，但仍可从下方地点列表查看足迹。");
        }
      }
    };

    void initializeMap();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      markerLayerRef.current?.clearLayers();
      markerLayerRef.current = null;
      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !L || !markerLayer || !mapReady) return;

    markerLayer.clearLayers();
    markersRef.current.clear();

    placeItems.forEach(item => {
      const marker = L.marker([item.lat, item.lng], {
        icon: createMarkerIcon(L, item.key === selectedKey),
        title: item.name,
        keyboard: true,
        riseOnHover: true,
        autoPan: true,
      });
      marker.bindPopup(createPopupContent(item), {
        className: "footprint-leaflet-popup",
        maxWidth: 320,
        minWidth: 220,
      });
      marker.on("click", () => selectPlace(item.key));
      marker.on("popupopen", () => selectPlace(item.key));
      marker.addTo(markerLayer);
      markersRef.current.set(item.key, marker);
    });
  }, [mapReady, placeItems, selectPlace]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !mapReady) return;

    markersRef.current.forEach((marker, key) => {
      marker.setIcon(createMarkerIcon(L, key === selectedKey));
    });

    if (!selectedKey) return;
    const item = placeItems.find(place => place.key === selectedKey);
    const marker = markersRef.current.get(selectedKey);
    if (!item || !marker) return;

    const targetZoom = Math.max(map.getZoom(), 12);
    map.flyTo([item.lat, item.lng], targetZoom, { duration: 0.55 });
    marker.openPopup();
  }, [mapReady, placeItems, selectedKey]);

  useEffect(() => {
    if (!mapReady) return;
    fitAllPlaces(false);
  }, [fitAllPlaces, mapReady]);

  const hasPlaces = placeItems.length > 0;

  return (
    <section
      className="footprint-explorer"
      aria-labelledby="footprint-explorer-title"
      data-footprint-explorer
    >
      <header className="footprint-overview">
        <div className="footprint-overview-copy">
          <p className="footprint-eyebrow">Field notes / Map</p>
          <h2
            id="footprint-explorer-title"
            className="footprint-overview-title"
          >
            把文章里的地点，放回地图。
          </h2>
          <p className="footprint-overview-desc">
            从一枚地点标记出发，回到那篇文章、那段路和当时的视线。
          </p>
        </div>
        <dl className="footprint-stats">
          <div>
            <dt>地点</dt>
            <dd>{placeItems.length}</dd>
          </div>
          <div>
            <dt>文章</dt>
            <dd>{articleCount}</dd>
          </div>
          <div>
            <dt>最近记录</dt>
            <dd className="footprint-stat-date">{formatDate(latestDate)}</dd>
          </div>
        </dl>
      </header>

      {!hasPlaces ? (
        <section
          className="footprint-empty-state"
          aria-labelledby="footprint-empty-title"
          data-footprint-empty-state
        >
          <p className="footprint-eyebrow">First pin</p>
          <h2 id="footprint-empty-title">下一段旅程会从第一枚地点标记开始</h2>
          <p>
            在文章 frontmatter
            添加地点后，这里会自动生成地图标记，并关联对应文章。
          </p>
        </section>
      ) : null}

      <section
        className="footprint-map-panel"
        aria-labelledby="footprint-map-title"
      >
        <header className="footprint-map-panel-head">
          <div>
            <p className="footprint-eyebrow">Interactive map</p>
            <h2 id="footprint-map-title">足迹总览</h2>
          </div>
          <div className="footprint-map-actions">
            <span
              className="footprint-map-status"
              role="status"
              aria-live="polite"
            >
              {mapError ? "列表模式" : mapReady ? "地图已就绪" : "地图载入中"}
            </span>
            <button
              type="button"
              className="footprint-map-reset"
              onClick={clearSelection}
              disabled={!hasPlaces}
            >
              适配全部地点
            </button>
          </div>
        </header>

        <div className="footprint-map-layout">
          <div className="footprint-map-column">
            <div className="footprint-map-frame">
              <div
                ref={mapElementRef}
                className="footprint-leaflet-map"
                role="region"
                aria-label="交互式足迹地图"
              />
              {!mapReady && !mapError ? (
                <div className="footprint-map-loading" role="status">
                  <span
                    className="footprint-map-loading-dot"
                    aria-hidden="true"
                  />
                  正在准备地图图层…
                </div>
              ) : null}
              {mapError ? (
                <div className="footprint-map-error" role="status">
                  {mapError}
                </div>
              ) : null}
            </div>
            <p className="footprint-map-help">
              拖动地图浏览，点击标记查看地点；也可以直接从右侧地点索引开始。
            </p>
          </div>

          <aside
            className="footprint-place-rail"
            aria-label="足迹地点与文章"
            data-footprint-place-rail
          >
            <div className="footprint-place-rail-head">
              <div>
                <p className="footprint-eyebrow">Place index</p>
                <h3>地点档案</h3>
              </div>
              <span className="footprint-place-count">{placeItems.length}</span>
            </div>

            {selectedItem ? (
              <div
                id="footprint-place-detail"
                className="footprint-place-detail"
                aria-live="polite"
              >
                <div className="footprint-place-detail-head">
                  <div>
                    <p className="footprint-place-detail-kicker">
                      Selected place
                    </p>
                    <h4>{selectedItem.name}</h4>
                  </div>
                  <button
                    type="button"
                    className="footprint-place-clear"
                    onClick={clearSelection}
                    aria-label="清除当前地点"
                  >
                    ×
                  </button>
                </div>
                <p className="footprint-place-coordinate">
                  {formatCoordinate(selectedItem.lat)},{" "}
                  {formatCoordinate(selectedItem.lng)}
                </p>
                <ul className="footprint-post-list">
                  {selectedItem.posts.map(post => (
                    <li key={`${post.url}-${post.title}`}>
                      <a href={post.url} title={post.title}>
                        <span>{post.title}</span>
                        <time dateTime={post.date}>
                          {formatDate(post.date)}
                        </time>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="footprint-place-prompt">
                选择一个地点，查看它关联的文章和坐标。
              </p>
            )}

            {placeItems.length > 0 ? (
              <ul
                className="footprint-place-list"
                aria-label="地点列表"
                id="footprint-place-list"
              >
                {placeItems.map(item => (
                  <li key={item.key}>
                    <button
                      type="button"
                      className={[
                        "footprint-place-button",
                        selectedKey === item.key ? "is-selected" : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-pressed={selectedKey === item.key}
                      aria-controls="footprint-place-detail"
                      onClick={() => selectPlace(item.key)}
                    >
                      <span className="footprint-place-button-main">
                        <span
                          className="footprint-place-button-dot"
                          aria-hidden="true"
                        />
                        <span>
                          <strong>{item.name}</strong>
                          <small>
                            {item.posts.length > 0
                              ? `${item.posts.length} 篇文章`
                              : "暂无关联文章"}
                          </small>
                        </span>
                      </span>
                      <span
                        className="footprint-place-button-arrow"
                        aria-hidden="true"
                      >
                        ↗
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="footprint-place-prompt">暂时还没有地点记录。</p>
            )}
          </aside>
        </div>
      </section>
    </section>
  );
};

export default FootprintMap;
