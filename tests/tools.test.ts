import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Google client module — hoisted before all imports
vi.mock("../src/utils/google-client.js", () => ({
  geocode: vi.fn(),
  searchPlaces: vi.fn(),
  placeDetails: vi.fn(),
}));

import { geocode, searchPlaces, placeDetails } from "../src/utils/google-client.js";
import { cache } from "../src/utils/cache.js";
import { handler as geocodeHandler } from "../src/tools/geocode.js";
import { handler as searchPlacesHandler } from "../src/tools/search-places.js";
import { handler as placeDetailsHandler } from "../src/tools/place-details.js";

function parseContent(result: { content: Array<{ type: string; text: string }> }) {
  return JSON.parse(result.content[0]!.text);
}

beforeEach(() => {
  vi.clearAllMocks();
  cache.clear();
  process.env["GOOGLE_MAPS_API_KEY"] = "test-key";
});

// ---------------------------------------------------------------------------
// maps_geocode
// ---------------------------------------------------------------------------

describe("maps_geocode", () => {
  const mockResult = [
    {
      formatted_address: "Tokyo Tower, 4-2-8 Shibakoen, Minato City, Tokyo",
      location: { lat: 35.6586, lng: 139.7454 },
      place_id: "ChIJcd0dDGGLGGARzYPACZ_jUeU",
      types: ["tourist_attraction", "point_of_interest"],
    },
  ];

  it("forward geocodes an address", async () => {
    vi.mocked(geocode).mockResolvedValue(mockResult);

    const result = await geocodeHandler({ address: "Tokyo Tower" });

    expect(result.isError).toBeUndefined();
    expect(parseContent(result)).toEqual(mockResult);
    expect(geocode).toHaveBeenCalledWith(expect.objectContaining({ address: "Tokyo Tower" }));
  });

  it("reverse geocodes lat/lng coordinates", async () => {
    vi.mocked(geocode).mockResolvedValue(mockResult);

    const result = await geocodeHandler({ latitude: 35.6586, longitude: 139.7454 });

    expect(result.isError).toBeUndefined();
    expect(geocode).toHaveBeenCalledWith(
      expect.objectContaining({ latlng: { lat: 35.6586, lng: 139.7454 } })
    );
  });

  it("returns validation error when no input provided", async () => {
    const result = await geocodeHandler({});

    expect(result.isError).toBe(true);
    expect(parseContent(result).error).toMatch(/address/i);
    expect(geocode).not.toHaveBeenCalled();
  });

  it("caches result and avoids duplicate API calls", async () => {
    vi.mocked(geocode).mockResolvedValue(mockResult);

    await geocodeHandler({ address: "Tokyo Tower" });
    await geocodeHandler({ address: "Tokyo Tower" });

    expect(geocode).toHaveBeenCalledTimes(1);
  });

  it("returns error content on API failure", async () => {
    vi.mocked(geocode).mockRejectedValue(new Error("API quota exceeded"));

    const result = await geocodeHandler({ address: "Tokyo Tower" });

    expect(result.isError).toBe(true);
    expect(parseContent(result).error).toContain("quota");
  });
});

// ---------------------------------------------------------------------------
// maps_search_places
// ---------------------------------------------------------------------------

