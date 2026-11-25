import { expect } from "@playwright/test";
import { test } from "./browserTest";
import { listSchema } from "../shared/contracts";
import { testCredentials } from "./testCredentials";

test("overflowing placeholder looks identical before focus, during focus and after blur", async ({
  page,
  request,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 680 });
  expect((await request.post("/api/session", { data: testCredentials })).status()).toBe(200);
  await context.addCookies((await request.storageState()).cookies);
  const list = listSchema.parse(
    await (await request.post("/api/lists", { data: { name: "Placeholder focus" } })).json(),
  );
  try {
    await page.goto(`/lists/${list.id}`);
    const input = page.getByRole("combobox", { name: "Eintrag hinzufügen", exact: true });
    await expect(input).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const placeholder = page.locator(".text-field-placeholder");
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toHaveAttribute("aria-hidden", "true");
    await expect(placeholder).toHaveCSS("text-overflow", "ellipsis");
    const box = (await input.boundingBox())!;
    // Exclude the border, parent focus ring and native caret from the comparison.
    const clip = { x: box.x + 12, y: box.y + 8, width: box.width - 24, height: box.height - 16 };
    const capture = () => page.screenshot({ clip, caret: "hide", animations: "disabled" });
    const before = await capture();
    async function expectSamePlaceholder() {
      await expect(placeholder).toBeVisible();
      await expect(placeholder).toHaveCSS("text-overflow", "ellipsis");
      const after = await capture();
      const difference = await page.evaluate(
        async ([a, b]) => {
          const [first, second] = await Promise.all(
            [a, b].map(async (base64) => {
              const img = new Image();
              img.src = "data:image/png;base64," + base64;
              await img.decode();
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d")!;
              ctx.drawImage(img, 0, 0);
              return ctx.getImageData(0, 0, img.width, img.height);
            }),
          );
          // Allow a one-pixel rasterization shift on focus.
          let smallest = 1;
          for (const dx of [-1, 0, 1]) {
            for (const dy of [-1, 0, 1]) {
              let changed = 0;
              for (let y = 1; y < first.height - 1; y++) {
                for (let x = 1; x < first.width - 1; x++) {
                  const i = (y * first.width + x) * 4;
                  const j = ((y + dy) * second.width + x + dx) * 4;
                  const firstLuminance =
                    (first.data[i] + first.data[i + 1] + first.data[i + 2]) / 3;
                  const secondLuminance =
                    (second.data[j] + second.data[j + 1] + second.data[j + 2]) / 3;
                  if (Math.abs(firstLuminance - secondLuminance) > 55) {
                    changed++;
                  }
                }
              }
              smallest = Math.min(smallest, changed / ((first.width - 2) * (first.height - 2)));
            }
          }
          return smallest;
        },
        [before.toString("base64"), after.toString("base64")],
      );
      expect(difference).toBeLessThan(0.01);
    }
    await input.click();
    await expect(input).toBeFocused();
    await expectSamePlaceholder();
    await page.getByRole("heading", { name: list.name, exact: true }).click();
    await expect(input).not.toBeFocused();
    await expectSamePlaceholder();
    const longName =
      "Very long item name that is still editable without any truncation of its value";
    await input.fill(longName);
    await expect(input).toHaveValue(longName);
    await expect(page.locator(".text-field-placeholder")).toBeHidden();
    await input.fill("");
    await expectSamePlaceholder();
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});
