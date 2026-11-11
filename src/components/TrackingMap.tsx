import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shipment, Checkpoint } from '../types/shipping';
import { useI18n } from '../i18n/I18nContext';
import { 
  Truck, Plane, Radio, ShieldCheck, Thermometer, 
  BatteryCharging, Play, Pause, ChevronRight, Maximize2, Layers,
  MapPin, Crosshair, Building2, Flag, CheckCircle2, Clock, ArrowRight,
  Anchor, Train, AlertCircle, Sparkles, Search, Compass, Gauge, FastForward,
  RotateCcw, Check, X, ShieldAlert, Package, Navigation, ArrowDownRight,
  Globe, Send, ExternalLink, Printer
} from 'lucide-react';
import { 
  createWorldwideShipment, 
  WORLDWIDE_ROUTE_PRESETS, 
  resolveWorldwideLocation, 
  calculateHaversineKm,
  WorldwideRoutePreset 
} from '../services/globalTrackingService';

interface TrackingMapProps {
  shipment: Shipment;
  onCheckpointChange?: (nextIndex: number) => void;
  allShipments?: Shipment[];
  onSelectShipment?: (shipment: Shipment) => void;
}

export type HubCategory = 
  | 'origin'
  | 'air_cargo'
  | 'cross_dock'
  | 'intermodal_rail'
  | 'customs'
  | 'final_depot'
  | 'destination';

export interface HubMeta {
  category: HubCategory;
  label: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  markerColor: string;
  iconSymbol: string;
}

/**
 * Calculate geographical bearing angle (0-360 degrees) between two coordinates
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/**
 * Format heading angle into 16-wind compass abbreviation
 */
export function formatCompassHeading(deg: number): string {
  const points = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((deg % 360) / 22.5) % 16;
  return `${points[index]} ${Math.round(deg)}°`;
}

/**
 * Classify complex multi-stop waypoints into logistics hub taxonomy
 */
export function getHubClassification(cp: Checkpoint, index: number, total: number): HubMeta {
  if (index === 0) {
    return {
      category: 'origin',
      label: 'Origin Dispatch Terminal',
      badgeBg: '#059669',
      badgeBorder: '#34d399',
      badgeText: '#ffffff',
      markerColor: '#10b981',
      iconSymbol: '●',
    };
  }

  if (index === total - 1) {
    return {
      category: 'destination',
      label: 'Consignee Delivery Facility',
      badgeBg: '#2563eb',
      badgeBorder: '#60a5fa',
      badgeText: '#ffffff',
      markerColor: '#3b82f6',
      iconSymbol: '★',
    };
  }

  const text = `${cp.facilityName} ${cp.location} ${cp.description}`.toLowerCase();

  if (text.includes('air') || text.includes('flight') || text.includes('gateway') || text.includes('ord') || text.includes('dfw') || text.includes('fra') || text.includes('nrt') || text.includes('nbo') || text.includes('lhr') || text.includes('pvg') || text.includes('dxb') || text.includes('sin') || text.includes('jnb')) {
    return {
      category: 'air_cargo',
      label: 'Air Freight SuperHub',
      badgeBg: '#0284c7',
      badgeBorder: '#38bdf8',
      badgeText: '#ffffff',
      markerColor: '#0ea5e9',
      iconSymbol: '✈',
    };
  }

  if (text.includes('customs') || text.includes('port') || text.includes('quarantine') || text.includes('import') || text.includes('border')) {
    return {
      category: 'customs',
      label: 'Customs Clearance Gateway',
      badgeBg: '#b45309',
      badgeBorder: '#f59e0b',
      badgeText: '#ffffff',
      markerColor: '#d97706',
      iconSymbol: '⚓',
    };
  }

  if (text.includes('rail') || text.includes('intermodal') || text.includes('interchange')) {
    return {
      category: 'intermodal_rail',
      label: 'Intermodal Rail & Freight Hub',
      badgeBg: '#7c3aed',
      badgeBorder: '#a78bfa',
      badgeText: '#ffffff',
      markerColor: '#8b5cf6',
      iconSymbol: '🚂',
    };
  }

  if (text.includes('final-mile') || text.includes('depot') || text.includes('delivery zone') || text.includes('local') || text.includes('courier')) {
    return {
      category: 'final_depot',
      label: 'Final-Mile Distribution Depot',
      badgeBg: '#0d9488',
      badgeBorder: '#2dd4bf',
      badgeText: '#ffffff',
      markerColor: '#14b8a6',
      iconSymbol: '⛟',
    };
  }

  return {
    category: 'cross_dock',
    label: 'Automated Sortation & Cross-Dock',
    badgeBg: '#475569',
    badgeBorder: '#94a3b8',
    badgeText: '#ffffff',
    markerColor: '#64748b',
    iconSymbol: '◆',
  };
}

export type FlightPhase = 
  | 'CRUISING' 
  | 'DESCENT' 
  | 'APPROACH' 
  | 'FINAL_GLIDESLOPE' 
  | 'TOUCHDOWN' 
  | 'LANDED_TAXI' 
  | 'PARCEL_UNLOADED';

