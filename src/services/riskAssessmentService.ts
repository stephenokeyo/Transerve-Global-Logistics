import { Shipment } from '../types/shipping';
import { WeatherData } from './weatherService';

export type DelayRiskLevel = 'low' | 'moderate' | 'elevated' | 'critical';

export interface RegionalTransitPattern {
  regionCode: string;
  regionName: string;
  congestionIndex: number; // 0 - 100
  historicalDelayFrequencyPct: number; // e.g. 8%
  bottleneckType: 'air_corridor' | 'freight_interchange' | 'customs_chokepoint' | 'final_mile_urban' | 'cross_dock';
  typicalDwellMinutes: number;
  currentAnomalyNotice?: string;
}

export interface RiskFactor {
  id: string;
  category: 'transit_corridor' | 'weather' | 'hub_dwell' | 'sla_buffer' | 'cargo_sensitivity';
  title: string;
  impactScore: number; // 0 - 100
  riskContribution: 'positive' | 'neutral' | 'negative' | 'critical';
  details: string;
}

export interface RiskAssessmentData {
  onTimeProbabilityPct: number; // 0 - 100
  overallRiskLevel: DelayRiskLevel;
  predictedDelayMinutes: number; // 0 if on-time, or positive minutes delay
  projectedDeliveryWindow: string;
  confidenceScorePct: number;
  regionalPatterns: RegionalTransitPattern[];
  riskFactors: RiskFactor[];
  recommendedMitigation?: string;
  corridorStatusSummary: string;
}

/**
 * Knowledge base of regional freight corridors, interchanges, and known transit patterns
 */
const REGIONAL_CORRIDORS: Record<string, RegionalTransitPattern> = {
  ORD: {
    regionCode: 'ORD-CHI',
    regionName: 'Chicago Upper Midwest Intermodal Core',
    congestionIndex: 42,
    historicalDelayFrequencyPct: 6.8,
    bottleneckType: 'air_corridor',
    typicalDwellMinutes: 45,
    currentAnomalyNotice: 'Normal hub clearance flow; runway cargo sectors operating at 94% throughput.',
  },
  DFW: {
    regionCode: 'DFW-TX',
    regionName: 'North Texas Freight Interchange & I-35 Logistics Spine',
    congestionIndex: 58,
    historicalDelayFrequencyPct: 12.4,
    bottleneckType: 'freight_interchange',
    typicalDwellMinutes: 60,
    currentAnomalyNotice: 'High-volume cross-dock sorting active during peak afternoon transit window.',
  },
  JFK: {
    regionCode: 'JFK-NYC',
    regionName: 'Northeast Eastern Seaboard Gateway',
    congestionIndex: 72,
    historicalDelayFrequencyPct: 18.2,
    bottleneckType: 'final_mile_urban',
    typicalDwellMinutes: 90,
    currentAnomalyNotice: 'Metro urban density delay vectors active across borough arteries.',
  },
  FRA: {
    regionCode: 'FRA-EU',
    regionName: 'Frankfurt Central European Air Cargo & Customs Nexus',
    congestionIndex: 35,
    historicalDelayFrequencyPct: 4.5,
    bottleneckType: 'customs_chokepoint',
    typicalDwellMinutes: 50,
    currentAnomalyNotice: 'Priority EU medical fast-track customs greenline active.',
  },
  NRT: {
    regionCode: 'NRT-JP',
    regionName: 'Tokyo Narita Asia-Pacific Air Gateway',
    congestionIndex: 28,
    historicalDelayFrequencyPct: 3.2,
    bottleneckType: 'air_corridor',
    typicalDwellMinutes: 40,
    currentAnomalyNotice: 'Automated high-bay sortation operating at nominal capacity.',
  },
  ATL: {
    regionCode: 'ATL-SE',
    regionName: 'Southeast Freight Crossroads & SuperHub',
    congestionIndex: 48,
    historicalDelayFrequencyPct: 8.9,
    bottleneckType: 'cross_dock',
    typicalDwellMinutes: 55,
    currentAnomalyNotice: 'Standard intermodal container transfer schedules on time.',
  },
  LAX: {
    regionCode: 'LAX-CA',
    regionName: 'Pacific Coast Corridor & Port Intermodal Gateway',
    congestionIndex: 68,
    historicalDelayFrequencyPct: 16.5,
    bottleneckType: 'freight_interchange',
    typicalDwellMinutes: 75,
    currentAnomalyNotice: 'Heavy regional drayage traffic on interstate connector freeways.',
  },
  DEFAULT: {
    regionCode: 'CORR-GEN',
    regionName: 'Standard Interstate Freight & Sortation Corridor',
    congestionIndex: 38,
    historicalDelayFrequencyPct: 7.0,
    bottleneckType: 'cross_dock',
    typicalDwellMinutes: 45,
    currentAnomalyNotice: 'Regional telemetry reports nominal line-haul speeds and corridor health.',
  },
};

