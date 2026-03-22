import { z } from "zod";
import { cache } from "../utils/cache.js";
import { placeDetails as googlePlaceDetails } from "../utils/google-client.js";
import type { PlaceDetailsResult } from "../types.js";

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Map user-friendly field names to Google API field names
const FIELD_ALIASES: Record<string, string> = {
  address: "formatted_address",
  phone: "international_phone_number",
  hours: "opening_hours",
  location: "geometry",
};

export const toolName = "maps_place_details";

export const inputSchema = {
  place_id: z.string().describe("Google Place ID from a previous search result"),
  fields: z
    .array(z.string())
    .optional()
    .describe(
      "Specific fields to return. Fewer fields = lower API cost. Available: name, address, phone, website, rating, hours, reviews"
    ),
  language: z.string().optional().describe("Response language code. Default: 'en'"),
};

export const toolConfig = {
  title: "Place Details",
  description:
    "Get detailed information about a specific place using its Google Place ID. Returns opening hours, phone number, website, reviews, and ratings. Use this after search to get more info about a place the user is interested in.",
  inputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
};

type PlaceDetailsArgs = {
  place_id: string;
  fields?: string[];
  language?: string;
};

export async function handler(args: PlaceDetailsArgs) {
  try {
    const resolvedFields = args.fields?.map((f) => FIELD_ALIASES[f] ?? f);
    const fieldsKey = (resolvedFields ?? []).sort().join(",");
    const cacheKey = `place-details:${args.place_id}:${fieldsKey}:${args.language ?? "en"}`;

    const cached = cache.get<PlaceDetailsResult>(cacheKey);
    if (cached) {
      return { content: [{ type: "text" as const, text: JSON.stringify(cached) }] };
    }

    const result = await googlePlaceDetails({
      place_id: args.place_id,
      fields: resolvedFields,
      language: args.language,
    });

    cache.set(cacheKey, result, TTL_MS);
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[maps_place_details] error: ${message}`);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
      isError: true,
    };
  }
}
