const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const path = require("path");

const mcpClient = new Client({
  name: "mern-backend-host",
  version: "1.0.0",
}, {
  capabilities: {
    prompts: {},
    resources: {},
    tools: {},
  },
});

let transport;
let toolsPromise;

async function setupMcpClient() {
  const serverPath = path.resolve(__dirname, '../../mcp-server/index.js');
  
  transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
  });

  await mcpClient.connect(transport);
  
  // Cache the tools list
  const response = await mcpClient.listTools();
  return response.tools;
}

toolsPromise = setupMcpClient();

async function getTools() {
  return await toolsPromise;
}

async function callTool(name, args) {
  // Wait for setup to complete if it hasn't
  await toolsPromise;
  
  const result = await mcpClient.callTool({
    name,
    arguments: args
  });
  return result;
}

module.exports = {
  mcpClient,
  getTools,
  callTool
};
