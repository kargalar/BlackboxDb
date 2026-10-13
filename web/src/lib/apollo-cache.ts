import { InMemoryCache } from '@apollo/client';

export function createAppCache() {
  return new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          content: {
            read(existing, { args, toReference }) {
              return (
                existing ??
                (args?.id ? toReference({ __typename: 'Content', id: args.id }) : undefined)
              );
            },
          },
          contents: { keyArgs: ['type', 'limit', 'offset'], merge: false },
        },
      },
      AdminContent: { fields: { images: { merge: false } } },
    },
  });
}
