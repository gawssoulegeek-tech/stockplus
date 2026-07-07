import { Role, Permissions, PermissionId, DEFAULT_OWNER_PERMISSIONS, DEFAULT_MANAGER_PERMISSIONS } from '@/types/supabase';

export function hasRole(userRole: string | undefined, allowedRoles: Role[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole as Role);
}

export function hasPermission(
  role: string | undefined,
  permissions: Permissions | undefined,
  permission: PermissionId
): boolean {
  if (role === 'superadmin') return true;
  if (!permissions) return false;
  return permissions[permission] === true;
}

export function getDefaultPermissions(role: string): Permissions {
  switch (role) {
    case 'owner':
      return DEFAULT_OWNER_PERMISSIONS;
    case 'manager':
      return DEFAULT_MANAGER_PERMISSIONS;
    default:
      return {
        canManageUsers: false,
        canDeleteSales: false,
        canManageFeatures: false,
        canViewReports: false,
        canUseAdvancedIA: false,
        canExportData: false,
        canManageProducts: false,
        canManageInventory: false,
      };
  }
}

export function formatRole(role: string): string {
  const labels: Record<string, string> = {
    superadmin: 'Super Admin',
    owner: 'Propriétaire',
    manager: 'Gérant',
    staff: 'Staff',
    admin: 'Propriétaire',
  };
  return labels[role] || role;
}
