#!/usr/bin/env node
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { toolName as geocodeName, toolConfig as geocodeConfig, handler as geocodeHandler } from "./tools/geocode.js";
import { toolName as searchPlacesName, toolConfig as searchPlacesConfig, handler as searchPlacesHandler } from "./tools/search-places.js";
import { toolName as placeDetailsName, toolConfig as placeDetailsConfig, handler as placeDetailsHandler } from "./tools/place-details.js";

const server = new McpServer({ name: "tripmind-maps", version: "0.1.0" });

server.registerTool(geocodeName, geocodeConfig, geocodeHandler);
server.registerTool(searchPlacesName, searchPlacesConfig, searchPlacesHandler);
server.registerTool(placeDetailsName, placeDetailsConfig, placeDetailsHandler);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("[tripmind-maps] MCP server started");
