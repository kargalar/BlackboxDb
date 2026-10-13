'use client';

/**
 * Inline CompanyRole management section shown inside the Companies tab.
 * Allows creating, editing, and deleting company roles without switching tabs.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  listCompanyRoles,
  createCompanyRole,
  updateCompanyRole,
  deleteCompanyRole,
} from '@/services/adminService';

interface CompanyRole {
  id: number;
  name: string;
  contentTypeId?: number | null;
}

const CONTENT_TYPE_LABELS: Record<number, string> = {
  1: 'Film/Dizi',
  3: 'Oyun',
  4: 'Kitap',
};

export default function CompanyRolesSection() {
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleContentTypeId, setRoleContentTypeId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = useCallback((type: 'success' | 'error', text: string) => {
    console.log(`${type === 'success' ? '✅' : '❌'} [CompanyRolesSection] ${text}`);
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🏷️ [CompanyRolesSection] Loading company roles...');
      const result = await listCompanyRoles();
      setRoles(result.data || []);
      console.log(`✅ [CompanyRolesSection] Loaded ${result.data?.length || 0} roles`);
    } catch (error) {
      console.error('❌ [CompanyRolesSection] Error loading roles:', error);
      showMsg('error', 'Roller yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [showMsg]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleSaveRole = async () => {
    const name = roleName.trim();
    if (!name) {
      showMsg('error', 'Rol adı gerekli');
      return;
    }

    setLoading(true);
    try {
      const payload = { name, contentTypeId: roleContentTypeId ?? undefined };

      if (editingRoleId) {
        console.log(`✏️ [CompanyRolesSection] Updating role id=${editingRoleId}`);
        const result = await updateCompanyRole(editingRoleId, payload);
        if (result.error) {
          console.error('❌ [CompanyRolesSection] Update error:', result.error);
          showMsg('error', 'Güncelleme başarısız');
        } else {
          console.log(`✅ [CompanyRolesSection] Updated role id=${editingRoleId}`);
          showMsg('success', 'Rol güncellendi');
        }
      } else {
        console.log(`➕ [CompanyRolesSection] Creating role: ${name}`);
        const result = await createCompanyRole(payload);
        if (result.error) {
          console.error('❌ [CompanyRolesSection] Create error:', result.error);
          showMsg('error', 'Ekleme başarısız');
        } else {
          console.log(`✅ [CompanyRolesSection] Created new role`);
          showMsg('success', 'Rol eklendi');
        }
      }

      setEditingRoleId(null);
      setRoleName('');
      setRoleContentTypeId(null);
      loadRoles();
    } catch (error) {
      console.error('❌ [CompanyRolesSection] Save error:', error);
      showMsg('error', 'Kaydetme hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (role: CompanyRole) => {
    console.log(`✏️ [CompanyRolesSection] Editing role id=${role.id}`);
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleContentTypeId(role.contentTypeId ?? null);
  };

  const handleDeleteRole = async (id: number) => {
    if (
      !window.confirm(
        'Bu rolü silmek istediğinize emin misiniz? İlişkili içerik-şirket bağlantıları da silinecek.'
      )
    )
      return;

    setLoading(true);
    try {
      console.log(`🗑️ [CompanyRolesSection] Deleting role id=${id}`);
      const result = await deleteCompanyRole(id);
      if (result.error) {
        console.error('❌ [CompanyRolesSection] Delete error:', result.error);
        showMsg('error', 'Silme başarısız');
      } else {
        console.log(`✅ [CompanyRolesSection] Deleted role id=${id}`);
        showMsg('success', 'Rol silindi');
        loadRoles();
      }
    } catch (error) {
      console.error('❌ [CompanyRolesSection] Delete error:', error);
      showMsg('error', 'Silme hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingRoleId(null);
    setRoleName('');
    setRoleContentTypeId(null);
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">🏷️ Şirket Rolleri</h2>
        {message && (
          <span
            className={`text-sm px-3 py-1 rounded ${
              message.type === 'success'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {message.text}
          </span>
        )}
      </div>

      {/* Role form */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          className="flex-1 min-w-[150px] px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white text-sm"
          placeholder="Rol adı (ör: Yayıncı, Geliştirici...)"
        />
        <select
          value={roleContentTypeId ?? ''}
          onChange={(e) => setRoleContentTypeId(e.target.value ? parseInt(e.target.value) : null)}
          className="px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white text-sm"
        >
          <option value="">Tüm Türler</option>
          <option value="1">Film/Dizi</option>
          <option value="3">Oyun</option>
          <option value="4">Kitap</option>
        </select>
        <button
          onClick={handleSaveRole}
          disabled={loading}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '⏳' : editingRoleId ? '✅ Güncelle' : '➕ Ekle'}
        </button>
        {editingRoleId && (
          <button
            onClick={handleCancelEdit}
            className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-500"
          >
            İptal
          </button>
        )}
      </div>

      {/* Role list */}
      {loading && roles.length === 0 ? (
        <div className="text-center text-gray-400 py-4 text-sm">⏳ Yükleniyor...</div>
      ) : roles.length === 0 ? (
        <div className="text-center text-gray-400 py-4 text-sm">Henüz rol eklenmedi</div>
      ) : (
        <div className="space-y-1.5">
          {roles.map((role) => (
            <div
              key={role.id}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                editingRoleId === role.id
                  ? 'bg-blue-900/30 border-blue-500/50'
                  : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex-1">
                <span className="font-medium text-sm">{role.name}</span>
                {role.contentTypeId && (
                  <span className="ml-2 text-xs text-gray-400 bg-gray-700/50 px-2 py-0.5 rounded">
                    {CONTENT_TYPE_LABELS[role.contentTypeId] || `Tür ID: ${role.contentTypeId}`}
                  </span>
                )}
                {!role.contentTypeId && (
                  <span className="ml-2 text-xs text-gray-500">Tüm türler</span>
                )}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleEditRole(role)}
                  className="px-2.5 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => handleDeleteRole(role.id)}
                  className="px-2.5 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
