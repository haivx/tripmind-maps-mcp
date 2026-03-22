import { Client, Language, PlaceType1, TravelMode } from "@googlemaps/google-maps-services-js";
import type { GeocodeResult, PlaceSearchResult, PlaceDetailsResult, DirectionsResult, DistanceMatrixResult, TimezoneResult } from "../types.js";

const client = new Client({});

function getApiKey(): string {
  const key = process.env["GOOGLE_MAPS_API_KEY"];
  if (!key) {
    throw new Error(
      "GOOGLE_MAPS_API_KEY is not set. Add it to your .env file."
    );
  }
  return key;
}

// ---------------------------------------------------------------------------
// Retry helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine if a thrown error is transient and worth retrying.
 * Retries on: network errors, HTTP 5xx, HTTP 429 (rate limit), OVER_QUERY_LIMIT, UNKNOWN_ERROR.
 * Does NOT retry on: 4xx client errors (bad input, invalid key).
 */
function isRetryable(err: Error): boolean {
  const msg = err.message;

  // Network / connection errors
  if (/ECONNRESET|ETIMEDOUT|ENOTFOUND|ENETUNREACH|ECONNREFUSED/i.test(msg)) return true;

  // HTTP status codes embedded in error message (e.g. "error: 429 Too Many Requests")
  const statusMatch = msg.match(/:\s*(\d{3})(?:\s|$)/);
  if (statusMatch) {
    const code = parseInt(statusMatch[1]!, 10);
    if (code === 429) return true;
    if (code >= 500) return true;
    return false; // 4xx client errors — do not retry
  }

  // Google Maps API status codes in error message
  if (msg.includes("OVER_QUERY_LIMIT")) return true;
  if (msg.includes("UNKNOWN_ERROR")) return true;

  return false;
}

