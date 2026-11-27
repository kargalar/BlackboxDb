import type { Dispatch, SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import { FormInput } from '@/components/atoms/FormInput';
import { FormTextArea } from '@/components/atoms/FormTextArea';
import { CompactTagSelector } from '@/components/molecules/CompactTagSelector';
import { LIST_COMPANIES } from '@/services/graphql/admin';
import type { AddContentFormData } from '@/app/add-content/types';

interface BoardGameFieldsProps {
  formData: AddContentFormData;
  setFormData: Dispatch<SetStateAction<AddContentFormData>>;
  errors: Record<string, string>;
}

export function BoardGameFields({ formData, setFormData, errors }: BoardGameFieldsProps) {
  const t = useTranslations('BoardGames');
  const numberFields = ['minPlayers', 'maxPlayers', 'runtime'] as const;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {numberFields.map((name) => (
          <FormInput
            key={name}
            label={t(name)}
            name={name}
            type="number"
            value={formData[name]}
            error={errors[name]}
            onChange={(value) => setFormData((prev) => ({ ...prev, [name]: value }))}
          />
        ))}
      </div>
      <CompactTagSelector
        label={t('publishers')}
        icon="🏢"
        value={formData.publisherCompanies ?? []}
        onChange={(companies) =>
          setFormData((prev) => ({
            ...prev,
            publisherCompanies: companies.map((company) => ({
              ...company,
              logoUrl: company.logoUrl ?? undefined,
            })),
          }))
        }
        listQuery={LIST_COMPANIES}
        queryKey="listCompanies"
      />
      <FormTextArea
        label={t('howToPlay')}
        name="howToPlay"
        rows={8}
        value={formData.howToPlay}
        placeholder={t('instructionsHint')}
        onChange={(howToPlay) => setFormData((prev) => ({ ...prev, howToPlay }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          label={t('productSource')}
          name="infoLink"
          type="url"
          value={formData.infoLink ?? ''}
          onChange={(infoLink) => setFormData((prev) => ({ ...prev, infoLink }))}
        />
        <FormInput
          label={t('rulebook')}
          name="previewLink"
          type="url"
          value={formData.previewLink ?? ''}
          onChange={(previewLink) => setFormData((prev) => ({ ...prev, previewLink }))}
        />
      </div>
    </div>
  );
}
