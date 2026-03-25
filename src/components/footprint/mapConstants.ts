/** 地图画布与 padding（与 SVG viewBox 一致） */
export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 680;
export const MAP_PADDING = 20;

/** ChinaData 省级 properties.name 为简称，与 ProvinceData 的 key 通过全称对应 */
export function chinaDataProvinceName(longName: string): string {
  return longName
    .replace(/特别行政区$/, "")
    .replace(/维吾尔自治区$/, "")
    .replace(/壮族自治区$/, "")
    .replace(/回族自治区$/, "")
    .replace(/自治区$/, "")
    .replace(/省$/, "")
    .replace(/市$/, "");
}

export const PROVINCE_NAME_MAP: Record<string, string> = {
  Anhui: "安徽省",
  Aomen: "澳门特别行政区",
  Beijing: "北京市",
  Chongqing: "重庆市",
  Fujian: "福建省",
  Gansu: "甘肃省",
  Guangdong: "广东省",
  Guangxi: "广西壮族自治区",
  Guizhou: "贵州省",
  Hainan: "海南省",
  Hebei: "河北省",
  Heilongjiang: "黑龙江省",
  Henan: "河南省",
  Hubei: "湖北省",
  Hunan: "湖南省",
  Jiangsu: "江苏省",
  Jiangxi: "江西省",
  Jilin: "吉林省",
  Liaoning: "辽宁省",
  Neimenggu: "内蒙古自治区",
  Ningxia: "宁夏回族自治区",
  Qinghai: "青海省",
  Shanxi_1: "山西省",
  Shanxi_3: "陕西省",
  Shandong: "山东省",
  Shanghai: "上海市",
  Sichuan: "四川省",
  Taiwan: "台湾省",
  Tianjin: "天津市",
  Xinjiang: "新疆维吾尔自治区",
  Xianggang: "香港特别行政区",
  Xizang: "西藏自治区",
  Yunnan: "云南省",
  Zhejiang: "浙江省",
};

/** ChinaData 省级简称 → ProvinceData 的 key */
export const SHORT_NAME_TO_PROVINCE_KEY: Record<string, string> =
  Object.fromEntries(
    Object.entries(PROVINCE_NAME_MAP).map(([key, long]) => [
      chinaDataProvinceName(long),
      key,
    ])
  );
