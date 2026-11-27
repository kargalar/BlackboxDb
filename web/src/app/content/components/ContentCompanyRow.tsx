import Link from 'next/link';
import CompanyLogo from '@/components/atoms/CompanyLogo';

type Company = { id: string; name: string; logoUrl?: string | null };

export function ContentCompanyRow({ label, companies }: { label: string; companies: Company[] }) {
  if (companies.length === 0) return null;

  return (
    <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
      <span className="mt-1 text-gray-400">{label}</span>
      <div className="flex flex-wrap gap-2">
        {companies.map((company) => (
          <Link
            key={company.id}
            href={`/company/${company.id}`}
            className="flex items-center justify-center rounded border border-gray-300 bg-[#ffffff] px-3 py-1.5 text-sm font-medium text-gray-900 transition-colors hover:bg-[#f3f4f6]"
          >
            {company.logoUrl ? <CompanyLogo src={company.logoUrl} name={company.name} /> : company.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
