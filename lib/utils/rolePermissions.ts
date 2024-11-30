export type UserRole = 'admin' | 'user' | 'accountant';

interface Permission {
  createUser: boolean;
  createAgent: boolean;
  addMeter: boolean;
  viewReports: boolean;
  manageSales: boolean;
  viewInventory: boolean;
  manageAgents: boolean;
}

export const rolePermissions: Record<UserRole, Permission> = {
  admin: {
    createUser: true,
    createAgent: true,
    addMeter: true,
    viewReports: true,
    manageSales: true,
    viewInventory: true,
    manageAgents: true,
  },
  accountant: {
    createUser: false,
    createAgent: false,
    addMeter: false,
    viewReports: true,
    manageSales: true,
    viewInventory: true,
    manageAgents: true,
  },
  user: {
    createUser: false,
    createAgent: false,
    addMeter: false,
    viewReports: false,
    manageSales: true,
    viewInventory: true,
    manageAgents: false,
  },
};

export const hasPermission = (role: UserRole, permission: keyof Permission): boolean => {
  return rolePermissions[role]?.[permission] ?? false;
}; 