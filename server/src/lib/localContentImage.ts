import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { detectImageMimeType } from "./localScreenshot";

export type ContentImageKind =
  | "poster" | "backdrop" | "profile" | "cover" | "screenshot"
  | "person" | "company" | "season" | "episode" | "expansion"
  | "editor-pick" | "game";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const UPLOADS_FOLDER = "content-images";
const CONTENT_IMAGE_HOSTS = new Set([
  "image.tmdb.org",
  "images.igdb.com",
  "books.google.com",
  "books.googleusercontent.com",
  "covers.openlibrary.org",
  "archive.org",
  "res.cloudinary.com",
]);
const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
const CONTENT_IMAGE_KINDS = new Set<ContentImageKind>([
  "poster", "backdrop", "profile", "cover", "screenshot", "person",
  "company", "season", "episode", "expansion", "editor-pick", "game",
]);

interface UploadableFile {
  createReadStream(): NodeJS.ReadableStream;
}

function safeContentId(contentId: string | null | undefined): string {
  const value = contentId?.trim() || "temp";
  if (!/^[a-zA-Z0-9._-]+$/.test(value) || value === "." || value === "..") {
    throw new Error("Invalid content ID for local image storage");
  }
  return value;
}

function safeImageKind(kind: string): ContentImageKind {
  if (!CONTENT_IMAGE_KINDS.has(kind as ContentImageKind)) {
    throw new Error("Invalid local image kind");
  }
  return kind as ContentImageKind;
}

function splitImageHash(value: string): { source: string; hash: string } {
  const hashIndex = value.indexOf("#");
  if (hashIndex < 0) return { source: value, hash: "" };
  return { source: value.slice(0, hashIndex), hash: value.slice(hashIndex) };
}

function getTargetDirectory(contentId: string, kind: ContentImageKind): string {
  return path.resolve(
    process.cwd(),
    "uploads",
    UPLOADS_FOLDER,
    contentId,
    kind,
  );
}

function makeLocalUrl(
  contentId: string,
  kind: ContentImageKind,
  filename: string,
): string {
  return `/uploads/${UPLOADS_FOLDER}/${encodeURIComponent(contentId)}/${kind}/${filename}`;
}

async function readUpload(
  fileInput: string | Buffer | UploadableFile,
): Promise<Buffer> {
  if (Buffer.isBuffer(fileInput)) return fileInput;

  if (typeof fileInput === "string") {
    const base64 = fileInput.startsWith("data:")
      ? fileInput.slice(fileInput.indexOf(",") + 1)
      : fileInput;
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length > MAX_FILE_SIZE)
      throw new Error("Content image exceeds 15 MB limit");
    return buffer;
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of fileInput.createReadStream()) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_FILE_SIZE)
      throw new Error("Content image exceeds 15 MB limit");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function writeLocalContentImage(
  buffer: Buffer,
  contentId: string,
  kind: ContentImageKind,
  hash = "",
): { filePath: string; url: string } {
  if (buffer.length === 0) throw new Error("Content image is empty");
  if (buffer.length > MAX_FILE_SIZE)
    throw new Error("Content image exceeds 15 MB limit");

  const mimeType = detectImageMimeType(buffer);
  const extension = CONTENT_TYPE_EXTENSIONS[mimeType];
  const filename = `${randomBytes(16).toString("hex")}.${extension}`;
  const directory = getTargetDirectory(contentId, kind);
  fs.mkdirSync(directory, { recursive: true });

  const filePath = path.join(directory, filename);
  fs.writeFileSync(filePath, buffer, { flag: "wx" });
  return { filePath, url: `${makeLocalUrl(contentId, kind, filename)}${hash}` };
}

export function isLocalContentImageUrl(
  url: string | null | undefined,
): boolean {
  return Boolean(url?.startsWith(`/uploads/${UPLOADS_FOLDER}/`));
}

export async function saveLocalContentImage(
  fileInput: string | Buffer | UploadableFile,
  contentId: string | null | undefined,
  kind: ContentImageKind,
): Promise<{ filePath: string; url: string }> {
  const id = safeContentId(contentId);
  const { source, hash } =
    typeof fileInput === "string"
      ? splitImageHash(fileInput)
      : { source: fileInput, hash: "" };
  return writeLocalContentImage(await readUpload(source), id, kind, hash);
}

