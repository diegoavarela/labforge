# Plugin Forge - UX Redesign v2

## Problema con la UI actual

La UI actual trata Skills, Agents, Commands, Hooks y MCPs como tabs independientes.
En realidad son piezas interconectadas: un Command orquesta Agents que usan Skills y MCPs.
La UI debe reflejar esas conexiones, no esconderlas en tabs separados.

## Principios de diseño

1. **Command-centric pero no command-only**: El Command Flow es el corazón visual, pero podés empezar armando un Agent o un Skill y conectarlo después.
2. **Multiple entry points**: Top-down (empezás por el Command), bottom-up (empezás por un Agent/Skill), o por exploración (buscás algo que exista).
3. **Everything is connected**: Siempre ves qué usa qué. Un Agent muestra sus Skills. Un Command muestra sus Agents. Un Skill muestra quién lo usa.
4. **Chat drives, canvas shows**: El chat crea componentes. El canvas los visualiza. Drag & drop para conectar.
5. **No tabs**: Un workspace unificado con panel de inventario, canvas central, y panel de propiedades/chat.

## Design System

### Estilo: Vercel/Linear-inspired
- **NO** 8-bit, NO pixel art, NO retro
- Clean, profesional, premium SaaS
- Light + Dark mode con toggle

### Tipografía
- **UI text**: Geist Sans (o Inter como fallback)
- **Code/monospace**: Geist Mono (solo para código, IDs, paths)
- **NO** Press Start 2P, NO JetBrains Mono para UI

### Colores
- **Acento principal**: Naranja #D97757
- **Dark mode**: bg #09090b, surfaces #18181b, borders #27272a
- **Light mode**: bg #fafafa, surfaces #ffffff, borders #e4e4e7
- **Colores semánticos por tipo**:
  - Skill: #3b82f6 (blue)
  - Agent: #a855f7 (purple)
  - Command: #22c55e (green)
  - Hook: #f97316 (orange)
  - MCP: #22d3ee (cyan)

