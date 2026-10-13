import { ApolloClient, ApolloLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import UploadHttpLink from 'apollo-upload-client/UploadHttpLink.mjs';
import { Observable } from '@apollo/client';
import { createAppCache } from './apollo-cache';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';

export const AUTH_LOGOUT_ENDPOINT = GRAPHQL_ENDPOINT.replace(/\/graphql\/?$/, '/auth/logout');

// ============================================================
// TokenManager — Tüm token işlemlerini yöneten singleton
// ============================================================

class TokenManager {
  private static instance: TokenManager;
  private refreshPromise: Promise<string | null> | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /** localStorage'dan access token'ı al */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /** localStorage'dan refresh token'ı al */
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /** Token'ları localStorage'a kaydet */
  setTokens(accessToken: string | null | undefined, refreshToken: string | null | undefined): void {
    this.accessToken = accessToken || null;
    this.refreshToken = refreshToken || null;
  }

  /** Tüm token'ları temizle */
  clearTokens(): void {
    this.setTokens(null, null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  /**
   * JWT payload'ından expire süresini kontrol et.
   * Token 5 dakika içinde expire olacaksa true döner.
   */
  isTokenExpiringSoon(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // saniye → milisaniye
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      return exp - now < fiveMinutes;
    } catch {
      return false;
    }
  }

  /**
   * Token'ı yenile — Mutex ile korunur.
   * Birden fazla eşzamanlı çağrı yapılsa bile sadece tek bir refresh isteği gönderilir.
   * Diğer çağrılar aynı Promise'i bekler.
   */
  async refreshTokens(): Promise<string | null> {
    // Zaten bir refresh işlemi devam ediyorsa, aynı Promise'i döndür
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._doRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  /** Gerçek refresh işlemi — sadece refreshTokens() tarafından çağrılır */
  private async _doRefresh(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();

    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            mutation RefreshToken($refreshToken: String) {
              refreshToken(refreshToken: $refreshToken) {
                user {
                  id
                  username
                  email
                  isAdmin
                  isModerator
                  bio
                  picturePath
                  createdAt
                }
              }
            }
          `,
          variables: { refreshToken },
        }),
      });

      const result = await response.json();

      if (result.data?.refreshToken?.user) {
        this.setTokens(null, null);

        // AuthContext'e user bilgisini bildir
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('auth-token-refreshed', {
              detail: { user: result.data.refreshToken.user },
            })
          );
        }

        return 'cookie';
      }

      // Refresh başarısız — token'ları temizle
      this.clearTokens();
      this._emitAuthFailed();
      return null;
    } catch {
      this.clearTokens();
      this._emitAuthFailed();
      return null;
    }
  }

  /** Auth başarısız event'i emit et — AuthContext dinliyor */
  private _emitAuthFailed(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth-failed'));
    }
  }

  /**
   * Proaktif token yenileme — background'da çalışır.
   * Token 5 dk içinde expire olacaksa otomatik yeniler.
   * Başarısız olursa sessizce devam eder (error link zaten yakalayacak).
   */
  async proactiveRefresh(): Promise<void> {
    if (this.isTokenExpiringSoon()) {
      await this.refreshTokens();
    }
  }
}

export const tokenManager = TokenManager.getInstance();

// ============================================================
// Apollo Links
// ============================================================

// Upload link for GraphQL requests (supports Upload scalar)
const httpLink = new UploadHttpLink({
  uri: GRAPHQL_ENDPOINT,
  credentials: 'include',
});

// Auth link — JWT token'ı her request'e ekle + proaktif refresh
const authLink = setContext(async (_, { headers }) => {
  // Proaktif refresh: token yakında expire olacaksa arka planda yenile
  await tokenManager.proactiveRefresh();

  const token = tokenManager.getAccessToken();

  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

// Error link — UNAUTHENTICATED hatasında otomatik token refresh + retry
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }: any) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      const isAuthError =
        err.extensions?.code === 'UNAUTHENTICATED' ||
        err.extensions?.code === 'FORBIDDEN' ||
        err.message?.includes('jwt expired') ||
        err.message?.includes('jwt malformed') ||
        err.message?.includes('invalid token') ||
        err.message?.includes('Access denied');

      if (isAuthError) {
        // Token refresh dene ve isteği yeniden gönder
        return new Observable((observer) => {
          let subscriber: any = null;

          tokenManager
            .refreshTokens()
            .then((newToken) => {
              if (newToken) {
                // Yeni token ile isteği tekrar gönder
                const oldHeaders = operation.getContext().headers || {};
                const { authorization: _authorization, ...headersWithoutAuth } = oldHeaders;
                operation.setContext({
                  headers:
                    newToken === 'cookie'
                      ? headersWithoutAuth
                      : { ...headersWithoutAuth, authorization: `Bearer ${newToken}` },
                  fetchOptions: { credentials: 'include' },
                });
                subscriber = forward(operation).subscribe(observer);
              } else {
                // Refresh başarısız — hatayı ilet
                observer.error(err);
              }
            })
            .catch((error) => {
              observer.error(error);
            });

          return () => {
            if (subscriber) {
              subscriber.unsubscribe();
            }
          };
        });
      }
    }
  }

  // 401 Network error — token refresh dene
  if (networkError && 'statusCode' in networkError && (networkError as any).statusCode === 401) {
    return new Observable((observer) => {
      let subscriber: any = null;

      tokenManager
        .refreshTokens()
        .then((newToken) => {
          if (newToken) {
            const oldHeaders = operation.getContext().headers || {};
            const { authorization: _authorization, ...headersWithoutAuth } = oldHeaders;
            operation.setContext({
              headers:
                newToken === 'cookie'
                  ? headersWithoutAuth
                  : { ...headersWithoutAuth, authorization: `Bearer ${newToken}` },
              fetchOptions: { credentials: 'include' },
            });
            subscriber = forward(operation).subscribe(observer);
          } else {
            observer.error(networkError);
          }
        })
        .catch((error) => {
          observer.error(error);
        });

      return () => {
        if (subscriber) {
          subscriber.unsubscribe();
        }
      };
    });
  }
});

// ============================================================
// Apollo Client Instance
// ============================================================

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: createAppCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});
