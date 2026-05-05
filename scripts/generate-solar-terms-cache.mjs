/**
 * chinese-days 的节气计算依赖运行环境本地时区；读者在北美等地访问时，
 * getSolarTerms / getSolarTermsInRange 会把交节日期整体偏移。
 * 在 Asia/Shanghai 下生成静态 YYYY-MM-DD → 节气名 表，供浏览器与构建结果一致使用。
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

process.env.TZ = "Asia/Shanghai";
const chineseDays = (await import("chinese-days")).default;

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "../src/utils/solarTermsByDate.json");

const START_YEAR = 2018;
const END_YEAR = 2040;
/** @type {Record<string, string>} */
const map = {};

for (let y = START_YEAR; y <= END_YEAR; y++) {
  const start = `${y}-01-01`;
  const end = `${y}-12-31`;
  const terms = chineseDays.getSolarTerms(start, end);
  for (const t of terms) {
    if (t?.date && t?.name) map[t.date] = t.name;
  }
}

writeFileSync(outPath, `${JSON.stringify(map, null, 0)}\n`, "utf8");
console.log(
  `Wrote ${Object.keys(map).length} solar term dates to ${outPath} (TZ=${process.env.TZ})`
);
