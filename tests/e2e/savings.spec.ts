import { expect, test, type Page } from "@playwright/test";
import { emptyData, today } from "../../src/domain";

async function seed(page: Page) {
  const data = emptyData("Ari");
  data.goals = [
    {
      id: "travel",
      name: "Travel fund",
      saved: 100000,
      target: 2000000,
      color: "peach",
      cover: "journey",
    },
    {
      id: "home",
      name: "Home fund",
      saved: 0,
      target: 5000000,
      color: "sage",
      cover: "nest",
    },
    {
      id: "tech",
      name: "Studio fund",
      saved: 0,
      target: 3000000,
      color: "lavender",
      cover: "studio",
    },
  ];
  data.transactions = [
    {
      id: "old",
      name: "Earlier salary",
      amount: 2000000,
      type: "income",
      category: "Salary",
      date: "2020-01-01",
    },
    {
      id: "new",
      name: "Current salary",
      amount: 3000000,
      type: "income",
      category: "Salary",
      date: today(),
    },
    {
      id: "expense",
      name: "Groceries",
      amount: 500000,
      type: "expense",
      category: "Shopping",
      date: today(),
    },
  ];
  await page.addInitScript((value) => {
    if (!localStorage.getItem("buzz.dashboard.v1"))
      localStorage.setItem("buzz.dashboard.v1", JSON.stringify(value));
  }, data);
  await page.goto("/");
}

test("savings automatically update goals and all-time cash through create, edit, reassign and delete", async ({
  page,
}) => {
  test.setTimeout(60000);
  await seed(page);
  const balance = page.getByRole("region", { name: "Available balance" });
  await expect(balance).toContainText("4.500.000");
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(balance).toContainText("4.500.000");
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Savings", exact: true })
    .click();
  await page
    .getByLabel("Description", { exact: true })
    .fill("Holiday transfer");
  await page.getByLabel("Amount (IDR)", { exact: true }).fill("300.000");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Savings goal", { exact: true }).selectOption("travel");
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue(today());
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(balance).toContainText("4.200.000");
  await expect(
    page.getByRole("region", { name: "Total savings", exact: true }),
  ).toContainText("400.000");
  await expect(page.locator(".total-held")).toContainText("4.600.000");
  await page
    .getByRole("button", { name: "Savings goals", exact: true })
    .click();
  const travel = page.locator(".goal-card").filter({ hasText: "Travel fund" });
  await expect(travel.locator(".goal-amount")).toContainText("400.000");
  await travel.getByRole("button", { name: "Edit goal Travel fund" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "This goal has savings transfers",
  );
  await expect(page.getByRole("button", { name: "Delete entry" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Finances", exact: true }).click();
  await page.getByLabel("Filter transaction type").selectOption("Savings");
  await expect(page.locator(".finance-transactions tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Edit transaction Holiday transfer" })
    .click();
  await page.getByLabel("Amount (IDR)", { exact: true }).fill("500.000");
  await page.getByLabel("Savings goal", { exact: true }).selectOption("home");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".monthly-history")).toContainText("500.000");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(balance).toContainText("4.000.000");
  await expect(travel.locator(".goal-amount")).toContainText("100.000");
  await expect(
    page
      .locator(".goal-card")
      .filter({ hasText: "Home fund" })
      .locator(".goal-amount"),
  ).toContainText("500.000");
  await page
    .getByRole("button", { name: "Edit transaction Holiday transfer" })
    .click();
  await page.getByRole("button", { name: "Delete entry" }).click();
  await page.getByRole("button", { name: "Yes, continue" }).click();
  await expect(balance).toContainText("4.500.000");
  await expect(
    page.getByRole("region", { name: "Total savings", exact: true }),
  ).toContainText("100.000");
  await page.reload();
  await expect(balance).toContainText("4.500.000");
});

test("profile details and goal artwork persist; carousel and forms fit mobile", async ({
  page,
}) => {
  test.setTimeout(60000);
  await seed(page);
  await page.getByRole("button", { name: "Open profile", exact: true }).click();
  await page.getByLabel("Display name").fill("Buzz");
  await page.getByLabel("Full name", { exact: true }).fill("Buzz Example");
  await page.getByLabel("Occupation", { exact: true }).fill("Designer");
  await page.getByLabel("Location", { exact: true }).fill("Jakarta, Indonesia");
  await page
    .getByLabel("About you", { exact: true })
    .fill("Making room for travel and a calm life.");
  await page.getByRole("radio", { name: "spark", exact: true }).check();
  await page.screenshot({ path: "test-results/profile-desktop.png" });
  await page.getByRole("button", { name: "Save settings" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: /Hey, Buzz/ })).toBeVisible();
  await page.getByRole("button", { name: "Open profile", exact: true }).click();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    "Buzz Example",
  );
  await expect(page.getByLabel("Location", { exact: true })).toHaveValue(
    "Jakarta, Indonesia",
  );
  await expect(
    page.getByRole("radio", { name: "spark", exact: true }),
  ).toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/profile-mobile.png" });
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Edit goal Travel fund" }).click();
  await page.getByRole("radio", { name: "Adventure", exact: true }).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await expect(
    page
      .locator(".goal-card")
      .filter({ hasText: "Travel fund" })
      .locator(".artwork-horizon"),
  ).toHaveCount(1);
  const next = page.getByRole("button", { name: "Next goals", exact: true });
  await next.click();
  await expect(
    page.getByRole("button", { name: "Previous goals", exact: true }),
  ).toBeEnabled();
  const track = page.locator(".goal-carousel");
  await track.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => track.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(300);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/savings-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.screenshot({
    path: "test-results/savings-desktop.png",
    fullPage: true,
  });
});

test("rotating typography can be paused and respects reduced motion", async ({
  page,
}) => {
  await page.clock.install();
  await seed(page);
  await expect(page.locator(".rotating-phrase")).toHaveText(
    "Make space for what matters.",
  );
  await page.clock.fastForward(3000);
  await expect(page.locator(".rotating-phrase")).toHaveText(
    "Small steps. Brighter days.",
  );
  await page.getByRole("button", { name: "Pause animations" }).click();
  await page.clock.fastForward(6000);
  await expect(page.locator(".rotating-phrase")).toHaveText(
    "Small steps. Brighter days.",
  );
  await page.getByRole("button", { name: "Enable animations" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.fastForward(6000);
  await expect(page.locator(".rotating-phrase")).toHaveText(
    "Small steps. Brighter days.",
  );
  await expect(
    page.getByRole("button", {
      name: "Animations follow your device settings",
    }),
  ).toBeDisabled();
});
