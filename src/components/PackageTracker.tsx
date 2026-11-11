import React, { useState, useMemo, useEffect } from 'react';
import { Shipment, Checkpoint, PackageDetails } from '../types/shipping';
import { TrackingMap, getHubClassification } from './TrackingMap';
import { ShippingLabel } from './ShippingLabel';
import { ShipmentPrintSummary } from './ShipmentPrintSummary';
import { RiskAssessment } from './RiskAssessment';
import { updateShipmentCheckpoint } from '../data/mockShipments';
import { createWorldwideShipment } from '../services/globalTrackingService';
import { useI18n } from '../i18n/I18nContext';
import { 
  Search, CheckCircle2, Clock, AlertCircle, FileText, ArrowRight,
  Shield, MapPin, Printer, RefreshCw, PenTool, ExternalLink, ChevronDown, ChevronUp,
  Timer, Truck, Calendar, Scale, Ruler, Leaf, Sparkles, Plane, Zap, Trees, ShieldCheck, Car,
  Cloud, CloudRain, CloudSun, CloudSnow, CloudLightning, Sun, Droplets, Eye, Gauge, Compass, Wind,
  Package, Check, Activity, Warehouse, Building2, Layers,
  Copy, Filter, ArrowUpDown, Navigation, Tag, Radio, Receipt
} from 'lucide-react';
import { PrintableReceiptModal } from './PrintableReceiptModal';
import { 
  fetchSimulatedWeather, 
  generateSimulatedWeather, 
  WeatherData, 
  WeatherConditionKey 
} from '../services/weatherService';

export type UnitSystem = 'metric' | 'imperial';

export interface FormattedPackageSpecs {
  weightStr: string;
  weightAltStr: string;
  dimensionsStr: string;
  dimensionsDetailedStr: string;
  dimensionsAltStr: string;
  volumetricWeightStr: string;
}

export function getFormattedPackageSpecs(pkg: PackageDetails, unitSystem: UnitSystem): FormattedPackageSpecs {
  const isMetric = unitSystem === 'metric';

  const weightKg = pkg.weightKg;
  const weightLbs = weightKg * 2.20462;

  const lCm = pkg.lengthCm;
  const wCm = pkg.widthCm;
  const hCm = pkg.heightCm;

  const lIn = lCm * 0.393701;
  const wIn = wCm * 0.393701;
  const hIn = hCm * 0.393701;

  const volWeightKg = (lCm * wCm * hCm) / 5000;
  const volWeightLbs = (lIn * wIn * hIn) / 139;

  if (isMetric) {
    return {
      weightStr: `${weightKg.toFixed(1)} kg`,
      weightAltStr: `${weightLbs.toFixed(1)} lbs`,
      dimensionsStr: `${lCm} × ${wCm} × ${hCm} cm`,
      dimensionsDetailedStr: `${lCm}L × ${wCm}W × ${hCm}H cm`,
      dimensionsAltStr: `${lIn.toFixed(1)} × ${wIn.toFixed(1)} × ${hIn.toFixed(1)} in`,
      volumetricWeightStr: `${volWeightKg.toFixed(1)} kg`,
    };
  } else {
    return {
      weightStr: `${weightLbs.toFixed(1)} lbs`,
      weightAltStr: `${weightKg.toFixed(1)} kg`,
      dimensionsStr: `${lIn.toFixed(1)} × ${wIn.toFixed(1)} × ${hIn.toFixed(1)} in`,
      dimensionsDetailedStr: `${lIn.toFixed(1)}L × ${wIn.toFixed(1)}W × ${hIn.toFixed(1)}H in`,
      dimensionsAltStr: `${lCm} × ${wCm} × ${hCm} cm`,
      volumetricWeightStr: `${volWeightLbs.toFixed(1)} lbs`,
    };
  }
}

function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface CarbonImpactData {
  distanceKm: number;
  distanceFormatted: string;
  distanceAltFormatted: string;
  co2eKg: number;
  co2eFormatted: string;
  co2eAltFormatted: string;
  modeLabel: string;
  fleetRating: string;
  modeType: 'electric' | 'air' | 'van' | 'truck';
  carEquivFormatted: string;
  treesAbsorbed: number;
  isColdChainPenalty: boolean;
  savingsPct?: number;
}

export function calculateCarbonImpact(shipment: Shipment, unitSystem: UnitSystem): CarbonImpactData {
  // 1. Calculate cumulative route distance across all checkpoints
  let rawDistanceKm = 0;
  const cps = shipment.checkpoints;
  if (cps && cps.length > 1) {
    for (let i = 0; i < cps.length - 1; i++) {
      const c1 = cps[i];
      const c2 = cps[i + 1];
      if (
        typeof c1.lat === 'number' && typeof c1.lng === 'number' &&
        typeof c2.lat === 'number' && typeof c2.lng === 'number'
      ) {
        rawDistanceKm += calculateHaversineDistanceKm(c1.lat, c1.lng, c2.lat, c2.lng);
      }
    }
  }

  // 15% freight routing circuity factor (routes are not straight point-to-point lines)
  const distanceKm = rawDistanceKm > 20 ? rawDistanceKm * 1.15 : 720;
  const distanceMiles = distanceKm * 0.621371;

  // 2. Identify transit mode and standard GLEC / ISO 14083 freight emission factor (kg CO2e / tonne-km)
  const vehicleType = shipment.telemetry?.vehicleType;
  const serviceLevel = (shipment.serviceLevel || '').toUpperCase();

  let emissionFactor = 0.078; // Heavy intermodal diesel hauler
  let modeLabel = 'Intermodal Clean Diesel Hauler';
  let fleetRating = 'EPA SmartWay Certified';
  let modeType: 'electric' | 'air' | 'van' | 'truck' = 'truck';
  let savingsPct: number | undefined = undefined;

  if (vehicleType === 'electric_hauler' || serviceLevel.includes('ELECTRIC')) {
    emissionFactor = 0.022; // -72% emissions vs diesel baseline
    modeLabel = 'Electric Class 8 Heavy Hauler';
    fleetRating = 'Tier 1 Zero-Direct-Emission';
    modeType = 'electric';
    savingsPct = 72;
  } else if (
    vehicleType === 'cargo_aircraft' ||
    serviceLevel.includes('AIR') ||
    serviceLevel.includes('OVERNIGHT') ||
    serviceLevel.includes('EXPRESS')
  ) {
    emissionFactor = 0.580; // Dedicated air freighter
    modeLabel = 'Dedicated Air Freighter';
    fleetRating = 'ICAO CORSIA Compliant';
    modeType = 'air';
  } else if (
    vehicleType === 'delivery_van' ||
    serviceLevel.includes('USPS') ||
    shipment.status === 'out_for_delivery'
  ) {
    emissionFactor = 0.140; // Final-mile urban parcel delivery van
    modeLabel = 'Urban Final-Mile Delivery Fleet';
    fleetRating = 'Euro 6 Low-Emission';
    modeType = 'van';
  }

  // 3. Cold chain refrigeration unit energy penalty (+18% power draw)
  const isColdChainPenalty = !!shipment.package?.isColdChain;
  const refrigerationMultiplier = isColdChainPenalty ? 1.18 : 1.0;

  // 4. Weight in metric tonnes (1 tonne = 1000 kg)
  const weightKg = Math.max(0.5, shipment.package?.weightKg || 1);
  const weightTonnes = weightKg / 1000;

  // Total CO2e in kg
  let co2eKg = distanceKm * weightTonnes * emissionFactor * refrigerationMultiplier;
  if (co2eKg < 0.08) co2eKg = 0.08;
  const co2eLbs = co2eKg * 2.20462;

  // 5. Environmental Equivalents:
  // Avg gasoline passenger car emits ~0.192 kg CO2 per km (~0.309 kg / mile)
  const carKm = co2eKg / 0.192;
  const carMiles = carKm * 0.621371;

  // 1 urban tree absorbs ~1.8 kg CO2 per month
  const treesAbsorbed = Math.max(1, Math.round((co2eKg / 1.8) * 10) / 10);

  const isMetric = unitSystem === 'metric';

  return {
    distanceKm,
    distanceFormatted: isMetric
      ? `${Math.round(distanceKm).toLocaleString()} km`
      : `${Math.round(distanceMiles).toLocaleString()} mi`,
    distanceAltFormatted: isMetric
      ? `${Math.round(distanceMiles).toLocaleString()} mi`
      : `${Math.round(distanceKm).toLocaleString()} km`,
    co2eKg,
    co2eFormatted: isMetric
      ? `${co2eKg < 1 ? co2eKg.toFixed(2) : co2eKg.toFixed(1)} kg CO₂e`
      : `${co2eLbs < 1 ? co2eLbs.toFixed(2) : co2eLbs.toFixed(1)} lbs CO₂e`,
    co2eAltFormatted: isMetric
      ? `${co2eLbs < 1 ? co2eLbs.toFixed(2) : co2eLbs.toFixed(1)} lbs CO₂e`
      : `${co2eKg < 1 ? co2eKg.toFixed(2) : co2eKg.toFixed(1)} kg CO₂e`,
    modeLabel,
    fleetRating,
    modeType,
    carEquivFormatted: isMetric ? `${Math.round(carKm)} km` : `${Math.round(carMiles)} mi`,
    treesAbsorbed,
    isColdChainPenalty,
    savingsPct,
  };
}

