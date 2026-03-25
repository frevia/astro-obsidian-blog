import { useCallback, useEffect, useMemo, useState } from "react";
import { geoBounds, geoContains, geoMercator, geoPath } from "d3-geo";
import { ChinaData, ProvinceData } from "china-map-geojson";
import {
  MAP_HEIGHT,
  MAP_PADDING,
  MAP_WIDTH,
  PROVINCE_NAME_MAP,
  SHORT_NAME_TO_PROVINCE_KEY,
  chinaDataProvinceName,
} from "@/components/footprint/mapConstants";
import {
  type CityLabelLayout,
  type CityPathItem,
  buildCityLabelMap,
  computeCityLabelLayoutForCity,
  nationProvinceLabelKey,
} from "@/components/footprint/computeCityLabels";

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
}

export function useFootprintMap(places: FootprintPlace[], records: FootprintRecord[]) {
  const [focusedProvinceKey, setFocusedProvinceKey] = useState<string | null>(
    null
  );
  const [selectedCityKey, setSelectedCityKey] = useState<string | null>(null);

  const focusedProvinceFeature = useMemo(() => {
    if (!focusedProvinceKey) return null;
    const long = PROVINCE_NAME_MAP[focusedProvinceKey];
    const shortName = long ? chinaDataProvinceName(long) : "";
    return (
      (ChinaData.features as Array<{
        properties?: { name?: string };
      }>).find(f => f.properties?.name === shortName) ?? null
    );
  }, [focusedProvinceKey]);

  /** 与地图绘制一致：用市级要素并集拟合投影，避免省界简要与市级轮廓不一致导致四周留白 */
  const focusedProvinceCityCollection = useMemo(() => {
    if (!focusedProvinceKey) return null;
    const coll = (
      ProvinceData as Record<string, { features?: unknown[] }>
    )[focusedProvinceKey];
    const features = coll?.features ?? [];
    if (!features.length) return null;
    return { type: "FeatureCollection" as const, features };
  }, [focusedProvinceKey]);

  const projection = useMemo(() => {
    const mercator = geoMercator();
    const extent: [[number, number], [number, number]] = [
      [MAP_PADDING, MAP_PADDING],
      [MAP_WIDTH - MAP_PADDING, MAP_HEIGHT - MAP_PADDING],
    ];
    if (focusedProvinceCityCollection) {
      // contain：整省（市级并集）完全落在 extent 内，不裁切出框
      return mercator.fitExtent(
        extent,
        focusedProvinceCityCollection as never
      );
    }
    return mercator.fitExtent(extent, ChinaData as never);
  }, [focusedProvinceCityCollection]);

  const pathGen = useMemo(() => geoPath(projection), [projection]);

  type CityMeta = {
    key: string;
    provinceKey: string;
    provinceName: string;
    cityName: string;
    feature: unknown;
    bbox: [[number, number], [number, number]];
  };

  // 不依赖投影：用于异步计算 visited（geoContains 不需要 d / projection）。
  const cityMetas = useMemo((): CityMeta[] => {
    return Object.entries(
      ProvinceData as Record<string, { features?: unknown[] }>
    ).flatMap(([provinceKey, collection]) =>
      (collection.features ?? []).map((feature, idx) => {
        let bbox = geoBounds(feature as never) as [[number, number], [number, number]];
        // Dateline safety fallback
        if (bbox[0][0] > bbox[1][0]) {
          bbox = [[-180, bbox[0][1]], [180, bbox[1][1]]];
        }
        return {
          key: `${provinceKey}-city-${idx}`,
          provinceKey,
          provinceName: PROVINCE_NAME_MAP[provinceKey] ?? provinceKey,
          feature,
          bbox,
          cityName:
            (feature as { properties?: { name?: string } }).properties?.name ?? "",
        };
      })
    );
  }, []);

  const inBbox = (
    lng: number,
    lat: number,
    bbox: [[number, number], [number, number]]
  ): boolean =>
    lng >= bbox[0][0] &&
    lng <= bbox[1][0] &&
    lat >= bbox[0][1] &&
    lat <= bbox[1][1];

  const regionPaths = useMemo(
    () =>
      (ChinaData.features as Array<{
        properties?: { name?: string };
      }>).map((feature, idx) => ({
        key: `${feature.properties?.name ?? "region"}-${idx}`,
        name: feature.properties?.name ?? "",
        d: pathGen(feature as never),
      })),
    [pathGen]
  );

  // cityPaths：全国视图下生成 SVG path 字符串相对昂贵。
  // 为了让“从其它页面切到足迹页”更顺滑：全国视图分片异步生成；省内视图保持同步一次性生成，避免反复触发 label 计算导致卡死。
  const [nationalCityPaths, setNationalCityPaths] = useState<CityPathItem[]>(
    () => []
  );

  const provinceCityPaths = useMemo((): CityPathItem[] => {
    if (!focusedProvinceKey) return [];
    const metas = cityMetas.filter(m => m.provinceKey === focusedProvinceKey);
    return metas.map(meta => ({
      ...meta,
      d: pathGen(meta.feature as never) ?? "",
    }));
  }, [focusedProvinceKey, cityMetas, pathGen]);

  useEffect(() => {
    if (focusedProvinceKey) {
      setNationalCityPaths([]);
      return;
    }

    let cancelled = false;
    setNationalCityPaths([]);

    const metas = cityMetas;
    let idx = 0;
    const out: CityPathItem[] = [];
    const timeSliceMs = 10;

    const tick = () => {
      if (cancelled) return;
      const start = performance.now();
      while (idx < metas.length && performance.now() - start < timeSliceMs) {
        const meta = metas[idx];
        out.push({
          ...meta,
          d: pathGen(meta.feature as never) ?? "",
        });
        idx += 1;
      }

      // 逐步提交，避免一次性 setState 造成卡顿
      setNationalCityPaths(out.slice());

      if (idx < metas.length) setTimeout(tick, 0);
    };

    setTimeout(tick, 0);
    return () => {
      cancelled = true;
    };
  }, [focusedProvinceKey, cityMetas, pathGen]);

  const isNationalView = !focusedProvinceKey;

  const visibleCityPaths = useMemo(() => {
    if (!focusedProvinceKey) return nationalCityPaths;
    // 省内视图：同步一次性生成，避免频繁变化触发 label 反复重算
    if (provinceCityPaths.length > 0) return provinceCityPaths;
    // 某些地区（如港澳台）无市级切片数据时，退化为省级单区域可点击。
    if (!focusedProvinceFeature) return [];
    const provinceName = PROVINCE_NAME_MAP[focusedProvinceKey] ?? focusedProvinceKey;
    return [
      {
        key: `${focusedProvinceKey}-province-fallback`,
        provinceKey: focusedProvinceKey,
        provinceName,
        cityName: provinceName,
        d: pathGen(focusedProvinceFeature as never) ?? "",
        feature: focusedProvinceFeature,
      },
    ];
  }, [
    nationalCityPaths,
    provinceCityPaths,
    focusedProvinceKey,
    focusedProvinceFeature,
    pathGen,
  ]);

  // visitedCityKeys 异步计算：避免导航/首屏被 geoContains 阻塞。
  const [visitedCityKeys, setVisitedCityKeys] = useState<Set<string>>(
    () => new Set<string>()
  );

  useEffect(() => {
    let cancelled = false;
    const keys = new Set<string>();
    let idx = 0;

    setVisitedCityKeys(new Set());

    const list = cityMetas;
    const placesArr = places;

    const timeSliceMs = 8;
    const tick = () => {
      if (cancelled) return;
      const start = performance.now();
      while (idx < list.length && performance.now() - start < timeSliceMs) {
        const city = list[idx];
        const has = placesArr.some(place => {
          if (!inBbox(place.lng, place.lat, city.bbox)) return false;
          return geoContains(city.feature as never, [place.lng, place.lat] as never);
        });
        if (has) keys.add(city.key);
        idx += 1;
      }

      if (idx < list.length) {
        setTimeout(tick, 0);
      } else {
        if (!cancelled) setVisitedCityKeys(keys);
      }
    };

    tick();

    return () => {
      cancelled = true;
    };
  }, [cityMetas, places]);

  const cityCount = visitedCityKeys.size;
  const provinceCount = useMemo(() => {
    const set = new Set<string>();
    for (const cityKey of visitedCityKeys) {
      const m = cityKey.match(/^(.*?)-city-/);
      if (m?.[1]) set.add(m[1]);
      else if (cityKey.endsWith("-province-fallback")) {
        set.add(cityKey.replace(/-province-fallback$/, ""));
      } else {
        // Fallback for unexpected key formats
        set.add(cityKey);
      }
    }
    return set.size;
  }, [visitedCityKeys]);

  const placeCount = places.length;

  const markerPoints = useMemo(() => {
    return places
      .map(place => {
        const p = projection([place.lng, place.lat]);
        if (!p) return null;
        return { ...place, x: p[0], y: p[1] };
      })
      .filter(Boolean) as Array<FootprintPlace & { x: number; y: number }>;
  }, [places, projection]);

  const visibleMarkerPoints = useMemo(() => {
    if (!focusedProvinceFeature) return [];
    return markerPoints.filter(place =>
      geoContains(focusedProvinceFeature as never, [
        place.lng,
        place.lat,
      ] as never)
    );
  }, [focusedProvinceFeature, markerPoints]);

  const selectedCity = useMemo(() => {
    if (!selectedCityKey) return null;
    const target = visibleCityPaths.find(c => c.key === selectedCityKey);
    if (!target) return null;
    const posts = records.filter(record =>
      geoContains(target.feature as never, [
        record.lng,
        record.lat,
      ] as never)
    );
    return {
      key: target.key,
      provinceName: target.provinceName,
      cityName: target.cityName,
      posts,
    };
  }, [selectedCityKey, visibleCityPaths, records]);

  const handleCityClick = useCallback(
    (provinceKey: string, cityKey: string) => {
      setFocusedProvinceKey(provinceKey);
      setSelectedCityKey(cityKey);
    },
    []
  );

  const handleProvinceClick = useCallback((regionShortName: string) => {
    const provinceKey = SHORT_NAME_TO_PROVINCE_KEY[regionShortName];
    if (!provinceKey) return;
    setFocusedProvinceKey(provinceKey);
    setSelectedCityKey(null);
  }, []);

  const handleResetMapView = useCallback(() => {
    setFocusedProvinceKey(null);
    setSelectedCityKey(null);
  }, []);

  /** 弦数据来自预计算 JSON，此处仅投影 + 字号（无 Turf） */
  const cityLabelByKey = useMemo(() => {
    if (!focusedProvinceKey) return new Map<string, CityLabelLayout>();
    return buildCityLabelMap(visibleCityPaths, ll => projection(ll) ?? null);
  }, [focusedProvinceKey, visibleCityPaths, projection]);

  /** 全国省：与省内市共用 buildCityLabelMap（弦 + 避让 + 哑铃拆字） */
  const nationalProvinceLabelItems = useMemo((): CityPathItem[] => {
    return (
      ChinaData.features as Array<{
        properties?: { name?: string };
      }>
    ).map((feature, idx) => {
      const shortName = feature.properties?.name?.trim() ?? "";
      const pk = SHORT_NAME_TO_PROVINCE_KEY[shortName];
      return {
        key: nationProvinceLabelKey(idx),
        provinceKey: pk ?? `nation-${idx}`,
        provinceName: pk ? (PROVINCE_NAME_MAP[pk] ?? shortName) : shortName,
        cityName: shortName || "—",
        d: "",
        feature,
      };
    });
  }, []);

  // 全国省名水印：首屏需要尽快渲染底图，弦布局计算可能较重，因此异步计算。
  const [nationalProvinceLabelByKey, setNationalProvinceLabelByKey] = useState<
    Map<string, CityLabelLayout>
  >(() => new Map());

  useEffect(() => {
    if (focusedProvinceKey) {
      setNationalProvinceLabelByKey(new Map());
      return;
    }

    let cancelled = false;
    setNationalProvinceLabelByKey(new Map());

    const siblingFeatures = nationalProvinceLabelItems.map(
      c => c.feature
    );
    const project = (ll: [number, number]) => projection(ll) ?? null;
    const list = nationalProvinceLabelItems;

    let idx = 0;
    const timeSliceMs = 6;
    const map = new Map<string, CityLabelLayout>();

    const tick = () => {
      if (cancelled) return;
      const start = performance.now();
      while (idx < list.length && performance.now() - start < timeSliceMs) {
        const city = list[idx];
        const label = computeCityLabelLayoutForCity(
          city,
          idx,
          siblingFeatures,
          project
        );
        if (label) map.set(city.key, label);
        idx += 1;
      }

      if (idx < list.length) {
        setTimeout(tick, 0);
      } else {
        setNationalProvinceLabelByKey(new Map(map));
      }
    };

    setTimeout(tick, 0);

    return () => {
      cancelled = true;
    };
  }, [focusedProvinceKey, nationalProvinceLabelItems, projection]);

  return {
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
  };
}
