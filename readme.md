# 🎯 Goalsetter — AI-Powered MERN App with MCP + Gemini

A full-stack MERN application that lets authenticated users manage personal goals through a natural-language AI Assistant, powered by **Google Gemini 2.5 Flash** and an **MCP (Model Context Protocol) tool-calling architecture**.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                     │
│         User types a prompt → Chat UI renders reply         │
└───────────────────────────┬─────────────────────────────────┘
                            │ POST /api/chat
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express / Node)                  │
│  chatController.js → Calls Google Gemini 2.5 Flash API      │
│  Gemini decides which MCP tool to call (get/create/delete)  │
└───────────────────────────┬─────────────────────────────────┘
                            │ stdio (child process)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  MCP Server (mcp-server/)                   │
│   Exposes tools: get_goals / create_goal / delete_goal      │
│   Calls the backend REST API with internal auth headers     │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST API calls
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                MongoDB (local or Atlas)                     │
│                    Users + Goals collections                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🤖 AI Model Used

| Detail | Value |
|---|---|
| **Provider** | Google Gemini (via `@google/generative-ai` SDK) |
| **Model** | `gemini-2.5-flash` |
| **Free Tier** | ✅ Yes — no billing required for the free tier |
| **Feature Used** | Function Calling (tool use) with multi-turn conversations |

The model is configured via `GEMINI_MODEL` in your `.env` file. You can swap it to any available Gemini model (e.g. `gemini-2.0-flash`) without code changes.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Redux Toolkit, Axios |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB |
| AI | Google Gemini 2.5 Flash |
| AI Protocol | MCP (Model Context Protocol) |
| Auth | JWT (JSON Web Tokens) |

---

## 📋 Prerequisites

Make sure you have these installed before starting:

- **Node.js** v18 or higher → [https://nodejs.org](https://nodejs.org)
- **MongoDB** (local) → [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)  
  _Or use a free MongoDB Atlas cluster → [https://cloud.mongodb.com](https://cloud.mongodb.com)_
- **Google Gemini API Key** (free) → [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

---

## 🚀 Local Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd mern-tutorial
```

### 2. Install root dependencies (Backend + MCP client)

```bash
npm install
```

This installs:
- `express`, `mongoose`, `jsonwebtoken`, `bcryptjs` — backend core
- `@modelcontextprotocol/sdk` — MCP client (connects backend → MCP server)
- `@google/generative-ai` — Google Gemini SDK
- `dotenv`, `express-async-handler`, `colors`, `concurrently`, `nodemon`

### 3. Install MCP Server dependencies

```bash
cd mcp-server
npm install
cd ..
```

This installs the MCP server's own copy of:
- `@modelcontextprotocol/sdk` — MCP server SDK
- `mongoose`, `dotenv`, `jsonwebtoken`, `bcryptjs`

### 4. Install Frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 5. Set up environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Then open `.env` and set:

```env
NODE_ENV = development
PORT = 5000

# Your local or Atlas MongoDB connection string
MONGO_URI = mongodb://127.0.0.1:27017/mernapp

# Any random string for signing JWTs
JWT_SECRET = your_secret_here

# Leave as-is for local setup
MCP_AUTH_SESSION_FILE=.mcp-auth-session.json

# Get your free key at https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# The Gemini model to use (free, no billing needed)
GEMINI_MODEL=gemini-2.5-flash
```

---

## ▶️ Running the App

### Run backend + frontend together (recommended)

```bash
npm run dev
```

This starts:
- **Backend** at `http://localhost:5000` (nodemon, hot-reload)
- **Frontend** at `http://localhost:3000` (React dev server)
- **MCP Server** is launched automatically as a child process by the backend

### Run backend only

```bash
npm run server
```

### Run frontend only

```bash
npm run client
```

---

## 🔑 How to Get a Free Gemini API Key

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API key"**
4. Copy the key and paste it as `GEMINI_API_KEY` in your `.env` file

> **Note:** The `gemini-2.5-flash` model is available on Google's free tier with generous rate limits. No credit card or billing required.

---

## 📁 Project Structure

```
mern-tutorial/
├── backend/
│   ├── config/          # MongoDB connection
│   ├── controllers/     # Route handlers (users, goals, chat)
│   ├── middleware/      # Auth (JWT protect) + error handler
│   ├── models/          # Mongoose schemas (User, Goal)
│   ├── routes/          # Express routers
│   ├── services/        # mcpClient.js — connects to MCP server
│   └── server.js        # Express app entry point
│
├── mcp-server/
│   └── index.js         # MCP server — exposes get/create/delete goal tools
│
├── frontend/
│   └── src/
│       ├── components/  # ChatInterface, GoalForm, GoalItem, Header
│       ├── features/    # Redux slices for auth and goals
│       └── pages/       # Dashboard, Login, Register
│
├── .env.example         # Copy this to .env and fill in your values
└── package.json         # Root scripts (dev, server, client)
```

---

## 🔐 Security Notes

- The `user_id` is **never exposed to the Gemini model** — it is injected server-side only.
- The MCP server uses internal API key headers (`X-Server-Api-Key`) — not user tokens.
- The `.env` file is excluded from git via `.gitignore`. **Never commit real secrets.**

---

## 🐛 Troubleshooting

| Problem | Solution |
|---|---|
| `EADDRINUSE: port 5000` | Another process is using port 5000. Run `taskkill /F /IM node.exe` (Windows) or `pkill node` (Mac/Linux) |
| `MongoDB connection failed` | Make sure MongoDB is running locally, or update `MONGO_URI` with your Atlas connection string |
| AI response is empty / blocked | Check your `GEMINI_API_KEY` is correct and the model name in `GEMINI_MODEL` is valid |
| MCP tools not working | The MCP server starts automatically — check backend console for `[Gemini API error]` messages |

---
