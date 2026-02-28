import { slugifyStr } from "./slugify";

import jsImg from "@/assets/images/catgories/js.jpg";
import shImg from "@/assets/images/catgories/sh.jpg";
import yyImg from "@/assets/images/catgories/yy.jpg";
import syImg from "@/assets/images/catgories/sy.jpg";
import tbImg from "@/assets/images/catgories/tb.jpg";
import lyImg from "@/assets/images/catgories/ly.jpg";
import ydImg from "@/assets/images/catgories/yd.jpg";

const images = {
  js: jsImg,
  sh: shImg,
  yy: yyImg,
  sy: syImg,
  tb: tbImg,
  ly: lyImg,
  yd: ydImg,
} as const;

/** 分类名或 slug -> 本地图片文件名 */
const CATEGORY_TO_FILE: Record<string, keyof typeof images> = {
  技术: "js",
  生活: "sh",
  音乐: "yy",
  摄影: "sy",
  徒步: "tb",
  四季: "ly",
  阅读: "yd",
  "ji-shu": "js",
  "sheng-huo": "sh",
  "yin-yue": "yy",
  "she-ying": "sy",
  "tu-bu": "tb",
  "lv-you": "ly",
  "yue-du": "yd",
};

export function getCategoryImageUrl(nameOrSlug?: string): string | undefined {
  if (!nameOrSlug) return undefined;
  const key =
    CATEGORY_TO_FILE[nameOrSlug] ?? CATEGORY_TO_FILE[slugifyStr(nameOrSlug)];
  if (!key) return undefined;
  return images[key].src;
}
