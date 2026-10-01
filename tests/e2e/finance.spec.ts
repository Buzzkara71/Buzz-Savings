import { test, expect, type Locator } from "@playwright/test";

async function paste(input: Locator, text: string) {
  await input.focus();
  await input.press("ControlOrMeta+A");
  await input.evaluate((element, content) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", content);
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, text);
}

test("amounts format while typing, editing, and pasting, and invalid values cannot be saved", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page
    .getByLabel("Description", { exact: true })
    .fill("Formatted amount");
  const input = page.getByLabel("Amount (IDR)", { exact: true });
  await input.pressSequentially("1250000");
  await expect(input).toHaveValue("1.250.000");
  // Backspace beside a grouping dot removes a digit, not just the dot.
  await input.evaluate((element: HTMLInputElement) =>
    element.setSelectionRange(2, 2),
  );
  await input.press("Backspace");
  await expect(input).toHaveValue("250.000");
  await paste(input, "1.250.000");
  await expect(input).toHaveValue("1.250.000");
  await input.evaluate((element: HTMLInputElement) =>
    element.setSelectionRange(2, 3),
  );
  await input.press("9");
  await expect(input).toHaveValue("1.950.000");
  expect(
    await input.evaluate((element: HTMLInputElement) => element.selectionStart),
  ).toBe(3);
  for (const invalid of ["1.25", "-100", "1,50", "1e5", "1000000000001", "0"]) {
    await paste(input, invalid);
    await page.getByRole("button", { name: "Save transaction" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    expect(
      await input.evaluate((element: HTMLInputElement) =>
        element.checkValidity(),
      ),
    ).toBe(false);
  }
  await paste(input, "1.250.000");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("buzz.dashboard.v1")!).transactions.find(
      (t: { name: string }) => t.name === "Formatted amount",
    ),
  );
  expect(saved.amount).toBe(1250000);
  await page.reload();
  await page
    .getByRole("button", { name: "Edit transaction Formatted amount" })
    .click();
  await expect(input).toHaveValue("1.250.000");
});

