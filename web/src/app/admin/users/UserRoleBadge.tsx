export default function UserRoleBadge({
  label,
  active,
  icon: Icon,
  color,
  onToggle,
}: {
  label: string;
  active: boolean;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  onToggle: () => void;
}) {
  const colorMap: Record<string, { active: string; inactive: string }> = {
    amber: {
      active: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      inactive: 'bg-white/5 text-white/30 border-white/10 hover:bg-white/10 hover:text-white/50',
    },
    violet: {
      active: 'bg-violet-500/20 text-violet-400 border-violet-500/40',
      inactive: 'bg-white/5 text-white/30 border-white/10 hover:bg-white/10 hover:text-white/50',
    },
  };
  const styles = colorMap[color] ?? colorMap.violet;

  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
        active ? styles.active : styles.inactive
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}
