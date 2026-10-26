import React from 'react';

interface IconProps {
  className?: string;
  solid?: boolean;
}

export const BookmarkIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', solid = false }) => (
  <svg
    className={className}
    fill={solid ? 'currentColor' : 'none'}
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={solid ? 1.5 : 2}
      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
    />
  </svg>
);
