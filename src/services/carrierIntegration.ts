import { Carrier, ServiceLevel, Shipment, Checkpoint, Address, PackageDetails, RateOption, VehicleTelemetry } from '../types/shipping';

export interface RateCalculationRequest {
  originZip: string;
  originCountry: string;
  destZip: string;
  destCountry: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packageType: string;
  declaredValueUsd: number;
  isFragile: boolean;
  isColdChain: boolean;
  requiresSignature: boolean;
}

export interface CarrierServiceDescriptor {
  carrier: Carrier;
  carrierName: string;
  serviceCode: string;
  serviceLevel: ServiceLevel;
  transitDays: number;
  deliveryTimeWindow: string;
  baseRatePerKg: number;
  fixedBase: number;
  fuelRate: number;
  logoColor: string;
}

export const CARRIER_CATALOG: CarrierServiceDescriptor[] = [
  // Transerve Direct
  {
    carrier: 'vanguard',
    carrierName: 'Transerve Express Priority',
    serviceCode: 'VG_PRIORITY_OVN',
    serviceLevel: 'PRIORITY OVERNIGHT',
    transitDays: 1,
    deliveryTimeWindow: 'Next Morning by 10:30 AM',
    baseRatePerKg: 14.50,
    fixedBase: 45.00,
    fuelRate: 0.12,
    logoColor: '#0f172a',
  },
  {
    carrier: 'vanguard',
    carrierName: 'Transerve Expedited Air',
    serviceCode: 'VG_EXPEDITED_AIR',
    serviceLevel: 'EXPEDITED AIR FREIGHT',
    transitDays: 2,
    deliveryTimeWindow: '2nd Day by 16:30 PM',
    baseRatePerKg: 10.20,
    fixedBase: 35.00,
    fuelRate: 0.11,
    logoColor: '#0f172a',
  },
  {
    carrier: 'vanguard',
    carrierName: 'Transerve Ground Freight',
    serviceCode: 'VG_GROUND_FRT',
    serviceLevel: 'GROUND FREIGHT',
    transitDays: 3,
    deliveryTimeWindow: 'Standard Business Hours',
    baseRatePerKg: 5.80,
    fixedBase: 22.00,
    fuelRate: 0.09,
    logoColor: '#0f172a',
  },
  {
    carrier: 'vanguard',
    carrierName: 'Transerve Cold-Chain Certified',
    serviceCode: 'VG_COLD_CHAIN',
    serviceLevel: 'COLD CHAIN PHARMA',
    transitDays: 1,
    deliveryTimeWindow: 'Cryo-Guaranteed 09:00 AM',
    baseRatePerKg: 28.00,
    fixedBase: 120.00,
    fuelRate: 0.14,
    logoColor: '#0891b2',
  },
  // FedEx
  {
    carrier: 'fedex',
    carrierName: 'FedEx Priority Overnight®',
    serviceCode: 'FDX_PRIORITY_OVN',
    serviceLevel: 'PRIORITY OVERNIGHT',
    transitDays: 1,
    deliveryTimeWindow: 'Next Business Day by 10:30 AM',
    baseRatePerKg: 16.20,
    fixedBase: 49.00,
    fuelRate: 0.13,
    logoColor: '#4c1d95',
  },
  {
    carrier: 'fedex',
    carrierName: 'FedEx 2Day®',
    serviceCode: 'FDX_2DAY',
    serviceLevel: 'FEDEX 2DAY',
    transitDays: 2,
    deliveryTimeWindow: '2nd Business Day by 16:30 PM',
    baseRatePerKg: 9.80,
    fixedBase: 32.00,
    fuelRate: 0.12,
    logoColor: '#4c1d95',
  },
  // UPS
  {
    carrier: 'ups',
    carrierName: 'UPS Next Day Air®',
    serviceCode: 'UPS_NEXT_DAY_AIR',
    serviceLevel: 'UPS NEXT DAY AIR',
    transitDays: 1,
    deliveryTimeWindow: 'Next Day by 12:00 PM',
    baseRatePerKg: 15.80,
    fixedBase: 48.00,
    fuelRate: 0.135,
    logoColor: '#78350f',
  },
  {
    carrier: 'ups',
    carrierName: 'UPS Ground®',
    serviceCode: 'UPS_GROUND',
    serviceLevel: 'UPS GROUND',
    transitDays: 3,
    deliveryTimeWindow: 'End of Day (1-5 Days)',
    baseRatePerKg: 4.90,
    fixedBase: 18.50,
    fuelRate: 0.10,
    logoColor: '#78350f',
  },
  // USPS
  {
    carrier: 'usps',
    carrierName: 'USPS Priority Mail®',
    serviceCode: 'USPS_PRIORITY',
    serviceLevel: 'USPS PRIORITY MAIL',
    transitDays: 2,
    deliveryTimeWindow: '2-3 Business Days by 18:00 PM',
    baseRatePerKg: 6.20,
    fixedBase: 12.80,
    fuelRate: 0.06,
    logoColor: '#1e3a8a',
  },
  // DHL Express
  {
    carrier: 'dhl',
    carrierName: 'DHL Express Worldwide®',
    serviceCode: 'DHL_EXPRESS_WW',
    serviceLevel: 'DHL EXPRESS WORLDWIDE',
    transitDays: 2,
    deliveryTimeWindow: 'End of Day International',
    baseRatePerKg: 19.50,
    fixedBase: 65.00,
    fuelRate: 0.15,
    logoColor: '#b45309',
  },
];

