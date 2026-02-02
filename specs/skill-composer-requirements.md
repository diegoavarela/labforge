# Plugin Forge - Documento de Requerimientos

## Visión del Producto

Un visual plugin builder para Claude Code (y otros agentic coding tools) que permite crear, componer y gestionar **Skills**, **Agents**, **Commands**, **Hooks** y conexiones **MCP** desde una interfaz moderna. El builder combina componentes existentes del ecosistema (via búsqueda) con componentes nuevos que vos creás, y genera plugins instalables.

**Problema core**: Crear plugins completos para Claude Code requiere conocer la estructura de archivos, los formatos, y qué componentes existen. Plugin Forge te deja armar todo visualmente (o via chat), buscar lo que ya existe, y exportar algo que funciona.

**Usuario target**: Desarrolladores que usan Claude Code u otros agentic coding tools, que necesitan configurar sus agentes/skills/MCPs/flujos para crear o mantener aplicaciones.

**Plataforma**: Web app deployable en Vercel (Next.js)

**Licencia**: Open Source (MIT)

---

## Principios

1. **Builder + Browser**: Construís plugins combinando cosas que ya existen (las buscás) con cosas que vos creás
2. **Chat-first, visual-second**: Todo se puede hacer via chat. La UI visual es para ver y ajustar
3. **Export funcional**: El output es un plugin que se instala directo en Claude Code
4. **Sin fricción**: No necesitás cuenta para usar. Auth solo para guardar y push a GitHub

---

## El Ecosistema de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                          PLUGIN                                 │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  SKILLS  │  │  AGENTS  │  │ COMMANDS │  │  HOOKS   │        │
│  │          │  │          │  │          │  │          │        │
│  │ Sabe     │  │ Worker   │  │ Flow     │  │ Trigger  │        │
│  │ CÓMO     │  │ especial │  │ explícito│  │ reactivo │        │
│  │          │  │          │  │          │  │          │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│       │              │             │              │             │
│       └──────────────┴─────────────┴──────────────┘             │
│                              │                                  │
│                              ▼                                  │
│                        ┌──────────┐                             │
│                        │   MCPs   │                             │
│                        │ Conexión │                             │
│                        │ externa  │                             │
│                        └──────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

| Componente | Invocación | Propósito | Ejemplo |
|------------|------------|-----------|---------|
| **Skill** | Claude decide (por context) | Conocimiento procedural | "Cómo hacer un PDF" |
| **Agent** | Explícito o delegado | Worker especializado | "Agente de code review" |
| **Command** | `/comando` por usuario | Flow determinístico | "/deploy" → test → build → push |
| **Hook** | Evento del sistema | Reacción automática | "Post-commit → notify Slack" |
| **MCP** | Usado por agents/commands/hooks | Conexión a servicios externos | GitHub API, Slack, Linear |

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INPUT                               │
│  "Necesito un agente que haga code review y cree issues"        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     UNIFIED REGISTRY                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │skills.sh│  │skillsmp │  │anthropic│  │ github  │            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
│       └────────────┴────────────┴────────────┘                  │
│                           │                                     │
│                    Normalized Index                             │
│                    (embeddings + metadata)                      │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI COMPOSER                                │
│  1. Semantic search → encuentra componentes relevantes          │
│  2. Analiza compatibilidad (inputs/outputs/MCPs)                │
│  3. Propone composición visual                                  │
│  4. Genera plugin completo                                      │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       OUTPUT                                    │
│  - Plugin completo (skills + agents + commands + hooks)         │
│  - Push a repo GitHub                                           │
│  - Download ZIP                                                 │
│  - Install directo en Claude Code                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Componentes

### 1. Hooks - Sistema de Eventos (Experimental)

> ⚠️ **Nota**: Los hooks dependen de qué eventos exponga Claude Code. Esta sección es especulativa y se ajustará según la API disponible.

Los hooks son **listeners de eventos** que reaccionan automáticamente a lo que pasa en Claude Code.

**Eventos posibles** (pendiente confirmar soporte):
```
SessionStart        → Cuando arranca una sesión
Stop                → Cuando Claude termina de responder  
Notification        → Cuando hay una notificación
```

**Estructura de un hook:**
```javascript
// hooks/notify-on-commit.js
export default {
  event: "Stop",
  matcher: {
    files_modified: (n) => n > 0
  },
  handler: async (context) => {
    // Acción a ejecutar
    await mcp.slack.send(`Session ended: ${context.summary}`)
  }
}
```

**Casos de uso si se soporta:**

| Caso | Evento | Acción |
|------|--------|--------|
| Notificar fin de sesión | Stop | Slack/Discord notification |
| Logging | Stop | Escribir resumen a archivo |
| Enriquecer contexto | SessionStart | Cargar data de API |

**Para MVP**: Si Claude Code no expone eventos, los hooks se omiten del builder y se documenta como "coming soon".

---

### 2. Registry Access

**Estrategia**: Proxy directo a APIs existentes con caché local. No crawlear todo.

**Skills**:

| Fuente | Método | Notas |
|--------|--------|-------|
| anthropics/skills | GitHub API directo | ~30 skills oficiales |
| skills.sh | Proxy a su API/scrape | Leaderboard con ~200 curados |
| skillsmp.com | Scrape on-demand | Solo si el usuario busca algo específico |

**MCPs**:

| Fuente | Método | Notas |
|--------|--------|-------|
| **Official MCP Registry** | REST API oficial | Source of truth |
| PulseMCP | Fallback/enrichment | Si el oficial no tiene algo |

**MCP Registry API** (oficial):
```bash
GET https://registry.modelcontextprotocol.io/v0/servers?limit=20
GET https://registry.modelcontextprotocol.io/v0/servers?search=github
GET https://registry.modelcontextprotocol.io/v0/servers/{server_id}
```

