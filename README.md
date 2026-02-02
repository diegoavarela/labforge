# LabForge

Visual plugin builder for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Design commands, agents, skills, hooks, and MCP integrations through a node-based workflow editor — then export ready-to-use plugins.

## Features

- **Visual workflow editor** — Drag-and-drop node graph for building command flows (branching, loops, parallel execution, shell steps, prompts, and more)
- **Agent designer** — Configure AI agents with custom models, tools, skills, and instructions
- **Skill editor** — Write and organize reusable skills with a built-in Monaco code editor
- **MCP integrations** — Browse, configure, and wire Model Context Protocol servers
- **Hook system** — Define event-driven actions triggered by bash commands, MCP calls, or agents
- **Plugin library** — Manage multiple plugins, track versions, import/export
- **GitHub push** — Push plugins directly to GitHub repositories
- **AI assistant** — Built-in chat panel powered by Claude for inline help

## Tech stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · React Flow · Monaco Editor · Zustand · Drizzle ORM · PostgreSQL (Neon)

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL (or a [Neon](https://neon.tech) database)
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
git clone https://github.com/diegoavarela/labforge.git
cd labforge
pnpm install
```

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `LABFORGE_ANTHROPIC_KEY` | Yes | Anthropic API key for the chat assistant |
| `AUTH_GITHUB_ID` | For GitHub push | GitHub OAuth app client ID |
| `AUTH_GITHUB_SECRET` | For GitHub push | GitHub OAuth app client secret |
| `AUTH_SECRET` | For GitHub push | NextAuth secret (`openssl rand -base64 32`) |
| `GITHUB_TOKEN` | No | Higher rate limits for the skills registry |

Run the database migrations:

```bash
pnpm drizzle-kit push
```

Start the dev server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/            Next.js pages and API routes
components/     React components (canvas, flow, layout, ui, ...)
stores/         Zustand state stores
lib/            Utilities (AI, auth, db, generator, validator, ...)
types/          TypeScript type definitions
drizzle/        Database migrations
```

## License

[MIT](LICENSE)
