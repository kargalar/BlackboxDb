interface FormSelectProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: Array<{ value: string | number; label: string }>;
  required?: boolean;
  error?: string;
}

export function FormSelect({
  label,
  name,
  value,
  onChange,
  options,
  required,
  error,
}: FormSelectProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          onChange(isNaN(Number(val)) ? val : Number(val));
        }}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-surface-panel dark:border-gray-800 dark:text-white ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        <option value="">-- Seçin --</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
