import { z } from "zod";
import { cache } from "../utils/cache.js";
import { computeRoute } from "../utils/google-client.js";
import type { DirectionsResult } from "../types.js";

const TTL_MS = 60 * 60 * 1000; // 1 hour

export const toolName = "maps_directions";

export const inputSchema = {
  origin: z.string().describe("Starting point — address, landmark name, or 'place_id:ChIJ...'"),
  destination: z.string().describe("End point — address, landmark name, or 'place_id:ChIJ...'"),
  mode: z
    .enum(["DRIVE", "WALK", "TRANSIT", "BICYCLE"])
    .optional()
    .describe("Travel mode. Default: TRANSIT (best for city travel)"),
  departure_time: z
    .string()
    .optional()
    .describe("ISO 8601 datetime for traffic-aware routing, e.g. '2026-04-10T09:00:00+09:00'"),
};

export const toolConfig = {
  title: "Get Directions",
  description:
    "Calculate a route between two places with travel time, distance, and step-by-step directions. Supports driving, walking, transit, and cycling. Use this when the user asks 'how to get from A to B' or when planning daily itinerary routes.",
  inputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
};

type DirectionsArgs = {
  origin: string;
  destination: string;
  mode?: "DRIVE" | "WALK" | "TRANSIT" | "BICYCLE";
  departure_time?: string;
};

export async function handler(args: DirectionsArgs) {
  try {
    const mode = args.mode ?? "TRANSIT";
    const cacheKey = `directions:${args.origin.toLowerCase().trim()}:${args.destination.toLowerCase().trim()}:${mode}`;

    const cached = cache.get<DirectionsResult>(cacheKey);
    if (cached) {
      return { content: [{ type: "text" as const, text: JSON.stringify(cached) }] };
    }

    const result = await computeRoute({
      origin: args.origin,
      destination: args.destination,
      mode,
      departure_time: args.departure_time,
    });

    cache.set(cacheKey, result, TTL_MS);
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[maps_directions] error: ${message}`);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
      isError: true,
    };
  }
}
