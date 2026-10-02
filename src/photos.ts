export const MAX_PHOTO_LENGTH = 180000;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// Photos are re-encoded as JPEG before they enter a workspace or backup.
export function isPhoto(value: unknown): value is string | null | undefined {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" &&
      value.length <= MAX_PHOTO_LENGTH &&
      /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value) &&
      (value.length - "data:image/jpeg;base64,".length) % 4 === 0)
  );
}

export async function preparePhoto(
  file: File,
  kind: "profile" | "goal",
): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG, or WebP photo.");
  if (file.size > MAX_UPLOAD_BYTES)
    throw new Error("This photo is too large. Choose a file up to 5 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "This file could not be opened as a photo. Choose another image.",
    );
  }
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 32000000
    )
      throw new Error("Choose a photo with up to 32 megapixels.");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "Your browser could not prepare the photo. Please try another browser.",
      );
    const longest = Math.max(bitmap.width, bitmap.height);
    let edge = Math.min(longest, kind === "profile" ? 512 : 1200);
    for (let attempt = 0; attempt < 5; attempt++) {
      const ratio = edge / longest;
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.86, 0.72, 0.56]) {
        const photo = canvas.toDataURL("image/jpeg", quality);
        if (isPhoto(photo)) return photo;
      }
      edge = Math.max(64, Math.floor(edge * 0.7));
    }
    throw new Error(
      "This photo could not be made small enough. Try a smaller image.",
    );
  } finally {
    bitmap.close();
  }
}
