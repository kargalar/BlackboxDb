import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContentFriendsActivity from './ContentFriendsActivity';
import type { GetFriendsActivityForContentData } from '@/services/graphql/userContent';

type FriendActivity = GetFriendsActivityForContentData['friendsActivityForContent'][number];

const { mockUseAuth, mockQuery } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockQuery: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
  useFormatter: () => ({
    relativeTime: () => '2d ago',
  }),
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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/apollo-client', () => ({
  apolloClient: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

function createFriendActivity(
  index: number,
  overrides: Partial<FriendActivity> = {}
): FriendActivity {
  const userId = overrides.userId ?? `user-${index}`;
  const username = overrides.user?.username ?? `friend${index}`;
  return {
    id: `log-${index}`,
    userId,
    contentId: 'content-1',
    isFavorite: false,
    rating: 8.5,
    isConsumed: true,
    isContinuing: false,
    isAbandoned: false,
    updatedAt: '2026-11-20T12:00:00.000Z',
    user: {
      id: userId,
      username,
      picturePath: null,
    },
    ...overrides,
  };
}

beforeEach(() => {
  mockUseAuth.mockReset();
  mockQuery.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('ContentFriendsActivity', () => {
  it('renders nothing when user is unauthenticated', () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { container } = render(<ContentFriendsActivity contentId="content-1" />);

    expect(container.firstChild).toBeNull();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('renders nothing when friendsActivityForContent is empty', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'viewer-1' } });
    mockQuery.mockResolvedValue({ data: { friendsActivityForContent: [] } });

    const { container } = render(<ContentFriendsActivity contentId="content-1" />);

    await waitFor(() => {
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
    expect(container.firstChild).toBeNull();
  });

  it('deduplicates repeat friend logs and displays compact card details', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'viewer-1' } });
    mockQuery.mockResolvedValue({
      data: {
        friendsActivityForContent: [
          createFriendActivity(1, {
            id: 'log-1a',
            userId: 'friend-1',
            isFavorite: true,
            rating: 9,
            isConsumed: true,
            user: { id: 'friend-1', username: 'alice', picturePath: null },
          }),
          createFriendActivity(2, {
            id: 'log-1b',
            userId: 'friend-1',
            isFavorite: false,
            rating: 5,
            isConsumed: false,
            isAbandoned: true,
            user: { id: 'friend-1', username: 'alice', picturePath: null },
          }),
        ],
      },
    });

    render(<ContentFriendsActivity contentId="content-1" />);

    const link = await screen.findByRole('link', { name: /alice/i });
    expect(link).toHaveAttribute('href', '/profile/alice');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByText('status.favorite')).toBeInTheDocument();
    expect(screen.getByText('status.consumed')).toBeInTheDocument();

    const ratingBadge = screen.getByLabelText('ratingLabel:{"rating":"9"}');
    expect(ratingBadge).toHaveTextContent('9');
    expect(ratingBadge).not.toHaveTextContent('/10');
  });

  it('shows 8 compact items initially with inline toggle inside the list and expands/collapses', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'viewer-1' } });
    const friends = Array.from({ length: 10 }, (_, index) => createFriendActivity(index + 1));
    mockQuery.mockResolvedValue({
      data: { friendsActivityForContent: friends },
    });

    const { container } = render(<ContentFriendsActivity contentId="content-1" />);

    const toggleButton = await screen.findByRole('button');
    const list = container.querySelector('ul');
    expect(list).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(8);
    expect(list?.children).toHaveLength(9);
    expect(list?.lastElementChild).toContainElement(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(toggleButton).toHaveTextContent('showMore:{"count":2}');

    fireEvent.click(toggleButton);

    expect(screen.getAllByRole('link')).toHaveLength(10);
    expect(list?.children).toHaveLength(11);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(toggleButton).toHaveTextContent('showLess');

    fireEvent.click(toggleButton);

    expect(screen.getAllByRole('link')).toHaveLength(8);
    expect(list?.children).toHaveLength(9);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(toggleButton).toHaveTextContent('showMore:{"count":2}');
  });
});