**Caché**:
- Skills: 24 horas en DB
- MCPs: 1 hora (el registry se actualiza seguido)
- Invalidar manual via admin

---

### 3. Schema Unificado

#### Schema para Skills

Cada skill indexado debe tener esta estructura:

```yaml
# Metadata básica
id: string                    # UUID generado
source: string                # "skills.sh" | "skillsmp" | "anthropics" | etc
source_url: string            # URL original
source_ref: string            # e.g., "vercel-labs/agent-skills/vercel-react-best-practices"

# Identidad
name: string                  # Del frontmatter
description: string           # Del frontmatter (máx 200 chars)
full_description: string      # Body del SKILL.md parseado

# Clasificación
categories: string[]          # ["frontend", "react", "vercel"] - inferidas
tags: string[]                # Tags explícitos si existen
agent_compatibility: string[] # ["claude-code", "codex-cli", "cursor", etc]

# Popularidad (si disponible)
installs: number | null       # De skills.sh
stars: number | null          # De GitHub
last_updated: datetime

# Estructura
has_scripts: boolean
has_references: boolean  
has_assets: boolean
scripts: string[]             # Lista de scripts disponibles
dependencies: string[]        # Paquetes requeridos (pip, npm)

# Para composición
inputs: InputSpec[]           # Inferidos del contenido
outputs: OutputSpec[]         # Inferidos del contenido
works_with: string[]          # IDs de skills compatibles (inferido)

# Embeddings
embedding: float[]            # Vector para semantic search
```

#### Schema para MCPs

Cada MCP server indexado debe tener esta estructura:

```yaml
# Metadata básica
id: string                    # UUID o ID del registry
source: string                # "official-registry" | "pulsemcp" | "mcp.so" | etc
source_url: string            # URL original

# Identidad
name: string                  # Nombre del MCP server
description: string           # Descripción corta
full_description: string      # Descripción completa

# Clasificación  
categories: string[]          # ["database", "communication", "devtools", etc]
tags: string[]                # Tags adicionales
vendor: string | null         # "github" | "slack" | "vercel" | null (community)
is_official: boolean          # Si es mantenido por el vendor

# Conexión
transport: string[]           # ["stdio", "sse", "http"]
install_command: string       # e.g., "npx @modelcontextprotocol/server-github"
config_schema: object | null  # JSON Schema para configuración requerida
auth_type: string | null      # "oauth" | "api_key" | "none"

# Capacidades
tools: MCPTool[]              # Lista de tools que expone
resources: MCPResource[]      # Lista de resources que expone
prompts: MCPPrompt[]          # Lista de prompts que expone

# Quality (si disponible, de Glama)
quality_score: number | null  # 0-100
security_score: number | null # 0-100
last_verified: datetime | null

# Popularidad
stars: number | null
downloads: number | null
last_updated: datetime

# Embeddings
embedding: float[]            # Vector para semantic search
```

**MCPTool spec**:
```yaml
name: string                  # e.g., "create_issue"
description: string           # Qué hace el tool
input_schema: object          # JSON Schema de los parámetros
```

**InputSpec / OutputSpec** (para composición de skills):
```yaml
name: string
type: string                  # "file" | "text" | "config" | "event" | etc
description: string
required: boolean
```

---

### 4. Registry / Search Engine

**Tecnología sugerida**:
- Base de datos: SQLite + SQLite-vec (para embeddings) o PostgreSQL + pgvector
- Embeddings: OpenAI text-embedding-3-small o local (e.g., sentence-transformers)

**Funcionalidades**:

1. **Semantic Search**
   ```
   query("monitor github and post to twitter")
   → Returns: [github-monitor skill, twitter-poster skill, webhook-handler skill]
   ```

2. **Búsqueda por categoría/tag**
   ```
   filter(categories: ["frontend"], min_installs: 1000)
   ```

3. **Búsqueda por compatibilidad**
   ```
   find_compatible(skill_id: "github-monitor")
   → Returns skills que pueden conectarse (output → input match)
   ```

---

### 5. AI Composer

**Responsabilidad**: Recibir prompt del usuario, buscar skills relevantes, proponer composición, generar output.

**Flujo**:

```
1. PARSE USER INTENT
   Input: "Necesito un agente que monitoree GitHub y postee en Twitter"
   Output: {
     intent: "automation",
     entities: ["github", "monitor", "twitter", "post"],
     type: "multi-skill-composition"
   }

2. SEARCH REGISTRY
   - Semantic search con el prompt completo
   - Keyword search con entities extraídas
   - Merge y rank resultados

3. ANALYZE COMPATIBILITY
   Para cada skill encontrado:
   - ¿Sus inputs pueden ser satisfechos?
   - ¿Sus outputs son útiles para el goal?
   - ¿Hay gaps que requieren glue code?

4. PROPOSE COMPOSITION
   Generar plan:
   {
     skills_to_use: [
       { id: "github-webhook", role: "trigger" },
       { id: "twitter-poster", role: "action" }
     ],
     glue_needed: [
       { from: "github-webhook.payload", to: "twitter-poster.content", transform: "extract_commit_message" }
     ],
     missing_pieces: []
   }

5. GENERATE OUTPUT
   - Crear estructura de directorios
   - Copiar/referenciar skills existentes
   - Generar glue code (SKILL.md principal que orquesta)
   - Generar instalación/setup instructions
```

**Prompts del Composer** (para Claude Code):

El composer debería tener acceso a:
- El registry completo (o su índice)
- Capacidad de fetch skills específicos para leer su contenido
- Templates para diferentes tipos de output (skill simple, plugin, flow)

---

### 6. Output Generator

**Tipos de output soportados**:

