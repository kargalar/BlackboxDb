'use client';

/**
 * CastCrewFields - Shared cast & crew inputs for Movie and TV content types.
 * Displayed in the "Oyuncular & Ekip" tab.
 */

import { PersonListInput } from '@/components/molecules/PersonListInput';

interface CastCrewFieldsProps {
  formData: any;
  setFormData: (data: any) => void;
  contentTypeId: number;
}

export function CastCrewFields({ formData, setFormData, contentTypeId }: CastCrewFieldsProps) {
  console.log('🎭 [CastCrewFields] Render for contentType:', contentTypeId);

  return (
    <div className="space-y-6">
      {/* Cast */}
      <PersonListInput
        label="🎭 Oyuncu Kadrosu"
        value={formData.cast || []}
        onChange={(cast) => setFormData({ ...formData, cast })}
        placeholder="Oyuncu adını girin"
        roleLabel="Tür"
        contentTypeId={contentTypeId}
        showCharacterField={true}
      />

      {/* Crew */}
      <PersonListInput
        label="👥 Yapım Ekibi"
        value={formData.crew || []}
        onChange={(crew) => setFormData({ ...formData, crew })}
        placeholder="Kişi adını girin"
        roleLabel="Pozisyon"
        contentTypeId={contentTypeId}
      />
    </div>
  );
}
