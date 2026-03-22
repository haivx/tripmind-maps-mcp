import { z } from "zod";
import { cache } from "../utils/cache.js";
import { timezoneInfo } from "../utils/google-client.js";
import type { TimezoneResult } from "../types.js";

const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export const toolName = "maps_timezone";

export const inputSchema = {
  latitude: z.number().describe("Latitude of the location"),
  longitude: z.number().describe("Longitude of the location"),
  timestamp: z
    .number()
    .optional()
    .describe(
      "Unix timestamp in seconds. Default: current time. Use specific dates to account for daylight saving."
    ),
};

export const toolConfig = {
  title: "Timezone Lookup",
  description:
    "Get timezone information for a location by its coordinates. Returns timezone ID, name, and UTC offset. Use this to show local times in trip itineraries or convert between timezones for travel planning.",
  inputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
};

type TimezoneArgs = {
  latitude: number;
  longitude: number;
  timestamp?: number;
};

export async function handler(args: TimezoneArgs) {
  try {
    // Round to 4 decimal places (~11m precision) for cache key stability
    const lat = Math.round(args.latitude * 10000) / 10000;
    const lng = Math.round(args.longitude * 10000) / 10000;
    const cacheKey = `timezone:${lat},${lng}`;

    const cached = cache.get<TimezoneResult>(cacheKey);
    if (cached) {
      return { content: [{ type: "text" as const, text: JSON.stringify(cached) }] };
    }

    const result = await timezoneInfo({ lat: args.latitude, lng: args.longitude, timestamp: args.timestamp });

    cache.set(cacheKey, result, TTL_MS);
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[maps_timezone] error: ${message}`);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
      isError: true,
    };
  }
}
