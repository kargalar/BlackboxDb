import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export function detectImageMimeType(buffer: Buffer): string {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.subarray(0, 6).toString("ascii").match(/^GIF8[79]a$/)) return "image/gif";
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.subarray(4, 12).toString("ascii").includes("ftypavif")) return "image/avif";
  throw new Error("Only JPEG, PNG, WebP, GIF, and AVIF image files are supported");
}

export function isLocalScreenshotUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("/uploads/screenshots/");
}

export async function saveLocalScreenshot(
  fileInput: string | Buffer,
  contentId?: string | null,
  fileName?: string
): Promise<{ filePath: string; url: string }> {
  let buffer: Buffer;

  if (typeof fileInput === "string") {
    const base64 = fileInput.startsWith("data:")
      ? fileInput.slice(fileInput.indexOf(",") + 1)
      : fileInput;
    buffer = Buffer.from(base64, "base64");
  } else {
    buffer = fileInput;
  }

  if (buffer.length === 0) {
    throw new Error("Uploaded screenshot is empty");
  }
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("Screenshot size exceeds 15 MB limit");
  }

  const mimeType = detectImageMimeType(buffer);
  const ext = CONTENT_TYPE_EXTENSIONS[mimeType] || "jpg";
  const fileId = randomBytes(16).toString("hex");
  const finalFileName = `${fileId}.${ext}`;

  const folder = contentId && contentId.trim() ? contentId.trim() : "temp";
  const targetDir = path.resolve(process.cwd(), "uploads/screenshots", folder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const fullPath = path.join(targetDir, finalFileName);
  fs.writeFileSync(fullPath, buffer);

  const relativeUrl = `/uploads/screenshots/${folder}/${finalFileName}`;
  return { filePath: fullPath, url: relativeUrl };
}

export function moveLocalScreenshotToContentFolder(
  imageUrl: string,
  contentId: string
): string {
  if (!isLocalScreenshotUrl(imageUrl)) {
    return imageUrl;
  }

  const hashIndex = imageUrl.indexOf("#");
  const hash = hashIndex >= 0 ? imageUrl.slice(hashIndex) : "";
  const cleanUrl = hashIndex >= 0 ? imageUrl.slice(0, hashIndex) : imageUrl;

  const segments = cleanUrl.split("/").filter(Boolean);
  // Expected: ['uploads', 'screenshots', folder, filename]
  if (segments.length < 4) return imageUrl;

  const currentFolder = segments[2];
  const fileName = segments[segments.length - 1];

  if (currentFolder === contentId) {
    return imageUrl; // Already in correct folder
  }

  const sourcePath = path.resolve(process.cwd(), "uploads/screenshots", currentFolder, fileName);
  const targetDir = path.resolve(process.cwd(), "uploads/screenshots", contentId);
  const targetPath = path.join(targetDir, fileName);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (fs.existsSync(sourcePath)) {
    try {
      fs.renameSync(sourcePath, targetPath);
    } catch {
      fs.copyFileSync(sourcePath, targetPath);
      fs.unlinkSync(sourcePath);
    }
  }

  return `/uploads/screenshots/${contentId}/${fileName}${hash}`;
}

