interface ProfileTabsProps {
  tabs: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function ProfileTabs({ tabs, activeTab, setActiveTab }: ProfileTabsProps) {
  return (
    <div className="mt-6">
      <nav className="flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab
                ? 'border-gray-400 text-gray-300'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}
