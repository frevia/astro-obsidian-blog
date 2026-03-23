import { useMemo, useState } from "react";
import { geoContains, geoMercator, geoPath } from "d3-geo";
import { ChinaData, ProvinceData } from "china-map-geojson";

interface FootprintPlace {
  name: string;
  lng: number;
  lat: number;
}

export interface FootprintMapProps {
  places?: FootprintPlace[];
  records?: Array<{
    title: string;
    url: string;
    name: string;
    lng: number;
    lat: number;
  }>;
}

const MAP_WIDTH = 960;
const MAP_HEIGHT = 680;
const MAP_PADDING = 20;
const PROVINCE_NAME_MAP: Record<string, string> = {
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

const FootprintMap: React.FC<FootprintMapProps> = ({
  places = [],
  records = [],
}) => {
  const projection = useMemo(
    () =>
      geoMercator().fitExtent(
        [
          [MAP_PADDING, MAP_PADDING],
          [MAP_WIDTH - MAP_PADDING, MAP_HEIGHT - MAP_PADDING],
        ],
        ChinaData as never
      ),
    []
  );
  const pathGen = useMemo(() => geoPath(projection), [projection]);

  const regionPaths = (ChinaData.features as Array<{
    properties?: { name?: string };
  }>).map((feature, idx) => ({
    key: `${feature.properties?.name ?? "region"}-${idx}`,
    name: feature.properties?.name ?? "",
    d: pathGen(feature as never),
  }));

  const cityPaths = Object.entries(
    ProvinceData as Record<string, { features?: unknown[] }>
  ).flatMap(([provinceKey, collection]) =>
    (collection.features ?? []).map((feature, idx) => ({
      key: `${provinceKey}-city-${idx}`,
      provinceKey,
      provinceName: PROVINCE_NAME_MAP[provinceKey] ?? provinceKey,
      d: pathGen(feature as never),
      feature,
      cityName: (feature as { properties?: { name?: string } }).properties?.name ?? "",
    }))
  );

  const visitedCityKeys = new Set(
    cityPaths
      .filter(city =>
        places.some(place =>
          geoContains(city.feature as never, [place.lng, place.lat] as never)
        )
      )
      .map(city => city.key)
  );

  const markerPoints = places
    .map(place => {
      const p = projection([place.lng, place.lat]);
      if (!p) return null;
      return { ...place, x: p[0], y: p[1] };
    })
    .filter(Boolean) as Array<FootprintPlace & { x: number; y: number }>;

  const cityPosts = useMemo(
    () =>
      cityPaths.map(city => {
        const posts = records.filter(record =>
          geoContains(city.feature as never, [record.lng, record.lat] as never)
        );
        return {
          key: city.key,
          provinceName: city.provinceName,
          cityName: city.cityName,
          posts,
        };
      }),
    [cityPaths, records]
  );

  const [selectedCityKey, setSelectedCityKey] = useState<string | null>(null);
  const selectedCity = cityPosts.find(city => city.key === selectedCityKey) ?? null;

  return (
    <div className="w-full">
      <div className="border-border bg-muted/10 rounded-lg border p-2 sm:p-3">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label="中国地图足迹"
        >
          <g>
            {regionPaths.map(region =>
              region.d ? (
                <path
                  key={region.key}
                  d={region.d}
                  className="fill-muted/35 stroke-foreground/45"
                  strokeWidth={1.05}
                >
                  <title>{region.name}</title>
                </path>
              ) : null
            )}
          </g>
          <g>
            {cityPaths.map(city =>
              city.d ? (
                <path
                  key={city.key}
                  d={city.d}
                  onClick={() => setSelectedCityKey(city.key)}
                  className={
                    visitedCityKeys.has(city.key)
                      ? "fill-[#ff5a36]/75 stroke-[#ff3b30] cursor-pointer"
                      : "fill-none stroke-border/55 cursor-pointer hover:fill-accent/10"
                  }
                  strokeWidth={
                    selectedCityKey === city.key
                      ? 1.2
                      : visitedCityKeys.has(city.key)
                        ? 0.95
                        : 0.45
                  }
                >
                  <title>{city.cityName}</title>
                </path>
              ) : null
            )}
          </g>
          <g>
            {markerPoints.map((p, idx) => (
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
        </svg>
      </div>

      <p className="text-muted-foreground mt-4 text-xs">
        注：地图仅用于大致轮廓展示与地点示意，不代表精确边界。
      </p>

      <div className="mt-4 rounded-xl border border-border/45 bg-background/70 p-4 shadow-sm backdrop-blur-sm">
        {selectedCity ? (
          <>
            <p className="text-base font-semibold text-foreground sm:text-lg">
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
        ) : (
          <p className="text-muted-foreground text-sm">
            点击地图中的城市区域，查看对应文章列表。
          </p>
        )}
      </div>
    </div>
  );
};

export default FootprintMap;
