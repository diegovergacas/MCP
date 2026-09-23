import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./create-server.js";

void serveStdio(createServer);
console.error("mcp-maker running on stdio");
