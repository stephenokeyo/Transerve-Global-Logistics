/**
 * Simulated Weather API Service
 * Provides meteorological conditions, atmospheric telematics, and transit impact
 * assessments for current shipment coordinates.
 */

export type WeatherConditionKey =
  | 'clear_day'
  | 'clear_night'
  | 'partly_cloudy'
  | 'overcast'
  | 'light_rain'
  | 'heavy_rain'
  | 'thunderstorm'
  | 'snow'
  | 'fog'
  | 'windy';

export type WeatherImpactLevel = 'optimal' | 'moderate' | 'severe';

export interface WeatherData {
  locationName: string;
  latitude: number;
  longitude: number;
  tempC: number;
  tempF: number;
  feelsLikeC: number;
  feelsLikeF: number;
  conditionKey: WeatherConditionKey;
  conditionText: string;
  humidityPct: number;
  windSpeedKph: number;
  windSpeedMph: number;
  windDirection: string;
  visibilityKm: number;
  visibilityMiles: number;
  barometricPressureHpa: number;
  precipitationProbability: number;
  transitImpact: WeatherImpactLevel;
  transitImpactReason: string;
  fetchedAt: string;
  stationId: string;
}

// Deterministic hash based on coords + date to give stable yet realistic readings
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

const WIND_DIRECTIONS = ['N', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

/**
 * Generates realistic atmospheric weather data given geographic coordinates
 */
export function generateSimulatedWeather(
  lat: number,
  lng: number,
  locationName?: string,
  cacheBuster: number = 0
): WeatherData {
  // Use coordinates and hour as deterministic seed
  const now = new Date();
  const hour = now.getUTCHours();
  const seed = Math.abs(lat * 100 + lng * 10 + hour + cacheBuster * 73);

  const r1 = pseudoRandom(seed);
  const r2 = pseudoRandom(seed + 1);
  const r3 = pseudoRandom(seed + 2);
  const r4 = pseudoRandom(seed + 3);
  const r5 = pseudoRandom(seed + 4);

  // Temperature baseline depends on latitude
  let baseTempC = 22 - (Math.abs(lat) - 25) * 0.45;
  if (baseTempC < -5) baseTempC = -5;
  if (baseTempC > 36) baseTempC = 36;
  const tempOffset = (r1 - 0.5) * 6;
  const tempC = Math.round((baseTempC + tempOffset) * 10) / 10;
  const tempF = Math.round((tempC * 9 / 5 + 32) * 10) / 10;

  // Feels like calculation
  const feelsOffset = (r2 - 0.5) * 2.5;
  const feelsLikeC = Math.round((tempC + feelsOffset) * 10) / 10;
  const feelsLikeF = Math.round((feelsLikeC * 9 / 5 + 32) * 10) / 10;

  // Condition assignment
  let conditionKey: WeatherConditionKey = 'partly_cloudy';
  let conditionText = 'Partly Cloudy';
  let transitImpact: WeatherImpactLevel = 'optimal';
  let transitImpactReason = 'Clear visibility and dry roadways. Nominal transit velocity.';

  if (tempC <= 0 && r3 > 0.4) {
    conditionKey = 'snow';
    conditionText = 'Light Snow Flurries';
    transitImpact = 'moderate';
    transitImpactReason = 'Road surface freezing risk. Drivers advised to increase following distance.';
  } else if (r3 < 0.28) {
    conditionKey = 'clear_day';
    conditionText = 'Clear Skies';
    transitImpact = 'optimal';
    transitImpactReason = 'Optimal transit corridor. No weather-induced delays detected.';
  } else if (r3 < 0.58) {
    conditionKey = 'partly_cloudy';
    conditionText = 'Partly Cloudy';
    transitImpact = 'optimal';
    transitImpactReason = 'Favorable atmospheric conditions along current route corridor.';
  } else if (r3 < 0.75) {
    conditionKey = 'overcast';
    conditionText = 'Overcast';
    transitImpact = 'optimal';
    transitImpactReason = 'Dry road surfaces with high cloud ceilings. Standard transit times.';
  } else if (r3 < 0.88) {
    conditionKey = 'light_rain';
    conditionText = 'Scattered Showers';
    transitImpact = 'moderate';
    transitImpactReason = 'Wet pavement. Slight speed modulation applied on highway segments.';
  } else if (r3 < 0.94) {
    conditionKey = 'fog';
    conditionText = 'Dense Morning Fog';
    transitImpact = 'moderate';
    transitImpactReason = 'Reduced visibility (<2 km). Automated braking alert active.';
  } else {
    conditionKey = 'thunderstorm';
    conditionText = 'Thunderstorm Cells';
    transitImpact = 'severe';
    transitImpactReason = 'Convective storm activity. Air routing diverted; ground speed throttled.';
  }

  // Wind speed & direction
  const windSpeedKph = Math.round(8 + r4 * 32);
  const windSpeedMph = Math.round(windSpeedKph * 0.621371);
  const windDirIndex = Math.floor(r5 * WIND_DIRECTIONS.length);
  const windDirection = WIND_DIRECTIONS[windDirIndex] || 'NW';

  // Humidity and visibility
  const humidityPct = Math.round(42 + r2 * 48);
  const visibilityKm = conditionKey === 'fog' ? 1.8 : conditionKey === 'thunderstorm' ? 5.2 : conditionKey === 'light_rain' ? 8.5 : 16.0;
  const visibilityMiles = Math.round(visibilityKm * 0.621371 * 10) / 10;
  const barometricPressureHpa = Math.round(1012 + (r1 - 0.5) * 16);
  const precipitationProbability = conditionKey === 'clear_day' ? 5 : conditionKey === 'thunderstorm' ? 90 : conditionKey === 'light_rain' ? 75 : Math.round(r3 * 40);

  // Station Code
  const stationCode = `METAR-K${Math.abs(Math.round(lat * 10)) % 900 + 100}`;

  return {
    locationName: locationName || `Lat ${lat.toFixed(2)}°, Lng ${lng.toFixed(2)}°`,
    latitude: lat,
    longitude: lng,
    tempC,
    tempF,
    feelsLikeC,
    feelsLikeF,
    conditionKey,
    conditionText,
    humidityPct,
    windSpeedKph,
    windSpeedMph,
    windDirection,
    visibilityKm,
    visibilityMiles,
    barometricPressureHpa,
    precipitationProbability,
    transitImpact,
    transitImpactReason,
    fetchedAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    stationId: stationCode,
  };
}

/**
 * Simulated Weather API endpoint with network latency
 */
export async function fetchSimulatedWeather(
  lat: number,
  lng: number,
  locationName?: string,
  cacheBuster: number = 0
): Promise<WeatherData> {
  // Simulate network roundtrip latency (180ms - 320ms)
  await new Promise(resolve => setTimeout(resolve, 220));
  return generateSimulatedWeather(lat, lng, locationName, cacheBuster);
}
