'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const translateUi = useUiTranslations('Ui');
  return (
    <div
      role="alert"
      className="min-h-screen flex items-center justify-center bg-black px-6 text-center text-white"
    >
      <div>
        <h1 className="text-2xl font-bold">{translateUi("something_went_wrong_8d886c0")}</h1>
        <p className="mt-2 text-white/60">
          {translateUi("please_try_again_if_the_problem_a420adb")}
        </p>
        <button type="button" onClick={() => reset()} className="btn-gradient mt-6">
          {translateUi("try_again_042c862")}
        </button>
      </div>
    </div>
  );
}