1. **Single Skill** (usa uno existente as-is)
   ```
   Output: Instrucciones de instalación
   /plugin marketplace add owner/repo
   ```

2. **Composed Skill** (combina múltiples)
   ```
   my-composed-skill/
   ├── SKILL.md           # Orquestador
   ├── skills/            # Skills referenciados o copiados
   │   ├── github-monitor/
   │   └── twitter-poster/
   └── glue/
       └── transform.py   # Código de conexión
   ```

3. **Full Plugin** (con hooks, agents, etc)
   ```
   my-plugin/
   ├── .claude-plugin/
   │   └── plugin.json
   ├── skills/
   ├── agents/
   ├── hooks/
   └── commands/
   ```

**Destino del output**:
- Local: `~/.claude/skills/` o `.claude/skills/`
- GitHub: Push a repo nuevo o existente
- Download: ZIP para el usuario

---

## UI/UX - Especificación Completa

### Plataforma
- **Framework**: Next.js 14+ (App Router)
- **Deploy**: Vercel
- **Flow Builder**: React Flow (para commands)
- **State**: Zustand o Jotai

### Design System: "Terminal Noir"

**Concepto**: Estética 8-bit/retro gaming mezclada con la elegancia minimalista de Vercel/GitHub. Geek pero profesional. Como si un terminal de los 80s evolucionara con diseño moderno.

**Paleta de colores**:
```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0a0a;        /* Negro profundo */
  --bg-secondary: #111111;      /* Negro elevado */
  --bg-tertiary: #1a1a1a;       /* Cards/panels */
  --bg-hover: #222222;          /* Hover states */
  
  /* Borders - pixel art style */
  --border-default: #2a2a2a;
  --border-focus: #3b82f6;      /* Blue accent */
  --border-success: #22c55e;
  --border-warning: #eab308;
  --border-error: #ef4444;
  
  /* Text */
  --text-primary: #fafafa;
  --text-secondary: #a1a1a1;
  --text-muted: #525252;
  
  /* Accents - Neon retro */
  --accent-blue: #3b82f6;
  --accent-purple: #a855f7;
  --accent-cyan: #22d3ee;
  --accent-green: #22c55e;
  --accent-orange: #f97316;
  --accent-pink: #ec4899;
  
  /* Component-specific */
  --skill-color: #3b82f6;       /* Blue */
  --agent-color: #a855f7;       /* Purple */
  --command-color: #22c55e;     /* Green */
  --hook-color: #f97316;        /* Orange */
  --mcp-color: #22d3ee;         /* Cyan */
}
```

**Tipografía**:
```css
/* Monospace para todo - geek aesthetic */
--font-primary: 'JetBrains Mono', 'Fira Code', monospace;
--font-display: 'Press Start 2P', monospace;  /* Para títulos/logos - 8bit */

/* Tamaños */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
```

**Elementos distintivos**:
```
1. PIXEL BORDERS
   No usar border-radius en elementos principales.
   Bordes de 1px sólidos. Efecto "pixelado" sutil.

2. GLOW EFFECTS
   Hover states con box-shadow neon sutil:
   box-shadow: 0 0 10px var(--accent-blue);

3. SCANLINES (opcional, sutil)
   Overlay muy sutil de scanlines en backgrounds.

4. CURSOR BLINK
   Usar animación de cursor parpadeante en inputs.

5. ASCII ART
   Usar ASCII art para estados vacíos y decoración.

6. ICONOS
   Estilo pixel art / 8-bit. Lucide icons como fallback.
```

**Ejemplo de componente (Button)**:
```tsx
// Botón primario con estética retro
<button className="
  px-4 py-2
  bg-accent-blue
  text-black
  font-mono font-bold
  border-2 border-black
  shadow-[4px_4px_0_0_#000]
  hover:shadow-[2px_2px_0_0_#000]
  hover:translate-x-[2px]
  hover:translate-y-[2px]
  active:shadow-none
  active:translate-x-[4px]
  active:translate-y-[4px]
  transition-all duration-100
">
  EXECUTE
</button>
```

---

### Layout Principal

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ██████╗ ██╗     ██╗   ██╗ ██████╗ ██╗███╗   ██╗                       │
│  ██╔══██╗██║     ██║   ██║██╔════╝ ██║████╗  ██║                       │
│  ██████╔╝██║     ██║   ██║██║  ███╗██║██╔██╗ ██║                       │
│  ██╔═══╝ ██║     ██║   ██║██║   ██║██║██║╚██╗██║                       │
│  ██║     ███████╗╚██████╔╝╚██████╔╝██║██║ ╚████║                       │
│  ╚═╝     ╚══════╝ ╚═════╝  ╚═════╝ ╚═╝╚═╝  ╚═══╝  FORGE               │
│                                                                         │
├────────┬────────┬────────┬────────┬────────┬───────────────────────────┤
│ Skills │ Agents │Commands│ Hooks  │  MCPs  │              [Export ▼]   │
├────────┴────────┴────────┴────────┴────────┴───────────────────────────┤
│                                                                         │
│                                                                         │
│                     ┌─────────────────────────────┐                     │
│                     │                             │                     │
│                     │      MAIN CANVAS AREA       │                     │
│                     │                             │                     │
│                     │   (cambia según el tab)     │                     │
│                     │                             │                     │
│                     └─────────────────────────────┘                     │
│                                                                         │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ > CHAT ASSISTANT                                                        │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Describe what you want to build...                              [⏎] │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Tab: SKILLS

