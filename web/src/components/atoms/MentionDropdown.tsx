import Image from 'next/image';
import type { MentionUser } from '@/hooks/useMention';

interface MentionDropdownProps {
  active: boolean;
  query: string;
  results: MentionUser[];
  loading: boolean;
  onSelect: (user: MentionUser) => void;
}

export default function MentionDropdown({
  active,
  query,
  results,
  loading,
  onSelect,
}: MentionDropdownProps) {
  if (!active || query.length < 1) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-white/10 bg-surface-raised shadow-xl">
      {loading ? (
        <div className="px-3 py-2 text-sm text-white/50">Kullanıcılar aranıyor...</div>
      ) : results.length > 0 ? (
        results.map((u) => (
          <button
            key={u.id}
            type="button"
            onMouseDown={(e) => {
              // onMouseDown kullanıyoruz çünkü textarea onBlur dropdown'u kapatabilir
              e.preventDefault();
              onSelect(u);
            }}
            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5"
          >
            <div className="h-7 w-7 overflow-hidden rounded-full bg-violet-500/20 flex-shrink-0">
              {u.picturePath ? (
                <Image
                  src={u.picturePath}
                  alt=""
                  width={28}
                  height={28}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-violet-300">
                  {u.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-sm text-white/85">@{u.username}</span>
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-white/50">Eşleşen kullanıcı yok.</div>
      )}
    </div>
  );
}
