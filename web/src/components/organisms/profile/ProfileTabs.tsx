interface ProfileTabsProps {
  tabs: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

import { useTranslations } from 'next-intl';

export default function ProfileTabs({ tabs, activeTab, setActiveTab }: ProfileTabsProps) {
  const t = useTranslations('ProfileTabs');
  return (
    <div className="mt-8">
      <div className="tabs-container inline-flex">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-item ${activeTab === tab ? 'active' : ''}`}
          >
            {t(tab)}
          </button>
        ))}
      </div>
    </div>
  );
}
