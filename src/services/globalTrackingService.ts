import { Shipment, Checkpoint, VehicleTelemetry, Address, PackageDetails, RateOption } from '../types/shipping';
import { addShipment } from '../data/mockShipments';

export interface GlobalLocationRecord {
  city: string;
  country: string;
  region: string;
  iata: string;
  lat: number;
  lng: number;
  facility: string;
  hubType: 'air_cargo' | 'customs' | 'cross_dock' | 'final_depot' | 'intermodal_rail';
}

/**
 * Comprehensive database of global logistics gateways, international airports,
 * freight hubs, and world trade capitals across Africa, Europe, Americas, Asia, Middle East, and Oceania.
 */
export const GLOBAL_WORLD_LOCATIONS: Record<string, GlobalLocationRecord> = {
  // AFRICA
  'nairobi': {
    city: 'Nairobi',
    country: 'Kenya',
    region: 'East Africa',
    iata: 'NBO',
    lat: -1.3192,
    lng: 36.9275,
    facility: 'Jomo Kenyatta Air Cargo Terminal (NBO)',
    hubType: 'air_cargo',
  },
  'mombasa': {
    city: 'Mombasa',
    country: 'Kenya',
    region: 'East Africa',
    iata: 'MBA',
    lat: -4.0435,
    lng: 39.6682,
    facility: 'Port of Mombasa Maritime Logistics Gateway',
    hubType: 'customs',
  },
  'johannesburg': {
    city: 'Johannesburg',
    country: 'South Africa',
    region: 'Southern Africa',
    iata: 'JNB',
    lat: -26.1367,
    lng: 28.2411,
    facility: 'O.R. Tambo International Cargo Centre (JNB)',
    hubType: 'air_cargo',
  },
  'cape town': {
    city: 'Cape Town',
    country: 'South Africa',
    region: 'Southern Africa',
    iata: 'CPT',
    lat: -33.9715,
    lng: 18.6021,
    facility: 'Cape Town International Freight Terminal (CPT)',
    hubType: 'air_cargo',
  },
  'lagos': {
    city: 'Lagos',
    country: 'Nigeria',
    region: 'West Africa',
    iata: 'LOS',
    lat: 6.5774,
    lng: 3.3211,
    facility: 'Murtala Muhammed Cargo SuperHub (LOS)',
    hubType: 'air_cargo',
  },
  'cairo': {
    city: 'Cairo',
    country: 'Egypt',
    region: 'North Africa',
    iata: 'CAI',
    lat: 30.1219,
    lng: 31.4056,
    facility: 'Cairo International Airfreight Village (CAI)',
    hubType: 'air_cargo',
  },
  'casablanca': {
    city: 'Casablanca',
    country: 'Morocco',
    region: 'North Africa',
    iata: 'CMN',
    lat: 33.3675,
    lng: -7.5898,
    facility: 'Mohammed V CargoCity Gateway (CMN)',
    hubType: 'air_cargo',
  },
  'addis ababa': {
    city: 'Addis Ababa',
    country: 'Ethiopia',
    region: 'East Africa',
    iata: 'ADD',
    lat: 8.9779,
    lng: 38.7993,
    facility: 'Bole Cargo Hub Terminal (ADD)',
    hubType: 'air_cargo',
  },
  'accra': {
    city: 'Accra',
    country: 'Ghana',
    region: 'West Africa',
    iata: 'ACC',
    lat: 5.6052,
    lng: -0.1668,
    facility: 'Kotoka Air Cargo Logistics Facility (ACC)',
    hubType: 'air_cargo',
  },
  'kigali': {
    city: 'Kigali',
    country: 'Rwanda',
    region: 'East Africa',
    iata: 'KGL',
    lat: -1.9686,
    lng: 30.1395,
    facility: 'Kigali Special Economic Cargo Zone (KGL)',
    hubType: 'air_cargo',
  },

  // EUROPE
  'london': {
    city: 'London',
    country: 'United Kingdom',
    region: 'Western Europe',
    iata: 'LHR',
    lat: 51.4700,
    lng: -0.4543,
    facility: 'Heathrow Cargo World Terminal (LHR)',
    hubType: 'air_cargo',
  },
  'frankfurt': {
    city: 'Frankfurt',
    country: 'Germany',
    region: 'Western Europe',
    iata: 'FRA',
    lat: 50.0379,
    lng: 8.5622,
    facility: 'Frankfurt Airport CargoCity South (FRA)',
    hubType: 'air_cargo',
  },
  'paris': {
    city: 'Paris',
    country: 'France',
    region: 'Western Europe',
    iata: 'CDG',
    lat: 49.0097,
    lng: 2.5479,
    facility: 'Charles de Gaulle Freight Hub (CDG)',
    hubType: 'air_cargo',
  },
  'amsterdam': {
    city: 'Amsterdam',
    country: 'Netherlands',
    region: 'Western Europe',
    iata: 'AMS',
    lat: 52.3105,
    lng: 4.7683,
    facility: 'Schiphol European Smart Cargo Center (AMS)',
    hubType: 'air_cargo',
  },
  'rotterdam': {
    city: 'Rotterdam',
    country: 'Netherlands',
    region: 'Western Europe',
    iata: 'RTM',
    lat: 51.9244,
    lng: 4.4777,
    facility: 'Port of Rotterdam Intermodal Gateway',
    hubType: 'customs',
  },
  'madrid': {
    city: 'Madrid',
    country: 'Spain',
    region: 'Southern Europe',
    iata: 'MAD',
    lat: 40.4839,
    lng: -3.5680,
    facility: 'Madrid Barajas Freight Terminal (MAD)',
    hubType: 'air_cargo',
  },
  'rome': {
    city: 'Rome',
    country: 'Italy',
    region: 'Southern Europe',
    iata: 'FCO',
    lat: 41.8003,
    lng: 12.2389,
    facility: 'Fiumicino Cargo City (FCO)',
    hubType: 'air_cargo',
  },
  'milan': {
    city: 'Milan',
    country: 'Italy',
    region: 'Southern Europe',
    iata: 'MXP',
    lat: 45.6301,
    lng: 8.7255,
    facility: 'Malpensa Cargo City (MXP)',
    hubType: 'air_cargo',
  },
  'zurich': {
    city: 'Zurich',
    country: 'Switzerland',
    region: 'Central Europe',
    iata: 'ZRH',
    lat: 47.4582,
    lng: 8.5555,
    facility: 'Zurich World Cargo Logistics (ZRH)',
    hubType: 'air_cargo',
  },
  'dublin': {
    city: 'Dublin',
    country: 'Ireland',
    region: 'Western Europe',
    iata: 'DUB',
    lat: 53.4264,
    lng: -6.2499,
    facility: 'Dublin Airport Freight Interchange (DUB)',
    hubType: 'air_cargo',
  },
  'istanbul': {
    city: 'Istanbul',
    country: 'Turkey',
    region: 'Eurasia',
    iata: 'IST',
    lat: 41.2753,
    lng: 28.7519,
    facility: 'Istanbul Cargo SuperHub (IST)',
    hubType: 'air_cargo',
  },

  // ASIA & MIDDLE EAST
  'tokyo': {
    city: 'Tokyo',
    country: 'Japan',
    region: 'East Asia',
    iata: 'NRT',
    lat: 35.7720,
    lng: 140.3929,
    facility: 'Narita International Cargo Complex (NRT)',
    hubType: 'air_cargo',
  },
  'shanghai': {
    city: 'Shanghai',
    country: 'China',
    region: 'East Asia',
    iata: 'PVG',
    lat: 31.1443,
    lng: 121.8083,
    facility: 'Pudong International Air Cargo Gateway (PVG)',
    hubType: 'air_cargo',
  },
  'hong kong': {
    city: 'Hong Kong',
    country: 'Hong Kong SAR',
    region: 'East Asia',
    iata: 'HKG',
    lat: 22.3080,
    lng: 113.9185,
    facility: 'SuperTerminal 1 Air Cargo Hub (HKG)',
    hubType: 'air_cargo',
  },
  'beijing': {
    city: 'Beijing',
    country: 'China',
    region: 'East Asia',
    iata: 'PEK',
    lat: 40.0799,
    lng: 116.6031,
    facility: 'Beijing Capital Air Cargo Gateway (PEK)',
    hubType: 'air_cargo',
  },
  'shenzhen': {
    city: 'Shenzhen',
    country: 'China',
    region: 'East Asia',
    iata: 'SZX',
    lat: 22.6393,
    lng: 113.8107,
    facility: 'Bao\'an Logistics Freight Depot (SZX)',
    hubType: 'air_cargo',
  },
  'seoul': {
    city: 'Seoul',
    country: 'South Korea',
    region: 'East Asia',
    iata: 'ICN',
    lat: 37.4602,
    lng: 126.4407,
    facility: 'Incheon Global Cargo Terminal (ICN)',
    hubType: 'air_cargo',
  },
  'singapore': {
    city: 'Singapore',
    country: 'Singapore',
    region: 'Southeast Asia',
    iata: 'SIN',
    lat: 1.3644,
    lng: 103.9915,
    facility: 'Changi Airfreight Centre (SIN)',
    hubType: 'air_cargo',
  },
  'dubai': {
    city: 'Dubai',
    country: 'United Arab Emirates',
    region: 'Middle East',
    iata: 'DXB',
    lat: 25.2532,
    lng: 55.3657,
    facility: 'Dubai Cargo Mega Terminal (DXB)',
    hubType: 'air_cargo',
  },
  'doha': {
    city: 'Doha',
    country: 'Qatar',
    region: 'Middle East',
    iata: 'DOH',
    lat: 25.2731,
    lng: 51.6081,
    facility: 'Hamad Cargo Operations Facility (DOH)',
    hubType: 'air_cargo',
  },
  'riyadh': {
    city: 'Riyadh',
    country: 'Saudi Arabia',
    region: 'Middle East',
    iata: 'RUH',
    lat: 24.9576,
    lng: 46.6988,
    facility: 'King Khalid International Cargo Hub (RUH)',
    hubType: 'air_cargo',
  },
  'mumbai': {
    city: 'Mumbai',
    country: 'India',
    region: 'South Asia',
    iata: 'BOM',
    lat: 19.0896,
    lng: 72.8656,
    facility: 'Chhatrapati Shivaji Cargo Complex (BOM)',
    hubType: 'air_cargo',
  },
  'delhi': {
    city: 'Delhi',
    country: 'India',
    region: 'South Asia',
    iata: 'DEL',
    lat: 28.5562,
    lng: 77.1000,
    facility: 'Indira Gandhi World Cargo City (DEL)',
    hubType: 'air_cargo',
  },
  'bangkok': {
    city: 'Bangkok',
    country: 'Thailand',
    region: 'Southeast Asia',
    iata: 'BKK',
    lat: 13.6900,
    lng: 100.7501,
    facility: 'Suvarnabhumi Free Zone Cargo Terminal (BKK)',
    hubType: 'air_cargo',
  },

  // AMERICAS
  'new york': {
    city: 'New York',
    country: 'United States',
    region: 'North America',
    iata: 'JFK',
    lat: 40.6413,
    lng: -73.7781,
    facility: 'JFK Air Cargo Center (JFK)',
    hubType: 'air_cargo',
  },
  'chicago': {
    city: 'Chicago',
    country: 'United States',
    region: 'North America',
    iata: 'ORD',
    lat: 41.9742,
    lng: -87.9073,
    facility: 'O\'Hare Air Cargo Express Gateway (ORD)',
    hubType: 'air_cargo',
  },
  'los angeles': {
    city: 'Los Angeles',
    country: 'United States',
    region: 'North America',
    iata: 'LAX',
    lat: 33.9416,
    lng: -118.4085,
    facility: 'LAX Imperial Cargo Complex (LAX)',
    hubType: 'air_cargo',
  },
  'dallas': {
    city: 'Dallas',
    country: 'United States',
    region: 'North America',
    iata: 'DFW',
    lat: 32.8998,
    lng: -97.0403,
    facility: 'DFW Air Cargo Hub (DFW)',
    hubType: 'air_cargo',
  },
  'miami': {
    city: 'Miami',
    country: 'United States',
    region: 'North America',
    iata: 'MIA',
    lat: 25.7959,
    lng: -80.2870,
    facility: 'Miami International Cargo Gateway (MIA)',
    hubType: 'air_cargo',
  },
  'atlanta': {
    city: 'Atlanta',
    country: 'United States',
    region: 'North America',
    iata: 'ATL',
    lat: 33.6407,
    lng: -84.4277,
    facility: 'Hartsfield-Jackson Air Cargo City (ATL)',
    hubType: 'air_cargo',
  },
  'seattle': {
    city: 'Seattle',
    country: 'United States',
    region: 'North America',
    iata: 'SEA',
    lat: 47.4502,
    lng: -122.3088,
    facility: 'Sea-Tac North Cargo Complex (SEA)',
    hubType: 'air_cargo',
  },
  'san francisco': {
    city: 'San Francisco',
    country: 'United States',
    region: 'North America',
    iata: 'SFO',
    lat: 37.6213,
    lng: -122.3790,
    facility: 'SFO Air Freight Interchange (SFO)',
    hubType: 'air_cargo',
  },
  'toronto': {
    city: 'Toronto',
    country: 'Canada',
    region: 'North America',
    iata: 'YYZ',
    lat: 43.6777,
    lng: -79.6248,
    facility: 'Pearson CargoWest Hub (YYZ)',
    hubType: 'air_cargo',
  },
  'vancouver': {
    city: 'Vancouver',
    country: 'Canada',
    region: 'North America',
    iata: 'YVR',
    lat: 49.1967,
    lng: -123.1815,
    facility: 'Vancouver Pacific Gateway Hub (YVR)',
    hubType: 'air_cargo',
  },
  'mexico city': {
    city: 'Mexico City',
    country: 'Mexico',
    region: 'North America',
    iata: 'MEX',
    lat: 19.4361,
    lng: -99.0719,
    facility: 'Benito Juárez Cargo Terminal (MEX)',
    hubType: 'air_cargo',
  },
  'sao paulo': {
    city: 'São Paulo',
    country: 'Brazil',
    region: 'South America',
    iata: 'GRU',
    lat: -23.4356,
    lng: -46.4731,
    facility: 'Guarulhos Terminal de Cargas (GRU)',
    hubType: 'air_cargo',
  },
  'buenos aires': {
    city: 'Buenos Aires',
    country: 'Argentina',
    region: 'South America',
    iata: 'EZE',
    lat: -34.8222,
    lng: -58.5358,
    facility: 'Ezeiza Terminal de Cargas Argentina (EZE)',
    hubType: 'air_cargo',
  },
  'bogota': {
    city: 'Bogotá',
    country: 'Colombia',
    region: 'South America',
    iata: 'BOG',
    lat: 4.7016,
    lng: -74.1469,
    facility: 'El Dorado International Cargo Hub (BOG)',
    hubType: 'air_cargo',
  },
  'santiago': {
    city: 'Santiago',
    country: 'Chile',
    region: 'South America',
    iata: 'SCL',
    lat: -33.3930,
    lng: -70.7858,
    facility: 'Arturo Merino Benítez Cargo Gateway (SCL)',
    hubType: 'air_cargo',
  },

  // OCEANIA
  'sydney': {
    city: 'Sydney',
    country: 'Australia',
    region: 'Oceania',
    iata: 'SYD',
    lat: -33.9399,
    lng: 151.1753,
    facility: 'Kingsford Smith International Freight Precinct (SYD)',
    hubType: 'air_cargo',
  },
  'melbourne': {
    city: 'Melbourne',
    country: 'Australia',
    region: 'Oceania',
    iata: 'MEL',
    lat: -37.6690,
    lng: 144.8410,
    facility: 'Tullamarine Air Cargo SuperHub (MEL)',
    hubType: 'air_cargo',
  },
  'auckland': {
    city: 'Auckland',
    country: 'New Zealand',
    region: 'Oceania',
    iata: 'AKL',
    lat: -37.0082,
    lng: 174.7850,
    facility: 'Auckland International Cargo Terminal (AKL)',
    hubType: 'air_cargo',
  },
};

