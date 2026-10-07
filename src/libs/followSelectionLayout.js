import { getTranBoxOuterWidth, getTranBoxOuterHeight } from "./tranboxPosition";

const clamp = (value, max) => Math.min(Math.max(value, 0), Math.max(0, max));

// Keep the selected rectangle outside the panel, including its header/grips.
export function getFollowSelectionLayout(
  rect,
  preferred,
  viewport,
  offsets = {}
) {
  const { w: vw, h: vh } = viewport;
  const chromeW = getTranBoxOuterWidth(0),
    chromeH = getTranBoxOuterHeight(0);
  const size = {
    w: clamp(preferred.w, vw - chromeW),
    h: clamp(preferred.h, vh - chromeH),
  };
  const w = getTranBoxOuterWidth(size.w),
    h = getTranBoxOuterHeight(size.h);
  const dx = Number(offsets.x) || 0,
    dy = Number(offsets.y) || 0;
  const gx = Math.max(8, dx),
    gy = Math.max(8, dy);
  const x = clamp((rect.left + rect.right) / 2 + dx, vw - w);
  const y = clamp((rect.top + rect.bottom - h) / 2 + dy, vh - h);
  if (rect.bottom + gy + h <= vh)
    return { position: { x, y: Math.max(0, rect.bottom + gy) }, size };
  if (rect.top - gy - h >= 0)
    return { position: { x, y: rect.top - gy - h }, size };
  if (rect.right + gx + w <= vw)
    return { position: { x: Math.max(0, rect.right + gx), y }, size };
  if (rect.left - gx - w >= 0)
    return { position: { x: rect.left - gx - w, y }, size };

  // Preserve dictionary width when possible; only this opening uses less height.
  const above = clamp(rect.top - gy, vh),
    below = clamp(vh - rect.bottom - gy, vh);
  if (Math.max(above, below) > chromeH) {
    const useBelow = below >= above;
    const available = useBelow ? below : above;
    return {
      position: { x, y: useBelow ? vh - available : 0 },
      size: { ...size, h: available - chromeH },
    };
  }
  const left = clamp(rect.left - gx, vw),
    right = clamp(vw - rect.right - gx, vw);
  if (Math.max(left, right) > chromeW) {
    const useRight = right >= left;
    const available = useRight ? right : left;
    return {
      position: { x: useRight ? vw - available : 0, y },
      size: { ...size, w: available - chromeW },
    };
  }
  // A selection covering the whole viewport has no non-overlapping space.
  return { position: { x, y: 0 }, size };
}
