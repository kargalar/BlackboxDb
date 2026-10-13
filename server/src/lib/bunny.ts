import { randomBytes } from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_STORAGE_ENDPOINT = "storage.bunnycdn.com";
const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export const UPLOAD_PRESETS = {
  profile: { folder: "blackbox/profiles" },
  poster: { folder: "blackbox/posters" },
  backdrop: { folder: "blackbox/backdrops" },
  screenshot: { folder: "blackbox/screenshots" },
  person: { folder: "blackbox/persons" },
  company: { folder: "blackbox/companies" },
  seasonPoster: { folder: "blackbox/seasons" },
  episodeStill: { folder: "blackbox/episodes" },
  expansion: { folder: "blackbox/expansions" },
  covers: { folder: "blackbox/covers" },
} as const;

export type UploadPreset = keyof typeof UPLOAD_PRESETS;

export interface UploadResult {
  path: string;
  url: string;
}

interface FileData {
  buffer: Buffer;
  contentType: string;
}

interface UploadableFile {
  mimetype: string;
  createReadStream(): NodeJS.ReadableStream;
}

function getBunnyConfig() {
  const storageZone = process.env.BUNNY_STORAGE_ZONE?.trim();
  const storagePassword = process.env.BUNNY_STORAGE_PASSWORD?.trim();
  const cdnUrl = process.env.BUNNY_CDN_URL?.trim().replace(/\/+$/, "");
  const endpoint = (process.env.BUNNY_STORAGE_ENDPOINT || DEFAULT_STORAGE_ENDPOINT)
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  if (!storageZone || !storagePassword || !cdnUrl) {
    throw new Error(
      "Bunny Storage is not configured. Set BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD, and BUNNY_CDN_URL.",
    );
  }

  return { storageZone, storagePassword, cdnUrl, endpoint };
}

function getStorageFileUrl(path: string): string {
  const { storageZone, endpoint } = getBunnyConfig();
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://${endpoint}/${encodeURIComponent(storageZone)}/${encodedPath}`;
}

function normalizePath(path: string): string {
  const segments = path
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);

  if (
    segments.length === 0 ||
    segments.some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error("Invalid Bunny Storage path");
  }

  return segments.join("/");
}

function contentTypeForPresetFile(file: string | Buffer | UploadableFile): string {
  if (Buffer.isBuffer(file)) {
    if (file.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
    if (file.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return "image/png";
    }
    if (file.subarray(0, 6).toString("ascii").match(/^GIF8[79]a$/)) return "image/gif";
    if (
      file.subarray(0, 4).toString("ascii") === "RIFF" &&
      file.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
      return "image/webp";
    }
    if (file.subarray(4, 12).toString("ascii").includes("ftypavif")) return "image/avif";
    throw new Error("Only JPEG, PNG, WebP, GIF, and AVIF image files are supported");
  }

  const suppliedType =
    typeof file === "object" && !Buffer.isBuffer(file) && typeof file.mimetype === "string"
      ? file.mimetype.toLowerCase().split(";")[0].trim()
      : undefined;
  if (suppliedType && CONTENT_TYPE_EXTENSIONS[suppliedType]) return suppliedType;

  if (typeof file === "string") {
    const match = file.match(/^data:(image\/[a-z0-9.+-]+);base64,/i);
    const dataUriType = match?.[1].toLowerCase();
    if (dataUriType && CONTENT_TYPE_EXTENSIONS[dataUriType]) return dataUriType;
  }

  throw new Error("Only JPEG, PNG, WebP, GIF, and AVIF image files are supported");
}

async function readFile(file: string | Buffer | UploadableFile): Promise<FileData> {
  const contentType = contentTypeForPresetFile(file);
  let buffer: Buffer;

  if (typeof file === "string") {
    const base64 = file.startsWith("data:") ? file.slice(file.indexOf(",") + 1) : file;
    buffer = Buffer.from(base64, "base64");
  } else if (Buffer.isBuffer(file)) {
    buffer = file;
  } else if (file && typeof file.createReadStream === "function") {
    const chunks: Buffer[] = [];
    const stream = file.createReadStream();
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    buffer = Buffer.concat(chunks);
  } else {
    throw new Error("Invalid image input");
  }

  if (buffer.length === 0) throw new Error("The uploaded image is empty");
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("Dosya boyutu 10 MB'den küçük olmalıdır");
  }

  return { buffer, contentType };
}

