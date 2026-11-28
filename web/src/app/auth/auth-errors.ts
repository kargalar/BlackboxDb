import { CombinedGraphQLErrors } from '@apollo/client/errors';

const authErrorMessages: Record<string, string> = {
  INVALID_CREDENTIALS: 'errors.invalidCredentials',
  EMAIL_IN_USE: 'errors.emailInUse',
  USERNAME_IN_USE: 'errors.usernameInUse',
  PASSWORD_TOO_SHORT: 'register.errorLength',
};

export function authErrorMessage(error: unknown, fallback: string) {
  if (CombinedGraphQLErrors.is(error)) {
    const code = error.errors[0]?.extensions?.code;
    if (typeof code === 'string' && Object.hasOwn(authErrorMessages, code)) {
      return authErrorMessages[code];
    }
  }
  return fallback;
}
