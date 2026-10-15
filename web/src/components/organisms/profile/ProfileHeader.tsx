import Image from 'next/image';
import { useState, useRef } from 'react';
import { AppUser } from '@/services/database/userService';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { uploadProfilePicture, uploadCoverPhoto } from '@/services/profileUploadService';
import EditProfileDialog from './EditProfileDialog';
import { ImageCropModal } from '@/components/molecules/ImageCropModal';
import { useTranslations } from 'next-intl';
import { BarChart3 } from 'lucide-react';

interface ProfileHeaderProps {
  user?: { id: string; username: string; email: string; picturePath?: string | null } | null;
  appUser: AppUser | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  handleFollow: () => void;
  handleUnfollow: () => void;
  isOwnProfile: boolean;
  onProfilePictureUpdated?: (newUrl: string) => void;
  consumedCounts?: {
    movies: number;
    tv: number;
    games: number;
    books: number;
  };
  onTabChange?: (tab: string) => void;
  onEditFeatured?: () => void;
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
  onProfilePictureUpdated,
  consumedCounts,
  onTabChange,
  onEditFeatured,
}: ProfileHeaderProps) {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [coverCropFile, setCoverCropFile] = useState<File | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { deleteAccount } = useAuth();
  const router = useRouter();
  const t = useTranslations('ProfileHeader');

  const handleAvatarFileSelected = async (file: File | null) => {
    if (!file) return;
    if (!isOwnProfile) return;

    setCropFile(file);
  };

  const handleDeleteAccount = async () => {
    if (!confirm(t('deleteConfirmDesc'))) {
      return;
    }

    setIsDeleting(true);
    try {
      const { success, error } = await deleteAccount();
      if (success) {
        router.push('/');
      } else {
        alert(t('errors.deleteError'));
      }
    } catch (e) {
      alert(t('errors.unexpected'));
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setShowSettingsMenu(false);
    }
  };

  const displayName =
    appUser?.username || user?.username || user?.email?.split('@')[0] || t('defaultUser');
  const avatarUrl = appUser?.picturePath || (isOwnProfile ? user?.picturePath : null);
  const bannerUrl = appUser?.coverPhotoUrl || null;
  const hasAnyConsumed = Boolean(
    consumedCounts &&
      (consumedCounts.movies > 0 ||
        consumedCounts.tv > 0 ||
        consumedCounts.games > 0 ||
        consumedCounts.books > 0)
  );

  return (
    <div className="profile-header relative">
      {/* Cover Photo Banner — fills width naturally without breakout hack */}
      <div className="profile-cover relative w-full aspect-[64/5] bg-violet-900/40 overflow-hidden">
        {bannerUrl && (
          <>
            <Image src={bannerUrl} alt={t('coverPhoto')} fill className="object-cover" priority />
            {/* Dark gradient overlay — similar to content backdrop */}
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute inset-0 bg-black/30" />
          </>
        )}
        {isUploadingCover && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <svg
              className="animate-spin h-10 w-10 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
        {isOwnProfile && (
          <>
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white text-xs rounded-lg border border-white/20 transition-all cursor-pointer z-10"
            >
              📷 {bannerUrl ? t('changeCover') : t('addCover')}
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setCoverCropFile(file);
                e.target.value = '';
              }}
            />
          </>
        )}
      </div>

      {/* Profile Info Container */}
      <div className="profile-identity-shell max-w-7xl mx-auto px-6 py-8 relative">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
          {/* Avatar */}
          <div className="profile-avatar relative">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={displayName} fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-violet-500 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Loading Overlay */}
            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <svg
                    className="animate-spin h-8 w-8 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="text-xs text-white font-medium">{t('loading')}</span>
                </div>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 pb-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-5 flex-wrap">
                  <h1 className="text-3xl font-bold text-white">{displayName}</h1>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-bold text-white">{followersCount}</span>
                      <span className="text-sm text-white/50">{t('followers')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-bold text-white">{followingCount}</span>
                      <span className="text-sm text-white/50">{t('following')}</span>
                    </div>
                    {appUser?.contributionScore !== undefined && (
                      <button
                        onClick={() => onTabChange && onTabChange('Contributions')}
                        className="flex items-center gap-1.5 px-2.5 py-0.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 hover:border-yellow-500/40 rounded-full ml-2 transition-all cursor-pointer"
                        title={t('contributionScore')}
                      >
                        <span className="text-sm">🏆</span>
                        <span className="text-sm font-bold text-yellow-500">
                          {appUser.contributionScore}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
                {appUser?.bio && <p className="text-white/60 mt-1 max-w-lg">{appUser.bio}</p>}

                {/* Location and Website */}
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  {appUser?.location && (
                    <div className="flex items-center gap-1.5 text-white/50 text-sm">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>{appUser.location}</span>
                    </div>
                  )}
                  {appUser?.website && (
                    <a
                      href={
                        appUser.website.startsWith('http')
                          ? appUser.website
                          : `https://${appUser.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 text-sm transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                      <span className="break-all">
                        {appUser.website.replace(/^https?:\/\//, '')}
                      </span>
                    </a>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 md:ml-auto">
                {!isOwnProfile ? (
                  <button
                    onClick={isFollowing ? handleUnfollow : handleFollow}
                    className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
                      isFollowing ? 'btn-secondary' : 'btn-gradient'
                    }`}
                  >
                    {isFollowing ? t('unfollow') : t('follow')}
                  </button>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                      className="btn-icon"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>

                    {showSettingsMenu && (
                      <div className="absolute right-0 mt-2 w-56 glass-card overflow-hidden z-50">
                        <label className="block cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isUploadingAvatar}
                            onChange={(e) => {
                              handleAvatarFileSelected(e.target.files?.[0] ?? null);
                              setShowSettingsMenu(false);
                            }}
                          />
                          <div className="px-4 py-3 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            {isUploadingAvatar ? t('loading') : t('changeAvatar')}
                          </div>
                        </label>
                        <button
                          onClick={() => {
                            setShowEditDialog(true);
                            setShowSettingsMenu(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          {t('editProfile')}
                        </button>
                        <button
                          onClick={() => {
                            if (onEditFeatured) onEditFeatured();
                            setShowSettingsMenu(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          {t('editFeatured')}
                        </button>
                        <hr className="border-white/10" />
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(true);
                            setShowSettingsMenu(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          {t('deleteAccount')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Consumed Counts */}
            {consumedCounts && hasAnyConsumed && (
              <div className="flex flex-wrap gap-2 mt-4">
                {consumedCounts.movies > 0 && (
                  <button
                    onClick={() => onTabChange?.('Movies')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl backdrop-blur-md transition-colors cursor-pointer"
                  >
                    <span className="text-sm drop-shadow-md">🎬</span>
                    <span className="text-sm font-bold text-white">{consumedCounts.movies}</span>
                    <span className="text-sm font-medium text-white/60">{t('content.movie')}</span>
                  </button>
                )}
                {consumedCounts.tv > 0 && (
                  <button
                    onClick={() => onTabChange?.('TV')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl backdrop-blur-md transition-colors cursor-pointer"
                  >
                    <span className="text-sm drop-shadow-md">📺</span>
                    <span className="text-sm font-bold text-white">{consumedCounts.tv}</span>
                    <span className="text-sm font-medium text-white/60">{t('content.tv')}</span>
                  </button>
                )}
                {consumedCounts.games > 0 && (
                  <button
                    onClick={() => onTabChange?.('Games')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl backdrop-blur-md transition-colors cursor-pointer"
                  >
                    <span className="text-sm drop-shadow-md">🎮</span>
                    <span className="text-sm font-bold text-white">{consumedCounts.games}</span>
                    <span className="text-sm font-medium text-white/60">{t('content.game')}</span>
                  </button>
                )}
                {consumedCounts.books > 0 && (
                  <button
                    onClick={() => onTabChange?.('Books')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl backdrop-blur-md transition-colors cursor-pointer"
                  >
                    <span className="text-sm drop-shadow-md">📚</span>
                    <span className="text-sm font-bold text-white">{consumedCounts.books}</span>
                    <span className="text-sm font-medium text-white/60">{t('content.book')}</span>
                  </button>
                )}
                {onTabChange && (
                  <button
                    onClick={() => onTabChange('Stats')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl backdrop-blur-md transition-colors cursor-pointer text-white/80 hover:text-white"
                  >
                    <BarChart3 className="w-4 h-4 text-violet-400" aria-hidden="true" />
                    <span className="text-sm font-medium">{t('viewStats')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">{t('deleteConfirmTitle')}</h3>
            <p className="text-white/60 mb-6">{t('deleteConfirmDesc')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 btn-secondary"
                disabled={isDeleting}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors"
                disabled={isDeleting}
              >
                {isDeleting ? t('deleting') : t('yesDelete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Dialog */}
      {appUser && (
        <EditProfileDialog
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          user={appUser}
          onProfileUpdated={(updates) => {
            console.log('✅ [ProfileHeader] Profile updated:', updates);
            if (updates.username && updates.username !== appUser.username) {
              router.push(`/profile/${updates.username}`);
            } else {
              // Reload the page to reflect changes
              window.location.reload();
            }
          }}
        />
      )}

      {/* Profile Avatar Crop Modal */}
      {cropFile && (
        <ImageCropModal
          isOpen={true}
          onClose={() => setCropFile(null)}
          imageFile={cropFile}
          imageType="profile"
          onCropComplete={async (croppedImageBase64) => {
            setCropFile(null); // Close modal first
            setIsUploadingAvatar(true);
            try {
              // Convert base64 to File
              const res = await fetch(croppedImageBase64);
              const blob = await res.blob();
              const file = new File([blob], cropFile.name, { type: 'image/jpeg' });

              const { url, error } = await uploadProfilePicture(file);
              if (error || !url) {
                console.error('❌ [ProfileHeader] Avatar upload failed:', error);
                alert(t('errors.avatarUpload'));
                return;
              }

              console.log('✅ [ProfileHeader] Avatar updated:', url);
              onProfilePictureUpdated?.(url);
            } catch (e) {
              console.error('Unexpected error during avatar upload:', e);
              alert(t('errors.avatarUploadUnexpected'));
            } finally {
              setIsUploadingAvatar(false);
            }
          }}
        />
      )}

      {/* Cover Photo Crop Modal */}
      {coverCropFile && (
        <ImageCropModal
          isOpen={true}
          onClose={() => setCoverCropFile(null)}
          imageFile={coverCropFile}
          imageType="cover"
          onCropComplete={async (croppedImageBase64) => {
            setCoverCropFile(null);
            setIsUploadingCover(true);
            try {
              const res = await fetch(croppedImageBase64);
              const blob = await res.blob();
              const file = new File([blob], coverCropFile.name, { type: 'image/jpeg' });

              const { url, error } = await uploadCoverPhoto(file);
              if (error || !url) {
                console.error('❌ [ProfileHeader] Cover photo upload failed:', error);
                alert(t('errors.coverUpload'));
                return;
              }

              console.log('✅ [ProfileHeader] Cover photo updated:', url);
              window.location.reload();
            } catch (e) {
              console.error('Unexpected error during cover photo upload:', e);
              alert(t('errors.coverUploadUnexpected'));
            } finally {
              setIsUploadingCover(false);
            }
          }}
        />
      )}
    </div>
  );
}
