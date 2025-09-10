import Image from 'next/image';
import { useState } from 'react';
import { AppUser } from '@/services/database/userService';
import { User } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface ProfileHeaderProps {
  user?: User | null;
  appUser: AppUser | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  handleFollow: () => void;
  handleUnfollow: () => void;
  isOwnProfile: boolean;
}

export default function ProfileHeader({
  user,
  appUser,
  followersCount,
  followingCount,
  isFollowing,
  handleFollow,
  handleUnfollow,
  isOwnProfile,
}: ProfileHeaderProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const { deleteAccount } = useAuth();
  const router = useRouter();

  const handleDeleteAccount = async () => {
    if (!confirm('Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz kalıcı olarak silinecektir.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const { success, error } = await deleteAccount();
      if (success) {
        console.log('✅ Hesap başarıyla silindi');
        router.push('/');
      } else {
        console.error('❌ Hesap silinirken hata oluştu:', error);
        alert('Hesap silinirken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } catch (e) {
      console.error('Hesap silinirken beklenmeyen hata:', e);
      alert('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setShowSettingsMenu(false);
    }
  };

  // Close settings menu when clicking outside
  const handleClickOutside = (event: React.MouseEvent) => {
    if (showSettingsMenu && !(event.target as Element).closest('.settings-menu')) {
      setShowSettingsMenu(false);
    }
  };

  return (
    <div className="bg-gray-900 border-b border-gray-800 px-6 py-4" onClick={handleClickOutside}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
              {appUser?.picture_path ? (
                <Image
                  src={appUser.picture_path}
                  alt="Profile"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : user?.user_metadata?.avatar_url ? (
                <Image
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold">
                  {(appUser?.username?.charAt(0) || user?.email?.charAt(0) || 'K').toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{appUser?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'kargalar'}</h2>
              <p className="text-gray-400 text-sm">{appUser?.bio || ' '}</p>
              <div className="flex space-x-4 mt-1">
                <p className="text-sm text-gray-400">
                  <span className="font-bold text-white">{followersCount}</span> Followers
                </p>
                <p className="text-sm text-gray-400">
                  <span className="font-bold text-white">{followingCount}</span> Following
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isOwnProfile && (
              <button
                onClick={isFollowing ? handleUnfollow : handleFollow}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isFollowing
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}
            {isOwnProfile && (
              <div className="relative settings-menu">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
                  title="Ayarlar"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>

                {showSettingsMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          // Profil düzenleme özelliği henüz implement edilmemiş
                          alert('Profil düzenleme özelliği yakında eklenecek!');
                          setShowSettingsMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        Profil Düzenle
                      </button>
                      <hr className="border-gray-700 my-1" />
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(true);
                          setShowSettingsMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900 hover:text-red-300 transition-colors"
                      >
                        Hesabı Sil
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Hesabı Sil</h3>
            <p className="text-gray-300 mb-6">
              Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz (yorumlar, takipçiler, içerikler) kalıcı olarak silinecektir.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                disabled={isDeleting}
              >
                İptal
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                disabled={isDeleting}
              >
                {isDeleting ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