export const TrackingMap: React.FC<TrackingMapProps> = ({ 
  shipment, 
  onCheckpointChange,
  allShipments = [],
  onSelectShipment,
}) => {
  const { t } = useI18n();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const traveledPolylineRef = useRef<L.Polyline | null>(null);
  const activeLegPolylineRef = useRef<L.Polyline | null>(null);
  const markersMapRef = useRef<Map<number, L.Marker>>(new Map());

  // Dispatch Mode: 'quick_search' (Tracking # & Vehicle ID) or 'worldwide_builder' (Origin & Destination anywhere globally)
  const [dispatchMode, setDispatchMode] = useState<'quick_search' | 'worldwide_builder'>('worldwide_builder');

  // Input states for Shipping Number & Vehicle/Plane Registered Number
  const [shippingNumberInput, setShippingNumberInput] = useState(shipment.trackingNumber);
  const [vehicleIdInput, setVehicleIdInput] = useState(shipment.telemetry?.vehicleId || 'AERO-CARGO-774');

  // Worldwide Dynamic Origin & Destination Inputs ("Pick location from where parcel comes and where it arrives")
  const [originInput, setOriginInput] = useState(`${shipment.shipper.city}, ${shipment.shipper.country}`);
  const [destInput, setDestInput] = useState(`${shipment.recipient.city}, ${shipment.recipient.country}`);
  const [worldwideVehicleInput, setWorldwideVehicleInput] = useState(shipment.telemetry?.vehicleId || 'AERO-CARGO-774');
  const [inputFeedback, setInputFeedback] = useState<string | null>(null);

  // Sync inputs when active shipment prop changes
  useEffect(() => {
    setShippingNumberInput(shipment.trackingNumber);
    setVehicleIdInput(shipment.telemetry?.vehicleId || 'AERO-CARGO-774');
    setOriginInput(`${shipment.shipper.city}, ${shipment.shipper.country}`);
    setDestInput(`${shipment.recipient.city}, ${shipment.recipient.country}`);
    setWorldwideVehicleInput(shipment.telemetry?.vehicleId || 'AERO-CARGO-774');
  }, [shipment.trackingNumber, shipment.telemetry?.vehicleId, shipment.shipper.city, shipment.shipper.country, shipment.recipient.city, shipment.recipient.country]);

  // Simulation controls & State
  const [isSimulating, setIsSimulating] = useState(true);
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState<1 | 5 | 15>(1);
  const [autoFollow, setAutoFollow] = useState(true);
  const [simulatedProgress, setSimulatedProgress] = useState(0.42);
  const [mapStyle, setMapStyle] = useState<'dark' | 'streets' | 'satellite' | 'osm'>('dark');
  const [selectedWaypointIdx, setSelectedWaypointIdx] = useState<number | null>(null);

  // Flight Telematics HUD State
  const isAir = shipment.serviceLevel.includes('AIR') || shipment.telemetry?.vehicleType === 'cargo_aircraft';
  const isColdChain = shipment.package.isColdChain;

  const [altitudeFt, setAltitudeFt] = useState<number>(() => isAir ? 34000 : 0);
  const [telemetrySpeed, setTelemetrySpeed] = useState<number>(() => shipment.telemetry?.speedKph || (isAir ? 860 : 68));
  const [verticalSpeedFpm, setVerticalSpeedFpm] = useState<number>(0);
  const [flightPhase, setFlightPhase] = useState<FlightPhase>('CRUISING');
  const [telemetryTemp, setTelemetryTemp] = useState<number>(shipment.telemetry?.ambientTempC ?? (isColdChain ? -21.4 : 21.5));
  const [bearingDeg, setBearingDeg] = useState<number>(285);
  const [etaSeconds, setEtaSeconds] = useState<number>(280);

  // Landing & Parcel Unloaded Event Modal/Banner
  const [showLandingModal, setShowLandingModal] = useState<boolean>(false);
  const [hasLandedEventFired, setHasLandedEventFired] = useState<boolean>(false);

  const traveledGlowPolylineRef = useRef<L.Polyline | null>(null);
  const activeLegGlowPolylineRef = useRef<L.Polyline | null>(null);

  // Extract all checkpoint coordinates
  const checkpointCoords = useMemo(() => {
    return shipment.checkpoints.map(cp => [cp.lat, cp.lng] as [number, number]);
  }, [shipment.checkpoints]);

  const totalWaypoints = shipment.checkpoints.length;
  const originCp = shipment.checkpoints[0];
  const destCp = shipment.checkpoints[totalWaypoints - 1];

  // Current active segment points
  const currIndex = Math.min(shipment.currentCheckpointIndex, Math.max(0, checkpointCoords.length - 2));
  const fromPt = checkpointCoords[currIndex] || [41.8781, -87.6298];
  const toPt = checkpointCoords[currIndex + 1] || fromPt;

  // Calculate current vehicle lat/lng in real-time
  const vehicleProgress = shipment.status === 'delivered' ? 1 : simulatedProgress;
  const currentVehicleLat = fromPt[0] + (toPt[0] - fromPt[0]) * vehicleProgress;
  const currentVehicleLng = fromPt[1] + (toPt[1] - fromPt[1]) * vehicleProgress;

  // Calculate total route distance across checkpoints
  const totalRouteDistanceKm = useMemo(() => {
    if (originCp && destCp) {
      return Math.round(calculateHaversineKm(originCp.lat, originCp.lng, destCp.lat, destCp.lng));
    }
    return 3200;
  }, [originCp, destCp]);

  // Calculate bearing between fromPt and toPt
  useEffect(() => {
    if (fromPt && toPt) {
      const b = calculateBearing(fromPt[0], fromPt[1], toPt[0], toPt[1]);
      setBearingDeg(b);
    }
  }, [fromPt, toPt]);

  // Handle Quick Search (Shipping Number and/or Vehicle/Plane Reg #)
  const handleApplyDispatchSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setInputFeedback(null);

    const shipClean = shippingNumberInput.trim().toUpperCase();
    const vehClean = vehicleIdInput.trim().toUpperCase();

    if (!shipClean && !vehClean) return;

    if (allShipments.length > 0 && onSelectShipment) {
      const matched = allShipments.find(s => {
        const matchTracking = shipClean && (
          s.trackingNumber.toUpperCase() === shipClean ||
          s.trackingNumber.replace(/[^A-Z0-9]/g, '').includes(shipClean.replace(/[^A-Z0-9]/g, '')) ||
          s.referenceNumber.toUpperCase() === shipClean
        );
        const matchVehicle = vehClean && (
          s.telemetry?.vehicleId?.toUpperCase() === vehClean ||
          s.telemetry?.vehicleId?.toUpperCase().includes(vehClean) ||
          (vehClean.includes('774') && s.id === 'shp-002') ||
          (vehClean.includes('884') && s.id === 'shp-001') ||
          (vehClean.includes('104') && s.trackingNumber.includes('KE'))
        );

        if (shipClean && vehClean) return matchTracking || matchVehicle;
        if (shipClean) return matchTracking;
        return matchVehicle;
      });

      if (matched) {
        onSelectShipment(matched);
        setInputFeedback(`✓ Locked onto ${matched.telemetry?.vehicleType === 'cargo_aircraft' ? 'Aircraft' : 'Vehicle'} [${matched.telemetry?.vehicleId || vehClean}] · Tracking [${matched.trackingNumber}]`);
        setTimeout(() => setInputFeedback(null), 3500);
        return;
      }
    }

    if (vehClean && shipment.telemetry) {
      shipment.telemetry.vehicleId = vehClean;
      setInputFeedback(`✓ Live transponder assigned: [${vehClean}] assigned to active route`);
      setTimeout(() => setInputFeedback(null), 3000);
    }
  };

  // Handle Worldwide Dispatch: Pick where parcel comes from & where it arrives
  const handleLaunchWorldwideRoute = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setInputFeedback(null);

    const origin = originInput.trim();
    const dest = destInput.trim();

    if (!origin || !dest) {
      setInputFeedback('Please enter both Origin (from where parcel comes) and Destination (where it arrives).');
      return;
    }

    const newShipment = createWorldwideShipment({
      originQuery: origin,
      destQuery: dest,
      vehicleOrPlaneId: worldwideVehicleInput.trim() || undefined,
      isColdChain: shipment.package.isColdChain,
    });

    if (onSelectShipment) {
      onSelectShipment(newShipment);
    }

    // Reset simulation progression for fresh journey
    setSimulatedProgress(0.35);
    setFlightPhase('CRUISING');
    setAltitudeFt(newShipment.telemetry?.vehicleType === 'cargo_aircraft' ? 35000 : 0);
    setHasLandedEventFired(false);
    setShowLandingModal(false);

    setInputFeedback(`🌍 Worldwide Route Dispatched: [${newShipment.shipper.city}, ${newShipment.shipper.country}] ➔ [${newShipment.recipient.city}, ${newShipment.recipient.country}] with Unit [${newShipment.telemetry?.vehicleId}]`);
    setTimeout(() => setInputFeedback(null), 4500);
  };

  // Launch a curated Worldwide Corridor Preset
  const handleSelectPresetCorridor = (preset: WorldwideRoutePreset) => {
    setOriginInput(preset.origin);
    setDestInput(preset.destination);
    setWorldwideVehicleInput(preset.vehicleId);

    const newShipment = createWorldwideShipment({
      originQuery: preset.origin,
      destQuery: preset.destination,
      vehicleOrPlaneId: preset.vehicleId,
      cargoDescription: preset.cargoType,
      carrier: preset.carrier,
    });

    if (onSelectShipment) {
      onSelectShipment(newShipment);
    }

    setSimulatedProgress(0.40);
    setFlightPhase('CRUISING');
    setAltitudeFt(35000);
    setHasLandedEventFired(false);
    setShowLandingModal(false);

    setInputFeedback(`✈ Launched Global Trade Corridor: ${preset.label} · Unit [${preset.vehicleId}]`);
    setTimeout(() => setInputFeedback(null), 4500);
  };

  // Direct fast-forward to Landing Approach
  const handleTriggerLandingApproach = useCallback(() => {
    setIsSimulating(true);
    setSimulatedProgress(0.92);
    setAltitudeFt(2800);
    setFlightPhase('APPROACH');
    setVerticalSpeedFpm(-1400);
    setTelemetrySpeed(280);
    setEtaSeconds(35);
    setHasLandedEventFired(false);

    if (mapInstanceRef.current && toPt) {
      mapInstanceRef.current.flyTo([toPt[0], toPt[1]], 10, {
        duration: 1.5,
      });
    }
  }, [toPt]);

  // Reset Flight / Replay Approach
  const handleReplayFlight = useCallback(() => {
    setShowLandingModal(false);
    setHasLandedEventFired(false);
    setSimulatedProgress(0.25);
    setAltitudeFt(isAir ? 34000 : 0);
    setFlightPhase('CRUISING');
    setVerticalSpeedFpm(0);
    setTelemetrySpeed(isAir ? 860 : 68);
    setEtaSeconds(240);
    setIsSimulating(true);

    if (mapInstanceRef.current) {
      const bounds = L.latLngBounds(checkpointCoords);
      mapInstanceRef.current.fitBounds(bounds, { padding: [45, 45] });
    }
  }, [isAir, checkpointCoords]);

  // Real-time telematics simulation tick loop
  useEffect(() => {
    if (!isSimulating || shipment.status === 'delivered') return;

    const intervalTime = 1000;
    const interval = setInterval(() => {
      const step = 0.012 * simSpeedMultiplier;

      setSimulatedProgress(prev => {
        const next = prev + step;

        if (isAir) {
          if (next < 0.70) {
            setFlightPhase('CRUISING');
            setAltitudeFt(34000 + Math.round((Math.random() - 0.5) * 80));
            setVerticalSpeedFpm(0);
            setTelemetrySpeed(Math.round(860 + (Math.random() - 0.5) * 10));
            setEtaSeconds(Math.max(45, Math.round((1 - next) * 320)));
          } else if (next >= 0.70 && next < 0.88) {
            setFlightPhase('DESCENT');
            const descentRatio = (next - 0.70) / 0.18;
            const currentAlt = Math.round(34000 - descentRatio * 26000);
            setAltitudeFt(currentAlt);
            setVerticalSpeedFpm(-1850);
            setTelemetrySpeed(Math.round(620 - descentRatio * 280));
            setEtaSeconds(Math.max(25, Math.round((1 - next) * 220)));
          } else if (next >= 0.88 && next < 0.96) {
            setFlightPhase('APPROACH');
            const approachRatio = (next - 0.88) / 0.08;
            const currentAlt = Math.max(300, Math.round(8000 - approachRatio * 7500));
            setAltitudeFt(currentAlt);
            setVerticalSpeedFpm(-750);
            setTelemetrySpeed(Math.round(340 - approachRatio * 110));
            setEtaSeconds(Math.max(8, Math.round((1 - next) * 100)));
          } else if (next >= 0.96 && next < 0.99) {
            setFlightPhase('FINAL_GLIDESLOPE');
            setAltitudeFt(Math.max(30, Math.round((0.99 - next) * 2000)));
            setVerticalSpeedFpm(-450);
            setTelemetrySpeed(160);
            setEtaSeconds(3);
          } else if (next >= 0.99) {
            setFlightPhase('TOUCHDOWN');
            setAltitudeFt(0);
            setVerticalSpeedFpm(0);
            setTelemetrySpeed(35);
            setEtaSeconds(0);

            if (!hasLandedEventFired) {
              setHasLandedEventFired(true);
              setShowLandingModal(true);
              setFlightPhase('PARCEL_UNLOADED');

              if (onCheckpointChange && shipment.currentCheckpointIndex < shipment.checkpoints.length - 1) {
                setTimeout(() => {
                  onCheckpointChange(shipment.currentCheckpointIndex + 1);
                }, 1200);
              }
            }
          }
        } else {
          setTelemetrySpeed(prevSpd => {
            const delta = (Math.random() - 0.5) * 4;
            return Math.max(25, Math.min(105, Math.round(prevSpd + delta)));
          });
          setEtaSeconds(Math.max(0, Math.round((1 - next) * 180)));
        }

        if (isColdChain) {
          setTelemetryTemp(prevT => {
            const delta = (Math.random() - 0.5) * 0.1;
            return Math.round((prevT + delta) * 10) / 10;
          });
        }

        if (next >= 1.0) {
          return 0.05;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isSimulating, simSpeedMultiplier, isAir, isColdChain, hasLandedEventFired, shipment.currentCheckpointIndex, shipment.checkpoints.length, shipment.status, onCheckpointChange]);

  const handleFocusWaypoint = (idx: number) => {
    setSelectedWaypointIdx(idx);
    const cp = shipment.checkpoints[idx];
    if (!cp || !mapInstanceRef.current) return;

    mapInstanceRef.current.flyTo([cp.lat, cp.lng], 9, {
      duration: 1.2,
      easeLinearity: 0.25,
    });

    const marker = markersMapRef.current.get(idx);
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 350);
    }
  };

  const handleCenterOnVehicle = () => {
    setSelectedWaypointIdx(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([currentVehicleLat, currentVehicleLng], isAir ? 6 : 9, {
        duration: 1.2,
      });
      if (vehicleMarkerRef.current) {
        setTimeout(() => {
          vehicleMarkerRef.current?.openPopup();
        }, 300);
      }
    }
  };

  const handleResetView = () => {
    setSelectedWaypointIdx(null);
    if (mapInstanceRef.current && checkpointCoords.length > 0) {
      const bounds = L.latLngBounds(checkpointCoords);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  // Initialize Leaflet Map instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    markersMapRef.current.clear();

    const defaultCenter: [number, number] = [currentVehicleLat, currentVehicleLng];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: isAir ? 4 : 6,
      zoomControl: true,
      attributionControl: true,
      worldCopyJump: true,
    });

    mapInstanceRef.current = map;

    // Watermark-free tile layers
    if (mapStyle === 'dark') {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      }).addTo(map);

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        pane: 'tilePane',
      }).addTo(map);
    } else if (mapStyle === 'streets') {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: '&copy; Esri, DeLorme, NAVTEQ, USGS',
      }).addTo(map);
    } else if (mapStyle === 'satellite') {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: '&copy; Esri, i-cubed, USDA, USGS',
      }).addTo(map);
    } else {
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
    }

    const markersLayer = L.layerGroup().addTo(map);

    // 1. PLOT MULTI-STOP ROUTE POLYLINES (Worldwide Corridor, Traveled Path, Active Leg)
    if (checkpointCoords.length >= 2) {
      const isDarkTheme = mapStyle === 'dark' || mapStyle === 'satellite';
      L.polyline(checkpointCoords, {
        color: isDarkTheme ? '#475569' : '#94a3b8',
        weight: 3,
        dashArray: '6, 8',
        opacity: 0.65,
      }).addTo(map);

      const traveledCoords: [number, number][] = [
        ...checkpointCoords.slice(0, currIndex + 1),
        [currentVehicleLat, currentVehicleLng],
      ];

      const traveledGlow = L.polyline(traveledCoords, {
        color: isAir ? '#0284c7' : '#059669',
        weight: 8,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      traveledGlowPolylineRef.current = traveledGlow;

      const traveledLine = L.polyline(traveledCoords, {
        color: isAir ? '#38bdf8' : '#10b981',
        weight: 4.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      traveledPolylineRef.current = traveledLine;

      const activeLegCoords: [number, number][] = [
        [currentVehicleLat, currentVehicleLng],
        toPt,
      ];

      const activeLegGlow = L.polyline(activeLegCoords, {
        color: '#f59e0b',
        weight: 7,
        opacity: 0.25,
        lineCap: 'round',
      }).addTo(map);
      activeLegGlowPolylineRef.current = activeLegGlow;

      const activeLeg = L.polyline(activeLegCoords, {
        color: '#fbbf24',
        weight: 3.5,
        dashArray: '5, 7',
        opacity: 0.95,
        lineCap: 'round',
      }).addTo(map);
      activeLegPolylineRef.current = activeLeg;
    }

    // 2. PLOT EVERY WAYPOINT STOP ACROSS CONTINENTS
    shipment.checkpoints.forEach((cp, idx) => {
      const isOrigin = idx === 0;
      const isDestination = idx === totalWaypoints - 1;
      const isCompleted = idx <= shipment.currentCheckpointIndex;
      const isNextTarget = idx === shipment.currentCheckpointIndex + 1;
      const isCurrentActive = idx === shipment.currentCheckpointIndex;
      const hubMeta = getHubClassification(cp, idx, totalWaypoints);

      const stateBadge = isCompleted
        ? '<span style="color:#10b981; margin-left:3px; font-weight:900;">✓</span>'
        : isNextTarget
        ? '<span style="color:#38bdf8; margin-left:3px; font-weight:900;">➔</span>'
        : '';

      const stopLabelText = isOrigin 
        ? 'ORIGIN' 
        : isDestination 
        ? 'DEST' 
        : `STOP ${idx + 1}`;

      const markerBorder = isCurrentActive 
        ? '#38bdf8' 
        : isCompleted 
        ? '#10b981' 
        : '#cbd5e1';

      const markerShadow = isCurrentActive
        ? '0 0 12px rgba(56,189,248,0.9)'
        : isCompleted
        ? '0 0 8px rgba(16,185,129,0.7)'
        : '0 2px 6px rgba(0,0,0,0.4)';

      const hubIconHtml = `
        <div style="display:flex; flex-direction:column; align-items:center; cursor:pointer;" class="waypoint-marker-wrapper">
          <div style="background-color:${hubMeta.badgeBg}; color:${hubMeta.badgeText}; font-family:monospace; font-size:9.5px; font-weight:800; padding:2px 7px; border-radius:5px; border:1.5px solid ${markerBorder}; box-shadow:${markerShadow}; white-space:nowrap; display:flex; align-items:center; gap:3px;">
            <span>${hubMeta.iconSymbol}</span>
            <span>${stopLabelText}</span>
            ${stateBadge}
          </div>
          <div style="width:11px; height:11px; border-radius:50%; background-color:${hubMeta.markerColor}; border:2.5px solid #ffffff; box-shadow:${markerShadow}; margin-top:2px;"></div>
        </div>
      `;

      const hubIcon = L.divIcon({
        className: `waypoint-leaflet-stop-${idx}`,
        html: hubIconHtml,
        iconSize: [85, 34],
        iconAnchor: [42.5, 26],
      });

      const stopMarker = L.marker([cp.lat, cp.lng], { icon: hubIcon });

      const popupHtml = `
        <div style="font-family:'Plus Jakarta Sans',sans-serif; font-size:12px; color:#0f172a; padding:6px; min-width:240px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-weight:800; font-size:10px; color:${hubMeta.markerColor}; font-family:monospace; text-transform:uppercase;">
              ${hubMeta.label}
            </span>
            <span style="font-size:9px; background:${isCompleted ? '#dcfce7' : '#f1f5f9'}; color:${isCompleted ? '#15803d' : '#475569'}; padding:1px 6px; border-radius:3px; font-weight:bold; font-family:monospace;">
              STOP ${idx + 1} OF ${totalWaypoints}
            </span>
          </div>

          <div style="font-weight:700; font-size:13px; color:#0f172a; margin-bottom:2px;">
            ${cp.location}
          </div>
          <div style="color:#475569; font-size:11px; font-weight:600; margin-bottom:3px;">
            ${cp.facilityName}
          </div>
          <div style="color:#64748b; font-size:11px; line-height:1.35; margin-bottom:6px;">
            ${cp.description}
          </div>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px; font-family:monospace; font-size:10.5px; color:#334155; margin-bottom:6px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
              <span style="color:#64748b;">Coordinates:</span>
              <strong>${cp.lat.toFixed(4)}°N, ${cp.lng.toFixed(4)}°E</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
              <span style="color:#64748b;">Timestamp:</span>
              <span>${new Date(cp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:#64748b;">Status:</span>
              <strong style="color:${isCompleted ? '#16a34a' : '#d97706'};">${cp.status.replace('_', ' ').toUpperCase()}</strong>
            </div>
          </div>
        </div>
      `;

      stopMarker.bindPopup(popupHtml);
      stopMarker.on('click', () => {
        setSelectedWaypointIdx(idx);
      });

      markersLayer.addLayer(stopMarker);
      markersMapRef.current.set(idx, stopMarker);
    });

    // 3. LIVE ROTATING VEHICLE / AIRCRAFT RADAR MARKER
    const activeVehicleReg = vehicleIdInput || shipment.telemetry?.vehicleId || 'AERO-CARGO-774';

    const vehicleIconHtml = `
      <div class="realtime-vehicle-radar-node" style="position:relative; width:160px; height:80px; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:auto; cursor:pointer;">
        <!-- Live Callout Banner with Plane Registration and Tracking -->
        <div style="position:absolute; top:0; z-index:20; background:#020617; color:#38bdf8; border:1.5px solid ${isAir ? '#0284c7' : '#10b981'}; font-size:9.5px; font-weight:800; font-family:monospace; padding:2px 8px; border-radius:9999px; box-shadow:0 0 16px rgba(56,189,248,0.8), 0 3px 6px rgba(0,0,0,0.8); white-space:nowrap; display:flex; align-items:center; gap:4px;">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${isAir ? '#38bdf8' : '#10b981'}; animation:ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <span style="letter-spacing:0.04em;">${activeVehicleReg}</span>
          <span style="color:#94a3b8; font-weight:400;">|</span>
          <span style="color:#f8fafc; font-weight:700;">${isAir ? `${Math.round(altitudeFt).toLocaleString()} FT` : `${telemetrySpeed} KM/H`}</span>
        </div>
        
        <!-- Rotating Vehicle Container -->
        <div id="live-rotating-vehicle-carrier" style="position:relative; width:52px; height:52px; display:flex; align-items:center; justify-content:center; margin-top:14px; transform:rotate(${bearingDeg}deg); transition:transform 0.4s ease-out;">
          <div style="position:absolute; inset:-12px; border-radius:50%; background:radial-gradient(circle, rgba(56,189,248,0.5) 0%, rgba(56,189,248,0) 70%); animation:ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position:absolute; inset:-2px; border-radius:50%; border:2px dashed rgba(56,189,248,0.7); animation:spin 8s linear infinite;"></div>
          
          <div style="position:relative; width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg, ${isAir ? '#0284c7' : '#059669'} 0%, ${isAir ? '#0c4a6e' : '#064e3b'} 100%); border:2.5px solid #ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 0 20px rgba(56,189,248,0.95), 0 4px 10px rgba(0,0,0,0.6);">
            ${isAir ? `
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#ffffff" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.7));">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
              </svg>
            ` : `
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#ffffff" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.7));">
                <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
              </svg>
            `}
          </div>
        </div>
      </div>
    `;

    const vehicleIcon = L.divIcon({
      className: 'realtime-moving-vehicle-icon',
      html: vehicleIconHtml,
      iconSize: [160, 80],
      iconAnchor: [80, 50],
      popupAnchor: [0, -45],
    });

    const vehicleMarker = L.marker([currentVehicleLat, currentVehicleLng], {
      icon: vehicleIcon,
      zIndexOffset: 1200,
    }).addTo(map);

    vehicleMarker.bindPopup(`
      <div style="font-family:'Plus Jakarta Sans',sans-serif; font-size:12px; color:#0f172a; padding:6px; min-width:260px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <span style="font-weight:800; font-size:12px; color:#0284c7; font-family:monospace;">${activeVehicleReg}</span>
          <span style="font-size:9.5px; background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:3px; font-weight:800; font-family:monospace;">
            ${isAir ? 'WORLDWIDE FLIGHT FIX' : 'WORLDWIDE FLEET FIX'}
          </span>
        </div>
        
        <div style="font-weight:700; font-size:13px; color:#0f172a; margin-bottom:4px;">
          ${shipment.shipper.city} ➔ ${shipment.recipient.city} (${totalRouteDistanceKm.toLocaleString()} KM)
        </div>
        
        <div style="background:#020617; color:#38bdf8; padding:6px 8px; border-radius:6px; font-family:monospace; font-size:11px; margin-bottom:6px; border:1px solid #1e293b;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span style="color:#94a3b8;">Coords:</span>
            <strong>${currentVehicleLat.toFixed(4)}°N, ${currentVehicleLng.toFixed(4)}°E</strong>
          </div>
          ${isAir ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
              <span style="color:#94a3b8;">Altitude:</span>
              <strong style="color:#f8fafc;">${Math.round(altitudeFt).toLocaleString()} FT (${Math.round(altitudeFt * 0.3048).toLocaleString()} M)</strong>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:#94a3b8;">Vertical Spd:</span>
              <strong style="color:${verticalSpeedFpm < 0 ? '#f59e0b' : '#38bdf8'};">${verticalSpeedFpm} FPM</strong>
            </div>
          ` : ''}
        </div>

        <div style="display:flex; justify-content:space-between; color:#475569; font-size:11px; margin-bottom:3px;">
          <span>Velocity:</span> <strong style="color:#0f172a;">${telemetrySpeed} km/h (${Math.round(telemetrySpeed * 0.539957)} knots)</strong>
        </div>
        <div style="display:flex; justify-content:space-between; color:#475569; font-size:11px; margin-bottom:3px;">
          <span>Heading:</span> <strong style="color:#0f172a;">${formatCompassHeading(bearingDeg)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; color:#475569; font-size:11px; margin-bottom:3px;">
          <span>Linked Parcel:</span> <strong style="color:#0284c7; font-family:monospace;">${shipment.trackingNumber}</strong>
        </div>
      </div>
    `);

    vehicleMarkerRef.current = vehicleMarker;

    if (checkpointCoords.length > 0) {
      const bounds = L.latLngBounds(checkpointCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapStyle, shipment.id, shipment.trackingNumber, shipment.currentCheckpointIndex, checkpointCoords, isAir, totalRouteDistanceKm]);

  // Update vehicle position, dynamic bearing rotation, and trailing polyline smoothly in real-time
  useEffect(() => {
    if (!vehicleMarkerRef.current || !mapInstanceRef.current) return;

    vehicleMarkerRef.current.setLatLng([currentVehicleLat, currentVehicleLng]);

    const rotatingEl = document.getElementById('live-rotating-vehicle-carrier');
    if (rotatingEl) {
      rotatingEl.style.transform = `rotate(${bearingDeg}deg)`;
    }

    const traveledCoords: [number, number][] = [
      ...checkpointCoords.slice(0, currIndex + 1),
      [currentVehicleLat, currentVehicleLng],
    ];

    if (traveledPolylineRef.current) {
      traveledPolylineRef.current.setLatLngs(traveledCoords);
    }
    if (traveledGlowPolylineRef.current) {
      traveledGlowPolylineRef.current.setLatLngs(traveledCoords);
    }

    const activeLegCoords: [number, number][] = [
      [currentVehicleLat, currentVehicleLng],
      toPt,
    ];

    if (activeLegPolylineRef.current) {
      activeLegPolylineRef.current.setLatLngs(activeLegCoords);
    }
    if (activeLegGlowPolylineRef.current) {
      activeLegGlowPolylineRef.current.setLatLngs(activeLegCoords);
    }

    if (autoFollow && mapInstanceRef.current) {
      mapInstanceRef.current.panTo([currentVehicleLat, currentVehicleLng], { animate: true, duration: 0.8 });
    }
  }, [currentVehicleLat, currentVehicleLng, currIndex, toPt, autoFollow, checkpointCoords, bearingDeg]);

  const formattedCountdown = useMemo(() => {
    const mins = Math.floor(etaSeconds / 60);
    const secs = etaSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [etaSeconds]);

  return (
    <div className="space-y-4">
      {/* 1. WORLDWIDE PARCEL DISPATCH & TELEMATICS CONSOLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-100 shadow-md">
        {/* Header with Mode Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Globe className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                  GLOBAL INTERMODAL TRACKING & WORLDWIDE RADAR
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  WORLDWIDE COVERAGE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Track parcels across Africa, Europe, Americas, Asia, and Oceania. Pick origin, destination, and monitor live vehicles in flight.
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="inline-flex p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setDispatchMode('worldwide_builder')}
              className={`px-3 py-1 rounded font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                dispatchMode === 'worldwide_builder'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Track Any Global Route</span>
            </button>
            <button
              type="button"
              onClick={() => setDispatchMode('quick_search')}
              className={`px-3 py-1 rounded font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                dispatchMode === 'quick_search'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Lookup by ID / Reg #</span>
            </button>
          </div>
        </div>

        {/* TAB A: WORLDWIDE ROUTE BUILDER (Pick location where parcel comes from & arrives) */}
        {dispatchMode === 'worldwide_builder' && (
          <div className="space-y-3">
            <form onSubmit={handleLaunchWorldwideRoute} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              {/* Origin: From where parcel comes */}
              <div className="sm:col-span-4 relative">
                <label className="block text-[10px] font-mono uppercase font-bold text-emerald-400 mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Where Parcel Comes From (Origin)</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                  <input
                    type="text"
                    value={originInput}
                    onChange={(e) => setOriginInput(e.target.value)}
                    placeholder="e.g. Nairobi, Kenya or Tokyo, Japan or London, UK"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-emerald-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Destination: Where parcel arrives */}
              <div className="sm:col-span-4 relative">
                <label className="block text-[10px] font-mono uppercase font-bold text-blue-400 mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Where Parcel Arrives (Destination)</span>
                </label>
                <div className="relative">
                  <Flag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                  <input
                    type="text"
                    value={destInput}
                    onChange={(e) => setDestInput(e.target.value)}
                    placeholder="e.g. London, UK or Frankfurt, Germany or Sydney, Australia"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-blue-200 placeholder-slate-500 focus:outline-hidden focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Vehicle / Plane Registration */}
              <div className="sm:col-span-2 relative">
                <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <Plane className="w-3 h-3 text-cyan-400" />
                  <span>Vehicle / Plane #</span>
                </label>
                <input
                  type="text"
                  value={worldwideVehicleInput}
                  onChange={(e) => setWorldwideVehicleInput(e.target.value)}
                  placeholder="e.g. KQ-CARGO-104"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-cyan-200 placeholder-slate-500 focus:outline-hidden focus:border-cyan-400 transition-all font-bold"
                />
              </div>

              {/* Launch Action */}
              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer font-mono"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Track Worldwide</span>
                </button>
              </div>
            </form>

            {/* Quick Global Trade Corridor Presets (All Continents) */}
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 mb-1.5 block">
                Popular Worldwide Trade Routes (1-Click Launch):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {WORLDWIDE_ROUTE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPresetCorridor(preset)}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/50 rounded text-[11px] font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title={`Dispatch ${preset.label}`}
                  >
                    <Plane className="w-3 h-3 text-cyan-400" />
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB B: SEARCH BY ID OR TRANSPONDER */}
        {dispatchMode === 'quick_search' && (
          <form onSubmit={handleApplyDispatchSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-5 relative">
              <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1">
                Shipping Number (Tracking #)
              </label>
              <div className="relative">
                <Package className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={shippingNumberInput}
                  onChange={(e) => setShippingNumberInput(e.target.value)}
                  placeholder="e.g. VG-901482093-GL or VG-849204819-US"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-cyan-200 placeholder-slate-500 focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>
            </div>

            <div className="sm:col-span-4 relative">
              <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1">
                Vehicle / Plane Registered #
              </label>
              <div className="relative">
                {isAir ? (
                  <Plane className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
                ) : (
                  <Truck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                )}
                <input
                  type="text"
                  value={vehicleIdInput}
                  onChange={(e) => setVehicleIdInput(e.target.value)}
                  placeholder="e.g. AERO-CARGO-774, KQ-CARGO-104, VG-TRUCK-884"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-cyan-200 placeholder-slate-500 focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-bold"
                />
              </div>
            </div>

            <div className="sm:col-span-3 flex items-end">
              <button
                type="submit"
                className="w-full py-2 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer font-mono"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Track & Lock Unit</span>
              </button>
            </div>
          </form>
        )}

        {/* Feedback message */}
        {inputFeedback && (
          <p className="mt-2 text-xs font-mono text-cyan-300 flex items-center gap-1.5 animate-fadeIn">
            <Check className="w-3.5 h-3.5 text-cyan-400" />
            <span>{inputFeedback}</span>
          </p>
        )}
      </div>

      {/* 2. LIVE FLIGHT RADAR & TELEMATICS INSTRUMENTATION CLUSTER */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-xl p-4 text-slate-100 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase bg-blue-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>{isAir ? 'WORLDWIDE FLIGHT RADAR & GLIDESLOPE' : 'GLOBAL FLEET TELEMETRY'}</span>
            </span>
            <span className="text-slate-400 font-mono text-xs">
              Unit: <strong className="text-white">{vehicleIdInput || shipment.telemetry?.vehicleId || 'AERO-CARGO-774'}</strong>
              <span className="text-slate-600 mx-1.5">·</span>
              Distance: <strong className="text-cyan-300">{totalRouteDistanceKm.toLocaleString()} KM</strong>
            </span>
          </div>

          {/* Simulation Speed & Fast-Forward Landing Trigger */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs font-mono">
              <span className="px-2 text-[10px] text-slate-400 uppercase font-bold">Speed:</span>
              <button
                type="button"
                onClick={() => setSimSpeedMultiplier(1)}
                className={`px-2 py-0.5 rounded ${simSpeedMultiplier === 1 ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                title="1x Real-Time smooth movement"
              >
                1x
              </button>
              <button
                type="button"
                onClick={() => setSimSpeedMultiplier(5)}
                className={`px-2 py-0.5 rounded ${simSpeedMultiplier === 5 ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                title="5x Accelerated progress"
              >
                5x
              </button>
              <button
                type="button"
                onClick={() => setSimSpeedMultiplier(15)}
                className={`px-2 py-0.5 rounded ${simSpeedMultiplier === 15 ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                title="15x Warp speed"
              >
                15x
              </button>
            </div>

            {/* Simulate Landing Approach Trigger */}
            {isAir && (
              <button
                type="button"
                onClick={handleTriggerLandingApproach}
                className="px-3 py-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer font-mono"
                title="Simulate immediate landing glideslope approach into destination runway"
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Simulate Landing Approach Now</span>
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Instruments Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* 1. Altitude */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block flex items-center gap-1">
              <Gauge className="w-3 h-3 text-cyan-400" />
              <span>{isAir ? 'ALTITUDE' : 'ELEVATION'}</span>
            </span>
            <div className="text-base font-mono font-black text-cyan-200 mt-0.5">
              {isAir ? `${Math.round(altitudeFt).toLocaleString()} FT` : '240 M'}
            </div>
            <span className="text-[10px] text-slate-400 font-mono block">
              {isAir ? `${Math.round(altitudeFt * 0.3048).toLocaleString()} m MSL` : 'Ground level'}
            </span>
          </div>

          {/* 2. Flight Phase */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block flex items-center gap-1">
              <Radio className="w-3 h-3 text-amber-400" />
              <span>FLIGHT PHASE</span>
            </span>
            <div className={`text-xs font-mono font-black mt-1 uppercase ${
              flightPhase === 'TOUCHDOWN' || flightPhase === 'PARCEL_UNLOADED'
                ? 'text-emerald-400'
                : flightPhase === 'APPROACH' || flightPhase === 'FINAL_GLIDESLOPE'
                ? 'text-amber-400'
                : 'text-cyan-300'
            }`}>
              {flightPhase.replace('_', ' ')}
            </div>
            <span className="text-[10px] text-slate-400 font-mono block truncate">
              {flightPhase === 'CRUISING' ? 'En Route Airway' : flightPhase === 'APPROACH' ? 'ILS Inbound' : flightPhase === 'TOUCHDOWN' ? 'Touchdown Confirmed' : 'Active Corridor'}
            </span>
          </div>

          {/* 3. Speed */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block flex items-center gap-1">
              <Gauge className="w-3 h-3 text-emerald-400" />
              <span>GROUND SPEED</span>
            </span>
            <div className="text-base font-mono font-black text-white mt-0.5">
              {telemetrySpeed} KM/H
            </div>
            <span className="text-[10px] text-slate-400 font-mono block">
              {Math.round(telemetrySpeed * 0.539957)} Knots (GS)
            </span>
          </div>

          {/* 4. Compass Bearing */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block flex items-center gap-1">
              <Compass className="w-3 h-3 text-indigo-400" />
              <span>BEARING</span>
            </span>
            <div className="text-base font-mono font-black text-slate-200 mt-0.5">
              {formatCompassHeading(bearingDeg)}
            </div>
            <span className="text-[10px] text-slate-400 font-mono block">
              True Vector heading
            </span>
          </div>

          {/* 5. Touchdown Countdown */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block flex items-center gap-1">
              <Clock className="w-3 h-3 text-rose-400" />
              <span>TOUCHDOWN ETA</span>
            </span>
            <div className="text-base font-mono font-black text-amber-300 mt-0.5">
              {flightPhase === 'TOUCHDOWN' || flightPhase === 'PARCEL_UNLOADED' ? 'TOUCHDOWN' : formattedCountdown}
            </div>
            <span className="text-[10px] text-slate-400 font-mono block">
              {flightPhase === 'TOUCHDOWN' ? 'Landed safely' : 'Time to runway'}
            </span>
          </div>

          {/* 6. Cargo Bay Sensor */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>CARGO BAY MONITOR</span>
            </span>
            <div className="text-base font-mono font-black text-emerald-400 mt-0.5">
              {isColdChain ? `${telemetryTemp > 0 ? `+${telemetryTemp}` : telemetryTemp}°C` : 'SECURED'}
            </div>
            <span className="text-[10px] text-slate-400 font-mono block truncate">
              {isColdChain ? 'Cryo Seal Active' : 'Tamper Barrier OK'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. MAIN LEAFLET MAP CANVAS CONTAINER */}
      <div className="relative w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 text-slate-100 shadow-xl">
        {/* Top Controls Bar */}
        <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 font-mono text-emerald-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold">LIVE RADAR TRACKING ACTIVE</span>
            </div>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
              UNIT: <strong className="text-cyan-300">{vehicleIdInput || shipment.telemetry?.vehicleId || 'AERO-CARGO-774'}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedWaypointIdx !== null ? selectedWaypointIdx : ''}
              onChange={(e) => {
                if (e.target.value === '') {
                  handleCenterOnVehicle();
                } else {
                  handleFocusWaypoint(Number(e.target.value));
                }
              }}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs font-mono focus:outline-hidden focus:border-cyan-400"
            >
              <option value="">All Waypoints (Live Unit)</option>
              {shipment.checkpoints.map((cp, idx) => (
                <option key={cp.id || idx} value={idx}>
                  Stop {idx + 1}: {cp.city || cp.location.split(',')[0]} ({getHubClassification(cp, idx, totalWaypoints).label.split(' ')[0]})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleCenterOnVehicle}
              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 rounded text-xs transition-colors shadow-2xs cursor-pointer"
              title={t('map.focusVehicle')}
            >
              <Crosshair className="w-3 h-3 text-cyan-400" />
              <span>Center Unit</span>
            </button>

            <button
              type="button"
              onClick={handleResetView}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors cursor-pointer"
              title={t('map.fitRoute')}
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden sm:inline">Full Route</span>
            </button>

            <button
              type="button"
              onClick={() => setAutoFollow(!autoFollow)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                autoFollow 
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold shadow-2xs' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Camera lock onto live vehicle/aircraft in real-time"
            >
              <Radio className={`w-3 h-3 ${autoFollow ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
              <span>{autoFollow ? 'Camera Locked' : 'Free Camera'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMapStyle(prev => {
                  if (prev === 'dark') return 'streets';
                  if (prev === 'streets') return 'satellite';
                  if (prev === 'satellite') return 'osm';
                  return 'dark';
                });
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors font-mono cursor-pointer"
            >
              <Layers className="w-3 h-3 text-cyan-400" />
              <span className="uppercase font-bold">{mapStyle}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSimulating(!isSimulating)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                isSimulating ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isSimulating ? 'Simulating' : 'Paused'}</span>
            </button>
          </div>
        </div>

        {/* Leaflet Map Canvas */}
        <div className="relative w-full h-[410px] sm:h-[490px] bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Floating World Route Header Badge (Top-left overlay) */}
          <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg px-3 py-2 text-xs z-[1000] pointer-events-auto shadow-xl max-w-[320px]">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>{isAir ? 'INTERMODAL FLIGHT RADAR' : 'LINEHAUL ROUTE RADAR'}</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {formatCompassHeading(bearingDeg)}
              </span>
            </div>
            <div className="text-[11.5px] text-white font-mono font-bold flex items-center gap-1.5 truncate">
              <span>{shipment.shipper.city}</span>
              <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="text-cyan-200">{shipment.recipient.city}</span>
            </div>
            <div className="text-[10.5px] text-slate-400 font-mono mt-0.5 flex justify-between">
              <span>Unit: <strong className="text-slate-200">{vehicleIdInput || 'AERO-CARGO-774'}</strong></span>
              <span className="text-cyan-300">{totalRouteDistanceKm.toLocaleString()} KM</span>
            </div>
          </div>

          {/* Touchdown Alert Banner */}
          {(flightPhase === 'TOUCHDOWN' || flightPhase === 'PARCEL_UNLOADED' || hasLandedEventFired) && (
            <div className="absolute top-3 right-3 bg-emerald-950/95 backdrop-blur-md border-2 border-emerald-400 rounded-xl p-3 text-xs z-[1000] pointer-events-auto shadow-2xl max-w-[340px] animate-fadeIn">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-emerald-500 text-white">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="font-mono font-extrabold text-sm text-emerald-300">
                      TOUCHDOWN CONFIRMED
                    </h4>
                    <span className="text-[10.5px] text-emerald-100 font-mono">
                      Safe Landing & Parcel Unloaded
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLandingModal(true)}
                  className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-[10px] rounded transition-colors cursor-pointer"
                >
                  View Details
                </button>
              </div>
              <p className="text-[11px] text-slate-300 mt-2 leading-tight">
                Plane <strong className="text-white">{vehicleIdInput || 'AERO-CARGO-774'}</strong> has safely touched down at {shipment.recipient.city}. Parcel <strong className="text-white font-mono">{shipment.trackingNumber}</strong> unloaded and verified intact!
              </p>
            </div>
          )}
        </div>

        {/* 4. INTERMODAL WAYPOINT CORRIDOR STRIP (Bottom stops) */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 text-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-blue-500/20 text-blue-400">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                {shipment.shipper.city} ➔ {shipment.recipient.city} Waypoint Corridor
              </h4>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                {totalWaypoints} STOPS
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-300">Cleared</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-300 font-semibold">Active Leg</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-600" />
                <span className="text-slate-400">Upcoming</span>
              </span>
            </div>
          </div>

          {/* Sequential Waypoint Corridor Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {shipment.checkpoints.map((cp, idx) => {
              const isOrigin = idx === 0;
              const isDestination = idx === totalWaypoints - 1;
              const isCompleted = idx <= shipment.currentCheckpointIndex;
              const isCurrent = idx === shipment.currentCheckpointIndex;
              const isNext = idx === shipment.currentCheckpointIndex + 1;
              const isSelected = selectedWaypointIdx === idx;
              const hubMeta = getHubClassification(cp, idx, totalWaypoints);

              return (
                <div
                  key={cp.id || idx}
                  onClick={() => handleFocusWaypoint(idx)}
                  className={`relative p-2.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-950/60 border-cyan-400 ring-2 ring-cyan-500/30'
                      : isCurrent
                      ? 'bg-slate-800/90 border-cyan-500/60 shadow-xs'
                      : isCompleted
                      ? 'bg-slate-900/90 border-emerald-900/60 hover:border-emerald-600'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span 
                      className="text-[9.5px] font-mono font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 text-white"
                      style={{ backgroundColor: hubMeta.badgeBg }}
                    >
                      <span>{hubMeta.iconSymbol}</span>
                      <span>{isOrigin ? 'ORIGIN' : isDestination ? 'DEST' : `STOP ${idx + 1}`}</span>
                    </span>

                    {isCompleted ? (
                      <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>CLEARED</span>
                      </span>
                    ) : isNext ? (
                      <span className="text-[10px] text-cyan-300 font-mono font-bold flex items-center gap-0.5 animate-pulse">
                        <ArrowRight className="w-3 h-3" />
                        <span>NEXT</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">
                        PLANNED
                      </span>
                    )}
                  </div>

                  <div className="font-bold text-xs text-white truncate" title={cp.location}>
                    {cp.city || cp.location.split(',')[0]}
                  </div>
                  <div className="text-[10.5px] text-slate-300 truncate" title={cp.facilityName}>
                    {cp.facilityName}
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="truncate max-w-[120px]" title={hubMeta.label}>
                      {hubMeta.label}
                    </span>
                    <span className="text-cyan-400 font-bold hover:underline shrink-0">
                      Focus ➔
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. CELEBRATORY LANDING & PARCEL UNLOADED VERIFICATION MODAL */}
      {showLandingModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl relative animate-scaleUp printable-document print-page">
            <button
              onClick={() => setShowLandingModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors no-print cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                <Plane className="w-6 h-6 rotate-45" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider block">
                  FLIGHT TOUCHDOWN &amp; CARGO HANDOVER REPORT
                </span>
                <h3 className="text-lg font-black text-white font-mono">
                  {vehicleIdInput || 'AERO-CARGO-774'} SAFELY LANDED
                </h3>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between pb-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Aircraft Registered #:</span>
                  <strong className="text-cyan-300 font-bold">{vehicleIdInput || 'AERO-CARGO-774'}</strong>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Shipping Tracking #:</span>
                  <strong className="text-white font-bold">{shipment.trackingNumber}</strong>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Origin / Consignor:</span>
                  <span className="text-slate-200">{shipment.shipper.city}, {shipment.shipper.country}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Landing Facility:</span>
                  <span className="text-emerald-400 font-bold text-right">{destCp?.facilityName || `${shipment.recipient.city} International Airport Runway 07R`}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Touchdown Altitude / Velocity:</span>
                  <span className="text-slate-200">0 FT · 0 km/h (Taxiway Vacated)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Parcel Status:</span>
                  <span className="text-emerald-300 font-bold">UNLOADED &amp; TRANSFERRED TO CARGO VAULT</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-[11px] text-emerald-200">
                  <span className="font-bold block">Goods Integrity Validated:</span>
                  <span>Parcel unloaded at destination airport and verified intact. Cold-chain and security seal maintained without deviation.</span>
                </div>
              </div>

              {/* Handover Signatures */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 grid grid-cols-2 gap-4 text-[11px]">
                <div className="border-r border-slate-800 pr-2">
                  <span className="text-slate-500 block text-[10px]">Captain / Flight Crew:</span>
                  <span className="text-slate-300 font-bold">Capt. Erik Vance</span>
                  <span className="text-[9px] text-emerald-400 block pt-0.5">Handover Released</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Airport Ramp Superintendent:</span>
                  <span className="text-slate-300 font-bold">K. Ochieng (Vault #4)</span>
                  <span className="text-[9px] text-emerald-400 block pt-0.5">Received into Custody</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5 justify-end no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Print Official Airport Cargo Handover Slip"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Handover Slip</span>
              </button>

              <button
                type="button"
                onClick={handleReplayFlight}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Replay Flight Approach</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLandingModal(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Acknowledge &amp; Monitor Ground Route
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
