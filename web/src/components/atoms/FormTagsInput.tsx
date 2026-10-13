import React, { useMemo, useState, useRef, useEffect } from 'react';
import { removeTagFromAllLogs } from '@/services/userContentService';

interface FormTagsInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  suggestedTags?: string[];
  onGlobalDelete?: () => void;
}

export function FormTagsInput({
  label,
  name,
  value,
  onChange,
  placeholder = 'Virgülle ayırarak birden fazla ekleyebilirsiniz',
  error,
  suggestedTags = [],
  onGlobalDelete,
}: FormTagsInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [hiddenTags, setHiddenTags] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];

    try {
      const storedTags: unknown = JSON.parse(localStorage.getItem('bb_hidden_tags') ?? '[]');
      return Array.isArray(storedTags)
        ? storedTags.filter((tag): tag is string => typeof tag === 'string')
        : [];
    } catch {
      return [];
    }
  });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // String'ten array'e çevir
  const parsedTags = value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const filteredSuggestions = useMemo(() => {
    const currentTags = value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const visibleSuggestedTags = suggestedTags.filter((tag) => !hiddenTags.includes(tag));
    const normalizedInput = currentInput.toLowerCase();

    return visibleSuggestedTags.filter(
      (tag) =>
        !currentTags.includes(tag) &&
        (normalizedInput.length === 0 || tag.toLowerCase().includes(normalizedInput))
    );
  }, [currentInput, value, suggestedTags, hiddenTags]);

  // Click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const cleanTag = tag.trim();
    if (!cleanTag || parsedTags.includes(cleanTag)) {
      return;
    }
    const newTags = [...parsedTags, cleanTag];
    onChange(newTags.join(', '));
    setCurrentInput('');
    setShowSuggestions(false);
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const removeTag = (index: number) => {
    const newTags = parsedTags.filter((_, i) => i !== index);
    onChange(newTags.join(', '));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Virgül yazıldığında, yeni etiketi otomatik ekle
    if (val.includes(',')) {
      const parts = val.split(',');
      const newTag = parts[0].trim();
      if (newTag) {
        addTag(newTag);
      }
    } else {
      setCurrentInput(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentInput.trim()) {
        addTag(currentInput.trim());
      }
    }
  };

  const handleSuggestionClick = (tag: string) => {
    addTag(tag);
  };

  const handleHideTag = async (e: React.MouseEvent, tag: string) => {
    e.stopPropagation(); // addTag çalışmasın
    if (
      !window.confirm(
        `"${tag}" etiketini tüm geçmiş loglarınızdan tamamen silmek istediğinize emin misiniz?`
      )
    ) {
      return;
    }

    const newHidden = [...hiddenTags, tag];
    setHiddenTags(newHidden);
    try {
      localStorage.setItem('bb_hidden_tags', JSON.stringify(newHidden));
      // Sunucudan da tamamen sil
      await removeTagFromAllLogs({ tag });
      onGlobalDelete?.();
    } catch (err) {
      console.error('Etiket silinirken hata:', err);
    }
  };

  return (
    <div className="w-full relative" ref={wrapperRef}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-neutral-400 mb-2">
          {label}
        </label>
      )}

      <div className="relative">
        {/* Ekli Etiketleri Göster */}
        {parsedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {parsedTags.map((tag, index) => (
              <div
                key={index}
                className="inline-flex flex-row items-center gap-1.5 bg-surface-raised border border-[#2d323b] rounded-full px-2.5 py-1"
              >
                <div className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-[10px] font-bold">
                  #
                </div>
                <span className="text-xs text-violet-300">{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="text-neutral-500 hover:text-red-400 ml-1"
                  title="Etiketleri sil"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={inputRef}
          id={name}
          name={name}
          type="text"
          value={currentInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className={`w-full bg-surface-raised border border-[#2d323b] rounded-lg px-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-violet-500/50 focus:bg-surface-hover transition-all duration-200 ${
            error ? 'border-red-500/50 focus:border-red-500/50' : ''
          }`}
        />

        {/* Önceki Etiketler Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-surface-raised border border-[#2d323b] rounded-lg shadow-xl overflow-hidden shadow-black/50">
            <div className="px-4 py-2 text-xs font-semibold text-neutral-500 bg-neutral-900/50 border-b border-[#2d323b]">
              Daha Önce Kullanılan Etiketler
            </div>
            <ul className="max-h-48 overflow-y-auto">
              {filteredSuggestions.map((tag, index) => (
                <li
                  key={index}
                  onClick={() => handleSuggestionClick(tag)}
                  className="group flex flex-row items-center justify-between px-4 py-2 hover:bg-white/5 cursor-pointer transition-colors border-b border-[#2d323b] last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400">
                      #
                    </div>
                    <span className="text-sm font-medium text-neutral-200">{tag}</span>
                  </div>
                  <button
                    onClick={(e) => handleHideTag(e, tag)}
                    title="Etiketi tamamen sil"
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-[#ef4444] hover:bg-[#ef4444]/10 rounded transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500/80 mt-2">{error}</p>}
    </div>
  );
}
