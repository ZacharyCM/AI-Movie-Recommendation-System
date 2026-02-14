'use client';

import { useState, KeyboardEvent } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
  className = ''
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const sizes = { sm: 16, md: 24, lg: 32 };
  const iconSize = sizes[size];

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    if (readonly) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(index + 1);
    } else if (e.key === 'ArrowRight' && index < 4) {
      e.preventDefault();
      (e.currentTarget.nextElementSibling as HTMLElement)?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      (e.currentTarget.previousElementSibling as HTMLElement)?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Movie rating"
      className={`flex gap-1 ${className}`}
    >
      {[1, 2, 3, 4, 5].map((star, index) => {
        const filled = (hoverValue || value) >= star;
        const isChecked = value === star;

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={isChecked}
            aria-setsize={5}
            aria-posinset={star}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            tabIndex={isChecked || (value === 0 && index === 0) ? 0 : -1}
            disabled={readonly}
            onClick={() => handleClick(star)}
            onMouseEnter={() => !readonly && setHoverValue(star)}
            onMouseLeave={() => !readonly && setHoverValue(0)}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(-1)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`
              transition-all duration-200
              ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 focus:scale-110'}
              focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded
            `}
          >
            <Star
              size={iconSize}
              className={`
                transition-colors
                ${filled ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-slate-600'}
              `}
            />
          </button>
        );
      })}
    </div>
  );
}
