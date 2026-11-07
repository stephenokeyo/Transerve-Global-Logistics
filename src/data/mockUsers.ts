import { User, AuditLog, CarrierConfig, UserRole } from '../types/user';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin-01',
    name: 'Elena Rostova',
    email: 'e.rostova@transerve-logistics.com',
    role: 'admin',
    company: 'Transerve Logistics HQ',
    phone: '+1 (312) 555-0100',
    status: 'active',
    avatarInitials: 'ER',
    createdAt: '2026-01-10T08:00:00Z',
    lastLogin: 'Just now',
  },
  {
    id: 'usr-ship-01',
    name: 'Marcus Vance',
    email: 'logistics@apexengineering.com',
    role: 'shipper',
    company: 'Apex Precision Engineering',
    phone: '+1 (512) 555-0188',
    status: 'active',
    avatarInitials: 'MV',
    createdAt: '2026-02-14T10:30:00Z',
    lastLogin: '15 mins ago',
  },
  {
    id: 'usr-ship-02',
    name: 'Sarah Jenkins',
    email: 'coldchain@novartis.com',
    role: 'shipper',
    company: 'Novartis Biologics Hub',
    phone: '+1 (617) 555-8810',
    status: 'active',
    avatarInitials: 'SJ',
    createdAt: '2026-03-01T14:10:00Z',
    lastLogin: '2 hours ago',
  },
  {
    id: 'usr-cust-01',
    name: 'Dr. Evelyn Martinez',
    email: 'e.martinez@aeroresearch.org',
    role: 'customer',
    company: 'Aero Dynamics Research Labs',
    phone: '+1 (214) 555-8329',
    status: 'active',
    avatarInitials: 'EM',
    createdAt: '2026-04-12T09:20:00Z',
    lastLogin: '45 mins ago',
  },
  {
    id: 'usr-cust-02',
    name: 'Lord Arthur Sterling',
    email: 'a.sterling@sterlingfinch.co.uk',
    role: 'customer',
    company: 'Sterling & Finch Capital Ltd',
    phone: '+44 20 7946 0912',
    status: 'active',
    avatarInitials: 'AS',
    createdAt: '2026-05-18T16:45:00Z',
    lastLogin: '1 day ago',
  },
  {
    id: 'usr-cust-03',
    name: 'Julien Mercier',
    email: 'logistique@ateliercreation.fr',
    role: 'customer',
    company: 'Atelier de Création Paris',
    phone: '+33 1 42 68 00 00',
    status: 'active',
    avatarInitials: 'JM',
    createdAt: '2026-06-22T11:00:00Z',
    lastLogin: '3 days ago',
  },
];

export const INITIAL_CARRIER_CONFIGS: CarrierConfig[] = [
  {
    carrier: 'vanguard',
    name: 'Transerve Express Telematics Network',
    apiStatus: 'connected',
    environment: 'production',
    fuelSurchargePct: 12.0,
    rateDiscountPct: 15.0,
    accountNumber: 'VG-GLOBAL-9941',
  },
  {
    carrier: 'fedex',
    name: 'FedEx Web Services REST API',
    apiStatus: 'connected',
    environment: 'production',
    fuelSurchargePct: 13.0,
    rateDiscountPct: 10.0,
    accountNumber: 'FDX-COMM-840192',
  },
  {
    carrier: 'ups',
    name: 'UPS Developer Kit OAuth API',
    apiStatus: 'connected',
    environment: 'production',
    fuelSurchargePct: 13.5,
    rateDiscountPct: 12.0,
    accountNumber: '1Z-CORP-33910',
  },
  {
    carrier: 'usps',
    name: 'USPS Web Tools & 22-digit IMpb API',
    apiStatus: 'connected',
    environment: 'production',
    fuelSurchargePct: 6.0,
    rateDiscountPct: 8.0,
    accountNumber: 'USPS-EV-44019',
  },
  {
    carrier: 'dhl',
    name: 'DHL Express MyDHL API',
    apiStatus: 'connected',
    environment: 'production',
    fuelSurchargePct: 15.0,
    rateDiscountPct: 5.0,
    accountNumber: 'DHL-INT-99201',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-001',
    timestamp: '2026-11-05T21:40:00Z',
    userId: 'usr-admin-01',
    userName: 'Elena Rostova',
    role: 'admin',
    action: 'SYSTEM_SETTINGS_UPDATE',
    details: 'Calibrated global diesel & jet-A fuel surcharge indexes to current IATA baseline',
  },
  {
    id: 'log-002',
    timestamp: '2026-11-05T20:15:00Z',
    userId: 'usr-ship-01',
    userName: 'Marcus Vance',
    role: 'shipper',
    action: 'SHIPMENT_LABEL_GENERATED',
    details: 'Generated 4x6 thermal shipping label for VG-849204819-US via Transerve Overnight API',
  },
  {
    id: 'log-003',
    timestamp: '2026-11-05T19:05:00Z',
    userId: 'usr-admin-01',
    userName: 'Elena Rostova',
    role: 'admin',
    action: 'USER_ROLE_ELEVATED',
    details: 'Elevated user Sarah Jenkins to Shipper role for Novartis Biologics facility',
  },
  {
    id: 'log-004',
    timestamp: '2026-11-05T18:30:00Z',
    userId: 'usr-cust-01',
    userName: 'Dr. Evelyn Martinez',
    role: 'customer',
    action: 'DELIVERY_INSTRUCTIONS_UPDATED',
    details: 'Added special security access directive for receiving bay Dock C',
  },
];

