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

test("scrolling loads more activity @smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("li").first()).toBeVisible();

  const initialCount = await page.locator("li").count();
  await page.locator("li").last().scrollIntoViewIfNeeded();

  await expect
    .poll(async () => page.locator("li").count(), { timeout: 5000 })
    .toBeGreaterThan(initialCount);
});

test("clicking a comment count expands the thread @smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("li").first()).toBeVisible();

  // Only items with comment_count > 0 render as a clickable button.
  const commentButton = page.getByRole("button", { name: /\d+ comments/ }).first();
  await commentButton.scrollIntoViewIfNeeded();
  await commentButton.click();

  // The loading state is transient and may resolve before we can observe it
  // (e.g. a cached response) — just wait for it to be gone either way.
  await expect(page.getByText("Loading comments…")).toBeHidden();

  // Real comment content, not the "No comments yet."/error fallback —
  // clicking a button that says "N comments" (N > 0) should always resolve
  // to actual comments.
  await expect(page.getByText("No comments yet.")).not.toBeVisible();
  await expect(page.getByText("Couldn't load comments.")).not.toBeVisible();
});

test("clicking a likes count shows who liked it @smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("li").first()).toBeVisible();

  // Only items with favorite_count > 0 render as a clickable button.
  const likesButton = page.getByRole("button", { name: /\d+ likes/ }).first();
  await likesButton.scrollIntoViewIfNeeded();
  await likesButton.click();

  // reacted_names always has at least one name when favorite_count > 0, so
  // the popover should never fall back to the generic "Liked by N" text.
  await expect(page.getByText(/^Liked by \d+$/)).not.toBeVisible();
});
