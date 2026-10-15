import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { BookOpen, Film, Gamepad2, Tv, type LucideIcon } from 'lucide-react';
import { AddContentFormData } from '../types';
import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';

const GET_CONTENT_TYPES = gql`
  query GetContentTypes {
    contentTypes {
      id
      name
      slug
    }
  }
`;

interface ContentTypeOption {
  id: number;
  name: string;
  slug: string;
}

const CONTENT_TYPE_ICONS: Record<string, LucideIcon> = {
  movie: Film,
  tv: Tv,
  game: Gamepad2,
  book: BookOpen,
};

interface ContentTypeSelectorProps {
  formData: AddContentFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddContentFormData>>;
  errors: Record<string, string>;
}

export function ContentTypeSelector({ formData, setFormData, errors }: ContentTypeSelectorProps) {
  const { settings } = useGlobalSettings();
  const t = useTranslations('AddContent.typeSelector');
  const tSidebar = useTranslations('Sidebar');
  const { data, loading, error } = useQuery<{ contentTypes: ContentTypeOption[] }>(
    GET_CONTENT_TYPES
  );

  const getLocalizedLabel = (type: ContentTypeOption) => {
    const sidebarKeys: Record<string, string> = {
      movie: 'movies',
      tv: 'tvShows',
      game: 'games',
      book: 'books',
    };
    const sidebarKey = sidebarKeys[type.slug];
    if (sidebarKey) return tSidebar(sidebarKey);
    return t.has(type.slug) ? t(type.slug) : type.name;
  };

  const options = (data?.contentTypes || [])
    .filter((type) => ['movie', 'tv', 'game', 'book'].includes(type.slug))
    .filter((type) => type.slug !== 'book' || settings?.isBookEnabled !== false);

  return (
    <div className="space-y-3">
      <label className="block text-lg font-semibold text-white">{t('title')}</label>
      {loading && <p className="text-sm text-gray-400">{t('loading')}</p>}
      {error && <p className="text-sm text-red-400">{t('loadError')}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((type) => {
          const Icon = CONTENT_TYPE_ICONS[type.slug];
          const value = String(type.id);
          return (
            <button
              key={type.slug}
              type="button"
              onClick={() => {
                if (formData.contentTypeId === value) return;
                setFormData({
                  ...formData,
                  contentTypeId: value,
                  contentTypeSlug: type.slug,
                  genres: [],
                  themes: [],
                  moods: [],
                  cast: [],
                  crew: [],
                  authors: [],
                  publisher: null,
                  developerCompanies: [],
                  publisherCompanies: [],
                  platforms: [],
                  gameModes: [],
                  gameEngines: [],
                  perspectives: [],
                  seasons: [],
                  expansions: [],
                  screenshots: [],
                  tmdbId: undefined,
                  igdbId: undefined,
                  autoFillSourceId: '',
                  autoFillSource: '',
                });
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                formData.contentTypeId === value
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {Icon && <Icon className="mr-1.5 inline-block" size={16} />}
              {getLocalizedLabel(type)}
            </button>
          );
        })}
      </div>
      {errors.contentTypeId && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.contentTypeId}</p>
      )}
    </div>
  );
}
