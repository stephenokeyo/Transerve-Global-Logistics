export type Carrier = 'vanguard' | 'fedex' | 'dhl' | 'ups' | 'usps';

export type ServiceLevel = 
  | 'PRIORITY OVERNIGHT'
  | 'EXPEDITED AIR FREIGHT'
  | 'GROUND FREIGHT'
  | 'COLD CHAIN PHARMA'
  | 'FEDEX 2DAY'
  | 'DHL EXPRESS WORLDWIDE'
  | 'UPS NEXT DAY AIR'
  | 'UPS GROUND'
  | 'USPS PRIORITY MAIL';

export type ShipmentStatus = 
  | 'label_created'
  | 'picked_up'
  | 'in_transit'
  | 'customs_cleared'
  | 'out_for_delivery'
  | 'delivered'
  | 'exception';

export type PackageType = 'box' | 'envelope' | 'pallet' | 'crate' | 'cold_insulated';

export interface Address {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email: string;
}

export interface PackageDetails {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValueUsd: number;
  packageType: PackageType;
  contentsDescription: string;
  isFragile: boolean;
  isHazardous: boolean;
  requiresSignature: boolean;
  isColdChain: boolean;
  targetTempC?: number;
}

export interface VehicleTelemetry {
  vehicleId: string;
  vehicleType: 'electric_hauler' | 'cargo_aircraft' | 'delivery_van' | 'container_vessel';
  driverOrCaptain: string;
  speedKph: number;
  heading: string;
  currentLat: number;
  currentLng: number;
  altitudeMeters?: number;
  ambientTempC?: number;
  batteryOrFuelPct: number;
  lastPingSecondsAgo: number;
}

export interface Checkpoint {
  id: string;
  timestamp: string;
  location: string;
  city: string;
  state: string;
  country: string;
  status: ShipmentStatus;
  description: string;
  facilityName: string;
  lat: number;
  lng: number;
  telemetry?: Partial<VehicleTelemetry>;
}

export interface ProofOfDelivery {
  recipientName: string;
  deliveredAt: string;
  signatureSvg: string;
  photoUrl?: string;
  notes?: string;
}

export interface RateOption {
  carrier: Carrier;
  carrierName: string;
  serviceLevel: ServiceLevel;
  deliveryDate: string;
  deliveryTimeWindow: string;
  transitDays: number;
  baseCost: number;
  fuelSurcharge: number;
  insuranceCost: number;
  totalCost: number;
}

export type SlaStatus = 'on_schedule' | 'at_risk' | 'breached' | 'delivered_on_time';

export interface SlaInfo {
  status: SlaStatus;
  deadline: string;
  timeRemainingMinutes?: number;
  riskReason?: string;
  bufferHealthPct: number;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  referenceNumber: string;
  carrier: Carrier;
  serviceLevel: ServiceLevel;
  status: ShipmentStatus;
  createdAt: string;
  estimatedDelivery: string;
  shipper: Address;
  recipient: Address;
  package: PackageDetails;
  rates: RateOption;
  checkpoints: Checkpoint[];
  currentCheckpointIndex: number;
  telemetry?: VehicleTelemetry;
  proofOfDelivery?: ProofOfDelivery;
  specialInstructions?: string;
  sla?: SlaInfo;
}