async function uploadBuffer(
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<UploadResult> {
  const safePath = normalizePath(path);
  const { storagePassword, cdnUrl } = getBunnyConfig();
  const response = await fetch(getStorageFileUrl(safePath), {
    method: "PUT",
    headers: {
      AccessKey: storagePassword,
      "Content-Type": contentType,
    },
    body: buffer,
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Bunny Storage upload failed (${response.status}): ${details}`);
  }

  return {
    path: safePath,
    url: `${cdnUrl}/${safePath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")}`,
  };
}

export function generateUniqueFileId(): string {
  return randomBytes(16).toString("hex");
}

export async function uploadToBunny(
  file: string | Buffer | UploadableFile,
  preset: UploadPreset,
  fileId?: string,
  subFolder?: string,
): Promise<UploadResult> {
  if (!Object.hasOwn(UPLOAD_PRESETS, preset)) {
    throw new Error("Unsupported Bunny image upload type");
  }

  const { buffer, contentType } = await readFile(file);
  const extension = CONTENT_TYPE_EXTENSIONS[contentType];
  const path = [
    UPLOAD_PRESETS[preset].folder,
    subFolder,
    `${fileId || generateUniqueFileId()}.${extension}`,
  ]
    .filter(Boolean)
    .join("/");

  return uploadBuffer(path, buffer, contentType);
}

export function isBunnyUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const { cdnUrl } = getBunnyConfig();
    const configured = new URL(cdnUrl);
    const candidate = new URL(url);
    return candidate.protocol === "https:" && candidate.host === configured.host;
  } catch {
    return false;
  }
}

function getBunnyPath(url: string): string | null {
  if (!isBunnyUrl(url)) return null;
  const { cdnUrl } = getBunnyConfig();
  const pathname = new URL(url).pathname;
  const basePath = new URL(cdnUrl).pathname.replace(/\/+$/, "");
  const relativePath = pathname.slice(basePath.length).replace(/^\/+/, "");
  try {
    return normalizePath(relativePath.split("/").map(decodeURIComponent).join("/"));
  } catch {
    return null;
  }
}

export async function deleteBunnyFile(url: string): Promise<void> {
  const path = getBunnyPath(url);
  if (!path) return;

  const { storagePassword } = getBunnyConfig();
  const response = await fetch(getStorageFileUrl(path), {
    method: "DELETE",
    headers: { AccessKey: storagePassword },
  });

  if (!response.ok && response.status !== 404) {
    const details = await response.text().catch(() => "");
    throw new Error(`Bunny Storage deletion failed (${response.status}): ${details}`);
  }
}

export function isBase64Image(value: string | undefined | null): boolean {
  return Boolean(value?.startsWith("data:image/"));
}

export async function uploadImageIfBase64(
  imageUrl: string | undefined | null,
  preset: UploadPreset,
): Promise<string | undefined> {
  if (!imageUrl) return undefined;
  if (!isBase64Image(imageUrl)) return imageUrl;
  return (await uploadToBunny(imageUrl, preset)).url;
}

export async function moveImageToContentFolder(
  imageUrl: string,
  baseFolder: string,
  contentId: string,
  preserveSource = false,
): Promise<string> {
  const sourcePath = getBunnyPath(imageUrl);
  if (!sourcePath) return imageUrl;

  const fileName = sourcePath.split("/").pop();
  if (!fileName) return imageUrl;
  const targetPath = normalizePath(`${baseFolder}/${contentId}/${fileName}`);
  if (sourcePath === targetPath) return imageUrl;

  const sourceUrl = new URL(imageUrl);
  sourceUrl.search = "";
  sourceUrl.hash = "";
  const sourceResponse = await fetch(sourceUrl);
  if (!sourceResponse.ok) {
    throw new Error(`Could not read Bunny image before moving it (${sourceResponse.status})`);
  }

  const contentType = sourceResponse.headers.get("content-type")?.split(";")[0];
  if (!contentType || !CONTENT_TYPE_EXTENSIONS[contentType]) {
    throw new Error("Bunny image has an unsupported content type");
  }

  const uploaded = await uploadBuffer(
    targetPath,
    Buffer.from(await sourceResponse.arrayBuffer()),
    contentType,
  );
  if (!preserveSource) await deleteBunnyFile(imageUrl);
  return uploaded.url;
}

async function storageFileExists(path: string): Promise<boolean> {
  const { storagePassword } = getBunnyConfig();
  // The Storage API supports GET; HEAD can return 401 with valid credentials.
  const response = await fetch(getStorageFileUrl(path), {
    method: "GET",
    headers: { AccessKey: storagePassword },
  });
  // Only inspect the status. Do not download the image for an existence check.
  await response.body?.cancel();
  if (response.status === 404) return false;
  if (!response.ok) {
    throw new Error(`Could not check Bunny image before resolving it (${response.status})`);
  }
  return true;
}

export async function getContentFolderImageUrlIfPresent(
  imageUrl: string,
  baseFolder: string,
  contentId: string,
): Promise<string | null> {
  const sourcePath = getBunnyPath(imageUrl);
  if (!sourcePath) return null;

  const normalizedBaseFolder = normalizePath(baseFolder);
  if (!sourcePath.startsWith(`${normalizedBaseFolder}/`)) return null;

  const fileName = sourcePath.split("/").pop();
  if (!fileName) return null;

  const targetPath = normalizePath(`${normalizedBaseFolder}/${contentId}/${fileName}`);
  if (sourcePath === targetPath) return imageUrl;

  const { cdnUrl } = getBunnyConfig();
  // Earlier failed transactions may have copied a file before rolling back its DB URL.
  if (!await storageFileExists(targetPath)) {
    if (!await storageFileExists(sourcePath)) {
      throw new Error("Bunny image is missing from both its original and content folders");
    }
    return null;
  }

  return `${cdnUrl}/${targetPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}
