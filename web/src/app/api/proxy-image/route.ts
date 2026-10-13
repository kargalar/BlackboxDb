import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_IMAGE_HOSTS = new Set(['image.tmdb.org', 'images.igdb.com']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 10_000;
const IMAGE_CACHE_SECONDS = 24 * 60 * 60;

async function readResponseWithLimit(response: Response): Promise<Uint8Array> {
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
    throw new Error('IMAGE_TOO_LARGE');
  }

  if (!response.body) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new Error('IMAGE_TOO_LARGE');
    }
    return new Uint8Array(buffer);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_IMAGE_BYTES) {
        throw new Error('IMAGE_TOO_LARGE');
      }
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }

  const image = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    image.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return image;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const parsedUrl = new URL(url);
    const isBunnyCdnHost =
      parsedUrl.hostname.endsWith('.b-cdn.net') ||
      parsedUrl.hostname === process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME;
    if (
      parsedUrl.protocol !== 'https:' ||
      (!ALLOWED_IMAGE_HOSTS.has(parsedUrl.hostname) && !isBunnyCdnHost)
    ) {
      return new NextResponse('Unauthorized image source', { status: 403 });
    }

    const response = await fetch(url, {
      cache: 'force-cache',
      next: { revalidate: IMAGE_CACHE_SECONDS },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, {
        status: response.status,
      });
    }

    const image = await readResponseWithLimit(response);
    const responseBody = new ArrayBuffer(image.byteLength);
    new Uint8Array(responseBody).set(image);

    return new NextResponse(responseBody, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': `public, max-age=${IMAGE_CACHE_SECONDS}, s-maxage=${IMAGE_CACHE_SECONDS}`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'IMAGE_TOO_LARGE') {
      return new NextResponse('Image is too large', { status: 413 });
    }
    console.error('Error proxying image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
