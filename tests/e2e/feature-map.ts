type Feature = {
  path: `/${string}`;
  access: 'public' | 'guest' | 'user' | 'admin';
  what: string;
};

export const FEATURES = [
  { path: '/', access: 'public', what: 'Landing page' },
  { path: '/login', access: 'guest', what: 'Sign in with password, magic link or passkey' },
  { path: '/signup', access: 'guest', what: 'Create an account' },
  { path: '/forgot-password', access: 'guest', what: 'Request a password reset link' },
  { path: '/reset-password', access: 'guest', what: 'Choose a new password' },
  { path: '/verify-email', access: 'guest', what: 'Get instructions for verifying your email' },
  { path: '/home', access: 'user', what: 'Signed-in home' },
  { path: '/account', access: 'user', what: 'Manage your profile and passkeys' },
  { path: '/admin', access: 'admin', what: 'Read-only admin dashboard' },
] as const satisfies readonly Feature[];
