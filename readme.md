# Goalsetter Application

A full-stack MERN (MongoDB, Express, React, Node.js) application that enables authenticated users to manage personal goals through a natural language interface. The system integrates Google Gemini 2.5 Flash and Model Context Protocol (MCP) to provide an AI assistant capable of creating, reading, and deleting goals directly via conversational prompts.

## Architecture

The application is structured into three primary components:

1. **Frontend (React)**: Provides the user interface, including authentication and chat interactions.
2. **Backend (Node.js/Express)**: Handles REST API requests, database interactions, and orchestrates calls to the Gemini API.
3. **MCP Server**: Runs as a separate process to securely expose core database operations to the AI model.

## Technology Stack

- **Frontend**: React, Redux Toolkit, Axios
- **Backend**: Node.js, Express, Mongoose
- **Database**: MongoDB
- **AI Integration**: Google Gemini 2.5 Flash (via `@google/generative-ai` SDK)
- **Tool Protocol**: Model Context Protocol (MCP)
- **Authentication**: JSON Web Tokens (JWT)

## Prerequisites

Ensure you have the following installed before starting:
- **Node.js** (v18 or higher)
- **MongoDB** (running locally, or a MongoDB Atlas URI)
- **Google Gemini API Key** (available free of charge via Google AI Studio)

## Local Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ishva24/mern-goalsetter-mcp.git
   cd mern-tutorial
   ```

2. **Install Root Dependencies**
   Installs the core backend and MCP client libraries.
   ```bash
   npm install
   ```

3. **Install MCP Server Dependencies**
   ```bash
   cd mcp-server
   npm install
   cd ..
   ```

4. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

5. **Configure Environment Variables**
   Copy the provided environment template:
   ```bash
   cp .env.example .env
   ```
   Open the newly created `.env` file and configure your credentials:
   - `MONGO_URI`: Your local or Atlas MongoDB connection string.
   - `JWT_SECRET`: A secure random string for signing user tokens.
   - `GEMINI_API_KEY`: Your Google Gemini API key.
   - `GEMINI_MODEL`: Leave as `gemini-2.5-flash`.

## Running the Application

To start both the frontend and backend concurrently (recommended for development):

```bash
npm run dev
```

The services will initialize at:
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`

*Note: The MCP Server will automatically launch as a child process managed by the backend. No manual start is required.*

## Security Overview

- **Data Privacy**: Internal user IDs are injected securely during server-side tool resolution and are never exposed to the Gemini model.
- **Access Control**: The MCP Server relies on an internal API key (`X-Server-Api-Key`) rather than exposing frontend tokens, minimizing unauthorized attack vectors.

## Troubleshooting

- **EADDRINUSE (Port 5000)**: If the backend fails to start, ensure no other service is utilizing port 5000. Use `taskkill /F /IM node.exe` (Windows) to clean up orphaned Node processes.
- **Empty AI Responses**: Confirm that your `GEMINI_API_KEY` is valid and the model is explicitly set to `gemini-2.5-flash`.
- **Database Errors**: Verify MongoDB is running locally, or check that your IP allows access if utilizing MongoDB Atlas.

## License

MIT
