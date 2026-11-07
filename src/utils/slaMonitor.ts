import { Shipment, SlaInfo, SlaStatus } from '../types/shipping';

/**
 * Evaluates the SLA commitment health for a shipment.
 */
export function getShipmentSla(shipment: Shipment): SlaInfo {
  // If explicitly assigned in data, return it
  if (shipment.sla) {
    return shipment.sla;
  }

  // If delivered, mark as delivered on time
  if (shipment.status === 'delivered') {
    return {
      status: 'delivered_on_time',
      deadline: shipment.estimatedDelivery,
      bufferHealthPct: 100,
    };
  }

  const now = new Date('2026-11-05T14:00:00Z').getTime();
  const estDeliveryTime = new Date(shipment.estimatedDelivery).getTime();
  const diffMinutes = Math.round((estDeliveryTime - now) / (60 * 1000));

  // If cold chain has abnormal temperature
  if (shipment.package.isColdChain && shipment.telemetry?.ambientTempC !== undefined) {
    const target = shipment.package.targetTempC || -20;
    if (shipment.telemetry.ambientTempC > target + 3) {
      return {
        status: 'at_risk',
        deadline: shipment.estimatedDelivery,
        timeRemainingMinutes: Math.max(0, diffMinutes),
        riskReason: `Thermal excursion warning: Temperature is ${shipment.telemetry.ambientTempC}°C (Target: ${target}°C)`,
        bufferHealthPct: 20,
      };
    }
  }

  // Delivery Exception
  if (shipment.status === 'exception') {
    return {
      status: 'at_risk',
      deadline: shipment.estimatedDelivery,
      timeRemainingMinutes: Math.max(0, diffMinutes),
      riskReason: 'Carrier delivery exception or address clearance hold',
      bufferHealthPct: 15,
    };
  }

  // Overdue
  if (diffMinutes <= 0) {
    return {
      status: 'breached',
      deadline: shipment.estimatedDelivery,
      timeRemainingMinutes: 0,
      riskReason: `Commitment window elapsed by ${Math.abs(diffMinutes)} mins without delivery scan`,
      bufferHealthPct: 0,
    };
  }

  // At Risk: Less than 4 hours remaining while not out for delivery
  if (diffMinutes < 240 && shipment.status !== 'out_for_delivery') {
    return {
      status: 'at_risk',
      deadline: shipment.estimatedDelivery,
      timeRemainingMinutes: diffMinutes,
      riskReason: `Tight transit margin: ${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m remaining before cutoff`,
      bufferHealthPct: 35,
    };
  }

  // At Risk: Out for delivery with under 90 minutes remaining
  if (diffMinutes < 90 && shipment.status === 'out_for_delivery') {
    return {
      status: 'at_risk',
      deadline: shipment.estimatedDelivery,
      timeRemainingMinutes: diffMinutes,
      riskReason: `Final-mile courier route buffer critically low (${diffMinutes}m remaining)`,
      bufferHealthPct: 40,
    };
  }

  return {
    status: 'on_schedule',
    deadline: shipment.estimatedDelivery,
    timeRemainingMinutes: diffMinutes,
    bufferHealthPct: Math.min(100, Math.max(60, Math.round((diffMinutes / 1440) * 100))),
  };
}

export function formatTimeRemaining(minutes?: number): string {
  if (minutes === undefined) return '';
  if (minutes <= 0) return 'Overdue';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}