Vista de cards con búsqueda en el registry.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SKILLS                                                    [+ NEW]      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🔍 Search registry...                           [Local ▼] [⏎]   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─ MY SKILLS ──────────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │  │
│  │  │ ■ pdf-maker  │  │ ■ code-rev   │  │ ■ deploy-cfg │            │  │
│  │  │   ──────     │  │   ──────     │  │   ──────     │            │  │
│  │  │   local      │  │   local      │  │   local      │            │  │
│  │  │  [Edit]      │  │  [Edit]      │  │  [Edit]      │            │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘            │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ REGISTRY RESULTS ───────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │  │
│  │  │ □ react-best │  │ □ vercel-cfg │  │ □ supabase   │            │  │
│  │  │   ──────     │  │   ──────     │  │   ──────     │            │  │
│  │  │   ⭐ 86.2K   │  │   ⭐ 65.4K   │  │   ⭐ 7.2K    │            │  │
│  │  │  [+ Add]     │  │  [+ Add]     │  │  [+ Add]     │            │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘            │  │
│  │                                                                   │  │
│  │  [Load more...]                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Skill Editor (modal o panel lateral)**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│  EDIT SKILL: pdf-maker                                    [Save] [×]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Name:        [pdf-maker                                    ]           │
│  Description: [Creates PDF documents from markdown or data  ]           │
│                                                                         │
│  ┌─ SKILL.md ───────────────────────────────────────────────────────┐  │
│  │ ---                                                               │  │
│  │ name: pdf-maker                                                   │  │
│  │ description: Creates PDF documents from markdown or data          │  │
│  │ ---                                                               │  │
│  │                                                                   │  │
│  │ # PDF Maker                                                       │  │
│  │                                                                   │  │
│  │ When creating PDFs, follow these guidelines:                      │  │
│  │ ...                                                               │  │
│  │                                                  [Monaco Editor]  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ FILES ──────────────────────────────────────────────────────────┐  │
│  │  📁 scripts/                                                      │  │
│  │     📄 generate.py                                    [Edit] [×]  │  │
│  │  📁 references/                                                   │  │
│  │     📄 templates.md                                   [Edit] [×]  │  │
│  │                                                                   │  │
│  │  [+ Add file]                                                     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Tab: AGENTS

Configuración de agentes con selección de MCPs y skills.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  AGENTS                                                    [+ NEW]      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ MY AGENTS ──────────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  ◆ code-reviewer                                  [Edit]   │  │  │
│  │  │    Expert in code review, security and performance         │  │  │
│  │  │    ┌────────┐ ┌────────┐ ┌────────┐                       │  │  │
│  │  │    │🔌GitHub│ │🔌Linear│ │■ sec-  │                       │  │  │
│  │  │    │        │ │        │ │ check  │                       │  │  │
│  │  │    └────────┘ └────────┘ └────────┘                       │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                   │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  ◆ deploy-agent                                   [Edit]   │  │  │
│  │  │    Handles deployments to Vercel and notifications         │  │  │
│  │  │    ┌────────┐ ┌────────┐                                  │  │  │
│  │  │    │🔌Vercel│ │🔌Slack │                                  │  │  │
│  │  │    └────────┘ └────────┘                                  │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Agent Editor**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│  EDIT AGENT: code-reviewer                                [Save] [×]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Name:        [code-reviewer                                ]           │
│  Description: [Expert in code review, finds bugs, suggests  ]           │
│               [improvements, checks security vulnerabilities]           │
│                                                                         │
│  Model:   [Claude Sonnet 4 ▼]        Context: [fork ▼]                 │
│                                                                         │
│  ┌─ ALLOWED TOOLS ──────────────────────────────────────────────────┐  │
│  │  [×] Bash     [×] Read     [×] Write    [ ] WebSearch            │  │
│  │  [×] Grep     [ ] Notebook [ ] TodoRead [×] TodoWrite            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ MCPs CONNECTED ─────────────────────────────────────── [+ Add] ─┐  │
│  │                                                                   │  │
│  │  ┌──────────────────┐  ┌──────────────────┐                      │  │
│  │  │ 🔌 GitHub        │  │ 🔌 Linear        │                      │  │
│  │  │    ──────        │  │    ──────        │                      │  │
│  │  │    fetch PRs     │  │    create issues │                      │  │
│  │  │    get diff      │  │    update status │                      │  │
│  │  │   [Config] [×]   │  │   [Config] [×]   │                      │  │
│  │  └──────────────────┘  └──────────────────┘                      │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ SKILLS USED ────────────────────────────────────────── [+ Add] ─┐  │
│  │                                                                   │  │
│  │  ■ security-patterns        ■ code-quality        [×] [×]        │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ AGENT INSTRUCTIONS ─────────────────────────────────────────────┐  │
│  │  You are an expert code reviewer. When reviewing code:           │  │
│  │  1. Check for security vulnerabilities                           │  │
│  │  2. Look for performance issues                                  │  │
│  │  3. Verify best practices...                    [Monaco Editor]  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Tab: COMMANDS (Flow Builder)

