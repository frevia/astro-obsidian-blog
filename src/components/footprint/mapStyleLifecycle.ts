import type { AMapInstance } from "./amap";

// AMap's style response accesses mapStyle even after destroy() clears it.
export function manageMapStyle(map: AMapInstance) {
  let pending = false;
  let disposed = false;
  let queued: string | undefined;
  let current: string | undefined;

  const update = (style: string) => {
    if (disposed) return;
    if (pending) {
      queued = style;
      return;
    }
    if (style === current) return;
    current = style;
    pending = true;
    map.setMapStyle(style);
  };

  map.on("styleChanged", () => {
    // Let the SDK finish the remainder of its response callback first.
    queueMicrotask(() => {
      pending = false;
      if (disposed) map.destroy();
      else if (queued) {
        const style = queued;
        queued = undefined;
        update(style);
      }
    });
  });

  return {
    update,
    dispose() {
      if (disposed) return;
      disposed = true;
      if (!pending) map.destroy();
      // shortcut: a failed SDK style request stays detached until page reload;
      // remove this workaround when AMap safely cancels style requests on destroy.
    },
  };
}
