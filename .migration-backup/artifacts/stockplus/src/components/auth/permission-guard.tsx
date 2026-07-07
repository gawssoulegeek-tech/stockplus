'use client';

import { ReactNode } from 'react';
import { PermissionId, Permissions } from '@/types/supabase';
import { hasPermission } from '@/lib/auth-helpers';

interface PermissionGuardProps {
  role: string | undefined;
  permissions: Permissions | undefined;
  permission: PermissionId;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({
  role,
  permissions,
  permission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  if (hasPermission(role, permissions, permission)) return <>{children}</>;
  return <>{fallback}</>;
}
