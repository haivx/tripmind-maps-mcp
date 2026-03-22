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
