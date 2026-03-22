# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - Unreleased

### Added
- Initial project setup with MCP SDK + TypeScript
- `maps_geocode` — forward & reverse geocoding with 30-day cache
- `maps_search_places` — text & nearby search with field masks
- `maps_place_details` — rich place info with configurable fields
- `maps_directions` — route calculation via Routes API
- `maps_distance_matrix` — multi-point distance/time grid
- `maps_timezone` — timezone lookup by coordinates
- In-memory caching with configurable TTL per tool
- Per-key rate limiting
- stdio transport for Claude Code / Claude Desktop
- Streamable HTTP transport for remote deployment
- Claude Code workflow: commands, agents, skills, hooks, rules
- MCP Inspector support for debugging
- Comprehensive test suite with mocked Google API
