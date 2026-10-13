import Image from 'next/image';

interface CompanyLogoProps {
  src: string;
  name: string;
}

export default function CompanyLogo({ src, name }: CompanyLogoProps) {
  return (
    <span className="relative inline-block h-6 w-24 shrink-0">
      <Image
        src={src}
        alt={`${name} logo`}
        fill
        sizes="96px"
        unoptimized
        className="object-contain"
      />
    </span>
  );
}