### Componentes
- Bordes: rounded-lg (8px), cards rounded-xl
- Sombras: sutiles, no retro
- Transiciones: 200ms ease, no blink/glow
- Botones: rounded-lg, hover opacity/scale
- Inputs: rounded-lg, focus ring naranja

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ HEADER                                                               │
│ Plugin Forge    [plugin-name]           [☀/🌙] [Export ▼] [GitHub]  │
├──────────┬──────────────────────────────────────┬────────────────────┤
│          │                                      │                    │
│ INVENTORY│           CANVAS                     │  CHAT / PROPERTIES │
│          │                                      │                    │
│ ┌──────┐ │  Dinámico según selección:           │  ┌──────────────┐  │
│ │Search│ │                                      │  │ 🤖 Chat      │  │
│ └──────┘ │  • Command → Flow Builder            │  │              │  │
│          │  • Agent → Agent config              │  │ I created a  │  │
│ COMMANDS │  • Skill → Skill editor              │  │ deploy cmd   │  │
│ /deploy  │  • Nothing → Welcome/overview        │  │ with 3 steps │  │
│ /test    │                                      │  │              │  │
│          │                                      │  │ Want me to   │  │
│ AGENTS   │                                      │  │ add error    │  │
│ ◆ review │                                      │  │ handling?    │  │
│ ◆ deploy │                                      │  │              │  │
│          │                                      │  ├──────────────┤  │
│ SKILLS   │                                      │  │ Properties   │  │
│ ● git    │                                      │  │ (when node   │  │
│ ● docker │                                      │  │  selected)   │  │
│          │                                      │  │              │  │
│ MCPs     │                                      │  │ Name: [   ]  │  │
│ ○ github │                                      │  │ Agent: [ ▼]  │  │
│ ○ slack  │                                      │  │ Skills: ...  │  │
│          │                                      │  └──────────────┘  │
│ HOOKS    │                                      │                    │
│ △ on-push│                                      │  ┌──────────────┐  │
│          │                                      │  │ describe...  │  │
│ [+ New ▼]│                                      │  └──────────────┘  │
├──────────┴──────────────────────────────────────┴────────────────────┤
└──────────────────────────────────────────────────────────────────────┘
```

### Panel izquierdo: INVENTORY (240px, collapsible)

Todo tu inventario en un solo panel scrolleable, agrupado por tipo.

```
┌─ INVENTORY ──────────────┐
│ 🔍 Search all...         │
├──────────────────────────┤
│                          │
│ COMMANDS (2)         [+] │
│ ├─ /deploy      ●3nodes │
│ └─ /test-suite  ●5nodes │
│                          │
│ AGENTS (3)           [+] │
│ ├─ ◆ code-reviewer      │
│ ├─ ◆ deploy-agent       │
│ └─ ◆ test-runner        │
│                          │
│ SKILLS (4)           [+] │
│ ├─ ● github-skill       │
│ ├─ ● docker-skill       │
│ ├─ ● eslint-skill       │
│ └─ ● testing-skill      │
│                          │
│ MCPs (2)             [+] │
│ ├─ ○ @github/mcp        │
│ └─ ○ @slack/mcp         │
│                          │
│ HOOKS (1)            [+] │
│ └─ △ post-commit-notify  │
│                          │
└──────────────────────────┘
```

**Comportamientos**:
- Click en un item → lo selecciona, canvas central cambia a su vista
- Drag un item → lo podés soltar en el canvas (si estás en un Command flow, agrega el nodo)
- Cada sección tiene [+] para crear nuevo
- Indicador de conexiones: un Agent muestra cuántos Commands lo usan
- Color-coded por tipo (dot o borde izquierdo)
- Collapsible por sección
- Search filtra across all types

### Centro: CANVAS (flex, min-width)

El canvas es dinámico según qué tenés seleccionado:

#### A) Nada seleccionado → Welcome/Overview

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              Plugin Forge                       │
│                                                 │
│    Describe what you want to build in the       │
│    chat below, or start by creating:            │
│                                                 │
│    [+ Command]  [+ Agent]  [+ Skill]            │
│                                                 │
│    ─────────────────────────────────            │
│                                                 │
│    YOUR PLUGIN: plugin-name                     │
│    Components: 2 commands, 3 agents, 4 skills   │
│    MCPs: github, slack                          │
│                                                 │
│    ┌─ DEPENDENCY GRAPH ──────────────┐          │
│    │                                 │          │
│    │  /deploy ──→ deploy-agent       │          │
│    │              ├─ docker-skill    │          │
│    │              └─ @github/mcp     │          │
│    │                                 │          │
│    │  /test ──→ test-runner          │          │
│    │            ├─ testing-skill     │          │
│    │            └─ eslint-skill      │          │
│    │                                 │          │
│    └─────────────────────────────────┘          │
│                                                 │
└─────────────────────────────────────────────────┘
```

Muestra un overview del plugin con un mini dependency graph.

#### B) Command seleccionado → Flow Builder

```
┌─────────────────────────────────────────────────┐
│ ⊕ ⊖ ⊞ 🗺 📋   /deploy                         │
├─────────────────────────────────────────────────┤
│                                                 │
│   ┌─────────┐                                   │
│   │  START  │                                   │
│   │ /deploy │                                   │
│   └────┬────┘                                   │
│        │                                        │
│        ▼                                        │
│   ┌─────────┐     ┌──────────────────┐          │
│   │  STEP   │     │  Detail panel:   │          │
│   │ Run     │────▶│  Agent: test-run │          │
│   │ Tests   │     │  Skills: eslint  │          │
│   └────┬────┘     │  MCP: -          │          │
│        │          └──────────────────┘          │
│        ▼                                        │
│   ┌─────────┐                                   │
│   │CONDITION│                                   │
│   │tests ok?│                                   │
│   └──┬───┬──┘                                   │
│    ✓ │   │ ✗                                    │
│      ▼   ▼                                      │
│  ┌─────┐ ┌─────┐                                │
│  │AGENT│ │NOTIF│                                │
│  │deplo│ │fail │                                │
│  └─────┘ └─────┘                                │
│                                                 │
│  [minimap]                                      │
└─────────────────────────────────────────────────┘
```

**Drag & drop**:
- Drag un Agent/Skill/MCP del INVENTORY al canvas → crea un nodo
- Drag entre nodos → crea edge/conexión
- Click nodo → panel derecho muestra sus propiedades
- Click nodo Agent → ve qué Skills usa, puede agregar más
- Double-click nodo → edita inline

