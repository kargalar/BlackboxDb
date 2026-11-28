'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

/**
 * MovieInfoFields - Movie-specific info fields (runtime, budget, revenue, studios).
 * Cast & Crew are in a separate tab via CastCrewFields.
 */

import { FormInput } from '@/components/atoms/FormInput';
import { CompactTagSelector } from '@/components/molecules/CompactTagSelector';
import { LIST_COMPANIES, CREATE_COMPANY } from '@/services/graphql/admin';

interface MovieInfoFieldsProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function MovieInfoFields({ formData, setFormData }: MovieInfoFieldsProps) {
  const translateUi = useUiTranslations('Ui');
  console.log('🎬 [MovieInfoFields] Render');

  return (
    <div className="space-y-6">
      <FormInput
        label="TMDB ID"
        name="tmdbId"
        type="number"
        value={formData.tmdbId || ''}
        onChange={(value) =>
          setFormData({
            ...formData,
            tmdbId: value ? Number(value) : undefined,
          })
        }
        placeholder={translateUi("orn_603_56f08c2")}
      />

      {/* Film Süresi */}
      <FormInput
        label={translateUi("sure_dakika_9fe8aa6")}
        name="runtime"
        type="number"
        value={formData.runtime}
        onChange={(value) => setFormData({ ...formData, runtime: value })}
        placeholder={translateUi("orn_120_5c87396")}
      />

      {/* Finansal Bilgiler */}
      <div className="space-y-4">
        <FormInput
          label={translateUi("butce_usd_4122d66")}
          name="budget"
          type="number"
          value={formData.budget}
          onChange={(value) => setFormData({ ...formData, budget: value })}
          placeholder={translateUi("orn_100000000_9dc1714")}
        />

        <FormInput
          label={translateUi("kasa_geliri_usd_374b5d5")}
          name="revenue"
          type="number"
          value={formData.revenue}
          onChange={(value) => setFormData({ ...formData, revenue: value })}
          placeholder={translateUi("orn_500000000_dbfa053")}
        />
      </div>

      {/* Studios */}
      <CompactTagSelector
        label={translateUi("studyolar_yapim_sirketleri_e26f2c9")}
        icon="🏢"
        value={formData.studios || []}
        onChange={(companies) => setFormData({ ...formData, studios: companies })}
        placeholder={translateUi("warner_bros_universal_pictures_9115c42")}
        listQuery={LIST_COMPANIES}
        queryKey="listCompanies"
        queryVariables={{ roleIds: [6] }}
        createMutation={CREATE_COMPANY}
        mutationKey="createCompany"
        createInputExtra={{ defaultRoleIds: [6] }}
        badgeColor="purple"
        allowCreate={true}
      />
    </div>
  );
}
