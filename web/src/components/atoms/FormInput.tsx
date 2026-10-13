interface FormInputProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  error,
}: FormInputProps) {
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
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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
