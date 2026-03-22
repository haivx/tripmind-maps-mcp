# Content Safety — Travel Data

This MCP server handles real travel planning data. Accuracy matters.

## Never Fabricate
- Never return hardcoded coordinates, addresses, or place data
- If Google API returns no results, say so — don't guess
- If geocoding is ambiguous (multiple results), return all with confidence scores

## Data Source Attribution
- All location data comes from Google Maps API — always include this context
- Exchange rates, opening hours, and prices can change — always include timestamps
- If a place might be temporarily closed, flag it

## Caching Honesty
- When returning cached results, note the cache age if > 24 hours
- Never cache error responses — always retry on next request
- Timezone data is stable; directions with traffic are ephemeral — cache accordingly
