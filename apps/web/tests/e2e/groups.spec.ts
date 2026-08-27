import { expect, test } from "@playwright/test";

test("groups directory renders real data with no console errors @smoke", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/groups");

  await expect(page.getByRole("heading", { name: "Groups" })).toBeVisible();
  // "N groups" comes from X-WP-Total — proves this is live data, not a stub.
  await expect(page.getByText(/\d+ groups?/)).toBeVisible();
  await expect(page.locator("li").first()).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("searching filters the group list @smoke", async ({ page }) => {
  await page.goto("/groups");
  await expect(page.locator("li").first()).toBeVisible();

  const initialCount = await page.locator("li").count();
  await page.getByPlaceholder("Search groups…").fill("foodie");

  await expect
    .poll(async () => page.locator("li").count(), { timeout: 5000 })
    .toBeLessThan(initialCount);
  await expect(page.getByText("Foodie")).toBeVisible();
});

test("groups link in the header navigates to the directory @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Groups" }).click();
  await expect(page).toHaveURL(/\/groups$/);
  await expect(page.getByRole("heading", { name: "Groups" })).toBeVisible();
});

test("clicking a group opens its detail page with a member list @smoke", async ({ page }) => {
  await page.goto("/groups");
  const firstCard = page.locator("li a").first();
  const groupName = await firstCard.locator("p").first().innerText();

  await firstCard.click();

  await expect(page).toHaveURL(/\/groups\/\d+$/);
  await expect(page.getByRole("heading", { name: groupName })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
  await expect(page.locator("li a[href^='/members/']").first()).toBeVisible();
});
