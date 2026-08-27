import { expect, test } from "@playwright/test";

const USERNAME = process.env.TEST_USER_LOGIN;
const PASSWORD = process.env.TEST_USER_PASSWORD;

test.skip(
  !USERNAME || !PASSWORD,
  "TEST_USER_LOGIN/TEST_USER_PASSWORD not set in apps/web/.env.local",
);

test("logging in shows the account in the header and lets you log out @smoke", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(USERNAME as string);
  await page.getByLabel("Password").fill(PASSWORD as string);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Headless Test Account")).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();

  // The check above only proves the *client's* optimistic state updated —
  // reload from scratch to prove the server actually cleared the session
  // cookies, not just that the UI looked logged-out for a moment.
  await page.reload();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  await expect(page.getByText("Headless Test Account")).not.toBeVisible();
});

test("wrong password shows an error and stays on the login page @smoke", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(USERNAME as string);
  await page.getByLabel("Password").fill("definitely-wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText("Incorrect username or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("the activity feed still renders with no console errors while logged in @smoke", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/login");
  await page.getByLabel("Username").fill(USERNAME as string);
  await page.getByLabel("Password").fill(PASSWORD as string);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/$/);

  await expect(page.getByRole("heading", { name: "Activity feed" })).toBeVisible();
  await expect(page.getByText(/\d+ updates total/)).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  expect(consoleErrors).toEqual([]);
});
