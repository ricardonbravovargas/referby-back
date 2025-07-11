// src/auth/roles.enum.ts - ACTUALIZADO PARA INCLUIR ADMIN
export enum UserRole {
  CLIENTE = 'cliente',
  EMPRESA = 'empresa',
  ADMIN = 'admin',
  EMBAJADOR = 'embajador',
}

// ✅ NUEVO: Funciones de utilidad para el enum
export const isValidRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
};

export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case UserRole.ADMIN:
      return 'Administrador';
    case UserRole.EMPRESA:
      return 'Empresa';
    case UserRole.EMBAJADOR:
      return 'Embajador';
    case UserRole.CLIENTE:
      return 'Cliente';
    default:
      return 'cliente';
  }
};

export const getRolePermissions = (role: UserRole): string[] => {
  switch (role) {
    case UserRole.ADMIN:
      return ['*']; // Todos los permisos
    case UserRole.EMPRESA:
      return ['manage_products', 'view_orders', 'manage_company_profile'];
    case UserRole.EMBAJADOR:
      return ['view_referrals', 'view_commissions', 'share_links'];
    case UserRole.CLIENTE:
      return ['make_purchases', 'view_orders', 'manage_profile'];
    default:
      return [];
  }
};
