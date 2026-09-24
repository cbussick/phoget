import { expect } from "@playwright/test";
import { test } from "./browserTest";

test("COOP remains on the server response and non-Firefox document navigations", async ({
  page,
  request,
  browserName,
}) => {
  const serverResponse = await request.get("/");
  expect(serverResponse.headers()["cross-origin-opener-policy"]).toBe("same-origin");

  const navigation = await page.goto("/");
  expect(navigation).not.toBeNull();
  expect(navigation!.headers()["cross-origin-opener-policy"]).toBe(
    browserName === "firefox" ? undefined : "same-origin",
  );
  await expect(page.getByRole("heading", { name: "Willkommen zu Hause" })).toBeVisible();
});
