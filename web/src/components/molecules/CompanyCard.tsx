import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Route } from 'next';
import { BuildingIcon } from '@/components/atoms/icons/SidebarIcons';
import type { CompanyData } from '@/services/graphql/company';

interface CompanyCardProps {
  company: CompanyData;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ company }) => {
  return (
    <Link href={`/company/${company.id}` as Route} className="group block">
      <div className="glass-card overflow-hidden h-full flex flex-col hover:scale-[1.02] transition-all duration-300 bg-gray-900 border border-gray-800">
        <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-4 overflow-hidden p-2 group-hover:bg-white/10 transition-colors">
            {company.logoUrl ? (
              <Image
                src={company.logoUrl}
                alt={company.name}
                width={64}
                height={64}
                sizes="64px"
                unoptimized
                className="w-full h-full object-contain"
              />
            ) : (
              <BuildingIcon className="w-10 h-10 text-gray-500" />
            )}
          </div>

          <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-indigo-400 transition-colors">
            {company.name}
          </h3>

          <div className="flex flex-col gap-1 items-center">
            {company.headquarters && (
              <p className="text-xs text-gray-400 line-clamp-1">📍 {company.headquarters}</p>
            )}
            {company.foundingYear && (
              <p className="text-xs text-gray-500">Kurluş: {company.foundingYear}</p>
            )}
          </div>
        </div>

        <div className="bg-white/5 py-2 px-4 text-center border-t border-white/5">
          <span className="text-xs font-medium text-indigo-400">
            {company.contentCount || 0} İçerik
          </span>
        </div>
      </div>
    </Link>
  );
};
