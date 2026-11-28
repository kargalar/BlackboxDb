'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

/**
 * TvInfoFields - TV-specific info fields (studios).
 * Dates are in CommonFields, Seasons and Cast & Crew are in separate tabs.
 */

import { FormInput } from '@/components/atoms/FormInput';
import { CompactTagSelector } from '@/components/molecules/CompactTagSelector';
import { LIST_COMPANIES, CREATE_COMPANY } from '@/services/graphql/admin';

interface TvInfoFieldsProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function TvInfoFields({ formData, setFormData }: TvInfoFieldsProps) {
  const translateUi = useUiTranslations('Ui');
  console.log('📺 [TvInfoFields] Render');

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
        placeholder={translateUi("orn_1399_d5d894d")}
      />

      {/* Studios */}
      <CompactTagSelector
        label={translateUi("studyolar_yapim_sirketleri_e26f2c9")}
        icon="🏢"
        value={formData.studios || []}
        onChange={(companies) => setFormData({ ...formData, studios: companies })}
        placeholder={translateUi("hbo_netflix_amc_56f3032")}
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
