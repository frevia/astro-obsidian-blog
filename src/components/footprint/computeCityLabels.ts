import {
  chordLngLatAt,
  isChordMidOutsidePolygon,
  pickSplitTsAlongChordInside,
  splitTextTwoParts,
} from "@/components/footprint/dumbbellLabel";
import { labelLngLatAvoidingSiblings } from "@/components/footprint/sameLevelLabelPoint";
import type { LabelChordResult } from "@/utils/cityLabelChord";
import { layoutLabelAlongChord } from "@/utils/cityLabelChord";
import precomputedChords from "@/data/footprint/footprint-city-label-chords.json";

export type CityPathItem = {
  key: string;
  provinceKey: string;
  provinceName: string;
  cityName: string;
  d: string;
  feature: unknown;
};

export type CityLabelLayout = NonNullable<
  ReturnType<typeof layoutLabelAlongChord>
> & {
  /** 哑铃形区域：两段字各自锚点（与 rotate/fontSize 共用） */
  splitLines?: { text: string; cx: number; cy: number }[];
};

type PrecomputedMap = Record<
  string,
  Pick<LabelChordResult, "a" | "b" | "sweepAngleDeg"> & {
    center?: [number, number];
  }
>;

const PRECOMPUTED = precomputedChords as unknown as PrecomputedMap;
const BASE_LABEL_FONT_SCALE = 0.6;
const MIN_LABEL_FONT_SIZE = 3.8;

/** 与 `generate-footprint-city-labels` 写入的全国省界键一致 */
export function nationProvinceLabelKey(idx: number): string {
  return `nation-province-${idx}`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function maxFontSizeByLocalChord(
  chordLenPx: number,
  anchorT: number,
  text: string
): number {
  const charCount = Math.max(1, text.trim().length);
  const cjkEm = 0.92;
  const localLen = 2 * chordLenPx * Math.min(anchorT, 1 - anchorT);
  // More conservative than base layout: account for letter-spacing and stroke.
  const safeLen = localLen * 0.64;
  return safeLen / (charCount * cjkEm * 1.08);
}

function adaptiveSafeFontSize(
  baseFontSize: number,
  chordLenPx: number,
  anchorT: number,
  text: string
): number {
  const strict = maxFontSizeByLocalChord(chordLenPx, anchorT, text);
  // Anchor near center has more contour room; relax shrink to avoid over-small labels.
  const centerProximity = 1 - Math.min(1, Math.abs(anchorT - 0.5) / 0.5); // 0..1
  const relax = 1 + 0.32 * centerProximity;
  const relaxed = strict * relax;
  return Math.min(baseFontSize, relaxed);
}

function scaleAndClampFontSize(fs: number): number {
  return (
    Math.round(
      Math.max(MIN_LABEL_FONT_SIZE, Math.min(20, fs * BASE_LABEL_FONT_SCALE)) * 10
    ) / 10
  );
}

function anchorTOnProjectedChord(
  a: [number, number],
  b: [number, number],
  p: [number, number]
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-8) return 0.5;
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  return clamp(t, 0, 1);
}

function stableAnchorOnChord(
  chord: LabelChordResult,
  center: [number, number] | undefined,
  cityName: string,
  fontSize: number,
  project: (lngLat: [number, number]) => [number, number] | null
): [number, number] | null {
  const pa = project(chord.a);
  const pb = project(chord.b);
  if (!pa || !pb) return null;

  const mx = (pa[0] + pb[0]) / 2;
  const my = (pa[1] + pb[1]) / 2;
  if (!center) return [mx, my];

  const pc = project(center);
  if (!pc) return [mx, my];

  const dx = pb[0] - pa[0];
  const dy = pb[1] - pa[1];
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-8) return pc;

  const len = Math.sqrt(len2);
  const tCenter = clamp(
    ((pc[0] - pa[0]) * dx + (pc[1] - pa[1]) * dy) / len2,
    0,
    1
  );

  // Smarter fallback: keep center unless projected text span is likely to exceed
  // available chord length near the chosen anchor.
  const charCount = Math.max(1, cityName.trim().length);
  const cjkEm = 0.88;
  const estimatedTextWidth = charCount * cjkEm * fontSize;
  const halfText = estimatedTextWidth / 2;
  const halfAvailable = len * Math.min(tCenter, 1 - tCenter);
  const fitsAtCenter = halfAvailable >= halfText * 1.04;
  if (fitsAtCenter) return pc;

  // 沿弦滑动锚点，使文字落在弦段内；避免旧逻辑把 t 硬夹到 0.5±0.22，在偏心/细长多边形上把字拽到形外
  const margin = 1.04;
  const delta = (halfText * margin) / len;
  if (delta >= 0.5 - 1e-9) {
    return [mx, my];
  }
  const tFit = clamp(tCenter, delta, 1 - delta);
  return [pa[0] + dx * tFit, pa[1] + dy * tFit];
}

/**
 * 仅做投影 + 字号（无 Turf）。弦数据来自 `pnpm run generate:footprint-labels` 生成的 JSON。
 */
