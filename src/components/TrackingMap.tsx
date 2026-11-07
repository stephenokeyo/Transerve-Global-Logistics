import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shipment, Checkpoint } from '../types/shipping';
import { useI18n } from '../i18n/I18nContext';
import { 
  Truck, Plane, Radio, ShieldCheck, Thermometer, 
  BatteryCharging, Play, Pause, ChevronRight, Maximize2, Layers,
  MapPin, Crosshair, Building2, Flag, CheckCircle2, Clock, ArrowRight,
  Anchor, Train, AlertCircle, Sparkles
} from 'lucide-react';

interface TrackingMapProps {
  shipment: Shipment;
  onCheckpointChange?: (nextIndex: number) => void;
}

// Hub category type definition
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

  if (text.includes('air') || text.includes('flight') || text.includes('gateway') || text.includes('ord') || text.includes('dfw') || text.includes('fra') || text.includes('nrt') || text.includes('lej')) {
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

export const TrackingMap: React.FC<TrackingMapProps> = ({ shipment, onCheckpointChange }) => {
  const { t } = useI18n();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const traveledPolylineRef = useRef<L.Polyline | null>(null);
  const activeLegPolylineRef = useRef<L.Polyline | null>(null);
  const markersMapRef = useRef<Map<number, L.Marker>>(new Map());

  const [isSimulating, setIsSimulating] = useState(true);
  const [autoFollow, setAutoFollow] = useState(false);
  const [simulatedProgress, setSimulatedProgress] = useState(0.45);
  const [telemetrySpeed, setTelemetrySpeed] = useState(shipment.telemetry?.speedKph || 68);
  const [telemetryTemp, setTelemetryTemp] = useState(shipment.telemetry?.ambientTempC ?? 21.5);
  const [mapStyle, setMapStyle] = useState<'dark' | 'voyager'>('dark');
  const [selectedWaypointIdx, setSelectedWaypointIdx] = useState<number | null>(null);

  const isAir = shipment.serviceLevel.includes('AIR') || shipment.telemetry?.vehicleType === 'cargo_aircraft';
  const isColdChain = shipment.package.isColdChain;

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

  // Real-time telematics simulation loop
  useEffect(() => {
    if (!isSimulating || shipment.status === 'delivered') return;

    const interval = setInterval(() => {
      setSimulatedProgress(prev => {
        const next = prev + 0.035;
        if (next >= 1.0) {
          if (onCheckpointChange && shipment.currentCheckpointIndex < shipment.checkpoints.length - 1) {
            onCheckpointChange(shipment.currentCheckpointIndex + 1);
          }
          return 0.05;
        }
        return next;
      });

      // Fluctuate telemetry values
      setTelemetrySpeed(prev => {
        const delta = (Math.random() - 0.5) * 4;
        const target = isAir ? 840 : 68;
        return Math.max(20, Math.round(prev + delta));
      });

      if (isColdChain) {
        setTelemetryTemp(prev => {
          const delta = (Math.random() - 0.5) * 0.15;
          return Math.round((prev + delta) * 10) / 10;
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating, shipment.currentCheckpointIndex, shipment.status, isAir, isColdChain, onCheckpointChange]);

  // Focus a specific waypoint
  const handleFocusWaypoint = (idx: number) => {
    setSelectedWaypointIdx(idx);
    const cp = shipment.checkpoints[idx];
    if (!cp || !mapInstanceRef.current) return;

    mapInstanceRef.current.flyTo([cp.lat, cp.lng], 11, {
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

  // Center on Vehicle
  const handleCenterOnVehicle = () => {
    setSelectedWaypointIdx(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([currentVehicleLat, currentVehicleLng], 9, {
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
      mapInstanceRef.current.fitBounds(bounds, { padding: [45, 45] });
    }
  };

  // Initialize and manage Leaflet Map lifecycle
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up previous instance
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
      zoom: 6,
      zoomControl: true,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // CartoDB Tile Layer (Dark or Voyager)
    const tileUrl = mapStyle === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Layer group for all markers
    const markersLayer = L.layerGroup().addTo(map);

    // 1. PLOT MULTI-STOP ROUTE POLYLINES (Completed, Active Leg, Upcoming Legs)
    if (checkpointCoords.length >= 2) {
      // Background full planned corridor path (Dashed slate)
      L.polyline(checkpointCoords, {
        color: '#475569',
        weight: 3,
        dashArray: '6, 8',
        opacity: 0.7,
      }).addTo(map);

      // Traveled Segment Polyline (Solid Glowing Cyan / Emerald)
      const traveledCoords: [number, number][] = [
        ...checkpointCoords.slice(0, currIndex + 1),
        [currentVehicleLat, currentVehicleLng],
      ];

      const traveledLine = L.polyline(traveledCoords, {
        color: '#0284c7',
        weight: 4.5,
        opacity: 0.95,
      }).addTo(map);
      traveledPolylineRef.current = traveledLine;

      // Active Leg Polyline (Pulsing high-visibility connecting segment)
      const activeLegCoords: [number, number][] = [
        [currentVehicleLat, currentVehicleLng],
        toPt,
      ];
      const activeLeg = L.polyline(activeLegCoords, {
        color: '#38bdf8',
        weight: 3.5,
        dashArray: '4, 6',
        opacity: 0.9,
      }).addTo(map);
      activeLegPolylineRef.current = activeLeg;
    }

    // 2. PLOT EVERY WAYPOINT STOP ALONG THE MULTI-STOP LOGISTICS ROUTE
    shipment.checkpoints.forEach((cp, idx) => {
      const isOrigin = idx === 0;
      const isDestination = idx === totalWaypoints - 1;
      const isCompleted = idx <= shipment.currentCheckpointIndex;
      const isNextTarget = idx === shipment.currentCheckpointIndex + 1;
      const isCurrentActive = idx === shipment.currentCheckpointIndex;
      const hubMeta = getHubClassification(cp, idx, totalWaypoints);

      // Format custom HTML marker badge
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

      // Rich interactive popup with hub taxonomy and operational metadata
      const popupHtml = `
        <div style="font-family:'Plus Jakarta Sans',sans-serif; font-size:12px; color:#0f172a; padding:6px; min-width:230px;">
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
              <strong>${cp.lat.toFixed(4)}°N, ${Math.abs(cp.lng).toFixed(4)}°W</strong>
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

          <div style="display:flex; align-items:center; justify-content:space-between; font-size:10px; color:#64748b;">
            <span>${isCompleted ? '✓ Completed Waypoint' : isNextTarget ? '➔ Next En Route' : 'Planned Milestone'}</span>
            <span style="font-family:monospace; color:#0284c7; font-weight:bold;">Leg ${idx === 0 ? 'Start' : `${idx}/${totalWaypoints - 1}`}</span>
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

    // 3. LIVE MOVING REAL-TIME VEHICLE RADAR BEACON
    const vehicleIconHtml = `
      <div style="position:relative; width:46px; height:46px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
        <div style="position:absolute; inset:0; border-radius:50%; background-color:rgba(56,189,248,0.35); animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:relative; width:34px; height:34px; border-radius:50%; background-color:#0284c7; border:2.5px solid #ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 0 16px rgba(56,189,248,0.95);">
          <span style="color:#ffffff; font-size:16px; font-weight:bold;">${isAir ? '✈' : '⛟'}</span>
        </div>
      </div>
    `;

    const vehicleIcon = L.divIcon({
      className: 'realtime-vehicle-marker',
      html: vehicleIconHtml,
      iconSize: [46, 46],
      iconAnchor: [23, 23],
    });

    const vehicleMarker = L.marker([currentVehicleLat, currentVehicleLng], {
      icon: vehicleIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    vehicleMarker.bindPopup(`
      <div style="font-family:'Plus Jakarta Sans',sans-serif; font-size:12px; color:#0f172a; padding:6px; min-width:220px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <span style="font-weight:800; font-size:11px; color:#0284c7; font-family:monospace;">${shipment.telemetry?.vehicleId || 'TR-EXPRESS'}</span>
          <span style="font-size:9px; background:#e0f2fe; color:#0369a1; padding:1px 5px; border-radius:3px; font-weight:bold;">LIVE GPS FIX</span>
        </div>
        <div style="font-weight:700; font-size:13px; color:#0f172a; margin-bottom:4px;">Current Real-Time Position</div>
        <div style="background:#0f172a; color:#38bdf8; padding:5px 8px; border-radius:4px; font-family:monospace; font-size:11px; margin-bottom:4px;">
          ${currentVehicleLat.toFixed(4)}° N, ${Math.abs(currentVehicleLng).toFixed(4)}° W
        </div>
        <div style="display:flex; justify-content:space-between; color:#475569; font-size:11px; margin-bottom:2px;">
          <span>Velocity:</span> <strong style="color:#0f172a;">${telemetrySpeed} km/h</strong>
        </div>
        <div style="display:flex; justify-content:space-between; color:#475569; font-size:11px; margin-bottom:2px;">
          <span>Heading:</span> <strong style="color:#0f172a;">${shipment.telemetry?.heading || 'NE 45°'}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; color:#475569; font-size:11px;">
          <span>Active Leg:</span> <strong style="color:#0284c7;">Stop ${currIndex + 1} ➔ Stop ${currIndex + 2}</strong>
        </div>
        ${isColdChain ? `
          <div style="display:flex; justify-content:space-between; color:#0891b2; font-size:11px; margin-top:3px; padding-top:3px; border-top:1px dashed #cbd5e1;">
            <span>Cryo Cargo Temp:</span> <strong>${telemetryTemp}°C</strong>
          </div>
        ` : ''}
      </div>
    `);

    vehicleMarkerRef.current = vehicleMarker;

    // Fit map bounds with padding
    if (checkpointCoords.length > 0) {
      const bounds = L.latLngBounds(checkpointCoords);
      map.fitBounds(bounds, { padding: [45, 45] });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapStyle, shipment.trackingNumber]);

  // Update vehicle position and polyline smoothly
  useEffect(() => {
    if (!vehicleMarkerRef.current || !mapInstanceRef.current) return;

    vehicleMarkerRef.current.setLatLng([currentVehicleLat, currentVehicleLng]);

    if (traveledPolylineRef.current) {
      const traveledCoords: [number, number][] = [
        ...checkpointCoords.slice(0, currIndex + 1),
        [currentVehicleLat, currentVehicleLng],
      ];
      traveledPolylineRef.current.setLatLngs(traveledCoords);
    }

    if (activeLegPolylineRef.current) {
      activeLegPolylineRef.current.setLatLngs([
        [currentVehicleLat, currentVehicleLng],
        toPt,
      ]);
    }

    if (autoFollow && mapInstanceRef.current) {
      mapInstanceRef.current.panTo([currentVehicleLat, currentVehicleLng], { animate: true });
    }
  }, [currentVehicleLat, currentVehicleLng, currIndex, toPt, autoFollow]);

  return (
    <div className="space-y-3">
      {/* 3-Point Primary Telematics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Origin Dispatch Card */}
        <div 
          onClick={() => handleFocusWaypoint(0)}
          className={`bg-slate-900 border ${selectedWaypointIdx === 0 ? 'border-emerald-400 ring-2 ring-emerald-500/30' : 'border-slate-800 hover:border-emerald-500/50'} rounded-xl p-3 text-slate-100 shadow-xs cursor-pointer transition-all group`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {t('map.originTitle')}
            </span>
            <Building2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="font-bold text-sm text-white truncate">
            {shipment.shipper.city}, {shipment.shipper.state}
          </div>
          <div className="text-[11px] font-mono text-emerald-300 font-semibold mt-0.5">
            {originCp ? `${originCp.lat.toFixed(4)}° N, ${Math.abs(originCp.lng).toFixed(4)}° W` : 'N/A'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block truncate">
            {originCp?.facilityName || shipment.shipper.name}
          </span>
        </div>

        {/* 2. Real-Time Coordinates Card (Active GPS Beacon) */}
        <div 
          onClick={handleCenterOnVehicle}
          className={`bg-blue-950/40 border ${selectedWaypointIdx === null ? 'border-cyan-400/80 ring-2 ring-cyan-500/20' : 'border-blue-500/40 hover:border-blue-400'} rounded-xl p-3 text-slate-100 shadow-xs cursor-pointer transition-all group relative overflow-hidden`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 font-mono flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              {t('map.liveCoordsTitle')}
            </span>
            <Crosshair className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="font-extrabold text-sm text-cyan-100 flex items-center justify-between">
            <span className="font-mono">{currentVehicleLat.toFixed(4)}° N, ${Math.abs(currentVehicleLng).toFixed(4)}° W</span>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
              {telemetrySpeed} km/h
            </span>
          </div>
          <div className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-2">
            <span>Unit: <strong className="text-white font-mono">{shipment.telemetry?.vehicleId || 'TR-4092'}</strong></span>
            <span className="text-slate-500">·</span>
            <span className="text-cyan-400 font-mono">{shipment.status.replace('_', ' ').toUpperCase()}</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Click to center and lock onto live vehicle
          </span>
        </div>

        {/* 3. Final Consignee Destination Card */}
        <div 
          onClick={() => handleFocusWaypoint(totalWaypoints - 1)}
          className={`bg-slate-900 border ${selectedWaypointIdx === totalWaypoints - 1 ? 'border-blue-400 ring-2 ring-blue-500/30' : 'border-slate-800 hover:border-blue-500/50'} rounded-xl p-3 text-slate-100 shadow-xs cursor-pointer transition-all group`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {t('map.destTitle')}
            </span>
            <Flag className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="font-bold text-sm text-white truncate">
            {shipment.recipient.city}, {shipment.recipient.state}
          </div>
          <div className="text-[11px] font-mono text-blue-300 font-semibold mt-0.5">
            {destCp ? `${destCp.lat.toFixed(4)}° N, ${Math.abs(destCp.lng).toFixed(4)}° W` : 'N/A'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block truncate">
            {destCp?.facilityName || shipment.recipient.name}
          </span>
        </div>
      </div>

      {/* Main Interactive Leaflet Map Shell */}
      <div className="relative w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 text-slate-100 shadow-xl">
        {/* Top Controls & Mode Bar */}
        <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 font-mono text-emerald-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold">MULTI-WAYPOINT HUB RADAR</span>
            </div>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
              TOTAL STOPS: <strong className="text-cyan-300">{totalWaypoints} HUBS</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Waypoint Dropdown Selector */}
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
              <option value="">{t('map.allWaypoints')} (Live Unit)</option>
              {shipment.checkpoints.map((cp, idx) => (
                <option key={cp.id || idx} value={idx}>
                  Stop {idx + 1}: {cp.city || cp.location.split(',')[0]} ({getHubClassification(cp, idx, totalWaypoints).label.split(' ')[0]})
                </option>
              ))}
            </select>

            {/* Center Live Unit */}
            <button
              onClick={handleCenterOnVehicle}
              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 rounded text-xs transition-colors shadow-2xs"
              title={t('map.focusVehicle')}
            >
              <Crosshair className="w-3 h-3 text-cyan-400" />
              <span>{t('map.focusVehicle')}</span>
            </button>

            {/* Fit Route View */}
            <button
              onClick={handleResetView}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
              title={t('map.fitRoute')}
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden sm:inline">{t('map.fitRoute')}</span>
            </button>

            {/* Map Style Toggle */}
            <button
              onClick={() => setMapStyle(mapStyle === 'dark' ? 'voyager' : 'dark')}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
              title="Toggle Map Style"
            >
              <Layers className="w-3 h-3" />
              <span className="capitalize">{mapStyle}</span>
            </button>

            {/* Simulation Pause / Resume */}
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                isSimulating ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isSimulating ? 'Simulating' : 'Paused'}</span>
            </button>

            {/* Manual Advance Checkpoint Hub */}
            {onCheckpointChange && shipment.currentCheckpointIndex < shipment.checkpoints.length - 1 && (
              <button
                onClick={() => onCheckpointChange(shipment.currentCheckpointIndex + 1)}
                className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors shadow-xs"
              >
                <span>Advance Hub</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Leaflet Canvas Container */}
        <div className="relative w-full h-[370px] sm:h-[440px] bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Floating Telematics Telemetry HUD Overlay (Bottom) */}
          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 z-[1000] pointer-events-auto shadow-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-slate-800 text-blue-400">
                {isAir ? <Plane className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block font-mono">GROUND VELOCITY</span>
                <span className="font-mono text-sm font-bold text-slate-100 tabular-nums">
                  {shipment.status === 'delivered' ? '0' : telemetrySpeed} KM/H
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded ${isColdChain ? 'bg-cyan-950 text-cyan-400' : 'bg-slate-800 text-slate-300'}`}>
                <Thermometer className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block font-mono">
                  {isColdChain ? 'CRYO SENSOR' : 'CARGO COMPARTMENT'}
                </span>
                <span className={`font-mono text-sm font-bold tabular-nums ${isColdChain ? 'text-cyan-300' : 'text-slate-100'}`}>
                  {telemetryTemp > 0 ? `+${telemetryTemp}` : telemetryTemp}°C
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-slate-800 text-emerald-400">
                <BatteryCharging className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block font-mono">TELEMETRY BATTERY</span>
                <span className="font-mono text-sm font-bold text-slate-100 tabular-nums">
                  {shipment.telemetry?.batteryOrFuelPct || 84}% NOMINAL
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-slate-800 text-amber-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block font-mono">WGS-84 TELEMETRY</span>
                <span className="font-mono text-sm font-bold text-emerald-400">ENCRYPTED GPS FIX</span>
              </div>
            </div>
          </div>
        </div>

        {/* INTERMODAL WAYPOINT STOPS CORRIDOR (Interactive Multi-Stop Corridor Strip) */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 text-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-blue-500/20 text-blue-400">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                {t('map.waypointCorridor')}
              </h4>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                {t('map.totalStops', { count: totalWaypoints })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-300">Completed</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-300 font-semibold">Active Transit Leg</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-600" />
                <span className="text-slate-400">Upcoming Hub</span>
              </span>
            </div>
          </div>

          {/* Sequential Waypoint Corridor Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
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
                  {/* Top Bar: Stop number and Hub classification */}
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

                  {/* Hub Location & Facility Name */}
                  <div className="font-bold text-xs text-white truncate" title={cp.location}>
                    {cp.city || cp.location.split(',')[0]}
                  </div>
                  <div className="text-[10.5px] text-slate-300 truncate" title={cp.facilityName}>
                    {cp.facilityName}
                  </div>

                  {/* Operational Category Pill */}
                  <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="truncate max-w-[120px]" title={hubMeta.label}>
                      {hubMeta.label}
                    </span>
                    <span className="text-cyan-400 font-bold hover:underline shrink-0">
                      Focus ➔
                    </span>
                  </div>

                  {/* Live Radar Ping indicator if vehicle is en route directly into this hub */}
                  {isNext && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
