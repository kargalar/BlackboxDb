import { gql } from '@apollo/client';
import { describe, expect, it } from 'vitest';
import { createAppCache } from './apollo-cache';

const query = gql`
  query Contents($type: String, $limit: Int, $offset: Int) {
    contents(type: $type, limit: $limit, offset: $offset) {
      id
      title
    }
  }
`;
const content = (id: string) => ({ __typename: 'Content', id, title: id });

describe('paginated content cache', () => {
  it('keeps page sizes, offsets and content types independent', () => {
    const cache = createAppCache();
    for (const [type, limit, offset, id] of [
      ['MOVIE', 1, 0, 'first'],
      ['MOVIE', 1, 1, 'second'],
      ['MOVIE', 2, 0, 'larger'],
      ['TV', 1, 0, 'tv'],
    ] as const) {
      cache.writeQuery({
        query,
        variables: { type, limit, offset },
        data: { contents: [content(id)] },
      });
    }
    expect(cache.readQuery({ query, variables: { type: 'MOVIE', limit: 1, offset: 0 } })).toEqual({
      contents: [content('first')],
    });
    expect(cache.readQuery({ query, variables: { type: 'MOVIE', limit: 1, offset: 1 } })).toEqual({
      contents: [content('second')],
    });
  });

  it('refetch replaces removed rows instead of retaining stale items', () => {
    const cache = createAppCache();
    const variables = { type: 'MOVIE', limit: 2, offset: 0 };
    cache.writeQuery({ query, variables, data: { contents: [content('one'), content('two')] } });
    cache.writeQuery({ query, variables, data: { contents: [content('one')] } });
    expect(cache.readQuery({ query, variables })).toEqual({ contents: [content('one')] });
  });
});