/**
 * Calculates carrier shipping rates based on physical & dimensional weight and distance zone
 */
export function calculateLiveCarrierRates(req: RateCalculationRequest): RateOption[] {
  // Dimensional weight calculation: (L * W * H in cm) / 5000 = Dim weight in kg
  const volumeCm3 = req.lengthCm * req.widthCm * req.heightCm;
  const dimensionalWeightKg = volumeCm3 / 5000;
  const billableWeightKg = Math.max(req.weightKg, dimensionalWeightKg, 0.5);

  // Estimate zone delta from postal codes
  const isInternational = req.originCountry.toLowerCase() !== req.destCountry.toLowerCase();
  const zipDiff = Math.abs(parseInt(req.originZip.slice(0, 2) || '10', 10) - parseInt(req.destZip.slice(0, 2) || '90', 10));
  const zoneMultiplier = isInternational ? 2.4 : 1.0 + (Math.min(zipDiff, 80) / 100);

  // Additional surcharges
  const signatureCost = req.requiresSignature ? 6.50 : 0;
  const fragileCost = req.isFragile ? 12.00 : 0;
  const coldChainCost = req.isColdChain ? 65.00 : 0;
  const insuranceCost = req.declaredValueUsd > 100 ? (req.declaredValueUsd * 0.008) : 0;

  const now = new Date();

  return CARRIER_CATALOG
    .filter(desc => {
      // Cold chain only supports cold chain capable tiers
      if (req.isColdChain && !desc.serviceLevel.includes('COLD') && desc.carrier !== 'dhl' && desc.carrier !== 'vanguard') {
        return false;
      }
      return true;
    })
    .map(desc => {
      const deliveryDateObj = new Date(now.getTime() + desc.transitDays * 24 * 60 * 60 * 1000);
      const deliveryDate = deliveryDateObj.toISOString().split('T')[0];

      const baseWeightCost = billableWeightKg * desc.baseRatePerKg * zoneMultiplier;
      const baseCost = Math.round((desc.fixedBase + baseWeightCost + signatureCost + fragileCost + coldChainCost) * 100) / 100;
      const fuelSurcharge = Math.round((baseCost * desc.fuelRate) * 100) / 100;
      const totalCost = Math.round((baseCost + fuelSurcharge + insuranceCost) * 100) / 100;

      return {
        carrier: desc.carrier,
        carrierName: desc.carrierName,
        serviceLevel: desc.serviceLevel,
        deliveryDate,
        deliveryTimeWindow: desc.deliveryTimeWindow,
        transitDays: desc.transitDays,
        baseCost,
        fuelSurcharge,
        insuranceCost: Math.round(insuranceCost * 100) / 100,
        totalCost,
      };
    })
    .sort((a, b) => a.totalCost - b.totalCost);
}

