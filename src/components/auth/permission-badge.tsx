'use client';

import { ShieldCheck, ShieldX } from 'lucide-react';
import { PermissionId, Permissions } from '@/types/supabase';
import { hasPermission } from '@/lib/auth-helpers';

interface PermissionBadgeProps {
  role: string | undefined;
  permissions: Permissions | undefined;
  permission: PermissionId;
  label: string;
}

const PERMISSION_LABELS: Record<PermissionId, string> = {
  canManageUsers: 'Gérer les utilisateurs',
  canDeleteSales: 'Supprimer des ventes',
  canManageFeatures: 'Gérer les fonctionnalités',
  canViewReports: 'Voir les rapports',
  canUseAdvancedIA: 'IA avancée',
  canExportData: 'Exporter les données',
  canManageProducts: 'Gérer les produits',
  canManageInventory: 'Gérer l\'inventaire',
};

export function PermissionBadge({ role, permissions, permission, label }: PermissionBadgeProps) {
  const allowed = hasPermission(role, permissions, permission);
  return (
    <div className="flex items-center gap-2 text-sm">
      {allowed ? (
        <ShieldCheck className="h-4 w-4 text-green-500" />
      ) : (
        <ShieldX className="h-4 w-4 text-gray-300" />
      )}
      <span className={allowed ? 'text-gray-900 font-medium' : 'text-gray-400'}>
        {label || PERMISSION_LABELS[permission]}
      </span>
    </div>
  );
}
