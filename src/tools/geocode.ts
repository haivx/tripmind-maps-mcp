import { z } from "zod";
import { cache } from "../utils/cache.js";
import { geocode as googleGeocode } from "../utils/google-client.js";
import type { GeocodeResult } from "../types.js";

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const toolName = "maps_geocode";

/** Input schema shape for the maps_geocode tool. */
export const inputSchema = {
  address: z
    .string()
    .optional()
    .describe(
      "Address or landmark to geocode, e.g. 'Tokyo Tower' or '1-1 Marunouchi, Tokyo'"
    ),
  latitude: z
    .number()
    .optional()
    .describe("Latitude for reverse geocoding"),
  longitude: z
    .number()
    .optional()
    .describe("Longitude for reverse geocoding"),
  language: z
    .string()
    .optional()
    .describe("Response language code, e.g. 'en', 'ja', 'vi'. Default: 'en'"),
};

/** Tool registration config for McpServer.registerTool(). */
export const toolConfig = {
  title: "Geocode Address",
  description:
    "Convert an address or landmark name to GPS coordinates (forward geocoding), or convert coordinates to an address (reverse geocoding). Use this for placing pins on maps or finding where a place is located.",
  inputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
};

type GeocodeArgs = {
  address?: string;
  latitude?: number;
  longitude?: number;
  language?: string;
};

/**
 * Handler for the maps_geocode tool.
 * Validates that either `address` or both `latitude`+`longitude` are provided,
 * checks the cache, calls Google Geocoding API on miss, and caches the result.
 */
export async function handler(args: GeocodeArgs) {
  try {
    const hasAddress = Boolean(args.address);
    const hasLatLng =
      args.latitude !== undefined && args.longitude !== undefined;

    if (!hasAddress && !hasLatLng) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error:
                "Provide either `address` for forward geocoding, or both `latitude` and `longitude` for reverse geocoding.",
            }),
          },
        ],
        isError: true,
      };
    }

    const cacheKey = hasLatLng
      ? `geocode:latlng:${args.latitude},${args.longitude}:${args.language ?? "en"}`
      : `geocode:address:${(args.address ?? "").toLowerCase().trim()}:${args.language ?? "en"}`;

    const cached = cache.get<GeocodeResult[]>(cacheKey);
    if (cached) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(cached) }],
      };
    }

    const results = await googleGeocode({
      address: args.address,
      latlng:
        hasLatLng
          ? { lat: args.latitude!, lng: args.longitude! }
          : undefined,
      language: args.language,
    });

    cache.set(cacheKey, results, TTL_MS);

    return {
      content: [{ type: "text" as const, text: JSON.stringify(results) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[maps_geocode] error: ${message}`);
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ error: message }) },
      ],
      isError: true,
    };
  }
}
