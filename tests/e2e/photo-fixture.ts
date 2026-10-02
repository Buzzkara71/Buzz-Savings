import type { Page } from "@playwright/test";

export async function photoFile(page: Page) {
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1600;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 2400, 1600);
    gradient.addColorStop(0, "#164e63");
    gradient.addColorStop(1, "#22d3ee");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2400, 1600);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(700, 300, 1000, 1000);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  return {
    name: "my-photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  };
}
