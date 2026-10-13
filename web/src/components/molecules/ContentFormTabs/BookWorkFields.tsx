'use client';

import { useCallback } from 'react';
import { CompactTagSelector } from '@/components/molecules/CompactTagSelector';
import { searchPersons } from '@/services/adminService';

interface BookWorkFieldsProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function BookWorkFields({ formData, setFormData }: BookWorkFieldsProps) {
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
        label="Yazarlar"
        icon="BookOpen"
        value={formData.authors || []}
        onChange={(authors) =>
          setFormData({
            ...formData,
            authors: authors.map((author: any) => ({ ...author, role: 'author' })),
          })
        }
        placeholder="Yazar ara veya yeni yazar yaz..."
        emptyMessage="Yazar eklenmedi"
        fetchItems={fetchAuthors}
        badgeColor="orange"
        allowCreate={true}
      />
    </div>
  );
}