/**
 * Smart world resolver that matches city, country, or airport codes globally.
 * If not in explicit list, uses deterministic spherical geography hashing so ANY location
 * on earth returns valid, distinct coordinates!
 */
export function resolveWorldwideLocation(query: string): GlobalLocationRecord {
  const clean = query.trim().toLowerCase();

  // 1. Direct key match
  if (GLOBAL_WORLD_LOCATIONS[clean]) {
    return GLOBAL_WORLD_LOCATIONS[clean];
  }

  // 2. Partial substring search or IATA code search
  for (const [key, record] of Object.entries(GLOBAL_WORLD_LOCATIONS)) {
    if (
      clean.includes(key) ||
      key.includes(clean) ||
      clean.includes(record.country.toLowerCase()) ||
      clean.includes(record.iata.toLowerCase())
    ) {
      return record;
    }
  }

  // 3. Fallback country-level approximations
  const COUNTRY_APPROX: Record<string, { lat: number; lng: number; city: string; country: string }> = {
    'kenya': { lat: -1.2921, lng: 36.8219, city: 'Nairobi', country: 'Kenya' },
    'nigeria': { lat: 6.5244, lng: 3.3792, city: 'Lagos', country: 'Nigeria' },
    'south africa': { lat: -26.2041, lng: 28.0473, city: 'Johannesburg', country: 'South Africa' },
    'egypt': { lat: 30.0444, lng: 31.2357, city: 'Cairo', country: 'Egypt' },
    'germany': { lat: 50.1109, lng: 8.6821, city: 'Frankfurt', country: 'Germany' },
    'united kingdom': { lat: 51.5074, lng: -0.1278, city: 'London', country: 'United Kingdom' },
    'uk': { lat: 51.5074, lng: -0.1278, city: 'London', country: 'United Kingdom' },
    'france': { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'France' },
    'japan': { lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'Japan' },
    'china': { lat: 31.2304, lng: 121.4737, city: 'Shanghai', country: 'China' },
    'india': { lat: 19.0760, lng: 72.8777, city: 'Mumbai', country: 'India' },
    'uae': { lat: 25.2048, lng: 55.2708, city: 'Dubai', country: 'United Arab Emirates' },
    'united arab emirates': { lat: 25.2048, lng: 55.2708, city: 'Dubai', country: 'United Arab Emirates' },
    'australia': { lat: -33.8688, lng: 151.2093, city: 'Sydney', country: 'Australia' },
    'brazil': { lat: -23.5505, lng: -46.6333, city: 'São Paulo', country: 'Brazil' },
    'canada': { lat: 43.6532, lng: -79.3832, city: 'Toronto', country: 'Canada' },
    'united states': { lat: 40.7128, lng: -74.0060, city: 'New York', country: 'United States' },
    'usa': { lat: 40.7128, lng: -74.0060, city: 'New York', country: 'United States' },
    'spain': { lat: 40.4168, lng: -3.7038, city: 'Madrid', country: 'Spain' },
    'italy': { lat: 41.9028, lng: 12.4964, city: 'Rome', country: 'Italy' },
    'netherlands': { lat: 52.3676, lng: 4.9041, city: 'Amsterdam', country: 'Netherlands' },
  };

  for (const [cKey, cVal] of Object.entries(COUNTRY_APPROX)) {
    if (clean.includes(cKey)) {
      return {
        city: cVal.city,
        country: cVal.country,
        region: 'Global Network',
        iata: cVal.city.slice(0, 3).toUpperCase(),
        lat: cVal.lat,
        lng: cVal.lng,
        facility: `${cVal.city} International Cargo Gateway`,
        hubType: 'air_cargo',
      };
    }
  }

  // 4. Deterministic global hashing fallback for unlisted arbitrary cities
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 37 + clean.charCodeAt(i)) | 0;
  }
  const lat = ((Math.abs(hash % 12000) / 100) - 45); // -45 to +75 latitude
  const lng = ((Math.abs((hash * 13) % 36000) / 100) - 180); // -180 to +180 longitude

  const capitalizedCity = query.trim().split(/[\s,]+/)[0] || 'International Hub';
  const displayCity = capitalizedCity.charAt(0).toUpperCase() + capitalizedCity.slice(1);

  return {
    city: displayCity,
    country: 'International',
    region: 'Global Trade Hub',
    iata: displayCity.slice(0, 3).toUpperCase(),
    lat: Math.round(lat * 10000) / 10000,
    lng: Math.round(lng * 10000) / 10000,
    facility: `${displayCity} Commercial Gateway`,
    hubType: 'air_cargo',
  };
}

