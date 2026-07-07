/**
 * Supabase React Hooks
 * Custom hooks for Supabase operations in React components
 * Use with 'use client' directive
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { getSupabaseClient } from './client';
import type { User } from '@supabase/supabase-js';

/**
 * Hook to get current authenticated user
 * @returns { user, loading, error }
 */
export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { user },
          error: getUserError,
        } = await supabase.auth.getUser();

        if (getUserError) {
          setError(getUserError);
        } else {
          setUser(user);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, []);

  return { user, loading, error };
}

/**
 * Hook to subscribe to auth state changes
 * @returns { user, loading }
 */
export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Get initial user
    const getInitialUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getInitialUser();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { user, loading };
}

/**
 * Hook to sign in with email and password
 * @param email - User email
 * @param password - User password
 * @returns { data, error, isLoading, signIn }
 */
export function useSupabaseSignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError);
        return { data: null, error: signInError };
      }

      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, error, signIn };
}

/**
 * Hook to sign up with email and password
 * @param email - User email
 * @param password - User password
 * @param options - Additional options (data, redirectTo, etc)
 * @returns { data, error, isLoading, signUp }
 */
export function useSupabaseSignUp() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signUp = async (
    email: string,
    password: string,
    options?: { data?: Record<string, any>; redirectTo?: string }
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options,
      });

      if (signUpError) {
        setError(signUpError);
        return { data: null, error: signUpError };
      }

      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, error, signUp };
}

/**
 * Hook to sign out
 * @returns { isLoading, error, signOut }
 */
export function useSupabaseSignOut() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signOut = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError(signOutError);
        return { error: signOutError };
      }

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, error, signOut };
}

/**
 * Hook to query Supabase realtime data
 * @param table - Table name
 * @param query - Query builder function
 * @returns { data, loading, error }
 */
export function useSupabaseQuery<T>(
  table: string,
  buildQuery?: (query: any) => any
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ⚠️ Fix : buildQuery est recréée à chaque rendu par l'appelant →
  // on la stocke dans une ref pour éviter la boucle infinie d'effet.
  const buildQueryRef = useRef(buildQuery);
  useEffect(() => {
    buildQueryRef.current = buildQuery;
  });

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseClient();
        let query = supabase.from(table).select('*');

        if (buildQueryRef.current) {
          query = buildQueryRef.current(query);
        }

        const { data, error: queryError } = await query;

        if (cancelled) return;
        if (queryError) {
          setError(queryError);
        } else {
          setData(data as T[]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [table]);

  return { data, loading, error };
}

/**
 * Hook to get user profile with boutique (for dashboard layout)
 * Compatible with Firebase useUser signature
 * @returns { user, isLoading } where user has uid, email, name, role, boutique_id
 */
export function useSupabaseAuthWithProfile() {
  const [user, setUser] = useState<any | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
      if (!session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        // Fetch user profile from users table
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('uid', session.user.id)
          .single();

        if (profileError || !profileData) {
          // Profile doesn't exist yet, return auth user info
          setUser({
            uid: session.user.id,
            email: session.user.email,
            isLoading: false,
          });
        } else {
          setUser({
            uid: session.user.id,
            email: profileData.email,
            name: profileData.name,
            role: profileData.role,
            boutique_id: profileData.boutique_id,
            created_at: profileData.created_at,
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUser({
          uid: session.user.id,
          email: session.user.email,
        });
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { user, isLoading };
}
