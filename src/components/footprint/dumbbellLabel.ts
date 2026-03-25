import { geoContains } from "d3-geo";

/** 预计算弦 a→b 上参数 t 处的经纬度（与 JSON 走向一致） */
export function chordLngLatAt(
  a: [number, number],
  b: [number, number],
  t: number
): [number, number] {
  return [
    a[0] + t * (b[0] - a[0]),
    a[1] + t * (b[1] - a[1]),
  ];
}

/** 将地名拆成两段（按字均分），至少 2 字才拆 */
export function splitTextTwoParts(text: string): [string, string] | null {
  const t = text.trim();
  if (t.length < 2) return null;
  const mid = Math.ceil(t.length / 2);
  return [t.slice(0, mid), t.slice(mid)];
}

/** 最长内弦两端点的经纬度中点落在多边形外 → 典型「两头粗中间细」或强凹形 */
export function isChordMidOutsidePolygon(
  feature: unknown,
  a: [number, number],
  b: [number, number]
): boolean {
  const m: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return !geoContains(feature as never, m as never);
}

/**
 * 哑铃形拆字时：沿 JSON 弦在两端附近各选一个落在本区域（geoContains）内的 t，
 * 避免固定比例投影后落到邻区。
 */
export function pickSplitTsAlongChordInside(
  feature: unknown,
  a: [number, number],
  b: [number, number]
): [number, number] | null {
  const ranges = [
    { lo: 0.06, hi: 0.44, prefer: 0.26 },
    { lo: 0.56, hi: 0.94, prefer: 0.74 },
  ] as const;
  const picked: number[] = [];
  for (const { lo, hi, prefer } of ranges) {
    let best: number | null = null;
    let bestD = Infinity;
    for (let i = 0; i <= 22; i++) {
      const t = lo + ((hi - lo) * i) / 22;
      const p = chordLngLatAt(a, b, t);
      if (geoContains(feature as never, p as never)) {
        const d = Math.abs(t - prefer);
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      }
    }
    if (best == null) return null;
    picked.push(best);
  }
  if (picked[1] - picked[0] < 0.1) return null;
  return [picked[0], picked[1]];
}
