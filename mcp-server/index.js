import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from the parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const server = new Server(
  {
    name: "mern-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const API_BASE_URL = "http://localhost:5000/api";
const INTERNAL_API_KEY = process.env.SERVER_API_KEY || 'goalsetter_internal_mcp_key_99x';

// Helper function to handle fetch responses and act-as headers
async function fetchFromBackend(endpoint, method, userId, body = null) {
  // Use Act-As Headers instead of Bearer Tokens
  const headers = {
    "Content-Type": "application/json",
    "X-Server-Api-Key": INTERNAL_API_KEY,
    "X-Acting-For-User": userId,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || `Backend returned status ${response.status}`);
    }

    return data;
  } catch (error) {
     throw new Error(`API Request Failed: ${error.message}`);
  }
}

// Define the available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_goals",
        description: "Fetch all goals for the authenticated user from the backend API.",
        inputSchema: {
          type: "object",
          properties: {
            user_id: {
              type: "string",
              description: "The internal backend ID of the user.",
            },
          },
          required: ["user_id"],
        },
      },
      {
        name: "create_goal",
        description: "Create a new goal for the authenticated user via the backend API.",
        inputSchema: {
          type: "object",
          properties: {
            user_id: {
              type: "string",
              description: "The internal backend ID of the user.",
            },
            text: {
              type: "string",
              description: "The text content of the goal.",
            },
          },
          required: ["user_id", "text"],
        },
      },
      {
        name: "delete_goal",
        description: "Delete a goal via the backend API by its ID.",
        inputSchema: {
          type: "object",
          properties: {
            user_id: {
              type: "string",
              description: "The internal backend ID of the user.",
            },
            goal_id: {
              type: "string",
              description: "The ID of the goal to delete.",
            },
          },
          required: ["user_id", "goal_id"],
        },
      },
    ],
  };
});

// Implement the tool logic
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_goals": {
        if (!args?.user_id) throw new Error("user_id is a required field");
        
        const goals = await fetchFromBackend("/goals", "GET", args.user_id);
        return { content: [{ type: "text", text: JSON.stringify(goals, null, 2) }] };
      }
      
      case "create_goal": {
        if (!args?.text || !args?.user_id) throw new Error("text and user_id are required fields");
        
        const goal = await fetchFromBackend("/goals", "POST", args.user_id, { text: args.text });
        return { content: [{ type: "text", text: `Goal created successfully: \n${JSON.stringify(goal, null, 2)}` }] };
      }
      
      case "delete_goal": {
        if (!args?.goal_id || !args?.user_id) throw new Error("goal_id and user_id are required fields");
        
        const result = await fetchFromBackend(`/goals/${args.goal_id}`, "DELETE", args.user_id);
        return { content: [{ type: "text", text: `Goal deleted successfully: \n${JSON.stringify(result, null, 2)}` }] };
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing tool: ${err.message}`, // Explicitly showing backend errors
        },
      ],
      isError: true,
    };
  }
});

// Start the server using stdio transport
const transport = new StdioServerTransport();
server.connect(transport).catch((err) => {
    console.error(`Server failed to start: ${err.message}`);
    process.exit(1);
});
