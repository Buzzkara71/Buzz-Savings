import { test, expect } from "@playwright/test";

test("dashboard renders without errors and adapts to mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Hey, Friend/ }),
  ).toBeVisible();
  await expect(page.locator(".balance-card .stat-value")).toContainText(
    "9.405.000",
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Open navigation", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page.getByRole("button", { name: "Tasks", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Make room for focus." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("task creation, completion, edit, deletion, and persistence", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tasks", exact: true }).click();
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page.getByLabel("Task name").fill("Test personal plan");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add task" })
    .click();
  await expect(
    page.getByText("Test personal plan", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Mark Test personal plan complete" })
    .click();
  await page.reload();
  await page.getByRole("button", { name: "Tasks", exact: true }).click();
  await expect(
    page.getByRole("checkbox", {
      name: "Mark Test personal plan incomplete",
    }),
  ).toHaveAttribute("aria-checked", "true");
  await page
    .getByRole("button", { name: "Edit Test personal plan", exact: true })
    .click();
  await page.getByLabel("Task name").fill("Updated plan");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Updated plan", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Board view" }).click();
  await page.getByText("Updated plan", { exact: true }).click();
  await page.getByRole("button", { name: "Delete entry" }).click();
  await page.getByRole("button", { name: "Yes, continue" }).click();
  await expect(page.getByText("Updated plan", { exact: true })).toHaveCount(0);
});

test("financial totals update for create, edit, filter, and delete", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page.getByLabel("Description", { exact: true }).fill("Test expense");
  await page.getByLabel("Amount (IDR)", { exact: true }).fill("100000");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.locator(".balance-card .stat-value")).toContainText(
    "9.305.000",
  );
  await page.getByRole("button", { name: "Finances", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit transaction Test expense" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Income", exact: true })
    .click();
  await page.getByLabel("Amount (IDR)", { exact: true }).fill("200000");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".balance-card .stat-value")).toContainText(
    "5.855.000",
  );
  await page.getByLabel("Filter transaction type").selectOption("Expenses");
  await expect(page.getByText("Test expense", { exact: true })).toHaveCount(0);
  await page.getByLabel("Filter transaction type").selectOption("Income");
  await expect(page.getByText("Test expense", { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(
    /buzz-transactions-.*\.csv/,
  );
  await page
    .getByRole("button", { name: "Edit transaction Test expense" })
    .click();
  await page.getByRole("button", { name: "Delete entry" }).click();
  await page.getByRole("button", { name: "Yes, continue" }).click();
  await expect(page.locator(".balance-card .stat-value")).toContainText(
    "5.655.000",
  );
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.locator(".balance-card .stat-value")).toContainText("Rp");
  await expect(page.locator(".balance-card .stat-value")).not.toContainText(
    "5.655.000",
  );
});

test("goals, backup restoration, empty state, and search work", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Savings goals", exact: true })
    .click();
  const goal = page.locator(".goal-card").filter({ hasText: "Trip to Japan" });
  await goal.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByLabel("Add savings (IDR)").fill("750000");
  await page.getByRole("button", { name: "Add savings", exact: true }).click();
  await expect(goal.locator(".goal-amount")).toContainText("7.000.000");
  const stored = await page.evaluate(() =>
    localStorage.getItem("buzz.dashboard.v1"),
  );
  await page.getByLabel("Search tasks or transactions").fill("proposal");
  await expect(
    page.getByText("Finish the project proposal", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Start fresh" })
    .click();
  await page.getByRole("button", { name: "Yes, continue" }).click();
  await expect(page.locator(".goal-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Restore JSON backup").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(stored!),
  });
  await page.getByRole("button", { name: "Yes, continue" }).click();
  await expect(goal.locator(".goal-amount")).toContainText("7.000.000");
  await page.reload();
  await page
    .getByRole("button", { name: "Savings goals", exact: true })
    .click();
  await expect(goal.locator(".goal-amount")).toContainText("7.000.000");
});

test("invalid backup is rejected without replacing existing data", async ({
  page,
}) => {
  await page.goto("/");
  const before = await page.evaluate(() =>
    localStorage.getItem("buzz.dashboard.v1"),
  );
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Restore JSON backup").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1,"transactions":[]}'),
  });
  await expect(page.getByRole("status")).toContainText("Invalid backup");
  expect(
    await page.evaluate(() => localStorage.getItem("buzz.dashboard.v1")),
  ).toBe(before);
});

test("legacy browser data and backups migrate into Buzz without losing records", async ({
  page,
}) => {
  const legacy = {
    version: 1,
    name: "Teman",
    budget: 4500000,
    demo: true,
    tasks: [
      {
        id: "original-task",
        title: "Selesaikan proposal proyek",
        category: "Pekerjaan",
        priority: "Tinggi",
        due: "2026-10-01",
        done: true,
      },
    ],
    transactions: [
      {
        id: "original-transaction",
        name: "Kopi & cerita sore",
        category: "Makan & minum",
        type: "expense",
        amount: 45000,
        date: "2026-10-01",
      },
    ],
    goals: [
      {
        id: "original-goal",
        name: "Liburan ke Jepang",
        saved: 6250000,
        target: 15000000,
        color: "peach",
      },
    ],
  };
  await page.addInitScript((data) => {
    if (!localStorage.getItem("ruang.dashboard.v1")) {
      localStorage.setItem("ruang.dashboard.v1", JSON.stringify(data));
      localStorage.setItem("ruang.motion.paused", "true");
    }
  }, legacy);
  await page.goto("/");
  await expect(page).toHaveTitle("Buzz — Small plans. Big possibilities.");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("button", { name: "Buzz, overview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Hey, Friend/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enable animations" }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("buzz.dashboard.v1")!),
  );
  expect(saved.tasks[0]).toMatchObject({
    id: "original-task",
    title: "Finish the project proposal",
    category: "Work",
    priority: "High",
    done: true,
  });
  expect(saved.transactions[0]).toMatchObject({
    id: "original-transaction",
    name: "Afternoon coffee",
    category: "Food & drinks",
    amount: 45000,
  });
  expect(saved.goals[0]).toMatchObject({
    id: "original-goal",
    name: "Trip to Japan",
    saved: 6250000,
  });
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("ruang.dashboard.v1")!),
    ),
  ).toEqual(legacy);
  await page.reload();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("buzz.dashboard.v1")!),
    ),
  ).toEqual(saved);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Restore JSON backup").setInputFiles({
    name: "old-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await expect(page.getByRole("dialog")).toContainText(
    "Tasks: 1. Transactions: 1. Goals: 1.",
  );
  await page.getByRole("button", { name: "Yes, continue" }).click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("buzz.dashboard.v1")!),
    ),
  ).toEqual(saved);
});