/**
 * Calculate Great Circle Distance (Haversine formula in KM)
 */
export function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
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

export interface WorldwideRoutePreset {
  id: string;
  label: string;
  origin: string;
  destination: string;
  vehicleId: string;
  vehicleType: 'cargo_aircraft' | 'electric_hauler';
  cargoType: string;
  carrier: 'vanguard' | 'dhl' | 'fedex' | 'ups';
}

/**
 * Curated Worldwide Corridors across all 6 inhabited continents
 */
export const WORLDWIDE_ROUTE_PRESETS: WorldwideRoutePreset[] = [
  {
    id: 'route-nbo-lhr',
    label: 'Africa ➔ Europe: Nairobi (NBO) ➔ London Heathrow (LHR)',
    origin: 'Nairobi, Kenya',
    destination: 'London, United Kingdom',
    vehicleId: 'KQ-CARGO-104',
    vehicleType: 'cargo_aircraft',
    cargoType: 'Fresh Cut Flowers & Agricultural Cold-Chain',
    carrier: 'vanguard',
  },
  {
    id: 'route-nrt-fra',
    label: 'Asia ➔ Europe: Tokyo (NRT) ➔ Frankfurt CargoCity (FRA)',
    origin: 'Tokyo, Japan',
    destination: 'Frankfurt, Germany',
    vehicleId: 'AERO-CARGO-774',
    vehicleType: 'cargo_aircraft',
    cargoType: 'Cryogenic Pharmaceutical Biologics',
    carrier: 'dhl',
  },
  {
    id: 'route-jfk-cdg',
    label: 'Americas ➔ Europe: New York (JFK) ➔ Paris (CDG)',
    origin: 'New York, United States',
    destination: 'Paris, France',
    vehicleId: 'AF-FREIGHT-08',
    vehicleType: 'cargo_aircraft',
    cargoType: 'Precision Aerospace Components',
    carrier: 'fedex',
  },
  {
    id: 'route-pvg-lax',
    label: 'Asia ➔ Americas: Shanghai (PVG) ➔ Los Angeles (LAX)',
    origin: 'Shanghai, China',
    destination: 'Los Angeles, United States',
    vehicleId: 'PACIFIC-AIR-77',
    vehicleType: 'cargo_aircraft',
    cargoType: 'Semiconductors & Optical Sensor Arrays',
    carrier: 'vanguard',
  },
  {
    id: 'route-dxb-jnb',
    label: 'Middle East ➔ Africa: Dubai (DXB) ➔ Johannesburg (JNB)',
    origin: 'Dubai, United Arab Emirates',
    destination: 'Johannesburg, South Africa',
    vehicleId: 'EMIRATES-SKY-88',
    vehicleType: 'cargo_aircraft',
    cargoType: 'Express Medical & Telecom Gear',
    carrier: 'dhl',
  },
  {
    id: 'route-syd-sin',
    label: 'Oceania ➔ Asia: Sydney (SYD) ➔ Singapore (SIN)',
    origin: 'Sydney, Australia',
    destination: 'Singapore, Singapore',
    vehicleId: 'QANTAS-FREIGHT-21',
    vehicleType: 'cargo_aircraft',
    cargoType: 'Bio-Diagnostic Samples & High-Value Cargo',
    carrier: 'ups',
  },
  {
    id: 'route-gru-mia',
    label: 'South America ➔ North America: São Paulo (GRU) ➔ Miami (MIA)',
    origin: 'São Paulo, Brazil',
    destination: 'Miami, United States',
    vehicleId: 'LATAM-CARGO-55',
    vehicleType: 'cargo_aircraft',
    cargoType: 'Agricultural Samples & High-Value Goods',
    carrier: 'vanguard',
  },
];

