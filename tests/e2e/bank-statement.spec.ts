import { test, expect } from "@playwright/test";
import fixture from "../fixtures/bank-statement.json" with { type: "json" };
import { emptyData } from "../../src/domain";
test("statement import previews, preserves manual records, deduplicates, and displays precise balances on mobile", async ({
  page,
}) => {
  await page.goto("/");
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("buzz.dashboard.v1")!),
  );
  const file = {
    name: "bank.statement.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  };
  const open = async () => {
    await page
      .getByRole("button", { name: "Open profile", exact: true })
      .click();
    await page
      .getByLabel("Import bank statement", { exact: true })
      .setInputFiles(file);
  };
  await open();
  await expect(page.getByRole("dialog")).toContainText("5.315,69");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("buzz.dashboard.v1")!).bankStatement,
    ),
  ).toBeUndefined();
  await open();
  await page.getByRole("button", { name: "Yes, continue" }).click();
  await expect(
    page.getByRole("region", { name: "Available balance", exact: true }),
  ).toContainText("5.315,69");
  await page.getByRole("button", { name: "View bank statement" }).click();
  await expect(
    page.getByRole("heading", { name: fixture.account }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Closing balance" }),
  ).toContainText("5.315,69");
  await page.getByLabel("Statement period").selectOption("2026-03");
  await expect(
    page.getByRole("article", { name: "Opening balance" }),
  ).toContainText("5.315,69");
  await expect(
    page.getByText("No transactions match these filters."),
  ).toBeVisible();
  await page.getByLabel("Statement period").selectOption("");
  await page.getByLabel("Needs review only").check();
  await expect(page.locator(".bank-transactions tbody tr")).toHaveCount(1);
  await expect(page.locator(".bank-transactions")).toContainText(
    "Unknown recipient",
  );
  await page.getByLabel("Needs review only").uncheck();
  await open();
  await expect(page.getByRole("dialog")).toContainText("does not duplicate");
  await page.getByRole("button", { name: "Yes, continue" }).click();
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("buzz.dashboard.v1")!),
  );
  expect(after.transactions).toEqual(before.transactions);
  expect(after.goals).toEqual(before.goals);
  expect(after.profile).toEqual(before.profile);
  expect(after.bankStatement.transactions).toHaveLength(8);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Bank statement balance" }),
  ).toContainText("5.315,69");
  await page.getByRole("button", { name: "View bank statement" }).click();
  await page.screenshot({
    path: "test-results/bank-statement-desktop.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/bank-statement-mobile.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Open profile", exact: true }).click();
  await page
    .getByLabel("Import bank statement", { exact: true })
    .setInputFiles({
      ...file,
      buffer: Buffer.from(JSON.stringify({ ...fixture, closingCents: 1 })),
    });
  await expect(page.getByRole("status")).toContainText(
    "reconciled Buzz bank statement",
  );
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("buzz.dashboard.v1")!).bankStatement
          .closingCents,
    ),
  ).toBe(531569);
});

test("imported statement drives the existing dashboard, monthly monitoring and latest replacement", async ({
  page,
}) => {
  const data = {
    ...emptyData("Monitor"),
    budget: 1000,
    bankStatement: fixture,
    transactions: [
      {
        id: "manual-record",
        date: "2026-02-02",
        name: "Older manual amount",
        amount: 999999,
        type: "expense",
        category: "Other",
      },
    ],
  };
  await page.addInitScript((data) => {
    if (!localStorage.getItem("buzz.dashboard.v1"))
      localStorage.setItem("buzz.dashboard.v1", JSON.stringify(data));
  }, data);
  await page.goto("/");
  const balance = page.getByRole("region", {
    name: "Available balance",
    exact: true,
  });
  await expect(balance).toContainText("5.315,69");
  await expect(
    page.getByRole("region", { name: "All-time cash in" }),
  ).toContainText("5.100,55");
  await expect(
    page.getByRole("region", { name: "All-time cash out" }),
  ).toContainText("785,11");
  await expect(
    page.getByRole("region", { name: "All-time expenses" }),
  ).toContainText("275,11");
  await expect(page.locator(".transactions-card")).toContainText(
    "Unknown recipient",
  );
  await expect(
    page.getByText("Older manual amount", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Choose report month")).toHaveValue("2026-03");
  await page.getByLabel("Choose report month").selectOption("2026-02");
  await expect(
    page.getByRole("img", { name: /Weekly cash in and cash out chart/ }),
  ).toHaveAttribute("aria-label", /cash in Rp\s3\.000,00, cash out Rp\s285,00/);
  await expect(page.locator(".budget-strip")).toContainText("275,00");
  await expect(page.locator(".budget-strip")).toContainText("28%");
  await expect(page.locator(".category-card .donut")).toHaveAttribute(
    "aria-label",
    /275,00/,
  );
  await page.getByLabel("Choose report month").selectOption("2026-01");
  await expect(page.locator(".budget-strip")).toContainText("0,11");
  await expect(balance).toContainText("5.315,69");
  await expect(
    page.getByRole("button", { name: "Previous month", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "View bank transactions for February 2026" })
    .click();
  await expect(page.getByLabel("Statement period")).toHaveValue("2026-02");
  await expect(page.locator(".bank-transactions tbody tr")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Manual records", exact: true })
    .click();
  await expect(
    page.getByText("Older manual amount", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Buzz, overview", exact: true })
    .click();
  await expect(balance).toContainText("5.315,69");
  await page.screenshot({
    path: "test-results/bank-dashboard-desktop.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/bank-dashboard-mobile.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole("button", { name: "Open profile", exact: true }).click();
  const latest = {
    ...fixture,
    id: "latest-statement",
    to: "2026-04-01",
    closingCents: 531000,
    transactions: [
      ...fixture.transactions,
      {
        ...fixture.transactions[6],
        id: "r9",
        date: "2026-04-01",
        source: "New bank purchase",
        amountCents: -569,
        balanceCents: 531000,
      },
    ],
  };
  await page
    .getByLabel("Import bank statement", { exact: true })
    .setInputFiles({
      name: "new.statement.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(latest)),
    });
  await page.getByRole("button", { name: "Yes, continue" }).click();
  await expect(balance).toContainText("5.310,00");
  await expect(page.getByLabel("Choose report month")).toHaveValue("2026-04");
  await expect(page.locator(".transactions-card")).toContainText(
    "New bank purchase",
  );
  await expect(page.locator(".budget-strip")).toContainText("5,69");
  await page.reload();
  await expect(balance).toContainText("5.310,00");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("buzz.dashboard.v1")!).transactions,
    ),
  ).toEqual(data.transactions);
  await page.getByRole("button", { name: "Finances", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Bank statement", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