Visual flow builder con nodos arrastrables. **Este es el diferenciador principal.**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  COMMANDS                                                  [+ NEW]      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ /deploy ────────────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │           ┌─────────────┐                                        │  │
│  │           │   START     │                                        │  │
│  │           │  /deploy    │                                        │  │
│  │           └──────┬──────┘                                        │  │
│  │                  │                                               │  │
│  │                  ▼                                               │  │
│  │           ┌─────────────┐                                        │  │
│  │           │    TEST     │◀─── agent: test-runner                 │  │
│  │           │  npm test   │     MCP: github                        │  │
│  │           └──────┬──────┘                                        │  │
│  │                  │                                               │  │
│  │           ┌──────┴──────┐                                        │  │
│  │           ▼             ▼                                        │  │
│  │     ┌─────────┐   ┌─────────┐                                    │  │
│  │     │  PASS   │   │  FAIL   │                                    │  │
│  │     └────┬────┘   └────┬────┘                                    │  │
│  │          │             │                                         │  │
│  │          ▼             ▼                                         │  │
│  │    ┌─────────┐   ┌──────────┐                                    │  │
│  │    │  BUILD  │   │  NOTIFY  │◀─── MCP: slack                     │  │
│  │    └────┬────┘   │  "fail"  │                                    │  │
│  │         │        └──────────┘                                    │  │
│  │         ▼                                                        │  │
│  │    ┌─────────┐                                                   │  │
│  │    │ DEPLOY  │◀─── MCP: vercel                                   │  │
│  │    └────┬────┘                                                   │  │
│  │         │                                                        │  │
│  │         ▼                                                        │  │
│  │    ┌──────────┐                                                  │  │
│  │    │  NOTIFY  │◀─── MCP: slack                                   │  │
│  │    │ "success"│                                                  │  │
│  │    └──────────┘                                                  │  │
│  │                                                                   │  │
│  │  ════════════════════════════════════════════════════════════    │  │
│  │  [+ Step]  [+ Branch]  [+ Agent]  [+ MCP Call]      [Save]       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ OTHER COMMANDS ─────────────────────────────────────────────────┐  │
│  │   /review    /test    /release    /hotfix                [Edit]  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Node Types para el Flow Builder**:
```
┌────────────────────────────────────────────────────────────────┐
│  AVAILABLE NODES                                               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────┐  START      Trigger del comando                 │
│  │ ▶ START  │             Solo puede haber 1 por flow          │
│  └──────────┘                                                  │
│                                                                │
│  ┌──────────┐  STEP       Ejecuta bash/código                 │
│  │ ▪ STEP   │             Config: command, working_dir         │
│  └──────────┘                                                  │
│                                                                │
│  ┌──────────┐  AGENT      Invoca un agent                     │
│  │ ◆ AGENT  │             Config: agent_name, prompt           │
│  └──────────┘                                                  │
│                                                                │
│  ┌──────────┐  BRANCH     Condición if/else                   │
│  │ ◇ BRANCH │             Config: condition                    │
│  └──────────┘                                                  │
│                                                                │
│  ┌──────────┐  MCP        Llama a un MCP                      │
│  │ 🔌 MCP   │             Config: mcp, method, args            │
│  └──────────┘                                                  │
│                                                                │
│  ┌──────────┐  PARALLEL   Ejecuta en paralelo                 │
│  │ ║ PARALL │             Config: branches[]                   │
│  └──────────┘                                                  │
│                                                                │
│  ┌──────────┐  NOTIFY     Notificación                        │
│  │ 🔔 NOTIFY│             Config: channel, message             │
│  └──────────┘                                                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

### Tab: HOOKS

Interface WHEN → IF → THEN para crear hooks.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HOOKS                                                     [+ NEW]      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ ACTIVE HOOKS ───────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  🪝 auto-commit                              [ON] [Edit]   │  │  │
│  │  │                                                             │  │  │
│  │  │  WHEN   PostToolUse                                        │  │  │
│  │  │  IF     files_modified > 0 AND NOT message.includes("WIP") │  │  │
│  │  │  THEN   bash: git add -A && git commit -m "${summary}"     │  │  │
│  │  │                                                             │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                   │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  🪝 notify-on-deploy                        [ON] [Edit]   │  │  │
│  │  │                                                             │  │  │
│  │  │  WHEN   PostToolUse                                        │  │  │
│  │  │  IF     tool == "Bash" AND command.match(/vercel deploy/)  │  │  │
│  │  │  THEN   MCP:slack.post(#deploys, "Deployed: ${result}")    │  │  │
│  │  │                                                             │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                   │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  🪝 create-issue-on-fail                    [OFF] [Edit]  │  │  │
│  │  │                                                             │  │  │
│  │  │  WHEN   SubagentStop                                       │  │  │
│  │  │  IF     result.status == "error"                           │  │  │
│  │  │  THEN   MCP:linear.createIssue(title="${agent} failed")    │  │  │
│  │  │                                                             │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Hook Editor**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│  EDIT HOOK: notify-on-deploy                              [Save] [×]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Name:    [notify-on-deploy                                 ]           │
│  Enabled: [×]                                                           │
│                                                                         │
│  ┌─ WHEN (Event) ───────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  [PostToolUse ▼]                                                 │  │
│  │                                                                   │  │
│  │  Events: SessionStart, UserPromptSubmit, PreToolUse,              │  │
│  │          PostToolUse, SubagentStop, PreCompact, Stop,             │  │
│  │          SessionEnd, Notification                                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ IF (Matcher) ───────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  tool == "Bash" AND command.match(/vercel deploy/)         │  │  │
│  │  │                                                             │  │  │
│  │  │                                           [Monaco Editor]  │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                   │  │
│  │  Available variables: tool, args, result, conversation,           │  │
│  │                       files_modified, agent, error                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ THEN (Action) ──────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  Type: [MCP Call ▼]                                              │  │
│  │                                                                   │  │
│  │  MCP:     [slack ▼]                                              │  │
│  │  Method:  [postMessage ▼]                                        │  │
│  │  Args:                                                            │  │
│  │    channel: [#deploys              ]                              │  │
│  │    message: [Deployed: ${result.url}]                             │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Tab: MCPs

Browser del MCP Registry con búsqueda y configuración.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MCPs                                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🔍 Search MCP registry...                               [⏎]     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─ IN THIS PLUGIN ─────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  ┌──────────────────────────────────────────────────────────┐    │  │
│  │  │  🔌 GitHub                        ✓ configured   [Edit]  │    │  │
│  │  │     ────────────────────────────────────────────────     │    │  │
│  │  │     Tools: getPR, getDiff, createReview, mergePR         │    │  │
│  │  │     Used by: code-reviewer agent, /review command        │    │  │
│  │  └──────────────────────────────────────────────────────────┘    │  │
│  │                                                                   │  │
│  │  ┌──────────────────────────────────────────────────────────┐    │  │
│  │  │  🔌 Slack                         ✓ configured   [Edit]  │    │  │
│  │  │     ────────────────────────────────────────────────     │    │  │
│  │  │     Tools: postMessage, uploadFile                       │    │  │
│  │  │     Used by: notify-on-deploy hook, /deploy command      │    │  │
│  │  └──────────────────────────────────────────────────────────┘    │  │
│  │                                                                   │  │
│  │  ┌──────────────────────────────────────────────────────────┐    │  │
│  │  │  🔌 Linear                        ⚠ needs config [Setup] │    │  │
│  │  │     ────────────────────────────────────────────────     │    │  │
│  │  │     Tools: createIssue, updateIssue, getIssues           │    │  │
│  │  │     Used by: create-issue-on-fail hook                   │    │  │
│  │  └──────────────────────────────────────────────────────────┘    │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ REGISTRY BROWSER ───────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  Categories: [All ▼]  Transport: [All ▼]  Sort: [Popular ▼]      │  │
│  │                                                                   │  │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐     │  │
│  │  │ 🔌 Supabase     │ │ 🔌 Notion       │ │ 🔌 Vercel       │     │  │
│  │  │    ──────       │ │    ──────       │ │    ──────       │     │  │
│  │  │    Database     │ │    Productivity │ │    Deployment   │     │  │
│  │  │    ⭐ Official  │ │    ⭐ Official  │ │    ⭐ Official  │     │  │
│  │  │    [+ Add]      │ │    [+ Add]      │ │    [+ Add]      │     │  │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘     │  │
│  │                                                                   │  │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐     │  │
│  │  │ 🔌 Puppeteer    │ │ 🔌 PostgreSQL   │ │ 🔌 Stripe       │     │  │
│  │  │    ──────       │ │    ──────       │ │    ──────       │     │  │
│  │  │    Browser      │ │    Database     │ │    Payments     │     │  │
│  │  │    Community    │ │    ⭐ Official  │ │    Community    │     │  │
│  │  │    [+ Add]      │ │    [+ Add]      │ │    [+ Add]      │     │  │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘     │  │
│  │                                                                   │  │
│  │  [Load more from registry...]                                     │  │
│  │                                                                   │  │
│  │  ─────────────────────────────────────────────────────────────   │  │
│  │  Can't find what you need?                                        │  │
│  │  [+ Add Custom MCP]  Enter URL or npm package manually            │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**MCP Detail/Config Modal**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Configure MCP: GitHub                                            [×]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ INFO ───────────────────────────────────────────────────────────┐  │
│  │  Source: Official MCP Registry                                    │  │
│  │  Vendor: GitHub (Official)                                        │  │
│  │  Transport: stdio                                                 │  │
│  │  Install: npx @modelcontextprotocol/server-github                 │  │
│  │  ⭐ Quality: 95/100   🔒 Security: 98/100                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ AUTHENTICATION ─────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  This MCP requires a GitHub Personal Access Token.                │  │
│  │                                                                   │  │
│  │  Token: [ghp_xxxxxxxxxxxxxxxxxxxx                        ] 👁     │  │
│  │                                                                   │  │
│  │  ⚠ Token is stored in plugin config. User will need to           │  │
│  │    provide their own token when installing the plugin.            │  │
│  │                                                                   │  │
│  │  [ ] Save as environment variable reference: ${GITHUB_TOKEN}      │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ AVAILABLE TOOLS ────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  ☑ get_pull_request      Get details of a PR                     │  │
│  │  ☑ get_pull_request_diff Get the diff of a PR                    │  │
│  │  ☑ create_review         Create a review on a PR                 │  │
│  │  ☑ merge_pull_request    Merge a PR                              │  │
│  │  ☑ create_issue          Create an issue                         │  │
│  │  ☑ list_issues           List issues in a repo                   │  │
│  │  ☐ create_repository     Create a new repository                 │  │
│  │  ☐ delete_branch         Delete a branch                         │  │
│  │                                                                   │  │
│  │  [Select All] [Select None]                                       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│                                              [Cancel]  [Add to Plugin]  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Custom MCP Modal**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Add Custom MCP                                                   [×]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Name:        [my-custom-mcp                                    ]       │
│                                                                         │
│  Source:      ○ npm package                                             │
│               ● GitHub repo                                             │
│               ○ Local path                                              │
│               ○ URL (SSE/HTTP)                                          │
│                                                                         │
│  Repository:  [github.com/user/my-mcp-server                    ]       │
│                                                                         │
│  Transport:   [stdio ▼]                                                 │
│                                                                         │
│  ┌─ DETECTED TOOLS ─────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  ⏳ Fetching MCP manifest...                                      │  │
│  │                                                                   │  │
│  │  Or manually define tools:                                        │  │
│  │  [+ Add Tool Definition]                                          │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│                                                [Cancel]  [Add to Plugin]│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Chat Assistant (Bottom Panel)

El chat está siempre visible en la parte inferior. Permite crear/modificar componentes con lenguaje natural.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ > ASSISTANT                                              [Expand ↑]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  USER: Quiero que cuando haga deploy, si falla, me cree un issue en    │
│        Linear automáticamente                                           │
│                                                                         │
│  ████ ASSISTANT:                                                        │
│  │                                                                      │
│  │  Entendido. Voy a crear:                                            │
│  │                                                                      │
│  │  1. Hook "deploy-fail-issue"                                        │
│  │     WHEN: SubagentStop                                              │
│  │     IF: agent == "deploy" AND result.status == "error"              │
│  │     THEN: MCP:linear.createIssue()                                  │
│  │                                                                      │
│  │  Necesito que tengas Linear MCP conectado.                          │
│  │  ¿Lo configuro? [Ver en canvas] [Crear]                             │
│  │                                                                      │
│  └──────────────────────────────────────────────────────────────────── │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ > describe your plugin idea...                              [⏎] │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Export Panel

```
┌─────────────────────────────────────────────────────────────────────────┐
│  EXPORT PLUGIN                                                    [×]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Plugin Name: [my-awesome-plugin                            ]           │
│                                                                         │
│  ┌─ PREVIEW STRUCTURE ──────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  my-awesome-plugin/                                               │  │
│  │  ├── .claude-plugin/                                              │  │
│  │  │   └── plugin.json                                              │  │
│  │  ├── skills/                                                      │  │
│  │  │   ├── pdf-maker/                                               │  │
│  │  │   │   └── SKILL.md                                             │  │
│  │  │   └── code-quality/                                            │  │
│  │  │       └── SKILL.md                                             │  │
│  │  ├── agents/                                                      │  │
│  │  │   └── code-reviewer.md                                         │  │
│  │  ├── commands/                                                    │  │
│  │  │   └── deploy.md                                                │  │
│  │  └── hooks/                                                       │  │
│  │      ├── auto-commit.js                                           │  │
│  │      └── notify-on-deploy.js                                      │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Export to:                                                             │
│                                                                         │
│  [Download ZIP]  [Push to GitHub]  [Install to Claude Code]            │
│                                                                         │
│  GitHub repo: [github.com/user/________________]                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Stack Técnico

