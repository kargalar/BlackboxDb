'use client';

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
        placeholder="Örn: 603"
      />

      {/* Film Süresi */}
      <FormInput
        label="Süre (dakika)"
        name="runtime"
        type="number"
        value={formData.runtime}
        onChange={(value) => setFormData({ ...formData, runtime: value })}
        placeholder="Örn: 120"
      />

      {/* Finansal Bilgiler */}
      <div className="space-y-4">
        <FormInput
          label="Bütçe (USD)"
          name="budget"
          type="number"
          value={formData.budget}
          onChange={(value) => setFormData({ ...formData, budget: value })}
          placeholder="Örn: 100000000"
        />

        <FormInput
          label="Kasa Geliri (USD)"
          name="revenue"
          type="number"
          value={formData.revenue}
          onChange={(value) => setFormData({ ...formData, revenue: value })}
          placeholder="Örn: 500000000"
        />
      </div>

      {/* Studios */}
      <CompactTagSelector
        label="Stüdyolar / Yapım Şirketleri"
        icon="🏢"
        value={formData.studios || []}
        onChange={(companies) => setFormData({ ...formData, studios: companies })}
        placeholder="Warner Bros, Universal Pictures..."
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
