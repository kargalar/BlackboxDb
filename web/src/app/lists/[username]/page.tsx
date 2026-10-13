'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ListsTab from '@/components/organisms/profile/ListsTab';

export default function UserListsPage() {
  const params = useParams();
  const username = params.username as string;
  const { user } = useAuth();
  const isOwnProfile = user?.username === username;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <ListsTab username={username} isOwnProfile={isOwnProfile} />
    </div>
  );
}
