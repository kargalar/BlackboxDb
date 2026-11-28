import { useTranslations as useUiTranslations } from 'next-intl';
interface LoadingOverlayProps {
  uploadProgress: string;
}

/**
 * Full-screen loading overlay shown during image upload and content save.
 */
export function LoadingOverlay({ uploadProgress }: LoadingOverlayProps) {
  const translateUi = useUiTranslations('Ui');
  console.log('⏳ [LoadingOverlay] Rendering with progress:', uploadProgress);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="glass-card p-8 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 mx-auto mb-6 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <h3 className="text-xl font-semibold mb-2">{translateUi("lutfen_bekleyin_756b968")}</h3>
        <p className="text-white/60 mb-4">{uploadProgress || translateUi("islem_devam_ediyor_00e99d6")}</p>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div className="bg-violet-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
        <p className="text-sm text-white/40 mt-4">{translateUi("sayfa_kapanana_kadar_bekleyin_996e0cc")}</p>
      </div>
    </div>
  );
}
