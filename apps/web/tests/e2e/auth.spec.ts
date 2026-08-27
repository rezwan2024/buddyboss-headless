import { expect, test } from "@playwright/test";

const USERNAME = process.env.TEST_USER_LOGIN;
const PASSWORD = process.env.TEST_USER_PASSWORD;

test.skip(
  !USERNAME || !PASSWORD,
  "TEST_USER_LOGIN/TEST_USER_PASSWORD not set in apps/web/.env.local",
);

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(USERNAME as string);
  await page.getByLabel("Password").fill(PASSWORD as string);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("logging in shows an account menu with a profile link and lets you log out @smoke", async ({
  page,
}) => {
  await login(page);

  const accountMenu = page.getByRole("button", { name: /Account menu/ });
  await expect(accountMenu).toBeVisible();
  await accountMenu.hover();

  await expect(page.getByText("Headless Test Account")).toBeVisible();
  const profileLink = page.getByRole("link", { name: "Profile" });
  await expect(profileLink).toHaveAttribute("href", /\/members\/\d+$/);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();

  // The check above only proves the *client's* optimistic state updated —
  // reload from scratch to prove the server actually cleared the session
  // cookies, not just that the UI looked logged-out for a moment.
  await page.reload();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Account menu/ })).not.toBeVisible();
});

test("the profile link opens the logged-in user's own profile page @smoke", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: /Account menu/ }).hover();

  const profileLink = page.getByRole("link", { name: "Profile" });
  // Hover-triggered CSS transitions can leave the link technically present
  // but not yet interactable when the click fires — wait for it explicitly
  // rather than racing the transition.
  await expect(profileLink).toBeVisible();
  await profileLink.click();

  await expect(page).toHaveURL(/\/members\/\d+$/);
  await expect(page.getByRole("heading", { name: "Headless Test Account" })).toBeVisible();
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

  await login(page);

  await expect(page.getByRole("heading", { name: "Activity feed" })).toBeVisible();
  await expect(page.getByText(/\d+ updates total/)).toBeVisible();

  await page.getByRole("button", { name: /Account menu/ }).hover();
  const logoutButton = page.getByRole("button", { name: "Log out" });
  await expect(logoutButton).toBeVisible();
  await logoutButton.click();
  expect(consoleErrors).toEqual([]);
});
