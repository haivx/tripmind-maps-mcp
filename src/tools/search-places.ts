import { z } from "zod";
import { cache } from "../utils/cache.js";
import { searchPlaces as googleSearchPlaces } from "../utils/google-client.js";
import type { PlaceSearchResult } from "../types.js";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const toolName = "maps_search_places";

export const inputSchema = {
  query: z.string().describe("What to search for, e.g. 'sushi restaurants in Ginza'"),
  latitude: z.number().optional().describe("Latitude to bias results near a location"),
  longitude: z.number().optional().describe("Longitude to bias results near a location"),
  radius: z
    .number()
    .optional()
    .describe("Search radius in meters, max 50000. Default: 5000"),
  type: z
    .string()
    .optional()
    .describe("Place type filter: restaurant, hotel, cafe, tourist_attraction, etc."),
  language: z.string().optional().describe("Response language code. Default: 'en'"),
};

export const toolConfig = {
  title: "Search Places",
  description:
    "Search for places by text query like 'ramen restaurants in Shinjuku' or 'coffee shops near Tokyo Tower'. Returns place names, addresses, ratings, and IDs. Use this when the user asks for recommendations or wants to find places.",
  inputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
};

type SearchPlacesArgs = {
  query: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  type?: string;
  language?: string;
};

export async function handler(args: SearchPlacesArgs) {
  try {
    const hasLocation = args.latitude !== undefined && args.longitude !== undefined;
    const cacheKey = `search:${args.query.toLowerCase().trim()}:${args.latitude ?? ""}:${args.longitude ?? ""}:${args.radius ?? ""}:${args.type ?? ""}:${args.language ?? "en"}`;

    const cached = cache.get<PlaceSearchResult[]>(cacheKey);
    if (cached) {
      return { content: [{ type: "text" as const, text: JSON.stringify(cached) }] };
    }

    const results = await googleSearchPlaces({
      query: args.query,
      location: hasLocation ? { lat: args.latitude!, lng: args.longitude! } : undefined,
      radius: args.radius,
      type: args.type,
      language: args.language,
    });

    cache.set(cacheKey, results, TTL_MS);
    return { content: [{ type: "text" as const, text: JSON.stringify(results) }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[maps_search_places] error: ${message}`);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
      isError: true,
    };
  }
}
