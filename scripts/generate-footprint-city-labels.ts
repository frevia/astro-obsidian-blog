/**
 * 本机一次性运行：用 Turf 计算各市与全国各省「最长内弦」+ 质心，写入 src/generated。
 * 浏览器端只读 JSON + d3 投影，省/市注记同一套布局算法。
 *
 *   pnpm run generate:footprint-labels
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as turf from "@turf/turf";
import { ChinaData, ProvinceData } from "china-map-geojson";
import { findLongestInteriorChord } from "../src/utils/cityLabelChord.ts";
import type { LabelChordResult } from "../src/utils/cityLabelChord.ts";

/**
 * 与线上面向展示一致即可；仅影响本机生成的 JSON，浏览器只读结果。
 * （略粗一点可明显缩短生成时间，需要更细时改小 angleStep / 增大 yScanLines。）
 */
const CHORD_OPTS = { angleStep: 12, yScanLines: 22 } as const;

/** 度；简化轮廓减轻 Turf 交点计算量，仅用于离线脚本 */
const SIMPLIFY_TOLERANCE_DEG = 0.0005;

function simplifyForChord(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const f = raw as { type?: string; geometry?: unknown };
  if (f.type !== "Feature" || !f.geometry) return raw;
  try {
    return turf.simplify(f as Parameters<typeof turf.simplify>[0], {
      tolerance: SIMPLIFY_TOLERANCE_DEG,
      highQuality: false,
    });
  } catch {
    return raw;
  }
}

type Entry = Pick<LabelChordResult, "a" | "b" | "sweepAngleDeg"> & {
  center: [number, number];
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../src/generated");
const outPath = join(outDir, "footprint-city-label-chords.json");

const out: Record<string, Entry> = {};

const provinceData = ProvinceData as Record<string, { features?: unknown[] }>;

let total = 0;
for (const c of Object.values(provinceData)) {
  total += (c.features ?? []).length;
}

let done = 0;
const t0 = Date.now();
const logEvery = 40;

for (const [provinceKey, collection] of Object.entries(provinceData)) {
  const features = collection.features ?? [];
  features.forEach((feature, idx) => {
    const key = `${provinceKey}-city-${idx}`;
    let center: [number, number] | null = null;
    try {
      const ctr = turf.centerOfMass(
        feature as Parameters<typeof turf.centerOfMass>[0]
      );
      const [lng, lat] = ctr.geometry.coordinates;
      center = [lng, lat];
    } catch {
      center = null;
    }
    const chord = findLongestInteriorChord(
      simplifyForChord(feature),
      CHORD_OPTS
    );
    if (chord && center) {
      out[key] = {
        a: chord.a,
        b: chord.b,
        sweepAngleDeg: chord.sweepAngleDeg,
        center,
      };
    }
    done += 1;
    if (done % logEvery === 0 || done === total) {
      const sec = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  … ${done}/${total} cities (${sec}s)`);
    }
  });
}

const chinaFeatures = (ChinaData as { features?: unknown[] }).features ?? [];
let nationDone = 0;
for (let idx = 0; idx < chinaFeatures.length; idx++) {
  const feature = chinaFeatures[idx];
  const key = `nation-province-${idx}`;
  let center: [number, number] | null = null;
  try {
    const ctr = turf.centerOfMass(
      feature as Parameters<typeof turf.centerOfMass>[0]
    );
    const [lng, lat] = ctr.geometry.coordinates;
    center = [lng, lat];
  } catch {
    center = null;
  }
  const chord = findLongestInteriorChord(simplifyForChord(feature), CHORD_OPTS);
  if (chord && center) {
    out[key] = {
      a: chord.a,
      b: chord.b,
      sweepAngleDeg: chord.sweepAngleDeg,
      center,
    };
  }
  nationDone += 1;
}
console.log(`  … ${nationDone} national province chords`);

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, `${JSON.stringify(out)}\n`, "utf8");

console.log(
  `OK: ${Object.keys(out).length} label chords (cities + nation-province-*) → ${outPath}\n` +
    "提交该 JSON 后，线上构建即可使用预计算数据。"
);
