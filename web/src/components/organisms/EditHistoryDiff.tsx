'use client';

import React from 'react';
import Image from 'next/image';

interface EditHistoryDiffProps {
  history: {
    action: string;
    summary?: string;
    changedFields: string[];
    before?: any;
    after?: any;
  };
}

export const EditHistoryDiff: React.FC<EditHistoryDiffProps> = ({ history }) => {
  const { changedFields, before, after, action } = history;

  if (action === 'CREATE') {
    return (
      <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg">
        <p className="font-semibold">✨ Content Created</p>
      </div>
    );
  }

  if (action === 'DELETE') {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg">
        <p className="font-semibold">🗑️ Content Deleted</p>
      </div>
    );
  }

  if (!changedFields || changedFields.length === 0) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg text-gray-400">
        <p>No specific field changes recorded.</p>
      </div>
    );
  }

  const renderValue = (value: any): string => {
    if (value === null || value === undefined) return 'None';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const renderArrayDiff = (field: string, beforeArr: any[], afterArr: any[]) => {
    // Basic array diffing. We assume arrays of objects have an 'id' or we stringify them.
    const getIdentifier = (item: any) => {
      if (typeof item === 'object' && item !== null) {
        if (item.personId) return item.personId;
        if (item.id) return item.id;
        if (item.name) return item.name;
        if (item.genreId) return item.genreId;
        return JSON.stringify(item);
      }
      return String(item);
    };

    const getDisplayName = (item: any) => {
      if (typeof item === 'object' && item !== null) {
        if (item.name) return item.name;
        if (item.title) return item.title;
        if (item.person?.name)
          return item.person.name + (item.character ? ` (${item.character})` : '');
        if (item.genre?.name) return item.genre.name;
        return JSON.stringify(item);
      }
      return String(item);
    };

    const beforeMap = new Map(beforeArr.map((item) => [getIdentifier(item), item]));
    const afterMap = new Map(afterArr.map((item) => [getIdentifier(item), item]));

    const added = afterArr.filter((item) => !beforeMap.has(getIdentifier(item)));
    const removed = beforeArr.filter((item) => !afterMap.has(getIdentifier(item)));

    if (added.length === 0 && removed.length === 0) {
      return <div className="text-gray-400 text-sm">Order changed or minor update.</div>;
    }

    return (
      <div className="space-y-1">
        {removed.map((item, idx) => (
          <div key={`rem-${idx}`} className="text-red-400 text-sm flex items-start gap-2">
            <span className="font-bold">-</span>
            <span>{getDisplayName(item)}</span>
          </div>
        ))}
        {added.map((item, idx) => (
          <div key={`add-${idx}`} className="text-green-400 text-sm flex items-start gap-2">
            <span className="font-bold">+</span>
            <span>{getDisplayName(item)}</span>
          </div>
        ))}
      </div>
    );
  };

  const isImageUrl = (field: string, value: any): boolean => {
    if (typeof value !== 'string') return false;
    if (!value.startsWith('http://') && !value.startsWith('https://')) return false;

    const lowerField = field.toLowerCase();

    if (
      lowerField.includes('trailer') ||
      lowerField.includes('video') ||
      lowerField.includes('gameplay')
    ) {
      return false;
    }

    const imageFieldNames = [
      'poster',
      'backdrop',
      'avatar',
      'photo',
      'profile',
      'logo',
      'cover',
      'image',
      'icon',
    ];
    if (imageFieldNames.some((name) => lowerField.includes(name))) {
      return true;
    }

    if (
      value.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i) ||
      value.includes('.b-cdn.net/')
    ) {
      return true;
    }

    return false;
  };

  const renderDiff = (field: string, beforeVal: any, afterVal: any) => {
    if (Array.isArray(beforeVal) || Array.isArray(afterVal)) {
      return renderArrayDiff(
        field,
        Array.isArray(beforeVal) ? beforeVal : [],
        Array.isArray(afterVal) ? afterVal : []
      );
    }

    const beforeIsImage = isImageUrl(field, beforeVal);
    const afterIsImage = isImageUrl(field, afterVal);

    if (beforeIsImage || afterIsImage) {
      return (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {beforeVal && (
            <div className="flex flex-col items-center gap-1 opacity-70">
              <span className="text-red-400 line-through text-xs">Eski</span>
              <Image
                src={beforeVal}
                alt="Old"
                width={200}
                height={128}
                unoptimized
                className="max-h-32 max-w-[200px] rounded border border-red-500/30 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  if (target.nextElementSibling) {
                    (target.nextElementSibling as HTMLElement).style.display = 'block';
                  }
                }}
              />
              <div className="hidden text-red-400 text-xs mt-1 border border-red-400/30 p-1 px-2 rounded bg-red-400/10">
                Silinmiş Görsel
              </div>
            </div>
          )}
          {beforeVal && afterVal && <span className="text-slate-500">→</span>}
          {afterVal && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-green-400 text-xs">Yeni</span>
              <Image
                src={afterVal}
                alt="New"
                width={200}
                height={128}
                unoptimized
                className="max-h-32 max-w-[200px] rounded border border-green-500/30 bg-slate-900/50 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  if (target.nextElementSibling) {
                    (target.nextElementSibling as HTMLElement).style.display = 'block';
                  }
                }}
              />
              <div className="hidden text-red-400 text-xs mt-1 border border-red-400/30 p-1 px-2 rounded bg-red-400/10">
                Görsel Bulunamadı
              </div>
            </div>
          )}
        </div>
      );
    }

    // String/number diff
    return (
      <div className="flex flex-col gap-1 text-sm">
        <div className="text-red-400 line-through opacity-70 break-words">
          {renderValue(beforeVal)}
        </div>
        <div className="text-green-400 break-words">{renderValue(afterVal)}</div>
      </div>
    );
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {history.summary && (
        <div className="p-3 bg-slate-800 border-b border-slate-700/50">
          <p className="text-slate-300 text-sm font-medium">{history.summary}</p>
        </div>
      )}
      <div className="p-4 space-y-4">
        {changedFields.map((field) => {
          const beforeVal = before ? before[field] : undefined;
          const afterVal = after ? after[field] : undefined;

          return (
            <div
              key={field}
              className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-2 md:gap-4 border-b border-slate-700/30 pb-4 last:border-0 last:pb-0"
            >
              <div className="text-slate-400 font-medium text-sm capitalize">
                {field.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              <div className="bg-slate-900/50 rounded-md p-3">
                {renderDiff(field, beforeVal, afterVal)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
