'use client';

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
        placeholder="Örn: 1399"
      />

      {/* Studios */}
      <CompactTagSelector
        label="Stüdyolar / Yapım Şirketleri"
        icon="🏢"
        value={formData.studios || []}
        onChange={(companies) => setFormData({ ...formData, studios: companies })}
        placeholder="HBO, Netflix, AMC..."
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
