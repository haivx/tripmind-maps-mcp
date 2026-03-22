# Changelog

All notable changes to this project will be documented in this file.

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