const USER_STORAGE_KEY = 'vanguard_users_v1';
const CURRENT_USER_KEY = 'vanguard_current_user_v1';
const AUDIT_STORAGE_KEY = 'vanguard_audit_logs_v1';
const CARRIER_CONFIG_KEY = 'vanguard_carrier_configs_v1';

export function getUsers(): User[] {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed reading users from storage', e);
  }
  saveUsers(INITIAL_USERS);
  return INITIAL_USERS;
}

export function saveUsers(users: User[]): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed writing users to storage', e);
  }
}

export function getCurrentUser(): User {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) return parsed;
    }
  } catch (e) {
    console.error('Failed reading current user', e);
  }
  // Default to Admin Elena Rostova so full capabilities can be viewed and tested immediately
  setCurrentUser(INITIAL_USERS[0]);
  return INITIAL_USERS[0];
}

export function setCurrentUser(user: User): void {
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed setting current user', e);
  }
}

export function updateUserRole(userId: string, newRole: UserRole, adminUser: User): User | null {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) return null;

  const target = users[index];
  const oldRole = target.role;
  target.role = newRole;
  users[index] = target;
  saveUsers(users);

  // If currently active user was modified, update active user too
  const active = getCurrentUser();
  if (active.id === userId) {
    active.role = newRole;
    setCurrentUser(active);
  }

  // Record audit log
  addAuditLog({
    userId: adminUser.id,
    userName: adminUser.name,
    role: adminUser.role,
    action: 'USER_ROLE_CHANGED',
    details: `Updated role for ${target.name} (${target.email}) from ${oldRole.toUpperCase()} to ${newRole.toUpperCase()}`,
  });

  return target;
}

export function updateUserStatus(userId: string, newStatus: 'active' | 'suspended', adminUser: User): User | null {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) return null;

  const target = users[index];
  target.status = newStatus;
  users[index] = target;
  saveUsers(users);

  addAuditLog({
    userId: adminUser.id,
    userName: adminUser.name,
    role: adminUser.role,
    action: 'USER_STATUS_CHANGED',
    details: `Changed account status for ${target.name} to ${newStatus.toUpperCase()}`,
  });

  return target;
}

export function addUser(user: Omit<User, 'id' | 'createdAt' | 'lastLogin' | 'avatarInitials'>, adminUser: User): User {
  const users = getUsers();
  const initials = user.name
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  const newUser: User = {
    ...user,
    id: `usr-${Date.now()}`,
    avatarInitials: initials,
    createdAt: new Date().toISOString(),
    lastLogin: 'Never',
  };

  const updated = [...users, newUser];
  saveUsers(updated);

  addAuditLog({
    userId: adminUser.id,
    userName: adminUser.name,
    role: adminUser.role,
    action: 'USER_CREATED',
    details: `Created new account for ${newUser.name} with role ${newUser.role.toUpperCase()}`,
  });

  return newUser;
}

export function getAuditLogs(): AuditLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed reading audit logs', e);
  }
  return INITIAL_AUDIT_LOGS;
}

export function addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
  const current = getAuditLogs();
  const newLog: AuditLog = {
    ...log,
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify([newLog, ...current].slice(0, 50)));
  } catch (e) {
    console.error('Failed storing audit log', e);
  }
}

export function getCarrierConfigs(): CarrierConfig[] {
  try {
    const raw = localStorage.getItem(CARRIER_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed reading carrier configs', e);
  }
  return INITIAL_CARRIER_CONFIGS;
}

export function saveCarrierConfigs(configs: CarrierConfig[]): void {
  try {
    localStorage.setItem(CARRIER_CONFIG_KEY, JSON.stringify(configs));
  } catch (e) {
    console.error('Failed writing carrier configs', e);
  }
}
