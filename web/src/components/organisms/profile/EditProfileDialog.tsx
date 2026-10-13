'use client';

import { useState } from 'react';
import { AppUser, updateUserProfile } from '@/services/database/userService';
import { useTranslations } from 'next-intl';

interface EditProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser;
  onProfileUpdated: (updatedUser: Partial<AppUser>) => void;
}

export default function EditProfileDialog({
  isOpen,
  onClose,
  user,
  onProfileUpdated,
}: EditProfileDialogProps) {
  const [username, setUsername] = useState(user.username || '');
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [website, setWebsite] = useState(user.website || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('ProfileEditDialog');

  if (!isOpen) return null;

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);

    try {
      const updates: Partial<AppUser> = {};

      // Only include changed fields
      if (username !== user.username) {
        if (username.length < 3) {
          setError(t('errors.usernameLength'));
          setIsSaving(false);
          return;
        }
        updates.username = username;
      }
      if (bio !== user.bio) updates.bio = bio || null;
      if (location !== user.location) updates.location = location || null;
      if (website !== user.website) updates.website = website || null;

      if (Object.keys(updates).length === 0) {
        console.log('ℹ️ No changes to save');
        onClose();
        return;
      }

      console.log('💾 Saving profile changes:', updates);
      const result = await updateUserProfile(updates);

      if (result.success) {
        console.log('✅ Profile updated successfully');
        onProfileUpdated(updates);
        onClose();
      } else {
        setError(t('errors.updateError'));
      }
    } catch (err: any) {
      console.error('❌ Error updating profile:', err);
      setError(t('errors.unexpected'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">{t('title')}</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">{t('username')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('usernamePlaceholder')}
              maxLength={30}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">{t('bio')}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('bioPlaceholder')}
              rows={4}
              maxLength={300}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
            <div className="text-right text-xs text-white/40 mt-1">
              {t('characters', { length: bio.length })}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">{t('location')}</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('locationPlaceholder')}
              maxLength={100}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">{t('website')}</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              maxLength={200}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <p className="text-xs text-white/40 mt-1">{t('websiteHelper')}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-white/80 hover:text-white transition-colors"
            disabled={isSaving}
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
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
                {t('saving')}
              </span>
            ) : (
              t('save')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