describe("maps_search_places", () => {
  const mockResults = [
    {
      place_id: "ChIJ123",
      name: "Ichiran Ramen Shinjuku",
      formatted_address: "3-34-11 Shinjuku, Shinjuku City, Tokyo",
      location: { lat: 35.6938, lng: 139.7034 },
      rating: 4.4,
      types: ["restaurant", "food"],
    },
  ];

  it("searches for places by text query", async () => {
    vi.mocked(searchPlaces).mockResolvedValue(mockResults);

    const result = await searchPlacesHandler({ query: "ramen in Shinjuku" });

    expect(result.isError).toBeUndefined();
    expect(parseContent(result)).toEqual(mockResults);
    expect(searchPlaces).toHaveBeenCalledWith(
      expect.objectContaining({ query: "ramen in Shinjuku" })
    );
  });

  it("passes location bias when lat/lng provided", async () => {
    vi.mocked(searchPlaces).mockResolvedValue([]);

    await searchPlacesHandler({ query: "coffee", latitude: 35.6762, longitude: 139.6503 });

    expect(searchPlaces).toHaveBeenCalledWith(
      expect.objectContaining({ location: { lat: 35.6762, lng: 139.6503 } })
    );
  });

  it("passes type filter when provided", async () => {
    vi.mocked(searchPlaces).mockResolvedValue([]);

    await searchPlacesHandler({ query: "near Shibuya", type: "restaurant" });

    expect(searchPlaces).toHaveBeenCalledWith(
      expect.objectContaining({ type: "restaurant" })
    );
  });

  it("caches results and avoids duplicate API calls", async () => {
    vi.mocked(searchPlaces).mockResolvedValue(mockResults);

    await searchPlacesHandler({ query: "ramen in tokyo" });
    await searchPlacesHandler({ query: "ramen in tokyo" });

    expect(searchPlaces).toHaveBeenCalledTimes(1);
  });

  it("returns error content on API failure", async () => {
    vi.mocked(searchPlaces).mockRejectedValue(new Error("Network error"));

    const result = await searchPlacesHandler({ query: "sushi" });

    expect(result.isError).toBe(true);
    expect(parseContent(result).error).toContain("Network error");
  });
});

// ---------------------------------------------------------------------------
// maps_place_details
// ---------------------------------------------------------------------------

describe("maps_place_details", () => {
  const mockDetails = {
    place_id: "ChIJcd0dDGGLGGARzYPACZ_jUeU",
    name: "Tokyo Tower",
    formatted_address: "4-2-8 Shibakoen, Minato City, Tokyo 105-0011, Japan",
    location: { lat: 35.6586, lng: 139.7454 },
    rating: 4.5,
    opening_hours: {
      open_now: true,
      weekday_text: [
        "Monday: 9:00 AM – 11:00 PM",
        "Tuesday: 9:00 AM – 11:00 PM",
      ],
    },
    phone: "+81 3-3433-5111",
    website: "https://www.tokyotower.co.jp/",
    reviews: [],
    types: ["tourist_attraction", "point_of_interest"],
  };

  it("fetches place details by place_id", async () => {
    vi.mocked(placeDetails).mockResolvedValue(mockDetails);

    const result = await placeDetailsHandler({ place_id: "ChIJcd0dDGGLGGARzYPACZ_jUeU" });

    expect(result.isError).toBeUndefined();
    expect(parseContent(result)).toEqual(mockDetails);
    expect(placeDetails).toHaveBeenCalledWith(
      expect.objectContaining({ place_id: "ChIJcd0dDGGLGGARzYPACZ_jUeU" })
    );
  });

  it("maps friendly field names to Google API field names", async () => {
    vi.mocked(placeDetails).mockResolvedValue(mockDetails);

    await placeDetailsHandler({
      place_id: "ChIJ123",
      fields: ["address", "phone", "hours"],
    });

    expect(placeDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.arrayContaining([
          "formatted_address",
          "international_phone_number",
          "opening_hours",
        ]),
      })
    );
  });

  it("passes through unrecognized field names as-is", async () => {
    vi.mocked(placeDetails).mockResolvedValue(mockDetails);

    await placeDetailsHandler({ place_id: "ChIJ123", fields: ["name", "website"] });

    expect(placeDetails).toHaveBeenCalledWith(
      expect.objectContaining({ fields: expect.arrayContaining(["name", "website"]) })
    );
  });

  it("caches details and avoids duplicate API calls", async () => {
    vi.mocked(placeDetails).mockResolvedValue(mockDetails);

    await placeDetailsHandler({ place_id: "ChIJcd0dDGGLGGARzYPACZ_jUeU" });
    await placeDetailsHandler({ place_id: "ChIJcd0dDGGLGGARzYPACZ_jUeU" });

    expect(placeDetails).toHaveBeenCalledTimes(1);
  });

  it("returns error content on API failure", async () => {
    vi.mocked(placeDetails).mockRejectedValue(new Error("Place not found"));

    const result = await placeDetailsHandler({ place_id: "invalid_id" });

    expect(result.isError).toBe(true);
    expect(parseContent(result).error).toContain("Place not found");
  });
});
