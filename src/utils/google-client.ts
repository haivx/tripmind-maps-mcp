import { Client, Language } from "@googlemaps/google-maps-services-js";
import type { GeocodeResult } from "../types.js";

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
    const res = await client.reverseGeocode({
      params: {
        latlng: input.latlng,
        language: input.language as Language | undefined,
        key,
      },
    });
    if (res.data.status !== "OK" && res.data.status !== "ZERO_RESULTS") {
      throw new Error(
        `Google Reverse Geocoding API error: ${res.data.status}`
      );
    }
    rawResults = res.data.results;
  } else if (input.address) {
    const res = await client.geocode({
      params: {
        address: input.address,
        language: input.language as Language | undefined,
        key,
      },
    });
    if (res.data.status !== "OK" && res.data.status !== "ZERO_RESULTS") {
      throw new Error(`Google Geocoding API error: ${res.data.status}`);
    }
    rawResults = res.data.results;
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
