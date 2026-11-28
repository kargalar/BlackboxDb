'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

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
  const translateUi = useUiTranslations('Ui');
  console.log('🎭 [CastCrewFields] Render for contentType:', contentTypeId);

  return (
    <div className="space-y-6">
      {/* Cast */}
      <PersonListInput
        label={translateUi("oyuncu_kadrosu_a6f6e6d")}
        value={formData.cast || []}
        onChange={(cast) => setFormData({ ...formData, cast })}
        placeholder={translateUi("oyuncu_adini_girin_f08d66f")}
        roleLabel="Tür"
        contentTypeId={contentTypeId}
        showCharacterField={true}
      />

      {/* Crew */}
      <PersonListInput
        label={translateUi("yapim_ekibi_7087fb3")}
        value={formData.crew || []}
        onChange={(crew) => setFormData({ ...formData, crew })}
        placeholder={translateUi("kisi_adini_girin_d06df34")}
        roleLabel="Pozisyon"
        contentTypeId={contentTypeId}
      />
    </div>
  );
}
