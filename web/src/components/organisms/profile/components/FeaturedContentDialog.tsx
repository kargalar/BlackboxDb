import Image from 'next/image';
import type { Content } from '@/types/content';
import type { FeaturedType } from '../HomeTabTypes';
import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';

interface FeaturedContentDialogProps {
  featuredType: FeaturedType;
  setFeaturedType: (type: FeaturedType) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedContentIds: string[];
  toggleContentSelection: (contentId: string) => void;
  filteredContent: Content[];
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
  // Drag & drop
  getSelectedContentItems: () => any[];
  draggedId: string | null;
  dragOverId: string | null;
  handleDragStart: (e: React.DragEvent, contentId: string) => void;
  handleDragOver: (e: React.DragEvent, contentId: string) => void;
  handleDragEnd: () => void;
  handleDrop: (e: React.DragEvent, targetId: string) => void;
}

/** Modal dialog for selecting & ordering featured content */
export default function FeaturedContentDialog({
  featuredType,
  setFeaturedType,
  searchQuery,
  setSearchQuery,
  selectedContentIds,
  toggleContentSelection,
  filteredContent,
  isSaving,
  onSave,
  onClose,
  getSelectedContentItems,
  draggedId,
  dragOverId,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  handleDrop,
}: FeaturedContentDialogProps) {
  console.log(
    `✏️ [FeaturedContentDialog] Open — type=${featuredType}, selected=${selectedContentIds.length}, filtered=${filteredContent.length}`
  );

  const { settings } = useGlobalSettings();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Öne Çıkarılan İçerikleri Düzenle</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content Type Tabs */}
          <div className="flex space-x-1 mt-4 bg-gray-800 p-1 rounded-lg">
            {[
              { key: 'movies' as FeaturedType, label: 'Filmler' },
              { key: 'tv' as FeaturedType, label: 'TV/Dizi' },
              { key: 'games' as FeaturedType, label: 'Oyunlar' },
              ...(settings?.isBookEnabled !== false
                ? [{ key: 'books' as FeaturedType, label: 'Kitaplar' }]
                : []),
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFeaturedType(key)}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  featuredType === key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="İçerik ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <p className="text-sm text-gray-400 mt-2">
            Seçili: {selectedContentIds.length}/5 (Tükettiğiniz içeriklerden en fazla 5 tane
            seçebilirsiniz)
          </p>

          {/* Selected Content Reorder Section */}
          {selectedContentIds.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Sıralamayı değiştirmek için sürükleyin:</p>
              <div className="flex gap-2 flex-wrap">
                {getSelectedContentItems().map((content: any, index: number) => {
                  const contentId = content.id.toString();
                  const posterUrl = content.poster_path || content.posterUrl;
                  const isDragging = draggedId === contentId;
                  const isDragOver = dragOverId === contentId;

                  return (
                    <div
                      key={contentId}
                      draggable
                      onDragStart={(e) => handleDragStart(e, contentId)}
                      onDragOver={(e) => handleDragOver(e, contentId)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, contentId)}
                      className={`relative w-16 h-24 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
                        isDragging ? 'opacity-50 scale-95' : ''
                      } ${isDragOver ? 'ring-2 ring-blue-400' : ''}`}
                    >
                      {/* Order number badge */}
                      <div className="absolute top-1 left-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white z-10">
                        {index + 1}
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleContentSelection(contentId);
                        }}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-xs text-white z-10 transition-colors"
                      >
                        ×
                      </button>

                      {posterUrl ? (
                        <Image
                          src={posterUrl}
                          alt={content.title || ''}
                          fill
                          className="object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-500 text-[8px] text-center px-1">
                            {content.title}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredContent.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>Tükettiğiniz içerik bulunamadı.</p>
              <p className="text-sm mt-2">
                Önce içerik izleyin/okuyun/oynayın, sonra öne çıkarabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {filteredContent.map((content) => {
                const isSelected = selectedContentIds.includes(content.id.toString());
                const posterUrl = (content as any).poster_path || content.posterUrl;

                return (
                  <button
                    key={content.id}
                    onClick={() => toggleContentSelection(content.id.toString())}
                    className={`relative aspect-[2/3] rounded-lg overflow-hidden transition-all ${
                      isSelected
                        ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    {posterUrl ? (
                      <Image
                        src={posterUrl}
                        alt={content.title || ''}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-500 text-xs text-center px-2">
                          {content.title}
                        </span>
                      </div>
                    )}

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Title overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2">
                      <p className="text-xs text-white truncate">{content.title}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            İptal
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