/**
 * Matches shipment route stops to regional transit pattern profiles
 */
function identifyRegionalPatterns(shipment: Shipment): RegionalTransitPattern[] {
  const matchedPatterns = new Map<string, RegionalTransitPattern>();

  // Scan origin, checkpoints, and destination
  const allLocations = [
    `${shipment.shipper.city} ${shipment.shipper.state}`,
    ...shipment.checkpoints.map(c => `${c.location} ${c.facilityName} ${c.city}`),
    `${shipment.recipient.city} ${shipment.recipient.state}`,
  ].join(' ').toUpperCase();

  if (allLocations.includes('CHICAGO') || allLocations.includes('ORD') || allLocations.includes('IL')) {
    matchedPatterns.set('ORD', REGIONAL_CORRIDORS.ORD);
  }
  if (allLocations.includes('DALLAS') || allLocations.includes('DFW') || allLocations.includes('TX')) {
    matchedPatterns.set('DFW', REGIONAL_CORRIDORS.DFW);
  }
  if (allLocations.includes('NEW YORK') || allLocations.includes('JFK') || allLocations.includes('NY') || allLocations.includes('NEWARK')) {
    matchedPatterns.set('JFK', REGIONAL_CORRIDORS.JFK);
  }
  if (allLocations.includes('FRANKFURT') || allLocations.includes('FRA') || allLocations.includes('GERMANY')) {
    matchedPatterns.set('FRA', REGIONAL_CORRIDORS.FRA);
  }
  if (allLocations.includes('TOKYO') || allLocations.includes('NRT') || allLocations.includes('JAPAN')) {
    matchedPatterns.set('NRT', REGIONAL_CORRIDORS.NRT);
  }
  if (allLocations.includes('LOS ANGELES') || allLocations.includes('LAX') || allLocations.includes('CALIFORNIA')) {
    matchedPatterns.set('LAX', REGIONAL_CORRIDORS.LAX);
  }
  if (allLocations.includes('ATLANTA') || allLocations.includes('ATL') || allLocations.includes('GEORGIA')) {
    matchedPatterns.set('ATL', REGIONAL_CORRIDORS.ATL);
  }

  if (matchedPatterns.size === 0) {
    matchedPatterns.set('DEFAULT', REGIONAL_CORRIDORS.DEFAULT);
  }

  return Array.from(matchedPatterns.values());
}

/**
 * Analyzes regional transit patterns, weather atmospheric data, service level constraints,
 * and checkpoint progress to predict on-time delivery probability and shipping delay risk.
 */