export function computeCityLabelLayoutForCity(
  city: CityPathItem,
  cityIndex: number,
  siblingFeatures: unknown[],
  project: (lngLat: [number, number]) => [number, number] | null
): CityLabelLayout | null {
  const raw = PRECOMPUTED[city.key];
  if (!raw) return null;
  const chord: LabelChordResult = {
    a: raw.a,
    b: raw.b,
    sweepAngleDeg: raw.sweepAngleDeg,
  };
  const label = layoutLabelAlongChord(chord, city.cityName, ll =>
    project(ll) ?? null
  );
  if (!label) return null;

  const safeCenterLngLat = labelLngLatAvoidingSiblings(
    city.feature,
    siblingFeatures,
    cityIndex,
    raw.center &&
      Number.isFinite(raw.center[0]) &&
      Number.isFinite(raw.center[1])
      ? [raw.center[0], raw.center[1]]
      : null
  );

  const abA = chord.a as [number, number];
  const abB = chord.b as [number, number];
  const parts =
    city.feature && isChordMidOutsidePolygon(city.feature, abA, abB)
      ? splitTextTwoParts(city.cityName)
      : null;
  const splitTs =
    parts && city.feature
      ? pickSplitTsAlongChordInside(city.feature, abA, abB)
      : null;

  if (parts && splitTs) {
    const ll0 = chordLngLatAt(abA, abB, splitTs[0]);
    const ll1 = chordLngLatAt(abA, abB, splitTs[1]);
    const pa = project(ll0);
    const pb = project(ll1);
    const pFullA = project(abA);
    const pFullB = project(abB);
    if (pa && pb && pFullA && pFullB) {
      const dxFull = pFullB[0] - pFullA[0];
      const dyFull = pFullB[1] - pFullA[1];
      const lenSvg = Math.hypot(dxFull, dyFull);
      const rotate = (Math.atan2(dyFull, dxFull) * 180) / Math.PI;
      const maxLen = Math.max(parts[0].length, parts[1].length);
      const cjkEm = 0.88;
      let fontSize = (lenSvg * 0.76) / (maxLen * cjkEm);

      const fs0 = maxFontSizeByLocalChord(lenSvg, splitTs[0], parts[0]);
      const fs1 = maxFontSizeByLocalChord(lenSvg, splitTs[1], parts[1]);
      fontSize = Math.min(fontSize, fs0, fs1);
      fontSize = scaleAndClampFontSize(fontSize);

      const middleFs = maxFontSizeByLocalChord(lenSvg, 0.5, city.cityName);
      const shouldSplit = middleFs < 6.2;

      if (shouldSplit && fontSize >= MIN_LABEL_FONT_SIZE && lenSvg >= 14) {
        return {
          cx: (pFullA[0] + pFullB[0]) / 2,
          cy: (pFullA[1] + pFullB[1]) / 2,
          rotate,
          fontSize,
          splitLines: [
            { text: parts[0], cx: pa[0], cy: pa[1] },
            { text: parts[1], cx: pb[0], cy: pb[1] },
          ],
        };
      }

      if (!shouldSplit) {
        const middleSafe = middleFs * 0.72;
        const middleSize = scaleAndClampFontSize(
          Math.max(
            MIN_LABEL_FONT_SIZE,
            Math.min(label.fontSize, middleSafe, 20)
          )
        );
        if (middleSize >= MIN_LABEL_FONT_SIZE) {
          let midCx = (pFullA[0] + pFullB[0]) / 2;
          let midCy = (pFullA[1] + pFullB[1]) / 2;
          const pSafe = safeCenterLngLat ? project(safeCenterLngLat) : null;
          if (pSafe) {
            const vx = pSafe[0] - midCx;
            const vy = pSafe[1] - midCy;
            const d = Math.hypot(vx, vy);
            if (d > 1e-3) {
              const nudge = Math.min(2.2, d * 0.45);
              midCx += (vx / d) * nudge;
              midCy += (vy / d) * nudge;
            }
          }
          return {
            ...label,
            cx: midCx,
            cy: midCy,
            rotate,
            fontSize: middleSize,
          };
        }
      }
    }
  }

  const anchor = stableAnchorOnChord(
    chord,
    safeCenterLngLat ?? undefined,
    city.cityName,
    label.fontSize,
    project
  );
  if (!anchor) return null;

  label.cx = anchor[0];
  label.cy = anchor[1];

  const pa = project(chord.a);
  const pb = project(chord.b);
  if (pa && pb) {
    const lenSvg = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
    const tAnchor = anchorTOnProjectedChord(pa, pb, anchor);
    const edgeProximity = Math.min(tAnchor, 1 - tAnchor);
    if (edgeProximity < 0.08) {
      const fsMax = adaptiveSafeFontSize(
        label.fontSize,
        lenSvg,
        tAnchor,
        city.cityName
      );
      if (Number.isFinite(fsMax)) {
        label.fontSize =
          Math.round(
            Math.max(MIN_LABEL_FONT_SIZE, Math.min(label.fontSize, fsMax, 20)) *
              10
          ) / 10;
      }
    }
  }

  // 统一基准缩放：普通单行标签必须也走同一套字号基准
  label.fontSize = scaleAndClampFontSize(label.fontSize);
  if (label.fontSize < MIN_LABEL_FONT_SIZE) return null;
  return label;
}

export function buildCityLabelMap(
  cities: CityPathItem[],
  project: (lngLat: [number, number]) => [number, number] | null
): Map<string, CityLabelLayout> {
  const map = new Map<string, CityLabelLayout>();
  const siblingFeatures = cities.map(c => c.feature);
  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    const label = computeCityLabelLayoutForCity(
      city,
      i,
      siblingFeatures,
      project
    );
    if (label) map.set(city.key, label);
  }
  return map;
}
