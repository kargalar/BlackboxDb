import Image from 'next/image';
import { AppUser } from '@/services/database/userService';
import { User } from '@supabase/supabase-js';

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
  return (
    <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
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
        </div>
      </div>
    </div>
  );
}
