'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

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
  const translateUi = useUiTranslations('Ui');
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
      toast.error(translateUi("once_kisinin_adini_yazmalisiniz_6d081eb"));
      return;
    }

    setAutofilling(true);
    const loadingToast = toast.loading(translateUi("tmdb_den_araniyor_738b7a3"));

    try {
      // 1. Arama
      const searchRes = await apolloClient.query<{ searchTmdbPersonQuery: number | null }>({
        query: SEARCH_TMDB_PERSON,
        variables: { query: name.trim() },
        fetchPolicy: 'network-only',
      });

      const tmdbPersonId = searchRes.data?.searchTmdbPersonQuery;
      if (!tmdbPersonId) {
        toast.error(translateUi("tmdb_de_bu_isimde_kisi_bulunamadi_f1368fb"), { id: loadingToast });
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
        toast.error(translateUi("kisi_detaylari_alinamadi_53371d7"), { id: loadingToast });
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

      toast.success(translateUi("kisi_bilgileri_tmdb_den_dolduruldu_5e047da"), { id: loadingToast });
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

        toast.success(translateUi("kisi_bilgileri_guncellendi_63b3dd4"));
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
              <label className={labelCls}>{translateUi("ad_soyad_604bcee")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={translateUi("orn_christopher_nolan_1dc5fcb")}
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <label className={labelCls}>{translateUi("cinsiyet_77664b1")}</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={`${inputCls} appearance-none`}
              >
                <option value="">{translateUi("secin_c16e2a9")}</option>
                <option value="male">{translateUi("erkek_81975d0")}</option>
                <option value="female">{translateUi("kadin_3d78aad")}</option>
                <option value="other">{translateUi("diger_861fed1")}</option>
                <option value="unknown">{translateUi("bilinmiyor_7e644fb")}</option>
              </select>
            </div>
          </div>

          {/* Row 2: Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{translateUi("dogum_tarihi_336e137")}</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{translateUi("olum_tarihi_df91405")}</label>
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
            <label className={labelCls}>{translateUi("dogum_yeri_dbd4acd")}</label>
            <input
              type="text"
              value={placeOfBirth}
              onChange={(e) => setPlaceOfBirth(e.target.value)}
              placeholder={translateUi("orn_london_uk_b8f019f")}
              className={inputCls}
            />
          </div>

          {/* Biography */}
          <div>
            <label className={labelCls}>{translateUi("biyografi_78f55f7")}</label>
            <textarea
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              placeholder={translateUi("kisi_hakkinda_kisa_bilgi_844069e")}
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Role — searchable dropdown (only when roles available) */}
          {roles.length > 0 && (
            <div>
              <label className={labelCls}>{translateUi("rol_a73f134")}</label>
              <div className="relative">
                <input
                  type="text"
                  value={roleSearchTerm}
                  onChange={(e) => {
                    setRoleSearchTerm(e.target.value);
                    setShowRoleDropdown(true);
                  }}
                  onFocus={() => setShowRoleDropdown(true)}
                  placeholder={selectedRole?.label || translateUi("rol_secin_veya_arayin_0bef491")}
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
                          {translateUi("quot_79ebfa3")}{roleSearchTerm}{translateUi("quot_olustur_980dac8")}
                        </button>
                      )}
                    {filteredRoles.length === 0 && !roleSearchTerm.trim() && (
                      <div className="px-3 py-2 text-sm text-gray-500">{translateUi("henuz_rol_yok_2c8909c")}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Character */}
          {showCharacterField && (
            <div>
              <label className={labelCls}>{translateUi("karakter_adi_c2f8074")}</label>
              <input
                type="text"
                value={character}
                onChange={(e) => setCharacter(e.target.value)}
                placeholder={translateUi("orn_tony_stark_e026272")}
                className={inputCls}
              />
            </div>
          )}

          {/* Profile Photo */}
          <div>
            <ImageUploadField
              label={translateUi("profil_fotografi_2259a81")}
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
            {translateUi("tmdb_apos_den_doldur_0a4619d")}
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              {translateUi("iptal_85e2d08")}
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
                  {translateUi("kaydediliyor_5bb599b")}
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
