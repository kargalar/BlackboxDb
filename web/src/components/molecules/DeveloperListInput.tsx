'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { DeveloperEditDialog, DeveloperData } from '@/components/molecules/DeveloperEditDialog';
import { apolloClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';

// GraphQL queries
const SEARCH_COMPANIES_QUERY = gql`
  query SearchCompanies($name: String!, $limit: Int) {
    searchCompanies(name: $name, limit: $limit) {
      id
      name
      description
      headquarters
      logoUrl
      website
      foundingYear
      gameCount
    }
  }
`;

const LIST_COMPANIES_QUERY = gql`
  query ListCompanies($limit: Int, $roleIds: [Int!]) {
    listCompanies(limit: $limit, roleIds: $roleIds) {
      id
      name
      description
      headquarters
      logoUrl
      website
      foundingYear
      defaultRoleIds
    }
  }
`;

const CREATE_COMPANY_MUTATION = gql`
  mutation CreateCompany($input: CompanyInput!) {
    createCompany(input: $input) {
      id
      name
      description
      headquarters
      logoUrl
      website
      foundingYear
      createdAt
    }
  }
`;

interface DeveloperListInputProps {
  label: string;
  value: Array<DeveloperData>;
  onChange: (developers: Array<DeveloperData>) => void;
  placeholder?: string;
  roleIds?: number[];
}

export function DeveloperListInput({
  label,
  value,
  onChange,
  placeholder = 'Geliştirici adı girin',
  roleIds,
}: DeveloperListInputProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allDevelopers, setAllDevelopers] = useState<DeveloperData[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<DeveloperData[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [showNewDeveloperDialog, setShowNewDeveloperDialog] = useState(false);
  const [editingDeveloper, setEditingDeveloper] = useState<DeveloperData | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadAllDevelopers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apolloClient.query<{ listCompanies: DeveloperData[] }>({
        query: LIST_COMPANIES_QUERY,
        variables: { limit: 500, roleIds: roleIds || undefined },
        fetchPolicy: 'network-only',
      });
      const developers = result.data?.listCompanies || [];
      setAllDevelopers(developers);
      console.log(
        '🏢 [DeveloperListInput] Loaded companies:',
        developers.length,
        roleIds ? `(roleIds: ${roleIds})` : '(all)'
      );
    } catch (error) {
      console.error('❌ [DeveloperListInput] Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  }, [roleIds]);

  useEffect(() => {
    void loadAllDevelopers();
  }, [loadAllDevelopers]);

  // Filter suggestions when search term changes
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = allDevelopers.filter(
        (dev) =>
          dev.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !value.some((v) => v.id === dev.id)
      );
      setFilteredSuggestions(filtered.slice(0, 10));
    } else {
      setFilteredSuggestions([]);
    }
  }, [searchTerm, allDevelopers, value]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addDeveloper = (developer: DeveloperData) => {
    if (!developer.id && !developer.name) return;

    // Check if already exists
    if (developer.id && value.some((v) => v.id === developer.id)) {
      console.log('⚠️ [DeveloperListInput] Developer already added:', developer.name);
      return;
    }

    onChange([...value, developer]);
    setSearchTerm('');
    setShowSuggestions(false);
    console.log('✅ [DeveloperListInput] Added developer:', developer.name);
  };

  const removeDeveloper = (index: number) => {
    const updated = [...value];
    const removed = updated.splice(index, 1);
    onChange(updated);
    console.log('🗑️ [DeveloperListInput] Removed developer:', removed[0]?.name);
  };

  const handleSuggestionClick = (developer: DeveloperData) => {
    addDeveloper(developer);
  };

  const handleCreateNew = () => {
    setEditingDeveloper(null);
    setEditingIndex(null);
    setShowNewDeveloperDialog(true);
  };

  const handleEditDeveloper = (developer: DeveloperData, index: number) => {
    setEditingDeveloper(developer);
    setEditingIndex(index);
    setShowNewDeveloperDialog(true);
  };

  const handleSaveDeveloper = async (developerData: DeveloperData) => {
    console.log('💾 [DeveloperListInput] Saving developer:', developerData);

    try {
      if (editingIndex !== null) {
        // Editing existing developer in the list
        const updated = [...value];
        updated[editingIndex] = developerData;
        onChange(updated);
        console.log('✅ [DeveloperListInput] Updated developer at index:', editingIndex);
      } else {
        // Creating new company - save to database first
        const result = await apolloClient.mutate<{ createCompany: DeveloperData }>({
          mutation: CREATE_COMPANY_MUTATION,
          variables: {
            input: {
              name: developerData.name,
              description: developerData.description,
              headquarters: developerData.headquarters,
              logoUrl: developerData.logoUrl,
              website: developerData.website,
              foundingYear: developerData.foundingYear,
            },
          },
        });

        const createdCompany = result.data?.createCompany;
        if (!createdCompany) {
          throw new Error('Company creation did not return a record.');
        }

        if (createdCompany) {
          addDeveloper({
            id: createdCompany.id,
            name: createdCompany.name,
            description: createdCompany.description,
            headquarters: createdCompany.headquarters,
            logoUrl: createdCompany.logoUrl,
            website: createdCompany.website,
            foundingYear: createdCompany.foundingYear,
          });

          // Refresh the list
          try {
            await loadAllDevelopers();
          } catch (error) {
            console.error(
              '[DeveloperListInput] Failed to refresh companies after creation:',
              error
            );
          }
          console.log('✅ [DeveloperListInput] Created new company:', createdCompany.name);
        }
      }
    } catch (error) {
      console.error('[DeveloperListInput] Error saving developer:', error);
      throw error;
    }
  };

  return (
    <div
      className="bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3"
      ref={containerRef}
    >
      <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <span className="text-sm">🏢</span>
        <span>{label}</span>
      </label>

      {/* Search Input */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-surface-raised text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm border border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:outline-none transition-colors"
          />
          <button
            type="button"
            onClick={handleCreateNew}
            className="px-3 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors whitespace-nowrap"
          >
            + Yeni
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (searchTerm.trim() || filteredSuggestions.length > 0) && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-surface-raised rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-gray-500 dark:text-gray-400 text-sm">
                Yükleniyor...
              </div>
            ) : filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((dev) => (
                <button
                  key={dev.id}
                  type="button"
                  onClick={() => handleSuggestionClick(dev)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-surface-panel flex items-center gap-3 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                >
                  {dev.logoUrl ? (
                    <Image
                      src={dev.logoUrl}
                      alt={dev.name}
                      width={32}
                      height={32}
                      unoptimized
                      className="w-8 h-8 rounded object-contain bg-white/10"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-violet-600/20 flex items-center justify-center text-violet-400">
                      🏢
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 dark:text-white text-sm font-medium truncate">
                      {dev.name}
                    </p>
                    {dev.headquarters && (
                      <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
                        {dev.headquarters}
                      </p>
                    )}
                  </div>
                </button>
              ))
            ) : searchTerm.trim() ? (
              <div className="p-3">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                  &quot;{searchTerm}&quot; için sonuç bulunamadı
                </p>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="w-full px-3 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition-colors"
                >
                  + &quot;{searchTerm}&quot; adında oluştur
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Selected Developers */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((developer, index) => (
            <div
              key={developer.id || index}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-surface-raised border border-gray-200 dark:border-gray-700"
            >
              {developer.logoUrl ? (
                <Image
                  src={developer.logoUrl}
                  alt={developer.name}
                  width={40}
                  height={40}
                  unoptimized
                  className="w-10 h-10 rounded object-contain bg-gray-100 dark:bg-gray-800"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-violet-600/20 flex items-center justify-center text-violet-400">
                  🏢
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 dark:text-white text-sm font-medium truncate">
                  {developer.name}
                </p>
                {developer.headquarters && (
                  <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
                    {developer.headquarters}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleEditDeveloper(developer, index)}
                  className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-violet-500 transition-colors"
                  title="Düzenle"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => removeDeveloper(index)}
                  className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                  title="Kaldır"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
          Henüz şirket eklenmedi
        </p>
      )}

      {/* Developer Edit Dialog */}
      {showNewDeveloperDialog && (
        <DeveloperEditDialog
          key={editingDeveloper?.id ?? 'new'}
          developer={editingDeveloper}
          initialName={editingDeveloper ? '' : searchTerm}
          onClose={() => {
            setShowNewDeveloperDialog(false);
            setEditingDeveloper(null);
            setEditingIndex(null);
          }}
          onSave={handleSaveDeveloper}
          mode={editingDeveloper ? 'edit' : 'create'}
        />
      )}
    </div>
  );
}

export default DeveloperListInput;
