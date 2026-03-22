import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Google client module — hoisted before all imports
vi.mock("../src/utils/google-client.js", () => ({
  geocode: vi.fn(),
  searchPlaces: vi.fn(),
  placeDetails: vi.fn(),
  computeRoute: vi.fn(),
  distanceMatrix: vi.fn(),
  timezoneInfo: vi.fn(),
}));

import { geocode, searchPlaces, placeDetails, computeRoute, distanceMatrix, timezoneInfo } from "../src/utils/google-client.js";
import { cache } from "../src/utils/cache.js";
import { handler as geocodeHandler } from "../src/tools/geocode.js";
import { handler as searchPlacesHandler } from "../src/tools/search-places.js";
import { handler as placeDetailsHandler } from "../src/tools/place-details.js";
import { handler as directionsHandler } from "../src/tools/directions.js";
import { handler as distanceMatrixHandler } from "../src/tools/distance-matrix.js";
import { handler as timezoneHandler } from "../src/tools/timezone.js";

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

// ---------------------------------------------------------------------------
// maps_directions
// ---------------------------------------------------------------------------

describe("maps_directions", () => {
  const mockRoute = {
    summary: "1.2 km — 15 mins",
    distance: { text: "1.2 km", value: 1200 },
    duration: { text: "15 mins", value: 900 },
    steps: [
      {
        instruction: "Head north on Asakusa-dori",
        distance: { text: "400 m", value: 400 },
        duration: { text: "5 mins", value: 300 },
      },
    ],
  };

  it("returns a route between two places", async () => {
    vi.mocked(computeRoute).mockResolvedValue(mockRoute);

    const result = await directionsHandler({ origin: "Senso-ji Temple", destination: "Tokyo Skytree" });

    expect(result.isError).toBeUndefined();
    expect(parseContent(result)).toEqual(mockRoute);
    expect(computeRoute).toHaveBeenCalledWith(
      expect.objectContaining({ origin: "Senso-ji Temple", destination: "Tokyo Skytree", mode: "TRANSIT" })
    );
  });

  it("passes explicit travel mode", async () => {
    vi.mocked(computeRoute).mockResolvedValue(mockRoute);

    await directionsHandler({ origin: "A", destination: "B", mode: "WALK" });

    expect(computeRoute).toHaveBeenCalledWith(expect.objectContaining({ mode: "WALK" }));
  });

  it("caches result and avoids duplicate API calls", async () => {
    vi.mocked(computeRoute).mockResolvedValue(mockRoute);

    await directionsHandler({ origin: "Senso-ji Temple", destination: "Tokyo Skytree" });
    await directionsHandler({ origin: "Senso-ji Temple", destination: "Tokyo Skytree" });

    expect(computeRoute).toHaveBeenCalledTimes(1);
  });

  it("returns error content on API failure", async () => {
    vi.mocked(computeRoute).mockRejectedValue(new Error("Routes API error: 403 Forbidden"));

    const result = await directionsHandler({ origin: "A", destination: "B" });

    expect(result.isError).toBe(true);
    expect(parseContent(result).error).toContain("Routes API error");
  });
});

// ---------------------------------------------------------------------------
// maps_distance_matrix
// ---------------------------------------------------------------------------

describe("maps_distance_matrix", () => {
  const mockMatrix = {
    elements: [
      {
        origin: "Shinjuku Station, Tokyo",
        destination: "Tokyo Tower, Tokyo",
        distance: { text: "8.2 km", value: 8200 },
        duration: { text: "28 mins", value: 1680 },
        status: "OK",
      },
      {
        origin: "Shibuya Station, Tokyo",
        destination: "Tokyo Tower, Tokyo",
        distance: { text: "4.1 km", value: 4100 },
        duration: { text: "18 mins", value: 1080 },
        status: "OK",
      },
    ],
  };

  it("returns a distance matrix for origins and destinations", async () => {
    vi.mocked(distanceMatrix).mockResolvedValue(mockMatrix);

    const result = await distanceMatrixHandler({
      origins: ["Shinjuku Station", "Shibuya Station"],
      destinations: ["Tokyo Tower"],
    });

    expect(result.isError).toBeUndefined();
    expect(parseContent(result)).toEqual(mockMatrix);
    expect(distanceMatrix).toHaveBeenCalledWith(
      expect.objectContaining({ origins: ["Shinjuku Station", "Shibuya Station"] })
    );
  });

  it("defaults mode to TRANSIT", async () => {
    vi.mocked(distanceMatrix).mockResolvedValue(mockMatrix);

    await distanceMatrixHandler({ origins: ["A"], destinations: ["B"] });

    expect(distanceMatrix).toHaveBeenCalledWith(expect.objectContaining({ mode: "TRANSIT" }));
  });

  it("caches result and avoids duplicate API calls", async () => {
    vi.mocked(distanceMatrix).mockResolvedValue(mockMatrix);

    await distanceMatrixHandler({ origins: ["Shinjuku Station"], destinations: ["Tokyo Tower"] });
    await distanceMatrixHandler({ origins: ["Shinjuku Station"], destinations: ["Tokyo Tower"] });

    expect(distanceMatrix).toHaveBeenCalledTimes(1);
  });

  it("returns error content on API failure", async () => {
    vi.mocked(distanceMatrix).mockRejectedValue(new Error("Distance Matrix API error: OVER_DAILY_LIMIT"));

    const result = await distanceMatrixHandler({ origins: ["A"], destinations: ["B"] });

    expect(result.isError).toBe(true);
    expect(parseContent(result).error).toContain("OVER_DAILY_LIMIT");
  });
});

// ---------------------------------------------------------------------------
// maps_timezone
// ---------------------------------------------------------------------------

describe("maps_timezone", () => {
  const mockTimezone = {
    timezone_id: "Asia/Tokyo",
    timezone_name: "Japan Standard Time",
    utc_offset_seconds: 32400,
    dst_offset_seconds: 0,
  };

  it("returns timezone info for coordinates", async () => {
    vi.mocked(timezoneInfo).mockResolvedValue(mockTimezone);

    const result = await timezoneHandler({ latitude: 35.6762, longitude: 139.6503 });

    expect(result.isError).toBeUndefined();
    expect(parseContent(result)).toEqual(mockTimezone);
    expect(timezoneInfo).toHaveBeenCalledWith(
      expect.objectContaining({ lat: 35.6762, lng: 139.6503 })
    );
  });

  it("passes explicit timestamp", async () => {
    vi.mocked(timezoneInfo).mockResolvedValue(mockTimezone);

    await timezoneHandler({ latitude: 35.6762, longitude: 139.6503, timestamp: 1744268400 });

    expect(timezoneInfo).toHaveBeenCalledWith(
      expect.objectContaining({ timestamp: 1744268400 })
    );
  });

  it("caches result and avoids duplicate API calls", async () => {
    vi.mocked(timezoneInfo).mockResolvedValue(mockTimezone);

    await timezoneHandler({ latitude: 35.6762, longitude: 139.6503 });
    await timezoneHandler({ latitude: 35.6762, longitude: 139.6503 });

    expect(timezoneInfo).toHaveBeenCalledTimes(1);
  });

  it("returns error content on API failure", async () => {
    vi.mocked(timezoneInfo).mockRejectedValue(new Error("Timezone API error: REQUEST_DENIED"));

    const result = await timezoneHandler({ latitude: 0, longitude: 0 });

    expect(result.isError).toBe(true);
    expect(parseContent(result).error).toContain("REQUEST_DENIED");
  });
});
