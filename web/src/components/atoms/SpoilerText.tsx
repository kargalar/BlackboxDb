'use client';

import { useState } from 'react';
import { EyeOff } from 'lucide-react';
import MentionText from '@/components/atoms/MentionText';

interface SpoilerTextProps {
  text: string;
  isSpoiler?: boolean;
  revealByDefault?: boolean;
  revealed?: boolean;
  onReveal?: () => void;
  className?: string;
  as?: 'div' | 'p' | 'span';
  hiddenHint?: string;
  stopPropagation?: boolean;
  mentionMode?: 'link' | 'action';
}

export default function SpoilerText(props: SpoilerTextProps) {
  const resetKey = `${props.isSpoiler ?? false}:${props.revealByDefault ?? false}:${props.text}`;
  return <SpoilerTextContent key={resetKey} {...props} />;
}

function SpoilerTextContent({
  text,
  isSpoiler = false,
  revealByDefault = false,
  revealed,
  onReveal,
  className = '',
  as = 'p',
  hiddenHint = 'Spoiler içerik — görmek için tıkla',
  stopPropagation = false,
  mentionMode = 'link',
}: SpoilerTextProps) {
  const [isRevealed, setIsRevealed] = useState(revealByDefault);
  const isControlled = revealed !== undefined;
  const isVisible = isControlled ? revealed : isRevealed;

  const handleReveal = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      event.stopPropagation();
    }

    if (!isVisible) {
      console.log('👁️ [SpoilerText] Spoiler content revealed');
      onReveal?.();
      if (!isControlled) {
        setIsRevealed(true);
      }
    }
  };

  const handleContentClick = (event: React.MouseEvent<HTMLElement>) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
  };

  const Component = as;

  if (!isSpoiler) {
    return (
      <MentionText text={text} className={className} as={Component} mentionMode={mentionMode} />
    );
  }

  if (isVisible) {
    return (
      <div className="space-y-2" onClick={handleContentClick}>
        <MentionText text={text} className={className} as={Component} mentionMode={mentionMode} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={handleReveal} className="block w-full text-left">
        <MentionText
          text={text}
          className={`${className} select-none blur-sm transition-all`}
          as={Component}
          mentionMode={mentionMode}
        />
      </button>
      <button
        type="button"
        onClick={handleReveal}
        className="inline-flex items-center gap-2 text-xs font-medium text-orange-300 hover:text-orange-200"
      >
        <EyeOff size={12} />
        {hiddenHint}
      </button>
    </div>
  );
}
