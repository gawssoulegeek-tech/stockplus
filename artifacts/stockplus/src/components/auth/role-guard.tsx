'use client';

import { ReactNode } from 'react';
import { Role } from '@/types/supabase';
import { hasRole } from '@/lib/auth-helpers';

interface RoleGuardProps {
  userRole: string | undefined;
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ userRole, roles, children, fallback = null }: RoleGuardProps) {
  if (hasRole(userRole, roles)) return <>{children}</>;
  return <>{fallback}</>;
}
