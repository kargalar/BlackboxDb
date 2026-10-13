/**
 * Stat card widget for CSV import results
 */
export function CsvImportStatCard({
  label,
  value,
  total,
  color = 'green',
}: {
  label: string;
  value: number;
  total?: number;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
    cyan: 'text-cyan-400',
  };

  return (
    <div className="bg-white/5 rounded-xl p-3 text-center">
      <div className={`text-xl font-bold ${colorMap[color] || 'text-white'}`}>
        {value}
        {total !== undefined && <span className="text-white/30 text-sm">/{total}</span>}
      </div>
      <div className="text-white/40 text-xs mt-1">{label}</div>
    </div>
  );
}
