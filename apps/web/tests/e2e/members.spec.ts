import { expect, test } from "@playwright/test";

test("member directory renders real data with no console errors @smoke", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/members");

  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
  // "N members" comes from X-WP-Total — proves this is live data, not a stub.
  await expect(page.getByText(/\d+ members?/)).toBeVisible();
  await expect(page.locator("li").first()).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("searching filters the member list @smoke", async ({ page }) => {
  await page.goto("/members");
  await expect(page.locator("li").first()).toBeVisible();

  const initialCount = await page.locator("li").count();
  await page.getByPlaceholder("Search members…").fill("shakeel");

  await expect
    .poll(async () => page.locator("li").count(), { timeout: 5000 })
    .toBeLessThan(initialCount);
  await expect(page.getByText("Shakeel Ahmad")).toBeVisible();
});

test("members link in the header navigates to the directory @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Members" }).click();
  await expect(page).toHaveURL(/\/members$/);
  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
});
