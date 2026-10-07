import { getFollowSelectionLayout } from "./followSelectionLayout";
import { getTranBoxOuterWidth, getTranBoxOuterHeight } from "./tranboxPosition";

function assertClear(layout, rect, viewport) {
  const { x, y } = layout.position;
  const w = getTranBoxOuterWidth(layout.size.w),
    h = getTranBoxOuterHeight(layout.size.h);
  expect(x).toBeGreaterThanOrEqual(0);
  expect(y).toBeGreaterThanOrEqual(0);
  expect(x + w).toBeLessThanOrEqual(viewport.w);
  expect(y + h).toBeLessThanOrEqual(viewport.h);
  expect(
    x + w <= rect.left ||
      x >= rect.right ||
      y + h <= rect.top ||
      y >= rect.bottom
  ).toBe(true);
}
test("large panel beside a word in the left column does not cover it", () => {
  const viewport = { w: 1075, h: 736 },
    rect = { left: 120, right: 180, top: 410, bottom: 430 };
  const layout = getFollowSelectionLayout(rect, { w: 760, h: 526 }, viewport, {
    y: 10,
  });
  expect(layout.position.x).toBe(188);
  expect(layout.size).toEqual({ w: 760, h: 526 });
  assertClear(layout, rect, viewport);
});
test.each([120, 500, 980])(
  "keeps the panel clear of the selected word for x=%s",
  (left) => {
    const viewport = { w: 1075, h: 736 },
      rect = { left, right: left + 60, top: 410, bottom: 430 };
    const preferred = { w: 800, h: 600 };
    const layout = getFollowSelectionLayout(rect, preferred, viewport, {
      y: 10,
    });
    assertClear(layout, rect, viewport);
    expect(preferred).toEqual({ w: 800, h: 600 });
  }
);
test("right column uses the left side", () => {
  const viewport = { w: 1075, h: 736 },
    rect = { left: 950, right: 1020, top: 410, bottom: 430 };
  const layout = getFollowSelectionLayout(rect, { w: 760, h: 526 }, viewport);
  expect(layout.position.x).toBe(166);
  assertClear(layout, rect, viewport);
});
test("negative offsets never pull the panel over the word", () => {
  const viewport = { w: 700, h: 500 },
    rect = { left: 300, right: 350, top: 240, bottom: 265 };
  assertClear(
    getFollowSelectionLayout(rect, { w: 600, h: 400 }, viewport, {
      x: -200,
      y: -200,
    }),
    rect,
    viewport
  );
});