| Componente | Tecnología | Razón |
|------------|------------|-------|
| **Framework** | Next.js 14+ (App Router) | SSR, API routes, Vercel native |
| **Styling** | Tailwind CSS | Rapid iteration, design tokens |
| **Flow Builder** | React Flow | Nodos/edges, muy customizable |
| **Code Editor** | Monaco Editor | VSCode experience |
| **State** | Zustand | Simple, performant |
| **Database** | PostgreSQL + Drizzle (Vercel Postgres) | Para registry persistente |
| **Vector Search** | pgvector | Embeddings en la misma DB |
| **Embeddings** | OpenAI text-embedding-3-small | Calidad/costo balance |
| **AI** | Claude API | Para el assistant |
| **Auth** | Clerk o NextAuth | GitHub OAuth para push |
| **Fonts** | JetBrains Mono + Press Start 2P | Geek aesthetic |

---

## Fases de Desarrollo

### Fase 1: Core
- [ ] Setup Next.js 14 + Tailwind + Vercel
- [ ] Design system base
- [ ] Layout con tabs
- [ ] Skills tab: buscar en registry + crear nuevo
- [ ] Agents tab: crear con MCP selector
- [ ] MCPs tab: browser del registry oficial
- [ ] Export ZIP básico

### Fase 2: Flow + Polish
- [ ] Commands tab con flow builder (React Flow)
- [ ] Chat assistant (crear componentes via prompt)
- [ ] Preview de estructura del plugin
- [ ] GitHub OAuth + guardar plugins
- [ ] Push to GitHub

