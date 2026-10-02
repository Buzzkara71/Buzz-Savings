import { test, expect } from "@playwright/test";
import fixture from "../fixtures/bank-statement.json" with { type: "json" };
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
