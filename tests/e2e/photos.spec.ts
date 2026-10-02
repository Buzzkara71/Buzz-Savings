import { test, expect } from "@playwright/test";
import { photoFile } from "./photo-fixture";

test("custom profile and goal photos can be uploaded, backed up, replaced, cancelled, and removed", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  const file = await photoFile(page);
  await page.getByRole("button", { name: "Open profile", exact: true }).click();
  await page
    .getByLabel("Upload profile photo", { exact: true })
    .setInputFiles(file);
  await expect(page.getByAltText("Profile photo preview")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save settings" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("buzz.dashboard.v1")!).profile.photo,
    ),
  ).toBeUndefined();
  await page.getByRole("button", { name: "Open profile", exact: true }).click();
  await page
    .getByLabel("Upload profile photo", { exact: true })
    .setInputFiles(file);
  await expect(page.getByAltText("Profile photo preview")).toBeVisible();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".header-profile img")).toBeVisible();
  await expect(page.locator(".side-avatar img")).toBeVisible();
  const storedPhoto = await page.evaluate(
    () => JSON.parse(localStorage.getItem("buzz.dashboard.v1")!).profile.photo,
  );
  expect(storedPhoto).toMatch(/^data:image\/jpeg;base64,/);
  expect(storedPhoto.length).toBeLessThanOrEqual(180000);
  expect(
    await page
      .locator(".header-profile img")
      .evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeLessThanOrEqual(512);
  await page.getByRole("button", { name: "Edit goal Trip to Japan" }).click();
  await page
    .getByLabel("Upload goal photo", { exact: true })
    .setInputFiles(file);
  await expect(page.getByAltText("Goal photo preview")).toBeVisible();
  await page.getByRole("button", { name: "Save changes" }).click();
  const cover = page.getByAltText("Trip to Japan cover photo");
  await expect(cover).toBeVisible();
  const backup = await page.evaluate(
    () => localStorage.getItem("buzz.dashboard.v1")!,
  );
  await page.reload();
  await expect(cover).toBeVisible();
  await page.getByRole("button", { name: "Edit goal Trip to Japan" }).click();
  await page.getByRole("radio", { name: "Adventure", exact: true }).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(cover).toHaveCount(0);
  await page.getByRole("button", { name: "Open profile", exact: true }).click();
  await page.getByRole("button", { name: "Remove profile photo" }).click();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.locator(".header-profile img")).toHaveCount(0);
  await page.getByRole("button", { name: "Open profile", exact: true }).click();
  await page
    .getByLabel("Restore JSON backup")
    .setInputFiles({
      name: "photos.json",
      mimeType: "application/json",
      buffer: Buffer.from(backup),
    });
  await page.getByRole("button", { name: "Yes, continue" }).click();
  await expect(page.locator(".header-profile img")).toBeVisible();
  await expect(cover).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open profile", exact: true }).click();
  await page.getByAltText("Profile photo preview").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/custom-profile-mobile.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Edit goal Trip to Japan" }).click();
  await expect(page.getByAltText("Goal photo preview")).toBeVisible();
  await page.getByAltText("Goal photo preview").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/custom-photo-mobile.png",
    animations: "disabled",
  });
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.getByRole("button", { name: "Remove goal photo" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(cover).toHaveCount(0);
});

test("invalid files and browser storage failures keep the current photo and editable draft", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  const file = await photoFile(page);
  await page.getByRole("button", { name: "Open profile", exact: true }).click();
  const input = page.getByLabel("Upload profile photo", { exact: true });
  for (const [candidate, message] of [
    [
      {
        name: "unsafe.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from("<svg/>"),
      },
      "Choose a JPG",
    ],
    [
      {
        name: "large.png",
        mimeType: "image/png",
        buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
      },
      "too large",
    ],
    [
      {
        name: "broken.png",
        mimeType: "image/png",
        buffer: Buffer.from("not a picture"),
      },
      "could not be opened",
    ],
  ] as const) {
    await input.setInputFiles(candidate);
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
      message,
    );
  }
  await input.setInputFiles(file);
  await expect(page.getByAltText("Profile photo preview")).toBeVisible();
  const before = await page.evaluate(() =>
    localStorage.getItem("buzz.dashboard.v1"),
  );
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as any).restorePhotoStorage = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === "buzz.dashboard.v1")
        throw new DOMException("full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Browser storage is full",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("buzz.dashboard.v1")),
  ).toBe(before);
  await expect(page.getByAltText("Profile photo preview")).toBeVisible();
  await page.evaluate(() => (window as any).restorePhotoStorage());
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".header-profile img")).toBeVisible();
});
