'use client';

import { type ComponentType, type SVGProps } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import type { Route } from 'next';
import { Music, TrendingUp, Network } from 'lucide-react';
import {
  FilmIcon,
  TvIcon,
  GamepadIcon,
  BookIcon,
  SettingsIcon,
  SearchIcon,
  SparklesIcon,
  ListIcon,
  TrophyIcon,
  HomeIcon,
  RequestIcon,
  InboxIcon,
  BellIcon,
  DiscussionIcon,
  ClockIcon,
  UserIcon,
  BuildingIcon,
  LeaderboardIcon,
} from '../atoms/icons/SidebarIcons';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/useUnreadNotificationsCount';
import { useUnthankedRecommendationsCount } from '@/features/recommendations/hooks/useUnthankedRecommendationsCount';
import { usePendingContentRequestsCount } from '@/features/admin/hooks/usePendingContentRequestsCount';
import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';

// Logout Icon
const LogoutIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
    />
  </svg>
);

// Menu Toggle Icon
const MenuIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen: isOpenProp = true, onClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useSidebarCollapsed();
  const pathname = usePathname();
  const router = useRouter();
  const { user, isPrivileged, signOut } = useAuth();
  const t = useTranslations('Sidebar');
  const { preferredContentTypes } = useUserPreferences();
  const { count: unreadNotifications } = useUnreadNotificationsCount();
  const { count: unthankedRecommendations } = useUnthankedRecommendationsCount();
  const { count: pendingContentRequests } = usePendingContentRequestsCount();
  const { settings } = useGlobalSettings();

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const mainNavItems: Array<{
    href: Route;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    label: string;
  }> = [];

  // Content type items filtered by user preferences (id: 1=movie, 2=tv, 3=game, 4=book, 5=music)
  const allContentItems: {
    href: Route;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    label: string;
    typeId?: number;
  }[] = [
    { href: '/explore/movie' as Route, icon: FilmIcon, label: t('movies'), typeId: 1 },
    { href: '/explore/tv' as Route, icon: TvIcon, label: t('tvShows'), typeId: 2 },
    { href: '/explore/game' as Route, icon: GamepadIcon, label: t('games'), typeId: 3 },
    ...(settings?.isBookEnabled !== false
      ? [{ href: '/explore/book' as Route, icon: BookIcon, label: t('books'), typeId: 4 }]
      : []),
    { href: '/explore/music' as Route, icon: Music, label: t('music'), typeId: 5 },
    { href: '/explore/person' as Route, icon: UserIcon, label: t('people') },
    { href: '/explore/company' as Route, icon: BuildingIcon, label: t('companies') },
  ];
  const contentNavItems = [
    ...allContentItems.filter(
      (item) => !item.typeId || preferredContentTypes.includes(item.typeId)
    ),
    { href: '/discussions' as Route, icon: DiscussionIcon, label: t('discussions') },
    { href: '/lists' as Route, icon: ListIcon, label: t('lists') },
  ];

  const userNavItems = user
    ? [
        { href: '/recommended' as Route, icon: InboxIcon, label: t('recommended') },
        { href: '/notifications' as Route, icon: BellIcon, label: t('notifications') },
        { href: '/tv-tracker' as Route, icon: ClockIcon, label: t('episodeTracker') },
        {
          href: '/content-request' as Route,
          icon: RequestIcon,
          label: t('requestContent'),
        },
        { href: '/settings' as Route, icon: SettingsIcon, label: t('settings') },
      ]
    : [];

  const adminNavItems =
    user && (isPrivileged || user.isAdmin || user.isModerator)
      ? [
          { href: '/admin' as Route, icon: SparklesIcon, label: t('admin') },
          { href: '/add-content' as Route, icon: ListIcon, label: t('addContent') },
          {
            href: '/admin/content-requests' as Route,
            icon: InboxIcon,
            label: t('pendingRequests'),
          },
          {
            href: '/admin/activity' as Route,
            icon: ClockIcon,
            label: t('activityLogs') || 'Activity Logs',
          },
        ]
      : [];

  const otherNavItems = [
    { href: '/leaderboard' as Route, icon: LeaderboardIcon, label: t('leaderboard') },
    { href: '/lists/dynamic' as Route, icon: TrendingUp as any, label: 'Dynamic Lists' },
    { href: '/quiz' as Route, icon: TrophyIcon, label: t('quiz') },
    { href: '/movie-finder' as Route, icon: SearchIcon, label: t('movieFinder') },
    { href: '/citation-network' as Route, icon: Network as any, label: 'Film Citation Network' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`sidebar hidden lg:flex ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Header - Logo & Toggle */}
        <div className="sidebar-logo justify-between">
          <Link
            href="/"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-opacity hover:opacity-80"
          >
            <Image src="/icon.svg" alt="Blackbox" width={40} height={40} unoptimized />
          </Link>

          <button
            onClick={toggleCollapsed}
            className="sidebar-toggle-btn w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-white flex-shrink-0"
            title={isCollapsed ? t('actions.pinMenu') : t('actions.autoHideMenu')}
            aria-label={isCollapsed ? t('actions.pinMenu') : t('actions.autoHideMenu')}
            aria-expanded={!isCollapsed}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={isCollapsed ? 'none' : 'currentColor'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? '-rotate-45 text-white/60' : 'rotate-45 text-white'}`}
            >
              <line x1="12" y1="17" x2="12" y2="22"></line>
              <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-6 0v4.68a2 2 0 0 1-1.11 1.87l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav scrollbar-thin" aria-label={t('sections.content')}>
          {/* Main */}
          <div className="mb-2">
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-item relative ${isActive(item.href) ? 'active' : ''}`}
                title={isCollapsed ? item.label : undefined}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                <item.icon className="sidebar-nav-icon" />
                <span className="sidebar-text">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Content Types */}
          <div className="sidebar-section-title">{t('sections.content')}</div>
          {contentNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item relative ${isActive(item.href) ? 'active' : ''}`}
              title={isCollapsed ? item.label : undefined}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              <item.icon className="sidebar-nav-icon" />
              <span className="sidebar-text">{item.label}</span>
            </Link>
          ))}

          {/* Other Section */}
          <div className="sidebar-section-title">{t('sections.other')}</div>
          {otherNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item relative ${isActive(item.href) ? 'active' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="sidebar-nav-icon" />
              <span className="sidebar-text">{item.label}</span>
            </Link>
          ))}

          {/* User Section */}
          {user && (
            <>
              <div className="sidebar-section-title">{t('sections.account')}</div>
              {userNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item relative ${isActive(item.href) ? 'active' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  <item.icon className="sidebar-nav-icon" />
                  <span className="sidebar-text">{item.label}</span>
                  {item.href === '/notifications' && user && unreadNotifications > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 h-5 min-w-5 px-1 rounded-full bg-red-600 text-white text-[11px] flex items-center justify-center sidebar-badge">
                      {unreadNotifications}
                    </span>
                  )}
                  {item.href === '/recommended' && user && unthankedRecommendations > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 h-5 min-w-5 px-1 rounded-full bg-red-600 text-white text-[11px] flex items-center justify-center sidebar-badge">
                      {unthankedRecommendations}
                    </span>
                  )}
                </Link>
              ))}
            </>
          )}

          {/* Admin Section */}
          {adminNavItems.length > 0 && (
            <>
              <div className="sidebar-section-title">{t('sections.management')}</div>
              {adminNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item relative ${isActive(item.href) ? 'active' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  <item.icon className="sidebar-nav-icon" />
                  <span className="sidebar-text">{item.label}</span>
                  {item.href === '/admin/content-requests' && pendingContentRequests > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 h-5 min-w-5 px-1 rounded-full bg-red-600 text-white text-[11px] flex items-center justify-center sidebar-badge">
                      {pendingContentRequests}
                    </span>
                  )}
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* Language Switcher */}

        {/* Footer - User Info & Logout */}
        <div className="sidebar-footer">
          {user ? (
            <div className="flex items-center gap-2 footer-container">
              {/* User Profile Link */}
              <Link
                href={`/profile/${user.username}` as Route}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors flex-1 min-w-0 footer-profile-link"
                title={isCollapsed ? user.username || user.email?.split('@')[0] : undefined}
              >
                <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.picturePath ? (
                    <Image
                      src={user.picturePath}
                      alt=""
                      width={40}
                      height={40}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-medium">
                      {(user.username || user.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 sidebar-text footer-username">
                  <p className="text-sm font-medium text-white truncate">
                    {user.username || user.email?.split('@')[0]}
                  </p>
                </div>
              </Link>

              {/* Logout Button as Icon */}
              <button
                onClick={handleLogout}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0 footer-logout-btn"
                title={t('actions.logout')}
                aria-label={t('actions.logout')}
              >
                <LogoutIcon className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-violet-600 text-white font-medium hover:opacity-90 transition-opacity"
            >
              <span className="sidebar-text">{t('actions.login')}</span>
              <LogoutIcon className="w-5 h-5 sidebar-login-icon" />
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav lg:hidden" aria-label={t('mobile.navigation')}>
        <Link
          href="/"
          className={`mobile-nav-item ${isActive('/') && pathname === '/' ? 'active' : ''}`}
          aria-current={pathname === '/' ? 'page' : undefined}
        >
          <HomeIcon className="w-6 h-6" />
          <span>{t('mobile.home')}</span>
        </Link>
        <Link
          href="/quiz"
          className={`mobile-nav-item ${isActive('/quiz') ? 'active' : ''}`}
          aria-current={isActive('/quiz') ? 'page' : undefined}
        >
          <TrophyIcon className="w-6 h-6" />
          <span>{t('quiz')}</span>
        </Link>
        {user ? (
          <Link
            href={`/profile/${user.username}`}
            className={`mobile-nav-item ${pathname.startsWith('/profile') ? 'active' : ''}`}
            aria-current={pathname.startsWith('/profile') ? 'page' : undefined}
          >
            <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center overflow-hidden">
              {user.picturePath ? (
                <Image
                  src={user.picturePath}
                  alt=""
                  width={24}
                  height={24}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-white text-xs font-medium">
                  {(user.username || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span>{t('mobile.profile')}</span>
          </Link>
        ) : (
          <Link
            href="/auth/login"
            className={`mobile-nav-item ${isActive('/auth') ? 'active' : ''}`}
            aria-current={isActive('/auth') ? 'page' : undefined}
          >
            <LogoutIcon className="w-6 h-6" />
            <span>{t('actions.login')}</span>
          </Link>
        )}
      </nav>
    </>
  );
}
