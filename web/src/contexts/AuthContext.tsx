'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apolloClient, AUTH_LOGOUT_ENDPOINT, tokenManager } from '@/lib/apollo-client';
import {
  LOGIN,
  REGISTER,
  GET_ME,
  LOGIN_WITH_GOOGLE,
  DELETE_MY_ACCOUNT,
} from '@/services/graphql/auth';

interface User {
  id: string;
  auth_user_id?: string; // Backward compatibility
  username: string;
  email: string;
  bio: string | null;
  picturePath: string | null;
  isAdmin: boolean;
  isModerator: boolean;
  isSpotifyConnected?: boolean;
  preferredContentTypes?: number[];
  gridColumns?: number;
  gridRows?: number;
  posterZoomEnabled?: boolean;
  posterIconsBelow?: boolean;
  showSensitiveContent?: boolean;
  preferredGamePlatformId?: number | null;
  preferredGamePlatformIds?: number[];
  splitHomePopularSections?: boolean;
  notifyOnFollows?: boolean;
  notifyOnContentRequestUpdates?: boolean;
  notifyOnCommentVotes?: boolean;
  notifyOnCommentReplies?: boolean;
  notifyOnMentions?: boolean;
  notifyOnRecommendations?: boolean;
  notifyOnNewSeasons?: boolean;
  notifyOnContentReleased?: boolean;
  notifyOnRoleUpdates?: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isPrivileged: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, username?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: any }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isPrivileged: false,
  signInWithGoogle: async () => {},
  signUpWithEmail: async () => {},
  signInWithEmail: async () => {},
  signOut: async () => {},
  deleteAccount: async () => ({ success: false, error: 'Not implemented' }),
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrivileged, setIsPrivileged] = useState(false);
  const initRef = useRef(false);

  // Helper: User objesini set et
  const applyUser = useCallback((userData: any) => {
    if (userData) {
      setUser({ ...userData, auth_user_id: userData.id });
      setIsPrivileged(userData.isAdmin || userData.isModerator);
    } else {
      setUser(null);
      setIsPrivileged(false);
    }
  }, []);

  // TokenManager event'lerini dinle
  useEffect(() => {
    const handleTokenRefreshed = (event: CustomEvent) => {
      const { user: refreshedUser } = event.detail;
      if (refreshedUser) {
        applyUser(refreshedUser);
      }
    };

    const handleAuthFailed = () => {
      applyUser(null);
    };

    window.addEventListener('auth-token-refreshed', handleTokenRefreshed as EventListener);
    window.addEventListener('auth-failed', handleAuthFailed);

    return () => {
      window.removeEventListener('auth-token-refreshed', handleTokenRefreshed as EventListener);
      window.removeEventListener('auth-failed', handleAuthFailed);
    };
  }, [applyUser]);

  // İlk yükleme: mevcut token'la kullanıcı bilgisini çek
  useEffect(() => {
    // StrictMode'da çift çalışmayı önle
    if (initRef.current) return;
    initRef.current = true;

    const initAuth = async () => {
      try {
        // 1. Mevcut session/cookie ile kullanıcı bilgisini çek
        try {
          const { data: currentUserData } = await apolloClient.query<any>({
            query: GET_ME,
            fetchPolicy: 'network-only',
          });

          if (currentUserData?.me) {
            applyUser(currentUserData.me);
            return;
          }
        } catch {
          // Access token süresi dolmuş veya geçersiz olabilir, refresh denenecek
        }

        // 2. GET_ME boş veya hata döndüyse (ör. access token süresi dolduysa),
        // refresh token (cookie) ile oturumu yenilemeyi dene
        const refreshResult = await tokenManager.refreshTokens();
        if (refreshResult) {
          try {
            const { data } = await apolloClient.query<any>({
              query: GET_ME,
              fetchPolicy: 'network-only',
            });
            if (data?.me) {
              applyUser(data.me);
              return;
            }
          } catch {
            // GET_ME başarısız olsa bile event listener üzerinden gelen kullanıcı bilgisi korunur
          }
        } else {
          applyUser(null);
        }
      } catch {
        applyUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [applyUser]);

  const signInWithGoogle = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('Google OAuth yapılandırılmamış. Lütfen yöneticiye başvurun.');
    }

    try {
      // Use Google Identity Services (GIS) to get the ID token
      const idToken = await new Promise<string>((resolve, reject) => {
        if (typeof window === 'undefined' || !(window as any).google?.accounts) {
          reject(new Error('Google kimlik servisi yüklenemedi. Sayfayı yenileyip tekrar deneyin.'));
          return;
        }

        const google = (window as any).google;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            if (response.credential) {
              resolve(response.credential);
            } else {
              reject(new Error('Google giriş başarısız'));
            }
          },
          auto_select: false,
        });

        // Trigger the One Tap prompt
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Fallback: use the button flow by rendering a hidden button
            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'fixed';
            tempDiv.style.top = '-9999px';
            document.body.appendChild(tempDiv);

            google.accounts.id.renderButton(tempDiv, {
              type: 'standard',
              theme: 'outline',
            });

            const btn = tempDiv.querySelector('[role="button"]') as HTMLElement;
            if (btn) {
              btn.click();
            } else {
              document.body.removeChild(tempDiv);
              reject(new Error('Google giriş penceresi açılamadı'));
            }

            // Cleanup after a timeout
            setTimeout(() => {
              if (document.body.contains(tempDiv)) {
                document.body.removeChild(tempDiv);
              }
            }, 60000);
          }
        });
      });

      // Send to our backend
      const result = await apolloClient.mutate<any>({
        mutation: LOGIN_WITH_GOOGLE,
        variables: { idToken },
      });

      const { data } = result;

      if (data?.loginWithGoogle) {
        applyUser(data.loginWithGoogle.user);
      } else {
        throw new Error('Google girişi başarısız — sunucudan yanıt alınamadı');
      }
    } catch (error: any) {
      if (error.graphQLErrors?.length > 0) {
        throw new Error(error.graphQLErrors[0].message);
      }
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, username?: string) => {
    try {
      const result = await apolloClient.mutate<any>({
        mutation: REGISTER,
        variables: {
          email,
          password,
          username: username || email.split('@')[0],
        },
      });

      const { data } = result;
      const errors = (result as any).errors;

      // GraphQL errors kontrolü
      if (errors && errors.length > 0) {
        throw new Error(errors[0].message || 'Kayıt sırasında hata oluştu');
      }

      if (data?.register) {
        applyUser(data.register.user);
      } else {
        throw new Error('Kayıt başarısız - Sunucudan yanıt alınamadı');
      }
    } catch (error: any) {
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        throw new Error(error.graphQLErrors[0].message);
      }
      if (error.networkError) {
        throw new Error('Sunucuya bağlanılamadı. Backend çalışıyor mu kontrol edin.');
      }
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const result = await apolloClient.mutate<any>({
        mutation: LOGIN,
        variables: { email, password },
      });

      const { data } = result;

      if (data?.login) {
        applyUser(data.login.user);
      } else {
        throw new Error(
          "Giriş başarısız - Backend'den yanıt alınamadı. Lütfen Railway dashboard'da DATABASE_URL ayarını kontrol edin."
        );
      }
    } catch (error: any) {
      if (error.graphQLErrors?.length > 0) {
        const firstError = error.graphQLErrors[0];
        if (firstError.message.includes('prisma://')) {
          throw new Error(
            "Backend veritabanı bağlantı hatası. Railway'de DATABASE_URL ayarını kontrol edin."
          );
        }
        throw new Error(firstError.message);
      }
      throw error;
    }
  };

  const signOut = async () => {
    await fetch(AUTH_LOGOUT_ENDPOINT, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => null);

    tokenManager.clearTokens();
    applyUser(null);
    await apolloClient.clearStore().catch(() => undefined);
    router.replace('/');
  };

  const deleteAccount = async () => {
    try {
      const result = await apolloClient.mutate<{ deleteMyAccount: boolean }>({
        mutation: DELETE_MY_ACCOUNT,
        fetchPolicy: 'no-cache',
      });

      if (!result.data?.deleteMyAccount) {
        return { success: false, error: 'Account deletion failed' };
      }

      tokenManager.clearTokens();
      applyUser(null);
      await apolloClient.clearStore();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error?.graphQLErrors?.[0]?.message || error?.message || 'Account deletion failed',
      };
    }
  };

  const value = {
    user,
    loading,
    isPrivileged,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    signOut,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
