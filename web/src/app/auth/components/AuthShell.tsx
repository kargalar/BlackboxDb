import type { ReactNode } from 'react';

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="auth-page flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="auth-brand-mark mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
            <span className="text-2xl font-bold text-white">B</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Blackbox</h1>
          <p className="mt-2 text-white/50">{subtitle}</p>
        </div>

        <section className="auth-card rounded-3xl p-6 sm:p-8">
          <h2 className="mb-6 text-2xl font-bold text-white">{title}</h2>
          {children}
        </section>
      </div>
    </div>
  );
}
