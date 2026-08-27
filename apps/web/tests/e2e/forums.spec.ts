import { expect, test } from "@playwright/test";

test("forums list renders real data with no console errors @smoke", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/forums");

  await expect(page.getByRole("heading", { name: "Forums" })).toBeVisible();
  // "N forums" comes from X-WP-Total — proves this is live data, not a stub.
  await expect(page.getByText(/\d+ forums?/)).toBeVisible();
  await expect(page.locator("li").first()).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("forums link in the header navigates to the list @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Forums" }).click();
  await expect(page).toHaveURL(/\/forums$/);
  await expect(page.getByRole("heading", { name: "Forums" })).toBeVisible();
});

test("clicking a forum shows its topics with resolved author names @smoke", async ({ page }) => {
  await page.goto("/forums");
  const firstForum = page.locator("li a").first();
  const forumName = await firstForum.locator("p").first().innerText();

  await firstForum.click();

  await expect(page).toHaveURL(/\/forums\/\d+$/);
  await expect(page.getByRole("heading", { name: forumName })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Topics" })).toBeVisible();

  const topicLink = page.locator("li a[href*='/topics/']").first();
  await expect(topicLink).toBeVisible();
  // Author must be a resolved name, not the "Member" fallback used only
  // when the batch member lookup can't find the author.
  await expect(topicLink.getByText("Member ·")).not.toBeVisible();
});

test("clicking a topic shows its replies with resolved author names @smoke", async ({ page }) => {
  await page.goto("/forums");
  await page.locator("li a").first().click();
  await expect(page).toHaveURL(/\/forums\/\d+$/);

  const topicLink = page.locator("li a[href*='/topics/']").first();
  const topicTitle = await topicLink.locator("p").first().innerText();
  await topicLink.click();

  // This is the deepest new route (/forums/[id]/topics/[topicId]) — on a
  // cold dev server Next compiles it on first visit, which can outrun the
  // default timeout. Doesn't happen against a prebuilt production deploy.
  await expect(page).toHaveURL(/\/forums\/\d+\/topics\/\d+$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: topicTitle })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Repl(y|ies)$/ })).toBeVisible();
});