**Toolbar** (arriba del canvas):
- Zoom in/out, fit view, minimap toggle
- Export markdown
- Command name editable

#### C) Agent seleccionado → Agent Editor

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  ◆ code-reviewer                                │
│  "Reviews pull requests and suggests fixes"     │
│                                                 │
│  ┌─ CONFIGURATION ──────────────────────────┐   │
│  │ Name:  [code-reviewer                  ] │   │
│  │ Desc:  [Reviews pull requests and...   ] │   │
│  │ Model: [claude-sonnet-4 ▼              ] │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  ┌─ SKILLS (2) ─────────────────────── [+] ─┐   │
│  │ ● github-skill    [×]                     │   │
│  │ ● eslint-skill    [×]                     │   │
│  │                                           │   │
│  │ Drop skills here or click [+] to add      │   │
│  └───────────────────────────────────────────┘   │
│                                                 │
│  ┌─ MCPs (1) ──────────────────────── [+] ──┐   │
│  │ ○ @github/mcp     [×]                    │   │
│  │                                           │   │
│  │ Drop MCPs here or click [+] to add        │   │
│  └───────────────────────────────────────────┘   │
│                                                 │
│  ┌─ USED BY ────────────────────────────────┐   │
│  │ → /deploy (step 2)                        │   │
│  │ → /code-review (step 1)                   │   │
│  └───────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Drag & drop**:
- Drag un Skill del INVENTORY → drop en "SKILLS" area → adds it
- Drag un MCP del INVENTORY → drop en "MCPs" area → adds it
- "USED BY" section shows which Commands reference this Agent

#### D) Skill seleccionado → Skill Editor

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  ● github-skill                                 │
│                                                 │
│  ┌─ METADATA ───────────────────────────────┐   │
│  │ Name:  [github-skill                   ] │   │
│  │ Desc:  [Interact with GitHub repos     ] │   │
│  │ Source: local | registry                  │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  ┌─ SKILL.md EDITOR ────────────────────────┐   │
│  │                                           │   │
│  │  # GitHub Skill                           │   │
│  │                                           │   │
│  │  This skill enables interaction with      │   │
│  │  GitHub repositories...                   │   │
│  │                                           │   │
│  │  ## Usage                                 │   │
│  │  ...                                      │   │
│  │                                           │   │
│  │  (Monaco editor with markdown preview)    │   │
│  └───────────────────────────────────────────┘   │
│                                                 │
│  ┌─ USED BY ────────────────────────────────┐   │
│  │ ◆ code-reviewer                           │   │
│  │ ◆ deploy-agent                            │   │
│  └───────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### E) MCP seleccionado → MCP Config

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  ○ @github/mcp                                  │
│                                                 │
│  ┌─ CONFIG ─────────────────────────────────┐   │
│  │ Source: registry | custom                 │   │
│  │ Transport: stdio                          │   │
│  │ Command: npx @github/mcp-server           │   │
│  │                                           │   │
│  │ Environment Variables:                    │   │
│  │ GITHUB_TOKEN: [•••••••••••••••••       ]  │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  ┌─ TOOLS AVAILABLE ────────────────────────┐   │
│  │ • create_issue                            │   │
│  │ • create_pull_request                     │   │
│  │ • search_repositories                     │   │
│  │ • get_file_contents                       │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  ┌─ USED BY ────────────────────────────────┐   │
│  │ ◆ code-reviewer                           │   │
│  │ ◆ deploy-agent                            │   │
│  └───────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Panel derecho: CHAT + PROPERTIES (320px, collapsible)

Panel dividido en dos zonas: chat arriba, propiedades abajo. El chat siempre visible. Properties aparece cuando seleccionás algo.

```
┌─ RIGHT PANEL ────────────┐
│ CHAT                     │
│                          │
│ 🤖 I've created a       │
│ deploy command with 3    │
│ steps. The flow uses     │
│ your test-runner agent   │
│ and docker-skill.        │
│                          │
│ Want me to add error     │
│ handling?                │
│                          │
├──────────────────────────┤
│ PROPERTIES (if selected) │
│                          │
│ Node: Step               │
│ Name: [Run Tests      ]  │
│ Agent: [test-runner ▼ ]  │
│ Description:             │
│ [Execute test suite   ]  │
│                          │
│ Skills used:             │
│ ● eslint-skill    [×]    │
│ ● testing-skill   [×]    │
│ [+ Add skill]            │
│                          │
├──────────────────────────┤
│ ┌──────────────────── ⏎┐ │
│ │ describe what to...   │ │
│ └───────────────────────┘ │
└──────────────────────────┘
```

