import { geoBounds, geoCentroid, geoContains } from "d3-geo";

/**
 * 同级多边形套叠（如河北围北京、省内市县飞地）：质心/首选点可能落在兄弟要素内。
 * 返回「在自身界内且不在任何兄弟界内」的点；优先用 preferred（如 JSON center），否则用质心。
 */
export function labelLngLatAvoidingSiblings(
  self: unknown,
  siblingFeatures: unknown[],
  selfIndex: number,
  preferred: [number, number] | null | undefined
): [number, number] | null {
  const insideSelfNotSibling = (p: [number, number]): boolean => {
    if (!geoContains(self as never, p as never)) return false;
    for (let k = 0; k < siblingFeatures.length; k++) {
      if (k === selfIndex) continue;
      if (geoContains(siblingFeatures[k] as never, p as never)) return false;
    }
    return true;
  };

  let c: [number, number];
  if (
    preferred &&
    Number.isFinite(preferred[0]) &&
    Number.isFinite(preferred[1])
  ) {
    c = [preferred[0], preferred[1]];
  } else {
    const gc = geoCentroid(self as never) as [number, number];
    if (!Number.isFinite(gc[0]) || !Number.isFinite(gc[1])) return null;
    c = gc;
  }

  const b = geoBounds(self as never);
  const span = Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1], 0.35);

  // 大区域包小区域时（如河北包北京/天津），即使中心点合法，也应远离内嵌兄弟区域。
  // 用“在 self 内的兄弟质心”形成斥力，避免标签压住内部区域。
  const enclosedSiblingCentroids: [number, number][] = [];
  const selfBboxArea =
    Math.max(1e-9, (b[1][0] - b[0][0]) * (b[1][1] - b[0][1]));
  for (let k = 0; k < siblingFeatures.length; k++) {
    if (k === selfIndex) continue;
    const sib = siblingFeatures[k];
    const gc = geoCentroid(siblingFeatures[k] as never) as [number, number];
    if (!Number.isFinite(gc[0]) || !Number.isFinite(gc[1])) continue;
    const insideByPolygon = geoContains(self as never, gc as never);
    if (insideByPolygon) {
      enclosedSiblingCentroids.push(gc);
      continue;
    }
    // 洞/内嵌市情况：小区域不一定被 self contains，但视觉上会被大区域文字遮挡。
    const sb = geoBounds(sib as never);
    const sibBboxArea = Math.max(
      1e-9,
      (sb[1][0] - sb[0][0]) * (sb[1][1] - sb[0][1])
    );
    const smallSibling = sibBboxArea <= selfBboxArea * 0.22;
    const inSelfBox =
      gc[0] >= b[0][0] &&
      gc[0] <= b[1][0] &&
      gc[1] >= b[0][1] &&
      gc[1] <= b[1][1];
    const nearCenter = Math.hypot(gc[0] - c[0], gc[1] - c[1]) <= span * 0.8;
    if (smallSibling && inSelfBox && nearCenter) enclosedSiblingCentroids.push(gc);
  }

  const repelRadius = span * 0.32;
  const repelStep = span * 0.22;
  if (insideSelfNotSibling(c) && enclosedSiblingCentroids.length > 0) {
    // 只有当“斥力源足够近”时才需要推开；否则（例如青海这种质心误判）会把中心点无意义地推远。
    let minD = Infinity;
    for (const ec of enclosedSiblingCentroids) {
      const d = Math.hypot(c[0] - ec[0], c[1] - ec[1]);
      if (d < minD) minD = d;
    }
    if (minD > repelRadius) {
      return c;
    }

    let rx = 0;
    let ry = 0;
    for (const ec of enclosedSiblingCentroids) {
      const vx = c[0] - ec[0];
      const vy = c[1] - ec[1];
      const d = Math.hypot(vx, vy);
      if (d < 1e-6 || d > repelRadius) continue;
      const w = (repelRadius - d) / repelRadius;
      rx += (vx / Math.max(d, 1e-6)) * w;
      ry += (vy / Math.max(d, 1e-6)) * w;
    }
    const rlen = Math.hypot(rx, ry);
    if (rlen > 1e-8) {
      const ux = rx / rlen;
      const uy = ry / rlen;
      for (let i = 1; i <= 28; i++) {
        const t = (repelStep * i) / 28;
        const p: [number, number] = [c[0] + ux * t, c[1] + uy * t];
        if (insideSelfNotSibling(p)) return p;
      }
    }
    // 方向推开仍不够时：在本区域内搜索“离内嵌兄弟最远”的点，避免视觉遮挡。
    const steps = 26;
    let best: [number, number] | null = null;
    let bestScore = -Infinity;
    for (let i = 1; i < steps; i++) {
      for (let j = 1; j < steps; j++) {
        const lng = b[0][0] + ((b[1][0] - b[0][0]) * i) / steps;
        const lat = b[0][1] + ((b[1][1] - b[0][1]) * j) / steps;
        const p: [number, number] = [lng, lat];
        if (!insideSelfNotSibling(p)) continue;

        let minDist = Infinity;
        for (const ec of enclosedSiblingCentroids) {
          const d = Math.hypot(p[0] - ec[0], p[1] - ec[1]);
          if (d < minDist) minDist = d;
        }
        // 主目标：远离内嵌区域；次目标：别离初始点太远。
        const score = minDist - 0.18 * Math.hypot(p[0] - c[0], p[1] - c[1]);
        if (score > bestScore) {
          bestScore = score;
          best = p;
        }
      }
    }
    return best ?? c;
  }

  if (insideSelfNotSibling(c)) return c;

  let nx = 0;
  let ny = 0;
  for (let k = 0; k < siblingFeatures.length; k++) {
    if (k === selfIndex) continue;
    if (!geoContains(siblingFeatures[k] as never, c as never)) continue;
    const gc = geoCentroid(siblingFeatures[k] as never) as [number, number];
    nx += c[0] - gc[0];
    ny += c[1] - gc[1];
  }
  const nlen = Math.hypot(nx, ny);
  if (nlen > 1e-10) {
    nx /= nlen;
    ny /= nlen;
  } else {
    nx = 1;
    ny = 0;
  }

  const searchSpan = span * 1.25;

  let bestCandidate: [number, number] | null = null;
  let bestMinDist = -Infinity;
  let bestDistFromC = Infinity;

  for (let step = 1; step <= 56; step++) {
    const t = (searchSpan * step) / 56;
    const p: [number, number] = [c[0] + nx * t, c[1] + ny * t];
    if (!insideSelfNotSibling(p)) continue;

    if (enclosedSiblingCentroids.length > 0) {
      let minDist = Infinity;
      for (const ec of enclosedSiblingCentroids) {
        const d = Math.hypot(p[0] - ec[0], p[1] - ec[1]);
        if (d < minDist) minDist = d;
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestCandidate = p;
      }
    } else {
      const d = Math.hypot(p[0] - c[0], p[1] - c[1]);
      if (d < bestDistFromC) {
        bestDistFromC = d;
        bestCandidate = p;
      }
    }
  }

  if (bestCandidate) return bestCandidate;

  const steps = 20;
  let best: [number, number] | null = null;
  let bestDist = Infinity;
  for (let i = 1; i < steps; i++) {
    for (let j = 1; j < steps; j++) {
      const lng = b[0][0] + ((b[1][0] - b[0][0]) * i) / steps;
      const lat = b[0][1] + ((b[1][1] - b[0][1]) * j) / steps;
      const p: [number, number] = [lng, lat];
      if (!insideSelfNotSibling(p)) continue;

      if (enclosedSiblingCentroids.length > 0) {
        let minDist = Infinity;
        for (const ec of enclosedSiblingCentroids) {
          const d = Math.hypot(p[0] - ec[0], p[1] - ec[1]);
          if (d < minDist) minDist = d;
        }
        // Primary objective: maximize distance to enclosed siblings.
        if (minDist > bestMinDist) {
          best = p;
        }
      } else {
        const d = Math.hypot(p[0] - c[0], p[1] - c[1]);
        if (d < bestDist) {
          bestDist = d;
          best = p;
        }
      }
    }
  }

  return best ?? c;
}
