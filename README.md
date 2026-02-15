# LabForge — Visual Skill IDE for OpenClaw

Create, edit, test, visualize, and publish skills for [OpenClaw](https://github.com/openclaw/openclaw) agents.

> **Screenshots coming soon**

## Features

- **Monaco editor** — Full-featured code editor for SKILL.md files and scripts
- **Visual flow editor** — React Flow-based graph with bidirectional SKILL.md sync (edit the flow → updates the markdown, edit the markdown → updates the flow)
- **Import skills** — From ZIP, TAR/TGZ archives, or local folders
- **Export & distribute** — Save locally, share as ZIP with your team, or publish to [ClawHub](https://clawhub.com)
- **Testing panel** — Agent View, Dry Run, Dependency Checker, and Diff View
- **AI chat assistant** — Built-in Claude-powered assistant for skill creation and editing
- **GitHub push** — Push skills directly to GitHub repositories
- **Dark mode** — Full dark theme UI

## Tech Stack

Next.js 14 · React 19 · TypeScript · Tailwind CSS · React Flow · Monaco Editor · Zustand · Drizzle ORM · PostgreSQL

## Getting Started

### Docker (recommended)

```bash
git clone https://github.com/diegoavarela/labforge.git
cd labforge
cp .env.example .env.local
# Edit .env.local with your Anthropic API key
docker compose up
```

Open [http://localhost:3000](http://localhost:3000).

### Local Development

**Prerequisites:** Node.js 20+, PostgreSQL, [Anthropic API key](https://console.anthropic.com/)

```bash
git clone https://github.com/diegoavarela/labforge.git
cd labforge
pnpm install
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `LABFORGE_ANTHROPIC_KEY` | Yes | Anthropic API key for the chat assistant |
| `AUTH_GITHUB_ID` | For GitHub push | GitHub OAuth app client ID |
| `AUTH_GITHUB_SECRET` | For GitHub push | GitHub OAuth app client secret |
| `AUTH_SECRET` | For GitHub push | NextAuth secret (`openssl rand -base64 32`) |
| `GITHUB_TOKEN` | No | Higher rate limits for the skills registry |

Run migrations and start:

```bash
pnpm drizzle-kit push
pnpm dev
```

## Project Structure

```
app/            Next.js pages and API routes
components/     React components (canvas, flow, layout, ui, ...)
stores/         Zustand state stores
lib/            Utilities (AI, auth, db, generator, validator, ...)
types/          TypeScript type definitions
drizzle/        Database migrations
```

## Links

- [OpenClaw](https://github.com/openclaw/openclaw) — The agent framework LabForge builds skills for
- [ClawHub](https://clawhub.com) — Marketplace for sharing and discovering skills

## License

[MIT](LICENSE) © Diego Varela
