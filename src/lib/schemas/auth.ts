import { z } from 'zod';

// Every auth form action validates its input against one of these. zod is the
// single validation layer — never hand-roll checks in an action.

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Missing reset token'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const renamePasskeySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Name is required').max(60),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RenamePasskeyInput = z.infer<typeof renamePasskeySchema>;
