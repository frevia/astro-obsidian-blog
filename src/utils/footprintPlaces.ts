import { withBase } from "./withBase";

export type PlaceRecord = {
  name: string;
  lng: number;
  lat: number;
};

export function parseLocationText(text: string): PlaceRecord | null {
  const parts = text.split(",").map(s => s.trim());
  if (parts.length < 3) return null;

  const name = parts.slice(0, -2).join(",").trim();
  const lngRaw = parts.at(-2);
  const latRaw = parts.at(-1);
  if (!name || !lngRaw || !latRaw) return null;

  const lng = Number(lngRaw);
  const lat = Number(latRaw);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
  return { name, lng, lat };
}

export function toPlaceRecords(post: {
  data: { locations?: string[] };
}): PlaceRecord[] {
  const { locations } = post.data;
  if (!locations?.length) return [];
  return locations
    .filter(Boolean)
    .map(parseLocationText)
    .filter((place): place is PlaceRecord => place !== null);
}

export function footprintPlaceKey(place: PlaceRecord): string {
  return `${place.name}:${place.lng},${place.lat}`;
}

export function footprintPlaceUrl(place: PlaceRecord): string {
  return withBase(
    `/footprint?place=${encodeURIComponent(footprintPlaceKey(place))}`
  );
}

export function findLinkedPlace<T extends PlaceRecord>(
  places: T[],
  search: string
): T | undefined {
  const key = new URLSearchParams(search).get("place");
  return places.find(place => footprintPlaceKey(place) === key);
}
