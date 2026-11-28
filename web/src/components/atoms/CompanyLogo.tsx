import { useTranslations as useUiTranslations } from 'next-intl';
import Image from 'next/image';

interface CompanyLogoProps {
  src: string;
  name: string;
}

export default function CompanyLogo({ src, name }: CompanyLogoProps) {
  const translateUi = useUiTranslations('Ui');
  return (
    <span className="relative inline-block h-6 w-24 shrink-0">
      <Image
        src={src}
        alt={translateUi("value1_logo_2a32e81", { value1: String(name) })}
        fill
        sizes="96px"
        unoptimized
        className="object-contain"
      />
    </span>
  );
}
