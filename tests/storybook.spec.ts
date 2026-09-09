import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { z } from "zod";
const index = z
  .object({ entries: z.record(z.string(), z.object({ id: z.string(), type: z.string() })) })
  .parse(JSON.parse(readFileSync("storybook-static/index.json", "utf8")));
for (const story of Object.values(index.entries).filter((entry) => entry.type === "story")) {
  test(story.id + " renders accessibly", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/iframe.html?id=" + story.id + "&viewMode=story", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("#storybook-root > *").first()).toBeVisible();
    await expect(page.locator(".sb-errordisplay")).not.toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .include("#storybook-root")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(errors).toEqual([]);
  });
}
test("color picker presets, hex input, spectrum and disabled state stay synchronized", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=components-colorpicker--default&viewMode=story");
  const green = page.getByRole("button", { name: "Grün", exact: true });
  const hex = page.getByLabel("Eigene Farbe (Hex)");
  const picker = page.getByRole("button", { name: "Farbe auswählen", exact: true });
  await green.click();
  await expect(green).toHaveAttribute("aria-pressed", "true");
  await expect(hex).toHaveValue("#93c9a4");
  await expect(picker.locator(".color-swatch")).toHaveCSS("background-color", "rgb(147, 201, 164)");
  await hex.fill("#ABCDEF");
  await expect(picker.locator(".color-swatch")).toHaveCSS("background-color", "rgb(171, 205, 239)");
  await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0);
  await picker.click();
  const popup = page.getByRole("dialog", { name: "Eigene Farbe", exact: true });
  await expect(popup).toHaveCSS("font-family", /Nunito Variable/);
  await popup.getByRole("slider", { name: "Farbton", exact: true }).press("Home");
  await expect(hex).not.toHaveValue("#ABCDEF");
  await popup.getByRole("button", { name: "Fertig" }).click();
  await expect(picker).toBeFocused();
  await hex.fill("#e68b8b");
  await expect(hex).toHaveValue("#e68b8b");
  await expect(page.getByRole("button", { name: "Rot", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goto("/iframe.html?id=components-colorpicker--disabled&viewMode=story");
  await expect(hex).toBeDisabled();
  await expect(picker).toBeDisabled();
  await expect(green).toBeDisabled();
});

test("snackbar variants are semantic, accessible and dismissible", async ({ page }) => {
  for (const [story, variant, color] of [
    ["default", "success", "rgb(39, 103, 73)"],
    ["error", "error", "rgb(163, 41, 41)"],
    ["info", "info", "rgb(23, 111, 159)"],
  ]) {
    await page.goto(`/iframe.html?id=components-snackbar--${story}&viewMode=story`);
    await page.getByRole("button", { name: "Meldung anzeigen" }).click();
    const snackbar = page.getByRole("region", { name: "Benachrichtigung" });
    await expect(snackbar).toBeVisible();
    await expect(snackbar).toHaveAttribute("data-variant", variant);
    await expect(snackbar).toHaveCSS("border-color", color);
    await expect(page.getByRole(variant === "error" ? "alert" : "status")).not.toBeEmpty();
    expect(
      (
        await new AxeBuilder({ page })
          .include("#storybook-root")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await snackbar.getByRole("button", { name: "Meldung schließen" }).click();
    await expect(snackbar).toBeHidden();
  }
});

test("password visibility and dialog focus work in Storybook", async ({ page }) => {
  await page.goto("/iframe.html?id=components-passwordfield--default&viewMode=story");
  await page.getByRole("button", { name: "Password anzeigen" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Password verbergen" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
  await page.goto("/iframe.html?id=components-dialog--interactive&viewMode=story");
  await page.getByRole("button", { name: "Open dialog" }).click();
  await expect(page.getByLabel("List name")).toBeFocused();
  expect(
    (
      await new AxeBuilder({ page })
        .include("dialog")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open dialog" })).toBeFocused();
});

test("Storybook controls update the real component preview", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?path=/story/components-button--primary");
  const preview = page.frameLocator("#storybook-preview-iframe");
  await expect(preview.getByRole("button", { name: "Save changes" })).toBeVisible({
    timeout: 15000,
  });
  await page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: "children", exact: true }) })
    .getByRole("textbox")
    .fill("Review changes");
  await expect(preview.getByRole("button", { name: "Review changes" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("each button variant has distinct hover and pressed feedback", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const variant of ["primary", "secondary", "ghost", "danger"]) {
    await page.goto(`/iframe.html?id=components-button--${variant}&viewMode=story`);
    const button = page.locator("#storybook-root button");
    await expect(button).toBeVisible();
    await page.mouse.move(0, 0);
    const style = () =>
      button.evaluate((element) => {
        const css = getComputedStyle(element);
        return [css.backgroundColor, css.borderColor, css.boxShadow];
      });
    const resting = await style();
    await button.hover();
    const hovered = await style();
    expect(hovered[0], variant + " hover fill").not.toEqual(resting[0]);
    if (variant === "secondary") expect(hovered[1]).not.toEqual(resting[1]);
    else expect(hovered[1]).toEqual(resting[1]);
    expect(hovered[2]).toEqual(resting[2]);
    await page.mouse.down();
    const pressed = await style();
    expect(pressed[0], variant + " pressed fill").not.toEqual(hovered[0]);
    expect(pressed.slice(1), variant + " stable pressed border").toEqual(hovered.slice(1));
    expect(
      (
        await new AxeBuilder({ page })
          .include("#storybook-root")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.mouse.up();
  }
});

test("form controls share integrated hover and press states; disabled means disabled", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const component of ["textfield", "passwordfield", "select", "checkbox", "radio"]) {
    const story = component === "checkbox" ? "unchecked" : "default";
    await page.goto(`/iframe.html?id=components-${component}--${story}&viewMode=story`);
    const surface = page
      .locator("#storybook-root .field-control, #storybook-root .choice-control")
      .first();
    await expect(surface).toBeVisible();
    await page.mouse.move(0, 0);
    const style = () =>
      surface.evaluate((element) => {
        const css = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return {
          border: css.borderColor,
          width: css.borderWidth,
          shadow: css.boxShadow,
          outline: css.outlineStyle === "none" ? "0px" : css.outlineWidth,
          offset: css.outlineOffset,
          geometry: [box.x, box.y, box.width, box.height],
        };
      });
    const resting = await style();
    await surface.hover();
    const hovered = await style();
    expect(hovered.border, component + " hover color").not.toEqual(resting.border);
    expect(hovered.width).toBe("1px");
    expect(hovered.shadow).toBe("none");
    expect(hovered.outline).toBe("0px");
    expect(hovered.geometry).toEqual(resting.geometry);
    await page.mouse.down();
    const pressed = await style();
    const choice = component === "checkbox" || component === "radio";
    expect(pressed.outline).toBe(choice ? "0px" : "2px");
    if (!choice) expect(pressed.offset).toBe("-2px");
    expect(pressed.width).toBe("1px");
    expect(pressed.shadow).toBe("none");
    expect(pressed.geometry).toEqual(resting.geometry);
    await page.mouse.up();
    if (choice) {
      await expect(surface).toBeChecked();
      expect((await style()).outline).toBe("0px");
      await surface.press("Tab");
      await page.keyboard.press("Shift+Tab");
    }
    await page.keyboard.press("Escape");
    await surface
      .locator("input, textarea")
      .or(surface.filter({ hasNot: page.locator("input, textarea") }))
      .first()
      .focus();
    expect((await style()).outline).toBe("2px");
    await page.goto(`/iframe.html?id=components-${component}--disabled&viewMode=story`);
    const input = page.locator("#storybook-root input, #storybook-root button").first();
    await expect(input).toBeDisabled();
    await expect(input).toHaveCSS("cursor", "not-allowed");
  }
});

test("hint and error text have identical spacing and typography", async ({ page }) => {
  const measure = async (story: string) => {
    await page.goto(`/iframe.html?id=components-textfield--${story}&viewMode=story`);
    await expect(page.locator(".field-hint")).toBeVisible();
    return page.locator(".field-hint").evaluate((element) => {
      const field = element.closest(".form-field")!.querySelector(".field-control")!;
      const css = getComputedStyle(element);
      return {
        gap: element.getBoundingClientRect().top - field.getBoundingClientRect().bottom,
        font: css.font,
        margin: css.margin,
      };
    });
  };
  expect(await measure("invalid")).toEqual(await measure("with-hint"));
});

test("select supports keyboard, disabled options, dismissal and pointer selection", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=components-select--default&viewMode=story");
  const select = page.getByRole("combobox", { name: "Role" });
  await select.focus();
  await page.keyboard.press("ArrowDown");
  await expect(select).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(select).toHaveText("Administrator");
  await expect(select).toBeFocused();
  await select.press("Home");
  await select.press("Escape");
  await expect(select).toHaveText("Administrator");
  await select.press("u");
  await select.press("Tab");
  await expect(select).toHaveText("User");
  await select.click();
  await expect(page.getByRole("option", { name: "Guest (unavailable)" })).toBeDisabled();
  expect(
    (
      await new AxeBuilder({ page })
        .include("#storybook-root")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("option", { name: "Administrator" }).click();
  await expect(select).toHaveText("Administrator");
  await expect(select).toBeFocused();
  await select.click();
  await page.mouse.click(1, 1);
  await expect(select).toHaveAttribute("aria-expanded", "false");
  await page.setViewportSize({ width: 320, height: 360 });
  await page.locator("#storybook-root").evaluate((element) => {
    Object.assign(element.style, { position: "fixed", bottom: "8px", left: "16px" });
  });
  await select.click();
  const bounds = await page.getByRole("listbox").boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(360);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
});

test("loading buttons use an indeterminate spinner and respect reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/iframe.html?id=components-button--loading&viewMode=story");
  const button = page.getByRole("button", { name: "Wird gespeichert…" });
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(button.locator(".spinner")).toHaveCSS("animation-iteration-count", "infinite");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(button.locator(".spinner")).toHaveCSS("animation-name", "none");
});

test("list rows have balanced padding and distinct hover and pressed fills", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/iframe.html?id=components-listrow--default&viewMode=story");
  const row = page.getByRole("link");
  await expect(row).toBeVisible();
  const measure = () =>
    row.evaluate((element) => {
      const css = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      const icon = element.querySelector(".list-icon")!.getBoundingClientRect();
      const arrow = element.querySelector(".list-arrow")!.getBoundingClientRect();
      return {
        fill: css.backgroundColor,
        left: icon.left - bounds.left,
        right: bounds.right - arrow.right,
        width: bounds.width,
        height: bounds.height,
      };
    });
  await page.mouse.move(0, 0);
  const resting = await measure();
  // The icon is slightly rotated, so its visual bounds differ from its grid box.
  expect(resting.left).toBeGreaterThan(6);
  expect(Math.abs(resting.left - resting.right)).toBeLessThan(2);
  await row.hover();
  const hovered = await measure();
  expect(hovered.fill).not.toEqual(resting.fill);
  await page.mouse.down();
  const pressed = await measure();
  expect(pressed.fill).not.toEqual(hovered.fill);
  expect(pressed.width).toEqual(resting.width);
  expect(pressed.height).toEqual(resting.height);
  await page.mouse.up();
});

test("combobox filters suggestions, accepts new text and supports keyboard selection", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=components-combobox--default&viewMode=story");
  const combo = page.getByRole("combobox", { name: "Item", exact: true });
  await combo.fill("oa");
  await expect(page.getByRole("option")).toHaveText(["Oat milk"]);
  await combo.press("ArrowDown");
  await combo.press("Enter");
  await expect(combo).toHaveValue("Oat milk");
  await expect(page.getByRole("listbox")).toBeHidden();
  await combo.fill("Something new");
  await expect(combo).toHaveValue("Something new");
  await expect(page.getByRole("listbox")).toBeHidden();
  await combo.fill("");
  await combo.press("ArrowDown");
  await combo.press("Escape");
  await expect(combo).toBeFocused();
  await expect(page.getByRole("listbox")).toBeHidden();
  await combo.fill("co");
  await page.getByRole("option", { name: "Coffee", exact: true }).click();
  await expect(combo).toHaveValue("Coffee");
  await expect(combo).toBeFocused();
});

test("icon toggles use one selection and keyboard focus without changing selection on arrows", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=components-togglebuttongroup--default&viewMode=story");
  const shop = page.getByRole("button", { name: "shop", exact: true });
  const home = page.getByRole("button", { name: "home", exact: true });
  await shop.focus();
  await shop.press("ArrowRight");
  await expect(home).toBeFocused();
  await expect(shop).toHaveAttribute("aria-pressed", "true");
  await home.press("Space");
  await expect(home).toHaveAttribute("aria-pressed", "true");
  await expect(shop).toHaveAttribute("aria-pressed", "false");
  await home.click();
  await expect(home).toHaveAttribute("aria-pressed", "true");
  await home.press("End");
  await expect(page.getByRole("button", { name: "heart", exact: true })).toBeFocused();
});
