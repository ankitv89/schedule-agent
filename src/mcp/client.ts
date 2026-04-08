import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export class MCPClientManager {
  public client: Client;
  private tools: any[] = [];
  private serverUrl: string;

  constructor(serverUrl: string) {
    this.client = new Client({
      name: "schedule-agent-client",
      version: "1.0.0",
    }, {
      capabilities: {}
    });
    this.serverUrl = serverUrl;
  }
  
  async connect() {
    const transport = new SSEClientTransport(new URL(this.serverUrl));
    await this.client.connect(transport);
    
    // Fetch available tools from the MCP server
    const response = await this.client.listTools();
    
    this.tools = response.tools.map((mcpTool: any) => {
       return tool(
         async (input: any) => {
           console.log(`[MCP Client] Calling tool: ${mcpTool.name} with input:`, input);
           const result = await this.client.callTool({
             name: mcpTool.name,
             arguments: input,
           });
           
           if (result.content && Array.isArray(result.content)) {
              return result.content.map((c: any) => c.text).join("\n");
           }
           return JSON.stringify(result);
         },
         {
           name: mcpTool.name,
           description: mcpTool.description,
           schema: this.jsonSchemaToZod(mcpTool.inputSchema)
         }
       );
    });
    console.log(`[MCP Client] Connected to MCP server. Loaded ${this.tools.length} tools.`);
  }

  getLangchainTools() {
    return this.tools;
  }
  
  private jsonSchemaToZod(schema: any): z.ZodType<any> {
    const props = schema.properties || {};
    const req = schema.required || [];
    
    const shape: any = {};
    for (const key of Object.keys(props)) {
      let zType: any = z.string(); 
      if (!req.includes(key)) {
         zType = zType.optional();
      }
      shape[key] = zType;
    }
    
    return z.object(shape);
  }
}
