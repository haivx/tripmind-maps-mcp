import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cache } from "../src/utils/cache.js";

beforeEach(() => {
  cache.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("cache", () => {
  it("stores and retrieves a value", () => {
    cache.set("key1", { score: 42 }, 10_000);
    expect(cache.get("key1")).toEqual({ score: 42 });
  });

  it("returns null for a missing key", () => {
    expect(cache.get("nonexistent")).toBeNull();
  });

  it("returns null for an expired entry", () => {
    cache.set("expiring", "value", 5_000);
    vi.advanceTimersByTime(6_000);
    expect(cache.get("expiring")).toBeNull();
  });

  it("does not expire an entry before its TTL", () => {
    cache.set("stable", "value", 10_000);
    vi.advanceTimersByTime(9_999);
    expect(cache.get("stable")).toBe("value");
  });

  it("has() returns true for a valid entry", () => {
    cache.set("present", 1, 10_000);
    expect(cache.has("present")).toBe(true);
  });

  it("has() returns false for a missing key", () => {
    expect(cache.has("missing")).toBe(false);
  });

  it("has() returns false for an expired entry", () => {
    cache.set("temp", 1, 1_000);
    vi.advanceTimersByTime(2_000);
    expect(cache.has("temp")).toBe(false);
  });

  it("delete removes a specific entry", () => {
    cache.set("deleteme", "x", 60_000);
    cache.delete("deleteme");
    expect(cache.get("deleteme")).toBeNull();
  });

  it("clear empties all entries", () => {
    cache.set("a", 1, 60_000);
    cache.set("b", 2, 60_000);
    cache.clear();
    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBeNull();
  });
});