/**
 * Programmatically generates an authentic carrier tracking number
 */
export function generateCarrierTrackingNumber(carrier: Carrier): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);

  switch (carrier) {
    case 'fedex':
      // 12-digit standard FedEx format (e.g. 7946 8812 4019)
      return `7946${timestamp}${random}`.slice(0, 12);
    case 'ups':
      // Standard UPS 1Z + 6 char shipper account + 2 digit service + 8 digit package + check digit
      return `1Z999VG80${timestamp}${random}`.slice(0, 18);
    case 'usps':
      // 22-digit standard USPS IMpb format
      return `940011189956${timestamp}${random}`.padEnd(22, '0').slice(0, 22);
    case 'dhl':
      // 10-digit international DHL format
      return `JJD00${timestamp}${random}`.slice(0, 10);
    case 'vanguard':
    default:
      return `VG-${timestamp}${random}-US`;
  }
}

/**
 * Approximate geographical coordinates for US / Global city lookups
 */
export function getCityCoordinates(city: string, state: string): { lat: number; lng: number } {
  const normalized = `${city.trim().toLowerCase()}, ${state.trim().toLowerCase()}`;
  const KNOWN_COORDS: Record<string, { lat: number; lng: number }> = {
    'chicago, il': { lat: 41.8781, lng: -87.6298 },
    'dallas, tx': { lat: 32.7767, lng: -96.7970 },
    'new york, ny': { lat: 40.7128, lng: -74.0060 },
    'london, ldn': { lat: 51.5074, lng: -0.1278 },
    'london, eng': { lat: 51.5074, lng: -0.1278 },
    'seattle, wa': { lat: 47.6062, lng: -122.3321 },
    'los angeles, ca': { lat: 34.0522, lng: -118.2437 },
    'san francisco, ca': { lat: 37.7749, lng: -122.4194 },
    'austin, tx': { lat: 30.2672, lng: -97.7431 },
    'boston, ma': { lat: 42.3601, lng: -71.0589 },
    'atlanta, ga': { lat: 33.7490, lng: -84.3880 },
    'miami, fl': { lat: 25.7617, lng: -80.1918 },
    'denver, co': { lat: 39.7392, lng: -104.9903 },
    'phoenix, az': { lat: 33.4484, lng: -112.0740 },
    'tokyo, tk': { lat: 35.6762, lng: 139.6503 },
    'frankfurt, he': { lat: 50.1109, lng: 8.6821 },
    'paris, idf': { lat: 48.8566, lng: 2.3522 },
    'rotterdam, zh': { lat: 51.9244, lng: 4.4777 },
  };

  if (KNOWN_COORDS[normalized]) {
    return KNOWN_COORDS[normalized];
  }

  // Fallback heuristic based on hash for smooth vector plotting
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  const lat = 30 + (Math.abs(hash % 1800) / 100);
  const lng = -120 + (Math.abs((hash * 7) % 4500) / 100);
  return { lat, lng };
}

/**
 * Programmatically builds a new shipment with checkpoints & telematics
 */
