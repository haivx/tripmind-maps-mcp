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
