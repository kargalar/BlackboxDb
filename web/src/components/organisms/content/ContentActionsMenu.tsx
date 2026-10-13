import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Edit, Flag, Image as ImageIcon, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ReportModal from '../ReportModal';
import ManageImagesModal from './ManageImagesModal';

import { useAuth } from '@/contexts/AuthContext';

interface ContentActionsMenuProps {
  contentId: string;
  contentTitle: string;
  contentType: string;
}

export default function ContentActionsMenu({
  contentId,
  contentTitle,
  contentType,
}: ContentActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isManageImagesOpen, setIsManageImagesOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null; // Sadece giriş yapmış kullanıcılar görebilir

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors border border-white/10"
        aria-label="İçerik Seçenekleri"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden z-40">
          <button
            onClick={() => {
              setIsOpen(false);
              router.push(`/edit-content/${contentType}/${contentId}`);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-left"
          >
            <Edit className="w-4 h-4" />
            İçeriği Düzenle
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              router.push(`/content/${contentType}/${contentId}/history`);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-left border-t border-gray-800"
          >
            <History className="w-4 h-4" />
            Düzenleme Geçmişi
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              setIsManageImagesOpen(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-left border-t border-gray-800"
          >
            <ImageIcon className="w-4 h-4" />
            Resimleri Yönet
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              setIsReportModalOpen(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-colors text-left border-t border-gray-800"
          >
            <Flag className="w-4 h-4" />
            Raporla
          </button>
        </div>
      )}

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetId={contentId}
        targetType="CONTENT"
        targetTitle={contentTitle}
      />

      <ManageImagesModal
        isOpen={isManageImagesOpen}
        onClose={() => setIsManageImagesOpen(false)}
        contentId={contentId}
        contentType={contentType}
        contentTitle={contentTitle}
      />
    </div>
  );
}
