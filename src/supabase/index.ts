/**
 * Supabase Index
 * Central export point for all Supabase modules
 * Import Supabase utilities with: import { useSupabaseAuth, getSupabaseClient } from '@/supabase'
 */

// Configuration
export { supabaseConfig, validateSupabaseConfig } from './config';

// Client helpers
export { getSupabaseClient, supabase } from './client';

// Note: getSupabaseServerClient is available from '@/supabase/server' (Server Components only)
// Note: updateSession is available from '@/supabase/middleware' (middleware only)

// Auth service functions
export {
  signInUser,
  signOutUser,
  resetPassword,
  getUserProfile,
  getBoutique,
  createUserProfile,
  createBoutique,
} from './auth-service';

export type {
  SignUpData,
  AuthResponse,
  UserProfile,
  BoutiqueData,
} from './auth-service';

// React Hooks
export {
  useSupabaseUser,
  useSupabaseAuth,
  useSupabaseSignIn,
  useSupabaseSignUp,
  useSupabaseSignOut,
  useSupabaseQuery,
  useSupabaseAuthWithProfile,
} from './hooks';

// Type exports
export type { User, Session, AuthError } from '@supabase/supabase-js';