### Fase 3: Extras
- [ ] Hooks tab (si Claude Code lo soporta)
- [ ] npm publish desde la UI
- [ ] Templates de plugins comunes
- [ ] Mejorar search con embeddings

---

## Estructura del Proyecto

```
plugin-forge/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Main editor
│   ├── api/
│   │   ├── skills/
│   │   │   └── search/route.ts     # Proxy a registries
│   │   ├── mcps/
│   │   │   └── search/route.ts     # Proxy al MCP Registry
│   │   ├── export/route.ts         # Genera ZIP
│   │   ├── chat/route.ts           # AI assistant
│   │   └── auth/[...nextauth]/route.ts
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── TabBar.tsx
│   │   └── ChatPanel.tsx
│   ├── tabs/
│   │   ├── SkillsTab.tsx
│   │   ├── AgentsTab.tsx
│   │   ├── CommandsTab.tsx
│   │   ├── HooksTab.tsx
│   │   └── McpsTab.tsx
│   ├── editors/
│   │   ├── SkillEditor.tsx
│   │   ├── AgentEditor.tsx
│   │   ├── CommandFlowEditor.tsx
│   │   └── HookEditor.tsx
│   ├── flow/                       # React Flow nodes
│   │   ├── nodes/
│   │   └── FlowCanvas.tsx
│   └── ui/                         # Design system
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Card.tsx
│       └── Modal.tsx
├── lib/
│   ├── registry/
│   │   ├── skills.ts               # Fetch skills
│   │   └── mcps.ts                 # Fetch MCPs
│   ├── generator/
│   │   ├── plugin.ts               # Genera estructura
│   │   ├── templates/              # Handlebars templates
│   │   └── zip.ts
│   └── ai/
│       └── assistant.ts            # Claude API
├── stores/
│   └── plugin.ts                   # Zustand store
├── types/
│   └── index.ts
├── .env.example
├── .gitignore
└── README.md
```

**.gitignore**:
```gitignore
# Dependencies
node_modules/

# Environment
.env
.env.local
.env.*.local

# Database
*.db
*.sqlite

# Vercel
.vercel

# Build
.next/
out/

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Testing
coverage/
```

---

## Autenticación y Persistencia

### Auth
- **Provider**: GitHub OAuth (via NextAuth)
- **Requerido para**: Push to GitHub, guardar plugins en la nube
- **Opcional para**: Todo lo demás (el builder funciona sin login)

### Persistencia

**Sin login**:
- Estado en localStorage
- Export a ZIP siempre disponible
- Banner discreto: "Logueate para guardar tu trabajo"

