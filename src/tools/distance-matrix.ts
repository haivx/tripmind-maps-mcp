import { z } from "zod";
import { cache } from "../utils/cache.js";
import { distanceMatrix as googleDistanceMatrix } from "../utils/google-client.js";
import type { DistanceMatrixResult } from "../types.js";

const TTL_MS = 60 * 60 * 1000; // 1 hour

export const toolName = "maps_distance_matrix";

export const inputSchema = {
  origins: z
    .array(z.string())
    .min(1)
    .max(10)
    .describe("List of starting points (addresses or place_ids)"),
  destinations: z
    .array(z.string())
    .min(1)
    .max(10)
    .describe("List of end points (addresses or place_ids)"),
  mode: z
    .enum(["DRIVE", "WALK", "TRANSIT", "BICYCLE"])
    .optional()
    .describe("Travel mode. Default: TRANSIT"),
};

export const toolConfig = {
  title: "Distance Matrix",
  description:
    "Calculate travel distances and times between multiple origins and destinations at once. Returns a matrix of all pairs. Use this to optimize itinerary order — find which places are closest to each other for efficient day planning.",
  inputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
};

type DistanceMatrixArgs = {
  origins: string[];
  destinations: string[];
  mode?: "DRIVE" | "WALK" | "TRANSIT" | "BICYCLE";
};

export async function handler(args: DistanceMatrixArgs) {
  try {
    const mode = args.mode ?? "TRANSIT";
    const originsKey = args.origins.map((o) => o.toLowerCase().trim()).join("|");
    const destsKey = args.destinations.map((d) => d.toLowerCase().trim()).join("|");
    const cacheKey = `distance-matrix:${originsKey}:${destsKey}:${mode}`;

    const cached = cache.get<DistanceMatrixResult>(cacheKey);
    if (cached) {
      return { content: [{ type: "text" as const, text: JSON.stringify(cached) }] };
    }

    const result = await googleDistanceMatrix({
      origins: args.origins,
      destinations: args.destinations,
      mode,
    });

    cache.set(cacheKey, result, TTL_MS);
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[maps_distance_matrix] error: ${message}`);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
      isError: true,
    };
  }
}
