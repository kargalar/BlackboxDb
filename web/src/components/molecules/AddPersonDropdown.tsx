'use client';

import Image from 'next/image';
import type { PersonRole } from '@/services/graphql/admin';
import type { Person, AddPersonDropdownProps } from './personListTypes';

export function AddPersonDropdown({
  showDropdown,
  setShowDropdown,
  tempName,
  setTempName,
  tempRole,
  setTempRole,
  tempCharacter,
  setTempCharacter,
  suggestions,
  isInitialLoading,
  isSearching,
  showCharacterField,
  placeholder,
  roles,
  roleSearchTerm,
  setRoleSearchTerm,
  showRoleDropdown,
  setShowRoleDropdown,
  onSuggestionClick,
  onShowDialog,
  onCreateRole,
  inputRef,
  roleInputRef,
}: AddPersonDropdownProps) {
  const showCreateButton = tempName.trim().length >= 1;

  console.log(
    '🔽 [AddPersonDropdown] Rendering, showDropdown:',
    showDropdown,
    'suggestions:',
    suggestions.length
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setShowDropdown(!showDropdown);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-raised hover:border-violet-500 dark:hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 transition-all"
      >
        + Ekle
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-surface-raised border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
          {/* Search + Role + Character */}
          <div className="p-2.5 space-y-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder={placeholder}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-surface-panel text-gray-900 dark:text-white"
              />
              {showCreateButton && (
                <button
                  type="button"
                  onClick={() => onShowDialog()}
                  className="px-2.5 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap font-medium"
                >
                  + Yeni Kişi
                </button>
              )}
            </div>

            {/* Role selector and Character field in same row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={roleInputRef}
                  type="text"
                  value={roleSearchTerm}
                  onChange={(e) => {
                    setRoleSearchTerm(e.target.value);
                    setShowRoleDropdown(true);
                  }}
                  onFocus={() => setShowRoleDropdown(true)}
                  placeholder={tempRole?.label || 'Rol seçin...'}
                  className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-surface-panel text-gray-900 dark:text-white"
                />
                {/* Role dropdown */}
                {showRoleDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-surface-raised border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                    {roles
                      .filter((r) => r.label.toLowerCase().includes(roleSearchTerm.toLowerCase()))
                      .map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => {
                            setTempRole(role);
                            setRoleSearchTerm('');
                            setShowRoleDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-surface-panel ${
                            tempRole?.id === role.id ? 'bg-violet-50 dark:bg-violet-900/20' : ''
                          }`}
                        >
                          {role.label}
                        </button>
                      ))}
                    {roleSearchTerm.trim() &&
                      !roles.some(
                        (r) => r.label.toLowerCase() === roleSearchTerm.toLowerCase()
                      ) && (
                        <button
                          type="button"
                          onClick={() => onCreateRole(roleSearchTerm.trim())}
                          className="w-full text-left px-2 py-1.5 text-xs bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400"
                        >
                          + &quot;{roleSearchTerm}&quot; oluştur
                        </button>
                      )}
                    {roles.length === 0 && !roleSearchTerm.trim() && (
                      <div className="px-2 py-1.5 text-xs text-gray-500">Henüz rol yok</div>
                    )}
                  </div>
                )}
              </div>
              {showCharacterField && (
                <input
                  type="text"
                  value={tempCharacter}
                  onChange={(e) => setTempCharacter(e.target.value)}
                  placeholder="Karakter adı"
                  className="flex-1 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-surface-panel text-gray-900 dark:text-white"
                />
              )}
            </div>
          </div>

          {/* Suggestions List */}
          <div className="max-h-64 overflow-y-auto">
            {isInitialLoading ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                Yükleniyor...
              </div>
            ) : isSearching ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Aranıyor...</div>
            ) : suggestions.length > 0 ? (
              suggestions.map((person) => (
                <button
                  key={person.id || person.name}
                  type="button"
                  onClick={() => onSuggestionClick(person)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-surface-panel transition-colors flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                >
                  {person.profileUrl ? (
                    <Image
                      src={person.profileUrl}
                      alt=""
                      width={32}
                      height={32}
                      sizes="32px"
                      unoptimized
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 dark: flex items-center justify-center flex-shrink-0 text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {person.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {person.name}
                    </div>
                    {person.biography && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {person.biography}
                      </div>
                    )}
                  </div>
                </button>
              ))
            ) : tempName.trim().length > 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                Sonuç bulunamadı - &quot;Yeni Kişi&quot; butonuyla ekleyebilirsiniz
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                Henüz kayıtlı kişi yok
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
