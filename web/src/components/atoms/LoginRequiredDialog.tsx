'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
  useRef,
} from 'react';
import { LogIn, UserPlus, X } from 'lucide-react';
import Link from 'next/link';

interface LoginRequiredDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  returnUrl?: string;
}

function LoginRequiredDialogComponent({
  isOpen,
  onClose,
  message = 'Bu işlemi gerçekleştirmek için giriş yapmalısın.',
  returnUrl,
}: LoginRequiredDialogProps) {
  const loginUrl = returnUrl
    ? `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`
    : '/auth/login';
  const registerUrl = returnUrl
    ? `/auth/register?returnUrl=${encodeURIComponent(returnUrl)}`
    : '/auth/register';
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node) && isOpen) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-slate-900 border border-white/10 p-6 text-left shadow-xl animate-in zoom-in-95 fade-in duration-200"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-white/60 hover:text-white" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-violet-500 flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white">Giriş Gerekli</h3>
          <p className="mt-2 text-sm text-white/60">{message}</p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href={loginUrl as any}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 hover: text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/20"
          >
            <LogIn className="w-5 h-5" />
            <span>Giriş Yap</span>
          </Link>

          <Link
            href={registerUrl as any}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 transition-all duration-200"
          >
            <UserPlus className="w-5 h-5" />
            <span>Hesap Oluştur</span>
          </Link>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-slate-900 text-white/40">veya</span>
          </div>
        </div>

        {/* Continue as Guest */}
        <button
          onClick={onClose}
          className="w-full py-2 px-4 text-sm text-white/50 hover:text-white transition-colors"
        >
          Misafir olarak devam et
        </button>
      </div>
    </div>
  );
}

// Export the component
export { LoginRequiredDialogComponent as LoginRequiredDialog };

// Context hook for easy access
interface LoginRequiredContextType {
  showLoginDialog: (message?: string, returnUrl?: string) => void;
  hideLoginDialog: () => void;
}

const LoginRequiredContext = createContext<LoginRequiredContextType | null>(null);

export function LoginRequiredProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string>();
  const [returnUrl, setReturnUrl] = useState<string>();

  const showLoginDialog = useCallback((msg?: string, url?: string) => {
    setMessage(msg);
    setReturnUrl(url);
    setIsOpen(true);
  }, []);

  const hideLoginDialog = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <LoginRequiredContext.Provider value={{ showLoginDialog, hideLoginDialog }}>
      {children}
      <LoginRequiredDialogComponent
        isOpen={isOpen}
        onClose={hideLoginDialog}
        message={message}
        returnUrl={returnUrl}
      />
    </LoginRequiredContext.Provider>
  );
}

export function useLoginRequired() {
  const context = useContext(LoginRequiredContext);
  if (!context) {
    throw new Error('useLoginRequired must be used within a LoginRequiredProvider');
  }
  return context;
}
