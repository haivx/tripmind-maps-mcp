import type { CacheEntry } from "../types.js";

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();

  /**
   * Retrieve a cached value. Returns null if missing or expired.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      console.error(`[cache] miss: ${key}`);
      return null;
    }
    if (Date.now() > entry.expires_at) {
      this.store.delete(key);
      console.error(`[cache] expired: ${key}`);
      return null;
    }
    console.error(`[cache] hit: ${key}`);
    return entry.data;
  }

  /**
   * Store a value with a TTL in milliseconds.
   */
  set<T>(key: string, data: T, ttl_ms: number): void {
    this.store.set(key, { data, expires_at: Date.now() + ttl_ms });
  }

  /** Check if key exists and has not expired. */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /** Remove a specific key. */
  delete(key: string): void {
    this.store.delete(key);
  }

  /** Clear all cached entries. */
  clear(): void {
    this.store.clear();
  }
}

/** Singleton cache instance shared across all tools. */
export const cache = new Cache();