export function analyzeShippingRisk(shipment: Shipment, weatherData?: WeatherData | null): RiskAssessmentData {
  // If already delivered
  if (shipment.status === 'delivered') {
    return {
      onTimeProbabilityPct: 100,
      overallRiskLevel: 'low',
      predictedDelayMinutes: 0,
      projectedDeliveryWindow: 'Delivered On Schedule',
      confidenceScorePct: 99,
      regionalPatterns: identifyRegionalPatterns(shipment),
      riskFactors: [
        {
          id: 'rf-complete',
          category: 'sla_buffer',
          title: 'Delivery Confirmed',
          impactScore: 100,
          riskContribution: 'positive',
          details: 'Package successfully delivered and signed for by consignee.',
        },
      ],
      recommendedMitigation: undefined,
      corridorStatusSummary: 'All route waypoints and destination delivery milestones successfully completed.',
    };
  }

  const regionalPatterns = identifyRegionalPatterns(shipment);
  const riskFactors: RiskFactor[] = [];

  // Base on-time probability starts at carrier network baseline (98.5%)
  let baseProbability = 98.5;
  let predictedDelayMinutes = 0;

  // 1. REGIONAL TRANSIT PATTERN FACTOR
  const avgCongestion = regionalPatterns.reduce((acc, p) => acc + p.congestionIndex, 0) / regionalPatterns.length;
  const avgDelayFreq = regionalPatterns.reduce((acc, p) => acc + p.historicalDelayFrequencyPct, 0) / regionalPatterns.length;

  if (avgCongestion > 65) {
    baseProbability -= 14;
    predictedDelayMinutes += 45;
    riskFactors.push({
      id: 'rf-congestion',
      category: 'transit_corridor',
      title: 'High Regional Corridor Congestion',
      impactScore: Math.round(avgCongestion),
      riskContribution: 'negative',
      details: `Active bottlenecks detected across ${regionalPatterns.map(p => p.regionName).join(', ')}. Congestion index ${Math.round(avgCongestion)}/100.`,
    });
  } else if (avgCongestion > 45) {
    baseProbability -= 6;
    predictedDelayMinutes += 15;
    riskFactors.push({
      id: 'rf-congestion-mod',
      category: 'transit_corridor',
      title: 'Moderate Regional Traffic Flow',
      impactScore: Math.round(avgCongestion),
      riskContribution: 'neutral',
      details: `Standard peak-hour intermodal sorting load across regional transit corridors (${Math.round(avgDelayFreq)}% historical variance).`,
    });
  } else {
    riskFactors.push({
      id: 'rf-corridor-optimal',
      category: 'transit_corridor',
      title: 'Uncongested Regional Freight Lanes',
      impactScore: Math.round(avgCongestion),
      riskContribution: 'positive',
      details: 'Line-haul freight routes and airport freight corridors running at greenline throughput.',
    });
  }

  // 2. WEATHER & ATMOSPHERIC IMPACT FACTOR
  if (weatherData) {
    if (weatherData.transitImpact === 'severe') {
      baseProbability -= 22;
      predictedDelayMinutes += 60;
      riskFactors.push({
        id: 'rf-weather-severe',
        category: 'weather',
        title: `Adverse Weather (${weatherData.conditionText})`,
        impactScore: 85,
        riskContribution: 'critical',
        details: `${weatherData.transitImpactReason}. Wind: ${weatherData.windSpeedKph} km/h, Precip Probability: ${weatherData.precipitationProbability}%.`,
      });
    } else if (weatherData.transitImpact === 'moderate') {
      baseProbability -= 9;
      predictedDelayMinutes += 25;
      riskFactors.push({
        id: 'rf-weather-mod',
        category: 'weather',
        title: `Atmospheric Friction (${weatherData.conditionText})`,
        impactScore: 50,
        riskContribution: 'negative',
        details: `${weatherData.transitImpactReason}. Reduced road traction / air sector hold.`,
      });
    } else {
      riskFactors.push({
        id: 'rf-weather-opt',
        category: 'weather',
        title: `Optimal Transit Weather (${weatherData.conditionText})`,
        impactScore: 15,
        riskContribution: 'positive',
        details: 'Visual meteorological conditions clear; zero weather speed modulation required.',
      });
    }
  }

  // 3. SERVICE LEVEL & TIME BUFFER (SLA)
  const now = new Date('2026-11-05T14:00:00Z').getTime();
  const estDeliveryTime = new Date(shipment.estimatedDelivery).getTime();
  const diffMinutes = Math.round((estDeliveryTime - now) / (60 * 1000));

  if (shipment.sla?.status === 'at_risk' || diffMinutes < 180) {
    baseProbability -= 18;
    predictedDelayMinutes += 35;
    riskFactors.push({
      id: 'rf-sla-risk',
      category: 'sla_buffer',
      title: 'Tight Delivery Schedule Buffer',
      impactScore: 78,
      riskContribution: 'critical',
      details: shipment.sla?.riskReason || `Only ${Math.max(0, diffMinutes)} minutes remaining until contract deadline.`,
    });
  } else if (diffMinutes < 360) {
    baseProbability -= 5;
    riskFactors.push({
      id: 'rf-sla-mod',
      category: 'sla_buffer',
      title: 'Standard Delivery Time Buffer',
      impactScore: 40,
      riskContribution: 'neutral',
      details: `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m buffer health index nominal.`,
    });
  } else {
    riskFactors.push({
      id: 'rf-sla-healthy',
      category: 'sla_buffer',
      title: 'Generous SLA Time Buffer',
      impactScore: 10,
      riskContribution: 'positive',
      details: 'Comfortable delivery margin allows complete absorption of minor hub queuing.',
    });
  }

  // 4. CARGO SPECIFIC SENSITIVITY (Cold chain or hazardous)
  if (shipment.package?.isColdChain) {
    if (shipment.telemetry?.ambientTempC !== undefined && shipment.package.targetTempC !== undefined) {
      const diffTemp = shipment.telemetry.ambientTempC - shipment.package.targetTempC;
      if (diffTemp > 2.0) {
        baseProbability -= 15;
        riskFactors.push({
          id: 'rf-cryo-warning',
          category: 'cargo_sensitivity',
          title: 'Cold-Chain Cryogenic Thermal Excursion',
          impactScore: 88,
          riskContribution: 'critical',
          details: `Ambient cargo temp (${shipment.telemetry.ambientTempC}°C) exceeds target baseline (${shipment.package.targetTempC}°C).`,
        });
      } else {
        riskFactors.push({
          id: 'rf-cryo-stable',
          category: 'cargo_sensitivity',
          title: 'Active Cryogenic Cargo Integrity',
          impactScore: 12,
          riskContribution: 'positive',
          details: `Temperature stabilized at ${shipment.telemetry.ambientTempC}°C within validated margin.`,
        });
      }
    }
  }

  // 5. CURRENT SHIPMENT STATUS CHECK
  if (shipment.status === 'out_for_delivery') {
    // Final mile is close to completion
    baseProbability = Math.max(baseProbability, 82);
    riskFactors.push({
      id: 'rf-final-mile',
      category: 'hub_dwell',
      title: 'Final-Mile Dispatch Active',
      impactScore: 25,
      riskContribution: 'positive',
      details: 'Package loaded on final courier delivery hauler; local zoning underway.',
    });
  } else if (shipment.status === 'exception') {
    baseProbability = Math.min(baseProbability, 28);
    predictedDelayMinutes += 180;
    riskFactors.push({
      id: 'rf-exception',
      category: 'hub_dwell',
      title: 'Carrier Delivery Exception Hold',
      impactScore: 95,
      riskContribution: 'critical',
      details: 'Active operational hold flag requiring documentation or address clearance.',
    });
  }

  // Clamp probability between 5% and 99%
  const onTimeProbabilityPct = Math.min(99, Math.max(5, Math.round(baseProbability)));

  // Determine Overall Risk Level
  let overallRiskLevel: DelayRiskLevel = 'low';
  if (onTimeProbabilityPct < 50) {
    overallRiskLevel = 'critical';
  } else if (onTimeProbabilityPct < 75) {
    overallRiskLevel = 'elevated';
  } else if (onTimeProbabilityPct < 90) {
    overallRiskLevel = 'moderate';
  }

  // Recommended mitigation action
  let recommendedMitigation: string | undefined = undefined;
  if (overallRiskLevel === 'critical') {
    recommendedMitigation = 'Trigger Hot-Shot Courier Dispatch or Priority Ground Escort immediately to avert contractual SLA breach.';
  } else if (overallRiskLevel === 'elevated') {
    recommendedMitigation = 'Schedule priority cross-dock sortation bypass at the next interchange to recover 30-45 minutes.';
  } else if (overallRiskLevel === 'moderate') {
    recommendedMitigation = 'Monitor weather radar at destination depot and ensure early final-mile staging.';
  }

  // Projected delivery window calculation
  const estDate = new Date(shipment.estimatedDelivery);
  let projectedDeliveryWindow: string;
  if (predictedDelayMinutes > 0 && overallRiskLevel !== 'low') {
    const delayedDate = new Date(estDate.getTime() + predictedDelayMinutes * 60 * 1000);
    projectedDeliveryWindow = `${delayedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (+${predictedDelayMinutes}m projected delay)`;
  } else {
    projectedDeliveryWindow = `${shipment.rates.deliveryTimeWindow} (Guaranteed On-Time)`;
  }

  const corridorStatusSummary = `Analyzed ${regionalPatterns.length} regional logistics corridor(s). Average interchange congestion is ${Math.round(avgCongestion)}% with ${Math.round(avgDelayFreq)}% delay variance across historical telemetry dispatches.`;

  return {
    onTimeProbabilityPct,
    overallRiskLevel,
    predictedDelayMinutes: overallRiskLevel === 'low' ? 0 : predictedDelayMinutes,
    projectedDeliveryWindow,
    confidenceScorePct: 94,
    regionalPatterns,
    riskFactors,
    recommendedMitigation,
    corridorStatusSummary,
  };
}
