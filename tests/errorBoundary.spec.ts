import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("error boundary centers its fallback on desktop and mobile", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "createElementNS", {
      value() {
        throw new Error("Test error boundary");
      },
    });
  });
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.getByRole("heading", { name: "Etwas ist schiefgelaufen" })).toBeVisible();
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const content = await page.locator(".error-page").evaluate((element) => {
      const children = [...element.children].map((child) => child.getBoundingClientRect());
      return {
        top: Math.min(...children.map((box) => box.top)),
        bottom: Math.max(...children.map((box) => box.bottom)),
        centers: children.map((box) => box.left + box.width / 2),
      };
    });
    expect(Math.abs((content.top + content.bottom) / 2 - 500)).toBeLessThan(2);
    for (const center of content.centers) expect(Math.abs(center - width / 2)).toBeLessThan(2);
  }
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
      .violations,
  ).toEqual([]);
});