test("monthly history opens every transaction, resets filters, and keeps years separate", async ({
  page,
}) => {
  const data = {
    version: 1,
    name: "Friend",
    budget: 4500000,
    demo: false,
    tasks: [],
    goals: [],
    transactions: [
      {
        id: "income",
        name: "January salary",
        type: "income",
        category: "Salary",
        amount: 10000000,
        date: "2025-01-01",
      },
      ...Array.from({ length: 6 }, (_, i) => ({
        id: `expense-${i}`,
        name: `January purchase ${i + 1}`,
        type: "expense",
        category: "Shopping",
        amount: 100000,
        date: `2025-01-${String(i + 2).padStart(2, "0")}`,
      })),
      {
        id: "feb",
        name: "February project",
        type: "income",
        category: "Freelance",
        amount: 2000000,
        date: "2025-02-01",
      },
      {
        id: "old",
        name: "Older salary",
        type: "income",
        category: "Salary",
        amount: 3000000,
        date: "2024-01-01",
      },
    ],
  };
  await page.addInitScript(
    (value) => localStorage.setItem("buzz.dashboard.v1", JSON.stringify(value)),
    data,
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Finances", exact: true }).click();
  await page.getByLabel("Choose report year").selectOption("2025");
  const history = page.locator(".monthly-history");
  await expect(history.locator("tbody tr")).toHaveCount(12);
  await expect(history.locator(".history-totals")).toContainText(
    /Rp\s?12\.000\.000/,
  );
  await expect(history.locator(".history-totals")).toContainText(
    /Rp\s?600\.000/,
  );
  await page
    .getByRole("button", { name: "View transactions for January 2025" })
    .click();
  const ledger = page.locator(".finance-transactions");
  await expect(ledger.locator("tbody tr")).toHaveCount(7);
  await expect(page.locator(".balance-card .stat-value")).toContainText(
    "9.400.000",
  );
  await page.getByLabel("Filter category").selectOption("Shopping");
  await expect(ledger.locator("tbody tr")).toHaveCount(6);
  await page.getByLabel("Filter transaction type").selectOption("Income");
  await expect(page.getByLabel("Filter category")).toHaveValue(
    "All categories",
  );
  await expect(ledger.locator("tbody tr")).toHaveCount(1);
  await expect(ledger).toContainText("January salary");
  await expect(history.locator(".history-totals")).toContainText(
    /Rp\s?12\.000\.000/,
  );
  await page.getByLabel("Filter category").selectOption("Freelance");
  await expect(ledger).toContainText("No transactions match these filters");
  await ledger
    .getByRole("button", { name: "Clear filters", exact: true })
    .first()
    .click();
  await expect(ledger.locator("tbody tr")).toHaveCount(7);
  await page.getByLabel("Filter transaction type").selectOption("Expenses");
  await page
    .getByRole("button", { name: "View transactions for February 2025" })
    .click();
  await expect(page.getByLabel("Filter transaction type")).toHaveValue(
    "All transactions",
  );
  await expect(ledger.locator("tbody tr")).toHaveCount(1);
  await expect(ledger).toContainText("February project");
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue(
    "2025-02-01",
  );
  await page
    .getByLabel("Description", { exact: true })
    .fill("February expense");
  await page.getByLabel("Amount (IDR)", { exact: true }).fill("250000");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(ledger.locator("tbody tr")).toHaveCount(2);
  await expect(page.locator(".balance-card .stat-value")).toContainText(
    "1.750.000",
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("buzz-transactions-2025-02.csv");
  const stream = await download.createReadStream();
  let csv = "";
  for await (const chunk of stream!) csv += chunk.toString();
  expect(csv).toContain('"250000"');
  expect(csv).toContain("February project");
  expect(csv).not.toContain("January salary");
  await page.getByLabel("Choose report year").selectOption("2024");
  await page.getByLabel("Choose report month").selectOption("2024-01");
  await expect(ledger.locator("tbody tr")).toHaveCount(1);
  await expect(ledger).toContainText("Older salary");
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(ledger).toContainText("No transactions in February 2024");
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  await page.getByRole("button", { name: "This month", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "This month", exact: true }),
  ).toHaveCount(0);
});

test("budget, goals, and contributions accept dotted amounts", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await paste(page.getByLabel("Monthly spending budget (IDR)"), "5.500.000");
  await page.getByRole("button", { name: "Save settings" }).click();
  await page
    .getByRole("button", { name: "Savings goals", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create goal", exact: true })
    .first()
    .click();
  await page.getByLabel("Goal name").fill("New equipment");
  await paste(page.getByLabel("Target (IDR)"), "2.000.000");
  await paste(page.getByLabel("Already saved (IDR)"), "100.000");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create goal" })
    .click();
  const goal = page.locator(".goal-card").filter({ hasText: "New equipment" });
  await goal.getByRole("button", { name: "Save", exact: true }).click();
  await paste(page.getByLabel("Add savings (IDR)"), "250.000");
  await page.getByRole("button", { name: "Add savings", exact: true }).click();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("buzz.dashboard.v1")!),
  );
  expect(stored.budget).toBe(5500000);
  expect(
    stored.goals.find((g: { name: string }) => g.name === "New equipment"),
  ).toMatchObject({ target: 2000000, saved: 100000 });
  expect(
    stored.transactions.find((t: { type: string }) => t.type === "savings"),
  ).toMatchObject({ amount: 250000, category: "Savings" });
  await expect(goal.locator(".goal-amount")).toContainText("350.000");
});

test("financial history stays usable on desktop and mobile", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Finances", exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "test-results/finance-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Choose report month")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const history = page.locator(".monthly-history .table-scroll");
  await history.scrollIntoViewIfNeeded();
  expect(
    await history.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await expect(
    history.getByRole("button", { name: /View transactions for January/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/finance-mobile.png",
    fullPage: true,
  });
});
