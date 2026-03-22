import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/utils/google-client.js", () => ({
  geocode: vi.fn(),
  searchPlaces: vi.fn(),
  placeDetails: vi.fn(),
  computeRoute: vi.fn(),
  distanceMatrix: vi.fn(),
  timezoneInfo: vi.fn(),
}));

import { geocode } from "../src/utils/google-client.js";
import { cache } from "../src/utils/cache.js";
import { handler } from "../src/tools/geocode.js";

const TOKYO_TOWER = {
  formatted_address: "4-2-8 Shibakoen, Minato City, Tokyo 105-0011, Japan",
  location: { lat: 35.6586, lng: 139.7454 },
  place_id: "ChIJcd0dDGGLGGARzYPACZ_jUeU",
  types: ["tourist_attraction", "point_of_interest"],
};

function parseContent(result: { content: Array<{ type: string; text: string }> }) {
  return JSON.parse(result.content[0]!.text);
}

beforeEach(() => {
  vi.clearAllMocks();
  cache.clear();
  process.env["GOOGLE_MAPS_API_KEY"] = "test-key";
});

describe("maps_geocode handler", () => {
  describe("forward geocoding", () => {
    it("returns geocoded results for a text address", async () => {
      vi.mocked(geocode).mockResolvedValue([TOKYO_TOWER]);

      const result = await handler({ address: "Tokyo Tower" });

      expect(result.isError).toBeUndefined();
      expect(parseContent(result)).toEqual([TOKYO_TOWER]);
      expect(geocode).toHaveBeenCalledWith(
        expect.objectContaining({ address: "Tokyo Tower" })
      );
    });

    it("normalises address: lowercases for cache key, passes original to API", async () => {
      vi.mocked(geocode).mockResolvedValue([TOKYO_TOWER]);

      await handler({ address: "  TOKYO TOWER  " });

      expect(geocode).toHaveBeenCalledWith(
        expect.objectContaining({ address: "  TOKYO TOWER  " })
      );
    });

    it("forwards the language parameter", async () => {
      vi.mocked(geocode).mockResolvedValue([TOKYO_TOWER]);

      await handler({ address: "Tokyo Tower", language: "ja" });

      expect(geocode).toHaveBeenCalledWith(
        expect.objectContaining({ language: "ja" })
      );
    });
  });

  describe("reverse geocoding", () => {
    it("returns address from lat/lng coordinates", async () => {
      vi.mocked(geocode).mockResolvedValue([TOKYO_TOWER]);

      const result = await handler({ latitude: 35.6586, longitude: 139.7454 });

      expect(result.isError).toBeUndefined();
      expect(geocode).toHaveBeenCalledWith(
        expect.objectContaining({ latlng: { lat: 35.6586, lng: 139.7454 } })
      );
    });
  });

  describe("validation", () => {
    it("returns isError when neither address nor coordinates are provided", async () => {
      const result = await handler({});

      expect(result.isError).toBe(true);
      const body = parseContent(result);
      expect(body.error).toMatch(/address/i);
      expect(geocode).not.toHaveBeenCalled();
    });

    it("returns isError when only latitude is provided (missing longitude)", async () => {
      const result = await handler({ latitude: 35.6586 });

      expect(result.isError).toBe(true);
      expect(geocode).not.toHaveBeenCalled();
    });
  });

  describe("caching", () => {
    it("returns cached result on second call without hitting the API again", async () => {
      vi.mocked(geocode).mockResolvedValue([TOKYO_TOWER]);

      await handler({ address: "Tokyo Tower" });
      const second = await handler({ address: "Tokyo Tower" });

      expect(geocode).toHaveBeenCalledTimes(1);
      expect(parseContent(second)).toEqual([TOKYO_TOWER]);
    });

    it("uses separate cache keys for forward and reverse geocoding", async () => {
      vi.mocked(geocode).mockResolvedValue([TOKYO_TOWER]);

      await handler({ address: "Tokyo Tower" });
      await handler({ latitude: 35.6586, longitude: 139.7454 });

      expect(geocode).toHaveBeenCalledTimes(2);
    });
  });

  describe("error handling", () => {
    it("returns isError when the Google API throws", async () => {
      vi.mocked(geocode).mockRejectedValue(new Error("API quota exceeded"));

      const result = await handler({ address: "Tokyo Tower" });

      expect(result.isError).toBe(true);
      expect(parseContent(result).error).toContain("quota");
    });

    it("does not cache failed results", async () => {
      vi.mocked(geocode)
        .mockRejectedValueOnce(new Error("Temporary error"))
        .mockResolvedValueOnce([TOKYO_TOWER]);

      await handler({ address: "Tokyo Tower" });
      const second = await handler({ address: "Tokyo Tower" });

      expect(geocode).toHaveBeenCalledTimes(2);
      expect(second.isError).toBeUndefined();
    });
  });
});
