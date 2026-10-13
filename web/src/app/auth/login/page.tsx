'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import AuthShell from '../components/AuthShell';
import GoogleIcon from '../components/GoogleIcon';

function LoginContent() {
  const t = useTranslations('Auth');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { signInWithGoogle, signInWithEmail, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/');
      return;
    }

    const authError = new URLSearchParams(window.location.search).get('error');
    if (authError === 'auth_error') {
      setError(t('login.errorDefault'));
    }
  }, [router, t, user]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : t('login.errorDefault');

  const handleEmailSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      await signInWithEmail(formData.email, formData.password);
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (user) return null;

  return (
    <AuthShell title={t('login.title')} subtitle={t('brandSubtitle')}>
      {error && (
        <div className="auth-alert auth-alert-error mb-6" role="alert" aria-live="polite">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleEmailSignIn} className="mb-6 space-y-4">
        <div>
          <label htmlFor="email" className="auth-label mb-2 block text-sm font-medium">
            {t('login.emailLabel')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleInputChange}
            className="auth-input w-full rounded-xl px-4 py-3"
            placeholder={t('login.emailPlaceholder')}
          />
        </div>

        <div>
          <label htmlFor="password" className="auth-label mb-2 block text-sm font-medium">
            {t('login.passwordLabel')}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={formData.password}
            onChange={handleInputChange}
            className="auth-input w-full rounded-xl px-4 py-3"
            placeholder={t('login.passwordPlaceholder')}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="auth-primary-button w-full rounded-xl px-4 py-3 font-medium"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="loading-spinner h-5 w-5 rounded-full border-2 border-white border-t-transparent" />
              {t('login.loading')}
            </span>
          ) : (
            t('login.submitButton')
          )}
        </button>
      </form>

      <div className="auth-divider relative mb-6">
        <span>{t('common.or')}</span>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="auth-secondary-button flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3"
      >
        {isLoading ? (
          <span className="loading-spinner h-5 w-5 rounded-full border-2 border-white/60 border-t-transparent" />
        ) : (
          <GoogleIcon />
        )}
        {t('login.googleButton')}
      </button>

      <p className="mt-6 text-center text-sm text-white/50">
        {t('login.noAccountText')}{' '}
        <Link href="/auth/register" className="auth-link font-medium">
          {t('login.signUpLink')}
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="page-loading min-h-screen" role="status" aria-label="Loading" />}
    >
      <LoginContent />
    </Suspense>
  );
}
