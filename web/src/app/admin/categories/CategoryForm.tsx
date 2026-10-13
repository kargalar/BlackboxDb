'use client';

/**
 * Category form component for creating/editing category items.
 * Single Responsibility: rendering the form UI for the active tab.
 */

import { MutableRefObject, useEffect, useState } from 'react';
import ImageUploadField, { PendingImageUpload } from '@/components/molecules/ImageUploadField';
import { type TabType, type EditingItem } from './categoriesTypes';
import { listCompanyRoles } from '@/services/adminService';
import { useTranslations } from 'next-intl';

interface CompanyRole {
  id: number;
  name: string;
  contentTypeId?: number | null;
}

interface CategoryFormProps {
  activeTab: TabType;
  editingId: number | string | null;
  formData: EditingItem;
  loading: boolean;
  pendingProfileRef: MutableRefObject<PendingImageUpload | null>;
  onFormDataChange: (data: EditingItem) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function CategoryForm({
  activeTab,
  editingId,
  formData,
  loading,
  pendingProfileRef,
  onFormDataChange,
  onSave,
  onCancel,
}: CategoryFormProps) {
  const [availableRoles, setAvailableRoles] = useState<CompanyRole[]>([]);
  const t = useTranslations('AdminCategoriesPage');

  // Load company roles when on companies tab
  useEffect(() => {
    if (activeTab === 'companies') {
      console.log('🏷️ [CategoryForm] Loading company roles for companies tab...');
      listCompanyRoles()
        .then((result) => {
          setAvailableRoles(result.data || []);
          console.log(`✅ [CategoryForm] Loaded ${result.data?.length || 0} company roles`);
        })
        .catch((err) => {
          console.error('❌ [CategoryForm] Failed to load company roles:', err);
        });
    }
  }, [activeTab]);

  const toggleRole = (roleId: number) => {
    const currentRoles: number[] = formData.defaultRoleIds || [];
    const newRoles = currentRoles.includes(roleId)
      ? currentRoles.filter((id: number) => id !== roleId)
      : [...currentRoles, roleId];
    console.log(`🔄 [CategoryForm] Toggled role ${roleId}, new roles: [${newRoles}]`);
    onFormDataChange({ ...formData, defaultRoleIds: newRoles });
  };

  console.log(`🖊️ [CategoryForm] Rendering — tab=${activeTab}, editingId=${editingId}`);

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold mb-4">
        {editingId ? t('form.edit') : t('form.addNew')}
      </h2>

      <div className="space-y-4">
        {/* Name / Label field */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {activeTab === 'personRoles' ? t('form.label') : t('form.name')}
          </label>
          <input
            type="text"
            value={(activeTab === 'personRoles' ? formData.label : formData.name) || ''}
            onChange={(e) =>
              onFormDataChange({
                ...formData,
                [activeTab === 'personRoles' ? 'label' : 'name']: e.target.value,
              })
            }
            className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white"
            placeholder={activeTab === 'personRoles' ? t('form.phRole') : t('form.phName')}
          />
        </div>

        {/* Genres, Person Roles & Company Roles: ContentTypeId */}
        {(activeTab === 'personRoles' ||
          activeTab === 'genres' ||
          activeTab === 'companyRoles') && (
          <div>
            <label className="block text-sm font-medium mb-1">{t('form.contentType')}</label>
            <select
              value={formData.contentTypeId ?? ''}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  contentTypeId: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white"
            >
              <option value="">{t('form.allTypes')}</option>
              <option value="1">{t('form.movieTv')}</option>
              <option value="3">{t('form.game')}</option>
              <option value="4">{t('form.book')}</option>
            </select>
          </div>
        )}

        {/* Person-specific fields */}
        {activeTab === 'persons' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">{t('form.biography')}</label>
              <textarea
                value={formData.biography || ''}
                onChange={(e) => onFormDataChange({ ...formData, biography: e.target.value })}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white"
                placeholder={t('form.phBiography')}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('form.birthDate')}</label>
                <input
                  type="date"
                  value={formData.birthDate || ''}
                  onChange={(e) => onFormDataChange({ ...formData, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('form.deathDate')}</label>
                <input
                  type="date"
                  value={formData.deathDate || ''}
                  onChange={(e) => onFormDataChange({ ...formData, deathDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('form.gender')}</label>
                <select
                  value={formData.gender || ''}
                  onChange={(e) => onFormDataChange({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white"
                >
                  <option value="">{t('form.select')}</option>
                  <option value="male">{t('form.male')}</option>
                  <option value="female">{t('form.female')}</option>
                  <option value="other">{t('form.other')}</option>
                  <option value="unknown">{t('form.unknown')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('form.placeOfBirth')}</label>
                <input
                  type="text"
                  value={formData.placeOfBirth || ''}
                  onChange={(e) => onFormDataChange({ ...formData, placeOfBirth: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white"
                  placeholder={t('form.cityCountry')}
                />
              </div>
            </div>
            <div>
              <ImageUploadField
                label={t('form.profilePhoto')}
                name="profileUrl"
                value={formData.profileUrl || ''}
                onChange={(url) => onFormDataChange({ ...formData, profileUrl: url })}
                onPendingUpload={(pending) => {
                  pendingProfileRef.current = pending;
                }}
                imageType="person"
              />
            </div>
          </>
        )}

        {/* Company-specific fields */}
        {activeTab === 'companies' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">{t('form.description')}</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white"
                placeholder={t('form.phDescription')}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('form.headquarters')}</label>
                <input
                  type="text"
                  value={formData.headquarters || ''}
                  onChange={(e) => onFormDataChange({ ...formData, headquarters: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white"
                  placeholder={t('form.cityCountry')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('form.foundingYear')}</label>
                <input
                  type="number"
                  value={formData.foundingYear || ''}
                  onChange={(e) => onFormDataChange({ ...formData, foundingYear: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white"
                  placeholder={t('form.phYear')}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('form.website')}</label>
              <input
                type="url"
                value={formData.website || ''}
                onChange={(e) => onFormDataChange({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white"
                placeholder="https://..."
              />
            </div>
            <div>
              <ImageUploadField
                label={t('form.companyLogo')}
                name="logoUrl"
                value={formData.logoUrl || ''}
                onChange={(url) => onFormDataChange({ ...formData, logoUrl: url })}
                onPendingUpload={(pending) => {
                  pendingProfileRef.current = pending;
                }}
                imageType="company"
              />
            </div>

            {/* Company Roles */}
            {availableRoles.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">{t('form.companyRoles')}</label>
                <div className="flex flex-wrap gap-2">
                  {availableRoles.map((role) => {
                    const isSelected = (formData.defaultRoleIds || []).includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(role.id)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}
                        {role.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-1">{t('form.companyRolesDesc')}</p>
              </div>
            )}
          </>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('form.saving') : editingId ? t('form.updateBtn') : t('form.addBtn')}
          </button>
          {editingId && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
            >
              {t('form.cancelBtn')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
