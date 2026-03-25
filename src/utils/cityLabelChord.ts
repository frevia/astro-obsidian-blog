import * as turf from "@turf/turf";
import type {
  Feature,
  LineString,
  MultiLineString,
  MultiPolygon,
  Point,
  Polygon,
  Position,
} from "geojson";

export type LabelChordResult = {
  /** 弦端点 [lng, lat] */
  a: [number, number];
  b: [number, number];
  /** 本次扫描使用的旋转角（度，Turf：顺时针为正） */
  sweepAngleDeg: number;
};

const EPS = 1e-10;

function dedupeSorted(xs: number[], eps = 1e-7): number[] {
  const out: number[] = [];
  for (const v of xs) {
    if (!out.length || Math.abs(v - out[out.length - 1]) > eps) out.push(v);
  }
  return out;
}

function asPolygonFeature(
  raw: unknown
): Feature<Polygon | MultiPolygon> | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as {
    type?: string;
    geometry?: { type?: string; coordinates?: unknown };
    coordinates?: unknown;
  };

  // Accept GeoJSON Feature<Polygon|MultiPolygon> directly.
  if (candidate.type === "Feature" && candidate.geometry) {
    const geo = candidate.geometry;
    if (geo.type === "Polygon" || geo.type === "MultiPolygon") {
      return raw as Feature<Polygon | MultiPolygon>;
    }
  }

  const g = candidate as { type?: string; coordinates?: unknown };
  if (g.type === "Polygon") {
    return turf.feature(g as Polygon);
  }
  if (g.type === "MultiPolygon") {
    return turf.feature(g as MultiPolygon);
  }
  return null;
}

function defaultBufferKm(feature: Feature<Polygon | MultiPolygon>): number {
  const km2 = turf.area(feature) / 1_000_000;
  const scale = Math.sqrt(Math.max(km2, 1e-6));
  return Math.min(2, Math.max(0.06, scale * 0.12));
}

function innerBuffer(
  feature: Feature<Polygon | MultiPolygon>,
  bufferKm: number
): Feature<Polygon | MultiPolygon> | null {
  if (bufferKm <= 0) return feature;
  const out = turf.buffer(feature, -bufferKm, { units: "kilometers" });
  if (!out?.geometry) return null;
  if (turf.area(out) < 1e-12) return null;
  return out as Feature<Polygon | MultiPolygon>;
}

type OutlineLine = Feature<LineString | MultiLineString>;

function outlineLineFeatures(
  feature: Feature<Polygon | MultiPolygon>
): OutlineLine[] {
  const outline = turf.polygonToLine(feature);
  return outline.type === "FeatureCollection" ? outline.features : [outline];
}

/** 在旋转后坐标系中，水平线 y = const 与多边形边界的交点，配对为弦 */
function horizontalSegmentsAtY(
  outlineFeatures: OutlineLine[],
  bbox: [number, number, number, number],
  y: number
): [number, number][] {
  const pad = 0.25;
  const scan = turf.lineString([
    [bbox[0] - pad, y],
    [bbox[2] + pad, y],
  ]);

  const xs: number[] = [];
  for (const ln of outlineFeatures) {
    const hits = turf.lineIntersect(scan, ln);
    for (const f of hits.features) {
      if (f.geometry?.type === "Point") {
        xs.push((f.geometry as Point).coordinates[0]);
      }
    }
  }

  const sorted = dedupeSorted(xs.sort((a, b) => a - b));
  if (sorted.length % 2 === 1) sorted.pop();
  const segments: [number, number][] = [];
  for (let i = 0; i < sorted.length - 1; i += 2) {
    segments.push([sorted[i], sorted[i + 1]]);
  }
  return segments;
}

function collectOuterRingYValues(feature: Feature<Polygon | MultiPolygon>): {
  ymin: number;
  ymax: number;
  samples: number[];
} {
  const coords: Position[] = [];
  const g = feature.geometry;
  if (g.type === "Polygon") {
    coords.push(...g.coordinates[0]);
  } else {
    for (const poly of g.coordinates) {
      coords.push(...poly[0]);
    }
  }
  let ymin = Infinity;
  let ymax = -Infinity;
  const ys = new Set<number>();
  for (const p of coords) {
    ymin = Math.min(ymin, p[1]);
    ymax = Math.max(ymax, p[1]);
    ys.add(p[1]);
  }
  return { ymin, ymax, samples: [...ys].sort((a, b) => a - b) };
}

const MAX_VERTEX_Y_SAMPLES = 64;

function mergeYSamples(
  ymin: number,
  ymax: number,
  vertexYs: number[],
  steps: number
): number[] {
  const set = new Set<number>();
  const sortedV = [...vertexYs].sort((a, b) => a - b);
  if (sortedV.length <= MAX_VERTEX_Y_SAMPLES) {
    for (const y of sortedV) set.add(y);
  } else {
    for (let i = 0; i < MAX_VERTEX_Y_SAMPLES; i++) {
      const j = Math.floor(
        (i * (sortedV.length - 1)) / Math.max(1, MAX_VERTEX_Y_SAMPLES - 1)
      );
      set.add(sortedV[j]);
    }
  }
  if (ymax <= ymin + EPS) {
    set.add((ymin + ymax) / 2);
  } else {
    for (let i = 0; i <= steps; i++) {
      set.add(ymin + ((ymax - ymin) * i) / steps);
    }
  }
  return [...set].sort((a, b) => a - b);
}

