export type UserRole = 'admin' | 'shipper' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
  phone?: string;
  status: 'active' | 'suspended';
  avatarInitials: string;
  createdAt: string;
  lastLogin: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  details: string;
}

export interface CarrierConfig {
  carrier: 'fedex' | 'ups' | 'usps' | 'dhl' | 'vanguard';
  name: string;
  apiStatus: 'connected' | 'degraded' | 'maintenance';
  environment: 'production' | 'sandbox';
  fuelSurchargePct: number;
  rateDiscountPct: number;
  accountNumber: string;
}

export type LoyaltyTierId = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface LoyaltyTierDefinition {
  id: LoyaltyTierId;
  name: string;
  minShipments: number;
  discountPct: number; // e.g. 5, 10, 15, 20
  freeInsuranceBonus: boolean;
  priorityDispatch: boolean;
  dedicatedAccountManager: boolean;
  colorHex: string;
  badgeBg: string;
  badgeText: string;
  description: string;
}

export interface ShipperLoyaltyProfile {
  userId: string;
  userName: string;
  userEmail: string;
  companyName: string;
  userRole: UserRole;
  totalShipments: number;
  totalFreightSpendUsd: number;
  currentTier: LoyaltyTierDefinition;
  nextTier?: LoyaltyTierDefinition;
  shipmentsToNextTier: number;
  progressPctToNextTier: number;
  totalEstimatedSavingsUsd: number;
  loyaltyMemberSince: string;
  lastShipmentDate?: string;
}
