import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AppUser } from '@/services/database/userService';

interface NetworkTabProps {
  followers: AppUser[];
  following: AppUser[];
}

const UserCard = ({ user }: { user: AppUser }) => (
  <Link href={`/profile/${user.username}`}>
    <div className="bg-gray-900 rounded-lg p-4 flex items-center space-x-4 hover:bg-gray-800 transition-colors">
      <div className="w-12 h-12 bg-gray-700 rounded-full flex-shrink-0 overflow-hidden">
        {user.picture_path ? (
          <Image src={user.picture_path} alt={user.username} width={48} height={48} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white font-semibold flex items-center justify-center h-full">
            {user.username.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div>
        <p className="font-bold text-white">{user.username}</p>
        <p className="text-sm text-gray-400">{user.bio}</p>
      </div>
    </div>
  </Link>
);

export default function NetworkTab({ followers, following }: NetworkTabProps) {
  const [activeSubTab, setActiveSubTab] = useState('Followers');

  return (
    <div>
      <div className="flex space-x-4 border-b border-gray-700 mb-6">
        <button
          onClick={() => setActiveSubTab('Followers')}
          className={`pb-2 px-1 font-medium ${activeSubTab === 'Followers' ? 'border-b-2 border-white text-white' : 'text-gray-400'}`}
        >
          Followers ({followers.length})
        </button>
        <button
          onClick={() => setActiveSubTab('Following')}
          className={`pb-2 px-1 font-medium ${activeSubTab === 'Following' ? 'border-b-2 border-white text-white' : 'text-gray-400'}`}
        >
          Following ({following.length})
        </button>
      </div>

      <div>
        {activeSubTab === 'Followers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {followers.length > 0 ? (
              followers.map((user) => <UserCard key={user.auth_user_id} user={user} />)
            ) : (
              <p className="text-gray-400">No followers yet.</p>
            )}
          </div>
        )}
        {activeSubTab === 'Following' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {following.length > 0 ? (
              following.map((user) => <UserCard key={user.auth_user_id} user={user} />)
            ) : (
              <p className="text-gray-400">Not following anyone yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