function longestChordInRotatedPolygon(
  feature: Feature<Polygon | MultiPolygon>,
  yScanLines: number
): {
  a: [number, number];
  b: [number, number];
  lengthKm: number;
} | null {
  const { ymin, ymax, samples: vertY } = collectOuterRingYValues(feature);
  const ySamples = mergeYSamples(ymin, ymax, vertY, yScanLines);

  const bbox = turf.bbox(feature) as [number, number, number, number];
  const outlineFeatures = outlineLineFeatures(feature);

  let bestLen = 0;
  let bestA: [number, number] | null = null;
  let bestB: [number, number] | null = null;

  for (const y of ySamples) {
    const segs = horizontalSegmentsAtY(outlineFeatures, bbox, y);
    for (const [x0, x1] of segs) {
      const len = turf.distance(
        turf.point([x0, y]),
        turf.point([x1, y]),
        { units: "kilometers" }
      );
      if (len > bestLen + 1e-9) {
        bestLen = len;
        bestA = [x0, y];
        bestB = [x1, y];
      }
    }
  }

  if (!bestA || !bestB) return null;
  return { a: bestA, b: bestB, lengthKm: bestLen };
}

/**
 * 在 GeoJSON 多边形内部：负缓冲（buffer）→ 多角度旋转 → 水平扫描线与边界求交得弦 → 取最长一条。
 * 端点经逆旋转回到原始 [lng, lat]，仅输出一条最优线段。
 */
export function findLongestInteriorChord(
  raw: unknown,
  options?: {
    bufferKm?: number | null;
    angleStep?: number;
    yScanLines?: number;
  }
): LabelChordResult | null {
  const angleStep = options?.angleStep ?? 9;
  const yScanLines = options?.yScanLines ?? 28;

  const base = asPolygonFeature(raw);
  if (!base) return null;

  const bufKm =
    options?.bufferKm === null
      ? 0
      : (options?.bufferKm ?? defaultBufferKm(base));

  let working: Feature<Polygon | MultiPolygon> | null = base;
  if (bufKm > 0) {
    working = innerBuffer(base, bufKm);
    if (!working) working = base;
  }

  const pivot = turf.getCoord(turf.centroid(working));

  let best:
    | {
        a: [number, number];
        b: [number, number];
        len: number;
        sweepDeg: number;
      }
    | null = null;

  for (let deg = -90; deg <= 90 + EPS; deg += angleStep) {
    const rotated = turf.transformRotate(working, -deg, {
      pivot,
    }) as Feature<Polygon | MultiPolygon>;

    const chord = longestChordInRotatedPolygon(rotated, yScanLines);
    if (!chord) continue;

    const tieBetter =
      best &&
      Math.abs(chord.lengthKm - best.len) <= 1e-9 &&
      Math.abs(deg) < Math.abs(best.sweepDeg);
    const lengthBetter = !best || chord.lengthKm > best.len + 1e-9;

    if (lengthBetter || tieBetter) {
      const ln = turf.lineString([chord.a, chord.b]);
      const back = turf.transformRotate(ln, deg, {
        pivot,
      }) as Feature<LineString>;

      const [p0, p1] = back.geometry.coordinates;
      best = {
        a: [p0[0], p0[1]],
        b: [p1[0], p1[1]],
        len: chord.lengthKm,
        sweepDeg: deg,
      };
    }
  }

  if (!best) return null;

  return {
    a: best.a,
    b: best.b,
    sweepAngleDeg: best.sweepDeg,
  };
}

/** 将地理弦投影到 SVG，得到文本中心、旋转角与适配字号（沿弦长） */
export function layoutLabelAlongChord(
  chord: LabelChordResult,
  name: string,
  project: (lngLat: [number, number]) => [number, number] | null
): { cx: number; cy: number; rotate: number; fontSize: number } | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const pa = project(chord.a);
  const pb = project(chord.b);
  if (!pa || !pb) return null;

  const cx = (pa[0] + pb[0]) / 2;
  const cy = (pa[1] + pb[1]) / 2;
  const dx = pb[0] - pa[0];
  const dy = pb[1] - pa[1];
  const rotate = (Math.atan2(dy, dx) * 180) / Math.PI;
  const lenSvg = Math.hypot(dx, dy);

  const charCount = Math.max(1, trimmed.length);
  const cjkEm = 0.88;
  let fontSize = (lenSvg * 0.76) / (charCount * cjkEm);
  fontSize = Math.max(7, Math.min(20, fontSize));
  fontSize = Math.round(fontSize * 10) / 10;

  if (fontSize < 7.5 || lenSvg < 14) return null;

  return { cx, cy, rotate, fontSize };
}
