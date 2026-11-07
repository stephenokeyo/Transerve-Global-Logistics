import React, { useState, useMemo, useEffect } from 'react';
import { Shipment, Checkpoint, PackageDetails } from '../types/shipping';
import { TrackingMap } from './TrackingMap';
import { ShippingLabel } from './ShippingLabel';
import { ShipmentPrintSummary } from './ShipmentPrintSummary';
import { RiskAssessment } from './RiskAssessment';
import { updateShipmentCheckpoint } from '../data/mockShipments';
import { useI18n } from '../i18n/I18nContext';
import { 
  Search, CheckCircle2, Clock, AlertCircle, FileText, ArrowRight,
  Shield, MapPin, Printer, RefreshCw, PenTool, ExternalLink, ChevronDown, ChevronUp,
  Timer, Truck, Calendar, Scale, Ruler, Leaf, Sparkles, Plane, Zap, Trees, ShieldCheck, Car,
  Cloud, CloudRain, CloudSun, CloudSnow, CloudLightning, Sun, Droplets, Eye, Gauge, Compass, Wind
} from 'lucide-react';
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
  const [instructions, setInstructions] = useState(currentShipment.specialInstructions || '');
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

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
    const clean = searchQuery.trim().toUpperCase();
    if (!clean) return;

    const found = allShipments.find(s => 
      s.trackingNumber.toUpperCase() === clean ||
      s.referenceNumber.toUpperCase() === clean ||
      s.trackingNumber.replace(/[^A-Z0-9]/g, '').includes(clean.replace(/[^A-Z0-9]/g, ''))
    );

    if (found) {
      onSelectShipment(found);
    } else {
      setSearchError(t('tracker.notFound', { query: searchQuery }));
    }
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
              placeholder={t('tracker.inputPlaceholder')}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
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
          <span className="text-slate-500 font-medium">{t('tracker.activeShipments')}</span>
          {allShipments.slice(0, 4).map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectShipment(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors border ${
                currentShipment.trackingNumber === s.trackingNumber
                  ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {s.trackingNumber} ({tStatus(s.status)})
            </button>
          ))}
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

        {/* Live Vector Telematics Map */}
        <div className="p-6">
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
          />
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

              {/* Digital Signature rendering */}
              <div className="bg-white px-3 py-2 border border-emerald-300 rounded-lg flex flex-col items-center">
                <span className="text-[9px] uppercase font-bold text-slate-400">{t('tracker.signature')}</span>
                <svg width="120" height="35" viewBox="0 0 200 60" className="stroke-slate-900 fill-none stroke-2">
                  <path d={currentShipment.proofOfDelivery.signatureSvg} />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Milestone Checkpoint Timeline */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-900">{t('tracker.timelineTitle')}</h3>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowPrintSummaryModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title={t('tracker.printSummaryDesc')}
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>{t('tracker.printSummary')}</span>
              </button>
              <span className="text-xs text-slate-500 font-mono">
                Checkpoint {currentShipment.currentCheckpointIndex + 1} / {currentShipment.checkpoints.length}
              </span>
            </div>
          </div>

          <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {currentShipment.checkpoints.map((cp, idx) => {
              const isPast = idx <= currentShipment.currentCheckpointIndex;
              const isCurrent = idx === currentShipment.currentCheckpointIndex;

              return (
                <div key={cp.id} className="relative flex items-start gap-4 pl-1">
                  {/* Circle Indicator */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : isPast
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border-2 border-slate-300 text-slate-400'
                    }`}
                  >
                    {isPast ? '✓' : idx + 1}
                  </div>

                  {/* Checkpoint Content */}
                  <div className="flex-1 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-sm text-slate-900">{cp.location}</span>
                      <span className="text-xs font-mono text-slate-500">
                        {formatDateTime(cp.timestamp, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{cp.description}</p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-medium text-slate-700">{cp.facilityName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{tStatus(cp.status)}</span>
                    </div>
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
    </div>
  );
};
