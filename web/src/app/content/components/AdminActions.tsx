'use client';
import React from 'react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { deleteContent } from '@/services/adminService';
import toast from 'react-hot-toast';

interface AdminActionsProps {
  id: string;
  type: string;
}

/** Admin edit/delete actions for privileged users */
const AdminActions: React.FC<AdminActionsProps> = ({ id, type }) => {
  const router = useRouter();
  const t = useTranslations('AdminActions');
  const [isDeleting, setIsDeleting] = useState(false);

  console.log('🛡️ [AdminActions] Rendered for content:', id);

  const handleDelete = async () => {
    if (confirm(t('confirmDelete'))) {
      setIsDeleting(true);
      try {
        console.log('🗑️ [AdminActions] Silme işlemi başlatılıyor:', id);
        const { error } = await deleteContent(id as any);

        if (error) {
          console.error('❌ [AdminActions] Silme hatası:', error);
          toast.error(t('deleteError'));
          return;
        }

        console.log('✅ [AdminActions] İçerik başarıyla silindi:', id);
        toast.success(t('deleteSuccess'));

        // Ensure we always route back to the correct plural/singular string based on standard route mapping
        const typeMap: Record<string, string> = {
          movies: 'movie',
          games: 'game',
          tvshows: 'tv',
          books: 'book',
        };
        const routeType = typeMap[type] || type;
        router.push(`/explore/${routeType}`);
      } catch (error: any) {
        console.error('❌ [AdminActions] Beklenmeyen hata:', error);
        toast.error(t('deleteError'));
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="glass-card p-5">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
        <span className="text-xl">⚙️</span>
        <span className="gradient-text">{t('title')}</span>
      </h3>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => {
            console.log('✏️ [AdminActions] Düzenle butonuna tıklandı, ID:', id);
            router.push(`/add-content?id=${id}` as any);
          }}
          className="w-full px-4 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-500 hover: transition-all text-sm font-medium flex items-center justify-center gap-2"
        >
          <span>✏️</span>
          <span>{t('edit')}</span>
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full px-4 py-2.5 bg-red-500/20 border border-red-500/50 text-red-400 rounded-xl hover:bg-red-500/30 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span>🗑️</span>
          <span>{isDeleting ? t('deleting') : t('delete')}</span>
        </button>
      </div>
    </div>
  );
};

export default AdminActions;
