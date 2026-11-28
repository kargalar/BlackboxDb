import { useTranslations as useUiTranslations } from 'next-intl';
import Link from 'next/link';

export default function NotFound() {
  const translateUi = useUiTranslations('Ui');
  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-6 text-center text-white">
      <div>
        <p className="text-6xl font-bold text-violet-400">404</p>
        <h1 className="mt-4 text-2xl font-bold">{translateUi("page_not_found_bc3023b")}</h1>
        <p className="mt-2 text-white/60">{translateUi("the_page_you_requested_does_not_23b4776")}</p>
        <Link href="/" className="btn-gradient mt-6 inline-flex">
          {translateUi("back_to_home_34ac37f")}
        </Link>
      </div>
    </div>
  );
}
