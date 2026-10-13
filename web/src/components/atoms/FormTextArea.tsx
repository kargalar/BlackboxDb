interface FormTextAreaProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  rows?: number;
}

export function FormTextArea({
  label,
  name,
  value,
  onChange,
  placeholder,
  required,
  error,
  rows = 4,
}: FormTextAreaProps) {
  const isFilled = value !== undefined && value !== '';

  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className={`block text-sm transition-colors ${
          isFilled
            ? 'font-semibold text-gray-900 dark:text-white'
            : 'font-medium text-gray-400 dark:text-gray-500'
        }`}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-surface-panel dark:text-white transition-colors ${
          error
            ? 'border border-red-500'
            : isFilled
              ? 'border-transparent'
              : 'border border-gray-200 dark:border-gray-800'
        }`}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