- Chat input siempre visible en el bottom del panel
- Enter to send, Shift+Enter for newline
- Chat + Properties son resizables (drag el divisor)
- Si no hay nada seleccionado, el chat ocupa todo el panel
- El chat puede:
  - Crear cualquier componente (command, agent, skill, MCP, hook)
  - Modificar componentes existentes
  - Buscar en el registry
  - Generar el flow completo de un command
  - Responder preguntas sobre la estructura

---

## Flujos de usuario

### Flow 1: Top-down (empiezo por el Command)

```
User: "Create a deploy command"
  → Chat creates Command, shows flow in canvas
  → Flow has placeholder nodes
  → User drags Agents from inventory to nodes
  → Each Agent shows its Skills
  → User can add/remove Skills per Agent
  → Export generates everything
```

### Flow 2: Bottom-up (empiezo por un Agent)

```
User clicks [+] next to AGENTS
  → Creates new Agent in inventory
  → Canvas shows Agent editor
  → User drags Skills into Agent
  → User drags MCPs into Agent
  → Later, user creates Command
  → Drags the Agent into the Command flow
```

### Flow 3: Exploration (busco algo que exista)

```
User types in search: "github"
  → Inventory filters to show matching items
  → Also shows registry results in panel
  → User adds a Skill from registry
  → It appears in SKILLS section of inventory
  → User drags it into an Agent
```

### Flow 4: Chat-driven (el chat hace todo)

```
User: "Build me a plugin that monitors GitHub PRs,
       runs code review with ESLint, and posts
       results back as PR comments"

Chat:
  → Creates 1 Command: /review-pr
  → Creates 1 Agent: pr-reviewer
  → Adds Skills: eslint-skill, github-skill
  → Adds MCP: @github/mcp
  → Generates flow: START → fetch PR → run eslint → post comment → END
  → Canvas shows the complete flow
  → User can drag to rearrange, click to edit
```

---

## Drag & Drop Matrix

| Source | Target | Result |
|--------|--------|--------|
| Inventory Agent → Command Canvas | Creates Agent node in flow |
| Inventory Skill → Agent editor | Adds Skill to Agent |
| Inventory Skill → Command Canvas | Creates Step node with that Skill |
| Inventory MCP → Agent editor | Adds MCP to Agent |
| Inventory MCP → Command Canvas | Creates MCP node in flow |
| Node → Node (in canvas) | Creates edge/connection |
| Registry result → Inventory | Adds component to plugin |

---

## Implementation Notes

### State Management (Zustand)

The store should maintain relationships:

```typescript
interface Plugin {
  name: string;
  commands: Command[];
  agents: Agent[];
  skills: Skill[];
  mcps: MCP[];
  hooks: Hook[];
}

interface Command {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];  // Each node references an agent/skill/mcp by ID
  edges: FlowEdge[];
}

interface Agent {
  id: string;
  name: string;
  description: string;
  skillIds: string[];  // References to skills in plugin
  mcpIds: string[];    // References to MCPs in plugin
}

// Query helpers:
// getAgentUsage(agentId) → which commands use this agent
// getSkillUsage(skillId) → which agents use this skill
// getMcpUsage(mcpId) → which agents use this MCP
```

### Tech Stack (no changes)
- Next.js 16 + React 19
- Tailwind CSS 4 (CSS variables for theming)
- Zustand (state)
- React Flow (canvas)
- Monaco Editor (skill editor)
- Geist font family (new)
- No new dependencies (no shadcn, no radix)

### Migration from current UI
1. Replace globals.css theme (Terminal Noir → modern)
2. Replace layout (tabs → inventory/canvas/panel)
3. Update all components (rounded, transitions, fonts)
4. Add dark/light mode toggle
5. Implement drag & drop between panels
6. Add "USED BY" relationships in editors
7. Add welcome/overview canvas state
8. Update chat to create components and show them in canvas
