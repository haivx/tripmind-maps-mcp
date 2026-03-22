# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-03-22

### Added
- `maps_directions` — door-to-door routing via Google Routes API v2 (1h cache)
- `maps_distance_matrix` — multi-origin/destination distance + duration grid (1h cache)
- `maps_timezone` — timezone lookup by coordinates (90-day cache)
- HTTP transport mode: `--http` flag or `HTTP_MODE=true` starts an Express server on `/mcp`
- Retry with exponential backoff (`withRetry` in `google-client.ts`): retries on 5xx, 429, and network errors; backoff 1s/2s/4s
- `assertRateLimit(key)` helper in `rate-limiter.ts`; HTTP mode rate-limits per client IP via Express middleware
- `vitest.config.ts` for explicit test configuration
- `tests/cache.test.ts` — 9 unit tests for cache utility (fake timers)
- `tests/geocode.test.ts` — 10 focused unit tests for geocode tool
- Annotations and invalid-input tests added to `tests/tools.test.ts` (55 tests total)

### Changed
- All Google API calls in `google-client.ts` now wrapped with `withRetry` for transient-failure resilience
- `src/index.ts` refactored: `createMcpServer()` helper shared by both stdio and HTTP transports

## [0.2.0] - 2026-03-22

### Added
- `maps_search_places` — text search with location bias, radius, and type filter (Places API, 24h cache)
- `maps_place_details` — rich place info with friendly field aliases (phone, hours, address) and 7-day cache
- Integration test suite (`tests/tools.test.ts`) — 15 tests with mocked Google API for all 3 tools
- ESLint 9 flat config (`eslint.config.js`) with TypeScript support and `no-console` enforcement

## [0.1.0] - 2026-03-22

### Added
- Initial project setup with MCP SDK + TypeScript (ES2022, strict mode)
- `maps_geocode` — forward & reverse geocoding with 30-day cache
- In-memory cache with TTL (`src/utils/cache.ts`)
- Per-key rate limiter (`src/utils/rate-limiter.ts`)
- Google Maps API client wrapper (`src/utils/google-client.ts`)
- stdio transport for Claude Code / Claude Desktop
- Claude Code workflow: commands, agents, skills, hooks, rules
- MCP Inspector support for debugging
