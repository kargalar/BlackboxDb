'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

import { useCallback } from 'react';
import { CompactTagSelector } from '@/components/molecules/CompactTagSelector';
import { searchPersons } from '@/services/adminService';

interface BookWorkFieldsProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function BookWorkFields({ formData, setFormData }: BookWorkFieldsProps) {
  const translateUi = useUiTranslations('Ui');
  const fetchAuthors = useCallback(async () => {
    const result = await searchPersons('', 50);
    return (result.data || []).map((person: any) => ({
      id: person.id,
      name: person.name,
      profileUrl: person.profileUrl,
    }));
  }, []);

  return (
    <div className="space-y-4">
      <CompactTagSelector
        label={translateUi("yazarlar_306e672")}
        icon="BookOpen"
        value={formData.authors || []}
        onChange={(authors) =>
          setFormData({
            ...formData,
            authors: authors.map((author: any) => ({ ...author, role: 'author' })),
          })
        }
        placeholder={translateUi("yazar_ara_veya_yeni_yazar_yaz_9103176")}
        emptyMessage={translateUi("yazar_eklenmedi_d55f697")}
        fetchItems={fetchAuthors}
        badgeColor="orange"
        allowCreate={true}
      />
    </div>
  );
}
