'use client';

import { useState } from 'react';

const FIELD_LABELS: Record<string, string> = {
  additionalRatingCategories: 'Puanlama kategorileri',
  backdropUrl: 'Arka plan',
  bookPublications: 'Kitap baskıları',
  citationsMade: 'Atıflar',
  citationsReceived: 'Atıf alan içerikler',
  coverUrl: 'Kapak',
  expansions: 'Genişletmeler',
  filePath: 'Görsel',
  imageUrl: 'Görsel',
  images: 'Görseller',
  posterUrl: 'Afiş',
  screenshots: 'Ekran görüntüleri',
};

export function formatAuditFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/([a-z])([A-Z])/g, '$1 $2');
}

type AuditValue = Record<string, unknown> | unknown[] | null | undefined;

interface AuditImage {
  path: string;
  url: string;
}

const IMAGE_URL_KEYS = new Set(['posterUrl', 'backdropUrl', 'filePath', 'imageUrl', 'coverUrl']);

function collectImages(value: unknown, path = ''): AuditImage[] {
  if (!value || typeof value !== 'object') return [];

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectImages(item, `${path}[${index + 1}]`));
  }

  return Object.entries(value).flatMap(([key, item]) => {
    const itemPath = path ? `${path}.${key}` : key;
    if (IMAGE_URL_KEYS.has(key) && typeof item === 'string' && item.length > 0) {
      return [{ path: itemPath, url: item }];
    }
    return collectImages(item, itemPath);
  });
}

function redactImageUrls(value: unknown, key = ''): unknown {
  if (IMAGE_URL_KEYS.has(key) && typeof value === 'string' && value.length > 0) {
    return '[görsel önizlemesi]';
  }
  if (Array.isArray(value)) return value.map((item) => redactImageUrls(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        redactImageUrls(childValue, childKey),
      ])
    );
  }
  return value;
}

function AuditImagePreview({ image, deleted }: { image: AuditImage; deleted: boolean }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-black/30 p-2">
      <div className="mb-2 h-28 overflow-hidden rounded bg-white/5 flex items-center justify-center">
        {!failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt=""
            className="h-full w-full object-contain"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="px-2 text-center text-xs text-white/40">Görsel yüklenemiyor</span>
        )}
      </div>
      <p className="truncate text-[11px] text-white/50" title={image.path}>
        {formatAuditFieldLabel(image.path.split('.').at(-1) || image.path)}
      </p>
      {deleted && <p className="mt-1 text-xs font-medium text-red-300">Bu düzenlemede silindi</p>}
    </div>
  );
}

export function AuditSnapshotView({
  value,
  comparisonValue,
  side,
}: {
  value: AuditValue;
  comparisonValue: AuditValue;
  side: 'before' | 'after';
}) {
  if (!value || typeof value !== 'object' || Object.keys(value).length === 0) return null;

  const images = Array.from(
    new Map(collectImages(value).map((image) => [image.url, image])).values()
  );
  const comparisonUrls = new Set(collectImages(comparisonValue).map((image) => image.url));

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((image, index) => (
            <AuditImagePreview
              key={`${image.url}:${image.path}:${index}`}
              image={image}
              deleted={side === 'before' && !comparisonUrls.has(image.url)}
            />
          ))}
        </div>
      )}
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs text-white/60">
        {JSON.stringify(redactImageUrls(value), null, 2)}
      </pre>
    </div>
  );
}
