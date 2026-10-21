export const Permissions = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_ROLE: 'users:role',
  USERS_BAN: 'users:ban',
  USERS_PERMISSIONS: 'users:permissions',
  AUCTIONS_READ: 'auctions:read',
  AUCTIONS_WRITE: 'auctions:write',
  AUCTIONS_CLOSE: 'auctions:close',
  BIDS_READ: 'bids:read',
  TRANSACTIONS_READ: 'transactions:read',
  AUDIT_READ: 'audit:read',
  EXPORT: 'export',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const ALL_PERMISSIONS: Permission[] = Object.values(Permissions);

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [Permissions.USERS_READ]: 'View user list and details',
  [Permissions.USERS_WRITE]: 'Update user profiles',
  [Permissions.USERS_ROLE]: 'Change user roles',
  [Permissions.USERS_BAN]: 'Ban or unban users',
  [Permissions.USERS_PERMISSIONS]: 'Grant or revoke permissions',
  [Permissions.AUCTIONS_READ]: 'View auction details',
  [Permissions.AUCTIONS_WRITE]: 'Create or edit auctions',
  [Permissions.AUCTIONS_CLOSE]: 'Close auctions manually',
  [Permissions.BIDS_READ]: 'View bid history',
  [Permissions.TRANSACTIONS_READ]: 'View transaction history',
  [Permissions.AUDIT_READ]: 'View audit logs',
  [Permissions.EXPORT]: 'Export data to CSV',
};
