import React, { useState } from 'react';

interface InteractiveStarRatingProps {
  rating: number;
  onChange: (rating: number) => void;
  size?: string;
  disabled?: boolean;
}

export default function InteractiveStarRating({
  rating,
  onChange,
  size = 'w-5 h-5',
  disabled = false,
}: InteractiveStarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : rating;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, starIndex: number) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Calculate position inside the star container
    // If left half, it's 0.5, if right half, it's a full star index
    const xPos = e.clientX - rect.left;
    const isHalf = xPos < rect.width / 2;
    setHoverRating(isHalf ? starIndex - 0.5 : starIndex);
  };

  return (
    <div
      className="flex items-center space-x-0.5"
      onMouseLeave={() => !disabled && setHoverRating(null)}
    >
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
        // Determine styling based on the displayRating
        const isFull = displayRating >= star;
        const isHalf = displayRating >= star - 0.5 && displayRating < star;

        return (
          <div
            key={star}
            className="relative cursor-pointer"
            onMouseMove={(e) => handleMouseMove(e, star)}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled && hoverRating !== null) {
                onChange(hoverRating);
              }
            }}
          >
            {/* Empty grey star background */}
            <svg
              className={`${size} text-gray-600 fill-current ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 transition-transform'}`}
              viewBox="0 0 20 20"
            >
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>

            {/* Foreground colored star */}
            {(isFull || isHalf) && (
              <svg
                className={`absolute top-0 left-0 ${size} text-yellow-400 fill-current pointer-events-none ${disabled ? 'opacity-50' : 'hover:scale-110 transition-transform'}`}
                viewBox="0 0 20 20"
                style={{ clipPath: isHalf ? 'inset(0 50% 0 0)' : 'none' }}
              >
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}
