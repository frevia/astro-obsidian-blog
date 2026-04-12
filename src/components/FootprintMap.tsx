import { useEffect, useMemo, useRef, useState } from "react";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  PROVINCE_NAME_MAP,
  SHORT_NAME_TO_PROVINCE_KEY,
} from "@/components/footprint/mapConstants";
import {
  useFootprintMap,
  type FootprintPlace,
  type FootprintRecord,
} from "@/components/footprint/useFootprintMap";
import type { CityPathItem } from "@/components/footprint/computeCityLabels";

export type { FootprintPlace };

export interface FootprintMapProps {
  places?: FootprintPlace[];
  records?: FootprintRecord[];
}

/** 全国视图：单个「已点亮」市一轮约 3s（渐显 -> 停留 -> 渐隐） */
const NATIONAL_SPOTLIGHT_FADE_CYCLE_MS = 1800;
const NATIONAL_SPOTLIGHT_GAP_MS = 1200;

const FootprintMap: React.FC<FootprintMapProps> = ({
  places = [],
  records = [],
}) => {
  const {
    regionPaths,
    visibleCityPaths,
    visitedCityKeys,
    visibleMarkerPoints,
    selectedCity,
    cityLabelByKey,
    nationalProvinceLabelItems,
    nationalProvinceLabelByKey,
    isNationalView,
    focusedProvinceKey,
    selectedCityKey,
    handleCityClick,
    handleProvinceClick,
    handleResetMapView,
    provinceCount,
    cityCount,
    placeCount,
  } = useFootprintMap(places, records);

  const visitedKeysSig = useMemo(
    () => Array.from(visitedCityKeys).sort().join("|"),
    [visitedCityKeys]
  );

  const visitedRef = useRef(visitedCityKeys);
  const pathsRef = useRef(visibleCityPaths);
  visitedRef.current = visitedCityKeys;
  pathsRef.current = visibleCityPaths;

  const [nationalSpotlight, setNationalSpotlight] = useState<{
    key: string;
  } | null>(null);

  useEffect(() => {
    if (!isNationalView || visitedCityKeys.size === 0) {
      setNationalSpotlight(null);
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timers.push(id);
    };

    let lastKey: string | null = null;

    const pickNext = () => {
      if (cancelled) return;
      const keys = Array.from(visitedRef.current).filter(k =>
        pathsRef.current.some(p => p.key === k)
      );
      if (keys.length === 0) {
        schedule(pickNext, 320);
        return;
      }

      let next = keys[Math.floor(Math.random() * keys.length)];
      if (keys.length > 1) {
        let guard = 0;
        while (next === lastKey && guard++ < 14) {
          next = keys[Math.floor(Math.random() * keys.length)];
        }
      }
      lastKey = next;

      setNationalSpotlight({ key: next });
      schedule(() => {
        setNationalSpotlight(null);
        schedule(() => pickNext(), NATIONAL_SPOTLIGHT_GAP_MS);
      }, NATIONAL_SPOTLIGHT_FADE_CYCLE_MS);
    };

    schedule(pickNext, 400);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [isNationalView, visitedKeysSig]);

  function easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
  }

  function useCountUpNumber(
    target: number,
    durationMs: number,
    delayMs: number = 0
  ) {
    const [val, setVal] = useState<number>(0);
    const rafRef = useRef<number | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const startValRef = useRef<number>(0);
    const targetRef = useRef<number>(target);

    useEffect(() => {
      targetRef.current = target;
    }, [target]);

    useEffect(() => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const start = performance.now();
      const startVal = val;
      startValRef.current = startVal;

      const tick = (now: number) => {
        const elapsed = now - start;
        const p = Math.min(elapsed / durationMs, 1);
        const next =
          startVal + (targetRef.current - startVal) * easeOutQuart(p);
        setVal(next);
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
      };

      const startAnimation = () => {
        rafRef.current = requestAnimationFrame(tick);
      };

      if (delayMs > 0) {
        timeoutRef.current = window.setTimeout(startAnimation, delayMs);
      } else {
        startAnimation();
      }
      return () => {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        if (timeoutRef.current != null) clearTimeout(timeoutRef.current);
      };
    }, [target, durationMs, delayMs]);

    return val;
  }

  const shownProvinceCount = useCountUpNumber(provinceCount, 900, 0);
  const shownCityCount = useCountUpNumber(cityCount, 850, 200);
  const shownPlaceCount = useCountUpNumber(placeCount, 800, 400);

  const regionPathsJsx = useMemo(
    () =>
      regionPaths.map(region => {
        if (!region.d) return null;
        const provinceKeyForRegion = SHORT_NAME_TO_PROVINCE_KEY[region.name];
        const canClickProvince =
          isNationalView && Boolean(provinceKeyForRegion);

        return (
          <path
            key={region.key}
            d={region.d}
            style={
              canClickProvince
                ? { pointerEvents: "auto" as const, cursor: "pointer" }
                : isNationalView
                  ? { pointerEvents: "none" as const }
                  : { pointerEvents: "none" as const }
            }
            onClick={
              canClickProvince
                ? e => {
                    e.stopPropagation();
                    handleProvinceClick(region.name);
                  }
                : undefined
            }
            className={
              isNationalView
                ? canClickProvince
                  ? "fill-muted/16 stroke-foreground/55 hover:fill-accent/12 transition-colors"
                  : "fill-muted/16 stroke-foreground/55"
                : "fill-muted/16 stroke-foreground/55"
            }
            strokeWidth={isNationalView ? 1.1 : 1.05}
          >
            <title>
              {canClickProvince ? `${region.name}（点击放大）` : region.name}
            </title>
          </path>
        );
      }),
    [regionPaths, isNationalView, handleProvinceClick]
  );

  return (
    <div className="w-full">
      <p className="text-skin-muted mb-4 text-sm">
        已经点亮{" "}
        <span
          className="text-accent font-semibold"
          style={{
            display: "inline-block",
            minWidth: `${String(provinceCount).length}ch`,
          }}
        >
          {Math.floor(shownProvinceCount)}
        </span>{" "}
        个省、
        <span
          className="text-accent font-semibold"
          style={{
            display: "inline-block",
            minWidth: `${String(cityCount).length}ch`,
          }}
        >
          {Math.floor(shownCityCount)}
        </span>{" "}
        个市、
        <span
          className="text-accent font-semibold"
          style={{
            display: "inline-block",
            minWidth: `${String(placeCount).length}ch`,
          }}
        >
          {Math.floor(shownPlaceCount)}
        </span>{" "}
        个地点。
      </p>
      <div
        className={
          focusedProvinceKey
            ? "border-border bg-background relative overflow-hidden rounded-lg border"
            : "border-border bg-background relative overflow-hidden rounded-lg border p-2 sm:p-3"
        }
      >
        {focusedProvinceKey ? (
          <div className="pointer-events-none absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
            <button
              type="button"
              onClick={handleResetMapView}
              className="border-border/60 bg-background/90 text-accent pointer-events-auto rounded-md border px-2.5 py-1 text-sm font-medium shadow-sm backdrop-blur-sm hover:underline"
            >
              显示全国
            </button>
          </div>
        ) : null}
        <div
          className="w-full"
          style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}
        >
          <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className="block h-full w-full touch-manipulation"
            style={{ pointerEvents: "auto" }}
            role="img"
            aria-label="中国地图足迹"
          >
            {isNationalView ? (
              <>
                <g style={{ pointerEvents: "none" }}>
                  {visibleCityPaths.map(city => {
                    if (!city.d) return null;
                    const visited = visitedCityKeys.has(city.key);
                    const isSpotlightTarget =
                      visited &&
                      nationalSpotlight !== null &&
                      nationalSpotlight.key === city.key;

                    return (
                      <g key={city.key}>
                        <path
                          d={city.d}
                          style={{
                            pointerEvents: "none",
                            opacity: isSpotlightTarget ? 0 : 1,
                          }}
                          className={
                            visited
                              ? "fill-[#ff5a36]/75 stroke-[#ff3b30]"
                              : "fill-muted/10 stroke-foreground/22"
                          }
                          strokeWidth={visited ? 0.85 : 0.35}
                        >
                          <title>{city.cityName}</title>
                        </path>
                        {isSpotlightTarget ? (
                          <path
                            d={city.d}
                            className="footprint-national-spot-fade-cycle fill-[#ff5a36]/80 stroke-[#ff3b30]"
                            style={{ pointerEvents: "none" }}
                            strokeWidth={0.95}
                          />
                        ) : null}
                      </g>
                    );
                  })}
                </g>
                <g style={{ pointerEvents: "auto" }}>{regionPathsJsx}</g>
                <g style={{ pointerEvents: "none" }}>
                  {nationalProvinceLabelItems.map((item: CityPathItem) => {
                    const label = nationalProvinceLabelByKey.get(item.key);
                    if (!label) return null;
                    const renderedFs = label.fontSize;
                    const outlinePx = Math.max(0.5, renderedFs * 0.045);
                    return (
                      <g key={item.key}>
                        {label.splitLines?.length ? (
                          label.splitLines.map((seg, si) => (
                            <text
                              key={si}
                              x={seg.cx}
                              y={seg.cy}
                              transform={`rotate(${label.rotate}, ${seg.cx}, ${seg.cy})`}
                              textAnchor="middle"
                              dominantBaseline="central"
                              pointerEvents="none"
                              className="fill-foreground/38 stroke-background/55 pointer-events-none select-none font-serif font-medium"
                              style={{
                                fontSize: renderedFs,
                                letterSpacing: "0.03em",
                                strokeWidth: outlinePx,
                                paintOrder: "stroke fill",
                              }}
                            >
                              <title>{item.provinceName}</title>
                              {seg.text}
                            </text>
                          ))
                        ) : (
                          <text
                            x={label.cx}
                            y={label.cy}
                            transform={`rotate(${label.rotate}, ${label.cx}, ${label.cy})`}
                            textAnchor="middle"
                            dominantBaseline="central"
                            pointerEvents="none"
                            className="fill-foreground/38 stroke-background/55 pointer-events-none select-none font-serif font-medium"
                            style={{
                              fontSize: renderedFs,
                              letterSpacing: "0.03em",
                              strokeWidth: outlinePx,
                              paintOrder: "stroke fill",
                            }}
                          >
                            <title>{item.provinceName}</title>
                            {item.cityName}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              </>
            ) : (
              <g style={{ pointerEvents: "none" }}>{regionPathsJsx}</g>
            )}

            {!isNationalView ? (
              <g style={{ pointerEvents: "auto" }}>
                {visibleCityPaths.map(city => {
                  if (!city.d) return null;
                  const visited = visitedCityKeys.has(city.key);
                  const selected = selectedCityKey === city.key;
                  const strokeW = selected ? 2.35 : visited ? 1.45 : 1.3;
                  const label = cityLabelByKey.get(city.key);
                  const renderedFs = label?.fontSize ?? 0;
                  const outlinePx = Math.max(0.5, renderedFs * 0.045);
                  return (
                    <g key={city.key}>
                      <path
                        d={city.d}
                        style={{ pointerEvents: "auto", cursor: "pointer" }}
                        onClick={e => {
                          e.stopPropagation();
                          handleCityClick(city.provinceKey, city.key);
                        }}
                        className={
                          visited
                            ? selected
                              ? "fill-[#ff5a36]/82 stroke-accent"
                              : "fill-[#ff5a36]/75 stroke-[#9f1a10] hover:opacity-[0.97]"
                            : selected
                              ? "fill-accent/20 stroke-accent"
                              : "fill-muted/14 stroke-foreground/70 hover:fill-accent/18"
                        }
                        strokeWidth={strokeW}
                      >
                        <title>{`${city.cityName}（点击查看）`}</title>
                      </path>
                      {label ? (
                        label.splitLines?.length ? (
                          label.splitLines.map((seg, si) => (
                            <text
                              key={si}
                              x={seg.cx}
                              y={seg.cy}
                              transform={`rotate(${label.rotate}, ${seg.cx}, ${seg.cy})`}
                              textAnchor="middle"
                              dominantBaseline="central"
                              pointerEvents="none"
                              className="fill-foreground/38 stroke-background/55 pointer-events-none select-none font-serif font-medium"
                              style={{
                                fontSize: renderedFs,
                                letterSpacing: "0.03em",
                                strokeWidth: outlinePx,
                                paintOrder: "stroke fill",
                              }}
                            >
                              <title>{city.cityName}</title>
                              {seg.text}
                            </text>
                          ))
                        ) : (
                          <text
                            x={label.cx}
                            y={label.cy}
                            transform={`rotate(${label.rotate}, ${label.cx}, ${label.cy})`}
                            textAnchor="middle"
                            dominantBaseline="central"
                            pointerEvents="none"
                            className="fill-foreground/38 stroke-background/55 pointer-events-none select-none font-serif font-medium"
                            style={{
                              fontSize: renderedFs,
                              letterSpacing: "0.03em",
                              strokeWidth: outlinePx,
                              paintOrder: "stroke fill",
                            }}
                          >
                            {city.cityName}
                          </text>
                        )
                      ) : null}
                    </g>
                  );
                })}
              </g>
            ) : null}
            {visibleMarkerPoints.length > 0 ? (
              <g style={{ pointerEvents: "auto" }}>
                {visibleMarkerPoints.map((p, idx) => (
                  <g key={`${p.name}-${idx}`}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={4.2}
                      className="fill-accent/90 stroke-background"
                      strokeWidth={2}
                    >
                      <title>{`${p.name} (${p.lng}, ${p.lat})`}</title>
                    </circle>
                  </g>
                ))}
              </g>
            ) : null}
          </svg>
        </div>
      </div>

      <p className="text-muted-foreground mt-4 text-xs">
        （注：地图仅用于大致轮廓展示与地点示意，不代表精确边界。）
      </p>

      <div className="border-border/45 bg-background/70 mt-4 rounded-xl border p-4 shadow-sm backdrop-blur-sm">
        {selectedCity ? (
          <>
            <p className="text-foreground text-base font-semibold sm:text-lg">
              {selectedCity.provinceName} - {selectedCity.cityName}
            </p>
            {selectedCity.posts.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {selectedCity.posts.map((post, index) => (
                  <li key={`${post.url}-${post.title}`} className="text-sm">
                    <a
                      href={post.url}
                      className="text-accent hover:underline"
                      title={post.title}
                    >
                      {index + 1}. {post.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground mt-2 text-sm">
                该市暂无已标注文章。
              </p>
            )}
          </>
        ) : focusedProvinceKey ? (
          <p className="text-muted-foreground text-sm">
            已放大至{" "}
            <span className="text-foreground font-medium">
              {PROVINCE_NAME_MAP[focusedProvinceKey] ?? focusedProvinceKey}
            </span>
            。请点击地图中的
            <strong className="text-foreground">城市区域</strong>
            ，查看对应文章列表。
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            全国视图请点击<strong className="text-foreground">省份</strong>
            放大；放大后再点击城市查看文章列表。
          </p>
        )}
      </div>
    </div>
  );
};

export default FootprintMap;
