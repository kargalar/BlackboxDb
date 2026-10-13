'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import AuthShell from '../components/AuthShell';
import GoogleIcon from '../components/GoogleIcon';

export default function RegisterPage() {
  const t = useTranslations('Auth');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const { signInWithGoogle, signUpWithEmail, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push('/');
  }, [router, user]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : t('register.errorDefault');

  const handleEmailSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (formData.password.length < 6) {
      setError(t('register.errorLength'));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      await signUpWithEmail(formData.email, formData.password, formData.username);
      setSuccess(t('register.successMessage'));
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
    <AuthShell title={t('register.title')} subtitle={t('brandSubtitle')}>
      {error && (
        <div className="auth-alert auth-alert-error mb-6" role="alert" aria-live="polite">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="auth-alert auth-alert-success mb-6" role="status" aria-live="polite">
          <p className="text-sm">{success}</p>
        </div>
      )}

      <form onSubmit={handleEmailSignUp} className="mb-6 space-y-4">
        <div>
          <label htmlFor="username" className="auth-label mb-2 block text-sm font-medium">
            {t('register.usernameLabel')}
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={formData.username}
            onChange={handleInputChange}
            className="auth-input w-full rounded-xl px-4 py-3"
            placeholder={t('register.usernamePlaceholder')}
          />
        </div>

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
            autoComplete="new-password"
            required
            minLength={6}
            value={formData.password}
            onChange={handleInputChange}
            className="auth-input w-full rounded-xl px-4 py-3"
            placeholder={t('register.passwordPlaceholder')}
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
              {t('register.loading')}
            </span>
          ) : (
            t('register.submitButton')
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
        {t('register.googleButton')}
      </button>

      <p className="mt-6 text-center text-xs text-white/40">{t('register.terms')}</p>
      <p className="mt-6 text-center text-sm text-white/50">
        {t('register.hasAccountText')}{' '}
        <Link href="/auth/login" className="auth-link font-medium">
          {t('register.loginLink')}
        </Link>
      </p>
    </AuthShell>
  );
}