**Con login**:
- Plugins guardados en PostgreSQL
- Sync entre dispositivos
- Push directo a GitHub

---

## Responsive / Mobile

**Desktop (>1024px)**: Experiencia completa con flow builder

**Tablet (768-1024px)**: 
- Tabs colapsados en sidebar
- Flow builder funcional pero limitado
- Chat panel como overlay

**Mobile (<768px)**:
- **Solo lectura** del plugin
- Ver estructura y componentes
- NO se puede editar el flow builder
- Mensaje: "Para editar, abrí en desktop"
- Export a ZIP disponible

---

## API Endpoints

```
GET  /api/skills/search?q=...       # Buscar skills (proxy a registries)
GET  /api/mcps/search?q=...         # Buscar MCPs (proxy al registry oficial)
POST /api/export                     # Genera ZIP del plugin
POST /api/chat                       # AI assistant
```

---

## Instalación del Plugin Generado

### Opción 1: Local (desarrollo)
```bash
# Descargar ZIP desde Plugin Forge
unzip my-plugin.zip -d ~/.claude/plugins/my-plugin

# O clonar desde GitHub si pusheaste
git clone https://github.com/user/my-plugin ~/.claude/plugins/my-plugin
```

### Opción 2: Via Claude Code
```bash
# Desde el directorio del proyecto
claude /plugin add ./path/to/my-plugin

# O desde GitHub
claude /plugin add github:user/my-plugin
```

### Opción 3: npm (para distribución)
```bash
# Publicar (desde el directorio del plugin)
npm publish

# Instalar
npm install -g my-claude-plugin
claude /plugin add my-claude-plugin
```

**Estructura del package.json generado**:
```json
{
  "name": "my-claude-plugin",
  "version": "1.0.0",
  "description": "Generated by Plugin Forge",
  "keywords": ["claude-code", "plugin", "mcp"],
  "files": ["skills/", "agents/", "commands/", "hooks/", "plugin.json"],
  "claude-plugin": true
}
```

---

## Error Handling

### En el Builder

| Error | Handling |
|-------|----------|
| Skill del registry no encontrado | Mostrar "Skill unavailable", ofrecer alternativas similares |
| MCP del registry caído | Caché de última respuesta válida, badge "may be outdated" |
| Búsqueda sin resultados | Sugerir términos alternativos, ofrecer crear desde cero |
| GitHub API rate limit | Mostrar countdown, sugerir autenticarse para más requests |
| Export falla | Retry con exponential backoff, mostrar error específico |

### En el Plugin Generado

El plugin generado incluye validación básica:

```javascript
// En cada skill/agent/command
try {
  // ... lógica
} catch (error) {
  console.error(`[PluginName] Error: ${error.message}`);
  // Graceful degradation, no crashear Claude Code
}
```

**MCPs con errores de conexión**:
```javascript
// mcp-config.js generado
export const mcpConfig = {
  github: {
    // ...config
    onError: (err) => {
      console.warn(`GitHub MCP unavailable: ${err.message}`);
      return null; // Continuar sin el MCP
    }
  }
}
```

---

## Configuración de MCPs

### MCPs que NO necesitan auth
Muchos MCPs funcionan sin API keys:
- Filesystem (local)
- SQLite (local)
- Fetch/HTTP (público)
- Time/timezone
- Calculator

### MCPs que SÍ necesitan auth
- GitHub (Personal Access Token)
- Slack (Bot Token)
- Linear (API Key)
- Vercel (Token)
- OpenAI (API Key)

**Manejo de tokens en el plugin generado**:
```javascript
// El plugin usa env vars, NUNCA hardcodea tokens
export const mcpConfig = {
  github: {
    token: process.env.GITHUB_TOKEN  // Usuario provee al instalar
  }
}
```

**En Plugin Forge** (el builder):
- Tokens se usan solo para preview/test
- Se guardan en localStorage (usuario anónimo) o DB encriptado (usuario auth)
- NUNCA se incluyen en el ZIP exportado
- El README generado lista las env vars requeridas

---

## Consideraciones

### Open Source
- Repo público en GitHub
- Licencia MIT
- Contribuciones bienvenidas
- Roadmap público en GitHub Issues/Projects

### Seguridad - Environment Variables
**CRÍTICO**: Nunca commitear secrets.

```gitignore
# .gitignore del proyecto Plugin Forge
.env
.env.local
.env.*.local

# Database
*.db
*.sqlite

# Tokens de usuario (si se guardan localmente para dev)
.user-tokens/

# Vercel
.vercel
```

**Variables de entorno requeridas** (documentar en README):
```bash
# .env.example
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...          # Para embeddings
ANTHROPIC_API_KEY=sk-ant-...   # Para el chat assistant
GITHUB_TOKEN=ghp_...           # Para GitHub API (registry access)

# Opcionales
CLERK_SECRET_KEY=...           # Si usamos Clerk para auth
```

### Licencias de Skills/MCPs
- Skills de anthropics/skills: Apache 2.0 (excepto docx/pdf/pptx/xlsx)
- MCPs del registry oficial: verificar cada uno
- El plugin generado hereda las licencias de lo que incluye

### Rate Limits
- GitHub API: 5000 req/hour con token, 60 sin token
- MCP Registry: TBD (ir con cuidado)
- Implementar caché agresivo

### Performance
- Lazy load de React Flow
- Virtual scrolling para listas largas
- Debounce en búsqueda (300ms)

---

## Métricas de Éxito

1. **Funciona**: El plugin exportado se instala y corre en Claude Code sin errores
2. **Rápido**: Plugin básico creado en < 5 minutos
3. **Útil**: Yo lo uso para mis propios proyectos
