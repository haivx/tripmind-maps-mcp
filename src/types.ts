/** Latitude/longitude coordinate pair */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Normalized geocoding result returned to MCP clients */
export interface GeocodeResult {
  formatted_address: string;
  location: LatLng;
  place_id: string;
  types: string[];
}

/** Generic cache entry with expiration timestamp */
export interface CacheEntry<T> {
  data: T;
  expires_at: number;
}

/** Structured tool error */
export interface ToolError {
  error: string;
  code?: string;
}

/** Result from Places Text Search */
export interface PlaceSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  location: LatLng;
  rating?: number;
  types: string[];
}

/** Opening hours info returned by Place Details */
export interface OpeningHours {
  open_now?: boolean;
  weekday_text?: string[];
}

/** A single user review */
export interface PlaceReview {
  author_name: string;
  rating: number;
  text: string;
  time: string;
}

/** A single step in a route */
export interface RouteStep {
  instruction: string;
  distance: { text: string; value: number };
  duration: { text: string; value: number };
}

/** Result from the Routes API (Compute Route) */
export interface DirectionsResult {
  summary: string;
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  steps: RouteStep[];
}

/** A single cell in the distance matrix */
export interface MatrixElement {
  origin: string;
  destination: string;
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  status: string;
}

/** Result from the Distance Matrix API */
export interface DistanceMatrixResult {
  elements: MatrixElement[];
}

/** Result from the Timezone API */
export interface TimezoneResult {
  timezone_id: string;
  timezone_name: string;
  utc_offset_seconds: number;
  dst_offset_seconds: number;
}

/** Rich place info from Place Details API */
export interface PlaceDetailsResult {
  place_id: string;
  name: string;
  formatted_address: string;
  location: LatLng;
  rating?: number;
  opening_hours?: OpeningHours;
  phone?: string;
  website?: string;
  reviews?: PlaceReview[];
  types?: string[];
}
