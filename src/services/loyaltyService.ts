import { User, LoyaltyTierDefinition, ShipperLoyaltyProfile } from '../types/user';
import { Shipment } from '../types/shipping';
import { getShipments } from '../data/mockShipments';
import { getUsers } from '../data/mockUsers';

export const LOYALTY_TIERS: LoyaltyTierDefinition[] = [
  {
    id: 'bronze',
    name: 'Bronze Shipper',
    minShipments: 0,
    discountPct: 5,
    freeInsuranceBonus: false,
    priorityDispatch: false,
    dedicatedAccountManager: false,
    colorHex: '#b45309', // Amber 700
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
    description: 'Entry-level volume benefit: 5% flat commercial discount across all carrier label generations.',
  },
  {
    id: 'silver',
    name: 'Silver Freight Partner',
    minShipments: 3,
    discountPct: 10,
    freeInsuranceBonus: false,
    priorityDispatch: true,
    dedicatedAccountManager: false,
    colorHex: '#64748b', // Slate 500
    badgeBg: '#f1f5f9',
    badgeText: '#334155',
    description: '10% volume discount, priority queueing at regional automated cross-docks, and automated digital POD archiving.',
  },
  {
    id: 'gold',
    name: 'Gold Corporate Dispatcher',
    minShipments: 6,
    discountPct: 15,
    freeInsuranceBonus: true,
    priorityDispatch: true,
    dedicatedAccountManager: false,
    colorHex: '#d97706', // Amber 600
    badgeBg: '#fef9c3',
    badgeText: '#854d0e',
    description: '15% commercial discount, complimentary cargo declared value insurance coverage up to $5,000, and express customs greenline.',
  },
  {
    id: 'platinum',
    name: 'Platinum Enterprise Fleet',
    minShipments: 10,
    discountPct: 20,
    freeInsuranceBonus: true,
    priorityDispatch: true,
    dedicatedAccountManager: true,
    colorHex: '#7c3aed', // Violet 600
    badgeBg: '#ede9fe',
    badgeText: '#5b21b6',
    description: '20% top-tier rate reduction, dedicated enterprise account executive, zero fuel surcharges on express ground hauls, and custom webhook feeds.',
  },
];

/**
 * Calculates a shipper's tier given their shipment count
 */
export function getTierForShipmentCount(count: number): LoyaltyTierDefinition {
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (count >= LOYALTY_TIERS[i].minShipments) {
      return LOYALTY_TIERS[i];
    }
  }
  return LOYALTY_TIERS[0];
}

/**
 * Calculates the next available tier for a given tier
 */
export function getNextTier(currentTierId: string): LoyaltyTierDefinition | undefined {
  const currentIdx = LOYALTY_TIERS.findIndex(t => t.id === currentTierId);
  if (currentIdx >= 0 && currentIdx < LOYALTY_TIERS.length - 1) {
    return LOYALTY_TIERS[currentIdx + 1];
  }
  return undefined;
}

/**
 * Base shipment counts mapped to user accounts to simulate realistic enterprise multi-tenant shipment history
 */
const BASE_SHIPMENT_COUNTS: Record<string, { count: number; spend: number }> = {
  'usr-admin-01': { count: 14, spend: 3840.50 }, // Elena Rostova - Platinum
  'usr-ship-01': { count: 8, spend: 2150.20 },  // Marcus Vance - Gold
  'usr-ship-02': { count: 5, spend: 4720.00 },  // Sarah Jenkins - Silver (high value cold chain)
  'usr-cust-01': { count: 3, spend: 575.10 },   // Dr. Evelyn Martinez - Silver
  'usr-cust-02': { count: 2, spend: 420.00 },   // Lord Arthur Sterling - Bronze
  'usr-cust-03': { count: 1, spend: 253.00 },   // Julien Mercier - Bronze
};

/**
 * Calculates the complete loyalty profile for any user by correlating mockUsers with live mockShipments
 */
export function calculateUserLoyaltyProfile(user: User, shipments?: Shipment[]): ShipperLoyaltyProfile {
  const activeShipments = shipments || getShipments();

  // Match shipments created by this user or matching company/email/name
  const userEmail = (user.email || '').toLowerCase();
  const userName = (user.name || '').toLowerCase();
  const userCompany = (user.company || '').toLowerCase();

  const matchingShipments = activeShipments.filter(s => {
    const sName = (s.shipper.name || '').toLowerCase();
    const sEmail = (s.shipper.email || '').toLowerCase();
    const sCompany = (s.shipper.company || '').toLowerCase();

    return (
      (userEmail && sEmail === userEmail) ||
      (userName && sName === userName) ||
      (userCompany && sCompany.includes(userCompany.slice(0, 8))) ||
      (sCompany && userCompany.includes(sCompany.slice(0, 8)))
    );
  });

  const baseData = BASE_SHIPMENT_COUNTS[user.id] || { count: 0, spend: 0 };
  const totalShipments = Math.max(baseData.count, matchingShipments.length);

  // Sum spend
  const liveSpend = matchingShipments.reduce((acc, s) => acc + (s.rates?.totalCost || 0), 0);
  const totalFreightSpendUsd = Math.round((Math.max(baseData.spend, liveSpend) + Number.EPSILON) * 100) / 100;

  const currentTier = getTierForShipmentCount(totalShipments);
  const nextTier = getNextTier(currentTier.id);

  let shipmentsToNextTier = 0;
  let progressPctToNextTier = 100;

  if (nextTier) {
    shipmentsToNextTier = Math.max(0, nextTier.minShipments - totalShipments);
    const prevMin = currentTier.minShipments;
    const nextMin = nextTier.minShipments;
    const span = nextMin - prevMin;
    const progress = totalShipments - prevMin;
    progressPctToNextTier = Math.min(100, Math.max(0, Math.round((progress / span) * 100)));
  }

  // Estimated savings based on current discount tier
  const discountMultiplier = currentTier.discountPct / 100;
  const totalEstimatedSavingsUsd = Math.round((totalFreightSpendUsd * discountMultiplier) * 100) / 100;

  // Last shipment date
  const lastShipmentDate = matchingShipments.length > 0
    ? matchingShipments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
    : '2026-11-04T08:15:00Z';

  return {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    companyName: user.company || 'Enterprise Shipper Account',
    userRole: user.role,
    totalShipments,
    totalFreightSpendUsd,
    currentTier,
    nextTier,
    shipmentsToNextTier,
    progressPctToNextTier,
    totalEstimatedSavingsUsd,
    loyaltyMemberSince: user.createdAt || '2026-01-10T08:00:00Z',
    lastShipmentDate,
  };
}

/**
 * Returns loyalty profiles for all registered users in the UserManagementConsole
 */
export function getAllShipperLoyaltyProfiles(users?: User[], shipments?: Shipment[]): ShipperLoyaltyProfile[] {
  const allUsers = users || getUsers();
  const allShipments = shipments || getShipments();

  return allUsers.map(user => calculateUserLoyaltyProfile(user, allShipments));
}
