'use client';

import type { ReactNode } from 'react';
import { ApolloProvider as ApolloClientProvider } from '@apollo/client/react';
import { apolloClient } from '@/lib/apollo-client';

export function ApolloProvider({ children }: { children: ReactNode }) {
  return <ApolloClientProvider client={apolloClient}>{children}</ApolloClientProvider>;
}
