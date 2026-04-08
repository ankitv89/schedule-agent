import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { PrismaClient } from "@prisma/client";
import express from "express";
import { google } from "googleapis";

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
        description: "Create a new calendar event. Must seamlessly bind the user's provided refresh token.",
        inputSchema: {
          type: "object",
          properties: {
            refreshToken: { type: "string" },
            title: { type: "string" },
            startTime: { type: "string", description: "ISO 8601 date string" },
            endTime: { type: "string", description: "ISO 8601 date string" },
            location: { type: "string" }
          },
          required: ["refreshToken", "title", "startTime", "endTime"],
        },
      },
      {
        name: "list_events",
        description: "List calendar events. Must bind the provided active refresh token.",
        inputSchema: {
          type: "object",
          properties: {
            refreshToken: { type: "string" }
          },
          required: ["refreshToken"]
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
      const oauthLocal = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, "urn:ietf:wg:oauth:2.0:oob");
      oauthLocal.setCredentials({ refresh_token: args?.refreshToken as string });
      const calendarLocal = google.calendar({ version: "v3", auth: oauthLocal });

      const eventInfo = {
        summary: args?.title as string,
        location: args?.location as string | undefined,
        start: { dateTime: args?.startTime as string },
        end: { dateTime: args?.endTime as string },
      };
      
      const gcalRes = await calendarLocal.events.insert({
        calendarId: 'primary',
        requestBody: eventInfo,
      });
      return { toolResult: gcalRes.data, content: [{ type: "text", text: `Google Calendar event created: ${gcalRes.data.htmlLink}` }] };
    }
    else if (name === "list_events") {
      const oauthLocal = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, "urn:ietf:wg:oauth:2.0:oob");
      oauthLocal.setCredentials({ refresh_token: args?.refreshToken as string });
      const calendarLocal = google.calendar({ version: "v3", auth: oauthLocal });

      const gcalRes = await calendarLocal.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      });
      const events = gcalRes.data.items || [];
      const formattedEvents = events.map(e => ({
        title: e.summary,
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        link: e.htmlLink
      }));
      return { toolResult: formattedEvents, content: [{ type: "text", text: `Upcoming events: ${JSON.stringify(formattedEvents)}` }] };
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

let transport: SSEServerTransport | null = null;
export const mcpRouter = express.Router();

mcpRouter.get("/sse", async (req, res) => {
  try {
    if (transport) {
      await mcpServer.close().catch(() => {});
    }
    transport = new SSEServerTransport("/mcp/messages", res);
    await mcpServer.connect(transport);
  } catch (e: any) {
    console.error("SSE Connection Error:", e.message);
    res.status(500).send(e.message);
  }
});

mcpRouter.post("/messages", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(500).send("Transport not established");
  }
});
