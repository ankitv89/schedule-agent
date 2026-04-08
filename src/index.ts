import "dotenv/config";
import express from "express";
import { mcpRouter } from "./mcp/server";
import { MCPClientManager } from "./mcp/client";
import { Orchestrator } from "./agents/Orchestrator";

const app = express();
const PORT = process.env.PORT || 8080;


// Mount the MCP SSE Server
app.use("/mcp", mcpRouter);

let orchestrator: Orchestrator;

async function initSystem() {
  const serverUrl = `http://localhost:${PORT}/mcp/sse`;
  const mcpClient = new MCPClientManager(serverUrl);
  
  console.log("Connecting MCP Client to MCP Server at", serverUrl);
  // Wait a small bit for express to be listening
  setTimeout(async () => {
    try {
      await mcpClient.connect();
      orchestrator = new Orchestrator(mcpClient.getLangchainTools());
      console.log("Multi-Agent system ready.");
    } catch (e) {
      console.error("Failed to connect MCP client", e);
    }
  }, 1000);
}

app.post("/api/chat", express.json(), async (req, res) => {
  const { message, sessionId = "default-session" } = req.body;
  
  if (!orchestrator) {
    return res.status(503).json({ error: "Agent system not ready yet" });
  }
  
  if (!message) {
    return res.status(400).json({ error: "Missing message body" });
  }
  
  const response = await orchestrator.handleUserMessage(message, sessionId);
  res.json({ response });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  initSystem();
});