export function buildProgrammaticShipment(params: {
  shipper: Address;
  recipient: Address;
  packageDetails: PackageDetails;
  selectedRate: RateOption;
  specialInstructions?: string;
}): Shipment {
  const trackingNumber = generateCarrierTrackingNumber(params.selectedRate.carrier);
  const referenceNumber = `REF-${Math.floor(100000 + Math.random() * 900000)}`;
  const now = new Date();

  const originCoords = getCityCoordinates(params.shipper.city, params.shipper.state);
  const destCoords = getCityCoordinates(params.recipient.city, params.recipient.state);

  // Generate intermediate waypoint
  const midLat = (originCoords.lat + destCoords.lat) / 2;
  const midLng = (originCoords.lng + destCoords.lng) / 2;

  const checkpoints: Checkpoint[] = [
    {
      id: `cp-gen-1-${Date.now()}`,
      timestamp: now.toISOString(),
      location: `${params.shipper.city}, ${params.shipper.state}`,
      city: params.shipper.city,
      state: params.shipper.state,
      country: params.shipper.country,
      status: 'label_created',
      description: `Shipping label created via ${params.selectedRate.carrierName} API. Awaiting carrier pickup.`,
      facilityName: `${params.shipper.city} Automated Gateway`,
      lat: originCoords.lat,
      lng: originCoords.lng,
    },
    {
      id: `cp-gen-2-${Date.now()}`,
      timestamp: new Date(now.getTime() + 4 * 3600000).toISOString(),
      location: `${params.shipper.city} Hub, ${params.shipper.state}`,
      city: params.shipper.city,
      state: params.shipper.state,
      country: params.shipper.country,
      status: 'picked_up',
      description: 'Package picked up and scanned into regional transit center.',
      facilityName: `${params.shipper.city} Intermodal Terminal`,
      lat: originCoords.lat + 0.05,
      lng: originCoords.lng - 0.05,
    },
    {
      id: `cp-gen-3-${Date.now()}`,
      timestamp: new Date(now.getTime() + 18 * 3600000).toISOString(),
      location: `Central Waypoint Interchange`,
      city: 'Midpoint Transit',
      state: 'HUB',
      country: params.shipper.country,
      status: 'in_transit',
      description: `In transit via ${params.selectedRate.carrier.toUpperCase()} line-haul network. Telematics active.`,
      facilityName: 'Central Regional Sorting Hub',
      lat: midLat,
      lng: midLng,
    },
    {
      id: `cp-gen-4-${Date.now()}`,
      timestamp: new Date(now.getTime() + 32 * 3600000).toISOString(),
      location: `${params.recipient.city} Final-Mile Terminal, ${params.recipient.state}`,
      city: params.recipient.city,
      state: params.recipient.state,
      country: params.recipient.country,
      status: 'out_for_delivery',
      description: 'Package sorted to local courier delivery vehicle for scheduled arrival.',
      facilityName: `${params.recipient.city} Delivery Facility`,
      lat: destCoords.lat - 0.04,
      lng: destCoords.lng + 0.03,
    },
    {
      id: `cp-gen-5-${Date.now()}`,
      timestamp: new Date(now.getTime() + 38 * 3600000).toISOString(),
      location: `${params.recipient.city}, ${params.recipient.state}`,
      city: params.recipient.city,
      state: params.recipient.state,
      country: params.recipient.country,
      status: 'delivered',
      description: 'Scheduled final delivery to recipient destination address.',
      facilityName: 'Destination Premises',
      lat: destCoords.lat,
      lng: destCoords.lng,
    },
  ];

  const vehicleTelemetry: VehicleTelemetry = {
    vehicleId: `${params.selectedRate.carrier.toUpperCase()}-FLEET-${Math.floor(100 + Math.random() * 900)}`,
    vehicleType: params.selectedRate.serviceLevel.includes('AIR') ? 'cargo_aircraft' : 'electric_hauler',
    driverOrCaptain: 'Automated Carrier Dispatch / Telematics Gateway',
    speedKph: 0,
    heading: 'NE 45°',
    currentLat: originCoords.lat,
    currentLng: originCoords.lng,
    ambientTempC: params.packageDetails.isColdChain ? (params.packageDetails.targetTempC || -20) : 21.0,
    batteryOrFuelPct: 100,
    lastPingSecondsAgo: 0,
  };

  return {
    id: `shp-${Date.now()}`,
    trackingNumber,
    referenceNumber,
    carrier: params.selectedRate.carrier,
    serviceLevel: params.selectedRate.serviceLevel,
    status: 'label_created',
    createdAt: now.toISOString(),
    estimatedDelivery: new Date(now.getTime() + params.selectedRate.transitDays * 24 * 3600000).toISOString(),
    shipper: params.shipper,
    recipient: params.recipient,
    package: params.packageDetails,
    rates: params.selectedRate,
    checkpoints,
    currentCheckpointIndex: 0,
    telemetry: vehicleTelemetry,
    specialInstructions: params.specialInstructions,
  };
}
