import { expect, test } from "@playwright/test";

test("saved marker surrounds its center without changing the draft marker", async ({ page }) => {
  await page.goto("/");
  await page.setContent(`
    <div class="map-marker" style="--marker-color: #168bd0">
      <button class="map-marker__pin"><span class="map-marker__center"></span></button>
    </div>
    <div class="map-marker map-marker--draft">
      <span class="map-marker__pin"><span class="map-marker__center"></span></span>
    </div>
  `);
  await page.addStyleTag({ path: "src/features/locations/components/mapControls.css" });
  const sizes = await page.locator(".map-marker").evaluateAll((markers) => markers.map((marker) => {
    const pin = marker.querySelector<HTMLElement>(".map-marker__pin")!;
    const center = marker.querySelector<HTMLElement>(".map-marker__center")!;
    return { transform: getComputedStyle(pin, "::before").transform, center: center.getBoundingClientRect().width, padding: getComputedStyle(pin).paddingTop };
  }));
  expect(sizes[0]).toEqual({ transform: "matrix(1.15, 0, 0, 1.15, 0, 0)", center: 30, padding: "7px" });
  expect(sizes[1]).toEqual({ transform: "none", center: 24, padding: "9px" });
});
