import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContentCastTab } from './ContentCastTab';
import type { ContentPerson } from '@/types/unified-content';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img alt={alt} {...props} />
  ),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
});

function createCast(count: number): ContentPerson[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    contentId: 'content-1',
    personId: index + 100,
    role: 'actor',
    character: `Character ${index + 1}`,
    creditOrder: index,
    person: {
      id: index + 100,
      name: `Actor ${index + 1}`,
      profileUrl: undefined,
      createdAt: '',
      updatedAt: '',
    },
  }));
}

const hasRole = (person: ContentPerson, role: string) =>
  person.role?.toLowerCase() === role.toLowerCase();

describe('ContentCastTab', () => {
  it('renders empty state when cast is empty', () => {
    const { container } = render(<ContentCastTab cast={[]} hasRole={hasRole} />);

    expect(screen.getByText('noCastInfo')).toBeInTheDocument();
    expect(container.querySelector('.grid')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders all 12 cast members inside the grid without a show more button when count is 12', () => {
    const { container } = render(<ContentCastTab cast={createCast(12)} hasRole={hasRole} />);

    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(12);
    expect(grid?.children).toHaveLength(12);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('places the show more button as the 12th item in the grid when cast exceeds 12', () => {
    const { container } = render(<ContentCastTab cast={createCast(15)} hasRole={hasRole} />);

    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(11);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveTextContent('showMore:{"count":4}');
    expect(grid?.children).toHaveLength(12);
    expect(grid?.lastElementChild).toBe(button);
  });

  it('expands to show all actors with show less at the end of the grid and collapses back', () => {
    const { container } = render(<ContentCastTab cast={createCast(15)} hasRole={hasRole} />);

    const grid = container.querySelector('.grid');
    const toggleButton = screen.getByRole('button');

    fireEvent.click(toggleButton);

    expect(screen.getAllByRole('link')).toHaveLength(15);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(toggleButton).toHaveTextContent('showLess');
    expect(grid?.children).toHaveLength(16);
    expect(grid?.lastElementChild).toBe(toggleButton);

    fireEvent.click(toggleButton);

    expect(screen.getAllByRole('link')).toHaveLength(11);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(toggleButton).toHaveTextContent('showMore:{"count":4}');
    expect(grid?.children).toHaveLength(12);
    expect(grid?.lastElementChild).toBe(toggleButton);
  });
});