/**
 * Retry a fallible async function with exponential backoff.
 * Backoff: 1 s, 2 s, 4 s (maxRetries = 3 attempts total).
 * Only retries when `isRetryable` returns true.
 */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error = new Error("Unknown error");
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (!isRetryable(lastError)) throw lastError;
      const delay = Math.pow(2, attempt) * 1000;
      console.error(
        `[retry] attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}. Retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Geocode
// ---------------------------------------------------------------------------

/** Input options for geocode/reverse-geocode calls. */
export interface GeocodeInput {
  address?: string;
  latlng?: { lat: number; lng: number };
  language?: string;
}

/**
 * Forward geocode an address or reverse geocode a lat/lng pair.
 * Routes to the correct Google Maps API SKU:
 *   - Forward: Geocoding API (address → latlng)
 *   - Reverse: Reverse Geocoding API (latlng → address)
 */
export async function geocode(input: GeocodeInput): Promise<GeocodeResult[]> {
  const key = getApiKey();

  let rawResults: Awaited<
    ReturnType<typeof client.geocode>
  >["data"]["results"];

  if (input.latlng) {
    rawResults = await withRetry(async () => {
      const res = await client.reverseGeocode({
        params: {
          latlng: input.latlng!,
          language: input.language as Language | undefined,
          key,
        },
      });
      if (res.data.status !== "OK" && res.data.status !== "ZERO_RESULTS") {
        throw new Error(
          `Google Reverse Geocoding API error: ${res.data.status}`
        );
      }
      return res.data.results;
    });
  } else if (input.address) {
    rawResults = await withRetry(async () => {
      const res = await client.geocode({
        params: {
          address: input.address!,
          language: input.language as Language | undefined,
          key,
        },
      });
      if (res.data.status !== "OK" && res.data.status !== "ZERO_RESULTS") {
        throw new Error(`Google Geocoding API error: ${res.data.status}`);
      }
      return res.data.results;
    });
  } else {
    throw new Error("Either address or latlng must be provided.");
  }

  return rawResults.map((r) => ({
    formatted_address: r.formatted_address,
    location: {
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
    },
    place_id: r.place_id,
    types: r.types as string[],
  }));
}

// ---------------------------------------------------------------------------
// Search Places
// ---------------------------------------------------------------------------

/** Input options for Places Text Search. */
export interface SearchPlacesInput {
  query: string;
  location?: { lat: number; lng: number };
  radius?: number;
  type?: string;
  language?: string;
}

/**
 * Search for places by text query.
 * SKU: Text Search — fields: name, formatted_address, geometry, rating, types, place_id
 */
export async function searchPlaces(input: SearchPlacesInput): Promise<PlaceSearchResult[]> {
  const key = getApiKey();
  const results = await withRetry(async () => {
    const res = await client.textSearch({
      params: {
        query: input.query,
        ...(input.location && { location: input.location }),
        ...(input.radius && { radius: input.radius }),
        type: input.type as PlaceType1 | undefined,
        language: input.language as Language | undefined,
        key,
      },
    });
    if (res.data.status !== "OK" && res.data.status !== "ZERO_RESULTS") {
      throw new Error(`Google Places Text Search error: ${res.data.status}`);
    }
    return res.data.results ?? [];
  });

  return results.map((r) => ({
    place_id: r.place_id ?? "",
    name: r.name ?? "",
    formatted_address: r.formatted_address ?? "",
    location: {
      lat: r.geometry?.location.lat ?? 0,
      lng: r.geometry?.location.lng ?? 0,
    },
    rating: r.rating,
    types: (r.types as string[]) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Place Details
// ---------------------------------------------------------------------------

/** Input options for Place Details lookup. */
export interface PlaceDetailsInput {
  place_id: string;
  fields?: string[];
  language?: string;
}

const DEFAULT_DETAIL_FIELDS = [
  "name", "formatted_address", "geometry", "rating",
  "opening_hours", "international_phone_number", "website", "reviews", "types",
];

/**
 * Fetch rich details for a place by place_id.
 * SKU: Place Details
 */
export async function placeDetails(input: PlaceDetailsInput): Promise<PlaceDetailsResult> {
  const key = getApiKey();
  const r = await withRetry(async () => {
    const res = await client.placeDetails({
      params: {
        place_id: input.place_id,
        fields: input.fields ?? DEFAULT_DETAIL_FIELDS,
        language: input.language as Language | undefined,
        key,
      },
    });
    if (res.data.status !== "OK") {
      throw new Error(`Google Place Details error: ${res.data.status}`);
    }
    return res.data.result;
  });

  return {
    place_id: input.place_id,
    name: r.name ?? "",
    formatted_address: r.formatted_address ?? "",
    location: {
      lat: r.geometry?.location.lat ?? 0,
      lng: r.geometry?.location.lng ?? 0,
    },
    rating: r.rating,
    opening_hours: r.opening_hours
      ? { open_now: r.opening_hours.open_now, weekday_text: r.opening_hours.weekday_text }
      : undefined,
    phone: r.international_phone_number,
    website: r.website,
    reviews: r.reviews?.map((rev) => ({
      author_name: rev.author_name,
      rating: rev.rating,
      text: rev.text,
      time: rev.time,
    })),
    types: r.types as string[] | undefined,
  };
}

// ---------------------------------------------------------------------------
// Directions (Routes API v2)
// ---------------------------------------------------------------------------

// Internal types for Routes API response (not exported)
interface RouteApiStep {
  navigationInstruction?: { instructions?: string };
  distanceMeters?: number;
  duration?: string;
  localizedValues?: { distance?: { text: string }; duration?: { text: string } };
}
interface RouteApiRoute {
  distanceMeters?: number;
  duration?: string;
  localizedValues?: { distance?: { text: string }; duration?: { text: string } };
  legs?: Array<{ steps?: RouteApiStep[] }>;
}

const ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

export interface ComputeRouteInput {
  origin: string;
  destination: string;
  mode?: "DRIVE" | "WALK" | "TRANSIT" | "BICYCLE";
  departure_time?: string;
}

/**
 * Compute a route between two points using the Google Routes API.
 * SKU: Routes API — Compute Routes
 * Field mask: routes.distanceMeters,routes.duration,routes.localizedValues,routes.legs.steps
 */
export async function computeRoute(input: ComputeRouteInput): Promise<DirectionsResult> {
  const key = getApiKey();
  const fieldMask = [
    "routes.distanceMeters",
    "routes.duration",
    "routes.localizedValues",
    "routes.legs.steps.navigationInstruction",
    "routes.legs.steps.distanceMeters",
    "routes.legs.steps.duration",
    "routes.legs.steps.localizedValues",
  ].join(",");

  const body = {
    origin: { address: input.origin },
    destination: { address: input.destination },
    travelMode: input.mode ?? "TRANSIT",
    ...(input.departure_time && { departureTime: input.departure_time }),
    computeAlternativeRoutes: false,
    units: "METRIC",
  };

  const data = await withRetry(async () => {
    const res = await fetch(ROUTES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Google Routes API error: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<{ routes?: RouteApiRoute[] }>;
  });

  if (!data.routes || data.routes.length === 0) {
    throw new Error("Google Routes API returned no routes for this request.");
  }

  const route = data.routes[0]!;
  const distanceM = route.distanceMeters ?? 0;
  const durationSec = parseInt((route.duration ?? "0s").replace("s", ""), 10);
  const steps = route.legs?.[0]?.steps ?? [];

  return {
    summary: route.localizedValues?.distance?.text
      ? `${route.localizedValues.distance.text} — ${route.localizedValues.duration?.text ?? ""}`
      : `${(distanceM / 1000).toFixed(1)} km`,
    distance: {
      text: route.localizedValues?.distance?.text ?? `${(distanceM / 1000).toFixed(1)} km`,
      value: distanceM,
    },
    duration: {
      text: route.localizedValues?.duration?.text ?? `${Math.round(durationSec / 60)} mins`,
      value: durationSec,
    },
    steps: steps.map((s) => ({
      instruction: s.navigationInstruction?.instructions ?? "",
      distance: {
        text: s.localizedValues?.distance?.text ?? `${s.distanceMeters ?? 0} m`,
        value: s.distanceMeters ?? 0,
      },
      duration: {
        text: s.localizedValues?.duration?.text ?? "",
        value: parseInt((s.duration ?? "0s").replace("s", ""), 10),
      },
    })),
  };
}

// ---------------------------------------------------------------------------
// Distance Matrix
// ---------------------------------------------------------------------------

const TRAVEL_MODE_MAP: Record<string, TravelMode> = {
  DRIVE: TravelMode.driving,
  WALK: TravelMode.walking,
  TRANSIT: TravelMode.transit,
  BICYCLE: TravelMode.bicycling,
};

export interface DistanceMatrixInput {
  origins: string[];
  destinations: string[];
  mode?: "DRIVE" | "WALK" | "TRANSIT" | "BICYCLE";
}

/**
 * Calculate travel distances between multiple origins and destinations.
 * SKU: Distance Matrix API
 */
export async function distanceMatrix(input: DistanceMatrixInput): Promise<DistanceMatrixResult> {
  const key = getApiKey();
  const mode = TRAVEL_MODE_MAP[input.mode ?? "TRANSIT"] ?? TravelMode.transit;

  const res = await withRetry(async () => {
    const r = await client.distancematrix({
      params: { origins: input.origins, destinations: input.destinations, mode, key },
    });
    if (r.data.status !== "OK") {
      throw new Error(`Google Distance Matrix API error: ${r.data.status}`);
    }
    return r.data;
  });

  const elements = res.rows.flatMap((row, rowIdx) =>
    row.elements.map((el, colIdx) => ({
      origin: res.origin_addresses[rowIdx] ?? input.origins[rowIdx] ?? "",
      destination: res.destination_addresses[colIdx] ?? input.destinations[colIdx] ?? "",
      distance: { text: el.distance?.text ?? "", value: el.distance?.value ?? 0 },
      duration: { text: el.duration?.text ?? "", value: el.duration?.value ?? 0 },
      status: el.status as string,
    }))
  );

  return { elements };
}

// ---------------------------------------------------------------------------
// Timezone
// ---------------------------------------------------------------------------

export interface TimezoneInput {
  lat: number;
  lng: number;
  timestamp?: number;
}

/**
 * Look up timezone info for a coordinate.
 * SKU: Time Zone API
 */
export async function timezoneInfo(input: TimezoneInput): Promise<TimezoneResult> {
  const key = getApiKey();
  const data = await withRetry(async () => {
    const res = await client.timezone({
      params: {
        location: { lat: input.lat, lng: input.lng },
        timestamp: input.timestamp ?? Math.floor(Date.now() / 1000),
        key,
      },
    });
    if (res.data.status !== "OK") {
      throw new Error(`Google Timezone API error: ${res.data.status}`);
    }
    return res.data;
  });

  return {
    timezone_id: data.timeZoneId,
    timezone_name: data.timeZoneName,
    utc_offset_seconds: data.rawOffset,
    dst_offset_seconds: data.dstOffset,
  };
}
