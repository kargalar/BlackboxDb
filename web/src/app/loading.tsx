import { useTranslations as useUiTranslations } from 'next-intl';
export default function Loading() {
  const translateUi = useUiTranslations('Ui');
  return (
    <div aria-busy="true" className="min-h-screen flex items-center justify-center bg-black">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      <span className="sr-only">{translateUi("loading_8f26c65")}</span>
    </div>
  );
}
