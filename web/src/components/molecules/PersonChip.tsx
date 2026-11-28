'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

import Image from 'next/image';
import { searchPersons } from '@/services/adminService';
import type { Person, PersonChipProps } from './personListTypes';

export function PersonChip({
  person,
  index,
  totalCount,
  draggedIndex,
  dragOverIndex,
  allPersons,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onEdit,
  onRemove,
  onMove,
}: PersonChipProps) {
  const translateUi = useUiTranslations('Ui');
  const handleClick = async () => {
    // Prevent click when dragging
    if (draggedIndex !== null) return;

    let editData: Person = person;

    if (person.id) {
      const fullPerson = allPersons.find((p) => p.id === person.id);
      if (fullPerson) {
        console.log('📝 [PersonChip] Full person from cache:', fullPerson.name);
        editData = {
          ...fullPerson,
          role: person.role,
          character: person.character,
        };
      } else {
        try {
          const result = await searchPersons(person.name, 1);
          if (result.data && result.data.length > 0) {
            const apiPerson = result.data.find((p: Person) => p.id === person.id);
            if (apiPerson) {
              console.log('📝 [PersonChip] Full person from API:', apiPerson.name);
              editData = {
                ...apiPerson,
                role: person.role,
                character: person.character,
              };
            }
          }
        } catch (err) {
          console.error('❌ [PersonChip] Error fetching person:', err);
        }
      }
    }

    onEdit(index, editData);
  };

  return (
    <div
      draggable={totalCount > 1}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={`inline-flex items-center gap-2 bg-white dark:bg-surface-raised border rounded-lg pl-1.5 pr-1.5 py-1.5 transition-all group ${
        draggedIndex === index
          ? 'opacity-50 border-violet-500 dark:border-violet-400'
          : dragOverIndex === index
            ? 'border-violet-500 dark:border-violet-400 border-2 scale-105'
            : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={translateUi("value1_kisisini_duzenle_3f1e1ce", { value1: String(person.name) })}
        className="inline-flex items-center gap-2 rounded-md text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        {person.profileUrl ? (
          <Image
            src={person.profileUrl}
            alt=""
            width={44}
            height={44}
            sizes="44px"
            unoptimized
            className="w-11 h-11 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="w-11 h-11 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-300 dark:bg-gray-600 dark: flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-300"
          >
            {person.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        <span className="flex items-center gap-1.5 text-sm">
          <span className="font-medium text-gray-900 dark:text-white">{person.name}</span>
          {person.role && <span className="text-gray-500 dark:text-gray-400">({person.role})</span>}
          {person.character && (
            <span className="text-violet-500">{translateUi("quot_e2bbf20")}{person.character}{translateUi("quot_e2bbf20")}</span>
          )}
        </span>
      </button>
      {totalCount > 1 && (
        <>
          <button
            type="button"
            aria-label={translateUi("value1_kisisini_listede_yukari_tasi_fe623b4", { value1: String(person.name) })}
            title={translateUi("yukari_tasi_59e4751")}
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
            className="rounded px-1 text-gray-500 hover:text-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-30 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <span aria-hidden="true">↑</span>
          </button>
          <button
            type="button"
            aria-label={translateUi("value1_kisisini_listede_asagi_tasi_68315c2", { value1: String(person.name) })}
            title={translateUi("asagi_tasi_93776f6")}
            disabled={index === totalCount - 1}
            onClick={() => onMove(index, index + 1)}
            className="rounded px-1 text-gray-500 hover:text-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-30 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <span aria-hidden="true">↓</span>
          </button>
        </>
      )}
      {/* Drag Handle */}
      {totalCount > 1 && (
        <span
          aria-hidden="true"
          className="text-gray-400 dark:text-gray-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity select-none ml-1"
          title={translateUi("surukleyerek_siralayin_b3e8caa")}
        >
          ⋮⋮
        </span>
      )}
      {/* Remove Button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        aria-label={translateUi("value1_kisisini_kaldir_2f72fe6", { value1: String(person.name) })}
        title={translateUi("kaldir_d38bc7b")}
        className="text-gray-400 hover:text-red-500 font-bold leading-none ml-1 opacity-60 group-hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </div>
  );
}
