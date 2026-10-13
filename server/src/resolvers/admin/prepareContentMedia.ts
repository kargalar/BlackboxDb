import type { PrismaClient } from "@prisma/client";
import type { CreateContentInput, UpdateContentInput } from "../../types/admin";
import { getImageSource } from "../../lib/imageFocus";
import {
  getContentFolderImageUrlIfPresent,
  isBase64Image,
  moveImageToContentFolder,
  uploadToBunny,
  UPLOAD_PRESETS,
  type UploadPreset,
} from "../../lib/bunny";

const MEDIA_BATCH_SIZE = 5;

/** Resolve storage URLs before opening the database transaction. */
export async function prepareContentMedia<T extends CreateContentInput | UpdateContentInput>(
  prisma: PrismaClient,
  contentId: string,
  input: T,
  isUpdate: boolean,
): Promise<T> {
  const prepared = { ...input };
  const existingScreenshots = isUpdate && input.screenshots
    ? await prisma.contentScreenshot.findMany({ where: { contentId } })
    : [];
  const existingImages = isUpdate && (input.posterUrl || input.backdropUrl || input.images)
    ? await prisma.contentImage.findMany({ where: { contentId } })
    : [];
  const pendingUrls = new Map<string, Promise<string>>();

  function resolveUrl(url: string, preset: UploadPreset): Promise<string> {
    const key = `${preset}:${url}`;
    const pending = pendingUrls.get(key);
    if (pending) return pending;
    const result = (async () => {
      if (!Object.hasOwn(UPLOAD_PRESETS, preset)) {
        throw new Error("Unsupported Bunny image upload type");
      }
      const hashIndex = url.indexOf("#");
      const hash = hashIndex < 0 ? "" : url.slice(hashIndex);
      const cleanUrl = hashIndex < 0 ? url : url.slice(0, hashIndex);
      if (isBase64Image(cleanUrl)) {
        return (await uploadToBunny(cleanUrl, preset, undefined, contentId)).url + hash;
      }
      const recovered = await getContentFolderImageUrlIfPresent(
        cleanUrl, UPLOAD_PRESETS[preset].folder, contentId,
      );
      // Keep the source for rollback snapshots and failed database writes.
      return (recovered ?? await moveImageToContentFolder(
        cleanUrl, UPLOAD_PRESETS[preset].folder, contentId, true,
      )) + hash;
    })();
    pendingUrls.set(key, result);
    return result;
  }

  async function resolveImage(url: string, preset: UploadPreset): Promise<string> {
    if (existingImages.some((image) => image.type === preset && getImageSource(image.filePath) === getImageSource(url))) return url;
    return resolveUrl(url, preset);
  }

  if (input.posterUrl) prepared.posterUrl = await resolveImage(input.posterUrl, "poster");
  if (input.backdropUrl) prepared.backdropUrl = await resolveImage(input.backdropUrl, "backdrop");
  if (input.images) {
    prepared.images = [];
    for (const image of input.images) {
      prepared.images.push({
        ...image,
        filePath: await resolveImage(image.filePath, image.type as UploadPreset),
      });
    }
  }
  if (input.screenshots) {
    prepared.screenshots = [];
    for (let offset = 0; offset < input.screenshots.length; offset += MEDIA_BATCH_SIZE) {
      const batch = input.screenshots.slice(offset, offset + MEDIA_BATCH_SIZE);
      const resolved = await Promise.all(batch.map(async (screenshot) => {
        const existing = existingScreenshots.find((row) =>
          screenshot.id ? row.id === screenshot.id : row.imageUrl === screenshot.imageUrl,
        );
        const imageUrl = existing?.imageUrl === screenshot.imageUrl
          ? (await getContentFolderImageUrlIfPresent(
              screenshot.imageUrl, UPLOAD_PRESETS.screenshot.folder, contentId,
            )) ?? screenshot.imageUrl
          : await resolveUrl(screenshot.imageUrl, "screenshot");
        // Preserve identity when an old URL is recovered to its content folder.
        return { ...screenshot, ...(existing ? { id: existing.id } : {}), imageUrl };
      }));
      prepared.screenshots.push(...resolved);
    }
  }
  if (input.expansions) {
    prepared.expansions = [];
    for (const expansion of input.expansions) {
      prepared.expansions.push({
        ...expansion,
        posterUrl: expansion.posterUrl
          ? await resolveUrl(expansion.posterUrl, "expansion")
          : expansion.posterUrl,
      });
    }
  }
  return prepared;
}
