'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getCurrentUserProfile } from '@/services/database/userService';
import { listUsers, updateUserRoles, deleteUser } from '@/services/adminService';
import type { AdminUser } from '@/services/graphql/admin';
import { Search, Users } from 'lucide-react';
import UserCard from './UserCard';
import { useTranslations } from 'next-intl';

export default function AdminUsersPage() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const loadRequestId = useRef(0);
  const t = useTranslations('AdminUsersPage');

  const load = useCallback(async (searchTerm: string) => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    try {
      const prof = await getCurrentUserProfile();
      if (requestId !== loadRequestId.current) return;

      const can = !!prof.data?.isAdmin || !!prof.data?.isModerator;
      setAllowed(can);
      if (!can) {
        setItems([]);
        return;
      }

      const { data } = await listUsers({ search: searchTerm });
      if (requestId === loadRequestId.current) {
        setItems(data ?? []);
      }
    } catch (error) {
      console.error('Failed to load admin users:', error);
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load('');
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load(search.trim());
  };

  const toggleRole = async (u: AdminUser, role: 'isAdmin' | 'isModerator') => {
    const val = !u[role];
    const { error } = await updateUserRoles(u.authUserId, { [role]: val });
    if (!error) {
      setItems((prev) =>
        prev.map((x) => (x.authUserId === u.authUserId ? { ...x, [role]: val } : x))
      );
    } else {
      alert(t('roleUpdateFailed'));
    }
  };

  const remove = (u: AdminUser) => {
    setPendingDelete(u);
    setDeleteConfirmText('');
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    if (deleteConfirmText.trim() !== pendingDelete.username) return;

    setDeletingUserId(pendingDelete.authUserId);
    const deletingId = pendingDelete.authUserId;
    const { error } = await deleteUser(deletingId);
    setDeletingUserId(null);

    if (!error) {
      setItems((prev) => prev.filter((x) => x.authUserId !== deletingId));
      setPendingDelete(null);
      setDeleteConfirmText('');
    } else {
      alert(t('userDeleteFailed'));
    }
  };

  if (!loading && !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-3xl font-bold text-red-300">!</span>
          </div>
          <h1 className="text-xl font-bold mb-2">{t('accessDenied')}</h1>
          <p className="text-white/50">{t('accessDeniedDesc')}</p>
        </div>
      </div>
    );
  }

  const adminCount = items.filter((u) => u.isAdmin).length;
  const modCount = items.filter((u) => u.isModerator).length;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Users size={20} className="text-violet-400" />
              </div>
              {t('title')}
            </h1>
            {!loading && (
              <p className="text-white/40 text-sm mt-2 ml-[52px]">
                {t('stats', { count: items.length, admin: adminCount, mod: modCount })}
              </p>
            )}
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm"
          >
            {t('backToAdmin')}
          </Link>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPh')}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-violet-600/80 text-white text-sm font-medium hover:bg-violet-600 transition-colors"
          >
            {t('searchBtn')}
          </button>
        </form>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <Users size={28} className="text-white/30" />
            </div>
            <p className="text-white/50">{search ? t('noResults') : t('noUsers')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((u) => (
              <UserCard
                key={u.authUserId}
                user={u}
                onToggleRole={(role) => toggleRole(u, role)}
                onDelete={() => remove(u)}
              />
            ))}
          </div>
        )}
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-red-500/20 bg-surface-panel p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white">{t('deleteTitle')}</h2>
            <p className="mt-2 text-sm text-white/60">
              {t('deleteWarning').replace('{username}', pendingDelete.username)}
            </p>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
              <p className="font-medium text-white">{t('deleteDataLabel')}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>{t('deleteData1')}</li>
                <li>{t('deleteData2')}</li>
                <li>{t('deleteData3')}</li>
                <li>{t('deleteData4')}</li>
              </ul>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm text-white/70">
                {t('deleteConfirmLabel')}
                <span className="font-semibold text-white">{pendingDelete.username}</span>
              </label>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={pendingDelete.username}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-red-400/50 focus:bg-white/[0.07]"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (deletingUserId) return;
                  setPendingDelete(null);
                  setDeleteConfirmText('');
                }}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                {t('cancelBtn')}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={
                  deletingUserId === pendingDelete.authUserId ||
                  deleteConfirmText.trim() !== pendingDelete.username
                }
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-900/40 disabled:text-white/40"
              >
                {deletingUserId === pendingDelete.authUserId ? t('deletingBtn') : t('deleteBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
