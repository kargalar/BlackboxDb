'use client';

/**
 * Unified Person Dialog — create or edit a person.
 * Dark/gray theme, wide layout, supports local & API save modes.
 * Replaces both old NewPersonDialog and PersonEditDialog.
 */

import { useState, useMemo, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import ImageUploadField from '@/components/molecules/ImageUploadField';
import { updatePerson } from '@/services/adminService';
import toast from 'react-hot-toast';
import { apolloClient } from '@/lib/apollo-client';
import type { Person, NewPersonDialogProps } from './personListTypes';
import {
  SEARCH_TMDB_PERSON,
  FETCH_TMDB_PERSON_INFO,
  type TmdbPersonDetailResultData,
} from '@/services/graphql/admin/adminTmdb';
import type { PersonRole } from '@/services/graphql/admin';

/** Re-export Person as PersonData for backward compat with person page */
export type PersonData = Person & { gender?: string };

export function NewPersonDialog({
  onClose,
  onSave,
  initialName = '',
  initialRole,
  initialCharacter,
  showCharacterField = false,
  roles = [],
  onCreateRole,
  person,
  mode = 'create',
  apiMode = 'local',
  title,
}: NewPersonDialogProps) {
  const isEdit = mode === 'edit';

  const formatDate = (d?: string | null): string => {
    if (!d) return '';
    try {
      return new Date(d).toISOString().split('T')[0];
    } catch {
      return d;
    }
  };

  const [name, setName] = useState(person?.name || initialName);
  const [biography, setBiography] = useState(person?.biography || '');
  const [profileUrl, setProfileUrl] = useState(person?.profileUrl || '');
  const [birthDate, setBirthDate] = useState(formatDate(person?.birthDate));
  const [deathDate, setDeathDate] = useState(formatDate(person?.deathDate));
  const [placeOfBirth, setPlaceOfBirth] = useState(person?.placeOfBirth || '');
  const [gender, setGender] = useState((person as any)?.gender || '');
  const [selectedRole, setSelectedRole] = useState<PersonRole | null>(initialRole ?? null);
  const [character, setCharacter] = useState(person?.character || initialCharacter || '');
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autofilling, setAutofilling] = useState(false);

  // Sync when person prop changes (edit mode)
  useEffect(() => {
    if (person) {
      setName(person.name || '');
      setBiography(person.biography || '');
      setProfileUrl(person.profileUrl || '');
      setPlaceOfBirth(person.placeOfBirth || '');
      setGender((person as any)?.gender || '');
      setCharacter(person.character || '');
      setBirthDate(formatDate(person.birthDate));
      setDeathDate(formatDate(person.deathDate));
    }
  }, [person]);

  const filteredRoles = useMemo(
    () => roles.filter((r) => r.label.toLowerCase().includes(roleSearchTerm.toLowerCase())),
    [roles, roleSearchTerm]
  );

  const dialogTitle = title || (isEdit ? 'Kişi Bilgilerini Düzenle' : 'Yeni Kişi Ekle');
  const saveButtonText = isEdit ? 'Kaydet' : 'Ekle';

  console.log(
    `🧑 [NewPersonDialog] mode=${mode}, apiMode=${apiMode}, person=${person?.name || 'new'}`
  );

  const handleTmdbAutofill = async () => {
    if (!name.trim()) {
      toast.error('Önce kişinin adını yazmalısınız!');
      return;
    }

    setAutofilling(true);
    const loadingToast = toast.loading("TMDB'den aranıyor...");

    try {
      // 1. Arama
      const searchRes = await apolloClient.query<{ searchTmdbPersonQuery: number | null }>({
        query: SEARCH_TMDB_PERSON,
        variables: { query: name.trim() },
        fetchPolicy: 'network-only',
      });

      const tmdbPersonId = searchRes.data?.searchTmdbPersonQuery;
      if (!tmdbPersonId) {
        toast.error("TMDB'de bu isimde kişi bulunamadı.", { id: loadingToast });
        return;
      }

      // 2. Detayları Getir
      const detailRes = await apolloClient.query<{
        fetchTmdbPersonInfo: TmdbPersonDetailResultData;
      }>({
        query: FETCH_TMDB_PERSON_INFO,
        variables: { tmdbPersonId },
        fetchPolicy: 'network-only',
      });

      const personInfo = detailRes.data?.fetchTmdbPersonInfo;
      if (!personInfo) {
        toast.error('Kişi detayları alınamadı.', { id: loadingToast });
        return;
      }

      // Bilgileri duruma (state) aktar
      if (personInfo.biography) setBiography(personInfo.biography);
      if (personInfo.birthday) setBirthDate(formatDate(personInfo.birthday));
      if (personInfo.deathday) setDeathDate(formatDate(personInfo.deathday));
      if (personInfo.placeOfBirth) setPlaceOfBirth(personInfo.placeOfBirth);
      if (personInfo.profilePath) setProfileUrl(personInfo.profilePath);

      if (personInfo.gender === 1) setGender('female');
      else if (personInfo.gender === 2) setGender('male');
      else if (personInfo.gender === 3) setGender('other');

      toast.success("Kişi bilgileri TMDB'den dolduruldu!", { id: loadingToast });
    } catch (err: any) {
      console.error('❌ [NewPersonDialog] TMDB Autofill Error:', err);
      toast.error("TMDB'den bilgi çekilirken hata oluştu: " + (err.message || ''), {
        id: loadingToast,
      });
    } finally {
      setAutofilling(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    const getProfileUrlValue = () => {
      const v = profileUrl?.trim();
      return v === '' ? null : v || null;
    };
    const getBiographyValue = () => {
      const v = biography?.trim();
      return v === '' ? null : v || null;
    };

    const personData: PersonData = {
      ...(person || {}),
      id: person?.id,
      name: name.trim(),
      role: selectedRole?.label ?? person?.role,
      character: character.trim() || undefined,
      biography: getBiographyValue() ?? undefined,
      profileUrl: getProfileUrlValue() ?? undefined,
      birthDate: birthDate || undefined,
      deathDate: deathDate || undefined,
      placeOfBirth: placeOfBirth.trim() || undefined,
      personRoleId: selectedRole?.id ?? person?.personRoleId,
      personRoleLabel: selectedRole?.label ?? person?.personRoleLabel,
      gender: gender.trim() || undefined,
    };

    console.log('💾 [NewPersonDialog] Saving person:', personData);

    if (apiMode === 'api' && person?.id) {
      setSaving(true);
      try {
        const result = await updatePerson(person.id, {
          name: personData.name,
          biography: getBiographyValue(),
          birthDate: personData.birthDate,
          deathDate: personData.deathDate,
          gender: gender.trim() || undefined,
          placeOfBirth: personData.placeOfBirth,
          profileUrl: getProfileUrlValue(),
        });

        if (result.error) {
          console.error('❌ [NewPersonDialog] API save error:', result.error);
          toast.error('Kaydetme hatası: ' + (result.error.message || 'Bilinmeyen hata'));
          return;
        }

        toast.success('Kişi bilgileri güncellendi');
        console.log('✅ [NewPersonDialog] Person updated via API');
        onSave(personData);
      } catch (err: any) {
        console.error('❌ [NewPersonDialog] API save error:', err);
        toast.error('Kaydetme hatası: ' + (err.message || 'Bilinmeyen hata'));
      } finally {
        setSaving(false);
      }
    } else {
      onSave(personData);
    }
  };

  // Shared input classes — dark/gray theme
  const inputCls =
    'w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 transition-colors';
  const labelCls = 'block text-sm font-medium text-gray-400 mb-1.5';

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 p-4 pt-[5vh] overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface-panel border border-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto mb-4">
        {/* Header */}
        <div className="sticky top-0 bg-surface-panel border-b border-gray-800 px-6 py-5 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-white">{dialogTitle}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Row 1: Name + Gender */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>Ad Soyad *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Christopher Nolan"
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <label className={labelCls}>Cinsiyet</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={`${inputCls} appearance-none`}
              >
                <option value="">Seçin</option>
                <option value="male">Erkek</option>
                <option value="female">Kadın</option>
                <option value="other">Diğer</option>
                <option value="unknown">Bilinmiyor</option>
              </select>
            </div>
          </div>

          {/* Row 2: Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Doğum Tarihi</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Ölüm Tarihi</label>
              <input
                type="date"
                value={deathDate}
                onChange={(e) => setDeathDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Place of Birth */}
          <div>
            <label className={labelCls}>Doğum Yeri</label>
            <input
              type="text"
              value={placeOfBirth}
              onChange={(e) => setPlaceOfBirth(e.target.value)}
              placeholder="Örn: London, UK"
              className={inputCls}
            />
          </div>

          {/* Biography */}
          <div>
            <label className={labelCls}>Biyografi</label>
            <textarea
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              placeholder="Kişi hakkında kısa bilgi..."
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Role — searchable dropdown (only when roles available) */}
          {roles.length > 0 && (
            <div>
              <label className={labelCls}>Rol</label>
              <div className="relative">
                <input
                  type="text"
                  value={roleSearchTerm}
                  onChange={(e) => {
                    setRoleSearchTerm(e.target.value);
                    setShowRoleDropdown(true);
                  }}
                  onFocus={() => setShowRoleDropdown(true)}
                  placeholder={selectedRole?.label || 'Rol seçin veya arayın...'}
                  className={inputCls}
                />
                {selectedRole && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium bg-gray-800 px-2 py-0.5 rounded">
                    {selectedRole.label}
                  </span>
                )}
                {showRoleDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface-raised border border-gray-700 rounded-lg shadow-2xl z-50 max-h-44 overflow-y-auto">
                    {filteredRoles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => {
                          setSelectedRole(role);
                          setRoleSearchTerm('');
                          setShowRoleDropdown(false);
                          console.log('🎭 [NewPersonDialog] Role selected:', role.label);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          selectedRole?.id === role.id
                            ? 'bg-gray-700 text-white'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        {role.label}
                      </button>
                    ))}
                    {roleSearchTerm.trim() &&
                      !roles.some((r) => r.label.toLowerCase() === roleSearchTerm.toLowerCase()) &&
                      onCreateRole && (
                        <button
                          type="button"
                          onClick={() => {
                            onCreateRole(roleSearchTerm.trim());
                            setRoleSearchTerm('');
                            setShowRoleDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-green-400 hover:bg-gray-800 transition-colors"
                        >
                          + &quot;{roleSearchTerm}&quot; oluştur
                        </button>
                      )}
                    {filteredRoles.length === 0 && !roleSearchTerm.trim() && (
                      <div className="px-3 py-2 text-sm text-gray-500">Henüz rol yok</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Character */}
          {showCharacterField && (
            <div>
              <label className={labelCls}>Karakter Adı</label>
              <input
                type="text"
                value={character}
                onChange={(e) => setCharacter(e.target.value)}
                placeholder="Örn: Tony Stark"
                className={inputCls}
              />
            </div>
          )}

          {/* Profile Photo */}
          <div>
            <ImageUploadField
              label="Profil Fotoğrafı"
              name="profileUrl"
              value={profileUrl}
              onChange={(url) => setProfileUrl(url)}
              imageType="profile"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface-panel border-t border-gray-800 px-6 py-4 flex justify-between gap-3">
          <button
            type="button"
            onClick={handleTmdbAutofill}
            disabled={autofilling || !name.trim()}
            className="px-5 py-2.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-600/30 transition-colors font-medium flex items-center gap-2 disabled:opacity-40"
          >
            {autofilling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            )}
            TMDB&apos;den Doldur
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {saveButtonText}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
