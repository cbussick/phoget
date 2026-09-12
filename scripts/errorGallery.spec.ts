import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { testCredentials } from "../tests/testCredentials";

const output = resolve("error-gallery");
const shots = resolve(output, "screenshots");
type Entry = { slug: string; title: string; area: string; trigger: string };
const entries: Entry[] = [];

async function capture(page: Page, entry: Entry) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(shots, entry.slug + ".png"), fullPage: true });
  entries.push(entry);
  await page
    .getByRole("button", { name: "Meldung schließen" })
    .evaluateAll((buttons) => buttons.forEach((button) => (button as HTMLButtonElement).click()));
  await page.waitForTimeout(250);
}
const failure =
  (message = "Testfehler: Die Anfrage konnte nicht abgeschlossen werden.") =>
  async (route: Route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: message }),
    });
async function login(page: Page) {
  await page.getByLabel("Benutzername", { exact: true }).fill(testCredentials.username);
  await page.getByLabel("Passwort", { exact: true }).fill(testCredentials.password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Alle Listen", exact: true })).toBeVisible();
}

test("capture the application's error states", async ({ page }) => {
  await rm(output, { recursive: true, force: true });
  await mkdir(shots, { recursive: true });
  await page.setViewportSize({ width: 1100, height: 850 });

  await page.route("**/api/session", async (route) =>
    route.request().method() === "GET"
      ? failure("Don't Phoget ist gerade nicht erreichbar.")(route)
      : route.continue(),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Keine Verbindung möglich" })).toBeVisible();
  await capture(page, {
    slug: "session-unavailable",
    title: "Session cannot be loaded",
    area: "Full page",
    trigger: "GET /api/session fails before a cached session exists",
  });
  await page.unrouteAll();

  await page.goto("/");
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.locator(".field-error")).toHaveCount(2);
  await capture(page, {
    slug: "login-required-fields",
    title: "Login fields are empty",
    area: "Form validation",
    trigger: "Submit the empty login form",
  });
  await page.getByLabel("Benutzername", { exact: true }).fill(testCredentials.username);
  await page.getByLabel("Passwort", { exact: true }).fill("wrong password");
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await capture(page, {
    slug: "login-rejected",
    title: "Login is rejected",
    area: "Login callout",
    trigger: "Submit incorrect credentials",
  });
  await page.getByLabel("Passwort", { exact: true }).fill(testCredentials.password);
  await login(page);

  await page.route("**/api/state", failure("Listenservice nicht verfügbar."));
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Deine Listen konnten nicht geladen werden" }),
  ).toBeVisible({ timeout: 15_000 });
  await capture(page, {
    slug: "lists-initial-load",
    title: "Lists cannot be loaded",
    area: "Main content",
    trigger: "GET /api/state fails with no cached data",
  });
  await page.unrouteAll();

  const list = await page.evaluate(async () =>
    (
      await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Error state review",
          description: "Temporary list for the gallery",
        }),
      })
    ).json(),
  );
  const item = await page.evaluate(
    async (listId) =>
      (
        await fetch(`/api/lists/${listId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Milk" }),
        })
      ).json(),
    list.id,
  );
  try {
    await page.goto(`/lists/${list.id}`);
    await expect(page.getByRole("heading", { name: "Error state review" })).toBeVisible();
    await page.route("**/api/state", failure("Verbindung unterbrochen."));
    await page.route("**/api/items/history", failure("Vorschläge nicht verfügbar."));
    await page.waitForTimeout(4500);
    await expect(page.getByRole("region", { name: "Benachrichtigung" })).toContainText(
      "Verbindung unterbrochen. Die zuletzt gespeicherte Version wird angezeigt.",
    );
    await capture(page, {
      slug: "list-stale-and-suggestions",
      title: "List is stale and suggestions are unavailable",
      area: "List page callouts",
      trigger: "Background state refresh and item history both fail",
    });
    await page.unrouteAll();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Error state review" })).toBeVisible();

    await page.route(`**/api/lists/${list.id}/items`, failure());
    await page
      .getByRole("combobox", { name: "Eintrag hinzufügen", exact: true })
      .fill("Keep this draft");
    await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
    await expect(page.getByRole("region", { name: "Benachrichtigung" })).toBeVisible();
    await capture(page, {
      slug: "add-item-failed",
      title: "Adding an item fails",
      area: "Add item form",
      trigger: "POST /api/lists/:id/items fails",
    });
    await page.unrouteAll();

    await page.reload();
    await page.route(`**/api/items/${item.id}`, failure());
    await page.getByRole("checkbox", { name: /Milk als erledigt markieren/ }).click();
    await expect(page.getByRole("region", { name: "Benachrichtigung" })).toBeVisible();
    await capture(page, {
      slug: "toggle-item-failed",
      title: "Updating item completion fails",
      area: "Item row",
      trigger: "PATCH /api/items/:id fails after checking an item",
    });
    await page.unrouteAll();

    await page.getByRole("button", { name: "Milk", exact: true }).click();
    await page.route(`**/api/items/${item.id}`, failure());
    await page.getByRole("textbox", { name: "Eintrag", exact: true }).fill("Milk edited");
    await page.getByRole("button", { name: "Änderungen speichern", exact: true }).click();
    await expect(page.getByRole("region", { name: "Benachrichtigung" })).toBeVisible();
    await capture(page, {
      slug: "edit-item-failed",
      title: "Saving an item fails",
      area: "Item dialog",
      trigger: "PATCH /api/items/:id fails",
    });
    await page.unrouteAll();
    await page.getByRole("button", { name: "Dialog schließen" }).click();

    await page.getByRole("button", { name: "Weitere Optionen" }).click();
    await page.route(`**/api/lists/${list.id}`, failure());
    await page.getByLabel("Listenname").fill("Unsaved list name");
    await page.getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(page.getByRole("region", { name: "Benachrichtigung" })).toBeVisible();
    await capture(page, {
      slug: "edit-list-failed",
      title: "Saving list details fails",
      area: "List dialog",
      trigger: "PUT /api/lists/:id fails",
    });
    await page.unrouteAll();
    await page.getByRole("button", { name: "Dialog schließen" }).click();

    await page.goto("/settings");
    await page.getByRole("button", { name: "Haushalt", exact: true }).click();
    await page.route("**/api/settings", failure());
    await page.getByLabel("Name des Haushalts").fill("Unsaved household");
    await page.getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(page.getByRole("region", { name: "Benachrichtigung" })).toBeVisible();
    await capture(page, {
      slug: "household-settings-failed",
      title: "Household settings cannot be saved",
      area: "Settings card",
      trigger: "PUT /api/settings fails",
    });
    await page.unrouteAll();

    await page.goto("/settings");
    await page.route("**/api/account", failure());
    await page.getByLabel("Dein Name").fill("Unsaved name");
    await page.getByRole("button", { name: "Namen speichern" }).click();
    await expect(page.getByRole("region", { name: "Benachrichtigung" })).toBeVisible();
    await capture(page, {
      slug: "profile-save-failed",
      title: "Profile cannot be saved",
      area: "Profile card",
      trigger: "PUT /api/account fails",
    });
    await page.unrouteAll();

    await page.goto("/settings");
    await page.getByRole("button", { name: "Benutzer", exact: true }).click();
    await page
      .getByRole("button", { name: `${testCredentials.username} löschen`, exact: true })
      .click();
    await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
    await capture(page, {
      slug: "self-delete-blocked",
      title: "Deleting the last administrator is blocked",
      area: "User dialog",
      trigger: "Open delete for the current, only administrator",
    });
    await page.getByRole("button", { name: "Dialog schließen" }).click();

    await page.goto("/lists/not-a-real-list");
    await expect(page.getByRole("heading", { name: "Liste nicht gefunden" })).toBeVisible();
    await capture(page, {
      slug: "list-not-found",
      title: "List not found",
      area: "Main content",
      trigger: "Visit an unknown or deleted list URL",
    });

    await page.addInitScript(() =>
      Object.defineProperty(document, "createElementNS", {
        value() {
          throw new Error("Gallery error boundary");
        },
      }),
    );
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { name: "Etwas ist schiefgelaufen" })).toBeVisible();
    await capture(page, {
      slug: "fatal-render-error",
      title: "Unexpected rendering error",
      area: "Full-page error boundary",
      trigger: "An uncaught React rendering error occurs",
    });
  } finally {
    await page.request.delete(`/api/lists/${list.id}`);
  }

  const cards = entries
    .map(
      (entry, index) =>
        `<article><a href="screenshots/${entry.slug}.png"><img src="screenshots/${entry.slug}.png" alt="Screenshot: ${entry.title}" loading="lazy"></a><div class="copy"><span>${String(index + 1).padStart(2, "0")} · ${entry.area}</span><h2>${entry.title}</h2><p>${entry.trigger}</p></div></article>`,
    )
    .join("\n");
  await writeFile(
    resolve(output, "index.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Don't Phoget · Error states</title><style>:root{color-scheme:light;font-family:ui-sans-serif,system-ui,sans-serif;background:#eef2ef;color:#17352f}*{box-sizing:border-box}body{margin:0}header{max-width:1500px;margin:auto;padding:64px 32px 30px}h1{font-size:clamp(2.5rem,6vw,5rem);letter-spacing:-.055em;margin:0;line-height:.95}header p{max-width:680px;color:#536b65;font-size:1.05rem;line-height:1.55}.count{font-size:.8rem;text-transform:uppercase;letter-spacing:.12em;font-weight:700;color:#1879a9}main{max-width:1500px;margin:auto;padding:0 32px 80px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,430px),1fr));gap:24px}article{background:#fffdf9;border:1px solid #ccd8d3;border-radius:14px;overflow:hidden;box-shadow:0 12px 30px rgba(25,53,47,.06)}a{display:block;background:#dde5e1;border-bottom:1px solid #ccd8d3}img{display:block;width:100%;aspect-ratio:11/8.5;object-fit:cover;object-position:top}.copy{padding:20px 22px 24px}.copy span{font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:#667b75;font-weight:700}h2{font-size:1.2rem;margin:.45rem 0}article p{margin:0;color:#5a6e68;line-height:1.45;font-size:.92rem}@media(max-width:520px){header,main{padding-left:16px;padding-right:16px}header{padding-top:36px}}</style></head><body><header><div class="count">${entries.length} captured states · Chromium · 1100 × 850</div><h1>Error state gallery</h1><p>A generated visual inventory of user-visible failure and blocked-action states. Click any screenshot to inspect it at full size. Regenerate after UI changes with <code>npm run gallery:errors</code>.</p></header><main>${cards}</main></body></html>`,
  );
});
