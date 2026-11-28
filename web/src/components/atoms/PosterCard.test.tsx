import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import PosterCard from './PosterCard';

function poster(src: string | null, useNextImage: boolean) {
  return (
    <NextIntlClientProvider locale="tr" timeZone="Europe/Istanbul" messages={{}}>
      <PosterCard
        src={src}
        alt="Robinson Crusoe"
        fallback={<span>Kapak yok</span>}
        useNextImage={useNextImage}
      />
    </NextIntlClientProvider>
  );
}

describe('PosterCard', () => {
  it.each([false, true])('uses the missing-cover fallback after a load error (optimized: %s)', (useNextImage) => {
    const { rerender } = render(poster('/uploads/expired-cover.jpg', useNextImage));
    fireEvent.error(screen.getByRole('img', { name: 'Robinson Crusoe' }));

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Kapak yok')).toBeInTheDocument();

    rerender(poster(null, useNextImage));
    expect(screen.getByText('Kapak yok')).toBeInTheDocument();

    rerender(poster('/uploads/replacement-cover.jpg', useNextImage));
    expect(screen.getByRole('img', { name: 'Robinson Crusoe' })).toBeInTheDocument();
    expect(screen.queryByText('Kapak yok')).not.toBeInTheDocument();
  });
});
