// Group overlapping marker footprints in screen pixels, independent of zoom.
export function groupNearbyPlaces<T>(
  points: { item: T; x: number; y: number }[],
  distance = 68
): T[][] {
  const remaining = new Set(points);
  const groups: T[][] = [];
  for (const point of points) {
    if (!remaining.delete(point)) continue;
    const group = [point];
    for (const member of group) {
      for (const candidate of remaining) {
        if (
          Math.abs(member.x - candidate.x) < distance &&
          Math.abs(member.y - candidate.y) < distance
        ) {
          remaining.delete(candidate);
          group.push(candidate);
        }
      }
    }
    groups.push(group.map(point => point.item));
  }
  return groups;
}