/**
 * Creates an authentic worldwide shipment between ANY origin and destination globally.
 * Calculates coordinates, intermediate global waypoints, realistic flight corridors, and telemetry.
 */
export function createWorldwideShipment(params: {
  originQuery: string;
  destQuery: string;
  vehicleOrPlaneId?: string;
  trackingNumber?: string;
  cargoDescription?: string;
  isColdChain?: boolean;
  carrier?: 'vanguard' | 'dhl' | 'fedex' | 'ups';
}): Shipment {
  const originLoc = resolveWorldwideLocation(params.originQuery);
  const destLoc = resolveWorldwideLocation(params.destQuery);

  const distanceKm = calculateHaversineKm(originLoc.lat, originLoc.lng, destLoc.lat, destLoc.lng);
  const isIntercontinental = distanceKm > 950;

  const carrier = params.carrier || 'vanguard';
  const trackingNumber = params.trackingNumber || `VG-${Math.floor(100000000 + Math.random() * 900000000)}-${originLoc.country.slice(0, 2).toUpperCase()}`;
  const referenceNumber = `REF-${originLoc.iata}-${destLoc.iata}-${Math.floor(1000 + Math.random() * 9000)}`;

  const now = new Date();
  const transitDays = isIntercontinental ? (distanceKm > 6000 ? 2 : 1) : 1;
  const estimatedDelivery = new Date(now.getTime() + transitDays * 24 * 3600000).toISOString();

  // Selected default vehicle/plane identifier
  const vehicleId = params.vehicleOrPlaneId || (
    isIntercontinental ? `AERO-${originLoc.iata}-${Math.floor(100 + Math.random() * 900)}` : `VG-TRUCK-${Math.floor(100 + Math.random() * 900)}`
  );

  // Generate intermediate waypoint along spherical corridor
  const midLat = (originLoc.lat + destLoc.lat) / 2;
  const midLng = (originLoc.lng + destLoc.lng) / 2;

  // Midpoint 1 (Export Gateway Corridor)
  const mid1Lat = originLoc.lat + (destLoc.lat - originLoc.lat) * 0.33;
  const mid1Lng = originLoc.lng + (destLoc.lng - originLoc.lng) * 0.33;

  // Midpoint 2 (Import Gateway Corridor)
  const mid2Lat = originLoc.lat + (destLoc.lat - originLoc.lat) * 0.67;
  const mid2Lng = originLoc.lng + (destLoc.lng - originLoc.lng) * 0.67;

  const checkpoints: Checkpoint[] = [
    {
      id: `cp-${Date.now()}-1`,
      timestamp: new Date(now.getTime() - 14 * 3600000).toISOString(),
      location: `${originLoc.city}, ${originLoc.country}`,
      city: originLoc.city,
      state: originLoc.region,
      country: originLoc.country,
      status: 'picked_up',
      description: `Package picked up from origin premises in ${originLoc.city}. Initial barcode scan verified.`,
      facilityName: `${originLoc.city} Fulfillment Station`,
      lat: originLoc.lat,
      lng: originLoc.lng,
    },
    {
      id: `cp-${Date.now()}-2`,
      timestamp: new Date(now.getTime() - 8 * 3600000).toISOString(),
      location: `${originLoc.facility}`,
      city: originLoc.city,
      state: originLoc.region,
      country: originLoc.country,
      status: 'in_transit',
      description: `Cleared outbound international security screening at ${originLoc.iata} gateway. Loaded into freight manifest.`,
      facilityName: originLoc.facility,
      lat: originLoc.lat + (destLoc.lat > originLoc.lat ? 0.08 : -0.08),
      lng: originLoc.lng + (destLoc.lng > originLoc.lng ? 0.08 : -0.08),
    },
    {
      id: `cp-${Date.now()}-3`,
      timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
      location: isIntercontinental 
        ? `Air Cargo Corridor (${originLoc.iata} ➔ ${destLoc.iata})` 
        : `Interstate Freight Corridor (${originLoc.city} ➔ ${destLoc.city})`,
      city: 'International Airspace',
      state: 'Flight Corridor',
      country: 'Global Airway',
      status: 'in_transit',
      description: isIntercontinental
        ? `Flight ${vehicleId} en route at cruising altitude 35,000 ft. Continuous GPS telemetry and cargo seal intact.`
        : `Unit ${vehicleId} in transit along intermodal freight corridor. Speed nominal.`,
      facilityName: isIntercontinental ? `Flight ${vehicleId} Global Transit` : `Linehaul Corridor ${vehicleId}`,
      lat: midLat,
      lng: midLng,
    },
    {
      id: `cp-${Date.now()}-4`,
      timestamp: new Date(now.getTime() + 6 * 3600000).toISOString(),
      location: `${destLoc.facility}`,
      city: destLoc.city,
      state: destLoc.region,
      country: destLoc.country,
      status: 'customs_cleared',
      description: `Scheduled touchdown & expedited customs inspection release at ${destLoc.city} gateway.`,
      facilityName: destLoc.facility,
      lat: destLoc.lat - (destLoc.lat > originLoc.lat ? 0.06 : -0.06),
      lng: destLoc.lng - (destLoc.lng > originLoc.lng ? 0.06 : -0.06),
    },
    {
      id: `cp-${Date.now()}-5`,
      timestamp: new Date(now.getTime() + 12 * 3600000).toISOString(),
      location: `${destLoc.city} Metro Delivery Hub, ${destLoc.country}`,
      city: destLoc.city,
      state: destLoc.region,
      country: destLoc.country,
      status: 'out_for_delivery',
      description: `Dispatched to final-mile courier unit for consignee delivery window.`,
      facilityName: `${destLoc.city} Regional Distribution Depot`,
      lat: destLoc.lat - (destLoc.lat > originLoc.lat ? 0.02 : -0.02),
      lng: destLoc.lng - (destLoc.lng > originLoc.lng ? 0.02 : -0.02),
    },
    {
      id: `cp-${Date.now()}-6`,
      timestamp: estimatedDelivery,
      location: `${destLoc.city}, ${destLoc.country}`,
      city: destLoc.city,
      state: destLoc.region,
      country: destLoc.country,
      status: 'delivered',
      description: `Target destination delivery with electronic proof-of-delivery (e-POD).`,
      facilityName: `${destLoc.city} Consignee Receiving Premises`,
      lat: destLoc.lat,
      lng: destLoc.lng,
    },
  ];

  // Dynamic Telemetry
  const telemetry: VehicleTelemetry = {
    vehicleId,
    vehicleType: isIntercontinental ? 'cargo_aircraft' : 'electric_hauler',
    driverOrCaptain: isIntercontinental ? `Capt. ${originLoc.city.slice(0, 3)}-Air Flight Dispatch` : 'Commercial Logistics Operator',
    speedKph: isIntercontinental ? 870 : 68,
    heading: 'NE 45°',
    currentLat: midLat,
    currentLng: midLng,
    altitudeMeters: isIntercontinental ? 10600 : 250,
    ambientTempC: params.isColdChain ? -21.4 : 20.8,
    batteryOrFuelPct: 78,
    lastPingSecondsAgo: 3,
  };

  const shipper: Address = {
    name: `${originLoc.city} Global Exports Ltd.`,
    company: 'International Logistics Division',
    street1: `14 Freight Parkway, ${originLoc.iata} Logistics Park`,
    city: originLoc.city,
    state: originLoc.region,
    zipCode: `${originLoc.iata}-001`,
    country: originLoc.country,
    phone: '+1 (800) 555-0199',
    email: `dispatch@${originLoc.city.toLowerCase().replace(/[^a-z]/g, '')}-export.com`,
  };

  const recipient: Address = {
    name: `${destLoc.city} Consignee Operations`,
    company: 'Global Receiving Facility',
    street1: `100 Commerce Boulevard, Gate 4`,
    city: destLoc.city,
    state: destLoc.region,
    zipCode: `${destLoc.iata}-990`,
    country: destLoc.country,
    phone: '+1 (800) 555-0922',
    email: `receiving@${destLoc.city.toLowerCase().replace(/[^a-z]/g, '')}-import.org`,
  };

  const pkg: PackageDetails = {
    weightKg: 12.5,
    lengthCm: 50,
    widthCm: 40,
    heightCm: 35,
    declaredValueUsd: 18500,
    packageType: params.isColdChain ? 'cold_insulated' : 'box',
    contentsDescription: params.cargoDescription || (params.isColdChain ? 'Cold-Chain Certified Pharma Products' : 'High-Value Commercial Intermodal Freight'),
    isFragile: true,
    isHazardous: false,
    requiresSignature: true,
    isColdChain: !!params.isColdChain,
    targetTempC: params.isColdChain ? -20 : undefined,
  };

  const rates: RateOption = {
    carrier,
    carrierName: carrier === 'dhl' ? 'DHL Express Worldwide' : carrier === 'fedex' ? 'FedEx International Priority' : 'Transerve Global Intermodal Air',
    serviceLevel: isIntercontinental ? 'EXPEDITED AIR FREIGHT' : 'GROUND FREIGHT',
    deliveryDate: estimatedDelivery.split('T')[0],
    deliveryTimeWindow: 'By 14:00 Local Time',
    transitDays,
    baseCost: Math.round(distanceKm * 0.08 + 120),
    fuelSurcharge: Math.round(distanceKm * 0.015),
    insuranceCost: 45,
    totalCost: Math.round(distanceKm * 0.095 + 165),
  };

  const shipment: Shipment = {
    id: `shp-world-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    trackingNumber,
    referenceNumber,
    carrier,
    serviceLevel: isIntercontinental ? 'EXPEDITED AIR FREIGHT' : 'GROUND FREIGHT',
    status: 'in_transit',
    createdAt: now.toISOString(),
    estimatedDelivery,
    shipper,
    recipient,
    package: pkg,
    rates,
    checkpoints,
    currentCheckpointIndex: 2, // In transit across the global corridor
    telemetry,
    specialInstructions: `Worldwide Air Cargo Consignment: Origin [${originLoc.city}, ${originLoc.country}] ➔ Destination [${destLoc.city}, ${destLoc.country}]. GPS telemetry active.`,
  };

  // Add to active shipment storage so it's globally searchable across the applet
  addShipment(shipment);

  return shipment;
}
