import { Client, Language, PlaceType1 } from "@googlemaps/google-maps-services-js";
import type { GeocodeResult, PlaceSearchResult, PlaceDetailsResult } from "../types.js";

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
  return (res.data.results ?? []).map((r) => ({
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
  const r = res.data.result;
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
