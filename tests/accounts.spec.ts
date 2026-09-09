import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { testCredentials } from "./testCredentials";
import { userSchema } from "../shared/accounts";

test("administrator creates a user; user changes password and sees only personal settings", async ({
  page,
  request,
  browser,
}) => {
  await request.post("/api/session", { data: testCredentials });
  await page.context().addCookies((await request.storageState()).cookies);
  const username = "browser-" + crypto.randomUUID().slice(0, 8);
  const password = "temporary browser password";
  let userId: string | undefined;
  const other = await browser.newContext();
  try {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Benutzer", exact: true }).click();
    await page.getByRole("button", { name: "Benutzer anlegen", exact: true }).click();
    await page.getByLabel("Name", { exact: true }).fill("Jamie Browser");
    await page.getByLabel("Benutzername", { exact: true }).fill(testCredentials.username);
    const role = page.getByRole("combobox", { name: "Rolle" });
    await role.click();
    await page.getByRole("option", { name: "Administrator", exact: true }).click();
    await expect(role).toHaveText("Administrator");
    await role.press("Home");
    await role.press("Escape");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(role).toHaveText("Administrator");
    await role.press("Home");
    await role.press("Enter");
    await expect(role).toHaveText("Benutzer");
    await page.getByLabel("Vorläufiges Passwort", { exact: true }).fill(password);
    const createBeforeError = await page.getByRole("dialog").boundingBox();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Benutzer anlegen", exact: true })
      .click();
    await expect(page.getByRole("dialog").locator(".field-error")).toHaveText(
      "Dieser Benutzername ist bereits vergeben.",
    );
    expect(await page.getByRole("dialog").boundingBox()).toEqual(createBeforeError);
    await page.getByLabel("Benutzername", { exact: true }).fill(username);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Benutzer anlegen", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("cell", { name: username, exact: true })).toBeVisible();
    const users = await (await request.get("/api/users")).json();
    userId = userSchema
      .array()
      .parse(users)
      .find((user) => user.username === username)!.id;
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
    const userPage = await other.newPage();
    await userPage.goto("http://127.0.0.1:3002/", { waitUntil: "commit" });
    await userPage.getByLabel("Benutzername", { exact: true }).fill(username);
    await userPage.getByLabel("Passwort", { exact: true }).fill(password);
    await userPage.getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(
      userPage.getByRole("heading", { name: "Wähle dein eigenes Passwort" }),
    ).toBeVisible();
    await userPage
      .getByLabel("Vorläufiges Passwort", { exact: true })
      .fill("incorrect temporary password");
    await userPage
      .getByLabel("Neues Passwort", { exact: true })
      .fill("my private browser password");
    await userPage.getByRole("button", { name: "Passwort ändern", exact: true }).click();
    await expect(userPage.locator(".field-error")).toHaveText("Das aktuelle Passwort ist falsch.");
    await userPage.getByLabel("Vorläufiges Passwort", { exact: true }).fill(password);
    await userPage.getByRole("button", { name: "Passwort ändern", exact: true }).click();
    await expect(userPage.getByRole("heading", { name: "Alle Listen", exact: true })).toBeVisible();
    await userPage.goto("http://127.0.0.1:3002/settings", { waitUntil: "commit" });
    await expect(userPage.getByRole("heading", { name: "Mein Profil" })).toBeVisible();
    await expect(userPage.getByRole("button", { name: "Benutzer", exact: true })).toHaveCount(0);
    await expect(userPage.getByRole("button", { name: "Haushalt", exact: true })).toHaveCount(0);
    await userPage.getByLabel("Dein Name").fill("Jamie Updated");
    await userPage.getByRole("button", { name: "Namen speichern" }).click();
    await expect(userPage.getByRole("status")).toHaveText("Name gespeichert.");
    await userPage.reload({ waitUntil: "commit" });
    await expect(userPage.getByLabel("Dein Name")).toHaveValue("Jamie Updated");
    await userPage.setViewportSize({ width: 390, height: 844 });
    expect(
      (
        await new AxeBuilder({ page: userPage })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.getByRole("button", { name: username + " bearbeiten", exact: true }).click();
    await page.getByLabel("Name", { exact: true }).fill("Jamie Renamed");
    await page.getByRole("button", { name: "Änderungen speichern", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.getByRole("button", { name: username + " löschen", exact: true }).click();
    await page.getByRole("button", { name: "Benutzer löschen", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(userPage.getByRole("heading", { name: "Willkommen zu Hause" })).toBeVisible();
  } finally {
    await other.close();
    if (userId) await request.delete("/api/users/" + userId);
  }
});

test("login errors preserve username, password visibility is accessible, logout clears access", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  await expect(page.getByLabel("Benutzername", { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const emptyForm = await page.locator(".account-card").boundingBox();
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.locator(".field-error")).toHaveCount(2);
  expect(await page.locator(".account-card").boundingBox()).toEqual(emptyForm);
  await page.getByLabel("Benutzername", { exact: true }).fill(testCredentials.username);
  await page.getByLabel("Passwort", { exact: true }).fill("wrong password");
  await page.getByRole("button", { name: "Passwort anzeigen", exact: true }).click();
  await expect(page.getByLabel("Passwort", { exact: true })).toHaveAttribute("type", "text");
  const beforeError = await page.locator(".account-card").boundingBox();
  const fieldBeforeError = await page.getByLabel("Benutzername", { exact: true }).boundingBox();
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Benutzername oder Passwort ist falsch.");
  expect(await page.locator(".account-card").boundingBox()).toEqual(beforeError);
  expect(await page.getByLabel("Benutzername", { exact: true }).boundingBox()).toEqual(
    fieldBeforeError,
  );
  await expect(page.getByRole("alert")).toHaveClass(/callout/);
  await expect(page.getByLabel("Benutzername", { exact: true })).toHaveValue(
    testCredentials.username,
  );
  await page.getByLabel("Passwort", { exact: true }).fill(testCredentials.password);
  let release = () => {};
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  let submissions = 0;
  await page.route("**/api/session", async (route) => {
    if (route.request().method() === "POST") {
      submissions++;
      await hold;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  try {
    await expect(page.getByLabel("Benutzername", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("Passwort", { exact: true })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Anmeldung läuft…", exact: true }),
    ).toBeDisabled();
    await expect(page.locator(".spinner")).toBeVisible();
    await page.locator("form").evaluate((form) => (form as HTMLFormElement).requestSubmit());
    expect(submissions).toBe(1);
  } finally {
    release();
  }
  await expect(page.getByRole("heading", { name: "Alle Listen", exact: true })).toBeVisible();
  await page.unroute("**/api/session");
  await page.goto("/settings");
  await page.getByRole("button", { name: "Abmelden", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Willkommen zu Hause" })).toBeVisible();
  await page.reload({ waitUntil: "commit" });
  await expect(page.getByRole("heading", { name: "Willkommen zu Hause" })).toBeVisible();
});

test("administrator sees why self-deletion, last-admin demotion and self-reset are blocked", async ({
  page,
  request,
}) => {
  await request.post("/api/session", { data: testCredentials });
  await page.context().addCookies((await request.storageState()).cookies);
  await page.goto("/settings", { waitUntil: "commit" });
  await page.getByRole("button", { name: "Benutzer", exact: true }).click();
  await page
    .getByRole("button", { name: testCredentials.username + " löschen", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("benötigt mindestens einen Administrator");
  await expect(page.getByRole("button", { name: "Benutzer löschen", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Passwort für " + testCredentials.username + " zurücksetzen",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert")).toContainText("Ändere es unter Mein Konto");
  await expect(page.getByLabel("Vorläufiges Passwort", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Passwort zurücksetzen", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await page
    .getByRole("button", { name: testCredentials.username + " bearbeiten", exact: true })
    .click();
  await page.getByRole("combobox", { name: "Rolle" }).click();
  await page.getByRole("option", { name: "Benutzer", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("benötigt mindestens einen Administrator");
  await expect(
    page.getByRole("button", { name: "Änderungen speichern", exact: true }),
  ).toBeDisabled();
  await page.getByRole("combobox", { name: "Rolle" }).click();
  await page.getByRole("option", { name: "Administrator", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Änderungen speichern", exact: true }),
  ).toBeEnabled();
});
