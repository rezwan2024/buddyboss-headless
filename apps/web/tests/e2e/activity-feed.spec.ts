import { expect, test } from "@playwright/test";

test("activity feed renders real data with no console errors @smoke", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Activity feed" })).toBeVisible();
  // "N updates total" comes from X-WP-Total — proves this is live data, not a stub.
  await expect(page.getByText(/\d+ updates total/)).toBeVisible();
  await expect(page.locator("li").first()).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
