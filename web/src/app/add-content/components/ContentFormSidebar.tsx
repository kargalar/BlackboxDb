'use client';

import { TabDefinition } from '../config/tabConfig';
import {
  BookOpen,
  Calendar,
  Film,
  Gamepad2,
  Images,
  Info,
  Library,
  Link,
  LucideIcon,
  Puzzle,
  Tv,
  Users,
  Image,
  Video,
  Quote,
} from 'lucide-react';

interface ContentFormSidebarProps {
  tabs: TabDefinition[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  /** Map of tabId → whether the tab has data filled in */
  tabFillMap?: Record<string, boolean>;
}

const ICONS: Record<string, LucideIcon> = {
  BookOpen,
  Calendar,
  Film,
  Gamepad2,
  Images,
  Info,
  Library,
  Link,
  Puzzle,
  Tv,
  Users,
  Image,
  Video,
  Quote,
};

/**
 * Sidebar navigation for the add-content form.
 * Shows a vertical list of tabs on the left side.
 * Filled tabs are shown with stronger text; empty tabs appear lighter.
 */
export function ContentFormSidebar({
  tabs,
  activeTab,
  onTabChange,
  tabFillMap = {},
}: ContentFormSidebarProps) {
  if (tabs.length === 0) return null;

  return (
    <nav className="w-full" aria-label="Form sections">
      {/* Mobile: horizontal scrollable tabs */}
      <ul className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isFilled = tabFillMap[tab.id] ?? false;
          const Icon = ICONS[tab.icon];

          // Active tab always uses violet
          // Inactive filled tabs: strong text
          // Inactive empty tabs: muted/lighter text
          const inactiveClass = isFilled
            ? 'text-gray-900 dark:text-white font-semibold hover:bg-gray-100 dark:hover:bg-surface-raised'
            : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-surface-raised hover:text-gray-600 dark:hover:text-gray-400';

          return (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm
                  transition-all duration-200 whitespace-nowrap
                  ${isActive ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25 font-semibold' : inactiveClass}
                `}
                aria-current={isActive ? 'step' : undefined}
              >
                {Icon ? (
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${!isActive && !isFilled ? 'opacity-50' : ''}`}
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className={`text-lg flex-shrink-0 ${!isActive && !isFilled ? 'opacity-50' : ''}`}
                  >
                    {tab.icon}
                  </span>
                )}
                <span className="truncate">{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
