import { expect, test } from "@playwright/test";

test("blog list renders real data with no console errors @smoke", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/blog");

  await expect(page.getByRole("heading", { name: "Blog" })).toBeVisible();
  // "N posts" comes from X-WP-Total — proves this is live data, not a stub.
  await expect(page.getByText(/\d+ posts?/)).toBeVisible();
  await expect(page.locator("li").first()).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("searching filters the blog list @smoke", async ({ page }) => {
  await page.goto("/blog");
  await expect(page.locator("li").first()).toBeVisible();

  await page.getByPlaceholder("Search posts…").fill("hello");

  await expect(page.getByText("Hello world!")).toBeVisible();
});

test("blog link in the header navigates to the list @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Blog" }).click();
  await expect(page).toHaveURL(/\/blog$/);
  await expect(page.getByRole("heading", { name: "Blog" })).toBeVisible();
});

test("clicking a post opens it at a slug URL with content @smoke", async ({ page }) => {
  await page.goto("/blog");
  const firstCard = page.locator("li a").first();
  const postTitle = await firstCard.locator("p").first().innerText();

  await firstCard.click();

  await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { name: postTitle })).toBeVisible();
});