interface DeliveryProgress {
  percentElapsed: number;
  percentRemaining: number;
  timeRemainingFormatted: string;
  timeElapsedFormatted: string;
  totalDurationFormatted: string;
  isDelivered: boolean;
  isOverdue: boolean;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function calculateDeliveryProgress(shipment: Shipment): DeliveryProgress {
  const isDelivered = shipment.status === 'delivered';
  const startMs = new Date(shipment.createdAt).getTime();
  const endMs = new Date(shipment.estimatedDelivery).getTime();
  const totalDurationMs = Math.max(1000 * 60 * 30, endMs - startMs);

  if (isDelivered) {
    return {
      percentElapsed: 100,
      percentRemaining: 0,
      timeRemainingFormatted: '0m',
      timeElapsedFormatted: formatDuration(totalDurationMs),
      totalDurationFormatted: formatDuration(totalDurationMs),
      isDelivered: true,
      isOverdue: false,
    };
  }

  // Base progress calculation combining checkpoint progression and timestamps
  const totalCps = Math.max(1, shipment.checkpoints.length);
  const currentCpIdx = shipment.currentCheckpointIndex;
  const cpProgressRatio = Math.min(0.95, (currentCpIdx + 0.65) / totalCps);

  const currentCp = shipment.checkpoints[currentCpIdx];
  const cpTimeMs = currentCp ? new Date(currentCp.timestamp).getTime() : startMs;
  const rawTimeElapsed = Math.max(0, cpTimeMs - startMs);
  const timeProgressRatio = Math.max(0.05, Math.min(0.95, rawTimeElapsed / totalDurationMs));

  // Blended progression ratio
  let blendedPct = Math.round(((cpProgressRatio * 0.6) + (timeProgressRatio * 0.4)) * 100);

  if (shipment.status === 'label_created') {
    blendedPct = 5;
  } else if (shipment.status === 'out_for_delivery') {
    blendedPct = Math.max(86, blendedPct);
  }

  blendedPct = Math.min(95, Math.max(5, blendedPct));

  const elapsedMs = Math.round(totalDurationMs * (blendedPct / 100));
  const remainingMs = Math.max(0, totalDurationMs - elapsedMs);

  return {
    percentElapsed: blendedPct,
    percentRemaining: 100 - blendedPct,
    timeRemainingFormatted: formatDuration(remainingMs),
    timeElapsedFormatted: formatDuration(elapsedMs),
    totalDurationFormatted: formatDuration(totalDurationMs),
    isDelivered: false,
    isOverdue: false,
  };
}

function renderWeatherIcon(conditionKey: WeatherConditionKey, className = "w-5 h-5") {
  switch (conditionKey) {
    case 'clear_day':
      return <Sun className={`${className} text-amber-500`} />;
    case 'partly_cloudy':
      return <CloudSun className={`${className} text-amber-500`} />;
    case 'overcast':
      return <Cloud className={`${className} text-slate-400`} />;
    case 'light_rain':
      return <CloudRain className={`${className} text-blue-500`} />;
    case 'heavy_rain':
      return <CloudRain className={`${className} text-blue-600`} />;
    case 'thunderstorm':
      return <CloudLightning className={`${className} text-indigo-500`} />;
    case 'snow':
      return <CloudSnow className={`${className} text-sky-400`} />;
    case 'fog':
      return <Wind className={`${className} text-slate-400`} />;
    case 'windy':
      return <Wind className={`${className} text-teal-500`} />;
    default:
      return <CloudSun className={`${className} text-amber-500`} />;
  }
}

interface PackageTrackerProps {
  currentShipment: Shipment;
  onSelectShipment: (shipment: Shipment) => void;
  allShipments: Shipment[];
}

export const PackageTracker: React.FC<PackageTrackerProps> = ({
  currentShipment,
  onSelectShipment,
  allShipments,
}) => {
  const { t, tStatus, formatDate, formatTime, formatDateTime, formatWeight } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showPrintSummaryModal, setShowPrintSummaryModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [instructions, setInstructions] = useState(currentShipment.specialInstructions || '');
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [timelineSortOrder, setTimelineSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'completed' | 'active'>('all');
  const [copiedCoordId, setCopiedCoordId] = useState<string | null>(null);

  const handleCopyCoordinates = (id: string, lat: number, lng: number) => {
    const text = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    navigator.clipboard?.writeText(text);
    setCopiedCoordId(id);
    setTimeout(() => setCopiedCoordId(null), 2000);
  };

  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => {
    try {
      const saved = localStorage.getItem('vanguard_unit_system') as UnitSystem | null;
      if (saved === 'metric' || saved === 'imperial') return saved;
    } catch {}
    return 'metric';
  });

  const handleToggleUnitSystem = (newSystem: UnitSystem) => {
    setUnitSystem(newSystem);
    try {
      localStorage.setItem('vanguard_unit_system', newSystem);
    } catch {}
  };

  const formattedSpecs = useMemo(
    () => getFormattedPackageSpecs(currentShipment.package, unitSystem),
    [currentShipment.package, unitSystem]
  );

  const progress = useMemo(() => calculateDeliveryProgress(currentShipment), [currentShipment]);

  const carbonImpact = useMemo(
    () => calculateCarbonImpact(currentShipment, unitSystem),
    [currentShipment, unitSystem]
  );

  // Weather Telematics: Current Coordinates & Active Checkpoint Location
  const currentCheckpoint = currentShipment.checkpoints[currentShipment.currentCheckpointIndex] || currentShipment.checkpoints[0];
  const currentLat = currentShipment.telemetry?.currentLat ?? currentCheckpoint?.lat ?? 35.04;
  const currentLng = currentShipment.telemetry?.currentLng ?? currentCheckpoint?.lng ?? -89.98;
  const currentLocationName = currentCheckpoint
    ? `${currentCheckpoint.facilityName || currentCheckpoint.location} (${currentCheckpoint.city}, ${currentCheckpoint.state})`
    : `${currentShipment.recipient.city}, ${currentShipment.recipient.state}`;

  // Shipping Lifecycle & Progress Stages (Processing -> In Transit -> Out for Delivery -> Delivered)
  const shippingStages = useMemo(() => {
    const status = currentShipment.status;
    let activeIndex = 1;
    const isException = status === 'exception';

    if (status === 'label_created' || status === 'picked_up') {
      activeIndex = 0;
    } else if (status === 'in_transit' || status === 'customs_cleared') {
      activeIndex = 1;
    } else if (status === 'out_for_delivery') {
      activeIndex = 2;
    } else if (status === 'delivered') {
      activeIndex = 3;
    } else if (isException) {
      activeIndex = 1;
    }

    const stages = [
      {
        id: 'warehouse',
        key: 'warehouse',
        title: t('tracker.stageWarehouse') || 'Warehouse',
        subtitle: t('tracker.stageWarehouseDesc') || 'Origin fulfillment & processing facility',
        icon: Warehouse,
        stepNumber: 1,
        shortCode: 'WH',
        location: `${currentShipment.shipper.city}, ${currentShipment.shipper.state}`,
        facility: currentShipment.shipper.name,
        dateStr: formatDate(currentShipment.createdAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      },
      {
        id: 'in_transit',
        key: 'in_transit',
        title: t('tracker.stageInTransit'),
        subtitle: t('tracker.stageInTransitDesc'),
        icon: Truck,
        stepNumber: 2,
        shortCode: 'TR',
        location: currentCheckpoint ? `${currentCheckpoint.city}, ${currentCheckpoint.state}` : 'Logistics Hub',
        facility: currentCheckpoint?.facilityName || 'Intermodal Freight Network',
        dateStr: currentCheckpoint ? formatDate(currentCheckpoint.timestamp, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined,
      },
      {
        id: 'out_for_delivery',
        key: 'out_for_delivery',
        title: t('tracker.stageOutForDelivery'),
        subtitle: t('tracker.stageOutForDeliveryDesc'),
        icon: Compass,
        stepNumber: 3,
        shortCode: 'OD',
        location: `${currentShipment.recipient.city} Distribution Center`,
        facility: `${currentShipment.carrier.toUpperCase()} Courier Unit`,
        dateStr: currentShipment.rates.deliveryTimeWindow,
      },
      {
        id: 'delivered',
        key: 'delivered',
        title: t('tracker.stageDelivered'),
        subtitle: t('tracker.stageDeliveredDesc'),
        icon: CheckCircle2,
        stepNumber: 4,
        shortCode: 'DL',
        location: `${currentShipment.recipient.city}, ${currentShipment.recipient.state}`,
        facility: currentShipment.recipient.name,
        dateStr: status === 'delivered'
          ? formatDate(currentShipment.estimatedDelivery, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : `Target: ${formatDate(currentShipment.estimatedDelivery, { month: 'short', day: 'numeric' })}`,
      },
    ];

    let progressPercent = 0;
    if (status === 'delivered') {
      progressPercent = 100;
    } else if (status === 'out_for_delivery') {
      progressPercent = 82;
    } else if (status === 'in_transit' || status === 'customs_cleared' || isException) {
      const cpRatio = currentShipment.checkpoints.length > 1
        ? (currentShipment.currentCheckpointIndex + 1) / currentShipment.checkpoints.length
        : 0.5;
      progressPercent = Math.round(30 + cpRatio * 42); // 35% to 72%
    } else if (status === 'picked_up') {
      progressPercent = 25;
    } else if (status === 'label_created') {
      progressPercent = 14;
    }

    return {
      stages,
      activeIndex,
      isDelivered: status === 'delivered',
      isException,
      progressPercent,
    };
  }, [currentShipment, currentCheckpoint, t, formatDate]);

  // Historical status updates enriched with location metadata, durations, and facility classifications
  const enrichedCheckpoints = useMemo(() => {
    const cps = currentShipment.checkpoints;
    const total = cps.length;

    return cps.map((cp, idx) => {
      const isPast = idx <= currentShipment.currentCheckpointIndex;
      const isCurrent = idx === currentShipment.currentCheckpointIndex;
      const isUpcoming = idx > currentShipment.currentCheckpointIndex;
      const hubMeta = getHubClassification(cp, idx, total);

      // Duration from previous stop
      let durationFromPrev = '';
      if (idx > 0) {
        const prevTime = new Date(cps[idx - 1].timestamp).getTime();
        const thisTime = new Date(cp.timestamp).getTime();
        const diffMs = Math.max(0, thisTime - prevTime);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        durationFromPrev = hours > 0 ? `+${hours}h ${mins}m` : `+${mins}m`;
      }

      // Elapsed time from origin
      const originTime = new Date(cps[0].timestamp).getTime();
      const thisTime = new Date(cp.timestamp).getTime();
      const elapsedTotalMs = Math.max(0, thisTime - originTime);
      const elapsedHours = Math.floor(elapsedTotalMs / (1000 * 60 * 60));
      const elapsedMins = Math.floor((elapsedTotalMs % (1000 * 60 * 60)) / (1000 * 60));
      const totalElapsedStr = `${elapsedHours}h ${elapsedMins}m from origin`;

      // Event Classification and Scan Code
      let eventCode = 'TRANSIT_SORT_SCAN';
      let eventLabel = 'Logistics Hub Scan';
      if (idx === 0) {
        eventCode = 'ORIGIN_DISPATCH_SCAN';
        eventLabel = 'Origin Manifest & Pickup';
      } else if (idx === total - 1) {
        eventCode = 'CONSIGNEE_DELIVERY_POD';
        eventLabel = 'Consignee Handover & POD';
      } else if (cp.status === 'out_for_delivery') {
        eventCode = 'OUT_FOR_DELIVERY_DISPATCH';
        eventLabel = 'Final-Mile Courier Dispatch';
      } else if (hubMeta.category === 'air_cargo') {
        eventCode = 'AIR_CARGO_SORT_SCAN';
        eventLabel = 'Air Freight Transfer';
      } else if (hubMeta.category === 'customs') {
        eventCode = 'CUSTOMS_CLEARANCE_RELEASE';
        eventLabel = 'Customs Inspection Release';
      } else if (hubMeta.category === 'intermodal_rail') {
        eventCode = 'INTERMODAL_RAIL_EXCHANGE';
        eventLabel = 'Rail Intermodal Exchange';
      } else if (hubMeta.category === 'final_depot') {
        eventCode = 'LOCAL_DEPOT_INBOUND';
        eventLabel = 'Local Station Inbound Scan';
      }

      return {
        ...cp,
        originalIndex: idx,
        isPast,
        isCurrent,
        isUpcoming,
        hubMeta,
        durationFromPrev,
        totalElapsedStr,
        eventCode,
        eventLabel,
      };
    });
  }, [currentShipment.checkpoints, currentShipment.currentCheckpointIndex]);

  // Filtered and sorted checkpoints according to user controls
  const displayedCheckpoints = useMemo(() => {
    let list = [...enrichedCheckpoints];

    if (timelineFilter === 'completed') {
      list = list.filter(cp => cp.isPast);
    } else if (timelineFilter === 'active') {
      list = list.filter(cp => cp.isCurrent);
    }

    if (timelineSortOrder === 'newest') {
      list.reverse();
    }

    return list;
  }, [enrichedCheckpoints, timelineFilter, timelineSortOrder]);

  const [weather, setWeather] = useState<WeatherData | null>(() => 
    generateSimulatedWeather(currentLat, currentLng, currentLocationName)
  );
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherRefreshCount, setWeatherRefreshCount] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    setIsLoadingWeather(true);
    fetchSimulatedWeather(currentLat, currentLng, currentLocationName, weatherRefreshCount)
      .then((data) => {
        if (!isCancelled) {
          setWeather(data);
          setIsLoadingWeather(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setWeather(generateSimulatedWeather(currentLat, currentLng, currentLocationName, weatherRefreshCount));
          setIsLoadingWeather(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentShipment.id, currentShipment.currentCheckpointIndex, currentLat, currentLng, currentLocationName, weatherRefreshCount]);

  const handleRefreshWeather = () => {
    setWeatherRefreshCount(prev => prev + 1);
  };


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    const raw = searchQuery.trim();
    const clean = raw.toUpperCase();
    if (!clean) return;

    // 1. Check existing shipments in registry
    const found = allShipments.find(s => 
      s.trackingNumber.toUpperCase() === clean ||
      s.referenceNumber.toUpperCase() === clean ||
      (s.telemetry?.vehicleId && s.telemetry.vehicleId.toUpperCase() === clean) ||
      (s.telemetry?.vehicleId && s.telemetry.vehicleId.toUpperCase().includes(clean)) ||
      (clean.includes('774') || clean.includes('AERO') || clean.includes('938102941') ? s.id === 'shp-002' : false) ||
      (clean.includes('884') || clean.includes('TRUCK') ? s.id === 'shp-001' : false) ||
      s.trackingNumber.replace(/[^A-Z0-9]/g, '').includes(clean.replace(/[^A-Z0-9]/g, '')) ||
      s.shipper.city.toUpperCase().includes(clean) ||
      s.recipient.city.toUpperCase().includes(clean)
    );

    if (found) {
      onSelectShipment(found);
      return;
    }

    // 2. Check if user typed a worldwide route like "Nairobi to London" or "Tokyo -> Frankfurt"
    const routeSplit = raw.split(/\s+(?:to|->|—|-)\s+/i);
    if (routeSplit.length >= 2 && routeSplit[0].trim() && routeSplit[1].trim()) {
      const origin = routeSplit[0].trim();
      const dest = routeSplit[1].trim();
      const newShipment = createWorldwideShipment({
        originQuery: origin,
        destQuery: dest,
      });
      onSelectShipment(newShipment);
      return;
    }

    // 3. Check if user typed an international location name
    if (raw.length >= 3) {
      const newShipment = createWorldwideShipment({
        originQuery: raw,
        destQuery: 'London, United Kingdom',
      });
      onSelectShipment(newShipment);
      return;
    }

    setSearchError(t('tracker.notFound', { query: searchQuery }));
  };

  const handleCheckpointAdvance = (nextIdx: number) => {
    const updated = updateShipmentCheckpoint(currentShipment.trackingNumber, nextIdx);
    if (updated) {
      onSelectShipment(updated);
    }
  };

  const handleSaveInstructions = () => {
    currentShipment.specialInstructions = instructions;
    setIsEditingInstructions(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Search Bar & Quick Suggestion Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter Tracking #, Vehicle/Plane Reg #, or Global Route (e.g. 'Nairobi to London', 'AERO-CARGO-774', 'VG-901482093-GL')..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
          >
            {t('tracker.searchTitle')}
          </button>
        </form>

        {searchError && (
          <p className="mt-2 text-xs text-rose-600 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{searchError}</span>
          </p>
        )}

        {/* Quick test pills */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Quick Select Unit:</span>
          {allShipments.slice(0, 4).map((s) => {
            const isAircraft = s.telemetry?.vehicleType === 'cargo_aircraft';
            const vLabel = s.telemetry?.vehicleId || (isAircraft ? 'AERO-CARGO-774' : 'VG-TRUCK-884');
            return (
              <button
                key={s.id}
                onClick={() => onSelectShipment(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors border flex items-center gap-1.5 cursor-pointer ${
                  currentShipment.trackingNumber === s.trackingNumber
                    ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isAircraft ? <Plane className="w-3 h-3 text-cyan-600" /> : <Truck className="w-3 h-3 text-blue-600" />}
                <span>{vLabel} · {s.trackingNumber}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tracking Overview Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header Summary */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span className="font-semibold uppercase tracking-wider text-slate-700">
                  {currentShipment.rates.carrierName}
                </span>
                <span aria-hidden="true">·</span>
                <span>{t('tracker.reference')}: {currentShipment.referenceNumber}</span>
                <span aria-hidden="true">·</span>
                <span>{t('tracker.createdOn')} {formatDate(currentShipment.createdAt)}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {currentShipment.trackingNumber}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span>{currentShipment.shipper.city}, {currentShipment.shipper.state}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-900">{currentShipment.recipient.city}, {currentShipment.recipient.state}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{t('tracker.weight')}: <strong className="text-slate-900">{formattedSpecs.weightStr}</strong></span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{t('tracker.dimensions')}: <strong className="text-slate-900">{formattedSpecs.dimensionsStr}</strong></span>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <div className="flex items-center gap-2">
                {/* Unit Switcher Button in Header */}
                <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg text-[11px] font-mono border border-slate-300">
                  <button
                    type="button"
                    onClick={() => handleToggleUnitSystem('metric')}
                    className={`px-2 py-0.5 rounded transition-all font-semibold ${
                      unitSystem === 'metric'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Switch to metric units (kg, cm)"
                  >
                    kg / cm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleUnitSystem('imperial')}
                    className={`px-2 py-0.5 rounded transition-all font-semibold ${
                      unitSystem === 'imperial'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Switch to imperial units (lbs, in)"
                  >
                    lbs / in
                  </button>
                </div>

                {/* Print Summary Button */}
                <button
                  type="button"
                  onClick={() => setShowPrintSummaryModal(true)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={t('tracker.printSummaryDesc')}
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">{t('tracker.printSummary')}</span>
                </button>

                {/* Print Receipt Button */}
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-300 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print Shipping Receipt & Tax Invoice"
                >
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Receipt</span>
                </button>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider">
                  <span className={`w-2 h-2 rounded-full ${currentShipment.status === 'delivered' ? 'bg-emerald-500' : 'bg-blue-600 animate-pulse'}`} />
                  <span>{tStatus(currentShipment.status)}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block uppercase font-medium">{t('tracker.estimatedDelivery')}</span>
                <span className="text-sm font-bold text-slate-900">
                  {formatDate(currentShipment.estimatedDelivery, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                  {' '}· {currentShipment.rates.deliveryTimeWindow}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Linear Progress Bar: Shipment Status Stages */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 via-white to-white">
          {/* Header Row: Title, Stage Badge, and Live Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 shadow-2xs">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    {t('tracker.linearProgressBarTitle') || 'Shipment Stage Linear Progress'}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    shippingStages.isDelivered
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : shippingStages.isException
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {t('tracker.currentStageBadge', { 
                      current: shippingStages.activeIndex + 1, 
                      total: 4 
                    })} · {shippingStages.stages[shippingStages.activeIndex].title}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {shippingStages.isDelivered
                    ? t('tracker.deliveredCompleted')
                    : shippingStages.isException
                    ? t('tracker.stageException')
                    : `${shippingStages.stages[shippingStages.activeIndex].title}: ${shippingStages.stages[shippingStages.activeIndex].subtitle}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                  STAGE COMPLETION
                </span>
                <span className="text-base font-extrabold font-mono text-blue-600">
                  {shippingStages.progressPercent}%
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-2xs ${
                shippingStages.isDelivered
                  ? 'bg-emerald-600 text-white'
                  : shippingStages.isException
                  ? 'bg-rose-600 text-white'
                  : 'bg-blue-600 text-white'
              }`}>
                {shippingStages.isDelivered ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
                <span>
                  {shippingStages.isDelivered 
                    ? t('tracker.stageCompleted') 
                    : t('tracker.stageActive')}
                </span>
              </span>
            </div>
          </div>

          {/* DEDICATED VISUAL LINEAR PROGRESS BAR CONTAINER */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs">
            {/* 4 Linear Stage Header Segment Labels */}
            <div className="grid grid-cols-4 gap-1 sm:gap-2 mb-2 text-center">
              {shippingStages.stages.map((stage, idx) => {
                const isCompleted = idx < shippingStages.activeIndex || shippingStages.isDelivered;
                const isActive = idx === shippingStages.activeIndex && !shippingStages.isDelivered;
                return (
                  <div key={stage.id} className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isActive
                          ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isCompleted ? '✓' : idx + 1}
                      </span>
                      <span className={`truncate text-xs ${
                        isActive
                          ? 'text-blue-900 font-extrabold'
                          : isCompleted
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}>
                        {stage.title}
                      </span>
                    </div>
                    <span className="text-[10px] hidden md:inline font-mono text-slate-500 mt-0.5">
                      {idx === 0 ? '0-25%' : idx === 1 ? '25-50%' : idx === 2 ? '50-75%' : '75-100%'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Continuous Linear Bar Track with Segment Divider Ticks & Pinpoint Vehicle Thumb */}
            <div className="relative py-3">
              {/* Outer Track with 4 Segments */}
              <div className="h-4 sm:h-5 w-full bg-slate-200/80 rounded-full overflow-hidden border border-slate-300/80 relative shadow-inner">
                {/* Visual Tick Mark Dividers at 25%, 50%, 75% */}
                <div className="absolute top-0 bottom-0 left-1/4 w-0.5 bg-white/70 z-10" />
                <div className="absolute top-0 bottom-0 left-2/4 w-0.5 bg-white/70 z-10" />
                <div className="absolute top-0 bottom-0 left-3/4 w-0.5 bg-white/70 z-10" />

                {/* Animated Linear Gradient Fill */}
                <div
                  className={`h-full transition-all duration-700 ease-out rounded-full relative ${
                    shippingStages.isDelivered
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600'
                      : shippingStages.isException
                      ? 'bg-gradient-to-r from-blue-600 via-amber-500 to-rose-500'
                      : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500'
                  }`}
                  style={{ width: `${shippingStages.progressPercent}%` }}
                >
                  {/* Subtle Shimmer Overlay */}
                  <div className="absolute inset-0 bg-white/20 opacity-40 animate-pulse" />
                </div>
              </div>

              {/* Moving Linear Stage Indicator Thumb with Vehicle Radar Pulse */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -ml-4 sm:-ml-5 transition-all duration-700 z-20 pointer-events-none"
                style={{ left: `${Math.min(97, Math.max(3, shippingStages.progressPercent))}%` }}
              >
                {/* Floating percentage tooltip badge */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-slate-900 text-cyan-300 font-mono text-[9px] font-black rounded-sm shadow-xs border border-cyan-500/50 whitespace-nowrap flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>{shippingStages.progressPercent}%</span>
                </div>

                {/* Circular Thumb with Radar Wave */}
                <div className="relative">
                  {!shippingStages.isDelivered && (
                    <div className="absolute -inset-1.5 rounded-full bg-blue-500/30 animate-ping" />
                  )}
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white shadow-md border-2 border-blue-600 flex items-center justify-center text-blue-600">
                    {shippingStages.isDelivered ? (
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                    ) : (
                      <Truck className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Linear Stage Milestone Ticks */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1 pt-0.5">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>Warehouse Origin</span>
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>Linehaul Transit</span>
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>Out for Delivery</span>
              </span>
              <span className="flex items-center gap-1 text-right">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>Consignee Delivered</span>
              </span>
            </div>
          </div>

          {/* 4 STAGE MILESTONE DETAIL CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {shippingStages.stages.map((stage, idx) => {
              const isCompleted = idx < shippingStages.activeIndex || shippingStages.isDelivered;
              const isActive = idx === shippingStages.activeIndex && !shippingStages.isDelivered;
              const StageIcon = stage.icon;

              return (
                <div
                  key={stage.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-slate-50/60 border-slate-200 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-400'
                      }`}>
                        {isCompleted ? (
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <StageIcon className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold font-mono uppercase text-slate-400 block">
                          STAGE 0{idx + 1}
                        </span>
                        <h4 className={`text-xs font-bold leading-tight ${
                          isActive ? 'text-blue-900 font-extrabold' : isCompleted ? 'text-slate-900' : 'text-slate-600'
                        }`}>
                          {stage.title}
                        </h4>
                      </div>
                    </div>

                    {isCompleted ? (
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-200">
                        COMPLETED
                      </span>
                    ) : isActive ? (
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold font-mono bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono text-slate-400 bg-white border border-slate-200">
                        UPCOMING
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-1 mb-2">
                    {stage.subtitle}
                  </p>

                  <div className="text-[10.5px] font-mono bg-white/80 p-2 rounded-lg border border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-slate-400">Location:</span>
                      <strong className="truncate max-w-[120px]">{stage.location}</strong>
                    </div>
                    {stage.dateStr && (
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-400">Time/Target:</span>
                        <span className="font-semibold text-slate-800">{stage.dateStr}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual Progress Bar: Estimated Time Until Delivery */}
        <div className="p-6 border-b border-slate-100 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                <Timer className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    {t('tracker.deliveryProgress')}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    progress.isDelivered
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {progress.isDelivered ? 'Complete' : `${progress.percentRemaining}% Until Delivery`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {progress.isDelivered
                    ? t('tracker.deliveredCompleted')
                    : `${progress.percentRemaining}% estimated time remaining (${progress.timeRemainingFormatted} left)`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                  {t('tracker.timeRemaining')}
                </span>
                <span className="text-base font-extrabold font-mono text-slate-900">
                  {progress.timeRemainingFormatted}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />
              <div className="text-right hidden sm:block">
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                  PROGRESS
                </span>
                <span className="text-base font-extrabold font-mono text-blue-600">
                  {progress.percentElapsed}%
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className="relative py-2">
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative">
              <div
                className={`h-full transition-all duration-700 ease-out rounded-full ${
                  progress.isDelivered
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600'
                    : currentShipment.status === 'out_for_delivery'
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                }`}
                style={{ width: `${progress.percentElapsed}%` }}
              />
            </div>

            {/* Moving Indicator along progress track */}
            {!progress.isDelivered && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -ml-3 transition-all duration-700 pointer-events-none"
                style={{ left: `${Math.min(96, Math.max(4, progress.percentElapsed))}%` }}
              >
                <div className="w-6 h-6 rounded-full bg-white shadow-md border-2 border-blue-600 flex items-center justify-center">
                  <Truck className="w-3 h-3 text-blue-600" />
                </div>
              </div>
            )}
          </div>

          {/* Timeline Labels */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-mono">
            <div>
              <span className="block font-semibold text-slate-700">{t('tracker.dispatchPoint')}</span>
              <span>{formatDate(currentShipment.createdAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <div className="text-center hidden sm:block">
              <span className="font-semibold text-slate-800">
                {progress.percentElapsed}% Journey Completed · {progress.percentRemaining}% Remaining
              </span>
              <span className="block text-[10px] text-slate-400">
                {progress.timeElapsedFormatted} elapsed of {progress.totalDurationFormatted} window
              </span>
            </div>

            <div className="text-right">
              <span className="block font-semibold text-slate-700">{t('tracker.destinationTarget')}</span>
              <span>{formatDate(currentShipment.estimatedDelivery, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Micro KPI Stat Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                  {t('tracker.timeRemaining')}
                </span>
                <Clock className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-lg font-black font-mono text-slate-900">
                {progress.timeRemainingFormatted}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {progress.isDelivered ? 'Delivered to recipient' : `${progress.percentRemaining}% of scheduled window`}
              </span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                  {t('tracker.timeElapsed')}
                </span>
                <Truck className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="text-lg font-black font-mono text-slate-900">
                {progress.timeElapsedFormatted}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {progress.percentElapsed}% of transit completed
              </span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                  {t('tracker.totalWindow')}
                </span>
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-lg font-black font-mono text-slate-900">
                {progress.totalDurationFormatted}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
                Target: {currentShipment.rates.deliveryTimeWindow}
              </span>
            </div>
          </div>
        </div>

        {/* Live Vector Telematics Leaflet Map (Hero Component) */}
        <div className="p-6 border-b border-slate-100 bg-white">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>{t('tracker.mapTitle')}</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrintSummaryModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title={t('tracker.printSummaryDesc')}
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>{t('tracker.printSummary')}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReceiptModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Print Official Shipping Receipt & Tax Invoice"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                <span>Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setShowLabelModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t('tracker.printLabel')}</span>
              </button>
            </div>
          </div>
          <TrackingMap
            shipment={currentShipment}
            onCheckpointChange={handleCheckpointAdvance}
            allShipments={allShipments}
            onSelectShipment={onSelectShipment}
          />
        </div>

        {/* Package Physical Specifications & Unit Toggle Strip */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs">
              {/* Weight */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono flex items-center gap-1">
                  <Scale className="w-3 h-3 text-slate-400" />
                  {t('tracker.weight')} ({unitSystem === 'metric' ? 'KG' : 'LBS'})
                </span>
                <div className="font-black text-sm text-slate-900 font-mono flex items-baseline gap-1.5 mt-0.5">
                  <span>{formattedSpecs.weightStr}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({formattedSpecs.weightAltStr})</span>
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono flex items-center gap-1">
                  <Ruler className="w-3 h-3 text-slate-400" />
                  {t('tracker.dimensions')} ({unitSystem === 'metric' ? 'CM' : 'IN'})
                </span>
                <div className="font-black text-sm text-slate-900 font-mono flex items-baseline gap-1.5 mt-0.5">
                  <span>{formattedSpecs.dimensionsDetailedStr}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({formattedSpecs.dimensionsAltStr})</span>
                </div>
              </div>

              {/* Volumetric Weight */}
              <div className="hidden sm:block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                  {t('tracker.dimWeight')}
                </span>
                <div className="font-bold text-sm text-slate-700 font-mono mt-0.5">
                  {formattedSpecs.volumetricWeightStr}
                </div>
              </div>

              {/* Packaging Format */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                  {t('tracker.packageType')}
                </span>
                <div className="font-bold text-sm text-slate-800 capitalize mt-0.5">
                  {currentShipment.package.packageType.replace('_', ' ')}
                </div>
              </div>

              {/* Declared Value */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                  {t('tracker.declaredValue')}
                </span>
                <div className="font-black text-sm text-slate-900 font-mono mt-0.5">
                  ${currentShipment.package.declaredValueUsd?.toLocaleString()} USD
                </div>
              </div>
            </div>

            {/* Interactive Unit Switcher Control */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500 font-mono">
                {t('tracker.unitToggle')}:
              </span>
              <div className="inline-flex p-1 bg-white rounded-lg border border-slate-200 text-xs font-mono shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleToggleUnitSystem('metric')}
                  className={`px-2.5 py-1 rounded transition-colors font-semibold ${
                    unitSystem === 'metric'
                      ? 'bg-slate-900 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Metric units (kilograms, centimeters)"
                >
                  Metric (kg, cm)
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleUnitSystem('imperial')}
                  className={`px-2.5 py-1 rounded transition-colors font-semibold ${
                    unitSystem === 'imperial'
                      ? 'bg-slate-900 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Imperial units (pounds, inches)"
                >
                  Imperial (lbs, in)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Weather Forecast & Atmospheric Conditions Indicator */}
        {weather && (
          <div className="p-6 border-t border-slate-100 bg-gradient-to-br from-sky-50/50 via-white to-slate-50/70">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-sky-100 text-sky-800 rounded-xl border border-sky-200 shrink-0 shadow-2xs">
                  {renderWeatherIcon(weather.conditionKey, "w-5 h-5")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                      {t('tracker.weatherTitle')}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-sky-100 text-sky-800 border border-sky-200">
                      {weather.stationId}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-700">{weather.locationName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[10px] text-slate-400">Lat {weather.latitude.toFixed(2)}°, Lng {weather.longitude.toFixed(2)}°</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[11px] font-mono rounded-lg shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{t('tracker.weatherFeed')}</span>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshWeather}
                  disabled={isLoadingWeather}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-all disabled:opacity-60 cursor-pointer"
                  title={t('tracker.weatherRefresh')}
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoadingWeather ? 'animate-spin text-blue-600' : ''}`} />
                  <span className="font-mono text-[11px]">
                    {isLoadingWeather ? t('tracker.weatherRefreshing') : t('tracker.weatherRefresh')}
                  </span>
                </button>
              </div>
            </div>

            {/* Primary Weather Metric Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Temperature & Condition */}
              <div className="p-3.5 bg-white rounded-xl border border-sky-200/80 shadow-2xs hover:border-sky-300 transition-all">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    {t('tracker.weatherConditions')}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-slate-400">{weather.fetchedAt}</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {unitSystem === 'metric' ? `${weather.tempC}°C` : `${weather.tempF}°F`}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    ({unitSystem === 'metric' ? `${weather.tempF}°F` : `${weather.tempC}°C`})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-xs font-bold text-slate-800">
                    {weather.conditionText}
                  </span>
                  <span className="text-[11px] text-slate-400">· {t('tracker.weatherFeelsLike')} {unitSystem === 'metric' ? `${weather.feelsLikeC}°C` : `${weather.feelsLikeF}°F`}</span>
                </div>
              </div>

              {/* 2. Wind Vector */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-200 transition-all">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    {t('tracker.weatherWind')}
                  </span>
                  <Wind className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="text-xl font-black font-mono text-slate-900 mt-1">
                  {unitSystem === 'metric' ? `${weather.windSpeedKph} km/h` : `${weather.windSpeedMph} mph`}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                  <Compass className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-semibold font-mono">{weather.windDirection}</span>
                  <span className="text-slate-400">· Gusts nominal</span>
                </div>
              </div>

              {/* 3. Humidity & Precipitation */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-200 transition-all">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    {t('tracker.weatherHumidity')} & {t('tracker.weatherPrecip')}
                  </span>
                  <Droplets className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-xl font-black font-mono text-slate-900 mt-1">
                  {weather.humidityPct}%
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                  <span className="font-mono text-slate-500">{t('tracker.weatherPrecip')}:</span>
                  <span className="font-bold text-slate-800 font-mono">{weather.precipitationProbability}%</span>
                </div>
              </div>

              {/* 4. Atmospheric Visibility & Pressure */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-200 transition-all">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    {t('tracker.weatherVisibility')}
                  </span>
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="text-xl font-black font-mono text-slate-900 mt-1">
                  {unitSystem === 'metric' ? `${weather.visibilityKm} km` : `${weather.visibilityMiles} mi`}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                  <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-[11px] text-slate-600">
                    {unitSystem === 'metric' ? `${weather.barometricPressureHpa} hPa` : `${(weather.barometricPressureHpa * 0.02953).toFixed(2)} inHg`}
                  </span>
                </div>
              </div>
            </div>

            {/* Transit Advisory Banner */}
            <div className={`mt-3.5 p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs transition-colors ${
              weather.transitImpact === 'optimal'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : weather.transitImpact === 'moderate'
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  weather.transitImpact === 'optimal'
                    ? 'bg-emerald-500'
                    : weather.transitImpact === 'moderate'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-rose-500 animate-pulse'
                }`} />
                <span className="font-bold font-mono uppercase tracking-wider text-[11px]">
                  {weather.transitImpact === 'optimal'
                    ? t('tracker.weatherOptimal')
                    : weather.transitImpact === 'moderate'
                    ? t('tracker.weatherCaution')
                    : t('tracker.weatherAdverse')}
                </span>
              </div>
              <span className="text-[11px] text-slate-600 italic">
                "{weather.transitImpactReason}"
              </span>
            </div>
          </div>
        )}

        {/* Predictive Risk Assessment & Regional Delay Analysis Module */}
        <RiskAssessment 
          shipment={currentShipment}
          weatherData={weather}
        />

        {/* Carbon Impact & Emissions Estimate Card */}
        <div className="p-6 border-t border-slate-100 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/60">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200">
                <Leaf className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    {t('tracker.carbonImpact')}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    {t('tracker.carbonOffset')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t('tracker.carbonGlec')} · {unitSystem === 'metric' ? t('tracker.unitMetric') : t('tracker.unitImperial')}
                </p>
              </div>
            </div>

            {/* Verified Carbon Neutral Seal */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-emerald-200 text-emerald-800 text-xs font-medium rounded-full shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-[11px]">Gold Standard & VCS Offset</span>
            </div>
          </div>

          {/* 4 Carbon Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Total Estimated Footprint */}
            <div className="p-3.5 bg-white rounded-xl border border-emerald-200/80 shadow-2xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  {t('tracker.carbonFootprint')}
                </span>
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-black font-mono text-emerald-950 mt-1">
                {carbonImpact.co2eFormatted}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                <span>Alt: <strong className="text-slate-700">{carbonImpact.co2eAltFormatted}</strong></span>
                {carbonImpact.isColdChainPenalty && (
                  <span
                    className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-amber-200"
                    title={t('tracker.carbonColdChainPenalty')}
                  >
                    +18% Cryo
                  </span>
                )}
              </div>
            </div>

            {/* 2. Transit Mode & Rating */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-200 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  {t('tracker.carbonMode')}
                </span>
                {carbonImpact.modeType === 'electric' && <Zap className="w-3.5 h-3.5 text-emerald-600" />}
                {carbonImpact.modeType === 'air' && <Plane className="w-3.5 h-3.5 text-sky-600" />}
                {carbonImpact.modeType === 'van' && <Truck className="w-3.5 h-3.5 text-indigo-600" />}
                {carbonImpact.modeType === 'truck' && <Truck className="w-3.5 h-3.5 text-slate-600" />}
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1 truncate" title={carbonImpact.modeLabel}>
                {carbonImpact.modeLabel}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                  carbonImpact.modeType === 'electric'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : carbonImpact.modeType === 'air'
                    ? 'bg-sky-100 text-sky-800 border border-sky-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {carbonImpact.fleetRating}
                </span>
                {carbonImpact.savingsPct && (
                  <span className="text-[10px] font-bold text-emerald-600">
                    -{carbonImpact.savingsPct}%
                  </span>
                )}
              </div>
            </div>

            {/* 3. Calculated Route Distance */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-200 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  {t('tracker.carbonDistance')}
                </span>
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-xl font-black font-mono text-slate-900 mt-1">
                {carbonImpact.distanceFormatted}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Alt: <strong className="text-slate-700">{carbonImpact.distanceAltFormatted}</strong>
              </span>
            </div>

            {/* 4. Environmental Equivalency */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-200 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  {t('tracker.carbonEfficiencyTier')}
                </span>
                <Car className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-xs font-semibold text-slate-800 mt-1 flex items-start gap-1.5">
                <span className="shrink-0 text-amber-600 font-bold">🚗</span>
                <span className="leading-tight">{t('tracker.carbonEquivalent', { dist: carbonImpact.carEquivFormatted })}</span>
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-1.5 flex items-center gap-1.5">
                <Trees className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{t('tracker.carbonTreeEquiv', { trees: carbonImpact.treesAbsorbed })}</span>
              </div>
            </div>
          </div>

          {/* Eco routing note */}
          <div className="mt-3.5 pt-3 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>{t('tracker.carbonAvoided')}</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">
              ISO 14083 / GLEC v3.0 Framework · Clean Cargo Working Group
            </span>
          </div>
        </div>

        {/* Proof of Delivery Banner (if delivered) */}
        {currentShipment.status === 'delivered' && currentShipment.proofOfDelivery && (
          <div className="mx-6 mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">{t('tracker.podTitle')}</h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {t('tracker.signedBy')}: <strong>{currentShipment.proofOfDelivery.recipientName}</strong> at{' '}
                    {formatTime(currentShipment.proofOfDelivery.deliveredAt)}
                  </p>
                  <p className="text-xs text-emerald-700 mt-1 italic">
                    "{currentShipment.proofOfDelivery.notes || 'Package received in good order.'}"
                  </p>
                </div>
              </div>

              {/* Digital Signature rendering & Print POD */}
              <div className="flex items-center gap-3">
                <div className="bg-white px-3 py-2 border border-emerald-300 rounded-lg flex flex-col items-center">
                  <span className="text-[9px] uppercase font-bold text-slate-400">{t('tracker.signature')}</span>
                  <svg width="120" height="35" viewBox="0 0 200 60" className="stroke-slate-900 fill-none stroke-2">
                    <path d={currentShipment.proofOfDelivery.signatureSvg} />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrintSummaryModal(true)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Print Official Proof of Delivery (e-POD) Certificate"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print e-POD Slip</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Vertical Timeline of Historical Status Updates */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/60">
          {/* Header Bar with Filters, Sort Order, and Document Print Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 shadow-2xs">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    {t('tracker.timelineDetailedTitle')}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-blue-100 text-blue-800 border border-blue-200">
                    {enrichedCheckpoints.length} SCANS LOGGED
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t('tracker.timelineSubtitle')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Tabs */}
              <div className="inline-flex p-1 bg-white rounded-lg border border-slate-200 text-xs font-mono shadow-2xs">
                <button
                  type="button"
                  onClick={() => setTimelineFilter('all')}
                  className={`px-2.5 py-1 rounded transition-colors font-semibold ${
                    timelineFilter === 'all'
                      ? 'bg-slate-900 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('tracker.filterAll')} ({enrichedCheckpoints.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineFilter('completed')}
                  className={`px-2.5 py-1 rounded transition-colors font-semibold ${
                    timelineFilter === 'completed'
                      ? 'bg-slate-900 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('tracker.filterCompleted')} ({enrichedCheckpoints.filter(c => c.isPast).length})
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineFilter('active')}
                  className={`px-2.5 py-1 rounded transition-colors font-semibold ${
                    timelineFilter === 'active'
                      ? 'bg-slate-900 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('tracker.filterActive')} (1)
                </button>
              </div>

              {/* Sort Order Toggle */}
              <button
                type="button"
                onClick={() => setTimelineSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold font-mono shadow-2xs transition-colors cursor-pointer"
                title="Toggle between Newest First and Oldest First sort order"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                <span>{timelineSortOrder === 'newest' ? t('tracker.sortNewest') : t('tracker.sortOldest')}</span>
              </button>

              {/* Print Summary Button */}
              <button
                type="button"
                onClick={() => setShowPrintSummaryModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title={t('tracker.printSummaryDesc')}
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">{t('tracker.printSummary')}</span>
              </button>

              {/* Print Receipt Button */}
              <button
                type="button"
                onClick={() => setShowReceiptModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Print Official Shipping Receipt & Tax Invoice"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Receipt</span>
              </button>
            </div>
          </div>

          {/* Key Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6 p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 font-mono block">ORIGIN DISPATCH</span>
              <span className="font-bold text-slate-900 text-xs truncate block">{currentShipment.shipper.city}, {currentShipment.shipper.state}</span>
              <span className="text-[10px] text-slate-500 font-mono">{formatDate(currentShipment.createdAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-blue-500 font-mono block">LATEST ACTIVE SCAN</span>
              <span className="font-bold text-blue-950 text-xs truncate block">{currentCheckpoint?.city || currentCheckpoint?.location}, {currentCheckpoint?.state}</span>
              <span className="text-[10px] text-blue-600 font-mono font-semibold">{currentCheckpoint ? formatDate(currentCheckpoint.timestamp, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 font-mono block">ACTIVE CUSTODY FIX</span>
              <span className="font-bold text-slate-900 text-xs font-mono block">{currentLat.toFixed(4)}° N, {Math.abs(currentLng).toFixed(4)}° W</span>
              <span className="text-[10px] text-emerald-600 font-mono font-semibold">GPS LOCK VERIFIED</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 font-mono block">CONSIGNEE TARGET</span>
              <span className="font-bold text-slate-900 text-xs truncate block">{currentShipment.recipient.city}, {currentShipment.recipient.state}</span>
              <span className="text-[10px] text-slate-500 font-mono truncate block">{currentShipment.rates.deliveryTimeWindow}</span>
            </div>
          </div>

          {/* Detailed Vertical Timeline Spine & Cards */}
          <div className="relative pl-2 sm:pl-4 space-y-6 before:absolute before:left-6 sm:before:left-8 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
            {displayedCheckpoints.map((cp) => {
              const isDeliveredCheckpoint = cp.status === 'delivered';

              return (
                <div key={cp.id} className="relative flex items-start gap-3.5 sm:gap-4 pl-1">
                  {/* Vertical Spine Node Icon */}
                  <div className="relative shrink-0 z-10">
                    {cp.isCurrent && (
                      <div className="absolute -inset-1.5 rounded-full bg-blue-500/30 animate-ping" />
                    )}
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        cp.isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md shadow-blue-300'
                          : cp.isPast
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-100 shadow-2xs'
                          : 'bg-white border-2 border-slate-300 text-slate-400'
                      }`}
                    >
                      {cp.isCurrent ? (
                        <Radio className="w-4 h-4 text-white animate-pulse" />
                      ) : cp.isPast ? (
                        <Check className="w-4 h-4 text-white stroke-[2.5]" />
                      ) : (
                        <span className="text-xs font-mono font-bold text-slate-400">{cp.originalIndex + 1}</span>
                      )}
                    </div>
                  </div>

                  {/* Detailed Historical Event Card */}
                  <div
                    className={`flex-1 rounded-xl p-4 sm:p-5 border transition-all ${
                      cp.isCurrent
                        ? 'bg-white border-blue-400 ring-2 ring-blue-500/20 shadow-md'
                        : cp.isPast
                        ? 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300'
                        : 'bg-slate-50/70 border-slate-200/70 opacity-80'
                    }`}
                  >
                    {/* Top Row: Event Badges, Sequence, Hub Classification */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono tracking-wider ${
                          cp.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : cp.status === 'out_for_delivery'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : cp.status === 'exception'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : cp.status === 'picked_up' || cp.status === 'label_created'
                            ? 'bg-teal-100 text-teal-800 border border-teal-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {tStatus(cp.status)}
                        </span>

                        {/* Scan Event Code Pill */}
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>{cp.eventCode}</span>
                        </span>

                        {/* Hub Taxonomy Badge */}
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold flex items-center gap-1 text-white shadow-2xs"
                          style={{ backgroundColor: cp.hubMeta.badgeBg }}
                          title={cp.hubMeta.label}
                        >
                          <span>{cp.hubMeta.iconSymbol}</span>
                          <span>{cp.hubMeta.label.split(' ')[0]}</span>
                        </span>

                        {/* Checkpoint Sequence Index */}
                        <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 hidden sm:inline">
                          STOP {cp.originalIndex + 1} OF {currentShipment.checkpoints.length}
                        </span>
                      </div>

                      <div>
                        {cp.isCurrent ? (
                          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold font-mono bg-blue-600 text-white flex items-center gap-1.5 shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            {t('tracker.latestScan')}
                          </span>
                        ) : cp.isPast ? (
                          <span className="text-xs font-mono font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>CLEARED</span>
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-slate-400">
                            PLANNED CORRIDOR
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Operational Event Description */}
                    <div className="mb-3.5">
                      <h4 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                        <span>{cp.eventLabel}</span>
                        {cp.isCurrent && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200">
                            ACTIVE
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {cp.description}
                      </p>
                    </div>

                    {/* Rich Location Metadata & Telemetry Box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50/90 rounded-lg border border-slate-200/80 text-xs mb-3">
                      {/* Location & Facility Details */}
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">
                              {cp.location}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {cp.facilityName}
                            </span>
                          </div>
                        </div>

                        {/* Coordinates Pill & Quick Actions */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <div className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                            <Navigation className="w-3 h-3 text-cyan-600" />
                            <span>{cp.lat.toFixed(4)}° N, {Math.abs(cp.lng).toFixed(4)}° W</span>
                          </div>

                          {/* Copy Coordinates Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyCoordinates(cp.id, cp.lat, cp.lng)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer"
                            title="Copy GPS coordinates"
                          >
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>{copiedCoordId === cp.id ? 'Copied!' : 'Copy'}</span>
                          </button>

                          {/* Open in Maps External Link */}
                          <a
                            href={`https://www.google.com/maps?q=${cp.lat},${cp.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded transition-colors"
                            title="View coordinates on Google Maps"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>{t('tracker.viewExternalMap')}</span>
                          </a>
                        </div>
                      </div>

                      {/* Timestamps & Route Duration Timing */}
                      <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-200/80 md:pl-3 pt-2 md:pt-0">
                        <div className="flex items-start gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-800 font-mono text-[11.5px] block leading-tight">
                              {formatDate(cp.timestamp, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="text-[11px] font-mono text-slate-600 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>
                                {formatDateTime(cp.timestamp, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Transit Duration & Total Elapsed */}
                        <div className="pt-0.5 text-[10.5px] font-mono text-slate-500 space-y-0.5">
                          {cp.durationFromPrev && (
                            <div className="text-blue-700 font-semibold flex items-center gap-1">
                              <span>⏱ Leg Transit:</span>
                              <strong className="text-blue-900">{cp.durationFromPrev}</strong>
                            </div>
                          )}
                          <div className="text-slate-500">
                            <span>Journey Elapsed: {cp.totalElapsedStr}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Proof of Delivery Banner (if Delivered checkpoint) */}
                    {isDeliveredCheckpoint && currentShipment.proofOfDelivery && (
                      <div className="mt-3 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className="p-1.5 bg-emerald-600 text-white rounded-md">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-xs text-emerald-950 uppercase font-mono">
                                {t('tracker.podTitle')} · Direct Consignee Signature
                              </div>
                              <div className="text-xs text-emerald-800 mt-0.5">
                                Recipient: <strong>{currentShipment.proofOfDelivery.recipientName}</strong> at{' '}
                                <span className="font-mono">{formatTime(currentShipment.proofOfDelivery.deliveredAt)}</span>
                              </div>
                              <p className="text-[11px] text-emerald-700 mt-0.5 italic">
                                "{currentShipment.proofOfDelivery.notes || 'Package received in good order. Signed on carrier glass.'}"
                              </p>
                            </div>
                          </div>

                          {/* Digital Signature Rendering */}
                          <div className="bg-white px-2.5 py-1.5 border border-emerald-300 rounded-md flex flex-col items-center shadow-2xs">
                            <span className="text-[8.5px] uppercase font-bold text-slate-400 font-mono">
                              {t('tracker.signature')}
                            </span>
                            <svg width="100" height="28" viewBox="0 0 200 60" className="stroke-slate-900 fill-none stroke-2">
                              <path d={currentShipment.proofOfDelivery.signatureSvg} />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Special Instructions & Consignee Preferences */}
        <div className="p-6 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              {t('tracker.deliveryInstructions')}
            </h4>
            {isEditingInstructions ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  rows={2}
                  placeholder="e.g. Gate code #4912, leave at front desk..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveInstructions}
                    className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-500 transition-colors"
                  >
                    {t('tracker.saveInstructions')}
                  </button>
                  <button
                    onClick={() => setIsEditingInstructions(false)}
                    className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded hover:bg-slate-200 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-700 mt-1">
                {currentShipment.specialInstructions || 'Standard carrier handling. No special gate codes or hold directives on record.'}
              </p>
            )}
            {savedSuccess && (
              <span className="text-xs text-emerald-600 font-medium block mt-1">
                ✓ {t('tracker.instructionsSaved')}
              </span>
            )}
          </div>

          {!isEditingInstructions && (
            <button
              onClick={() => setIsEditingInstructions(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
            >
              {t('tracker.editInstructions')}
            </button>
          )}
        </div>
      </div>

      {/* Shipping Label Modal */}
      {showLabelModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">{t('tracker.printLabel')}</h3>
                <p className="text-xs text-slate-500">Standard 4" × 6" Thermal Print Ready Format</p>
              </div>
              <button
                onClick={() => setShowLabelModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <ShippingLabel shipment={currentShipment} />

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowLabelModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printer-Friendly Tracking Summary & History Modal */}
      {showPrintSummaryModal && (
        <ShipmentPrintSummary
          shipment={currentShipment}
          unitSystem={unitSystem}
          onClose={() => setShowPrintSummaryModal(false)}
        />
      )}

      {/* Official Freight & Shipping Receipt / Tax Invoice Modal */}
      {showReceiptModal && (
        <PrintableReceiptModal
          shipment={currentShipment}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
};
