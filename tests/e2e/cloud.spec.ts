import { test, expect, type Page } from "@playwright/test";
import { emptyData, today, type AppData } from "../../src/domain";

type Snapshot = { data: AppData; revision: number; updatedAt: string };
type Backend = {
  accounts: Record<string, Snapshot>;
  failRead: boolean;
  failWrite: boolean;
  writes: number;
};
const alice = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const bob = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const backend = (): Backend => ({
  accounts: {},
  failRead: false,
  failWrite: false,
  writes: 0,
});
function session(id: string, email: string) {
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, exp: expires, role: "authenticated" })).toString("base64url")}.signature`;
  return {
    access_token: token,
    refresh_token: `refresh-${id}`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expires,
    user: {
      id,
      email,
      aud: "authenticated",
      role: "authenticated",
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: "2026-01-01T00:00:00Z",
    },
  };
}
async function mockCloud(page: Page, server: Backend) {
  await page.route("https://buzz-test.supabase.co/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path.endsWith("/token")) {
      const email = req.postDataJSON().email;
      return json(session(email === "bob@example.com" ? bob : alice, email));
    }
    if (path.endsWith("/logout")) return json({});
    if (path.endsWith("/signup"))
      return json({ id: alice, email: "alice@example.com", identities: [] });
    if (path.endsWith("/recover")) return json({});
    const token = req.headers().authorization?.replace("Bearer ", "");
    let userId = "";
    try {
      userId = JSON.parse(
        Buffer.from(token!.split(".")[1], "base64url").toString(),
      ).sub;
    } catch {
      /* Anonymous requests remain denied. */
    }
    if (![alice, bob].includes(userId))
      return json({ code: "42501", message: "Sign in required" }, 401);
    if (path.endsWith("/user"))
      return json(
        session(
          userId,
          userId === bob ? "bob@example.com" : "alice@example.com",
        ).user,
      );
    const current = (server.accounts[userId] ??= {
      data: emptyData(),
      revision: 0,
      updatedAt: new Date().toISOString(),
    });
    if (path.endsWith("/buzz_read_workspace")) {
      if (server.failRead)
        return json({ code: "PGRST202", message: "Function missing" }, 404);
      return json(current);
    }
    if (path.endsWith("/buzz_save_workspace")) {
      if (server.failWrite) return route.abort("internetdisconnected");
      const body = req.postDataJSON();
      if (body.p_expected_revision !== current.revision)
        return json({ code: "40001", message: "Conflict" }, 409);
      current.data = body.p_data;
      current.revision++;
      current.updatedAt = new Date().toISOString();
      server.writes++;
      return json(current);
    }
    return json({ message: "Unexpected request" }, 404);
  });
}
async function signIn(page: Page, email = "alice@example.com") {
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("test-password-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("login, signup guidance, and recovery email forms work on desktop and mobile", async ({
  page,
}) => {
  const server = backend();
  await mockCloud(page, server);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your space, everywhere." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/cloud-login-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/cloud-login-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Email address").fill("alice@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password-only");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Check your inbox");
  expect(server.writes).toBe(0);
  await page.getByRole("button", { name: "Back to sign in" }).click();
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("password reset link");
  await page.getByRole("button", { name: "Back to sign in" }).click();
  await signIn(page);
  await expect(page.locator(".cloud-bar")).toContainText("alice@example.com");
  await expect(page.locator(".balance-card .stat-value")).toContainText("Rp 0");
});

test("cloud saves are visible on another device and survive a reload", async ({
  page,
  browser,
}) => {
  const server = backend();
  await mockCloud(page, server);
  await page.goto("/");
  await signIn(page);
  await expect(page.locator(".cloud-bar")).toContainText("Cloud connected");
  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await mockCloud(other, server);
  await other.goto("http://127.0.0.1:5175/");
  await signIn(other);
  await expect(other.locator(".cloud-bar")).toContainText("Cloud connected");
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page.getByLabel("Description", { exact: true }).fill("Synced coffee");
  await page.getByLabel("Amount (IDR)", { exact: true }).fill("25000");
  await page
    .getByRole("button", { name: "Save transaction", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(server.accounts[alice].data.transactions[0].amount).toBe(25000);
  await other.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(other.getByText("Synced coffee", { exact: true })).toBeVisible();
  await other.reload();
  await expect(other.getByText("Synced coffee", { exact: true })).toBeVisible();
  expect(
    await other.evaluate(() => localStorage.getItem("buzz.dashboard.v1")),
  ).toBeNull();
  await otherContext.close();
});

test("a failed save keeps the form and draft, then a retry saves exactly once", async ({
  page,
}) => {
  const server = backend();
  await mockCloud(page, server);
  await page.goto("/");
  await signIn(page);
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page.getByLabel("Description", { exact: true }).fill("Offline entry");
  await page.getByLabel("Amount (IDR)", { exact: true }).fill("1250000");
  server.failWrite = true;
  await page
    .getByRole("button", { name: "Save transaction", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Amount (IDR)", { exact: true })).toHaveValue(
    "1.250.000",
  );
  expect(server.writes).toBe(0);
  expect(server.accounts[alice].data.transactions).toHaveLength(0);
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Download draft" })
    .click();
  expect((await downloaded).suggestedFilename()).toMatch(/buzz-unsynced/);
  server.failWrite = false;
  await page
    .getByRole("button", { name: "Save transaction", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(server.writes).toBe(1);
  expect(server.accounts[alice].data.transactions).toHaveLength(1);
});

test("conflicts preserve newer remote records and require an explicit reload", async ({
  page,
}) => {
  const server = backend();
  await mockCloud(page, server);
  await page.goto("/");
  await signIn(page);
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page.getByLabel("Description", { exact: true }).fill("Stale draft");
  await page.getByLabel("Amount (IDR)", { exact: true }).fill("100000");
  server.accounts[alice].data.name = "Updated elsewhere";
  server.accounts[alice].revision++;
  await page
    .getByRole("button", { name: "Save transaction", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Another device",
  );
  expect(server.accounts[alice].data.transactions).toHaveLength(0);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reload latest" })
    .click();
  await page.getByRole("button", { name: "Yes, continue" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /Hey, Updated elsewhere/ }),
  ).toBeVisible();
  expect(server.writes).toBe(0);
});

test("imports are repeatable and switching accounts never shows another user's records", async ({
  page,
}) => {
  const server = backend();
  await mockCloud(page, server);
  await page.addInitScript(
    (data) => localStorage.setItem("buzz.dashboard.v1", JSON.stringify(data)),
    {
      ...emptyData(),
      tasks: [
        {
          id: "local-task",
          title: "Private browser task",
          category: "Personal",
          priority: "High",
          due: "2026-10-01",
          done: false,
        },
      ],
    },
  );
  await page.goto("/");
  await signIn(page);
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Import browser data" }).click();
    await page.getByRole("button", { name: "Yes, continue" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  expect(server.accounts[alice].data.tasks).toHaveLength(1);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your space, everywhere." }),
  ).toBeVisible();
  await expect(
    page.getByText("Private browser task", { exact: true }),
  ).toHaveCount(0);
  await signIn(page, "bob@example.com");
  await expect(page.locator(".cloud-bar")).toContainText("bob@example.com");
  await expect(
    page.getByText("Private browser task", { exact: true }),
  ).toHaveCount(0);
  expect(server.accounts[bob].data.tasks).toHaveLength(0);
  expect(server.accounts[alice].data.tasks).toHaveLength(1);
});

test("database setup failures do not replace cloud data with empty or local data", async ({
  page,
}) => {
  const server = backend();
  server.failRead = true;
  await mockCloud(page, server);
  await page.goto("/");
  await signIn(page);
  await expect(page.getByRole("alert")).toContainText(
    "Cloud storage is not ready",
  );
  expect(server.writes).toBe(0);
  await expect(
    page.getByRole("button", { name: "Add transaction", exact: true }),
  ).toHaveCount(0);
  server.failRead = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".cloud-bar")).toContainText("Cloud connected");
  expect(server.writes).toBe(0);
});

test("a refresh arriving after a form opens cannot advance that form's revision", async ({
  page,
}) => {
  const server = backend();
  server.accounts[alice] = {
    revision: 0,
    updatedAt: new Date().toISOString(),
    data: {
      ...emptyData(),
      transactions: [
        {
          id: "shared",
          name: "Shared entry",
          amount: 10000,
          type: "expense",
          category: "Other",
          date: today(),
        },
      ],
    },
  };
  await mockCloud(page, server);
  await page.goto("/");
  await signIn(page);
  await expect(page.locator(".cloud-bar")).toContainText("Cloud connected");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/rest/v1/rpc/buzz_read_workspace", async (route) => {
    await gate;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(server.accounts[alice]),
    });
  });
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit transaction Shared entry" })
    .click();
  await page.getByLabel("Description", { exact: true }).fill("Edited locally");
  server.accounts[alice].data.transactions[0].name = "From another device";
  server.accounts[alice].revision = 1;
  release();
  await expect(page.locator(".cloud-bar")).toContainText("Cloud connected");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Another device",
  );
  expect(server.accounts[alice].data.transactions[0].name).toBe(
    "From another device",
  );
  expect(server.writes).toBe(0);
});

test("cloud tasks, savings, and settings wait for confirmation and restore together", async ({
  page,
}) => {
  const server = backend();
  await mockCloud(page, server);
  await page.goto("/");
  await signIn(page);
  await page.getByRole("button", { name: "Tasks", exact: true }).click();
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page.getByLabel("Task name").fill("Cloud task");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add task", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Mark Cloud task complete" })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Mark Cloud task incomplete" }),
  ).toHaveAttribute("aria-checked", "true");
  await page
    .getByRole("button", { name: "Savings goals", exact: true })
    .click();
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  await page.getByLabel("Goal name").fill("Cloud goal");
  await page.getByLabel("Target (IDR)").fill("1000000");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create goal", exact: true })
    .click();
  const goal = page.locator(".goal-card").filter({ hasText: "Cloud goal" });
  await goal.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByLabel("Add savings (IDR)").fill("250000");
  await page.getByRole("button", { name: "Add savings", exact: true }).click();
  await expect(goal.locator(".goal-amount")).toContainText("250.000");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Display name").fill("Cloud name");
  await page.getByLabel("Monthly spending budget (IDR)").fill("5000000");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const saved = structuredClone(server.accounts[alice].data);
  expect(saved.tasks[0].done).toBe(true);
  expect(saved.goals[0].saved).toBe(250000);
  expect(saved.budget).toBe(5000000);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await page.getByRole("button", { name: "Yes, continue" }).click();
  await expect(page.locator(".goal-card")).toHaveCount(0);
  expect(server.accounts[alice].data.tasks).toHaveLength(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByLabel("Restore JSON backup")
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(saved)),
    });
  await page.getByRole("button", { name: "Yes, continue" }).click();
  await expect(goal.locator(".goal-amount")).toContainText("250.000");
  expect(server.accounts[alice].data).toEqual(saved);
});