function isAllowedRemoteHost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  if (
    CONTENT_IMAGE_HOSTS.has(normalizedHost) ||
    normalizedHost.endsWith(".archive.org")
  ) {
    return true;
  }

  return false;
}

async function fetchAllowedImage(
  url: URL,
  redirectsRemaining = 5,
): Promise<Response> {
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !isAllowedRemoteHost(url.hostname)
  ) {
    throw new Error(
      `Content image host is not allowed for local import: ${url.hostname}`,
    );
  }

  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status < 300 || response.status >= 400) return response;
  if (redirectsRemaining === 0) {
    throw new Error("Content image exceeded the redirect limit");
  }

  const location = response.headers.get("location");
  if (!location)
    throw new Error("Content image redirect is missing a destination");
  const redirectUrl = new URL(location, url);
  await response.body?.cancel();
  return fetchAllowedImage(redirectUrl, redirectsRemaining - 1);
}

function getLocalImageParts(url: string): {
  contentId: string;
  kind: ContentImageKind;
  filename: string;
  hash: string;
} | null {
  const { source, hash } = splitImageHash(url);
  const segments = source.split("/").filter(Boolean).map(decodeURIComponent);
  if (
    segments.length !== 5 ||
    segments[0] !== "uploads" ||
    segments[1] !== UPLOADS_FOLDER ||
    !CONTENT_IMAGE_KINDS.has(segments[3] as ContentImageKind)
  ) {
    return null;
  }

  return {
    contentId: safeContentId(segments[2]),
    kind: safeImageKind(segments[3]),
    filename: path.basename(segments[4]),
    hash,
  };
}

export function moveLocalContentImageToContentFolder(
  url: string,
  contentId: string,
  kind: ContentImageKind,
): string {
  const parts = getLocalImageParts(url);
  if (!parts || parts.kind !== kind) return url;

  const destinationId = safeContentId(contentId);
  if (parts.contentId === destinationId) return url;

  const sourceRoot = path.resolve(process.cwd(), "uploads", UPLOADS_FOLDER);
  const sourcePath = path.resolve(
    sourceRoot,
    parts.contentId,
    kind,
    parts.filename,
  );
  const targetDirectory = getTargetDirectory(destinationId, kind);
  const targetPath = path.join(targetDirectory, parts.filename);
  if (!sourcePath.startsWith(`${sourceRoot}${path.sep}`)) {
    throw new Error("Invalid local content image path");
  }
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Local content image is missing: ${url}`);
  }

  fs.mkdirSync(targetDirectory, { recursive: true });
  if (fs.existsSync(targetPath)) {
    return `${makeLocalUrl(destinationId, kind, parts.filename)}${parts.hash}`;
  }

  try {
    fs.renameSync(sourcePath, targetPath);
  } catch {
    fs.copyFileSync(sourcePath, targetPath, fs.constants.COPYFILE_EXCL);
    fs.unlinkSync(sourcePath);
  }

  return `${makeLocalUrl(destinationId, kind, parts.filename)}${parts.hash}`;
}

export async function localizeContentImage(
  imageUrl: string,
  contentId: string,
  kind: ContentImageKind,
): Promise<string> {
  const { source, hash } = splitImageHash(imageUrl);
  if (source.startsWith("data:image/")) {
    return (await saveLocalContentImage(imageUrl, contentId, kind)).url;
  }
  if (isLocalContentImageUrl(source)) {
    return moveLocalContentImageToContentFolder(source + hash, contentId, kind);
  }

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    throw new Error(`Unsupported content image URL: ${imageUrl}`);
  }
  const response = await fetchAllowedImage(sourceUrl);
  if (!response.ok) {
    throw new Error(`Could not download content image (${response.status})`);
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_FILE_SIZE) {
    throw new Error("Content image exceeds 15 MB limit");
  }

  return writeLocalContentImage(
    Buffer.from(await response.arrayBuffer()),
    safeContentId(contentId),
    kind,
    hash,
  ).url;
}
