import { db } from './index.ts';
import { users, shipments, auditLogs } from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import { Shipment } from '../types/shipping.ts';
import { User, AuditLog } from '../types/user.ts';

export async function getDbUsers(): Promise<any[]> {
  try {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  } catch (error) {
    console.error('Database query getDbUsers failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function upsertDbUser(userData: {
  uid: string;
  email: string;
  name: string;
  role?: string;
  company?: string;
  phone?: string;
  status?: string;
}) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid: userData.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role || 'customer',
        company: userData.company || null,
        phone: userData.phone || null,
        status: userData.status || 'active',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: userData.email,
          name: userData.name,
          lastLogin: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query upsertDbUser failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateDbUserRole(uid: string, role: string) {
  try {
    const result = await db
      .update(users)
      .set({ role })
      .where(eq(users.uid, uid))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query updateDbUserRole failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getDbShipments(): Promise<any[]> {
  try {
    return await db.select().from(shipments).orderBy(desc(shipments.createdAt));
  } catch (error) {
    console.error('Database query getDbShipments failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getDbShipmentByTracking(trackingNumber: string): Promise<any | undefined> {
  try {
    const rows = await db
      .select()
      .from(shipments)
      .where(eq(shipments.trackingNumber, trackingNumber.toUpperCase()));
    return rows[0];
  } catch (error) {
    console.error('Database query getDbShipmentByTracking failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function insertDbShipment(shipment: Shipment) {
  try {
    const result = await db
      .insert(shipments)
      .values({
        trackingNumber: shipment.trackingNumber,
        referenceNumber: shipment.referenceNumber,
        carrier: shipment.carrier,
        serviceLevel: shipment.serviceLevel,
        status: shipment.status,
        shipperName: shipment.shipper.name,
        shipperCompany: shipment.shipper.company || null,
        shipperStreet1: shipment.shipper.street1,
        shipperCity: shipment.shipper.city,
        shipperState: shipment.shipper.state,
        shipperZip: shipment.shipper.zipCode,
        shipperCountry: shipment.shipper.country,
        shipperEmail: shipment.shipper.email || null,
        recipientName: shipment.recipient.name,
        recipientCompany: shipment.recipient.company || null,
        recipientStreet1: shipment.recipient.street1,
        recipientCity: shipment.recipient.city,
        recipientState: shipment.recipient.state,
        recipientZip: shipment.recipient.zipCode,
        recipientCountry: shipment.recipient.country,
        recipientEmail: shipment.recipient.email || null,
        weightKg: shipment.package.weightKg,
        lengthCm: shipment.package.lengthCm,
        widthCm: shipment.package.widthCm,
        heightCm: shipment.package.heightCm,
        declaredValueUsd: shipment.package.declaredValueUsd,
        isFragile: shipment.package.isFragile,
        isColdChain: shipment.package.isColdChain,
        requiresSignature: shipment.package.requiresSignature,
        baseCost: shipment.rates.baseCost,
        fuelSurcharge: shipment.rates.fuelSurcharge,
        totalCost: shipment.rates.totalCost,
        currentCheckpointIndex: shipment.currentCheckpointIndex,
        checkpointsJson: JSON.stringify(shipment.checkpoints),
        proofOfDeliveryJson: shipment.proofOfDelivery ? JSON.stringify(shipment.proofOfDelivery) : null,
        specialInstructions: shipment.specialInstructions || null,
        createdAt: new Date(shipment.createdAt),
        estimatedDelivery: new Date(shipment.estimatedDelivery),
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query insertDbShipment failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateDbShipmentCheckpoint(
  trackingNumber: string,
  currentCheckpointIndex: number,
  status: string,
  proofOfDelivery?: any
) {
  try {
    const updatePayload: any = {
      currentCheckpointIndex,
      status,
    };
    if (proofOfDelivery) {
      updatePayload.proofOfDeliveryJson = JSON.stringify(proofOfDelivery);
    }

    const result = await db
      .update(shipments)
      .set(updatePayload)
      .where(eq(shipments.trackingNumber, trackingNumber.toUpperCase()))
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query updateDbShipmentCheckpoint failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getDbAuditLogs(): Promise<any[]> {
  try {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp)).limit(50);
  } catch (error) {
    console.error('Database query getDbAuditLogs failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function insertDbAuditLog(log: {
  userId: string;
  userName: string;
  role: string;
  action: string;
  details: string;
}) {
  try {
    const result = await db
      .insert(auditLogs)
      .values({
        userId: log.userId,
        userName: log.userName,
        role: log.role,
        action: log.action,
        details: log.details,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query insertDbAuditLog failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
