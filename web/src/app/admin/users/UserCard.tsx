import Link from 'next/link';
import { Crown, ShieldCheck, Trash2 } from 'lucide-react';
import type { AdminUser } from '@/services/graphql/admin';
import UserRoleBadge from './UserRoleBadge';
import { useTranslations, useLocale } from 'next-intl';

function formatDate(dateString: string, locale: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default function UserCard({
  user,
  onToggleRole,
  onDelete,
}: {
  user: AdminUser;
  onToggleRole: (role: 'isAdmin' | 'isModerator') => void;
  onDelete: () => void;
}) {
  const initials = user.username.charAt(0).toUpperCase();
  const t = useTranslations('AdminUsersPage');
  const locale = useLocale();

  return (
    <div className="group bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-all duration-200">
      <div className="flex items-center gap-4">
        {/* Clickable user info → profile */}
        <Link href={`/profile/${user.username}`} className="flex items-center gap-4 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-11 h-11 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-sm">{initials}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white truncate group-hover:text-violet-400 transition-colors">
                {user.username}
              </span>
              {user.isAdmin && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  ADMIN
                </span>
              )}
              {user.isModerator && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-violet-500/20 text-violet-400 border border-violet-500/30">
                  MOD
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-white/40 truncate">{user.email}</span>
              <span className="text-white/20">·</span>
              <span className="text-xs text-white/30 flex-shrink-0">
                {formatDate(user.createdAt, locale)}
              </span>
            </div>
          </div>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <UserRoleBadge
            label="Admin"
            active={!!user.isAdmin}
            icon={Crown}
            color="amber"
            onToggle={() => onToggleRole('isAdmin')}
          />
          <UserRoleBadge
            label="Mod"
            active={!!user.isModerator}
            icon={ShieldCheck}
            color="violet"
            onToggle={() => onToggleRole('isModerator')}
          />
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200"
            title={t('deleteUserTitle')}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
