interface ContentTypeButtonProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}

export function ContentTypeButton({ active, onClick, icon, label }: ContentTypeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
        active
          ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-lg scale-105'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
      }`}
    >
      <span className="text-xl">{icon}</span>
      {label}
    </button>
  );
}
