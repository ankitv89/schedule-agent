import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { PrismaClient } from "@prisma/client";
import express from "express";

const prisma = new PrismaClient();

export const mcpServer = new Server(
  {
    name: "schedule-agent-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_task",
        description: "Create a new task in the database.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
          },
          required: ["title"],
        },
      },
      {
        name: "list_tasks",
        description: "List all uncompleted tasks.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "create_event",
        description: "Create a new calendar event.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            startTime: { type: "string", description: "ISO 8601 date string" },
            endTime: { type: "string", description: "ISO 8601 date string" },
            location: { type: "string" }
          },
          required: ["title", "startTime", "endTime"],
        },
      },
      {
        name: "list_events",
        description: "List calendar events.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "save_note",
        description: "Save a note in the database.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            tags: { type: "string", description: "Comma separated tags." },
          },
          required: ["title", "content", "tags"],
        },
      },
      {
        name: "search_notes",
        description: "Search notes by text.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
          required: ["query"],
        },
      }
    ],
  };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "create_task") {
      const task = await prisma.task.create({
        data: {
          title: args?.title as string,
          description: args?.description as string | undefined,
        },
      });
      return { toolResult: task, content: [{ type: "text", text: `Task created: ${JSON.stringify(task)}` }] };
    }
    else if (name === "list_tasks") {
      const tasks = await prisma.task.findMany({ where: { status: "pending" } });
      return { toolResult: tasks, content: [{ type: "text", text: `Tasks: ${JSON.stringify(tasks)}` }] };
    }
    else if (name === "create_event") {
      const dbEvent = await prisma.event.create({
        data: {
          title: args?.title as string,
          startTime: new Date(args?.startTime as string),
          endTime: new Date(args?.endTime as string),
          location: args?.location as string | undefined,
        },
      });
      return { toolResult: dbEvent, content: [{ type: "text", text: `Event created: ${JSON.stringify(dbEvent)}` }] };
    }
    else if (name === "list_events") {
      const events = await prisma.event.findMany({
        orderBy: { startTime: 'asc' },
      });
      return { toolResult: events, content: [{ type: "text", text: `Events: ${JSON.stringify(events)}` }] };
    }
    else if (name === "save_note") {
      const note = await prisma.note.create({
        data: {
          title: args?.title as string,
          content: args?.content as string,
          tags: args?.tags as string,
        },
      });
      return { toolResult: note, content: [{ type: "text", text: `Note created: ${JSON.stringify(note)}` }] };
    }
    else if (name === "search_notes") {
      const query = args?.query as string;
      const notes = await prisma.note.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { tags: { contains: query } },
          ],
        },
      });
      return { toolResult: notes, content: [{ type: "text", text: `Notes found: ${JSON.stringify(notes)}` }] };
    }

    return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  } catch (error: any) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
  }
});

let transport: SSEServerTransport;
export const mcpRouter = express.Router();

mcpRouter.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/mcp/messages", res);
  await mcpServer.connect(transport);
});

mcpRouter.post("/messages", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(500).send("Transport not established");
  }
});
